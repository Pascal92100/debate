import "server-only";
import { getSessionAccountId } from "@/lib/auth";
import { database, isPersistentStore } from "@/lib/debates";
import { listCircles, listProfiles } from "@/lib/social";

export type DiscussionMessage = {
  id: string;
  discussionId: string;
  authorProfileId: string;
  author: string;
  body: string;
  replyTo: { id: string; author: string; excerpt: string } | null;
  createdAt: string;
};

export type SimpleDiscussion = {
  id: string;
  profileId: string;
  circleId: string | null;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: DiscussionMessage[];
};

type DemoState = { discussions: SimpleDiscussion[] };
const globalDiscussions = globalThis as typeof globalThis & { __simpleDiscussions?: DemoState; __discussionSchema?: Promise<void> };
const demoState = globalDiscussions.__simpleDiscussions ??= { discussions: [] };

async function ensureSchema() {
  const sql = database();
  if (!sql) return null;
  await Promise.all([listProfiles(), listCircles()]);
  globalDiscussions.__discussionSchema ??= (async () => {
    await sql`CREATE TABLE IF NOT EXISTS simple_discussions (
      id TEXT PRIMARY KEY,
      profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
      circle_id TEXT REFERENCES circles(id) ON DELETE SET NULL,
      title TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`;
    await sql`ALTER TABLE simple_discussions ADD COLUMN IF NOT EXISTS circle_id TEXT REFERENCES circles(id) ON DELETE SET NULL`;
    await sql`CREATE INDEX IF NOT EXISTS simple_discussions_profile_idx ON simple_discussions(profile_id, updated_at DESC)`;
    await sql`CREATE TABLE IF NOT EXISTS simple_discussion_messages (
      id TEXT PRIMARY KEY,
      discussion_id TEXT NOT NULL REFERENCES simple_discussions(id) ON DELETE CASCADE,
      author_profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
      reply_to_id TEXT,
      payload JSONB NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`;
    await sql`CREATE INDEX IF NOT EXISTS simple_discussion_messages_thread_idx ON simple_discussion_messages(discussion_id, created_at, id)`;
  })();
  await globalDiscussions.__discussionSchema;
  return sql;
}

function sortDiscussion(discussion: SimpleDiscussion) {
  discussion.messages.sort((left, right) => left.createdAt.localeCompare(right.createdAt) || left.id.localeCompare(right.id));
  if (discussion.messages.length) discussion.updatedAt = discussion.messages.at(-1)!.createdAt;
  return discussion;
}

export async function listDiscussions(profileId: string): Promise<SimpleDiscussion[]> {
  const persistent = await isPersistentStore();
  const sql = persistent ? await ensureSchema() : null;
  if (!sql) {
    const accessibleCircleIds = new Set((await listCircles()).map((circle) => circle.id));
    return demoState.discussions.filter((item) => item.profileId === profileId || Boolean(item.circleId && accessibleCircleIds.has(item.circleId))).map((item) => sortDiscussion(structuredClone(item))).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }
  const accountId = await getSessionAccountId();
  if (!accountId) return [];
  const rows = await sql`SELECT d.id, d.profile_id AS "profileId", d.circle_id AS "circleId", d.title, d.created_at AS "createdAt", d.updated_at AS "updatedAt"
    FROM simple_discussions d JOIN profiles p ON p.id = d.profile_id
    WHERE p.id = ${profileId} AND p.account_id = ${accountId}
      AND (d.profile_id = ${profileId} OR EXISTS (
        SELECT 1 FROM circle_members cm JOIN profiles member_profile ON member_profile.id = cm.profile_id
        WHERE cm.circle_id = d.circle_id AND member_profile.id = ${profileId} AND member_profile.account_id = ${accountId}
      ))
    ORDER BY d.updated_at DESC`;
  const discussions: SimpleDiscussion[] = [];
  for (const row of rows) {
    const messages = await sql`SELECT payload FROM simple_discussion_messages WHERE discussion_id = ${row.id} ORDER BY created_at, id`;
    discussions.push(sortDiscussion({ ...row, createdAt: new Date(row.createdAt as string).toISOString(), updatedAt: new Date(row.updatedAt as string).toISOString(), messages: messages.map((message) => message.payload as DiscussionMessage) } as SimpleDiscussion));
  }
  return discussions;
}

export async function getDiscussion(id: string): Promise<SimpleDiscussion | null> {
  const persistent = await isPersistentStore();
  const sql = persistent ? await ensureSchema() : null;
  if (!sql) {
    const discussion = demoState.discussions.find((item) => item.id === id);
    return discussion ? sortDiscussion(structuredClone(discussion)) : null;
  }
  const accountId = await getSessionAccountId();
  if (!accountId) return null;
  const rows = await sql`SELECT d.id, d.profile_id AS "profileId", d.circle_id AS "circleId", d.title, d.created_at AS "createdAt", d.updated_at AS "updatedAt"
    FROM simple_discussions d WHERE d.id = ${id} AND (
      d.profile_id IN (SELECT id FROM profiles WHERE account_id = ${accountId}) OR EXISTS (
        SELECT 1 FROM circle_members cm JOIN profiles p ON p.id = cm.profile_id
        WHERE cm.circle_id = d.circle_id AND p.account_id = ${accountId}
      )
    ) LIMIT 1`;
  if (!rows.length) return null;
  const messages = await sql`SELECT payload FROM simple_discussion_messages WHERE discussion_id = ${id} ORDER BY created_at, id`;
  const row = rows[0];
  return sortDiscussion({ ...row, createdAt: new Date(row.createdAt as string).toISOString(), updatedAt: new Date(row.updatedAt as string).toISOString(), messages: messages.map((message) => message.payload as DiscussionMessage) } as SimpleDiscussion);
}

export async function createDiscussion(input: { profileId: string; title: string; body: string; circleId?: string | null }) {
  const profiles = await listProfiles();
  const profile = profiles.find((item) => item.id === input.profileId);
  if (!profile) return null;
  const circleId = input.circleId || null;
  if (circleId && !(await listCircles()).some((circle) => circle.id === circleId)) return null;
  const now = new Date().toISOString();
  const discussionId = `discussion_${crypto.randomUUID()}`;
  const message: DiscussionMessage = {
    id: `message_${crypto.randomUUID()}`,
    discussionId,
    authorProfileId: profile.id,
    author: profile.name,
    body: input.body.trim(),
    replyTo: null,
    createdAt: now
  };
  const discussion: SimpleDiscussion = { id: discussionId, profileId: profile.id, circleId, title: input.title.trim(), createdAt: now, updatedAt: now, messages: [message] };
  const persistent = await isPersistentStore();
  const sql = persistent ? await ensureSchema() : null;
  if (sql) {
    const accountId = await getSessionAccountId();
    if (!accountId) return null;
    const owned = await sql`SELECT id FROM profiles WHERE id = ${profile.id} AND account_id = ${accountId} LIMIT 1`;
    if (!owned.length) return null;
    const inserted = await sql`INSERT INTO simple_discussions (id, profile_id, circle_id, title, created_at, updated_at)
      SELECT ${discussion.id}, p.id, ${circleId}, ${discussion.title}, ${now}, ${now} FROM profiles p
      WHERE p.id = ${discussion.profileId} AND p.account_id = ${accountId}
        AND (${circleId}::text IS NULL OR EXISTS (SELECT 1 FROM circle_members cm WHERE cm.circle_id = ${circleId} AND cm.profile_id = p.id)) RETURNING id`;
    if (!inserted.length) return null;
    await sql`INSERT INTO simple_discussion_messages (id, discussion_id, author_profile_id, payload, created_at) VALUES (${message.id}, ${discussion.id}, ${profile.id}, ${JSON.stringify(message)}::jsonb, ${now})`;
  } else {
    demoState.discussions.push(discussion);
  }
  return discussion;
}

export async function addDiscussionMessage(discussionId: string, input: { profileId: string; body: string; replyToId?: string }) {
  const discussion = await getDiscussion(discussionId);
  const profiles = await listProfiles();
  const profile = profiles.find((item) => item.id === input.profileId);
  if (!discussion || !profile) return null;
  const target = input.replyToId ? discussion.messages.find((item) => item.id === input.replyToId) : null;
  if (input.replyToId && !target) return null;
  const now = new Date().toISOString();
  const message: DiscussionMessage = {
    id: `message_${crypto.randomUUID()}`,
    discussionId,
    authorProfileId: profile.id,
    author: profile.name,
    body: input.body.trim(),
    replyTo: target ? { id: target.id, author: target.author, excerpt: target.body.slice(0, 180) } : null,
    createdAt: now
  };
  const persistent = await isPersistentStore();
  const sql = persistent ? await ensureSchema() : null;
  if (sql) {
    const accountId = await getSessionAccountId();
    if (!accountId) return null;
    const ownedProfile = await sql`SELECT id FROM profiles WHERE id = ${profile.id} AND account_id = ${accountId} LIMIT 1`;
    if (!ownedProfile.length) return null;
    const inserted = await sql`INSERT INTO simple_discussion_messages (id, discussion_id, author_profile_id, reply_to_id, payload, created_at)
      SELECT ${message.id}, d.id, p.id, ${input.replyToId ?? null}, ${JSON.stringify(message)}::jsonb, ${now}
      FROM simple_discussions d JOIN profiles p ON p.id = ${profile.id} AND p.account_id = ${accountId}
      WHERE d.id = ${discussionId} AND (d.profile_id = p.id OR EXISTS (
        SELECT 1 FROM circle_members cm WHERE cm.circle_id = d.circle_id AND cm.profile_id = p.id
      )) RETURNING id`;
    if (!inserted.length) return null;
    await sql`UPDATE simple_discussions SET updated_at = ${now} WHERE id = ${discussionId}`;
  } else {
    const local = demoState.discussions.find((item) => item.id === discussionId);
    if (!local) return null;
    local.messages.push(message);
    local.updatedAt = now;
  }
  return message;
}

export async function deleteOwnDiscussion(discussionId: string) {
  const persistent = await isPersistentStore();
  const sql = persistent ? await ensureSchema() : null;
  if (!sql) {
    const index = demoState.discussions.findIndex((item) => item.id === discussionId);
    if (index < 0) return false;
    demoState.discussions.splice(index, 1);
    return true;
  }
  const accountId = await getSessionAccountId();
  if (!accountId) return false;
  const rows = await sql`DELETE FROM simple_discussions d USING profiles p WHERE d.id = ${discussionId} AND p.id = d.profile_id AND p.account_id = ${accountId} RETURNING d.id`;
  return rows.length > 0;
}

export async function deleteOwnDiscussionMessage(discussionId: string, messageId: string) {
  const persistent = await isPersistentStore();
  const sql = persistent ? await ensureSchema() : null;
  if (!sql) {
    const discussion = demoState.discussions.find((item) => item.id === discussionId);
    if (!discussion) return false;
    const index = discussion.messages.findIndex((item) => item.id === messageId && item.authorProfileId === "profile-john");
    if (index < 0) return false;
    discussion.messages.splice(index, 1);
    discussion.updatedAt = discussion.messages.at(-1)?.createdAt ?? discussion.createdAt;
    return true;
  }
  const accountId = await getSessionAccountId();
  if (!accountId) return false;
  const rows = await sql`DELETE FROM simple_discussion_messages m USING profiles p, simple_discussions d
    WHERE m.id = ${messageId} AND m.discussion_id = d.id AND d.id = ${discussionId}
      AND m.author_profile_id = p.id AND p.account_id = ${accountId} RETURNING m.id`;
  if (!rows.length) return false;
  await sql`UPDATE simple_discussions SET updated_at = COALESCE((SELECT MAX(created_at) FROM simple_discussion_messages WHERE discussion_id = ${discussionId}), created_at)
    WHERE id = ${discussionId}`;
  return true;
}