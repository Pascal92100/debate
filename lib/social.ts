import "server-only";
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { getSessionAccountId, createSessionToken, sessionCookieName, sessionLifetimeSeconds } from "@/lib/auth";
import { database, isPersistentStore } from "@/lib/debates";
import fixture from "../social.json";

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
};

type SocialState = {
  profiles: SocialProfile[];
  circles: SocialCircle[];
  posts: SocialPost[];
  descriptions: ProfileDescription[];
  reactions: Array<{ postId: string; profileId: string; reaction: string }>;
  persistentReady: boolean;
};

const globalSocial = globalThis as typeof globalThis & { __socialState?: SocialState };
const state = globalSocial.__socialState ??= {
  profiles: structuredClone(fixture.profiles) as SocialProfile[],
  circles: structuredClone(fixture.circles) as SocialCircle[],
  posts: structuredClone(fixture.posts) as SocialPost[],
  descriptions: structuredClone(fixture.descriptions) as ProfileDescription[],
  reactions: [],
  persistentReady: false
};
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
  const rows = await sql`SELECT payload FROM profiles WHERE account_id = ${accountId} ORDER BY created_at`;
  return rows.map((row) => row.payload as SocialProfile);
}

export async function getAccount(accountId?: string): Promise<SocialAccount | null> {
  const sql = await useDatabase();
  if (!sql) return structuredClone(fixture.account as SocialAccount);
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
  if (!sql) return 7;
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
  const profileId = `profile_${crypto.randomUUID()}`;
  const profile = {
    id: profileId,
    accountId,
    name: input.displayName.trim(),
    kind: "individual",
    category: "Personal",
    avatar: input.displayName.trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase() ?? "").join(""),
    bio: "",
    visibility: "all",
    socialDistance: 0,
    anonymous: false
  };
  const passwordHash = hashPassword(input.password);
  const rows = await sql`WITH new_account AS (
      INSERT INTO accounts (id, email, display_name, password_hash, is_primary)
      VALUES (${accountId}, ${input.email.trim().toLowerCase()}, ${input.displayName.trim()}, ${passwordHash}, TRUE)
      ON CONFLICT DO NOTHING
      RETURNING id
    ), new_profile AS (
      INSERT INTO profiles (id, account_id, name, kind, category, avatar, payload)
      SELECT ${profileId}, id, ${profile.name}, 'individual', 'Personal', ${profile.avatar}, ${JSON.stringify(profile)}::jsonb FROM new_account
      RETURNING id
    )
    SELECT (SELECT id FROM new_account) AS account_id, (SELECT id FROM new_profile) AS profile_id`;
  if (!rows[0]?.account_id) throw new Error("The primary account already exists or this email is already in use.");
  return { accountId, profile };
}

export async function authenticateAccount(email: string, password: string) {
  const sql = await useDatabase();
  if (!sql) return null;
  const rows = await sql`SELECT id, password_hash FROM accounts WHERE lower(email) = ${email.trim().toLowerCase()} LIMIT 1`;
  const row = rows[0] as { id: string; password_hash: string | null } | undefined;
  return row?.password_hash && verifyPassword(password, row.password_hash) ? row.id : null;
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

export async function createSocialPost(input: { title: string; body: string; circleId?: string | null; profileId?: string; kind?: SocialPost["kind"]; visibility?: string }) {
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
    commentsCount: 0
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

export async function createSocialProfile(input: { accountId?: string; name: string; kind: string; category: string; bio: string; visibility: string; socialDistance: number; anonymous: boolean; members?: string[] }) {
  const sql = await useDatabase();
  const accountId = sql ? input.accountId : "account-demo";
  if (!accountId) throw new Error("An authenticated account is required to create a profile.");
  const profile: SocialProfile = {
    id: `profile_${crypto.randomUUID()}`,
    accountId,
    name: input.name.trim(),
    kind: input.kind === "meta" ? "meta" : "individual",
    category: input.category.trim() || (input.kind === "meta" ? "Meta-profile" : "Personal"),
    avatar: input.name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase() ?? "").join(""),
    bio: input.bio.trim(),
    visibility: input.visibility || "all",
    socialDistance: Math.max(0, Math.min(10, Math.round(input.socialDistance))),
    anonymous: input.anonymous,
    members: input.kind === "meta" ? (input.members ?? []) : [],
    memberRoles: {}
  };
  if (sql) {
    const memberIds = profile.members ?? [];
    if (memberIds.length) {
      const ownedMembers = await sql`SELECT id FROM profiles WHERE account_id = ${accountId} AND id = ANY(${memberIds})`;
      if (ownedMembers.length !== memberIds.length) throw new Error("Meta-profile members must belong to this account.");
    }
    await sql.transaction([
      sql`INSERT INTO profiles (id, account_id, name, kind, category, avatar, bio, visibility, social_distance, anonymous, payload)
        VALUES (${profile.id}, ${profile.accountId}, ${profile.name}, ${profile.kind}, ${profile.category}, ${profile.avatar}, ${profile.bio}, ${profile.visibility}, ${profile.socialDistance}, ${profile.anonymous}, ${JSON.stringify(profile)}::jsonb)`,
      ...memberIds.map((memberId) => sql`INSERT INTO meta_profile_members (meta_profile_id, member_profile_id, role) VALUES (${profile.id}, ${memberId}, 'member') ON CONFLICT DO NOTHING`)
    ]);
  } else {
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

export async function createCircle(input: { name: string; kind: string; description: string; visibility: string }) {
  const profiles = await listProfiles();
  const sql = await useDatabase();
  const profile = sql ? profiles[0] : profiles.find((item) => item.id === demoProfileId) ?? profiles[0];
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
