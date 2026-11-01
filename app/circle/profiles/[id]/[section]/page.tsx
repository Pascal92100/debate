import Link from "next/link";
import { notFound } from "next/navigation";
import { SocialCircles } from "@/components/social-circles";
import { ProfileModuleLists } from "@/components/profile-module-lists";
import { ProfileSpaces } from "@/components/profile-spaces";
import { ProfileAlerts } from "@/components/profile-alerts";
import { isPersistentStore, listDebates } from "@/lib/debates";
import { listCircles, listProfiles, listSocialPosts } from "@/lib/social";
import { listProfileAlerts, listProfileEvents, listProfileSearches } from "@/lib/profile-modules";
import { listIncomingMetaProfileInvitations } from "@/lib/meta-profile-invitations";
import { listProfileSpaces, type ProfileSpaceKind } from "@/lib/profile-spaces";

export const dynamic = "force-dynamic";

const profileSections: Record<string, { title: string; icon: string; description: string }> = {
  searches: { title: "Edit Searches", icon: "🔍", description: "Your preferences" },
  communities: { title: "Communities / Groups", icon: "👥", description: "Shared interests" },
  forums: { title: "Your Forums", icon: "💬", description: "Topics you follow or created" },
  alerts: { title: "Alerts", icon: "🔔", description: "Visits and replies" },
  "private-discussions": { title: "Private Discussions", icon: "📨", description: "1-to-1 exchanges" },
  events: { title: "Your Events", icon: "📅", description: "Upcoming and past" },
  following: { title: "Followed Profiles", icon: "⭐", description: "Your favorites" },
  shop: { title: "Shop", icon: "🛒", description: "Services and tools" }
};

export default async function ProfileSectionPage({ params }: { params: Promise<{ id: string; section: string }> }) {
  const { id, section } = await params;
  if (section === "searches" || section === "events") {
    const [profiles, persistent, searches, events] = await Promise.all([
      listProfiles(),
      isPersistentStore(),
      section === "searches" ? listProfileSearches(id) : Promise.resolve([]),
      section === "events" ? listProfileEvents(id) : Promise.resolve([])
    ]);
    const profile = profiles.find((item) => item.id === id);
    if (!profile) notFound();
    const title = section === "searches" ? "Edit Searches" : "Your Events";
    return <main className="social-shell social-directory-shell">
      <div className="social-page-heading"><div><p className="eyebrow">{profile.name} · Profile space</p><h1>{title}</h1></div><Link className="back-link" href={`/circle/profiles/${encodeURIComponent(id)}`}>← {profile.name}</Link></div>
      {!persistent && <p className="notice social-notice">Changes are temporary without DATABASE_URL.</p>}
      <ProfileModuleLists profile={profile} kind={section} initialSearches={searches} initialEvents={events} />
    </main>;
  }
  if (section === "communities" || section === "groups" || section === "forums") {
    const [profiles, spaces] = await Promise.all([listProfiles(), listProfileSpaces(id, section as ProfileSpaceKind)]);
    const profile = profiles.find((item) => item.id === id);
    if (!profile) notFound();
    const titles = { communities: "Communities", groups: "Groups", forums: "Your Forums" };
    return <main className="social-shell social-directory-shell">
      <div className="social-page-heading"><div><p className="eyebrow">{profile.name} · Profile space</p><h1>{titles[section]}</h1></div><Link className="back-link" href={`/circle/profiles/${encodeURIComponent(id)}`}>← {profile.name}</Link></div>
      <ProfileSpaces profile={profile} kind={section as ProfileSpaceKind} initialSpaces={spaces} />
    </main>;
  }
  if (section === "alerts") {
    const [profiles, alerts, invitations] = await Promise.all([listProfiles(), listProfileAlerts(id), listIncomingMetaProfileInvitations(id)]);
    const profile = profiles.find((item) => item.id === id);
    if (!profile) notFound();
    return <main className="social-shell social-directory-shell">
      <div className="social-page-heading"><div><p className="eyebrow">{profile.name} · Profile space</p><h1>Alerts</h1></div><Link className="back-link" href={`/circle/profiles/${encodeURIComponent(id)}`}>← {profile.name}</Link></div>
      <ProfileAlerts initialAlerts={alerts} initialInvitations={invitations} profiles={profiles} />
    </main>;
  }
  const [profiles, debates, posts, circles, persistent] = await Promise.all([
    listProfiles(),
    listDebates(),
    listSocialPosts(),
    listCircles(),
    isPersistentStore()
  ]);
  const profile = profiles.find((item) => item.id === id);
  if (!profile) notFound();
  const basePath = `/circle/profiles/${encodeURIComponent(profile.id)}`;
  const backLink = <Link className="back-link" href={basePath}>← {profile.name}</Link>;

  if (section === "timeline") {
    const profilePosts = posts.filter((post) => post.profileId === profile.id);
    return <main className="social-shell social-directory-shell">
      <div className="social-page-heading"><div><p className="eyebrow">{profile.name} · Profile space</p><h1>Your main timeline</h1></div>{backLink}</div>
      <div className="profile-section-toolbar"><p>Your global view for this profile.</p><Link className="button-primary" href={`/social?profileId=${encodeURIComponent(profile.id)}`}>+ New post</Link></div>
      {!persistent && <p className="notice social-notice">Posts are temporary without DATABASE_URL.</p>}
      {profilePosts.length ? <div className="profile-post-list">{profilePosts.map((post) => <article className="profile-activity-item" key={post.id}><div className="profile-post-meta">{post.circleName || "Public feed"} · {new Date(post.createdAt).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}</div><strong>{post.title}</strong><p>{post.body}</p>{post.debateId && <Link href={`/debates/${encodeURIComponent(post.debateId)}`}>Open linked debate →</Link>}</article>)}</div> : <p className="account-empty">No posts for this profile yet.</p>}
      {backLink}
    </main>;
  }

  if (section === "discussions") {
    const profileDebates = debates.filter((debate) => debate.authorProfileId === profile.id);
    return <main className="social-shell social-directory-shell">
      <div className="social-page-heading"><div><p className="eyebrow">{profile.name} · Profile space</p><h1>Your debates and discussions</h1></div>{backLink}</div>
      <div className="profile-section-toolbar"><p>Debates or simple discussions started by this profile.</p><Link className="button-primary" href={`/debates/new?profileId=${encodeURIComponent(profile.id)}`}>+ Start a debate</Link></div>
      {!persistent && <p className="notice social-notice">Debates are temporary without DATABASE_URL.</p>}
      {profileDebates.length ? <div className="profile-post-list">{profileDebates.map((debate) => <Link className="profile-activity-item profile-debate-item" key={debate.id} href={`/debates/${encodeURIComponent(debate.id)}`}><strong>{debate.title}</strong><small>{debate.content[0]}</small></Link>)}</div> : <p className="account-empty">No discussions started from this profile yet.</p>}
      {backLink}
    </main>;
  }

  if (section === "circles") {
    const profileCircles = circles.filter((circle) => circle.ownerProfileId === profile.id);
    return <main className="social-shell social-directory-shell">
      <div className="social-page-heading"><div><p className="eyebrow">{profile.name} · Profile space</p><h1>Your Circles</h1></div>{backLink}</div>
      <SocialCircles initialCircles={profileCircles} ownedCircleIds={[profile.id]} persistent={persistent} initialOwnerProfileId={profile.id} hideSectionTitle />
    </main>;
  }

  const item = profileSections[section];
  if (!item) notFound();
  return <main className="social-shell social-directory-shell">
    <div className="social-page-heading"><div><p className="eyebrow">{profile.name} · Profile space</p><h1>{item.title}</h1></div>{backLink}</div>
    <section className="account-placeholder"><span>{item.icon}</span><p className="eyebrow">Profile section</p><h2>{item.description}</h2><p>This section has its own profile page. Its content and creation tools are not connected yet.</p></section>
  </main>;
}