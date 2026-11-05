import Link from "next/link";
import type { SocialProfile } from "@/lib/social";

export function SocialProfiles({ initialProfiles, persistent, kind, currentAccountId }: { initialProfiles: SocialProfile[]; persistent: boolean; kind?: "individual" | "meta"; currentAccountId?: string }) {
  const visibleProfiles = kind ? initialProfiles.filter((profile) => kind === "individual" ? profile.kind === "individual" : profile.kind !== "individual") : initialProfiles;
  const isMeta = kind === "meta";
  const createHref = isMeta ? "/circle/meta-profiles/new" : "/circle/profiles/new";

  return <>
    {!persistent && <p className="notice social-notice">New profiles are temporary without DATABASE_URL.</p>}
    <div className="meta-profile-create-row"><span>{isMeta ? "Shared identities represented by your profiles" : "Separate identities and contexts for your account"}</span><Link className="meta-profile-create-link" href={createHref}><span aria-hidden="true">+</span>{isMeta ? "Create meta-profile" : "Create profile"}</Link></div>
    {visibleProfiles.length === 0 ? <div className="empty-state">{isMeta ? "No meta-profiles yet." : "No individual profiles yet."} <Link href={createHref}>Create one →</Link></div> : <section className={`social-profile-directory meta-profile-directory`}>
      {visibleProfiles.map((profile) => {
        if (isMeta) {
          const representedMembers = (profile.ownMembers ?? profile.members ?? []).map((memberId) => initialProfiles.find((member) => member.id === memberId)).filter((member): member is SocialProfile => Boolean(member));
          const isOwned = Boolean(currentAccountId && profile.accountId === currentAccountId);
          const representative = representedMembers[0];
          const href = isOwned
            ? `/circle/profiles/${encodeURIComponent(profile.id)}`
            : representative
              ? `/circle/profiles/${encodeURIComponent(profile.id)}?view=public&from=${encodeURIComponent(representative.id)}&returnTo=%2Fcircle%2Fmeta-profiles`
              : `/circle/profiles/${encodeURIComponent(profile.id)}?view=public&returnTo=%2Fcircle%2Fmeta-profiles`;
          const memberNames = representedMembers.map((member) => member.name);
          const description = memberNames.length ? `Your profile${memberNames.length > 1 ? "s" : ""}: ${memberNames.join(", ")}` : profile.relationship || profile.bio || "No profile of yours is a member.";
          return <Link className="meta-profile-account-card" href={href} key={profile.id}>
            <span className="social-avatar social-avatar-large">{profile.avatar}</span>
            <span className="meta-profile-account-card-copy"><strong>{profile.name}</strong><small>{profile.category} · Meta-profile</small><span className="meta-profile-members-line">{description}</span></span>
            <span className="account-profile-row-arrow" aria-hidden="true">→</span>
          </Link>;
        }
        const visibilityLabel = profile.visibility === "all" ? "Visible to everyone" : profile.visibility === "ghost" ? "Hidden from search" : "Connections only";
        return <Link className="meta-profile-account-card" href={`/circle/profiles/${encodeURIComponent(profile.id)}`} key={profile.id}>
          <span className="social-avatar social-avatar-large">{profile.avatar}</span>
          <span className="meta-profile-account-card-copy"><strong>{profile.name}</strong><small>{profile.kind === "individual" ? "Individual profile" : "Meta-profile"} · {profile.category}</small><span>{visibilityLabel} · Social distance {profile.socialDistance}{profile.anonymous ? " · Anonymous" : ""}</span></span>
          <span className="account-profile-row-arrow" aria-hidden="true">→</span>
        </Link>;
      })}
    </section>}
  </>;
}
