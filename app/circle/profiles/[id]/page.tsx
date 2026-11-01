import Link from "next/link";
import { notFound } from "next/navigation";
import { DeleteEntityButton } from "@/components/delete-entity-button";
import { isPersistentStore } from "@/lib/debates";
import { listProfiles } from "@/lib/social";

export const dynamic = "force-dynamic";

export default async function CircleProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [profiles, persistent] = await Promise.all([listProfiles(), isPersistentStore()]);
  const profile = profiles.find((item) => item.id === id);
  if (!profile) notFound();
  const profileLinks = [
    { icon: "📝", title: "Edit Descriptions", description: "Your self-presentation", section: "descriptions" },
    { icon: "🔍", title: "Edit Searches", description: "Your preferences", section: "searches" },
    { icon: "🏠", title: "Your main timeline", description: "Your global view", section: "timeline" },
    { icon: "⭕", title: "Your Circles", description: "Trusted spaces", section: "circles" },
    { icon: "👥", title: "Communities / Groups", description: "Shared interests", section: "communities" },
    { icon: "💬", title: "Your Forums", description: "Topics you follow or created", section: "forums" },
    { icon: "🔔", title: "Alerts", description: "Visits and replies", section: "alerts" },
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
    {profile.members?.length ? <section className="profile-members"><div className="account-section-heading"><div><p className="eyebrow">Meta-profile</p><h2>{profile.category === "Family" ? "Family Members" : "Members"}</h2></div><span>{profile.members.length}</span></div><div className="account-profile-list">{profile.members.map((memberId) => { const member = profiles.find((item) => item.id === memberId); return member ? <Link className="account-profile-row" href={`/circle/profiles/${encodeURIComponent(member.id)}`} key={member.id}><span className="social-avatar">{member.avatar}</span><span><strong>{member.name}</strong><small>{member.category}</small></span><span className="profile-member-role">{profile.memberRoles?.[member.id] ?? member.category}</span></Link> : null; })}</div></section> : null}
    <section className="profile-links-section"><div className="account-section-heading"><div><p className="eyebrow">Profile Links</p><h2>Choose a space</h2></div></div><nav className="profile-link-grid" aria-label={`${profile.name} sections`}>{profileLinks.map((item) => <Link className="account-choice profile-link-choice" href={item.section === "descriptions" ? `/circle/profiles/${encodeURIComponent(profile.id)}/descriptions` : `/circle/profiles/${encodeURIComponent(profile.id)}/${item.section}`} key={item.section}><span className="account-choice-icon" aria-hidden="true">{item.icon}</span><span><strong>{item.title}</strong><small>{item.description}</small></span><span className="account-choice-arrow" aria-hidden="true">→</span></Link>)}</nav></section>
    <DeleteEntityButton endpoint={`/api/social/profiles/${encodeURIComponent(profile.id)}`} label={`Delete ${profile.kind === "individual" ? "profile" : "meta-profile"}`} confirmation={`Permanently delete ${profile.name} and content owned by this profile? This cannot be undone.`} redirectTo={profile.kind === "individual" ? "/circle/profiles" : "/circle/meta-profiles"} />
  </main>;
}
