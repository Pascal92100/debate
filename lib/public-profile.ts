import "server-only";
import { getSessionAccountId } from "@/lib/auth";
import { database, isPersistentStore, type Debate } from "@/lib/debates";
import { listDiscussions, type SimpleDiscussion } from "@/lib/discussions";
import { listProfileSpaces, type ProfileSpace } from "@/lib/profile-spaces";
import { listProfileEvents, type ProfileEvent } from "@/lib/profile-modules";
import { listProfiles, type ProfileDescription, type SocialCircle, type SocialPost, type SocialProfile } from "@/lib/social";
import type { MediaAttachment } from "@/lib/media";

export type VisibleDescription = {
  text: string;
  identity: Array<{ label: string; value: string }>;
  themes: Array<{ label: string; description: string; fields: string[]; tags: string[] }>;
};

export type VisibleMember = {
  profile: Pick<SocialProfile, "id" | "name" | "avatar" | "category" | "kind" | "bio">;
  description: VisibleDescription | null;
};

export type PublicProfileView = {
  profile: Pick<SocialProfile, "id" | "name" | "avatar" | "category" | "kind" | "bio" | "visibility" | "relationship"> & { members: string[] };
  description: VisibleDescription | null;
  members: VisibleMember[];
  relatedMetaProfiles: Array<Pick<SocialProfile, "id" | "name" | "avatar" | "category" | "kind" | "bio">>;
  posts: Array<Pick<SocialPost, "id" | "title" | "body" | "author" | "createdAt" | "media" | "circleName">>;
  debates: Array<Pick<Debate, "id" | "title" | "content" | "from" | "timestamp" | "media">>;
  discussions: SimpleDiscussion[];
  circles: SocialCircle[];
  forums: ProfileSpace[];
  events: ProfileEvent[];
};

const identityLabels: Record<string, string> = {
  firstName: "Name",
  lastName: "Last name",
  nationalities: "Nationalities",
  birthdate: "Birth date",
  sex: "Sex",
  relationshipStatus: "Relationship status",
  languages: "Languages",
  location: "Location"
};

const themeLabels: Record<string, string> = {
  physical: "Physical",
  culture: "Culture",
  professional: "Professional",
  political: "Politics / economy",
  sport: "Sports",
  spirituality: "Spirituality",
  psycho: "Personality",
  sexo: "Sexuality",
  kinky: "Preferences and limits"
};

function visibleDescription(description: ProfileDescription | null | undefined): VisibleDescription | null {
  if (!description || description.visibility !== "other") return null;
  const identity = Object.entries(description.identity ?? {})
    .filter(([key, field]) => field.enabled && String(field.value).trim() && identityLabels[key])
    .map(([key, field]) => ({ label: identityLabels[key], value: String(field.value) }));
  const themes = Object.entries(description.themes ?? {}).filter(([, theme]) => theme.enabled).map(([id, theme]) => ({
    label: themeLabels[id] ?? id,
    description: theme.description?.trim() ?? "",
    fields: Object.entries(theme.fields ?? {}).filter(([key, value]) => theme.fieldStates?.[key] !== false && String(value).trim()).map(([key, value]) => `${key}: ${String(value)}`),
    tags: theme.tags ?? []
  })).filter((theme) => theme.description || theme.fields.length || theme.tags.length);
  const text = description.textEnabled ? description.text.trim() : "";
  if (!text && identity.length === 0 && themes.length === 0) return null;
  return { text, identity, themes };
}

function publicProfile(profile: SocialProfile) {
  return {
    id: profile.id,
    name: profile.name,
    avatar: profile.avatar,
    category: profile.category,
    kind: profile.kind,
    bio: profile.bio,
    visibility: profile.visibility,
    relationship: profile.relationship,
    members: profile.members ?? []
  };
}

async function loadStoredDescription(profileId: string): Promise<ProfileDescription | null> {
  const sql = database();
  if (!sql) {
    const globalSocial = globalThis as typeof globalThis & { __socialState?: { descriptions: ProfileDescription[] } };
    return structuredClone(globalSocial.__socialState?.descriptions.find((item) => item.profileId === profileId) ?? null);
  }
  const rows = await sql`SELECT payload FROM profile_descriptions WHERE profile_id = ${profileId} AND theme = '__profile__' LIMIT 1`;
  return (rows[0]?.payload as ProfileDescription | undefined) ?? null;
}

export async function getPublicProfileView(profileId: string, allowJoinedMetaProfile = false, forcePublicPreview = false, viewerProfileId?: string): Promise<PublicProfileView | null> {
  const persistent = await isPersistentStore();
  const accountId = persistent ? await getSessionAccountId() : "account-demo";
  const profiles = await listProfiles();
  const locallyAvailable = profiles.find((profile) => profile.id === profileId);
  const isOwner = Boolean(locallyAvailable && accountId && locallyAvailable.accountId === accountId);
  if (isOwner && !forcePublicPreview) return null;
  if (allowJoinedMetaProfile && locallyAvailable?.kind === "meta") {
    const ownIds = new Set(profiles.filter((profile) => profile.kind === "individual").map((profile) => profile.id));
    if (!locallyAvailable.members?.some((memberId) => ownIds.has(memberId))) allowJoinedMetaProfile = false;
  }

  let baseProfile: SocialProfile | undefined;
  if (forcePublicPreview && locallyAvailable?.visibility === "all") baseProfile = locallyAvailable;
  else if (allowJoinedMetaProfile && locallyAvailable) baseProfile = locallyAvailable;
  else if (!persistent) baseProfile = profiles.find((profile) => profile.id === profileId && profile.visibility === "all");
  else {
    const sql = database();
    if (!sql) return null;
    const rows = await sql`SELECT payload FROM profiles WHERE id = ${profileId} AND visibility = 'all' LIMIT 1`;
    baseProfile = rows[0]?.payload as SocialProfile | undefined;
  }
  if (!baseProfile || (baseProfile.visibility !== "all" && !allowJoinedMetaProfile)) return null;

  const [storedDescription, forums, existingEvents] = await Promise.all([
    loadStoredDescription(profileId),
    listProfileSpaces(profileId, "forums"),
    listProfileEvents(profileId),
    listDiscussions(profileId)
  ]);
  const description = visibleDescription(storedDescription);
  let visibleForums = forums;
  const sql = persistent ? database() : null;
  let memberProfiles: SocialProfile[] = [];
  let relatedMetaProfiles: SocialProfile[] = [];
  let posts: PublicProfileView["posts"] = [];
  let debates: PublicProfileView["debates"] = [];
  let discussions: SimpleDiscussion[] = [];
  let circles: SocialCircle[] = [];
  let events: ProfileEvent[] = existingEvents;

  if (!sql) {
    const globalSocial = globalThis as typeof globalThis & { __socialState?: { profiles: SocialProfile[]; posts: SocialPost[]; circles: SocialCircle[]; descriptions: ProfileDescription[] } };
    const state = globalSocial.__socialState;
    if (state) {
      if (baseProfile.kind === "meta") {
        memberProfiles = (baseProfile.members ?? []).map((id) => state.profiles.find((item) => item.id === id)).filter((item): item is SocialProfile => Boolean(item && (item.visibility === "all" || (allowJoinedMetaProfile && item.id === viewerProfileId))));
      } else {
        relatedMetaProfiles = state.profiles.filter((item) => item.kind === "meta" && item.visibility === "all" && item.members?.includes(profileId));
      }
      circles = state.circles.filter((circle) => circle.visibility === "public" && circle.ownerProfileId === profileId);
      const publicCircleIds = new Set(circles.map((circle) => circle.id));
      posts = state.posts.filter((post) => post.profileId === profileId && (post.visibility === "public" || Boolean(post.circleId && publicCircleIds.has(post.circleId)))).map(({ id, title, body, author, createdAt, media, circleName }) => ({ id, title, body, author, createdAt, media, circleName }));
      const globalModules = globalThis as typeof globalThis & { __profileModules?: { events?: ProfileEvent[] } };
      events = (globalModules.__profileModules?.events ?? []).filter((event) => event.profileId === profileId);
    }
    const debateStore = globalThis as typeof globalThis & { __debateStore?: { debates: Debate[] } };
    debates = (debateStore.__debateStore?.debates ?? []).filter((debate) => debate.authorProfileId === profileId).map(({ id, title, content, from, timestamp, media }) => ({ id, title, content, from, timestamp, media }));
    const discussionStore = globalThis as typeof globalThis & { __simpleDiscussions?: { discussions: SimpleDiscussion[] } };
    const publicCircleIds = new Set(circles.map((circle) => circle.id));
    discussions = (discussionStore.__simpleDiscussions?.discussions ?? []).filter((discussion) => discussion.profileId === profileId && Boolean(discussion.circleId && publicCircleIds.has(discussion.circleId)));
  } else {
    const publicCircles = await sql`SELECT c.id, c.owner_profile_id AS "ownerProfileId", c.name, c.kind, c.location_mode AS "locationMode", c.description, c.visibility, COUNT(cm.profile_id)::int AS "memberCount"
      FROM circles c LEFT JOIN circle_members cm ON cm.circle_id = c.id
      WHERE c.visibility = 'public' AND (c.owner_profile_id = ${profileId} OR EXISTS (SELECT 1 FROM circle_members own_member WHERE own_member.circle_id = c.id AND own_member.profile_id = ${profileId}))
      GROUP BY c.id ORDER BY c.name`;
    circles = publicCircles as SocialCircle[];
    const circleIds = circles.map((circle) => circle.id);
    if (baseProfile.kind === "meta") {
      const rows = await sql`SELECT p.payload FROM profiles p JOIN meta_profile_members mm ON mm.member_profile_id = p.id WHERE mm.meta_profile_id = ${profileId} AND (p.visibility = 'all' OR (${allowJoinedMetaProfile} AND p.id = ${viewerProfileId} AND p.account_id = ${accountId})) ORDER BY p.created_at`;
      memberProfiles = rows.map((row) => row.payload as SocialProfile);
    } else {
      const rows = await sql`SELECT p.payload FROM profiles p WHERE p.kind = 'meta' AND p.visibility = 'all' AND (p.payload->'members' ? ${profileId} OR EXISTS (SELECT 1 FROM meta_profile_members mm WHERE mm.meta_profile_id = p.id AND mm.member_profile_id = ${profileId})) ORDER BY p.created_at`;
      relatedMetaProfiles = rows.map((row) => row.payload as SocialProfile);
    }
    const forumRows = await sql`SELECT id, profile_id AS "profileId", kind, name, description, created_at AS "createdAt" FROM profile_spaces WHERE profile_id = ${profileId} AND kind = 'forums' ORDER BY created_at DESC LIMIT 50`;
    visibleForums = forumRows.map((row) => ({ ...row, createdAt: new Date(row.createdAt as string).toISOString() })) as ProfileSpace[];
    const visiblePosts = await sql`SELECT payload FROM social_posts WHERE profile_id = ${profileId} AND (visibility = 'public' OR (circle_id IS NOT NULL AND circle_id = ANY(${circleIds}))) ORDER BY created_at DESC LIMIT 50`;
    posts = visiblePosts.map((row) => {
      const post = row.payload as SocialPost;
      return { id: post.id, title: post.title, body: post.body, author: post.author, createdAt: post.createdAt, media: post.media, circleName: post.circleName };
    });
    const debateRows = await sql`SELECT payload FROM debates WHERE visibility = 'public' AND (author_profile_id = ${profileId} OR (circle_id IS NOT NULL AND circle_id = ANY(${circleIds}))) ORDER BY created_at DESC LIMIT 50`;
    debates = debateRows.map((row) => {
      const debate = row.payload as Debate;
      return { id: debate.id, title: debate.title, content: debate.content, from: debate.from, timestamp: debate.timestamp, media: debate.media };
    });
    if (circleIds.length) {
      const rows = await sql`SELECT d.id, d.profile_id AS "profileId", d.circle_id AS "circleId", d.title, d.created_at AS "createdAt", d.updated_at AS "updatedAt"
        FROM simple_discussions d WHERE d.profile_id = ${profileId} AND d.circle_id = ANY(${circleIds}) ORDER BY d.updated_at DESC LIMIT 50`;
      for (const row of rows) {
        const messages = await sql`SELECT payload FROM simple_discussion_messages WHERE discussion_id = ${row.id} ORDER BY created_at, id`;
        discussions.push({ ...row, createdAt: new Date(row.createdAt as string).toISOString(), updatedAt: new Date(row.updatedAt as string).toISOString(), messages: messages.map((message) => message.payload as SimpleDiscussion["messages"][number]) } as SimpleDiscussion);
      }
    }
    const eventRows = await sql`SELECT id, created_by_profile_id AS "profileId", title, description, starts_at AS "startsAt", location, created_at AS "createdAt"
      FROM social_events WHERE created_by_profile_id = ${profileId} AND (visibility = 'public' OR circle_id IS NULL OR circle_id = ANY(${circleIds})) ORDER BY starts_at NULLS LAST, created_at DESC LIMIT 50`;
    events = eventRows.map((row) => {
      const rawLocation = row.location;
      const location = typeof rawLocation === "string" ? rawLocation : String((rawLocation as { label?: string } | null)?.label ?? "");
      return { ...row, location, startsAt: row.startsAt ? new Date(row.startsAt as string).toISOString() : null, createdAt: new Date(row.createdAt as string).toISOString() } as ProfileEvent;
    });
  }

  const memberViews = await Promise.all(memberProfiles.map(async (member) => ({
    profile: { id: member.id, name: member.name, avatar: member.avatar, category: member.category, kind: member.kind, bio: member.bio },
    description: visibleDescription(await loadStoredDescription(member.id))
  })));
  const metaProfiles = relatedMetaProfiles.map((item) => ({ id: item.id, name: item.name, avatar: item.avatar, category: item.category, kind: item.kind, bio: item.bio }));

  const safeProfile = publicProfile(baseProfile);
  safeProfile.members = memberProfiles.map((member) => member.id);
  return {
    profile: safeProfile,
    description,
    members: memberViews,
    relatedMetaProfiles: metaProfiles,
    posts,
    debates,
    discussions,
    circles,
    forums: visibleForums,
    events
  };
}

export type PublicMedia = MediaAttachment;