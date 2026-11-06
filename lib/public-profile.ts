import "server-only";
import { getSessionAccountId } from "@/lib/auth";
import { database, isPersistentStore, type Debate } from "@/lib/debates";
import type { SimpleDiscussion } from "@/lib/discussions";
import { listProfileSpaces, type ProfileSpace } from "@/lib/profile-spaces";
import { listProfileEvents, listPublicProfileSearches, type ProfileEvent, type SavedProfileSearch } from "@/lib/profile-modules";
import { listProfilesCached, type ProfileDescription, type SocialCircle, type SocialPost, type SocialProfile } from "@/lib/social";
import type { MediaAttachment } from "@/lib/media";
import { contactDistances } from "@/lib/meta-profile-invitations";

export type VisibleDescription = {
  text: string;
  audience: string[];
  identity: Array<{ label: string; value: string }>;
  themes: Array<{ id: string; label: string; description: string; fields: string[]; tags: string[] }>;
};

export type VisibleMember = {
  profile: Pick<SocialProfile, "id" | "name" | "avatar" | "category" | "kind" | "bio">;
  description: VisibleDescription | null;
};

export type PublicProfileView = {
  profile: Pick<SocialProfile, "id" | "name" | "avatar" | "avatarUrl" | "category" | "kind" | "bio" | "visibility" | "relationship" | "createdAt" | "lastSeenAt"> & { members: string[] };
  description: VisibleDescription | null;
  members: VisibleMember[];
  relatedMetaProfiles: Array<Pick<SocialProfile, "id" | "name" | "avatar" | "category" | "kind" | "bio">>;
  posts: Array<Pick<SocialPost, "id" | "title" | "body" | "author" | "createdAt" | "media" | "circleName">>;
  debates: Array<Pick<Debate, "id" | "title" | "content" | "from" | "timestamp" | "media">>;
  discussions: SimpleDiscussion[];
  circles: SocialCircle[];
  forums: ProfileSpace[];
  events: ProfileEvent[];
  searches: Array<Pick<SavedProfileSearch, "id" | "name" | "criteria" | "updatedAt">>;
  contacts: Array<Pick<SocialProfile, "id" | "name" | "avatar" | "category" | "kind">>;
  signals: { toxic: number; shocking: number; feelGood: number; inspiring: number; useful: number; interesting: number };
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

function isDescriptionItemActive(expiresAt?: string) {
  return !expiresAt || Date.parse(expiresAt) > Date.now();
}

function visibleDescription(description: ProfileDescription | null | undefined): VisibleDescription | null {
  if (!description || description.visibility !== "other") return null;
  const identity = Object.entries(description.identity ?? {})
    .filter(([key, field]) => field.enabled && isDescriptionItemActive(field.expiresAt) && String(field.value).trim() && identityLabels[key])
    .map(([key, field]) => ({ label: identityLabels[key], value: String(field.value) }));
  const themes = Object.entries(description.themes ?? {}).filter(([, theme]) => theme.enabled && isDescriptionItemActive(theme.expiresAt)).map(([id, theme]) => ({
    id,
    label: themeLabels[id] ?? id,
    description: theme.description?.trim() ?? "",
    fields: Object.entries(theme.fields ?? {}).filter(([key, value]) => theme.fieldStates?.[key] !== false && isDescriptionItemActive(theme.fieldExpiresAt?.[key]) && String(value).trim()).map(([key, value]) => `${key}: ${String(value)}`),
    tags: theme.tags ?? []
  })).filter((theme) => theme.description || theme.fields.length || theme.tags.length);
  const text = description.textEnabled && isDescriptionItemActive(description.textExpiresAt) ? description.text.trim() : "";
  if (!text && identity.length === 0 && themes.length === 0) return null;
  return { text, audience: description.relationship.split("|").filter(Boolean), identity, themes };
}

function publicProfile(profile: SocialProfile) {
  return {
    id: profile.id,
    name: profile.name,
    avatar: profile.avatar,
    avatarUrl: profile.avatarUrl,
    category: profile.category,
    kind: profile.kind,
    bio: profile.bio,
    createdAt: profile.createdAt,
    lastSeenAt: profile.lastSeenAt,
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

export async function getPublicProfileView(profileId: string, allowJoinedMetaProfile = false, forcePublicPreview = false, viewerProfileId?: string, allowExactRelativesLink = false): Promise<PublicProfileView | null> {
  const persistent = await isPersistentStore();
  const accountId = persistent ? await getSessionAccountId() : "account-demo";
  const profiles = await listProfilesCached();
  const locallyAvailable = profiles.find((profile) => profile.id === profileId);
  const isOwner = Boolean(locallyAvailable && accountId && locallyAvailable.accountId === accountId);
  if (isOwner && !forcePublicPreview) return null;
  if (allowJoinedMetaProfile && locallyAvailable?.kind === "meta" && viewerProfileId) {
    const sql = persistent ? database() : null;
    if (sql && accountId) {
      const membership = await sql`SELECT 1 FROM meta_profile_members mm JOIN profiles member ON member.id = mm.member_profile_id WHERE mm.meta_profile_id = ${profileId} AND mm.member_profile_id = ${viewerProfileId} AND member.account_id = ${accountId} LIMIT 1`;
      allowJoinedMetaProfile = membership.length > 0;
    } else {
      const socialState = globalThis as typeof globalThis & { __socialState?: { profiles: SocialProfile[] } };
      allowJoinedMetaProfile = Boolean(socialState.__socialState?.profiles.some((meta) => meta.id === profileId && meta.kind === "meta" && meta.members?.includes(viewerProfileId)));
    }
  } else {
    allowJoinedMetaProfile = false;
  }

  let baseProfile: SocialProfile | undefined;
  if (!persistent) baseProfile = locallyAvailable;
  else {
    const sql = database();
    if (!sql) return null;
    const rows = await sql`SELECT p.payload, p.avatar_url AS "avatarUrl", p.created_at AS "createdAt", p.last_seen_at AS "lastSeenAt", COALESCE(pp.settings->>'contactsVisibility', 'none') AS "contactsVisibility", COALESCE(pp.settings->'contactCircleIds', '[]'::jsonb) AS "contactCircleIds",
      CASE WHEN p.kind <> 'meta' THEN p.visibility
        WHEN p.visibility = 'ghost' OR EXISTS (SELECT 1 FROM meta_profile_members mm JOIN profiles member ON member.id = mm.member_profile_id WHERE mm.meta_profile_id = p.id AND member.visibility = 'ghost') THEN 'ghost'
        WHEN p.visibility = 'relatives' OR EXISTS (SELECT 1 FROM meta_profile_members mm JOIN profiles member ON member.id = mm.member_profile_id WHERE mm.meta_profile_id = p.id AND member.visibility = 'relatives') THEN 'relatives'
        ELSE 'all' END AS "effectiveVisibility",
      CASE WHEN p.kind <> 'meta' THEN p.social_distance ELSE GREATEST(p.social_distance, COALESCE((SELECT MAX(member.social_distance) FROM meta_profile_members mm JOIN profiles member ON member.id = mm.member_profile_id WHERE mm.meta_profile_id = p.id), 0)) END AS "effectiveDistance"
      FROM profiles p LEFT JOIN profile_preferences pp ON pp.profile_id = p.id WHERE p.id = ${profileId} LIMIT 1`;
    const row = rows[0];
    if (row) baseProfile = { ...(row.payload as SocialProfile), avatarUrl: row.avatarUrl as string | null, createdAt: new Date(row.createdAt as string).toISOString(), lastSeenAt: row.lastSeenAt ? new Date(row.lastSeenAt as string).toISOString() : null, visibility: row.effectiveVisibility as string, socialDistance: Number(row.effectiveDistance), contactsVisibility: row.contactsVisibility as SocialProfile["contactsVisibility"], contactCircleIds: row.contactCircleIds as string[] };
  }
  if (!baseProfile) return null;
  const isViewingOwnProfile = viewerProfileId === profileId && profiles.some((profile) => profile.id === profileId && profile.accountId === accountId);
  const { direct, secondDegree } = await contactDistances(viewerProfileId);
  const targetIdentities = baseProfile.kind === "meta" ? [profileId, ...(baseProfile.members ?? [])] : [profileId];
  const isDirectContact = Boolean(viewerProfileId && targetIdentities.some((identity) => direct.has(identity)));
  const isSecondDegreeContact = Boolean(viewerProfileId && targetIdentities.some((identity) => secondDegree.has(identity)));
  const privacyAllowsView = baseProfile.visibility === "all" && (Boolean(viewerProfileId) || baseProfile.socialDistance === 0)
    && !(baseProfile.socialDistance >= 1 && isDirectContact)
    && !(baseProfile.socialDistance >= 2 && isSecondDegreeContact);
  const relativesLinkAllowsView = baseProfile.visibility === "relatives" && allowExactRelativesLink
    && !(baseProfile.socialDistance >= 1 && isDirectContact)
    && !(baseProfile.socialDistance >= 2 && isSecondDegreeContact);
  if (!allowJoinedMetaProfile && !isViewingOwnProfile && !privacyAllowsView && !relativesLinkAllowsView) return null;

  const [storedDescription, forums, existingEvents, existingSearches] = await Promise.all([
    loadStoredDescription(profileId),
    listProfileSpaces(profileId, "forums"),
    listProfileEvents(profileId),
    listPublicProfileSearches(profileId)
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
  let searches: PublicProfileView["searches"] = existingSearches;
  let contacts: PublicProfileView["contacts"] = [];
  const signals: PublicProfileView["signals"] = { toxic: 0, shocking: 0, feelGood: 0, inspiring: 0, useful: 0, interesting: 0 };

  if (!sql) {
    const globalSocial = globalThis as typeof globalThis & { __socialState?: { profiles: SocialProfile[]; posts: SocialPost[]; circles: SocialCircle[]; descriptions: ProfileDescription[] } };
    const state = globalSocial.__socialState;
    if (state) {
      if (baseProfile.kind === "meta") {
        memberProfiles = (baseProfile.members ?? []).map((id) => state.profiles.find((item) => item.id === id)).filter((item): item is SocialProfile => Boolean(item && (item.visibility === "all" || (allowJoinedMetaProfile && item.id === viewerProfileId))));
      } else {
        relatedMetaProfiles = profiles.filter((item) => item.kind === "meta" && item.visibility === "all" && item.socialDistance === 0 && item.members?.includes(profileId));
      }
      circles = [];
      if (baseProfile.contactsVisibility !== "none") {
        const selectedCircleIds = baseProfile.contactsVisibility === "circles" ? new Set(baseProfile.contactCircleIds ?? []) : null;
        const contactIds = new Set(state.circles.flatMap((circle) => {
          if (selectedCircleIds && !selectedCircleIds.has(circle.id)) return [];
          const memberIds = circle.memberProfileIds ?? [];
          if (circle.ownerProfileId !== profileId && !memberIds.includes(profileId)) return [];
          return [circle.ownerProfileId, ...memberIds].filter((id) => id !== profileId);
        }));
        contacts = [...contactIds].map((id) => state.profiles.find((item) => item.id === id)).filter((item): item is SocialProfile => Boolean(item && item.visibility === "all" && item.socialDistance === 0)).map(({ id, name, avatar, category, kind }) => ({ id, name, avatar, category, kind }));
      }
      const publicPosts = state.posts.filter((post) => post.profileId === profileId && post.visibility === "public" && !post.circleId);
      for (const post of publicPosts) {
        signals.toxic += post.reactions?.["❌"] ?? 0;
        signals.shocking += post.reactions?.["⚠️"] ?? 0;
        signals.feelGood += post.reactions?.["☀️"] ?? 0;
        signals.inspiring += post.reactions?.["💡"] ?? 0;
        signals.useful += post.reactions?.["🔑"] ?? 0;
        signals.interesting += post.reactions?.["🎓"] ?? 0;
      }
      posts = publicPosts.map(({ id, title, body, author, createdAt, media, circleName }) => ({ id, title, body, author, createdAt, media, circleName }));
      const globalModules = globalThis as typeof globalThis & { __profileModules?: { events?: ProfileEvent[]; searches?: SavedProfileSearch[] } };
      events = (globalModules.__profileModules?.events ?? []).filter((event) => event.profileId === profileId);
      searches = (globalModules.__profileModules?.searches ?? []).filter((search) => search.profileId === profileId);
    }
    const debateStore = globalThis as typeof globalThis & { __debateStore?: { debates: Debate[] } };
    debates = (debateStore.__debateStore?.debates ?? []).filter((debate) => debate.authorProfileId === profileId && !debate.circleId).map(({ id, title, content, from, timestamp, media }) => ({ id, title, content, from, timestamp, media }));
  } else {
    if (baseProfile.contactsVisibility !== "none") {
      const selectedCircleIds = baseProfile.contactsVisibility === "circles" ? baseProfile.contactCircleIds ?? [] : [];
      const contactRows = await sql`WITH contact_ids AS (
          SELECT followed_profile_id AS profile_id FROM profile_follows WHERE follower_profile_id = ${profileId} AND status = 'active' AND ${baseProfile.contactsVisibility} = 'all'
          UNION SELECT follower_profile_id FROM profile_follows WHERE followed_profile_id = ${profileId} AND status = 'active' AND ${baseProfile.contactsVisibility} = 'all'
          UNION SELECT other.profile_id FROM circle_members own JOIN circle_members other ON other.circle_id = own.circle_id WHERE own.profile_id = ${profileId} AND own.status = 'active' AND other.status = 'active' AND other.profile_id <> ${profileId} AND (${baseProfile.contactsVisibility} = 'all' OR own.circle_id = ANY(${selectedCircleIds}))
          UNION SELECT c.owner_profile_id FROM circle_members own JOIN circles c ON c.id = own.circle_id WHERE own.profile_id = ${profileId} AND own.status = 'active' AND c.owner_profile_id <> ${profileId} AND (${baseProfile.contactsVisibility} = 'all' OR own.circle_id = ANY(${selectedCircleIds}))
          UNION SELECT cm.profile_id FROM circles c JOIN circle_members cm ON cm.circle_id = c.id WHERE c.owner_profile_id = ${profileId} AND cm.profile_id <> ${profileId} AND cm.status = 'active' AND (${baseProfile.contactsVisibility} = 'all' OR c.id = ANY(${selectedCircleIds}))
        ) SELECT DISTINCT p.id, p.name, p.avatar, p.category, p.kind FROM contact_ids ci JOIN profiles p ON p.id = ci.profile_id WHERE p.id <> ${profileId} AND p.visibility = 'all' AND p.social_distance = 0 ORDER BY p.name`;
      contacts = contactRows as PublicProfileView["contacts"];
    }
    circles = [];
    if (baseProfile.kind === "meta") {
      const rows = await sql`SELECT p.payload FROM profiles p JOIN meta_profile_members mm ON mm.member_profile_id = p.id WHERE mm.meta_profile_id = ${profileId} AND (p.visibility = 'all' OR (${allowJoinedMetaProfile} AND p.id = ${viewerProfileId} AND p.account_id = ${accountId})) ORDER BY p.created_at`;
      memberProfiles = rows.map((row) => row.payload as SocialProfile);
    } else {
      const rows = await sql`SELECT p.payload FROM profiles p WHERE p.kind = 'meta'
        AND p.visibility = 'all' AND p.social_distance = 0
        AND NOT EXISTS (SELECT 1 FROM meta_profile_members restricted_members JOIN profiles member ON member.id = restricted_members.member_profile_id WHERE restricted_members.meta_profile_id = p.id AND (member.visibility <> 'all' OR member.social_distance > 0))
        AND (p.payload->'members' ? ${profileId} OR EXISTS (SELECT 1 FROM meta_profile_members mm WHERE mm.meta_profile_id = p.id AND mm.member_profile_id = ${profileId})) ORDER BY p.created_at`;
      relatedMetaProfiles = rows.map((row) => row.payload as SocialProfile);
    }
    const forumRows = await sql`SELECT id, profile_id AS "profileId", kind, name, description, created_at AS "createdAt" FROM profile_spaces WHERE profile_id = ${profileId} AND kind = 'forums' ORDER BY created_at DESC LIMIT 50`;
    visibleForums = forumRows.map((row) => ({ ...row, createdAt: new Date(row.createdAt as string).toISOString() })) as ProfileSpace[];
    const visiblePosts = await sql`SELECT payload FROM social_posts WHERE profile_id = ${profileId} AND visibility = 'public' AND circle_id IS NULL ORDER BY created_at DESC LIMIT 50`;
    posts = visiblePosts.map((row) => {
      const post = row.payload as SocialPost;
      signals.toxic += post.reactions?.["❌"] ?? 0;
      signals.shocking += post.reactions?.["⚠️"] ?? 0;
      signals.feelGood += post.reactions?.["☀️"] ?? 0;
      signals.inspiring += post.reactions?.["💡"] ?? 0;
      return { id: post.id, title: post.title, body: post.body, author: post.author, createdAt: post.createdAt, media: post.media, circleName: post.circleName };
    });
    const reactionRows = await sql`SELECT reaction, COUNT(*)::int AS count FROM social_post_reactions r JOIN social_posts p ON p.id = r.post_id WHERE p.profile_id = ${profileId} AND p.visibility = 'public' AND p.circle_id IS NULL AND reaction = ANY(${["❌", "⚠️", "☀️", "💡"]}) GROUP BY reaction`;
    for (const row of reactionRows) {
      if (row.reaction === "❌") signals.toxic += Number(row.count);
      if (row.reaction === "⚠️") signals.shocking += Number(row.count);
      if (row.reaction === "☀️") signals.feelGood += Number(row.count);
      if (row.reaction === "💡") signals.inspiring += Number(row.count);
      if (row.reaction === "🔑") signals.useful += Number(row.count);
      if (row.reaction === "🎓") signals.interesting += Number(row.count);
    }
    const debateRows = await sql`SELECT payload FROM debates WHERE visibility = 'public' AND author_profile_id = ${profileId} AND circle_id IS NULL ORDER BY created_at DESC LIMIT 50`;
    debates = debateRows.map((row) => {
      const debate = row.payload as Debate;
      return { id: debate.id, title: debate.title, content: debate.content, from: debate.from, timestamp: debate.timestamp, media: debate.media };
    });
    const eventRows = await sql`SELECT id, created_by_profile_id AS "profileId", title, description, starts_at AS "startsAt", location, created_at AS "createdAt"
      FROM social_events WHERE created_by_profile_id = ${profileId} AND visibility = 'public' AND circle_id IS NULL ORDER BY starts_at NULLS LAST, created_at DESC LIMIT 50`;
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
    events,
    searches,
    contacts,
    signals
  };
}

export type PublicMedia = MediaAttachment;