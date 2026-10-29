import Link from "next/link";
import { SocialProfiles } from "@/components/social-profiles";
import { isPersistentStore } from "@/lib/debates";
import { listProfiles } from "@/lib/social";

export const dynamic = "force-dynamic";

export default async function CircleProfilesPage() {
  const [profiles, persistent] = await Promise.all([listProfiles(), isPersistentStore()]);
  return <main className="social-shell social-directory-shell"><div className="social-page-heading"><div><p className="eyebrow">Compte · identités</p><h1>Profils individuels</h1></div><Link className="back-link" href="/circle">← Compte</Link></div><SocialProfiles initialProfiles={profiles} persistent={persistent} kind="individual" /></main>;
}
