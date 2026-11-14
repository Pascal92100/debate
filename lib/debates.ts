import "server-only";
import { neon } from "@neondatabase/serverless";
import { getSessionAccountId } from "@/lib/auth";
import fixture from "../debates.json";
import type { MediaAttachment } from "@/lib/media";

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
  safetyTags?: string[];
  targetTags?: string[];
  title: string;
  definitions?: Array<string | { id?: string; text: string }>;
  facts?: Array<string | { id?: string; text: string }>;
  content: string[];
  timestamp?: number;
  children?: Comment[];
  media?: MediaAttachment[];
};

export type Comment = {
  id: string;
  author: string;
  authorProfileId?: string;
  confidence: number;
  title: string;
  evaluation?: string;
  definitions?: Array<string | { id?: string; text: string }>;
  facts?: Array<string | { id?: string; text: string }>;
  paragraphs: Array<{ id: string; text: string }>;
  replyTo: string;
  children: Comment[];
  media?: MediaAttachment[];
};

export const argumentEvaluations = ["👍🏻", "👎🏻", "🔑", "💡", "🎓", "☀️"] as const;
export type ArgumentEvaluation = typeof argumentEvaluations[number];

type StoreState = { debates: Debate[]; reports: Array<{ id: string; debateId: string; messageId: string; reason: string; profileId?: string }>; evaluations: Array<{ debateId: string; argumentId: string; profileId: string; evaluation: ArgumentEvaluation }>; ready: boolean; persistent: boolean };
const globalStore = globalThis as typeof globalThis & { __debateStore?: StoreState };
const store = globalStore.__debateStore ??= {
  debates: structuredClone(fixture.debates) as Debate[],
  reports: [],
  evaluations: [],
  ready: false,
  persistent: false
};
store.evaluations ??= [];

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
  await sql`ALTER TABLE debate_comments ADD COLUMN IF NOT EXISTS author_profile_id TEXT REFERENCES profiles(id) ON DELETE SET NULL`;
  await sql`CREATE INDEX IF NOT EXISTS debate_comments_debate_id_idx ON debate_comments (debate_id, created_at)`;
  await sql`CREATE INDEX IF NOT EXISTS debate_comments_reply_to_idx ON debate_comments (debate_id, reply_to)`;
  await sql`CREATE TABLE IF NOT EXISTS debate_argument_evaluations (
    debate_id TEXT NOT NULL REFERENCES debates(id) ON DELETE CASCADE,
    argument_id TEXT NOT NULL,
    profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    evaluation TEXT NOT NULL CHECK (evaluation IN ('👍🏻', '👎🏻', '🔑', '💡', '🎓', '☀️')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (debate_id, argument_id, profile_id)
  )`;
  await sql`CREATE INDEX IF NOT EXISTS debate_argument_evaluations_count_idx ON debate_argument_evaluations(debate_id, argument_id, evaluation)`;
  await sql`CREATE TABLE IF NOT EXISTS debate_reports (
    id TEXT PRIMARY KEY,
    debate_id TEXT NOT NULL REFERENCES debates(id) ON DELETE CASCADE,
    message_id TEXT NOT NULL,
    reason TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`;
  await sql`CREATE INDEX IF NOT EXISTS debate_reports_debate_id_idx ON debate_reports (debate_id, created_at)`;
  await sql`CREATE TABLE IF NOT EXISTS debate_argument_reports (
    debate_id TEXT NOT NULL REFERENCES debates(id) ON DELETE CASCADE,
    message_id TEXT NOT NULL,
    profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    reason TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (debate_id, message_id, profile_id, reason)
  )`;
  await sql`CREATE INDEX IF NOT EXISTS debate_argument_reports_count_idx ON debate_argument_reports (debate_id, message_id, reason)`;

  store.ready = true;
  store.persistent = true;
  return true;
}

export async function isPersistentStore() {
  try {
    return await initializeDatabase();
  } catch (error) {
    console.error("Postgres connection failed.", error);
    if (process.env.DATABASE_URL) throw new Error("DATABASE_URL is configured, but the database connection failed.", { cause: error });
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
    const accountId = await getSessionAccountId();
    if (!accountId) return [];
    const rows = await sql`SELECT payload FROM debates d
      WHERE d.author_profile_id IN (SELECT id FROM profiles WHERE account_id = ${accountId})
        OR d.circle_id IN (SELECT cm.circle_id FROM circle_members cm JOIN profiles p ON p.id = cm.profile_id WHERE p.account_id = ${accountId})
      ORDER BY d.created_at DESC`;
    return rows.map((row) => row.payload as Debate);
  }
  return structuredClone(store.debates).sort((a, b) => (b.timestamp ?? 0) - (a.timestamp ?? 0));
}

export async function listPublicDebates() {
  if (!await isPersistentStore()) return structuredClone(store.debates.filter((debate) => !debate.circleId));
  const sql = database();
  if (!sql) return [];
  const rows = await sql`SELECT payload FROM debates WHERE visibility = 'public' AND circle_id IS NULL ORDER BY created_at DESC LIMIT 300`;
  return rows.map((row) => row.payload as Debate);
}

export async function getDebate(id: string) {
  const persistent = await isPersistentStore();
  const sql = persistent ? database() : null;
  if (sql) {
    const accountId = await getSessionAccountId();
    const rows = await sql`SELECT payload FROM debates d WHERE d.id = ${id} AND (
      (d.visibility = 'public' AND d.circle_id IS NULL)
      OR
      (${accountId ?? ""} <> '' AND d.author_profile_id IN (SELECT id FROM profiles WHERE account_id = ${accountId ?? ""}))
      OR (${accountId ?? ""} <> '' AND d.circle_id IN (SELECT cm.circle_id FROM circle_members cm JOIN profiles p ON p.id = cm.profile_id WHERE p.account_id = ${accountId ?? ""}))
    ) LIMIT 1`;
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
    safetyTags: input.safetyTags ?? [],
    targetTags: input.targetTags ?? [],
    title: input.title.trim(),
    definitions: input.definitions ?? [],
    facts: input.facts ?? [],
    content: input.content.flatMap((text) => text.replace(/\r\n?/g, "\n").split("\n").map((paragraph) => paragraph.trim()).filter(Boolean)),
    media: input.media ?? [],
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

export async function deleteOwnDebate(debateId: string) {
  const persistent = await isPersistentStore();
  const sql = persistent ? database() : null;
  if (!sql) {
    const index = store.debates.findIndex((debate) => debate.id === debateId && Boolean(debate.authorProfileId));
    if (index < 0) return false;
    store.debates.splice(index, 1);
    return true;
  }
  const accountId = await getSessionAccountId();
  if (!accountId) return false;
  const rows = await sql`SELECT d.source_post_id FROM debates d JOIN profiles p ON p.id = d.author_profile_id WHERE d.id = ${debateId} AND p.account_id = ${accountId} LIMIT 1`;
  if (!rows.length) return false;
  const sourcePostId = rows[0].source_post_id as string | null;
  const statements = [sql`DELETE FROM debates WHERE id = ${debateId} AND author_profile_id IN (SELECT id FROM profiles WHERE account_id = ${accountId})`];
  if (sourcePostId) statements.push(sql`UPDATE social_posts SET debate_id = NULL, kind = 'publication', payload = (payload - 'debateId') || '{"kind":"publication"}'::jsonb WHERE id = ${sourcePostId}`);
  await sql.transaction(statements);
  return true;
}

export function deleteDemoDebatesByProfile(profileId: string) {
  store.debates = store.debates.filter((debate) => debate.authorProfileId !== profileId);
}

export function unlinkDemoDebatesFromCircle(circleId: string) {
  store.debates = store.debates.map((debate) => debate.circleId === circleId ? { ...debate, circleId: null } : debate);
}

export function deleteDemoDebateBySourcePost(postId: string) {
  store.debates = store.debates.filter((debate) => debate.sourcePostId !== postId);
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

export async function createComment(debateId: string, input: { replyTo: string; text: string; title?: string; author?: string; profileId?: string; evaluation?: string; media?: MediaAttachment[] }) {
  const debate = await getDebate(debateId);
  if (!debate) return null;
  const paragraphTexts = input.text.replace(/\r\n?/g, "\n").split("\n").map((text) => text.trim()).filter(Boolean);
  const persistent = await isPersistentStore();
  const sql = persistent ? database() : null;
  let authorProfileId: string | undefined;
  let author = "John Doe";
  if (sql) {
    const accountId = await getSessionAccountId();
    if (!accountId) return null;
    const profiles = await sql`SELECT id, name FROM profiles WHERE account_id = ${accountId} AND kind = 'individual' AND (${input.profileId ?? ""} = '' OR id = ${input.profileId ?? ""}) ORDER BY created_at LIMIT 1`;
    if (!profiles.length) return null;
    authorProfileId = profiles[0].id as string;
    author = profiles[0].name as string;
  } else {
    const social = globalThis as typeof globalThis & { __socialState?: { profiles: Array<{ id: string; accountId: string; kind: string; name: string }> } };
    const profile = social.__socialState?.profiles.find((item) => item.accountId === "account-demo" && item.kind === "individual" && (!input.profileId || item.id === input.profileId));
    if (!profile) return null;
    authorProfileId = profile.id;
    author = profile.name;
  }
  const comment: Comment = {
    id: `post_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`,
    author,
    authorProfileId,
    confidence: 50,
    title: input.title?.trim() || paragraphTexts[0]?.slice(0, 72) || "Reply",
    evaluation: input.evaluation,
    paragraphs: paragraphTexts.map((text) => ({ id: `paragraph_${crypto.randomUUID().slice(0, 8)}`, text })),
    replyTo: input.replyTo,
    children: [],
    media: input.media ?? []
  };
  if (sql) {
    await sql`INSERT INTO debate_comments (id, debate_id, reply_to, author_profile_id, payload) VALUES (${comment.id}, ${debateId}, ${comment.replyTo}, ${comment.authorProfileId}, ${JSON.stringify(comment)}::jsonb)`;
  } else {
    attachComment(debate, comment);
    const index = store.debates.findIndex((entry) => entry.id === debateId);
    if (index >= 0) store.debates[index] = debate;
  }
  return comment;
}

function debateArgumentIds(debate: Debate) {
  const rootId = (debate.children ?? []).some((child) => child.replyTo === "p1" || child.replyTo?.startsWith("p1-")) ? "p1" : debate.id;
  const ids = new Set([debate.id]);
  const rootParagraphs = debate.content.flatMap((text) => text.replace(/\r\n?/g, "\n").split("\n").map((paragraph) => paragraph.trim()).filter(Boolean));
  rootParagraphs.forEach((_, index) => ids.add(rootId === "p1" ? `p1-${index + 1}` : `${rootId}-p-${index + 1}`));
  const visit = (comments: Comment[] = []) => comments.forEach((comment) => {
    ids.add(comment.id);
    comment.paragraphs?.forEach((paragraph) => ids.add(paragraph.id));
    visit(comment.children);
  });
  visit(debate.children);
  return ids;
}

export async function listArgumentEvaluations(debateId: string, profileId?: string) {
  const result: Record<string, { counts: Record<string, number>; viewerEvaluation: string | null }> = {};
  const persistent = await isPersistentStore();
  const sql = persistent ? database() : null;
  if (sql) {
    const [countRows, viewerRows] = await Promise.all([
      sql`SELECT argument_id AS "argumentId", evaluation, COUNT(*)::int AS count FROM debate_argument_evaluations WHERE debate_id = ${debateId} GROUP BY argument_id, evaluation`,
      profileId ? sql`SELECT argument_id AS "argumentId", evaluation FROM debate_argument_evaluations WHERE debate_id = ${debateId} AND profile_id = ${profileId}` : Promise.resolve([])
    ]);
    for (const row of countRows) {
      const argumentId = row.argumentId as string;
      result[argumentId] ??= { counts: {}, viewerEvaluation: null };
      result[argumentId].counts[row.evaluation as string] = Number(row.count);
    }
    for (const row of viewerRows) {
      const argumentId = row.argumentId as string;
      result[argumentId] ??= { counts: {}, viewerEvaluation: null };
      result[argumentId].viewerEvaluation = row.evaluation as string;
    }
    return result;
  }
  for (const item of store.evaluations.filter((evaluation) => evaluation.debateId === debateId)) {
    result[item.argumentId] ??= { counts: {}, viewerEvaluation: null };
    result[item.argumentId].counts[item.evaluation] = (result[item.argumentId].counts[item.evaluation] ?? 0) + 1;
    if (item.profileId === profileId) result[item.argumentId].viewerEvaluation = item.evaluation;
  }
  return result;
}

export async function toggleArgumentEvaluation(debateId: string, argumentId: string, profileId: string, evaluation: string) {
  if (!argumentEvaluations.includes(evaluation as ArgumentEvaluation)) throw new Error("Unknown evaluation");
  const debate = await getDebate(debateId);
  if (!debate || !debateArgumentIds(debate).has(argumentId)) return null;
  const persistent = await isPersistentStore();
  const sql = persistent ? database() : null;
  if (sql) {
    const rows = await sql`SELECT evaluation FROM debate_argument_evaluations WHERE debate_id = ${debateId} AND argument_id = ${argumentId} AND profile_id = ${profileId} LIMIT 1`;
    if (rows[0]?.evaluation === evaluation) {
      await sql`DELETE FROM debate_argument_evaluations WHERE debate_id = ${debateId} AND argument_id = ${argumentId} AND profile_id = ${profileId}`;
    } else {
      await sql`INSERT INTO debate_argument_evaluations (debate_id, argument_id, profile_id, evaluation) VALUES (${debateId}, ${argumentId}, ${profileId}, ${evaluation}) ON CONFLICT (debate_id, argument_id, profile_id) DO UPDATE SET evaluation = EXCLUDED.evaluation, created_at = NOW()`;
    }
  } else {
    const index = store.evaluations.findIndex((item) => item.debateId === debateId && item.argumentId === argumentId && item.profileId === profileId);
    if (index >= 0 && store.evaluations[index].evaluation === evaluation) store.evaluations.splice(index, 1);
    else if (index >= 0) store.evaluations[index].evaluation = evaluation as ArgumentEvaluation;
    else store.evaluations.push({ debateId, argumentId, profileId, evaluation: evaluation as ArgumentEvaluation });
  }
  return (await listArgumentEvaluations(debateId, profileId))[argumentId] ?? { counts: {}, viewerEvaluation: null };
}

export async function deleteOwnComment(debateId: string, commentId: string) {
  const persistent = await isPersistentStore();
  const sql = persistent ? database() : null;
  if (!sql) {
    const debate = store.debates.find((item) => item.id === debateId);
    if (!debate) return false;
    let deleted = false;
    const removeFrom = (comments: Comment[]): Comment[] => {
      const result: Comment[] = [];
      for (const comment of comments) {
        if (comment.id === commentId && comment.authorProfileId === "profile-john") {
          deleted = true;
          const paragraphIds = new Set((comment.paragraphs ?? []).map((paragraph) => paragraph.id));
          for (const child of comment.children ?? []) {
            if (child.replyTo === comment.id || paragraphIds.has(child.replyTo)) child.replyTo = comment.replyTo;
            result.push(child);
          }
          continue;
        }
        comment.children = removeFrom(comment.children ?? []);
        result.push(comment);
      }
      return result;
    };
    debate.children = removeFrom(debate.children ?? []);
    return deleted;
  }
  const accountId = await getSessionAccountId();
  if (!accountId) return false;
  const rootRows = await sql`SELECT c.id, c.reply_to, c.payload FROM debate_comments c JOIN profiles p ON p.id = c.author_profile_id WHERE c.id = ${commentId} AND c.debate_id = ${debateId} AND p.account_id = ${accountId} LIMIT 1`;
  if (!rootRows.length) return false;
  const rootPayload = rootRows[0].payload as Comment;
  const rootReplyTo = rootRows[0].reply_to as string;
  const rootParagraphIds = (rootPayload.paragraphs ?? []).map((paragraph) => paragraph.id);
  const rows = await sql`SELECT id, reply_to, payload FROM debate_comments WHERE debate_id = ${debateId}`;
  const childIds = rows.filter((row) => row.reply_to === commentId || rootParagraphIds.includes(row.reply_to as string)).map((row) => row.id as string);
  await sql.transaction([
    ...(childIds.length ? [sql`UPDATE debate_comments SET reply_to = ${rootReplyTo}, payload = jsonb_set(payload, '{replyTo}', to_jsonb(${rootReplyTo}::text)) WHERE id = ANY(${childIds})`] : []),
    sql`DELETE FROM debate_comments WHERE id = ${commentId} AND debate_id = ${debateId}`
  ]);
  return true;
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

export type DebateReportState = Record<string, { counts: Record<string, number>; selected: string[] }>;

export async function listDebateReports(debateId: string, profileId?: string): Promise<DebateReportState> {
  const result: DebateReportState = {};
  const persistent = await isPersistentStore();
  const sql = persistent ? database() : null;
  if (sql) {
    const [counts, selected] = await Promise.all([
      sql`SELECT message_id, reason, COUNT(*)::int AS count FROM (
        SELECT message_id, reason FROM debate_argument_reports WHERE debate_id = ${debateId}
        UNION ALL SELECT message_id, reason FROM debate_reports WHERE debate_id = ${debateId}
      ) reports GROUP BY message_id, reason`,
      profileId ? sql`SELECT message_id, reason FROM debate_argument_reports WHERE debate_id = ${debateId} AND profile_id = ${profileId}` : Promise.resolve([])
    ]);
    for (const row of counts) {
      const messageId = row.message_id as string;
      result[messageId] ??= { counts: {}, selected: [] };
      result[messageId].counts[row.reason as string] = Number(row.count);
    }
    for (const row of selected) {
      const messageId = row.message_id as string;
      result[messageId] ??= { counts: {}, selected: [] };
      result[messageId].selected.push(row.reason as string);
    }
    return result;
  }
  for (const report of store.reports.filter((item) => item.debateId === debateId)) {
    result[report.messageId] ??= { counts: {}, selected: [] };
    result[report.messageId].counts[report.reason] = (result[report.messageId].counts[report.reason] ?? 0) + 1;
    if (profileId && report.profileId === profileId) result[report.messageId].selected.push(report.reason);
  }
  return result;
}

export async function toggleDebateReport(debateId: string, messageId: string, reason: string, profileId: string) {
  const debate = await getDebate(debateId);
  if (!debate || !debateArgumentIds(debate).has(messageId)) return null;
  const persistent = await isPersistentStore();
  const sql = persistent ? database() : null;
  if (sql) {
    const inserted = await sql`INSERT INTO debate_argument_reports (debate_id, message_id, profile_id, reason)
      VALUES (${debateId}, ${messageId}, ${profileId}, ${reason}) ON CONFLICT DO NOTHING RETURNING profile_id`;
    if (!inserted.length) await sql`DELETE FROM debate_argument_reports WHERE debate_id = ${debateId} AND message_id = ${messageId} AND profile_id = ${profileId} AND reason = ${reason}`;
  } else {
    const index = store.reports.findIndex((report) => report.debateId === debateId && report.messageId === messageId && report.reason === reason && report.profileId === profileId);
    if (index >= 0) store.reports.splice(index, 1);
    else store.reports.push({ id: `report_${crypto.randomUUID()}`, debateId, messageId, reason, profileId });
  }
  return (await listDebateReports(debateId, profileId))[messageId] ?? { counts: {}, selected: [] };
}