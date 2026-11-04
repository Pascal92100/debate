import Link from "next/link";
import type { SocialProfile } from "@/lib/social";

export function SocialProfiles({ initialProfiles, persistent, kind, currentAccountId }: { initialProfiles: SocialProfile[]; persistent: boolean; kind?: "individual" | "meta"; currentAccountId?: string }) {
  const visibleProfiles = kind ? initialProfiles.filter((profile) => kind === "individual" ? profile.kind === "individual" : profile.kind !== "individual") : initialProfiles;
  const isMeta = kind === "meta";
  const createHref = isMeta ? "/circle/meta-profiles/new" : "/circle/profiles/new";
  const title = kind === "individual" ? "Individual Profiles" : "Profiles";

  return <>
    {!persistent && <p className="notice social-notice">New profiles are temporary without DATABASE_URL.</p>}
    {!isMeta && <div className="social-section-heading"><div><p className="eyebrow">Identities and contexts</p><h1>Your {title}</h1><p>An account can have separate individual and meta-profiles.</p></div><Link className="button-primary" href={createHref}>+ Create a profile</Link></div>}
    {isMeta && <div className="meta-profile-create-row"><span>Shared identities represented by your profiles</span><Link className="meta-profile-create-link" href={createHref}><span aria-hidden="true">+</span>Create meta-profile</Link></div>}
    {visibleProfiles.length === 0 ? <div className="empty-state">{isMeta ? "No meta-profiles yet." : "No individual profiles yet."} <Link href={createHref}>Create one →</Link></div> : <section className={`social-profile-directory${isMeta ? " meta-profile-directory" : ""}`}>
      {visibleProfiles.map((profile) => {
        if (isMeta) {
          const representedMembers = (profile.members ?? []).map((memberId) => initialProfiles.find((member) => member.id === memberId)).filter((member): member is SocialProfile => Boolean(member));
          const isOwned = Boolean(currentAccountId && profile.accountId === currentAccountId);
          const representative = representedMembers[0];
          const href = isOwned
            ? `/circle/profiles/${encodeURIComponent(profile.id)}`
            : representative
              ? `/circle/profiles/${encodeURIComponent(profile.id)}?view=public&from=${encodeURIComponent(representative.id)}&returnTo=%2Fcircle%2Fmeta-profiles`
              : `/circle/profiles/${encodeURIComponent(profile.id)}?view=public&returnTo=%2Fcircle%2Fmeta-profiles`;
          const memberNames = representedMembers.map((member) => member.name);
          const description = profile.relationship || (memberNames.length ? `Represented by ${memberNames.join(", ")}` : profile.bio || "No profile represents this identity yet.");
          return <Link className="meta-profile-account-card" href={href} key={profile.id}>
            <span className="social-avatar social-avatar-large">{profile.avatar}</span>
            <span className="meta-profile-account-card-copy"><strong>{profile.name}</strong><small>{profile.category} · Meta-profile</small><span>{description}</span></span>
            <span className="account-profile-row-arrow" aria-hidden="true">→</span>
          </Link>;
        }
        return <article className="social-profile-card" key={profile.id}><span className="social-avatar social-avatar-large">{profile.avatar}</span><div><h2>{profile.name}</h2><p>Individual profile · {profile.category}</p><p>{profile.bio}</p><div className="profile-card-actions"><Link href={`/circle/profiles/${encodeURIComponent(profile.id)}`}>View profile</Link><Link href={`/circle/profiles/${encodeURIComponent(profile.id)}/descriptions`}>Descriptions</Link><Link href={`/debates/new?profileId=${encodeURIComponent(profile.id)}`}>Start a debate as this profile</Link></div></div><div className="profile-visibility">{profile.visibility === "all" ? "Visible to everyone" : profile.visibility === "ghost" ? "Hidden from search" : "Connections only"}<small>Social distance: {profile.socialDistance}{profile.anonymous ? " · Anonymous browsing" : ""}</small></div></article>;
      })}
    </section>}
  </>;
}
