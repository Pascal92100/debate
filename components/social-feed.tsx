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
      setError(result?.error || "La publication n’a pas pu être enregistrée.");
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
      setNotice(result?.error || "Le débat n’a pas pu être créé.");
      return;
    }
    router.push(`/debates/${encodeURIComponent(result.debateId)}`);
  }

  const filteredPosts = posts.filter((post) => (!selectedCircle || post.circleId === selectedCircle) && (!initialProfileId || post.profileId === initialProfileId));

  return <div className="social-layout">
    <aside className="social-sidebar">
      <div className="social-current-profile"><span className="social-avatar">{profiles.find((profile) => profile.id === profileId)?.avatar ?? "JD"}</span><div><strong>{profiles.find((profile) => profile.id === profileId)?.name ?? "John Doe"}</strong><small>Profil actif</small></div></div>
      <div className="social-side-heading">Vos cercles</div>
      <button className={`social-filter${selectedCircle === "" ? " active" : ""}`} onClick={() => setSelectedCircle("")}>Tous les cercles</button>
      {circles.map((circle) => <button key={circle.id} className={`social-filter${selectedCircle === circle.id ? " active" : ""}`} onClick={() => setSelectedCircle(circle.id)}><span className="circle-initial">{circle.name.slice(0, 1)}</span>{circle.name}</button>)}
      <Link className="sidebar-link" href="/social/circles">Gérer les cercles →</Link>
    </aside>

    <main className="social-main">
      <section className="social-composer">
        <div className="social-composer-heading"><div><p className="eyebrow">Votre réseau</p><h1>Le fil des cercles</h1></div><div className="feed-view-switch" role="group" aria-label="Disposition du fil"><button className={!wall ? "active" : ""} onClick={() => setWall(false)}>Feed</button><button className={wall ? "active" : ""} onClick={() => setWall(true)}>Wall</button></div></div>
        <div className="social-post-mode" role="group" aria-label="Type de publication">
          <button type="button" className={postKind === "publication" ? "active" : ""} onClick={() => setPostKind("publication")}>Publication</button>
          <button type="button" className={postKind === "debate" ? "active" : ""} onClick={() => setPostKind("debate")}>⚖️ Lancer un débat</button>
        </div>
        <form className="social-compose-form" onSubmit={submit}>
          {postKind === "debate" && <div className="social-form-row"><label>Titre du débat<input name="title" required minLength={4} maxLength={140} placeholder="La question à discuter" /></label><label>Thème<select name="theme"><option value="lifestyle-ideas">Idées / société</option><option value="politics-society">Politique / société</option><option value="culture-entertainment">Culture</option><option value="science-health">Science / santé</option><option value="economy-tech">Économie / travail / tech</option><option value="sports">Sport</option></select></label></div>}
          <label className="social-body-label" htmlFor="social-body">{postKind === "debate" ? "Introduction" : "Quoi de neuf ?"}</label>
          <textarea id="social-body" name="body" required minLength={2} maxLength={5000} placeholder={postKind === "debate" ? "Pose le contexte et ton premier argument. Chaque ligne deviendra un argument distinct." : "Partage une idée, un lien ou une nouvelle avec ton cercle…"} />
          <div className="social-compose-footer"><div className="social-compose-selects"><label>Profil auteur<select value={profileId} onChange={(event) => setProfileId(event.target.value)}>{profiles.map((profile) => <option value={profile.id} key={profile.id}>{profile.name} · {profile.category}</option>)}</select></label><label>Publier dans<select name="circleId"><option value="">Fil public</option>{circles.map((circle) => <option value={circle.id} key={circle.id}>{circle.name}</option>)}</select></label></div><button className="button-primary" type="submit" disabled={busy}>{busy ? "Publication…" : postKind === "debate" ? "Publier et ouvrir le débat" : "Publier"}</button></div>
          {error && <p className="form-error" role="alert">{error}</p>}
        </form>
      </section>

      {!persistent && <p className="notice social-notice">Mode démonstration : les publications et réactions sont temporaires. Configurez DATABASE_URL pour les conserver.</p>}
      {notice && <p className="form-error" role="status">{notice}</p>}
      <div className={wall ? "social-post-grid" : "social-post-list"}>
        {filteredPosts.map((post) => <article className="social-post" id={post.id} key={post.id}>
          <header className="social-post-header"><span className="social-avatar">{post.avatar}</span><div className="social-post-author"><strong>{post.author}</strong><span>{post.circleName || "Fil public"} · {new Date(post.createdAt).toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" })}</span></div><span className={`post-kind-label ${post.kind}`}>{post.kind === "debate" ? "Débat" : post.kind === "event" ? "Événement" : "Publication"}</span></header>
          <div className="social-post-copy"><h2>{post.title}</h2><p>{post.body}</p></div>
          <div className="social-post-subtext">{post.subtext}</div>
          <footer className="social-post-actions"><div className="social-reactions" aria-label="Réactions">{reactions.map((reaction) => <button key={reaction} title={`Réagir ${reaction}`} onClick={() => react(post.id, reaction)}>{reaction}{post.reactions?.[reaction] ? <small>{post.reactions[reaction]}</small> : null}</button>)}</div><span>{post.commentsCount} réponse{post.commentsCount === 1 ? "" : "s"}</span></footer>
          {post.debateId ? <Link className="linked-debate" href={`/debates/${encodeURIComponent(post.debateId)}`}>Ouvrir le débat lié ↗</Link> : <button className="text-action" type="button" onClick={() => startDebate(post)}>⚖️ Transformer cette publication en débat</button>}
        </article>)}
        {filteredPosts.length === 0 && <div className="empty-state">Aucune publication dans ce cercle pour le moment.</div>}
      </div>
    </main>

    <aside className="social-right-rail"><div className="social-rail-heading">Espaces</div>{circles.map((circle) => <Link href={`/social?circle=${encodeURIComponent(circle.id)}`} className="social-circle-card" key={circle.id}><span className="circle-initial">{circle.name.slice(0, 1)}</span><span><strong>{circle.name}</strong><small>{circle.memberCount} membres · {circle.locationMode}</small></span></Link>)}<Link className="sidebar-link" href="/social/profiles">Découvrir les profils →</Link><p className="prototype-note">Le prototype propose aussi les vues Wall, descriptions thématiques et préférences de recherche. Ces écrans seront raccordés ensuite.</p></aside>
  </div>;
}
