import "server-only";
import { randomUUID } from "node:crypto";
import { getSessionAccountId } from "@/lib/auth";
import { database, isPersistentStore } from "@/lib/debates";
import { listProfiles, type SocialProfile } from "@/lib/social";
import { createProfileAlert, markMetaProfileInvitationAlertRead } from "@/lib/profile-modules";

export type MetaProfileInvitation = {
  id: string;
  token: string;
  metaProfileId: string;
  metaProfileName: string;
  invitedProfileId: string | null;
  invitedProfileName?: string;
  status: "pending" | "accepted" | "declined";
  createdAt: string;
};

export type InviteSearchResult = Pick<SocialProfile, "id" | "name" | "category" | "avatar">;
export type MetaProfileMember = InviteSearchResult & { isOwn: boolean };

type DemoInvitationState = { invitations: MetaProfileInvitation[] };
const globalInvitations = globalThis as typeof globalThis & { __metaProfileInvitations?: DemoInvitationState; __metaProfileInvitationSchema?: Promise<void> };
const demo = globalInvitations.__metaProfileInvitations ??= { invitations: [] };
const globalSocial = globalThis as typeof globalThis & { __socialState?: { profiles: SocialProfile[] } };

async function invitationDatabase() {
  const sql = database();
  if (!sql || !await isPersistentStore()) return null;
  await listProfiles();
  globalInvitations.__metaProfileInvitationSchema ??= (async () => {
    await sql`CREATE TABLE IF NOT EXISTS meta_profile_invitations (
      id TEXT PRIMARY KEY,
      token TEXT NOT NULL UNIQUE,
      meta_profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
      inviter_profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
      invited_profile_id TEXT REFERENCES profiles(id) ON DELETE CASCADE,
      status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
      represented_profile_id TEXT REFERENCES profiles(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      responded_at TIMESTAMPTZ
    )`;
    await sql`CREATE INDEX IF NOT EXISTS meta_profile_invites_inbox_idx ON meta_profile_invitations(invited_profile_id, created_at DESC) WHERE status = 'pending'`;
    await sql`CREATE TABLE IF NOT EXISTS alerts (
      id TEXT PRIMARY KEY,
      profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
      kind TEXT NOT NULL,
      payload JSONB NOT NULL DEFAULT '{}'::jsonb,
      read_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`;
  })();
  await globalInvitations.__metaProfileInvitationSchema;
  return sql;
}

async function currentAccountId() {
  if (!await isPersistentStore()) return "account-demo";
  return await getSessionAccountId();
}

export async function searchInviteProfiles(query: string): Promise<InviteSearchResult[]> {
  return searchDiscoverableProfiles(query, "individual");
}

export async function searchDiscoverableProfiles(query: string, scope: "individual" | "meta" | "all" = "individual"): Promise<InviteSearchResult[]> {
  const normalized = query.trim();
  if (normalized.length > 120) return [];
  const sql = await invitationDatabase();
  if (!sql) return (await listProfiles()).filter((profile) => (scope === "all" || (scope === "meta" ? profile.kind === "meta" : profile.kind === "individual")) && profile.visibility !== "ghost" && (!normalized || `${profile.name} ${profile.bio}`.toLocaleLowerCase().includes(normalized.toLocaleLowerCase()))).slice(0, 50).map(({ id, name, category, avatar }) => ({ id, name, category, avatar }));
  const accountId = await currentAccountId();
  if (!accountId) return [];
  const kind = scope === "meta" ? "meta" : "individual";
  const rows = await sql`SELECT id, name, category, avatar FROM profiles WHERE (${scope === "all"} OR kind = ${kind}) AND (${normalized} = '' OR POSITION(LOWER(${normalized}) IN LOWER(name || ' ' || bio)) > 0) AND (visibility = 'all' OR account_id = ${accountId}) ORDER BY LOWER(name), id LIMIT 50`;
  return rows as InviteSearchResult[];
}

export async function createMetaProfileInvitation(metaProfileId: string, inviterProfileId: string, invitedProfileId?: string | null) {
  const profiles = await listProfiles();
  const metaProfile = profiles.find((profile) => profile.id === metaProfileId && profile.kind !== "individual");
  const inviter = profiles.find((profile) => profile.id === inviterProfileId);
  if (!metaProfile || !inviter || inviter.id !== metaProfile.id) return null;
  const sql = await invitationDatabase();
  const invitation: MetaProfileInvitation = {
    id: `meta_invite_${randomUUID()}`,
    token: randomUUID(),
    metaProfileId,
    metaProfileName: metaProfile.name,
    invitedProfileId: invitedProfileId || null,
    status: "pending",
    createdAt: new Date().toISOString()
  };
  if (sql) {
    const accountId = await currentAccountId();
    if (!accountId) return null;
    const metaRows = await sql`SELECT id FROM profiles WHERE id = ${metaProfileId} AND kind = 'meta' AND account_id = ${accountId} LIMIT 1`;
    if (!metaRows.length) return null;
    if (invitedProfileId) {
      const targetRows = await sql`SELECT id, name FROM profiles WHERE id = ${invitedProfileId} AND kind = 'individual' AND (visibility = 'all' OR account_id = ${accountId}) LIMIT 1`;
      if (!targetRows.length) return null;
      invitation.invitedProfileName = targetRows[0].name as string;
    }
    await sql.transaction([
      sql`INSERT INTO meta_profile_invitations (id, token, meta_profile_id, inviter_profile_id, invited_profile_id) VALUES (${invitation.id}, ${invitation.token}, ${metaProfileId}, ${inviterProfileId}, ${invitation.invitedProfileId})`,
      ...(invitedProfileId ? [sql`INSERT INTO alerts (id, profile_id, kind, payload) VALUES (${`alert_${randomUUID()}`}, ${invitedProfileId}, 'meta_profile_invitation', ${JSON.stringify({ title: "Meta-profile invitation", message: `${metaProfile.name} invited this profile to join.`, invitationToken: invitation.token, metaProfileName: metaProfile.name })}::jsonb)`] : [])
    ]);
    return invitation;
  }
  if (invitedProfileId) {
    const target = profiles.find((profile) => profile.id === invitedProfileId && profile.kind === "individual");
    if (!target) return null;
    invitation.invitedProfileName = target.name;
    await createProfileAlert(invitedProfileId, "meta_profile_invitation", { title: "Meta-profile invitation", message: `${metaProfile.name} invited this profile to join.`, invitationToken: invitation.token, metaProfileName: metaProfile.name });
  }
  demo.invitations.unshift(invitation);
  return invitation;
}

export async function listIncomingMetaProfileInvitations(profileId: string): Promise<MetaProfileInvitation[]> {
  const sql = await invitationDatabase();
  if (!sql) return structuredClone(demo.invitations.filter((invitation) => invitation.invitedProfileId === profileId && invitation.status === "pending"));
  const accountId = await currentAccountId();
  if (!accountId) return [];
  const rows = await sql`SELECT i.id, i.token, i.meta_profile_id AS "metaProfileId", m.name AS "metaProfileName", i.invited_profile_id AS "invitedProfileId", i.status, i.created_at AS "createdAt"
    FROM meta_profile_invitations i JOIN profiles target ON target.id = i.invited_profile_id JOIN profiles m ON m.id = i.meta_profile_id
    WHERE i.invited_profile_id = ${profileId} AND target.account_id = ${accountId} AND i.status = 'pending' ORDER BY i.created_at DESC`;
  return rows.map((row) => ({ ...row, createdAt: new Date(row.createdAt as string).toISOString() })) as MetaProfileInvitation[];
}

export async function getMetaProfileInvitation(token: string) {
  const sql = await invitationDatabase();
  if (!sql) return structuredClone(demo.invitations.find((invitation) => invitation.token === token) ?? null);
  const rows = await sql`SELECT i.id, i.token, i.meta_profile_id AS "metaProfileId", m.name AS "metaProfileName", i.invited_profile_id AS "invitedProfileId", i.status, i.created_at AS "createdAt"
    FROM meta_profile_invitations i JOIN profiles m ON m.id = i.meta_profile_id WHERE i.token = ${token} LIMIT 1`;
  return rows.length ? { ...rows[0], createdAt: new Date(rows[0].createdAt as string).toISOString() } as MetaProfileInvitation : null;
}

export async function respondToMetaProfileInvitation(token: string, action: "accept" | "decline", representedProfileId?: string) {
  const profiles = await listProfiles();
  const accountId = await currentAccountId();
  if (!accountId) return false;
  const sql = await invitationDatabase();
  if (!sql) {
    const invitation = demo.invitations.find((item) => item.token === token && item.status === "pending");
    if (!invitation) return false;
    if (invitation.invitedProfileId && !profiles.some((profile) => profile.id === invitation.invitedProfileId)) return false;
    if (action === "accept") {
      const memberProfileId = invitation.invitedProfileId ?? representedProfileId;
      if (!memberProfileId || !profiles.some((profile) => profile.id === memberProfileId && profile.kind === "individual")) return false;
      const metaProfile = globalSocial.__socialState?.profiles.find((profile) => profile.id === invitation.metaProfileId);
      if (!metaProfile) return false;
      metaProfile.members = [...new Set([...(metaProfile.members ?? []), memberProfileId])];
      metaProfile.memberRoles = { ...metaProfile.memberRoles, [memberProfileId]: "member" };
    }
    invitation.status = action === "accept" ? "accepted" : "declined";
    await markMetaProfileInvitationAlertRead(token);
    return true;
  }
  if (action === "decline") {
    const rows = await sql`UPDATE meta_profile_invitations SET status = 'declined', responded_at = NOW()
      WHERE token = ${token} AND status = 'pending' AND (invited_profile_id IS NULL OR invited_profile_id IN (SELECT id FROM profiles WHERE account_id = ${accountId})) RETURNING id`;
    if (!rows.length) return false;
    await sql`UPDATE alerts SET read_at = NOW() WHERE payload->>'invitationToken' = ${token} AND profile_id IN (SELECT id FROM profiles WHERE account_id = ${accountId})`;
    return true;
  }
  const pending = await sql`SELECT invited_profile_id AS "invitedProfileId" FROM meta_profile_invitations
    WHERE token = ${token} AND status = 'pending'
      AND (invited_profile_id IS NULL OR invited_profile_id IN (SELECT id FROM profiles WHERE account_id = ${accountId})) LIMIT 1`;
  const memberProfileId = (pending[0]?.invitedProfileId as string | null) ?? representedProfileId;
  if (!memberProfileId || !profiles.some((profile) => profile.id === memberProfileId && profile.kind === "individual")) return false;
  const rows = await sql`WITH invitation AS (
      UPDATE meta_profile_invitations SET status = 'accepted', represented_profile_id = ${memberProfileId}, responded_at = NOW()
      WHERE token = ${token} AND status = 'pending'
        AND (invited_profile_id = ${memberProfileId} OR (invited_profile_id IS NULL AND ${memberProfileId} IN (SELECT id FROM profiles WHERE account_id = ${accountId} AND kind = 'individual')))
      RETURNING id, meta_profile_id, represented_profile_id
    ), membership AS (
      INSERT INTO meta_profile_members (meta_profile_id, member_profile_id, role)
      SELECT invitation.meta_profile_id, invitation.represented_profile_id, 'member' FROM invitation
      ON CONFLICT DO NOTHING RETURNING meta_profile_id
    ), profile_payload AS (
      UPDATE profiles meta SET payload = jsonb_set(meta.payload, '{members}', COALESCE((SELECT jsonb_agg(to_jsonb(members.member_profile_id)) FROM (SELECT member_profile_id FROM meta_profile_members WHERE meta_profile_id = meta.id UNION SELECT invitation.represented_profile_id FROM invitation) members), '[]'::jsonb), TRUE)
      FROM invitation WHERE meta.id = invitation.meta_profile_id RETURNING meta.id
    ), updated_alert AS (
      UPDATE alerts SET read_at = NOW() WHERE payload->>'invitationToken' = ${token} AND profile_id IN (SELECT id FROM profiles WHERE account_id = ${accountId})
    ) SELECT id FROM invitation`;
  return rows.length > 0;
}

export async function leaveMetaProfile(metaProfileId: string, memberProfileId: string) {
  const profiles = await listProfiles();
  if (!profiles.some((profile) => profile.id === memberProfileId && profile.kind === "individual")) return null;
  const sql = await invitationDatabase();
  if (!sql) {
    const metaProfile = globalSocial.__socialState?.profiles.find((profile) => profile.id === metaProfileId && profile.kind === "meta");
    if (!metaProfile || !profiles.some((profile) => profile.id === memberProfileId)) return null;
    metaProfile.members = (metaProfile.members ?? []).filter((id) => id !== memberProfileId);
    delete metaProfile.memberRoles?.[memberProfileId];
    if (!metaProfile.members.length) {
      const { deleteOwnProfile } = await import("@/lib/social");
      await deleteOwnProfile(metaProfileId);
      return { removed: true, deletedMetaProfile: true };
    }
    return { removed: true, deletedMetaProfile: false };
  }
  const accountId = await currentAccountId();
  if (!accountId) return null;
  const removed = await sql`DELETE FROM meta_profile_members mm USING profiles member, profiles meta
    WHERE mm.meta_profile_id = ${metaProfileId} AND mm.member_profile_id = ${memberProfileId}
      AND meta.id = mm.meta_profile_id AND meta.kind = 'meta'
      AND member.id = mm.member_profile_id AND member.account_id = ${accountId}
    RETURNING mm.meta_profile_id`;
  if (!removed.length) return null;
  const remaining = await sql`SELECT member_profile_id FROM meta_profile_members WHERE meta_profile_id = ${metaProfileId}`;
  if (!remaining.length) {
    await sql`DELETE FROM profiles WHERE id = ${metaProfileId} AND kind = 'meta'`;
    return { removed: true, deletedMetaProfile: true };
  }
  await sql`UPDATE profiles SET payload = jsonb_set(payload, '{members}', ${JSON.stringify(remaining.map((row) => row.member_profile_id))}::jsonb, TRUE) WHERE id = ${metaProfileId}`;
  return { removed: true, deletedMetaProfile: false };
}

export async function listMetaProfileMembers(metaProfileId: string) {
  const sql = await invitationDatabase();
  if (!sql) {
    const profiles = await listProfiles();
    const metaProfile = profiles.find((profile) => profile.id === metaProfileId && profile.kind !== "individual");
    if (!metaProfile) return [];
    return (metaProfile.members ?? []).map((id) => profiles.find((profile) => profile.id === id)).filter((profile): profile is SocialProfile => Boolean(profile)).map(({ id, name, category, avatar }) => ({ id, name, category, avatar, isOwn: true }));
  }
  const accountId = await currentAccountId();
  if (!accountId) return [];
  const rows = await sql`SELECT member.id, member.name, member.category, member.avatar, member.account_id = ${accountId} AS "isOwn" FROM meta_profile_members mm JOIN profiles meta ON meta.id = mm.meta_profile_id JOIN profiles member ON member.id = mm.member_profile_id
    WHERE mm.meta_profile_id = ${metaProfileId} AND meta.kind = 'meta'
      AND (meta.account_id = ${accountId} OR EXISTS (SELECT 1 FROM profiles own WHERE own.id = mm.member_profile_id AND own.account_id = ${accountId}))
    ORDER BY member.created_at`;
  return rows as MetaProfileMember[];
}
