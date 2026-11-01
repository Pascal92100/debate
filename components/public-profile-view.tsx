import Link from "next/link";
import { MediaGallery } from "@/components/media-gallery";
import type { PublicProfileView as PublicProfileData, VisibleDescription } from "@/lib/public-profile";

function DescriptionView({ description }: { description: VisibleDescription | null }) {
  if (!description) return null;
  return <section className="public-profile-section">
    <div className="account-section-heading"><div><p className="eyebrow">Public description</p><h2>About</h2></div></div>
    {description.text && <p className="public-profile-description">{description.text}</p>}
    {description.identity.length > 0 && <dl className="public-profile-identity">{description.identity.map((field) => <div key={field.label}><dt>{field.label}</dt><dd>{field.value}</dd></div>)}</dl>}
    {description.themes.map((theme) => <article className="public-description-theme" key={theme.label}><h3>{theme.label}</h3>{theme.description && <p>{theme.description}</p>}{theme.fields.length > 0 && <ul>{theme.fields.map((field) => <li key={field}>{field}</li>)}</ul>}{theme.tags.length > 0 && <p className="public-profile-tags">{theme.tags.join(" · ")}</p>}</article>)}
  </section>;
}

export function PublicProfileView({ view, returnTo = "/social", currentUrl, viewerProfileId, isMemberOfMetaProfile = false }: { view: PublicProfileData; returnTo?: string; currentUrl: string; viewerProfileId?: string; isMemberOfMetaProfile?: boolean }) {
  const { profile } = view;
  const memberHref = (profileId: string) => {
    const params = new URLSearchParams({ view: "public", returnTo: currentUrl });
    if (viewerProfileId) params.set("from", viewerProfileId);
    return `/circle/profiles/${encodeURIComponent(profileId)}?${params.toString()}`;
  };
  return <main className="social-shell social-directory-shell public-profile-page">
    <div className="social-page-heading"><div><p className="eyebrow">{isMemberOfMetaProfile ? "Circles · member view" : "Circles · visitor view"}</p><h1>{profile.name}</h1></div><Link className="back-link" href={returnTo}>← Back</Link></div>
    <section className="profile-detail-header"><span className="social-avatar social-avatar-large">{profile.avatar}</span><div><h2>{profile.name}</h2><p>{profile.kind === "individual" ? `${profile.category} · Individual profile` : `${profile.category} · Meta-profile`}</p>{profile.bio && <p>{profile.bio}</p>}{profile.relationship && <p>{profile.relationship}</p>}</div></section>
    <DescriptionView description={view.description} />

    {profile.kind === "meta" && view.members.length > 0 && <section className="public-profile-section"><div className="account-section-heading"><div><p className="eyebrow">Shared identity</p><h2>{isMemberOfMetaProfile ? "Your membership" : "Public members"}</h2></div>{!isMemberOfMetaProfile && <span>{view.members.length}</span>}</div><div className="public-member-list">{view.members.map(({ profile: member, description }) => <article className={`public-member-item${member.id === viewerProfileId ? " is-viewer-member" : ""}`} key={member.id}><header><Link href={memberHref(member.id)}><span className="social-avatar">{member.avatar}</span><span><strong>{member.name}</strong><small>{member.id === viewerProfileId ? "Your profile here" : member.category}</small></span></Link>{member.bio && <p>{member.bio}</p>}</header><DescriptionView description={description} /></article>)}</div></section>}

    {profile.kind === "individual" && view.relatedMetaProfiles.length > 0 && <section className="public-profile-section"><div className="account-section-heading"><div><p className="eyebrow">Shared identities</p><h2>Public meta-profiles</h2></div><span>{view.relatedMetaProfiles.length}</span></div><div className="account-profile-list">{view.relatedMetaProfiles.map((meta) => <Link className="account-profile-row" href={memberHref(meta.id)} key={meta.id}><span className="social-avatar">{meta.avatar}</span><span><strong>{meta.name}</strong><small>{meta.category} · Meta-profile</small></span><span className="account-profile-row-arrow">→</span></Link>)}</div></section>}

    {view.posts.length > 0 && <section className="public-profile-section"><div className="account-section-heading"><div><p className="eyebrow">Public activity</p><h2>Publications</h2></div><span>{view.posts.length}</span></div><div className="public-profile-items">{view.posts.map((post) => <article className="profile-activity-item public-content-item" key={post.id}><div className="profile-post-meta">{post.circleName || "Public feed"} · {new Date(post.createdAt).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}</div><strong>{post.title}</strong>{post.body && <p>{post.body}</p>}<MediaGallery media={post.media} compact /></article>)}</div></section>}

    {view.debates.length > 0 && <section className="public-profile-section"><div className="account-section-heading"><div><p className="eyebrow">Public activity</p><h2>Debates</h2></div><span>{view.debates.length}</span></div><div className="public-profile-items">{view.debates.map((debate) => <article className="profile-activity-item public-content-item" key={debate.id}><strong>{debate.title}</strong>{debate.from && <small>{debate.from}</small>}{debate.content.map((paragraph, index) => <p key={`${debate.id}-${index}`}>{paragraph}</p>)}<MediaGallery media={debate.media} compact /></article>)}</div></section>}

    {view.discussions.length > 0 && <section className="public-profile-section"><div className="account-section-heading"><div><p className="eyebrow">Public Circle activity</p><h2>Discussions</h2></div><span>{view.discussions.length}</span></div><div className="public-profile-items">{view.discussions.map((discussion) => <article className="profile-activity-item public-content-item" key={discussion.id}><strong>{discussion.title}</strong>{discussion.messages.map((message) => <div className="public-discussion-message" key={message.id}><small>{message.author}</small>{message.body && <p>{message.body}</p>}<MediaGallery media={message.media} compact /></div>)}</article>)}</div></section>}

    {view.events.length > 0 && <section className="public-profile-section"><div className="account-section-heading"><div><p className="eyebrow">Public activity</p><h2>Events</h2></div><span>{view.events.length}</span></div><div className="profile-post-list">{view.events.map((event) => <article className="profile-activity-item" key={event.id}><div className="profile-post-meta">{event.startsAt ? new Date(event.startsAt).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" }) : "Date to be announced"}{event.location && ` · ${event.location}`}</div><strong>{event.title}</strong>{event.description && <p>{event.description}</p>}</article>)}</div></section>}

    {view.circles.length > 0 && <section className="public-profile-section"><div className="account-section-heading"><div><p className="eyebrow">Connected spaces</p><h2>Public Circles</h2></div><span>{view.circles.length}</span></div><div className="profile-post-list">{view.circles.map((circle) => <article className="profile-activity-item" key={circle.id}><strong>{circle.name}</strong><p>{circle.description}</p><small>{circle.kind} · {circle.locationMode}</small></article>)}</div></section>}

    {view.forums.length > 0 && <section className="public-profile-section"><div className="account-section-heading"><div><p className="eyebrow">Connected spaces</p><h2>Forums</h2></div><span>{view.forums.length}</span></div><div className="profile-post-list">{view.forums.map((forum) => <article className="profile-activity-item" key={forum.id}><strong>{forum.name}</strong>{forum.description && <p>{forum.description}</p>}</article>)}</div></section>}

    {!view.description && !view.posts.length && !view.debates.length && !view.discussions.length && !view.events.length && !view.circles.length && !view.forums.length && !view.members.length && <p className="account-empty">This profile has not shared public details yet.</p>}
  </main>;
}