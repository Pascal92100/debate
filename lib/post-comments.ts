import "server-only";
import { getSessionAccountId } from "@/lib/auth";
import { database, isPersistentStore } from "@/lib/debates";
import type { MediaAttachment } from "@/lib/media";
import { getSocialPost, listProfiles } from "@/lib/social";

export type SocialPostComment = {
  id: string;
  postId: string;
  profileId: string;
  author: string;
  body: string;
  media: MediaAttachment[];
  replyTo: { id: string; author: string; excerpt: string } | null;
  createdAt: string;
};

type DemoPostComments = Record<string, SocialPostComment[]>;
const globalPostComments = globalThis as typeof globalThis & { __socialPostComments?: DemoPostComments; __socialPostCommentSchema?: Promise<void> };
const demo = globalPostComments.__socialPostComments ??= {};

async function ensureSchema() {
  const sql = database();
  if (!sql) return null;
  globalPostComments.__socialPostCommentSchema ??= (async () => {
    await sql`CREATE TABLE IF NOT EXISTS social_post_comments (
      id TEXT PRIMARY KEY,
      post_id TEXT NOT NULL REFERENCES social_posts(id) ON DELETE CASCADE,
      profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
      parent_comment_id TEXT REFERENCES social_post_comments(id) ON DELETE CASCADE,
      body TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      payload JSONB NOT NULL DEFAULT '{}'::jsonb
    )`;
    await sql`ALTER TABLE social_post_comments ADD COLUMN IF NOT EXISTS payload JSONB NOT NULL DEFAULT '{}'::jsonb`;
    await sql`CREATE INDEX IF NOT EXISTS social_post_comments_thread_idx ON social_post_comments(post_id, created_at, id)`;
  })();
  await globalPostComments.__socialPostCommentSchema;
  return sql;
}

export async function listPostComments(postId: string): Promise<SocialPostComment[]> {
  const post = await getSocialPost(postId);
  if (!post) return [];
  const persistent = await isPersistentStore();
  const sql = persistent ? await ensureSchema() : null;
  if (!sql) return structuredClone(demo[postId] ?? []).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const rows = await sql`SELECT payload FROM social_post_comments WHERE post_id = ${postId} ORDER BY created_at, id`;
  return rows.map((row) => row.payload as SocialPostComment);
}

export async function createPostComment(postId: string, input: { profileId: string; body: string; media?: MediaAttachment[]; replyToId?: string }) {
  const post = await getSocialPost(postId);
  if (!post) return null;
  const profiles = await listProfiles();
  const profile = profiles.find((item) => item.id === input.profileId);
  if (!profile) return null;
  const existing = await listPostComments(postId);
  const target = input.replyToId ? existing.find((comment) => comment.id === input.replyToId) : null;
  if (input.replyToId && !target) return null;
  const comment: SocialPostComment = {
    id: `post_comment_${crypto.randomUUID()}`,
    postId,
    profileId: profile.id,
    author: profile.name,
    body: input.body.trim(),
    media: input.media ?? [],
    replyTo: target ? { id: target.id, author: target.author, excerpt: target.body.slice(0, 180) } : null,
    createdAt: new Date().toISOString()
  };
  const persistent = await isPersistentStore();
  const sql = persistent ? await ensureSchema() : null;
  if (sql) {
    const accountId = await getSessionAccountId();
    if (!accountId) return null;
    const rows = await sql`INSERT INTO social_post_comments (id, post_id, profile_id, parent_comment_id, body, created_at, payload)
      SELECT ${comment.id}, sp.id, p.id, ${input.replyToId ?? null}, ${comment.body}, ${comment.createdAt}, ${JSON.stringify(comment)}::jsonb
      FROM social_posts sp JOIN profiles p ON p.id = ${profile.id} AND p.account_id = ${accountId}
      WHERE sp.id = ${postId} AND (sp.profile_id = p.id OR (sp.circle_id IS NOT NULL AND EXISTS (SELECT 1 FROM circle_members cm WHERE cm.circle_id = sp.circle_id AND cm.profile_id = p.id)))
      RETURNING id`;
    if (!rows.length) return null;
  } else {
    demo[postId] ??= [];
    demo[postId].push(comment);
  }
  return comment;
}

export async function deleteOwnPostComment(postId: string, commentId: string) {
  const persistent = await isPersistentStore();
  const sql = persistent ? await ensureSchema() : null;
  if (!sql) {
    const comments = demo[postId] ?? [];
    const index = comments.findIndex((comment) => comment.id === commentId && comment.profileId === "profile-john");
    if (index < 0) return false;
    comments.splice(index, 1);
    return true;
  }
  const accountId = await getSessionAccountId();
  if (!accountId) return false;
  const rows = await sql`DELETE FROM social_post_comments c USING profiles p
    WHERE c.id = ${commentId} AND c.post_id = ${postId} AND c.profile_id = p.id AND p.account_id = ${accountId} RETURNING c.id`;
  return rows.length > 0;
}