import "server-only";
import { getSessionAccountId } from "@/lib/auth";
import { database, isPersistentStore } from "@/lib/debates";
import { listCircles, listProfiles } from "@/lib/social";

export type SavedProfileSearch = { id: string; profileId: string; name: string; criteria: Record<string, unknown>; updatedAt: string };
export type ProfileEvent = { id: string; profileId: string; title: string; description: string; startsAt: string | null; location: string; createdAt: string };
export type ProfileAlert = { id: string; profileId: string; kind: string; payload: Record<string, unknown>; readAt: string | null; createdAt: string };

type DemoModules = { searches: SavedProfileSearch[]; events: ProfileEvent[]; alerts: ProfileAlert[] };
const globalModules = globalThis as typeof globalThis & { __profileModules?: DemoModules; __profileModuleSchema?: Promise<void> };
const demo: DemoModules = globalModules.__profileModules ??= {
  searches: [],
  events: [],
  alerts: [
    ["reply", "A reply was added to your discussion.", 2],
    ["mention", "You were mentioned in a conversation.", 5],
    ["visit", "Someone visited this profile.", 9],
    ["reply", "A new response is waiting for you.", 15],
    ["mention", "Your profile was mentioned in a post.", 22],
    ["visit", "Someone visited this profile.", 31],
    ["reply", "A debate you follow has a new reply.", 46]
  ].map(([kind, message, minutes]) => ({
    id: `demo-alert-${minutes}`,
    profileId: "profile-john",
    kind: String(kind),
    payload: { message },
    readAt: null,
    createdAt: new Date(Date.now() - Number(minutes) * 60_000).toISOString()
  }))
};

async function ensureModuleSchema() {
  const sql = database();
  if (!sql) return null;
  await Promise.all([listProfiles(), listCircles()]);
  globalModules.__profileModuleSchema ??= (async () => {
    await sql`CREATE TABLE IF NOT EXISTS saved_searches (
      id TEXT PRIMARY KEY,
      profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      criteria JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`;
    await sql`CREATE TABLE IF NOT EXISTS social_events (
      id TEXT PRIMARY KEY,
      created_by_profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
      circle_id TEXT REFERENCES circles(id) ON DELETE SET NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      starts_at TIMESTAMPTZ,
      ends_at TIMESTAMPTZ,
      location JSONB NOT NULL DEFAULT '{}'::jsonb,
      visibility TEXT NOT NULL DEFAULT 'circle',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`;
    await sql`CREATE TABLE IF NOT EXISTS alerts (
      id TEXT PRIMARY KEY,
      profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
      kind TEXT NOT NULL,
      payload JSONB NOT NULL DEFAULT '{}'::jsonb,
      read_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`;
  })();
  await globalModules.__profileModuleSchema;
  return sql;
}

async function profileOwned(profileId: string) {
  const profiles = await listProfiles();
  return profiles.find((item) => item.id === profileId) ?? null;
}

export async function listProfileSearches(profileId: string): Promise<SavedProfileSearch[]> {
  const persistent = await isPersistentStore();
  const sql = persistent ? await ensureModuleSchema() : null;
  if (!sql) return structuredClone(demo.searches.filter((item) => item.profileId === profileId).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)));
  const accountId = await getSessionAccountId();
  if (!accountId) return [];
  const rows = await sql`SELECT s.id, s.profile_id AS "profileId", s.name, s.criteria, s.updated_at AS "updatedAt"
    FROM saved_searches s JOIN profiles p ON p.id = s.profile_id WHERE s.profile_id = ${profileId} AND p.account_id = ${accountId} ORDER BY s.updated_at DESC`;
  return rows.map((row) => ({ ...row, updatedAt: new Date(row.updatedAt as string).toISOString() })) as SavedProfileSearch[];
}

export async function createProfileSearch(input: { profileId: string; name: string; criteria: Record<string, unknown> }) {
  if (!(await profileOwned(input.profileId))) return null;
  const search: SavedProfileSearch = { id: `search_${crypto.randomUUID()}`, profileId: input.profileId, name: input.name.trim(), criteria: input.criteria, updatedAt: new Date().toISOString() };
  const persistent = await isPersistentStore();
  const sql = persistent ? await ensureModuleSchema() : null;
  if (sql) {
    const accountId = await getSessionAccountId();
    if (!accountId) return null;
    await sql`INSERT INTO saved_searches (id, profile_id, name, criteria) SELECT ${search.id}, p.id, ${search.name}, ${JSON.stringify(search.criteria)}::jsonb FROM profiles p WHERE p.id = ${search.profileId} AND p.account_id = ${accountId}`;
  } else demo.searches.unshift(search);
  return search;
}

export async function deleteProfileSearch(searchId: string) {
  const persistent = await isPersistentStore();
  const sql = persistent ? await ensureModuleSchema() : null;
  if (!sql) {
    const index = demo.searches.findIndex((item) => item.id === searchId);
    if (index < 0) return false;
    demo.searches.splice(index, 1);
    return true;
  }
  const accountId = await getSessionAccountId();
  if (!accountId) return false;
  const rows = await sql`DELETE FROM saved_searches s USING profiles p WHERE s.id = ${searchId} AND s.profile_id = p.id AND p.account_id = ${accountId} RETURNING s.id`;
  return rows.length > 0;
}

export async function listProfileEvents(profileId: string): Promise<ProfileEvent[]> {
  const persistent = await isPersistentStore();
  const sql = persistent ? await ensureModuleSchema() : null;
  if (!sql) return structuredClone(demo.events.filter((item) => item.profileId === profileId).sort((a, b) => (a.startsAt ?? a.createdAt).localeCompare(b.startsAt ?? b.createdAt)));
  const accountId = await getSessionAccountId();
  if (!accountId) return [];
  const rows = await sql`SELECT e.id, e.created_by_profile_id AS "profileId", e.title, e.description, e.starts_at AS "startsAt", e.location, e.created_at AS "createdAt"
    FROM social_events e JOIN profiles p ON p.id = e.created_by_profile_id WHERE e.created_by_profile_id = ${profileId} AND p.account_id = ${accountId} ORDER BY e.starts_at NULLS LAST, e.created_at`;
  return rows.map((row) => ({ ...row, startsAt: row.startsAt ? new Date(row.startsAt as string).toISOString() : null, createdAt: new Date(row.createdAt as string).toISOString(), location: typeof row.location === "string" ? row.location : JSON.stringify(row.location ?? "") })) as ProfileEvent[];
}

export async function createProfileEvent(input: { profileId: string; title: string; description: string; startsAt: string | null; location: string }) {
  if (!(await profileOwned(input.profileId))) return null;
  const now = new Date().toISOString();
  const event: ProfileEvent = { id: `event_${crypto.randomUUID()}`, profileId: input.profileId, title: input.title.trim(), description: input.description.trim(), startsAt: input.startsAt, location: input.location.trim(), createdAt: now };
  const persistent = await isPersistentStore();
  const sql = persistent ? await ensureModuleSchema() : null;
  if (sql) {
    const accountId = await getSessionAccountId();
    if (!accountId) return null;
    await sql`INSERT INTO social_events (id, created_by_profile_id, title, description, starts_at, location, visibility)
      SELECT ${event.id}, p.id, ${event.title}, ${event.description}, ${event.startsAt}, ${JSON.stringify({ label: event.location })}::jsonb, 'circle'
      FROM profiles p WHERE p.id = ${event.profileId} AND p.account_id = ${accountId}`;
  } else demo.events.push(event);
  return event;
}

export async function deleteProfileEvent(eventId: string) {
  const persistent = await isPersistentStore();
  const sql = persistent ? await ensureModuleSchema() : null;
  if (!sql) {
    const index = demo.events.findIndex((item) => item.id === eventId);
    if (index < 0) return false;
    demo.events.splice(index, 1);
    return true;
  }
  const accountId = await getSessionAccountId();
  if (!accountId) return false;
  const rows = await sql`DELETE FROM social_events e USING profiles p WHERE e.id = ${eventId} AND e.created_by_profile_id = p.id AND p.account_id = ${accountId} RETURNING e.id`;
  return rows.length > 0;
}

export async function listProfileAlerts(profileId: string): Promise<ProfileAlert[]> {
  const persistent = await isPersistentStore();
  const sql = persistent ? await ensureModuleSchema() : null;
  if (!sql) return structuredClone(demo.alerts.filter((item) => item.profileId === profileId).sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
  const accountId = await getSessionAccountId();
  if (!accountId) return [];
  const rows = await sql`SELECT a.id, a.profile_id AS "profileId", a.kind, a.payload, a.read_at AS "readAt", a.created_at AS "createdAt"
    FROM alerts a JOIN profiles p ON p.id = a.profile_id WHERE a.profile_id = ${profileId} AND p.account_id = ${accountId} ORDER BY a.created_at DESC`;
  return rows.map((row) => ({ ...row, readAt: row.readAt ? new Date(row.readAt as string).toISOString() : null, createdAt: new Date(row.createdAt as string).toISOString() })) as ProfileAlert[];
}

export async function getUnreadProfileAlertCount(profileId: string): Promise<number> {
  const persistent = await isPersistentStore();
  const sql = persistent ? await ensureModuleSchema() : null;
  if (!sql) return demo.alerts.filter((alert) => alert.profileId === profileId && !alert.readAt).length;
  const accountId = await getSessionAccountId();
  if (!accountId) return 0;
  const rows = await sql`SELECT COUNT(*)::int AS count FROM alerts a JOIN profiles p ON p.id = a.profile_id WHERE a.profile_id = ${profileId} AND p.account_id = ${accountId} AND a.read_at IS NULL`;
  return Number(rows[0]?.count ?? 0);
}

export async function createProfileAlert(profileId: string, kind: string, payload: Record<string, unknown>) {
  const alert: ProfileAlert = { id: `alert_${crypto.randomUUID()}`, profileId, kind, payload, readAt: null, createdAt: new Date().toISOString() };
  const persistent = await isPersistentStore();
  const sql = persistent ? await ensureModuleSchema() : null;
  if (sql) {
    await sql`INSERT INTO alerts (id, profile_id, kind, payload) VALUES (${alert.id}, ${alert.profileId}, ${alert.kind}, ${JSON.stringify(alert.payload)}::jsonb)`;
  } else demo.alerts.unshift(alert);
  return alert;
}

export async function markMetaProfileInvitationAlertRead(invitationToken: string) {
  const persistent = await isPersistentStore();
  const sql = persistent ? await ensureModuleSchema() : null;
  if (sql) {
    await sql`UPDATE alerts SET read_at = NOW() WHERE payload->>'invitationToken' = ${invitationToken} AND read_at IS NULL`;
    return;
  }
  const alert = demo.alerts.find((item) => item.payload.invitationToken === invitationToken);
  if (alert) alert.readAt = new Date().toISOString();
}

export async function markProfileAlertRead(alertId: string) {
  const persistent = await isPersistentStore();
  const sql = persistent ? await ensureModuleSchema() : null;
  if (!sql) {
    const alert = demo.alerts.find((item) => item.id === alertId);
    if (!alert) return false;
    alert.readAt = new Date().toISOString();
    return true;
  }
  const accountId = await getSessionAccountId();
  if (!accountId) return false;
  const rows = await sql`UPDATE alerts a SET read_at = NOW() FROM profiles p
    WHERE a.id = ${alertId} AND a.profile_id = p.id AND p.account_id = ${accountId} AND a.read_at IS NULL RETURNING a.id`;
  return rows.length > 0;
}