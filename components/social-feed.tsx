"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import type { SocialCircle, SocialPost, SocialProfile } from "@/lib/social";

const reactions = ["👍", "👎", "⚠️", "🔑", "💡", "🎓", "❌", "❓", "☀️"];

export function SocialFeed({ initialPosts, circles, profiles, persistent, initialCircleId = "", initialProfileId = "" }: { initialPosts: SocialPost[]; circles: SocialCircle[]; profiles: SocialProfile[]; persistent: boolean; initialCircleId?: string; initialProfileId?: string }) {
  const [posts, setPosts] = useState(initialPosts);
  const [selectedCircle, setSelectedCircle] = useState(initialCircleId);
  const [postKind, setPostKind] = useState<"publication" | "debate">("publication");
  const [profileId, setProfileId] = useState(initialProfileId || profiles[0]?.id || "");
  const [wall, setWall] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const router = useRouter();

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    setBusy(true);
    setError("");
    const response = await fetch("/api/social/posts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: form.get("title"),
        body: form.get("body"),
        circleId: form.get("circleId") || null,
        profileId,
        theme: form.get("theme"),
        startDebate: postKind === "debate"
      })
    }).catch(() => null);
    const result = await response?.json().catch(() => null);
    if (!response?.ok) {
      setError(result?.error || "The post could not be saved.");
      setBusy(false);
      return;
    }
    setPosts((current) => [result.post as SocialPost, ...current]);
    formElement.reset();
    setBusy(false);
    setPostKind("publication");
    if (result.debate?.id) router.push(`/debates/${encodeURIComponent(result.debate.id)}`);
  }

  async function react(postId: string, reaction: string) {
    const response = await fetch(`/api/social/posts/${encodeURIComponent(postId)}/reactions`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reaction })
    }).catch(() => null);
    const result = await response?.json().catch(() => null);
    if (response?.ok) setPosts((current) => current.map((post) => post.id === postId ? { ...post, reactions: result.reactions } : post));
  }

  async function startDebate(post: SocialPost) {
    setNotice("");
    const response = await fetch(`/api/social/posts/${encodeURIComponent(post.id)}/debate`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ theme: "lifestyle-ideas" })
    }).catch(() => null);
    const result = await response?.json().catch(() => null);
    if (!response?.ok) {
      setNotice(result?.error || "The debate could not be created.");
      return;
    }
    router.push(`/debates/${encodeURIComponent(result.debateId)}`);
  }

  const filteredPosts = posts.filter((post) => (!selectedCircle || post.circleId === selectedCircle) && (!initialProfileId || post.profileId === initialProfileId));

  return <div className="social-layout">
    <aside className="social-sidebar">
      <div className="social-current-profile"><span className="social-avatar">{profiles.find((profile) => profile.id === profileId)?.avatar ?? "JD"}</span><div><strong>{profiles.find((profile) => profile.id === profileId)?.name ?? "John Doe"}</strong><small>Active profile</small></div></div>
      <div className="social-side-heading">Your Circles</div>
      <button className={`social-filter${selectedCircle === "" ? " active" : ""}`} onClick={() => setSelectedCircle("")}>All Circles</button>
      {circles.map((circle) => <button key={circle.id} className={`social-filter${selectedCircle === circle.id ? " active" : ""}`} onClick={() => setSelectedCircle(circle.id)}><span className="circle-initial">{circle.name.slice(0, 1)}</span>{circle.name}</button>)}
      <Link className="sidebar-link" href="/social/circles">Manage Circles →</Link>
    </aside>

    <main className="social-main">
      <section className="social-composer">
        <div className="social-composer-heading"><div><p className="eyebrow">Your network</p><h1>Circle feed</h1></div><div className="feed-view-switch" role="group" aria-label="Feed layout"><button className={!wall ? "active" : ""} onClick={() => setWall(false)}>Feed</button><button className={wall ? "active" : ""} onClick={() => setWall(true)}>Wall</button></div></div>
        <div className="social-post-mode" role="group" aria-label="Post type">
          <button type="button" className={postKind === "publication" ? "active" : ""} onClick={() => setPostKind("publication")}>Post</button>
          <button type="button" className={postKind === "debate" ? "active" : ""} onClick={() => setPostKind("debate")}>⚖️ Start a debate</button>
        </div>
        <form className="social-compose-form" onSubmit={submit}>
          {postKind === "debate" && <div className="social-form-row"><label>Debate title<input name="title" required minLength={4} maxLength={140} placeholder="The question to discuss" /></label><label>Theme<select name="theme"><option value="lifestyle-ideas">Ideas / society</option><option value="politics-society">Politics / society</option><option value="culture-entertainment">Culture</option><option value="science-health">Science / health</option><option value="economy-tech">Economy / work / tech</option><option value="sports">Sports</option></select></label></div>}
          <label className="social-body-label" htmlFor="social-body">{postKind === "debate" ? "Introduction" : "What's new?"}</label>
          <textarea id="social-body" name="body" required minLength={2} maxLength={5000} placeholder={postKind === "debate" ? "Set the context and make your first argument. Each line will become a separate argument." : "Share an idea, link, or update with your Circle…"} />
          <div className="social-compose-footer"><div className="social-compose-selects"><label>Author profile<select value={profileId} onChange={(event) => setProfileId(event.target.value)}>{profiles.map((profile) => <option value={profile.id} key={profile.id}>{profile.name} · {profile.category}</option>)}</select></label><label>Post to<select name="circleId"><option value="">Public feed</option>{circles.map((circle) => <option value={circle.id} key={circle.id}>{circle.name}</option>)}</select></label></div><button className="button-primary" type="submit" disabled={busy}>{busy ? "Posting…" : postKind === "debate" ? "Post and open debate" : "Post"}</button></div>
          {error && <p className="form-error" role="alert">{error}</p>}
        </form>
      </section>

      {!persistent && <p className="notice social-notice">Demo mode: posts and reactions are temporary. Set DATABASE_URL to keep them.</p>}
      {notice && <p className="form-error" role="status">{notice}</p>}
      <div className={wall ? "social-post-grid" : "social-post-list"}>
        {filteredPosts.map((post) => <article className="social-post" id={post.id} key={post.id}>
          <header className="social-post-header"><span className="social-avatar">{post.avatar}</span><div className="social-post-author"><strong>{post.author}</strong><span>{post.circleName || "Public feed"} · {new Date(post.createdAt).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}</span></div><span className={`post-kind-label ${post.kind}`}>{post.kind === "debate" ? "Debate" : post.kind === "event" ? "Event" : "Post"}</span></header>
          <div className="social-post-copy"><h2>{post.title}</h2><p>{post.body}</p></div>
          <div className="social-post-subtext">{post.subtext}</div>
          <footer className="social-post-actions"><div className="social-reactions" aria-label="Reactions">{reactions.map((reaction) => <button key={reaction} title={`React ${reaction}`} onClick={() => react(post.id, reaction)}>{reaction}{post.reactions?.[reaction] ? <small>{post.reactions[reaction]}</small> : null}</button>)}</div><span>{post.commentsCount} repl{post.commentsCount === 1 ? "y" : "ies"}</span></footer>
          {post.debateId ? <Link className="linked-debate" href={`/debates/${encodeURIComponent(post.debateId)}`}>Open linked debate ↗</Link> : <button className="text-action" type="button" onClick={() => startDebate(post)}>⚖️ Turn this post into a debate</button>}
        </article>)}
        {filteredPosts.length === 0 && <div className="empty-state">No posts in this Circle yet.</div>}
      </div>
    </main>

    <aside className="social-right-rail"><div className="social-rail-heading">Spaces</div>{circles.map((circle) => <Link href={`/social?circle=${encodeURIComponent(circle.id)}`} className="social-circle-card" key={circle.id}><span className="circle-initial">{circle.name.slice(0, 1)}</span><span><strong>{circle.name}</strong><small>{circle.memberCount} members · {circle.locationMode}</small></span></Link>)}<Link className="sidebar-link" href="/social/profiles">Discover profiles →</Link><p className="prototype-note">The prototype also includes Wall views, themed descriptions, and search preferences.</p></aside>
  </div>;
}
