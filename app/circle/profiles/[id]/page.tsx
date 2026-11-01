import Link from "next/link";
import { notFound } from "next/navigation";
import { DeleteEntityButton } from "@/components/delete-entity-button";
import { MetaProfileMembers } from "@/components/meta-profile-members";
import { isPersistentStore } from "@/lib/debates";
import { getSessionAccountId } from "@/lib/auth";
import { listMetaProfileMembers } from "@/lib/meta-profile-invitations";
import { getUnreadProfileAlertCount } from "@/lib/profile-modules";
import { listProfiles } from "@/lib/social";

export const dynamic = "force-dynamic";

export default async function CircleProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [profiles, persistent] = await Promise.all([listProfiles(), isPersistentStore()]);
  const profile = profiles.find((item) => item.id === id);
  if (!profile) notFound();
  const [metaMembers, unreadAlerts] = await Promise.all([
    profile.kind !== "individual" ? listMetaProfileMembers(profile.id) : Promise.resolve([]),
    getUnreadProfileAlertCount(profile.id)
  ]);
  const canInvite = !persistent || profile.accountId === await getSessionAccountId();
  const relatedMetaProfiles = profile.kind === "individual" ? profiles.filter((item) => item.kind === "meta" && item.members?.includes(profile.id)) : [];
  const profileLinks = [
    { icon: "📝", title: "Edit Descriptions", description: "Your self-presentation", section: "descriptions" },
    { icon: "🔍", title: "Edit Searches", description: "Your preferences", section: "searches" },
    { icon: "🏠", title: "Your main timeline", description: "Your global view", section: "timeline" },
    { icon: "⭕", title: "Your Circles", description: "Trusted spaces", section: "circles" },
    { icon: "👥", title: "Communities / Groups", description: "Shared interests", section: "communities" },
    { icon: "💬", title: "Your Forums", description: "Topics you follow or created", section: "forums" },
    { icon: "🔔", title: "Alerts", description: "Visits and replies", section: "alerts", count: unreadAlerts },
    { icon: "⚖️", title: "Your debates and discussions", description: "Debates or simple discussions", section: "discussions" },
    { icon: "📨", title: "Private Discussions", description: "1-to-1 exchanges", section: "private-discussions" },
    { icon: "📅", title: "Your Events", description: "Upcoming and past", section: "events" },
    { icon: "⭐", title: "Followed Profiles", description: "Your favorites", section: "following" },
    { icon: "🛒", title: "Shop", description: "Services and tools", section: "shop" }
  ];

  return <main className="social-shell social-directory-shell">
    <div className="social-page-heading"><div><p className="eyebrow">Circles · profile</p><h1>{profile.name}</h1></div><Link className="back-link" href="/circle">← Account</Link></div>
    {!persistent && <p className="notice social-notice">This profile's contributions are temporary without DATABASE_URL.</p>}
    <section className="profile-detail-header"><span className="social-avatar social-avatar-large">{profile.avatar}</span><div><h2>{profile.name}</h2><p>{profile.kind === "individual" ? "Individual profile" : `${profile.category} (Meta-profile)`}</p><p>{profile.bio}</p></div></section>
    {profile.kind !== "individual" && <MetaProfileMembers metaProfileId={profile.id} members={metaMembers} canInvite={canInvite} />}
    {relatedMetaProfiles.length > 0 && <section className="profile-members"><div className="account-section-heading"><div><p className="eyebrow">Shared identities</p><h2>Meta-profiles this profile belongs to</h2></div><span>{relatedMetaProfiles.length}</span></div><div className="account-profile-list">{relatedMetaProfiles.map((metaProfile) => <Link className="account-profile-row" href={`/circle/profiles/${encodeURIComponent(metaProfile.id)}`} key={metaProfile.id}><span className="social-avatar">{metaProfile.avatar}</span><span><strong>{metaProfile.name}</strong><small>{metaProfile.category} · Meta-profile</small></span><span className="account-profile-row-arrow">→</span></Link>)}</div></section>}
    <section className="profile-links-section"><div className="account-section-heading"><div><p className="eyebrow">Profile Links</p><h2>Choose a space</h2></div></div><nav className="profile-link-grid" aria-label={`${profile.name} sections`}>{profileLinks.map((item) => <Link className="account-choice profile-link-choice" href={item.section === "descriptions" ? `/circle/profiles/${encodeURIComponent(profile.id)}/descriptions` : `/circle/profiles/${encodeURIComponent(profile.id)}/${item.section}`} key={item.section}><span className="account-choice-icon" aria-hidden="true">{item.icon}{item.section === "alerts" && item.count ? <span className="account-alert-badge" aria-label={`${item.count} unread alerts`}>{item.count}</span> : null}</span><span><strong>{item.title}</strong><small>{item.description}</small></span><span className="account-choice-arrow" aria-hidden="true">→</span></Link>)}</nav></section>
    {canInvite && <DeleteEntityButton endpoint={`/api/social/profiles/${encodeURIComponent(profile.id)}`} label={`Delete ${profile.kind === "individual" ? "profile" : "meta-profile"}`} confirmation={`Permanently delete ${profile.name} and content owned by this profile? This cannot be undone.`} redirectTo={profile.kind === "individual" ? "/circle/profiles" : "/circle/meta-profiles"} />}
  </main>;
}
