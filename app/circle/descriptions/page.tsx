import Link from "next/link";
import { isPersistentStore } from "@/lib/debates";
import { listProfiles } from "@/lib/social";

export const dynamic = "force-dynamic";

export default async function CircleDescriptionsPage() {
  const [profiles, persistent] = await Promise.all([listProfiles(), isPersistentStore()]);
  return <main className="social-shell social-directory-shell">
    <div className="social-page-heading"><div><p className="eyebrow">Circle · descriptions</p><h1>Choose a profile</h1></div><Link className="back-link" href="/circle">← Account</Link></div>
    {!persistent && <p className="notice social-notice">Changes are kept in memory until the server restarts.</p>}
    <p className="descriptions-intro">Each profile has its own descriptions. Account fields can be enabled, hidden, or overridden for the selected profile.</p>
    <section className="social-profile-directory">{profiles.map((profile) => <Link className="social-profile-card description-profile-choice" href={`/circle/profiles/${encodeURIComponent(profile.id)}/descriptions`} key={profile.id}><span className="social-avatar social-avatar-large">{profile.avatar}</span><div><h2>{profile.name}</h2><p>{profile.kind === "individual" ? "Individual profile" : `Meta-profile · ${profile.category}`}</p><p>{profile.bio}</p></div><span className="profile-visibility">Edit →</span></Link>)}</section>
  </main>;
}
