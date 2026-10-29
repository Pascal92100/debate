import { SocialNav } from "@/components/social-nav";
import { SocialProfiles } from "@/components/social-profiles";
import { isPersistentStore } from "@/lib/debates";
import { listProfiles } from "@/lib/social";

export const dynamic = "force-dynamic";

export default async function ProfilesPage() {
  const [profiles, persistent] = await Promise.all([listProfiles(), isPersistentStore()]);
  return <main className="social-shell social-directory-shell"><div className="social-page-heading"><div><p className="eyebrow">Social network</p><h1>Circles</h1></div><SocialNav active="profiles" /></div><SocialProfiles initialProfiles={profiles} persistent={persistent} /><p className="prototype-note">Profiles and meta-profiles can be created. Detailed theme descriptions and visibility controls are available from the Circle account.</p></main>;
}
