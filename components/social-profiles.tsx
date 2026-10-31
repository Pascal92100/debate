import Link from "next/link";
import type { SocialProfile } from "@/lib/social";

export function SocialProfiles({ initialProfiles, persistent, kind }: { initialProfiles: SocialProfile[]; persistent: boolean; kind?: "individual" | "meta" }) {
  const visibleProfiles = kind ? initialProfiles.filter((profile) => kind === "individual" ? profile.kind === "individual" : profile.kind !== "individual") : initialProfiles;
  const isMeta = kind === "meta";
  const createHref = isMeta ? "/circle/meta-profiles/new" : "/circle/profiles/new";
  const title = isMeta ? "Meta-Profiles" : kind === "individual" ? "Individual Profiles" : "Profiles";

  return <>
    {!persistent && <p className="notice social-notice">New profiles are temporary without DATABASE_URL.</p>}
    <div className="social-section-heading"><div><p className="eyebrow">Identities and contexts</p><h1>Your {title}</h1><p>An account can have separate individual and meta-profiles.</p></div><Link className="button-primary" href={createHref}>{isMeta ? "+ Create a meta-profile" : "+ Create a profile"}</Link></div>
    {visibleProfiles.length === 0 ? <div className="empty-state">{isMeta ? "No meta-profiles yet." : "No individual profiles yet."} <Link href={createHref}>Create one →</Link></div> : <section className="social-profile-directory">{visibleProfiles.map((profile) => <article className="social-profile-card" key={profile.id}><span className="social-avatar social-avatar-large">{profile.avatar}</span><div><h2>{profile.name}</h2><p>{profile.kind === "individual" ? "Individual profile" : `${profile.category} (Meta-profile)`}</p><p>{profile.relationship ? profile.relationship : profile.includesLabel ? `Includes: ${profile.includesLabel}` : profile.members?.length ? `Includes: ${profile.members.map((id) => initialProfiles.find((member) => member.id === id)?.name).filter(Boolean).join(", ")}` : profile.bio}</p><div className="profile-card-actions"><Link href={`/circle/profiles/${encodeURIComponent(profile.id)}`}>View profile</Link><Link href={`/circle/profiles/${encodeURIComponent(profile.id)}/descriptions`}>Descriptions</Link><Link href={`/debates/new?profileId=${encodeURIComponent(profile.id)}`}>Start a debate as this profile</Link></div></div><div className="profile-visibility">{profile.visibility === "all" ? "Visible to everyone" : profile.visibility === "ghost" ? "Hidden from search" : "Connections only"}<small>Social distance: {profile.socialDistance}{profile.anonymous ? " · Anonymous browsing" : ""}</small></div></article>)}</section>}
  </>;
}
