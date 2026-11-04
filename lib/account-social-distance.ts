import "server-only";
import { getSessionAccountId } from "@/lib/auth";
import { database, isPersistentStore } from "@/lib/debates";
import { listProfiles, type SocialProfile } from "@/lib/social";

export type AccountSocialDistance = {
  accountId: string;
  displayName: string;
  distance: number | null;
};

function graphDistances(viewerAccountId: string, accountIds: string[], edges: Array<{ sourceId: string; targetId: string }>) {
  const graph = new Map<string, Set<string>>();
  for (const { sourceId, targetId } of edges) {
    if (sourceId === targetId) continue;
    const sourceEdges = graph.get(sourceId) ?? new Set<string>();
    const targetEdges = graph.get(targetId) ?? new Set<string>();
    sourceEdges.add(targetId);
    targetEdges.add(sourceId);
    graph.set(sourceId, sourceEdges);
    graph.set(targetId, targetEdges);
  }
  const distances = new Map<string, number>([[viewerAccountId, 0]]);
  const queue = [viewerAccountId];
  while (queue.length) {
    const current = queue.shift()!;
    for (const next of graph.get(current) ?? []) {
      if (distances.has(next)) continue;
      distances.set(next, distances.get(current)! + 1);
      queue.push(next);
    }
  }
  return accountIds.map((accountId) => ({ accountId, distance: distances.get(accountId) ?? null }));
}

export async function getAccountSocialDistanceMap(viewerAccountId: string): Promise<Map<string, number>> {
  const sql = database();
  if (!sql || !await isPersistentStore()) {
    const globalSocial = globalThis as typeof globalThis & { __socialState?: { profiles: SocialProfile[] } };
    const profiles = globalSocial.__socialState?.profiles ?? await listProfiles();
    const accountIds = [...new Set(profiles.map((profile) => profile.accountId))];
    const edges: Array<{ sourceId: string; targetId: string }> = [];
    const addProfileEdge = (firstProfileId: string, secondProfileId: string) => {
      const first = profiles.find((profile) => profile.id === firstProfileId);
      const second = profiles.find((profile) => profile.id === secondProfileId);
      if (first && second && first.accountId !== second.accountId) edges.push({ sourceId: first.accountId, targetId: second.accountId });
    };
    for (const metaProfile of profiles.filter((profile) => profile.kind === "meta")) {
      for (let index = 0; index < (metaProfile.members ?? []).length; index += 1) {
        for (const memberId of metaProfile.members!.slice(index + 1)) addProfileEdge(metaProfile.members![index], memberId);
        addProfileEdge(metaProfile.id, metaProfile.members![index]);
      }
    }
    return new Map(graphDistances(viewerAccountId, accountIds, edges).flatMap(({ accountId, distance }) => distance === null ? [] : [[accountId, distance] as const]));
  }

  const accountRows = await sql`SELECT id FROM accounts`;
  const accountIds = accountRows.map((row) => row.id as string);
  const edgeRows = await sql`WITH profile_edges AS (
      SELECT follower_profile_id AS first_profile_id, followed_profile_id AS second_profile_id
      FROM profile_follows WHERE status = 'active'
      UNION
      SELECT first_member.profile_id AS first_profile_id, second_member.profile_id AS second_profile_id
      FROM circle_members first_member JOIN circle_members second_member ON second_member.circle_id = first_member.circle_id
      WHERE first_member.profile_id <> second_member.profile_id AND first_member.status = 'active' AND second_member.status = 'active'
      UNION
      SELECT circles.owner_profile_id AS first_profile_id, members.profile_id AS second_profile_id
      FROM circles JOIN circle_members members ON members.circle_id = circles.id
      WHERE circles.owner_profile_id <> members.profile_id AND members.status = 'active'
      UNION
      SELECT source_member.member_profile_id AS first_profile_id, contact_member.member_profile_id AS second_profile_id
      FROM meta_profile_members source_member JOIN meta_profile_members contact_member ON contact_member.meta_profile_id = source_member.meta_profile_id
      WHERE source_member.member_profile_id <> contact_member.member_profile_id
      UNION
      SELECT meta.id AS first_profile_id, membership.member_profile_id AS second_profile_id
      FROM meta_profile_members membership JOIN profiles meta ON meta.id = membership.meta_profile_id AND meta.kind = 'meta'
      UNION
      SELECT source_member.member_profile_id AS first_profile_id, contact_member.member_profile_id AS second_profile_id
      FROM profiles meta
      CROSS JOIN LATERAL jsonb_array_elements_text(COALESCE(meta.payload->'members', '[]'::jsonb)) source_member(member_profile_id)
      CROSS JOIN LATERAL jsonb_array_elements_text(COALESCE(meta.payload->'members', '[]'::jsonb)) contact_member(member_profile_id)
      WHERE meta.kind = 'meta' AND source_member.member_profile_id <> contact_member.member_profile_id
      UNION
      SELECT meta.id AS first_profile_id, members.member_profile_id AS second_profile_id
      FROM profiles meta
      CROSS JOIN LATERAL jsonb_array_elements_text(COALESCE(meta.payload->'members', '[]'::jsonb)) members(member_profile_id)
      WHERE meta.kind = 'meta'
    )
    SELECT DISTINCT first.account_id AS "sourceId", second.account_id AS "targetId"
    FROM profile_edges edge
    JOIN profiles first ON first.id = edge.first_profile_id
    JOIN profiles second ON second.id = edge.second_profile_id
    WHERE first.account_id <> second.account_id`;
  const distances = graphDistances(viewerAccountId, accountIds, edgeRows as Array<{ sourceId: string; targetId: string }>);
  return new Map(distances.flatMap(({ accountId, distance }) => distance === null ? [] : [[accountId, distance] as const]));
}

export async function listAccountSocialDistances(viewerAccountId?: string): Promise<AccountSocialDistance[]> {
  if (!await isPersistentStore()) {
    const profiles = await listProfiles();
    const accountIds = [...new Set(profiles.map((profile) => profile.accountId))];
    const viewer = viewerAccountId ?? "account-demo";
    const distances = await getAccountSocialDistanceMap(viewer);
    return accountIds.map((accountId) => ({ accountId, displayName: accountId === "account-demo" ? "Demo account" : accountId, distance: distances.get(accountId) ?? null }));
  }
  const accountId = viewerAccountId ?? await getSessionAccountId();
  if (!accountId) return [];
  const sql = database();
  if (!sql) return [];
  const [accounts, distances] = await Promise.all([
    sql`SELECT id, display_name AS "displayName" FROM accounts ORDER BY display_name, id`,
    getAccountSocialDistanceMap(accountId)
  ]);
  return accounts.map((account) => ({ accountId: account.id as string, displayName: account.displayName as string, distance: distances.get(account.id as string) ?? null }));
}

export async function isAccountWithinProfileDistance(profile: SocialProfile, viewerAccountId?: string) {
  if (!viewerAccountId || profile.accountId === viewerAccountId) return true;
  const distances = await getAccountSocialDistanceMap(viewerAccountId);
  const targetAccounts = new Set([profile.accountId]);
  if (profile.kind === "meta") {
    const profiles = await listProfiles();
    for (const memberId of profile.members ?? []) {
      const member = profiles.find((item) => item.id === memberId);
      if (member) targetAccounts.add(member.accountId);
    }
  }
  const nearest = [...targetAccounts].map((accountId) => distances.get(accountId)).filter((distance): distance is number => distance !== undefined).sort((a, b) => a - b)[0] ?? null;
  if (nearest === null) return true;
  if (profile.socialDistance >= 2 && nearest <= 2) return false;
  if (profile.socialDistance >= 1 && nearest <= 1) return false;
  return true;
}
