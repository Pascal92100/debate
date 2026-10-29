import "server-only";
import { database, isPersistentStore } from "@/lib/debates";
import fixture from "../social.json";

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
  birthdate: string;
  address: string;
  phone: string;
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
  const demoAccount = fixture.account as SocialAccount;
  await sql`INSERT INTO accounts (id, display_name, nationalities, birthdate, address, phone)
    VALUES (${demoAccount.id}, ${demoAccount.displayName}, ${JSON.stringify(demoAccount.nationalities)}::jsonb, ${demoAccount.birthdate}, ${demoAccount.address}, ${demoAccount.phone}) ON CONFLICT (id) DO NOTHING`;
  for (const profile of fixture.profiles as SocialProfile[]) {
    await sql`INSERT INTO profiles (id, account_id, name, kind, category, avatar, bio, visibility, social_distance, anonymous, payload)
      VALUES (${profile.id}, ${profile.accountId}, ${profile.name}, ${profile.kind}, ${profile.category}, ${profile.avatar}, ${profile.bio}, ${profile.visibility}, ${profile.socialDistance}, ${profile.anonymous}, ${JSON.stringify(profile)}::jsonb)
      ON CONFLICT (id) DO NOTHING`;
  }
  for (const profile of fixture.profiles as SocialProfile[]) {
    for (const memberProfileId of profile.members ?? []) {
      await sql`INSERT INTO meta_profile_members (meta_profile_id, member_profile_id, role)
        VALUES (${profile.id}, ${memberProfileId}, ${profile.memberRoles?.[memberProfileId] ?? 'member'}) ON CONFLICT DO NOTHING`;
    }
  }
  for (const description of fixture.descriptions as ProfileDescription[]) {
    await sql`INSERT INTO profile_descriptions (id, profile_id, theme, content, audience, visibility, enabled, tags, payload)
      VALUES (${`description-${description.profileId}`}, ${description.profileId}, '__profile__', ${description.text}, ${description.relationship}, ${description.visibility}, ${description.textEnabled}, ${JSON.stringify([])}::jsonb, ${JSON.stringify(description)}::jsonb)
      ON CONFLICT (profile_id, theme, audience) DO NOTHING`;
  }
  for (const circle of fixture.circles as SocialCircle[]) {
    await sql`INSERT INTO circles (id, owner_profile_id, name, kind, location_mode, description, visibility)
      VALUES (${circle.id}, ${circle.ownerProfileId}, ${circle.name}, ${circle.kind}, ${circle.locationMode}, ${circle.description}, ${circle.visibility})
      ON CONFLICT (id) DO NOTHING`;
    await sql`INSERT INTO circle_members (circle_id, profile_id, role) VALUES (${circle.id}, ${circle.ownerProfileId}, 'owner') ON CONFLICT DO NOTHING`;
  }
  for (const post of fixture.posts as SocialPost[]) {
    await sql`INSERT INTO social_posts (id, profile_id, circle_id, debate_id, title, body, subtext, kind, visibility, payload, created_at)
      VALUES (${post.id}, ${post.profileId}, ${post.circleId}, ${post.debateId}, ${post.title}, ${post.body}, ${post.subtext}, ${post.kind}, ${post.visibility}, ${JSON.stringify(post)}::jsonb, ${post.createdAt})
      ON CONFLICT (id) DO NOTHING`;
  }
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
  const rows = await sql`SELECT payload FROM profiles ORDER BY created_at`;
  return rows.map((row) => row.payload as SocialProfile);
}

export async function getDemoAccount(): Promise<SocialAccount> {
  const sql = await useDatabase();
  if (!sql) return structuredClone(fixture.account as SocialAccount);
  const rows = await sql`SELECT id, display_name AS "displayName", nationalities, birthdate::text AS birthdate, address, phone FROM accounts WHERE id = 'account-demo' LIMIT 1`;
  return (rows[0] as SocialAccount | undefined) ?? structuredClone(fixture.account as SocialAccount);
}

export async function getProfileDescription(profileId: string) {
  const sql = await useDatabase();
  if (!sql) return structuredClone(state.descriptions.find((item) => item.profileId === profileId) ?? null);
  const rows = await sql`SELECT payload FROM profile_descriptions WHERE profile_id = ${profileId} AND theme = '__profile__' LIMIT 1`;
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
  await sql`INSERT INTO profile_descriptions (id, profile_id, theme, content, audience, visibility, enabled, tags, payload, updated_at)
    VALUES (${`description-${description.profileId}`}, ${description.profileId}, '__profile__', ${description.text}, ${description.relationship}, ${description.visibility}, ${description.textEnabled}, ${JSON.stringify([])}::jsonb, ${JSON.stringify(description)}::jsonb, NOW())
    ON CONFLICT (profile_id, theme, audience) DO UPDATE SET content = EXCLUDED.content, visibility = EXCLUDED.visibility, enabled = EXCLUDED.enabled, payload = EXCLUDED.payload, updated_at = NOW()`;
  return description;
}

export async function listCircles() {
  const sql = await useDatabase();
  if (!sql) return structuredClone(state.circles);
  const rows = await sql`SELECT c.id, c.owner_profile_id AS "ownerProfileId", c.name, c.kind, c.location_mode AS "locationMode", c.description, c.visibility, COUNT(m.profile_id)::int AS "memberCount"
    FROM circles c LEFT JOIN circle_members m ON m.circle_id = c.id GROUP BY c.id ORDER BY c.name`;
  return rows as SocialCircle[];
}

export async function listSocialPosts(circleId?: string | null) {
  const sql = await useDatabase();
  if (!sql) {
    return structuredClone(state.posts)
      .filter((post) => !circleId || post.circleId === circleId)
      .map((post) => {
        const totals = { ...post.reactions };
        for (const reaction of state.reactions.filter((entry) => entry.postId === post.id)) totals[reaction.reaction] = (totals[reaction.reaction] ?? 0) + 1;
        return { ...post, reactions: totals };
      })
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
  const rows = circleId
    ? await sql`SELECT p.payload, COALESCE(r.counts, '{}'::jsonb) AS reaction_counts FROM social_posts p LEFT JOIN (SELECT post_id, jsonb_object_agg(reaction, count) AS counts FROM (SELECT post_id, reaction, COUNT(*)::int AS count FROM social_post_reactions GROUP BY post_id, reaction) totals GROUP BY post_id) r ON r.post_id = p.id WHERE p.circle_id = ${circleId} ORDER BY p.created_at DESC`
    : await sql`SELECT p.payload, COALESCE(r.counts, '{}'::jsonb) AS reaction_counts FROM social_posts p LEFT JOIN (SELECT post_id, jsonb_object_agg(reaction, count) AS counts FROM (SELECT post_id, reaction, COUNT(*)::int AS count FROM social_post_reactions GROUP BY post_id, reaction) totals GROUP BY post_id) r ON r.post_id = p.id ORDER BY p.created_at DESC`;
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
  const rows = await sql`SELECT payload FROM social_posts WHERE id = ${id} LIMIT 1`;
  return (rows[0]?.payload as SocialPost | undefined) ?? null;
}

export async function createSocialPost(input: { title: string; body: string; circleId?: string | null; profileId?: string; kind?: SocialPost["kind"]; visibility?: string }) {
  const circles = await listCircles();
  const circle = circles.find((item) => item.id === input.circleId) ?? null;
  const profiles = await listProfiles();
  const profile = profiles.find((item) => item.id === input.profileId) ?? profiles.find((item) => item.id === demoProfileId) ?? profiles[0];
  const post: SocialPost = {
    id: `post_${crypto.randomUUID()}`,
    profileId: profile.id,
    author: profile.name,
    avatar: profile.avatar,
    circleId: circle?.id ?? null,
    circleName: circle?.name ?? null,
    title: input.title.trim() || "Publication",
    body: input.body.trim(),
    subtext: input.kind === "debate" ? "Discussion ouverte" : "Nouvelle publication",
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

export async function createSocialProfile(input: { name: string; kind: string; category: string; bio: string; visibility: string; socialDistance: number; anonymous: boolean; members?: string[] }) {
  const profile: SocialProfile = {
    id: `profile_${crypto.randomUUID()}`,
    accountId: "account-demo",
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
  const sql = await useDatabase();
  if (sql) {
    await sql`INSERT INTO profiles (id, account_id, name, kind, category, avatar, bio, visibility, social_distance, anonymous, payload)
      VALUES (${profile.id}, ${profile.accountId}, ${profile.name}, ${profile.kind}, ${profile.category}, ${profile.avatar}, ${profile.bio}, ${profile.visibility}, ${profile.socialDistance}, ${profile.anonymous}, ${JSON.stringify(profile)}::jsonb)`;
    for (const memberId of profile.members ?? []) {
      await sql`INSERT INTO meta_profile_members (meta_profile_id, member_profile_id, role) VALUES (${profile.id}, ${memberId}, 'member') ON CONFLICT DO NOTHING`;
    }
  } else {
    state.profiles.push(profile);
  }
  return profile;
}

export async function linkSocialPostToDebate(postId: string, debateId: string) {
  const sql = await useDatabase();
  if (sql) {
    await sql`UPDATE social_posts SET debate_id = ${debateId}, kind = 'debate', subtext = 'Discussion ouverte', payload = jsonb_set(jsonb_set(payload, '{debateId}', to_jsonb(${debateId}::text)), '{kind}', '"debate"'::jsonb) WHERE id = ${postId}`;
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
  const profile = state.profiles.find((item) => item.id === demoProfileId) ?? (await listProfiles())[0];
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
  const sql = await useDatabase();
  if (sql) {
    await sql`INSERT INTO circles (id, owner_profile_id, name, kind, location_mode, description, visibility) VALUES (${circle.id}, ${circle.ownerProfileId}, ${circle.name}, ${circle.kind}, ${circle.locationMode}, ${circle.description}, ${circle.visibility})`;
    await sql`INSERT INTO circle_members (circle_id, profile_id, role) VALUES (${circle.id}, ${circle.ownerProfileId}, 'owner')`;
  } else {
    state.circles.push(circle);
  }
  return circle;
}

export async function toggleSocialReaction(postId: string, reaction: string) {
  const allowed = new Set(["👍", "👎", "⚠️", "🔑", "💡", "🎓", "❌", "❓", "☀️"]);
  if (!allowed.has(reaction)) throw new Error("Unknown reaction");
  const sql = await useDatabase();
  if (sql) {
    const existing = await sql`SELECT reaction FROM social_post_reactions WHERE post_id = ${postId} AND profile_id = ${demoProfileId}`;
    if (existing[0]?.reaction === reaction) {
      await sql`DELETE FROM social_post_reactions WHERE post_id = ${postId} AND profile_id = ${demoProfileId}`;
    } else {
      await sql`INSERT INTO social_post_reactions (post_id, profile_id, reaction) VALUES (${postId}, ${demoProfileId}, ${reaction}) ON CONFLICT (post_id, profile_id) DO UPDATE SET reaction = EXCLUDED.reaction, created_at = NOW()`;
    }
    const [postRows, rows] = await Promise.all([
      sql`SELECT payload FROM social_posts WHERE id = ${postId}`,
      sql`SELECT reaction, COUNT(*)::int AS count FROM social_post_reactions WHERE post_id = ${postId} GROUP BY reaction`
    ]);
    const totals = { ...((postRows[0]?.payload as SocialPost | undefined)?.reactions ?? {}) };
    for (const row of rows) totals[row.reaction] = (totals[row.reaction] ?? 0) + row.count;
    return totals;
  }
  const existing = state.reactions.findIndex((item) => item.postId === postId && item.profileId === demoProfileId);
  if (existing >= 0 && state.reactions[existing].reaction === reaction) state.reactions.splice(existing, 1);
  else if (existing >= 0) state.reactions[existing].reaction = reaction;
  else state.reactions.push({ postId, profileId: demoProfileId, reaction });
  const post = state.posts.find((item) => item.id === postId);
  const totals: Record<string, number> = { ...(post?.reactions ?? {}) };
  for (const item of state.reactions.filter((entry) => entry.postId === postId)) totals[item.reaction] = (totals[item.reaction] ?? 0) + 1;
  return totals;
}
