import "server-only";
import { getSessionAccountId } from "@/lib/auth";
import { database, isPersistentStore } from "@/lib/debates";
import { listProfiles } from "@/lib/social";

export type ProfileSpaceKind = "communities" | "groups" | "forums";
export type ProfileSpace = { id: string; profileId: string; kind: ProfileSpaceKind; name: string; description: string; createdAt: string };

type DemoSpaces = { items: ProfileSpace[] };
const globalSpaces = globalThis as typeof globalThis & { __profileSpaces?: DemoSpaces; __profileSpaceSchema?: Promise<void> };
const demo = globalSpaces.__profileSpaces ??= { items: [] };

async function ensureSchema() {
  const sql = database();
  if (!sql) return null;
  await listProfiles();
  globalSpaces.__profileSpaceSchema ??= (async () => {
    await sql`CREATE TABLE IF NOT EXISTS profile_spaces (
      id TEXT PRIMARY KEY,
      profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
      kind TEXT NOT NULL CHECK (kind IN ('communities', 'groups', 'forums')),
      name TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`;
    await sql`CREATE INDEX IF NOT EXISTS profile_spaces_owner_idx ON profile_spaces(profile_id, kind, created_at DESC)`;
  })();
  await globalSpaces.__profileSpaceSchema;
  return sql;
}

export async function listProfileSpaces(profileId: string, kind: ProfileSpaceKind): Promise<ProfileSpace[]> {
  const persistent = await isPersistentStore();
  const sql = persistent ? await ensureSchema() : null;
  if (!sql) return structuredClone(demo.items.filter((item) => item.profileId === profileId && item.kind === kind).sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
  const accountId = await getSessionAccountId();
  if (!accountId) return [];
  const rows = await sql`SELECT s.id, s.profile_id AS "profileId", s.kind, s.name, s.description, s.created_at AS "createdAt"
    FROM profile_spaces s JOIN profiles p ON p.id = s.profile_id
    WHERE s.profile_id = ${profileId} AND s.kind = ${kind} AND p.account_id = ${accountId}
    ORDER BY s.created_at DESC`;
  return rows.map((row) => ({ ...row, createdAt: new Date(row.createdAt as string).toISOString() })) as ProfileSpace[];
}

export async function createProfileSpace(input: { profileId: string; kind: ProfileSpaceKind; name: string; description: string }) {
  const profiles = await listProfiles();
  if (!profiles.some((profile) => profile.id === input.profileId)) return null;
  const item: ProfileSpace = { id: `space_${crypto.randomUUID()}`, profileId: input.profileId, kind: input.kind, name: input.name.trim(), description: input.description.trim(), createdAt: new Date().toISOString() };
  const persistent = await isPersistentStore();
  const sql = persistent ? await ensureSchema() : null;
  if (sql) {
    const accountId = await getSessionAccountId();
    if (!accountId) return null;
    await sql`INSERT INTO profile_spaces (id, profile_id, kind, name, description)
      SELECT ${item.id}, p.id, ${item.kind}, ${item.name}, ${item.description} FROM profiles p
      WHERE p.id = ${item.profileId} AND p.account_id = ${accountId}`;
  } else demo.items.unshift(item);
  return item;
}

export async function deleteProfileSpace(spaceId: string) {
  const persistent = await isPersistentStore();
  const sql = persistent ? await ensureSchema() : null;
  if (!sql) {
    const index = demo.items.findIndex((item) => item.id === spaceId);
    if (index < 0) return false;
    demo.items.splice(index, 1);
    return true;
  }
  const accountId = await getSessionAccountId();
  if (!accountId) return false;
  const rows = await sql`DELETE FROM profile_spaces s USING profiles p WHERE s.id = ${spaceId} AND s.profile_id = p.id AND p.account_id = ${accountId} RETURNING s.id`;
  return rows.length > 0;
}