import { SocialNav } from "@/components/social-nav";
import { SocialProfiles } from "@/components/social-profiles";
import { isPersistentStore } from "@/lib/debates";
import { listProfiles } from "@/lib/social";

export const dynamic = "force-dynamic";

export default async function ProfilesPage() {
  const [profiles, persistent] = await Promise.all([listProfiles(), isPersistentStore()]);
  return <main className="social-shell social-directory-shell"><div className="social-page-heading"><div><p className="eyebrow">Réseau</p><h1>Circle</h1></div><SocialNav active="profiles" /></div><SocialProfiles initialProfiles={profiles} persistent={persistent} /><p className="prototype-note">Les profils et méta-profils peuvent être créés. L'édition complète des descriptions par thème et des règles fines de visibilité reste à raccorder.</p></main>;
}
