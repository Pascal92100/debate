import "server-only";
import { neon } from "@neondatabase/serverless";
import fixture from "../debates.json";

export type Debate = {
  id: string;
  parentId?: string | null;
  authorProfileId?: string;
  circleId?: string | null;
  sourcePostId?: string | null;
  from?: string;
  to?: string | null;
  start?: string;
  confidence?: string | number;
  antiReaction?: boolean;
  icon?: string;
  intention?: string;
  theme?: string;
  title: string;
  definitions?: Array<string | { id?: string; text: string }>;
  facts?: Array<string | { id?: string; text: string }>;
  content: string[];
  timestamp?: number;
  children?: Comment[];
};

export type Comment = {
  id: string;
  author: string;
  confidence: number;
  title: string;
  evaluation?: string;
  definitions?: Array<string | { id?: string; text: string }>;
  facts?: Array<string | { id?: string; text: string }>;
  paragraphs: Array<{ id: string; text: string }>;
  replyTo: string;
  children: Comment[];
};

type StoreState = { debates: Debate[]; reports: Array<{ id: string; debateId: string; messageId: string; reason: string }>; ready: boolean; persistent: boolean };
const globalStore = globalThis as typeof globalThis & { __debateStore?: StoreState };
const store = globalStore.__debateStore ??= {
  debates: structuredClone(fixture.debates) as Debate[],
  reports: [],
  ready: false,
  persistent: false
};

export function database() {
  const url = process.env.DATABASE_URL;
  return url ? neon(url) : null;
}

async function initializeDatabase() {
  const sql = database();
  if (!sql) return false;
  if (store.ready && store.persistent) return true;

  await sql`CREATE TABLE IF NOT EXISTS debates (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    author_profile_id TEXT,
    circle_id TEXT,
    source_post_id TEXT,
    visibility TEXT NOT NULL DEFAULT 'public',
    payload JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`;
  await sql`ALTER TABLE debates ADD COLUMN IF NOT EXISTS author_profile_id TEXT`;
  await sql`ALTER TABLE debates ADD COLUMN IF NOT EXISTS circle_id TEXT`;
  await sql`ALTER TABLE debates ADD COLUMN IF NOT EXISTS source_post_id TEXT`;
  await sql`ALTER TABLE debates ADD COLUMN IF NOT EXISTS visibility TEXT NOT NULL DEFAULT 'public'`;
  await sql`CREATE TABLE IF NOT EXISTS debate_comments (
    id TEXT PRIMARY KEY,
    debate_id TEXT NOT NULL REFERENCES debates(id) ON DELETE CASCADE,
    reply_to TEXT NOT NULL,
    payload JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`;
  await sql`CREATE INDEX IF NOT EXISTS debate_comments_debate_id_idx ON debate_comments (debate_id, created_at)`;
  await sql`CREATE TABLE IF NOT EXISTS debate_reports (
    id TEXT PRIMARY KEY,
    debate_id TEXT NOT NULL REFERENCES debates(id) ON DELETE CASCADE,
    message_id TEXT NOT NULL,
    reason TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`;
  await sql`CREATE INDEX IF NOT EXISTS debate_reports_debate_id_idx ON debate_reports (debate_id, created_at)`;

  const counts = await sql`SELECT COUNT(*)::int AS count FROM debates`;
  if (Number(counts[0]?.count) === 0) {
    for (const debate of fixture.debates as Debate[]) {
      await sql`INSERT INTO debates (id, title, payload) VALUES (${debate.id}, ${debate.title}, ${JSON.stringify(debate)}::jsonb) ON CONFLICT (id) DO NOTHING`;
    }
  }
  store.ready = true;
  store.persistent = true;
  return true;
}

export async function isPersistentStore() {
  try {
    return await initializeDatabase();
  } catch (error) {
    console.error("Postgres unavailable; using fixture and in-memory writes.", error);
    store.persistent = false;
    return false;
  }
}

async function addStoredComments(debate: Debate) {
  const sql = database();
  if (!sql || !store.persistent) return debate;
  const rows = await sql`SELECT payload FROM debate_comments WHERE debate_id = ${debate.id} ORDER BY created_at`;
  for (const row of rows) attachComment(debate, row.payload as Comment);
  return debate;
}

export async function listDebates() {
  const persistent = await isPersistentStore();
  const sql = persistent ? database() : null;
  if (sql) {
    const rows = await sql`SELECT payload FROM debates ORDER BY created_at DESC`;
    return rows.map((row) => row.payload as Debate);
  }
  return structuredClone(store.debates).sort((a, b) => (b.timestamp ?? 0) - (a.timestamp ?? 0));
}

export async function getDebate(id: string) {
  const persistent = await isPersistentStore();
  const sql = persistent ? database() : null;
  if (sql) {
    const rows = await sql`SELECT payload FROM debates WHERE id = ${id} LIMIT 1`;
    const debate = rows[0]?.payload as Debate | undefined;
    return debate ? addStoredComments(debate) : null;
  }
  return structuredClone(store.debates.find((debate) => debate.id === id) ?? null);
}

export async function createDebate(input: Pick<Debate, "title" | "content"> & Partial<Debate>) {
  const debate: Debate = {
    id: `deb_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`,
    authorProfileId: input.authorProfileId,
    circleId: input.circleId ?? null,
    sourcePostId: input.sourcePostId ?? null,
    from: input.from?.trim() || "Participant",
    start: input.start || "question",
    confidence: input.confidence ?? 50,
    antiReaction: Boolean(input.antiReaction),
    intention: input.intention || "explore",
    theme: input.theme || "lifestyle-ideas",
    title: input.title.trim(),
    definitions: input.definitions ?? [],
    facts: input.facts ?? [],
    content: input.content.flatMap((text) => text.replace(/\r\n?/g, "\n").split("\n").map((paragraph) => paragraph.trim()).filter(Boolean)),
    timestamp: Date.now(),
    children: []
  };
  const persistent = await isPersistentStore();
  const sql = persistent ? database() : null;
  if (sql) {
    await sql`INSERT INTO debates (id, title, author_profile_id, circle_id, source_post_id, visibility, payload)
      VALUES (${debate.id}, ${debate.title}, ${debate.authorProfileId ?? null}, ${debate.circleId ?? null}, ${debate.sourcePostId ?? null}, ${debate.to ? 'circle' : 'public'}, ${JSON.stringify(debate)}::jsonb)`;
  } else {
    store.debates.unshift(debate);
  }
  return debate;
}

function attachComment(debate: Debate, comment: Comment) {
  const rootReplyIds = new Set([debate.id, "p1"]);
  const rootId = (debate.children ?? []).some((child) => child.replyTo === "p1" || child.replyTo?.startsWith("p1-")) ? "p1" : debate.id;
  rootReplyIds.add(rootId);
  const rootParagraphIds = new Set((debate.content ?? []).map((_, index) => rootId === "p1" ? `p1-${index + 1}` : `${rootId}-p-${index + 1}`));

  const visit = (node: Debate | Comment): boolean => {
    if (node.id === comment.replyTo || ("paragraphs" in node && node.paragraphs.some((paragraph) => paragraph.id === comment.replyTo)) || (node === debate && (rootReplyIds.has(comment.replyTo) || rootParagraphIds.has(comment.replyTo)))) {
      node.children ??= [];
      node.children.push(comment);
      return true;
    }
    return (node.children ?? []).some(visit);
  };
  if (!visit(debate)) {
    debate.children ??= [];
    debate.children.push(comment);
  }
}

export async function createComment(debateId: string, input: { replyTo: string; text: string; title?: string; author?: string; evaluation?: string }) {
  const debate = await getDebate(debateId);
  if (!debate) return null;
  const paragraphTexts = input.text.replace(/\r\n?/g, "\n").split("\n").map((text) => text.trim()).filter(Boolean);
  const comment: Comment = {
    id: `post_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`,
    author: input.author?.trim() || "Vous",
    confidence: 50,
    title: input.title?.trim() || paragraphTexts[0]?.slice(0, 72) || "Réponse",
    evaluation: input.evaluation,
    paragraphs: paragraphTexts.map((text) => ({ id: `paragraph_${crypto.randomUUID().slice(0, 8)}`, text })),
    replyTo: input.replyTo,
    children: []
  };
  const persistent = await isPersistentStore();
  const sql = persistent ? database() : null;
  if (sql) {
    await sql`INSERT INTO debate_comments (id, debate_id, reply_to, payload) VALUES (${comment.id}, ${debateId}, ${comment.replyTo}, ${JSON.stringify(comment)}::jsonb)`;
  } else {
    attachComment(debate, comment);
    const index = store.debates.findIndex((entry) => entry.id === debateId);
    if (index >= 0) store.debates[index] = debate;
  }
  return comment;
}

export async function createReport(debateId: string, messageId: string, reason: string) {
  const report = { id: `report_${crypto.randomUUID()}`, debateId, messageId, reason };
  const persistent = await isPersistentStore();
  const sql = persistent ? database() : null;
  if (sql) {
    await sql`INSERT INTO debate_reports (id, debate_id, message_id, reason) VALUES (${report.id}, ${debateId}, ${messageId}, ${reason})`;
  } else {
    store.reports.push(report);
  }
  return report;
}