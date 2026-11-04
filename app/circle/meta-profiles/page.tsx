import Link from "next/link";
import { SocialProfiles } from "@/components/social-profiles";
import { getSessionAccountId } from "@/lib/auth";
import { isPersistentStore } from "@/lib/debates";
import { listProfiles } from "@/lib/social";

export const dynamic = "force-dynamic";

export default async function CircleMetaProfilesPage() {
  const [profiles, persistent] = await Promise.all([listProfiles(), isPersistentStore()]);
  const currentAccountId = persistent ? await getSessionAccountId() ?? undefined : "account-demo";
  return <main className="social-shell social-directory-shell meta-profile-account-page"><div className="social-page-heading meta-profile-account-heading"><div><p className="eyebrow">Circles · shared identities</p><h1>Account Meta-Profiles</h1></div><Link className="back-link" href="/circle">← Account</Link></div><SocialProfiles initialProfiles={profiles} persistent={persistent} kind="meta" currentAccountId={currentAccountId} /></main>;
}
