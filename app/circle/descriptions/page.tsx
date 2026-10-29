import Link from "next/link";
import { isPersistentStore } from "@/lib/debates";
import { listProfiles } from "@/lib/social";

export const dynamic = "force-dynamic";

export default async function CircleDescriptionsPage() {
  const [profiles, persistent] = await Promise.all([listProfiles(), isPersistentStore()]);
  return <main className="social-shell social-directory-shell">
    <div className="social-page-heading"><div><p className="eyebrow">Compte · descriptions</p><h1>Choisir un profil</h1></div><Link className="back-link" href="/circle">← Compte</Link></div>
    {!persistent && <p className="notice social-notice">Les modifications sont conservées en mémoire jusqu’au redémarrage du serveur.</p>}
    <p className="descriptions-intro">Chaque profil possède ses propres descriptions. Les champs hérités du compte peuvent être activés, masqués ou remplacés pour le profil choisi.</p>
    <section className="social-profile-directory">{profiles.map((profile) => <Link className="social-profile-card description-profile-choice" href={`/circle/profiles/${encodeURIComponent(profile.id)}/descriptions`} key={profile.id}><span className="social-avatar social-avatar-large">{profile.avatar}</span><div><h2>{profile.name}</h2><p>{profile.kind === "individual" ? "Profil individuel" : `Méta-profil · ${profile.category}`}</p><p>{profile.bio}</p></div><span className="profile-visibility">Modifier →</span></Link>)}</section>
  </main>;
}
