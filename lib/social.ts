import "server-only";
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { getSessionAccountId, createSessionToken, sessionCookieName, sessionLifetimeSeconds } from "@/lib/auth";
import { database, isPersistentStore } from "@/lib/debates";
import fixture from "../social.json";
import type { MediaAttachment } from "@/lib/media";

export { createSessionToken, getSessionAccountId, sessionCookieName, sessionLifetimeSeconds };

export type SocialProfile = {
  id: string;
  accountId: string;
  name: string;
  kind: string;
  category: string;
  avatar: string;
  bio: string;
  visibility: string;
  socialDistance: number;
  anonymous: boolean;
  contentFilters?: string[];
  locationLabel?: string;
  dynamicLocationEnabled?: boolean;
  dynamicLocationCircleId?: string;
  members?: string[];
  includesLabel?: string;
  memberRoles?: Record<string, string>;
  relationship?: string;
  firstName?: string;
  lastName?: string;
  nationalities?: string[];
  birthdate?: string;
  sex?: string;
  relationshipStatus?: string;
  languages?: string[];
  location?: string;
};

export type DescriptionField = { value: string; enabled: boolean; duration?: string; expiresAt?: string };
export type DescriptionTheme = { enabled: boolean; duration?: string; expiresAt?: string; description: string; fields: Record<string, string | number>; fieldStates?: Record<string, boolean>; tags: string[] };
export type ProfileDescription = {
  profileId: string;
  visibility: "ghost" | "relatives" | "other";
  relationship: string;
  text: string;
  textEnabled: boolean;
  textDuration?: string;
  textExpiresAt?: string;
  identity: Record<string, DescriptionField>;
  themes: Record<string, DescriptionTheme>;
};

export type SocialCircle = {
  id: string;
  ownerProfileId: string;
  name: string;
  kind: string;
  locationMode: string;
  description: string;
  visibility: string;
  memberCount: number;
};

export type SocialAccount = {
  id: string;
  displayName: string;
  nationalities: string[];
  birthdate: string | null;
  address: string | null;
  phone: string | null;
  email?: string;
};

export type AccountDescriptionField = { value: string; enabled: boolean };
export type AccountDescription = {
  accountId: string;
  text: string;
  fields: Record<string, AccountDescriptionField>;
  themes: Record<string, DescriptionTheme>;
};

function demoAccountDescription(): AccountDescription {
  const account = fixture.account as SocialAccount;
  const demoThemes = (fixture.descriptions as ProfileDescription[])[0]?.themes ?? {};
  return {
    accountId: account.id,
    text: "",
    fields: {
      firstName: { value: "John", enabled: true },
      lastName: { value: "Doe", enabled: true },
      nationalities: { value: account.nationalities.join(", "), enabled: true },
      birthdate: { value: account.birthdate ?? "", enabled: true },
      sex: { value: "Male", enabled: true },
      relationshipStatus: { value: "In relationship", enabled: true },
      languages: { value: "English, French", enabled: true },
      location: { value: "Paris", enabled: true },
      address: { value: account.address ?? "", enabled: true },
      phone: { value: account.phone ?? "", enabled: true }
    },
    themes: Object.fromEntries(Object.entries(demoThemes).filter(([themeId]) => themeId !== "kinky").map(([themeId, theme]) => [themeId, structuredClone(theme)]))
  };
}

export type SocialPost = {
  id: string;
  profileId: string;
  author: string;
  avatar: string;
  circleId: string | null;
  circleName: string | null;
  title: string;
  body: string;
  subtext: string;
  kind: "publication" | "debate" | "event" | "alert";
  visibility: string;
  createdAt: string;
  debateId: string | null;
  reactions: Record<string, number>;
  commentsCount: number;
  media?: MediaAttachment[];
  formats?: string[];
  metadata?: { startsAt?: string; location?: string; duration?: string; target?: string };
};

type SocialState = {
  profiles: SocialProfile[];
  circles: SocialCircle[];
  posts: SocialPost[];
  descriptions: ProfileDescription[];
  accountDescription: AccountDescription;
  reactions: Array<{ postId: string; profileId: string; reaction: string }>;
  persistentReady: boolean;
};

const globalSocial = globalThis as typeof globalThis & { __socialState?: SocialState };
const state = globalSocial.__socialState ??= {
  profiles: structuredClone(fixture.profiles) as SocialProfile[],
  circles: structuredClone(fixture.circles) as SocialCircle[],
  posts: structuredClone(fixture.posts) as SocialPost[],
  descriptions: structuredClone(fixture.descriptions) as ProfileDescription[],
  accountDescription: demoAccountDescription(),
  reactions: [],
  persistentReady: false
};
state.accountDescription ??= demoAccountDescription();
const demoProfileId = "profile-john";

async function useDatabase() {
  if (!await isPersistentStore()) return null;
  const sql = database();
  if (!sql) return null;
  if (state.persistentReady) return sql;

  await sql`CREATE TABLE IF NOT EXISTS accounts (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE,
    display_name TEXT NOT NULL,
    auth_subject TEXT UNIQUE,
    nationalities JSONB NOT NULL DEFAULT '[]'::jsonb,
    birthdate DATE,
    address TEXT,
    phone TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`;
  await sql`ALTER TABLE accounts ADD COLUMN IF NOT EXISTS nationalities JSONB NOT NULL DEFAULT '[]'::jsonb`;
  await sql`ALTER TABLE accounts ADD COLUMN IF NOT EXISTS birthdate DATE`;
  await sql`ALTER TABLE accounts ADD COLUMN IF NOT EXISTS address TEXT`;
  await sql`ALTER TABLE accounts ADD COLUMN IF NOT EXISTS phone TEXT`;
  await sql`ALTER TABLE accounts ADD COLUMN IF NOT EXISTS description_text TEXT NOT NULL DEFAULT ''`;
  await sql`ALTER TABLE accounts ADD COLUMN IF NOT EXISTS description_payload JSONB NOT NULL DEFAULT '{}'::jsonb`;
  await sql`ALTER TABLE accounts ADD COLUMN IF NOT EXISTS password_hash TEXT`;
  await sql`ALTER TABLE accounts ADD COLUMN IF NOT EXISTS is_primary BOOLEAN NOT NULL DEFAULT FALSE`;
  await sql`CREATE UNIQUE INDEX IF NOT EXISTS accounts_single_primary_idx ON accounts(is_primary) WHERE is_primary`;
  await sql`CREATE TABLE IF NOT EXISTS profiles (
    id TEXT PRIMARY KEY,
    account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    kind TEXT NOT NULL DEFAULT 'individual',
    category TEXT NOT NULL DEFAULT '',
    avatar TEXT NOT NULL DEFAULT '',
    bio TEXT NOT NULL DEFAULT '',
    visibility TEXT NOT NULL DEFAULT 'all',
    social_distance INTEGER NOT NULL DEFAULT 0,
    anonymous BOOLEAN NOT NULL DEFAULT FALSE,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`;
  await sql`ALTER TABLE profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`;
  await sql`CREATE TABLE IF NOT EXISTS meta_profile_members (
    meta_profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    member_profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'member',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (meta_profile_id, member_profile_id),
    CHECK (meta_profile_id <> member_profile_id)
  )`;
  await sql`CREATE TABLE IF NOT EXISTS profile_preferences (
    profile_id TEXT PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
    anonymous_navigation BOOLEAN NOT NULL DEFAULT FALSE,
    content_filters JSONB NOT NULL DEFAULT '[]'::jsonb,
    language_preferences JSONB NOT NULL DEFAULT '[]'::jsonb,
    location_label TEXT,
    dynamic_location_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    dynamic_location_circle_id TEXT,
    settings JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`;
  const duplicatePseudos = await sql`SELECT LOWER(BTRIM(name)) AS pseudo FROM profiles GROUP BY LOWER(BTRIM(name)) HAVING COUNT(*) > 1 LIMIT 1`;
  if (!duplicatePseudos.length) await sql`CREATE UNIQUE INDEX IF NOT EXISTS profiles_pseudo_unique_idx ON profiles (LOWER(BTRIM(name)))`;
  await sql`ALTER TABLE profile_preferences ADD COLUMN IF NOT EXISTS dynamic_location_enabled BOOLEAN NOT NULL DEFAULT FALSE`;
  await sql`CREATE TABLE IF NOT EXISTS circles (
    id TEXT PRIMARY KEY,
    owner_profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    kind TEXT NOT NULL DEFAULT 'general',
    location_mode TEXT NOT NULL DEFAULT 'Online',
    description TEXT NOT NULL DEFAULT '',
    visibility TEXT NOT NULL DEFAULT 'private',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`;
  await sql`CREATE TABLE IF NOT EXISTS circle_members (
    circle_id TEXT NOT NULL REFERENCES circles(id) ON DELETE CASCADE,
    profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'member',
    status TEXT NOT NULL DEFAULT 'active',
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (circle_id, profile_id)
  )`;
  await sql`CREATE TABLE IF NOT EXISTS social_posts (
    id TEXT PRIMARY KEY,
    profile_id TEXT NOT NULL REFERENCES profiles(id),
    circle_id TEXT REFERENCES circles(id) ON DELETE SET NULL,
    debate_id TEXT,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    subtext TEXT NOT NULL DEFAULT '',
    kind TEXT NOT NULL DEFAULT 'publication',
    visibility TEXT NOT NULL DEFAULT 'circle',
    payload JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`;
  await sql`CREATE TABLE IF NOT EXISTS social_post_reactions (
    post_id TEXT NOT NULL REFERENCES social_posts(id) ON DELETE CASCADE,
    profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    reaction TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (post_id, profile_id)
  )`;
  await sql`CREATE TABLE IF NOT EXISTS profile_descriptions (
    id TEXT PRIMARY KEY,
    profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    theme TEXT NOT NULL DEFAULT 'general',
    content TEXT NOT NULL DEFAULT '',
    audience TEXT NOT NULL DEFAULT 'all',
    visibility TEXT NOT NULL DEFAULT 'all',
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    sort_order INTEGER NOT NULL DEFAULT 0,
    tags JSONB NOT NULL DEFAULT '[]'::jsonb,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (profile_id, theme, audience)
  )`;
  await sql`ALTER TABLE profile_descriptions ADD COLUMN IF NOT EXISTS payload JSONB NOT NULL DEFAULT '{}'::jsonb`;
  await sql`UPDATE debates SET
    author_profile_id = NULLIF(payload->>'authorProfileId', ''),
    circle_id = NULLIF(payload->>'circleId', ''),
    source_post_id = NULLIF(payload->>'sourcePostId', '')
    WHERE author_profile_id IS NULL OR source_post_id IS NULL`;
  state.persistentReady = true;
  return sql;
}

export async function listProfiles() {
  const sql = await useDatabase();
  if (!sql) return structuredClone(state.profiles);
  const accountId = await getSessionAccountId();
  if (!accountId) return [];
  const rows = await sql`SELECT p.payload, p.account_id = ${accountId} AS "isOwner", COALESCE((SELECT jsonb_agg(m.member_profile_id) FROM meta_profile_members m JOIN profiles represented ON represented.id = m.member_profile_id WHERE m.meta_profile_id = p.id AND represented.account_id = ${accountId}), '[]'::jsonb) AS "ownMembers", fp.content_filters, fp.location_label, fp.dynamic_location_enabled, fp.dynamic_location_circle_id FROM profiles p LEFT JOIN profile_preferences fp ON fp.profile_id = p.id WHERE p.account_id = ${accountId} OR EXISTS (SELECT 1 FROM meta_profile_members m JOIN profiles represented ON represented.id = m.member_profile_id WHERE m.meta_profile_id = p.id AND represented.account_id = ${accountId}) ORDER BY p.created_at`;
  return rows.map((row) => ({
    ...(row.payload as SocialProfile),
    ...(!(row.isOwner as boolean) ? { members: (row.ownMembers as string[]) ?? [], memberRoles: {} } : {}),
    contentFilters: (row.content_filters as string[] | null) ?? [],
    locationLabel: row.location_label as string | null ?? undefined,
    dynamicLocationEnabled: Boolean(row.dynamic_location_enabled),
    dynamicLocationCircleId: row.dynamic_location_circle_id as string | null ?? undefined
  }));
}

export async function saveProfilePreferences(profileId: string, preferences: { visibility: string; socialDistance: number; anonymous: boolean; contentFilters: string[]; locationLabel: string; dynamicLocationEnabled: boolean; dynamicLocationCircleId: string }) {
  const sql = await useDatabase();
  if (!sql) {
    state.profiles = state.profiles.map((profile) => profile.id === profileId ? {
      ...profile,
      visibility: preferences.visibility,
      socialDistance: preferences.socialDistance,
      anonymous: preferences.anonymous,
      contentFilters: preferences.contentFilters,
      locationLabel: preferences.locationLabel,
      dynamicLocationEnabled: preferences.dynamicLocationEnabled,
      dynamicLocationCircleId: preferences.dynamicLocationCircleId
    } : profile);
    return true;
  }
  const accountId = await getSessionAccountId();
  if (!accountId) return false;
  if (preferences.dynamicLocationEnabled && !preferences.dynamicLocationCircleId) return false;
  const rows = await sql`SELECT id FROM profiles WHERE id = ${profileId} AND account_id = ${accountId} LIMIT 1`;
  if (!rows.length) return false;
  if (preferences.dynamicLocationEnabled && preferences.dynamicLocationCircleId) {
    const circle = await sql`SELECT id FROM circles WHERE id = ${preferences.dynamicLocationCircleId} AND (owner_profile_id IN (SELECT id FROM profiles WHERE account_id = ${accountId}) OR EXISTS (SELECT 1 FROM circle_members cm JOIN profiles p ON p.id = cm.profile_id WHERE cm.circle_id = circles.id AND p.account_id = ${accountId})) LIMIT 1`;
    if (!circle.length) return false;
  }
  await sql`INSERT INTO profile_preferences (profile_id, anonymous_navigation, content_filters, location_label, dynamic_location_enabled, dynamic_location_circle_id, settings, updated_at)
    VALUES (${profileId}, ${preferences.anonymous}, ${JSON.stringify(preferences.contentFilters)}::jsonb, NULLIF(${preferences.locationLabel}, ''), ${preferences.dynamicLocationEnabled}, ${preferences.dynamicLocationEnabled ? preferences.dynamicLocationCircleId || null : null}, ${JSON.stringify({ visibility: preferences.visibility, socialDistance: preferences.socialDistance })}::jsonb, NOW())
    ON CONFLICT (profile_id) DO UPDATE SET anonymous_navigation = EXCLUDED.anonymous_navigation, content_filters = EXCLUDED.content_filters, location_label = EXCLUDED.location_label, dynamic_location_enabled = EXCLUDED.dynamic_location_enabled, dynamic_location_circle_id = EXCLUDED.dynamic_location_circle_id, settings = EXCLUDED.settings, updated_at = NOW()`;
  await sql`UPDATE profiles SET visibility = ${preferences.visibility}, social_distance = ${preferences.socialDistance}, anonymous = ${preferences.anonymous}, payload = jsonb_set(jsonb_set(jsonb_set(payload, '{visibility}', to_jsonb(${preferences.visibility}::text)), '{socialDistance}', to_jsonb(${preferences.socialDistance}::int)), '{anonymous}', to_jsonb(${preferences.anonymous}::boolean)), updated_at = NOW() WHERE id = ${profileId} AND account_id = ${accountId}`;
  return true;
}

export async function getAccount(accountId?: string): Promise<SocialAccount | null> {
  const sql = await useDatabase();
  if (!sql) {
    const account = structuredClone(fixture.account as SocialAccount);
    const fields = state.accountDescription.fields;
    account.displayName = `${fields.firstName?.value ?? ""} ${fields.lastName?.value ?? ""}`.trim();
    account.nationalities = (fields.nationalities?.value ?? "").split(",").map((value) => value.trim()).filter(Boolean);
    account.birthdate = fields.birthdate?.value || null;
    account.address = fields.address?.value || null;
    account.phone = fields.phone?.value || null;
    return account;
  }
  if (!accountId || accountId !== await getSessionAccountId()) return null;
  const rows = await sql`SELECT id, display_name AS "displayName", nationalities, birthdate::text AS birthdate, address, phone, email FROM accounts WHERE id = ${accountId} LIMIT 1`;
  return (rows[0] as SocialAccount | undefined) ?? null;
}

export async function getAccountCount() {
  const sql = await useDatabase();
  if (!sql) return 1;
  const [legacyRows, countRows] = await Promise.all([
    sql`SELECT id FROM accounts WHERE id = 'account-demo' AND email IS NULL AND auth_subject IS NULL AND password_hash IS NULL AND is_primary = FALSE`,
    sql`SELECT COUNT(*)::int AS count FROM accounts`
  ]);
  if (legacyRows.length === 1 && Number(countRows[0]?.count) === 1) {
    const profiles = await sql`SELECT id FROM profiles WHERE account_id = 'account-demo'`;
    const profileIds = profiles.map((profile) => profile.id as string);
    const cleanup = [
      ...(profileIds.length ? [
        sql`DELETE FROM social_post_comments WHERE profile_id = ANY(${profileIds})`,
        sql`DELETE FROM social_posts WHERE profile_id = ANY(${profileIds})`,
        sql`DELETE FROM private_messages WHERE sender_profile_id = ANY(${profileIds})`,
        sql`DELETE FROM social_events WHERE created_by_profile_id = ANY(${profileIds})`,
        sql`DELETE FROM retributions WHERE sender_profile_id = ANY(${profileIds}) OR recipient_profile_id = ANY(${profileIds})`
      ] : []),
      sql`DELETE FROM accounts WHERE id = 'account-demo' AND email IS NULL AND auth_subject IS NULL AND password_hash IS NULL AND is_primary = FALSE`
    ];
    await sql.transaction(cleanup);
  }
  const rows = await sql`SELECT COUNT(*)::int AS count FROM accounts`;
  return Number(rows[0]?.count ?? 0);
}

export async function getUnreadAlertCount(accountId?: string) {
  const sql = await useDatabase();
  if (!sql) {
    const demoModules = globalThis as typeof globalThis & { __profileModules?: { alerts?: Array<{ readAt: string | null }> } };
    return demoModules.__profileModules?.alerts?.filter((alert) => !alert.readAt).length ?? 7;
  }
  if (!accountId) return 0;
  const rows = await sql`SELECT COUNT(*)::int AS count FROM alerts a JOIN profiles p ON p.id = a.profile_id WHERE p.account_id = ${accountId} AND a.read_at IS NULL`;
  return Number(rows[0]?.count ?? 0);
}

function hashPassword(password: string, salt = randomBytes(16)) {
  return `${salt.toString("base64url")}:${scryptSync(password, salt, 64).toString("base64url")}`;
}

function verifyPassword(password: string, storedHash: string) {
  const [saltText, hashText] = storedHash.split(":");
  if (!saltText || !hashText) return false;
  const expected = Buffer.from(hashText, "base64url");
  const actual = scryptSync(password, Buffer.from(saltText, "base64url"), expected.length);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export async function createInitialAccount(input: { displayName: string; email: string; password: string }) {
  const sql = await useDatabase();
  if (!sql) throw new Error("Database connection is required to create the primary account.");
  const accountId = `account_${crypto.randomUUID()}`;
  const passwordHash = hashPassword(input.password);
  const rows = await sql`INSERT INTO accounts (id, email, display_name, password_hash, is_primary)
    SELECT ${accountId}, ${input.email.trim().toLowerCase()}, ${input.displayName.trim()}, ${passwordHash}, NOT EXISTS (SELECT 1 FROM accounts WHERE is_primary = TRUE)
    ON CONFLICT DO NOTHING
    RETURNING id`;
  if (!rows[0]?.id) throw new Error("This email is already in use.");
  return { accountId };
}

export async function getAccountDescription(): Promise<AccountDescription | null> {
  const sql = await useDatabase();
  if (!sql) return structuredClone(state.accountDescription);
  const accountId = await getSessionAccountId();
  if (!accountId) return null;
  const rows = await sql`SELECT id, display_name, nationalities, birthdate::text AS birthdate, address, phone, description_text, description_payload FROM accounts WHERE id = ${accountId} LIMIT 1`;
  const account = rows[0] as { id: string; display_name: string; nationalities: string[]; birthdate: string | null; address: string | null; phone: string | null; description_text: string; description_payload: { fields?: AccountDescription["fields"]; themes?: AccountDescription["themes"] } | null } | undefined;
  if (!account) return null;
  const [firstName = "", ...lastParts] = account.display_name.split(/\s+/);
  const savedPayload = account.description_payload ?? {};
  const savedFields: AccountDescription["fields"] = savedPayload.fields ?? savedPayload as unknown as AccountDescription["fields"];
  const baseValues: Record<string, string> = {
    firstName,
    lastName: lastParts.join(" "),
    nationalities: (account.nationalities ?? []).join(", "),
    birthdate: account.birthdate ?? "",
    sex: "",
    relationshipStatus: "",
    languages: "",
    location: "",
    address: account.address ?? "",
    phone: account.phone ?? ""
  };
  return {
    accountId,
    text: account.description_text ?? "",
    fields: Object.fromEntries(Object.entries(baseValues).map(([key, value]) => [key, savedFields[key] ?? { value, enabled: Boolean(value) }])),
    themes: savedPayload.themes ?? {}
  };
}

export async function saveAccountDescription(description: AccountDescription) {
  const sql = await useDatabase();
  if (!sql) {
    state.accountDescription = structuredClone(description);
    return description;
  }
  const accountId = await getSessionAccountId();
  if (!accountId || accountId !== description.accountId) throw new Error("Authentication required.");
  const firstName = description.fields.firstName?.value.trim() ?? "";
  const lastName = description.fields.lastName?.value.trim() ?? "";
  const displayName = `${firstName} ${lastName}`.trim();
  const nationalities = (description.fields.nationalities?.value ?? "").split(",").map((value) => value.trim()).filter(Boolean);
  await sql`UPDATE accounts SET display_name = ${displayName}, nationalities = ${JSON.stringify(nationalities)}::jsonb,
    birthdate = NULLIF(${description.fields.birthdate?.value ?? ""}, '')::date,
    address = NULLIF(${description.fields.address?.value ?? ""}, ''),
    phone = NULLIF(${description.fields.phone?.value ?? ""}, ''),
    description_text = ${description.text}, description_payload = ${JSON.stringify({ fields: description.fields, themes: description.themes })}::jsonb, updated_at = NOW()
    WHERE id = ${accountId}`;
  return description;
}

export async function authenticateAccount(email: string, password: string) {
  const sql = await useDatabase();
  if (!sql) return null;
  const rows = await sql`SELECT id, password_hash FROM accounts WHERE lower(email) = ${email.trim().toLowerCase()} LIMIT 1`;
  const row = rows[0] as { id: string; password_hash: string | null } | undefined;
  return row?.password_hash && verifyPassword(password, row.password_hash) ? row.id : null;
}

async function deleteOwnedProfileData(accountId: string, profileIds: string[], deleteAccount = false) {
  const sql = await useDatabase();
  if (!sql || profileIds.length === 0) return false;
  const circleRows = await sql`SELECT id FROM circles WHERE owner_profile_id = ANY(${profileIds})`;
  const circleIds = circleRows.map((row) => row.id as string);
  const postRows = await sql`SELECT id FROM social_posts WHERE profile_id = ANY(${profileIds})`;
  const postIds = postRows.map((row) => row.id as string);
  const debateRows = await sql`SELECT id FROM debates WHERE author_profile_id = ANY(${profileIds}) OR source_post_id = ANY(${postIds})`;
  const debateIds = debateRows.map((row) => row.id as string);
  const statements = [];

  statements.push(sql`DELETE FROM debate_comments WHERE author_profile_id = ANY(${profileIds})`);
  statements.push(sql`DELETE FROM social_post_comments WHERE profile_id = ANY(${profileIds})`);
  statements.push(sql`DELETE FROM private_messages WHERE sender_profile_id = ANY(${profileIds})`);
  statements.push(sql`DELETE FROM private_conversation_members WHERE profile_id = ANY(${profileIds})`);
  statements.push(sql`DELETE FROM private_conversations c WHERE NOT EXISTS (SELECT 1 FROM private_conversation_members m WHERE m.conversation_id = c.id)`);
  statements.push(sql`DELETE FROM social_events WHERE created_by_profile_id = ANY(${profileIds})`);
  statements.push(sql`DELETE FROM retributions WHERE sender_profile_id = ANY(${profileIds}) OR recipient_profile_id = ANY(${profileIds})`);
  if (debateIds.length) statements.push(sql`DELETE FROM debates WHERE id = ANY(${debateIds})`);
  if (postIds.length) statements.push(sql`DELETE FROM social_post_comments WHERE post_id = ANY(${postIds})`);
  if (postIds.length) statements.push(sql`DELETE FROM social_posts WHERE id = ANY(${postIds})`);
  if (circleIds.length) {
    statements.push(sql`UPDATE social_posts SET circle_id = NULL, payload = jsonb_set(jsonb_set(payload, '{circleId}', 'null'::jsonb), '{circleName}', 'null'::jsonb) WHERE circle_id = ANY(${circleIds})`);
    statements.push(sql`UPDATE debates SET circle_id = NULL, payload = jsonb_set(payload, '{circleId}', 'null'::jsonb) WHERE circle_id = ANY(${circleIds})`);
    statements.push(sql`UPDATE social_events SET circle_id = NULL WHERE circle_id = ANY(${circleIds})`);
    statements.push(sql`DELETE FROM circles WHERE id = ANY(${circleIds})`);
  }
  if (deleteAccount) statements.push(sql`DELETE FROM accounts WHERE id = ${accountId}`);
  else statements.push(sql`DELETE FROM profiles WHERE id = ANY(${profileIds}) AND account_id = ${accountId}`);
  await sql.transaction(statements);
  return true;
}

export async function deleteOwnAccount(accountId: string) {
  const sql = await useDatabase();
  if (!sql || accountId !== await getSessionAccountId()) return false;
  const rows = await sql`SELECT id FROM profiles WHERE account_id = ${accountId}`;
  const profileIds = rows.map((row) => row.id as string);
  if (profileIds.length === 0) {
    await sql`DELETE FROM accounts WHERE id = ${accountId}`;
    return true;
  }
  return deleteOwnedProfileData(accountId, profileIds, true);
}

export async function deleteOwnProfile(profileId: string) {
  const sql = await useDatabase();
  if (!sql) {
    const profile = state.profiles.find((item) => item.id === profileId);
    if (!profile) return false;
    const circleIds = state.circles.filter((circle) => circle.ownerProfileId === profileId).map((circle) => circle.id);
    state.posts = state.posts.filter((post) => post.profileId !== profileId).map((post) => circleIds.includes(post.circleId ?? "") ? { ...post, circleId: null, circleName: null } : post);
    state.circles = state.circles.filter((circle) => circle.ownerProfileId !== profileId);
    state.descriptions = state.descriptions.filter((description) => description.profileId !== profileId);
    state.profiles = state.profiles.filter((item) => item.id !== profileId).map((item) => ({
      ...item,
      members: item.members?.filter((memberId) => memberId !== profileId)
    }));
    state.reactions = state.reactions.filter((reaction) => reaction.profileId !== profileId);
    const debates = await import("@/lib/debates");
    debates.deleteDemoDebatesByProfile(profileId);
    circleIds.forEach((circleId) => debates.unlinkDemoDebatesFromCircle(circleId));
    return true;
  }
  const accountId = await getSessionAccountId();
  if (!accountId) return false;
  return deleteOwnedProfileData(accountId, [profileId]);
}

export async function deleteOwnCircle(circleId: string) {
  const sql = await useDatabase();
  if (!sql) {
    const circle = state.circles.find((item) => item.id === circleId && item.ownerProfileId === demoProfileId);
    if (!circle) return false;
    const debates = await import("@/lib/debates");
    debates.unlinkDemoDebatesFromCircle(circleId);
    state.posts = state.posts.map((post) => post.circleId === circleId ? { ...post, circleId: null, circleName: null } : post);
    state.circles = state.circles.filter((item) => item.id !== circleId);
    return true;
  }
  const accountId = await getSessionAccountId();
  if (!accountId) return false;
  const circles = await sql`SELECT c.id FROM circles c JOIN profiles p ON p.id = c.owner_profile_id WHERE c.id = ${circleId} AND p.account_id = ${accountId}`;
  if (!circles.length) return false;
  const statements = [
    sql`UPDATE social_posts SET circle_id = NULL, payload = jsonb_set(jsonb_set(payload, '{circleId}', 'null'::jsonb), '{circleName}', 'null'::jsonb) WHERE circle_id = ${circleId}`,
    sql`UPDATE debates SET circle_id = NULL, payload = jsonb_set(payload, '{circleId}', 'null'::jsonb) WHERE circle_id = ${circleId}`,
    sql`UPDATE social_events SET circle_id = NULL WHERE circle_id = ${circleId}`
  ];
  statements.push(sql`DELETE FROM circles WHERE id = ${circleId}`);
  await sql.transaction(statements);
  return true;
}

export async function deleteOwnSocialPost(postId: string) {
  const sql = await useDatabase();
  if (!sql) {
    const post = state.posts.find((item) => item.id === postId && state.profiles.some((profile) => profile.id === item.profileId && profile.accountId === "account-demo"));
    if (!post) return false;
    state.posts = state.posts.filter((item) => item.id !== postId);
    const debates = await import("@/lib/debates");
    debates.deleteDemoDebateBySourcePost(postId);
    return true;
  }
  const accountId = await getSessionAccountId();
  if (!accountId) return false;
  const posts = await sql`SELECT p.id, p.debate_id FROM social_posts p JOIN profiles pr ON pr.id = p.profile_id WHERE p.id = ${postId} AND pr.account_id = ${accountId}`;
  if (!posts.length) return false;
  const debateId = posts[0].debate_id as string | null;
  const statements = [];
  if (debateId) statements.push(sql`DELETE FROM debates WHERE id = ${debateId} AND author_profile_id IN (SELECT id FROM profiles WHERE account_id = ${accountId})`);
  statements.push(sql`DELETE FROM social_post_comments WHERE post_id = ${postId}`);
  statements.push(sql`DELETE FROM social_posts WHERE id = ${postId} AND profile_id IN (SELECT id FROM profiles WHERE account_id = ${accountId})`);
  await sql.transaction(statements);
  return true;
}

export async function getProfileDescription(profileId: string) {
  const sql = await useDatabase();
  if (!sql) return structuredClone(state.descriptions.find((item) => item.profileId === profileId) ?? null);
  const accountId = await getSessionAccountId();
  if (!accountId) return null;
  const rows = await sql`SELECT d.payload FROM profile_descriptions d JOIN profiles p ON p.id = d.profile_id WHERE d.profile_id = ${profileId} AND p.account_id = ${accountId} AND d.theme = '__profile__' LIMIT 1`;
  return (rows[0]?.payload as ProfileDescription | undefined) ?? null;
}

export async function saveProfileDescription(description: ProfileDescription) {
  const sql = await useDatabase();
  if (!sql) {
    const index = state.descriptions.findIndex((item) => item.profileId === description.profileId);
    if (index >= 0) state.descriptions[index] = structuredClone(description);
    else state.descriptions.push(structuredClone(description));
    return description;
  }
  const accountId = await getSessionAccountId();
  if (!accountId) throw new Error("Authentication required.");
  await sql`INSERT INTO profile_descriptions (id, profile_id, theme, content, audience, visibility, enabled, tags, payload, updated_at)
    SELECT ${`description-${description.profileId}`}, p.id, '__profile__', ${description.text}, ${description.relationship}, ${description.visibility}, ${description.textEnabled}, ${JSON.stringify([])}::jsonb, ${JSON.stringify(description)}::jsonb, NOW() FROM profiles p WHERE p.id = ${description.profileId} AND p.account_id = ${accountId}
    ON CONFLICT (profile_id, theme, audience) DO UPDATE SET content = EXCLUDED.content, visibility = EXCLUDED.visibility, enabled = EXCLUDED.enabled, payload = EXCLUDED.payload, updated_at = NOW()`;
  return description;
}

export async function listCircles() {
  const sql = await useDatabase();
  if (!sql) return structuredClone(state.circles);
  const accountId = await getSessionAccountId();
  if (!accountId) return [];
  const rows = await sql`SELECT c.id, c.owner_profile_id AS "ownerProfileId", c.name, c.kind, c.location_mode AS "locationMode", c.description, c.visibility, COUNT(m.profile_id)::int AS "memberCount"
    FROM circles c LEFT JOIN circle_members m ON m.circle_id = c.id
    WHERE c.owner_profile_id IN (SELECT id FROM profiles WHERE account_id = ${accountId})
      OR EXISTS (SELECT 1 FROM circle_members own_m JOIN profiles own_p ON own_p.id = own_m.profile_id WHERE own_m.circle_id = c.id AND own_p.account_id = ${accountId})
    GROUP BY c.id ORDER BY c.name`;
  return rows as SocialCircle[];
}

export async function listSocialPosts(circleId?: string | null) {
  const sql = await useDatabase();
  if (!sql) {
    return structuredClone(state.posts).filter((post) => !circleId || post.circleId === circleId).map((post) => {
      const totals = { ...post.reactions };
      for (const reaction of state.reactions.filter((entry) => entry.postId === post.id)) totals[reaction.reaction] = (totals[reaction.reaction] ?? 0) + 1;
      return { ...post, reactions: totals };
    }).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
  const accountId = await getSessionAccountId();
  if (!accountId) return [];
  const rows = circleId
    ? await sql`SELECT p.payload, COALESCE(r.counts, '{}'::jsonb) AS reaction_counts FROM social_posts p LEFT JOIN (SELECT post_id, jsonb_object_agg(reaction, count) AS counts FROM (SELECT post_id, reaction, COUNT(*)::int AS count FROM social_post_reactions GROUP BY post_id, reaction) totals GROUP BY post_id) r ON r.post_id = p.id WHERE p.circle_id = ${circleId} AND (p.profile_id IN (SELECT id FROM profiles WHERE account_id = ${accountId}) OR EXISTS (SELECT 1 FROM circle_members cm JOIN profiles cp ON cp.id = cm.profile_id WHERE cm.circle_id = p.circle_id AND cp.account_id = ${accountId})) ORDER BY p.created_at DESC`
    : await sql`SELECT p.payload, COALESCE(r.counts, '{}'::jsonb) AS reaction_counts FROM social_posts p LEFT JOIN (SELECT post_id, jsonb_object_agg(reaction, count) AS counts FROM (SELECT post_id, reaction, COUNT(*)::int AS count FROM social_post_reactions GROUP BY post_id, reaction) totals GROUP BY post_id) r ON r.post_id = p.id WHERE p.profile_id IN (SELECT id FROM profiles WHERE account_id = ${accountId}) OR EXISTS (SELECT 1 FROM circle_members cm JOIN profiles cp ON cp.id = cm.profile_id WHERE cm.circle_id = p.circle_id AND cp.account_id = ${accountId}) ORDER BY p.created_at DESC`;
  return rows.map((row) => {
    const post = row.payload as SocialPost;
    const storedReactions = row.reaction_counts as Record<string, number>;
    const reactions = { ...post.reactions };
    for (const [reaction, count] of Object.entries(storedReactions)) reactions[reaction] = (reactions[reaction] ?? 0) + count;
    return { ...post, reactions };
  });
}

export async function getSocialPost(id: string) {
  const sql = await useDatabase();
  if (!sql) return structuredClone(state.posts.find((post) => post.id === id) ?? null);
  const accountId = await getSessionAccountId();
  if (!accountId) return null;
  const rows = await sql`SELECT p.payload FROM social_posts p WHERE p.id = ${id} AND (p.profile_id IN (SELECT id FROM profiles WHERE account_id = ${accountId}) OR EXISTS (SELECT 1 FROM circle_members cm JOIN profiles cp ON cp.id = cm.profile_id WHERE cm.circle_id = p.circle_id AND cp.account_id = ${accountId})) LIMIT 1`;
  return (rows[0]?.payload as SocialPost | undefined) ?? null;
}

export async function createSocialPost(input: { title: string; body: string; circleId?: string | null; profileId?: string; kind?: SocialPost["kind"]; visibility?: string; media?: MediaAttachment[]; formats?: string[]; metadata?: SocialPost["metadata"] }) {
  const circles = await listCircles();
  const circle = circles.find((item) => item.id === input.circleId) ?? null;
  if (input.circleId && !circle) throw new Error("Circle not found.");
  const profiles = await listProfiles();
  const profile = profiles.find((item) => item.id === input.profileId) ?? (input.profileId ? undefined : profiles.find((item) => item.id === demoProfileId) ?? profiles[0]);
  if (!profile) throw new Error("Choose a profile before posting.");
  const post: SocialPost = {
    id: `post_${crypto.randomUUID()}`,
    profileId: profile.id,
    author: profile.name,
    avatar: profile.avatar,
    circleId: circle?.id ?? null,
    circleName: circle?.name ?? null,
    title: input.title.trim() || "Post",
    body: input.body.trim(),
    subtext: input.kind === "debate" ? "Open discussion" : "New post",
    kind: input.kind ?? "publication",
    visibility: input.visibility ?? (circle ? "circle" : "public"),
    createdAt: new Date().toISOString(),
    debateId: null,
    reactions: {},
    commentsCount: 0,
    media: input.media ?? [],
    formats: input.formats ?? ["text"],
    metadata: input.metadata ?? {}
  };
  const sql = await useDatabase();
  if (sql) {
    await sql`INSERT INTO social_posts (id, profile_id, circle_id, debate_id, title, body, subtext, kind, visibility, payload, created_at)
      VALUES (${post.id}, ${post.profileId}, ${post.circleId}, NULL, ${post.title}, ${post.body}, ${post.subtext}, ${post.kind}, ${post.visibility}, ${JSON.stringify(post)}::jsonb, ${post.createdAt})`;
  } else {
    state.posts.unshift(post);
  }
  return post;
}

export async function createSocialProfile(input: { accountId?: string; name: string; kind: string; category: string; relationship?: string; bio: string; visibility: string; socialDistance: number; anonymous: boolean; contentFilters?: string[]; locationLabel?: string; dynamicLocationEnabled?: boolean; dynamicLocationCircleId?: string; members?: string[] }) {
  const sql = await useDatabase();
  const accountId = sql ? input.accountId : "account-demo";
  if (!accountId) throw new Error("An authenticated account is required to create a profile.");
  const normalizedPseudo = input.name.trim().toLocaleLowerCase();
  const duplicate = sql
    ? await sql`SELECT id FROM profiles WHERE LOWER(BTRIM(name)) = ${normalizedPseudo} LIMIT 1`
    : state.profiles.filter((item) => item.name.trim().toLocaleLowerCase() === normalizedPseudo);
  if (duplicate.length) throw new Error("This pseudonym is already in use. Choose another one.");
  if (input.dynamicLocationEnabled && !input.dynamicLocationCircleId) throw new Error("Choose a Circle for dynamic location.");
  const profile: SocialProfile = {
    id: `profile_${crypto.randomUUID()}`,
    accountId,
    name: input.name.trim(),
    kind: input.kind === "meta" ? "meta" : "individual",
    category: input.category.trim() || (input.kind === "meta" ? "Meta-profile" : "Personal"),
    relationship: input.relationship,
    avatar: input.name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase() ?? "").join(""),
    bio: input.bio.trim(),
    visibility: input.visibility || "all",
    socialDistance: Math.max(0, Math.min(10, Math.round(input.socialDistance))),
    anonymous: input.anonymous,
    contentFilters: input.contentFilters ?? [],
    locationLabel: input.locationLabel?.trim() || "",
    dynamicLocationEnabled: Boolean(input.dynamicLocationEnabled),
    dynamicLocationCircleId: input.dynamicLocationEnabled ? input.dynamicLocationCircleId || "" : "",
    members: input.kind === "meta" ? [...new Set(input.members ?? [])] : [],
    memberRoles: {}
  };
  if (sql) {
    const memberIds = profile.members ?? [];
    if (memberIds.length) {
      const ownedMembers = await sql`SELECT id FROM profiles WHERE account_id = ${accountId} AND kind = 'individual' AND id = ANY(${memberIds})`;
      if (ownedMembers.length !== memberIds.length) throw new Error("Meta-profile members must be individual profiles belonging to this account.");
    }
    await sql.transaction([
      sql`INSERT INTO profiles (id, account_id, name, kind, category, avatar, bio, visibility, social_distance, anonymous, payload)
        VALUES (${profile.id}, ${profile.accountId}, ${profile.name}, ${profile.kind}, ${profile.category}, ${profile.avatar}, ${profile.bio}, ${profile.visibility}, ${profile.socialDistance}, ${profile.anonymous}, ${JSON.stringify(profile)}::jsonb)`,
      sql`INSERT INTO profile_preferences (profile_id, anonymous_navigation, content_filters, location_label, dynamic_location_enabled, dynamic_location_circle_id)
        VALUES (${profile.id}, ${profile.anonymous}, ${JSON.stringify(profile.contentFilters)}::jsonb, ${profile.locationLabel || null}, ${profile.dynamicLocationEnabled}, ${profile.dynamicLocationCircleId || null})`,
      ...memberIds.map((memberId) => sql`INSERT INTO meta_profile_members (meta_profile_id, member_profile_id, role) VALUES (${profile.id}, ${memberId}, 'member') ON CONFLICT DO NOTHING`)
    ]);
  } else {
    if (profile.members?.some((memberId) => !state.profiles.some((member) => member.id === memberId && member.accountId === accountId && member.kind === "individual"))) throw new Error("Meta-profile members must be individual profiles belonging to this account.");
    state.profiles.push(profile);
  }
  return profile;
}

export async function linkSocialPostToDebate(postId: string, debateId: string) {
  const sql = await useDatabase();
  if (sql) {
    const accountId = await getSessionAccountId();
    if (!accountId) throw new Error("Authentication required.");
    await sql`UPDATE social_posts SET debate_id = ${debateId}, kind = 'debate', subtext = 'Open discussion', payload = jsonb_set(jsonb_set(payload, '{debateId}', to_jsonb(${debateId}::text)), '{kind}', '"debate"'::jsonb) WHERE id = ${postId} AND profile_id IN (SELECT id FROM profiles WHERE account_id = ${accountId})`;
  } else {
    const post = state.posts.find((item) => item.id === postId);
    if (post) {
      post.debateId = debateId;
      post.kind = "debate";
      post.subtext = "Discussion ouverte";
    }
  }
}

export async function createCircle(input: { name: string; kind: string; description: string; visibility: string; ownerProfileId?: string }) {
  const profiles = await listProfiles();
  const sql = await useDatabase();
  const profile = input.ownerProfileId
    ? profiles.find((item) => item.id === input.ownerProfileId)
    : sql ? profiles[0] : profiles.find((item) => item.id === demoProfileId) ?? profiles[0];
  if (!profile) throw new Error("Create a profile before creating a Circle.");
  const circle: SocialCircle = {
    id: `circle_${crypto.randomUUID()}`,
    ownerProfileId: profile.id,
    name: input.name.trim(),
    kind: input.kind || "general",
    locationMode: "Online",
    description: input.description.trim(),
    visibility: input.visibility || "private",
    memberCount: 1
  };
  if (sql) {
    await sql`INSERT INTO circles (id, owner_profile_id, name, kind, location_mode, description, visibility) VALUES (${circle.id}, ${circle.ownerProfileId}, ${circle.name}, ${circle.kind}, ${circle.locationMode}, ${circle.description}, ${circle.visibility})`;
    await sql`INSERT INTO circle_members (circle_id, profile_id, role) VALUES (${circle.id}, ${circle.ownerProfileId}, 'owner')`;
  } else {
    state.circles.push(circle);
  }
  return circle;
}

export async function toggleSocialReaction(postId: string, reaction: string, profileId = demoProfileId) {
  const allowed = new Set(["👍", "👎", "⚠️", "🔑", "💡", "🎓", "❌", "❓", "☀️"]);
  if (!allowed.has(reaction)) throw new Error("Unknown reaction");
  const sql = await useDatabase();
  if (sql) {
    const existing = await sql`SELECT reaction FROM social_post_reactions WHERE post_id = ${postId} AND profile_id = ${profileId}`;
    if (existing[0]?.reaction === reaction) {
      await sql`DELETE FROM social_post_reactions WHERE post_id = ${postId} AND profile_id = ${profileId}`;
    } else {
      await sql`INSERT INTO social_post_reactions (post_id, profile_id, reaction) VALUES (${postId}, ${profileId}, ${reaction}) ON CONFLICT (post_id, profile_id) DO UPDATE SET reaction = EXCLUDED.reaction, created_at = NOW()`;
    }
    const [postRows, rows] = await Promise.all([
      sql`SELECT payload FROM social_posts WHERE id = ${postId}`,
      sql`SELECT reaction, COUNT(*)::int AS count FROM social_post_reactions WHERE post_id = ${postId} GROUP BY reaction`
    ]);
    const totals = { ...((postRows[0]?.payload as SocialPost | undefined)?.reactions ?? {}) };
    for (const row of rows) totals[row.reaction] = (totals[row.reaction] ?? 0) + row.count;
    return totals;
  }
  const existing = state.reactions.findIndex((item) => item.postId === postId && item.profileId === profileId);
  if (existing >= 0 && state.reactions[existing].reaction === reaction) state.reactions.splice(existing, 1);
  else if (existing >= 0) state.reactions[existing].reaction = reaction;
  else state.reactions.push({ postId, profileId, reaction });
  const post = state.posts.find((item) => item.id === postId);
  const totals: Record<string, number> = { ...(post?.reactions ?? {}) };
  for (const item of state.reactions.filter((entry) => entry.postId === postId)) totals[item.reaction] = (totals[item.reaction] ?? 0) + 1;
  return totals;
}
