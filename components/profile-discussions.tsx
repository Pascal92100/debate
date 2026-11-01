"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { DeleteEntityButton } from "@/components/delete-entity-button";
import type { Debate } from "@/lib/debates";
import type { SimpleDiscussion } from "@/lib/discussions";
import type { SocialCircle, SocialProfile } from "@/lib/social";

export function ProfileDiscussions({ profile, initialDiscussions, debates, circles, persistent }: { profile: SocialProfile; initialDiscussions: SimpleDiscussion[]; debates: Debate[]; circles: SocialCircle[]; persistent: boolean }) {
  const [discussions, setDiscussions] = useState(initialDiscussions);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setSaving(true);
    setError("");
    const response = await fetch("/api/discussions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ profileId: profile.id, title: form.get("title"), body: form.get("body"), circleId: form.get("circleId") || null })
    }).catch(() => null);
    const result = await response?.json().catch(() => null);
    if (!response?.ok) {
      setError(result?.error || "The discussion could not be created.");
      setSaving(false);
      return;
    }
    const discussion = result.discussion as SimpleDiscussion;
    setDiscussions((current) => [discussion, ...current]);
    router.push(`/circle/profiles/${encodeURIComponent(profile.id)}/discussions/${encodeURIComponent(discussion.id)}`);
    router.refresh();
  }

  return <>
    {!persistent && <p className="notice social-notice">Debates and discussions are temporary without DATABASE_URL.</p>}
    <p className="discussion-kind-note">Debates keep their structured arguments. Simple discussions are chronological messages with quoted replies.</p>
    <section className="discussion-list-section">
      <div className="account-section-heading"><div><p className="eyebrow">Simple conversations</p><h2>Discussions <span className="section-count">{discussions.length}</span></h2></div><button className="section-add-button" type="button" aria-label={creating ? "Cancel new discussion" : "New discussion"} title={creating ? "Cancel" : "New discussion"} onClick={() => setCreating((current) => !current)}>{creating ? "×" : "+"}</button></div>
      {creating && <form className="social-compose-form discussion-create-form" onSubmit={submit}>
      <label>Discussion title<input name="title" required minLength={2} maxLength={140} placeholder="What would you like to talk about?" /></label>
      <label>Share with Circle<select name="circleId"><option value="">Only this profile</option>{circles.map((circle) => <option value={circle.id} key={circle.id}>{circle.name}</option>)}</select></label>
      <label>First message<textarea name="body" required minLength={1} maxLength={5000} placeholder="Write the opening message…" /></label>
      {error && <p className="form-error" role="alert">{error}</p>}
      <button className="button-primary" type="submit" disabled={saving}>{saving ? "Creating…" : "Start discussion"}</button>
      </form>}
      {discussions.length ? <div className="profile-post-list">{discussions.map((discussion) => {
        const latest = discussion.messages.at(-1);
        return <article className="profile-activity-item profile-discussion-list-item" key={discussion.id}>
          <Link className="profile-debate-item" href={`/circle/profiles/${encodeURIComponent(profile.id)}/discussions/${encodeURIComponent(discussion.id)}`}>
            <div className="profile-post-meta">{latest ? new Date(latest.createdAt).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" }) : "No messages"} · {discussion.messages.length} {discussion.messages.length === 1 ? "message" : "messages"}</div>
            <strong>{discussion.title}</strong><small>{latest ? `${latest.author}: ${latest.body}` : "Open discussion"}</small>
          </Link>
          {discussion.profileId === profile.id && <DeleteEntityButton endpoint={`/api/discussions/${encodeURIComponent(discussion.id)}`} label="Delete discussion" confirmation={`Delete “${discussion.title}” and its messages? This cannot be undone.`} iconOnly />}
        </article>;
      })}</div> : <p className="account-empty">No simple discussions started by this profile yet.</p>}
    </section>

    <section className="discussion-list-section">
      <div className="account-section-heading"><div><p className="eyebrow">Structured conversations</p><h2>Debates <span className="section-count">{debates.length}</span></h2></div><Link className="section-add-button" aria-label="New debate" title="New debate" href={`/debates/new?profileId=${encodeURIComponent(profile.id)}`}>+</Link></div>
      {debates.length ? <div className="profile-post-list">{debates.map((debate) => <article className="profile-activity-item profile-debate-list-item" key={debate.id}><Link className="profile-debate-item" href={`/debates/${encodeURIComponent(debate.id)}`}><div className="profile-post-meta">Debate · {new Date(debate.timestamp ?? Date.now()).toLocaleDateString("en-US")}</div><strong>{debate.title}</strong><small>{debate.content[0]}</small></Link><DeleteEntityButton endpoint={`/api/debates/${encodeURIComponent(debate.id)}`} label="Delete debate" confirmation={`Delete “${debate.title}” and its replies? This cannot be undone.`} iconOnly /></article>)}</div> : <p className="account-empty">No debates started from this profile yet.</p>}
    </section>
  </>;
}