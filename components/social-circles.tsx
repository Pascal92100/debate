"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { DeleteEntityButton } from "@/components/delete-entity-button";
import type { SocialCircle } from "@/lib/social";

export function SocialCircles({ initialCircles, ownedCircleIds, persistent, initialOwnerProfileId, hideSectionTitle = false }: { initialCircles: SocialCircle[]; ownedCircleIds: string[]; persistent: boolean; initialOwnerProfileId?: string; hideSectionTitle?: boolean }) {
  const [circles, setCircles] = useState(initialCircles);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    setSaving(true);
    setError("");
    const response = await fetch("/api/social/circles", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: form.get("name"), kind: form.get("kind"), description: form.get("description"), visibility: form.get("visibility"), ownerProfileId: initialOwnerProfileId }) }).catch(() => null);
    const result = await response?.json().catch(() => null);
    if (!response?.ok) {
      setError(result?.error || "The circle could not be created.");
      setSaving(false);
      return;
    }
    setCircles((current) => [...current, result.circle]);
    formElement.reset();
    setOpen(false);
    setSaving(false);
  }

  return <>
    {!persistent && <p className="notice social-notice">New circles are temporary without DATABASE_URL.</p>}
    <div className={`social-section-heading${hideSectionTitle ? " circle-create-only" : ""}`}>{!hideSectionTitle && <div><p className="eyebrow">Shared spaces</p><h1>Your Circles</h1><p>Spaces for sharing posts by profile and relationship.</p></div>}<button className="button-primary" onClick={() => setOpen(!open)}>{open ? "Close" : "+ Create a circle"}</button></div>
    {open && <form className="social-compose-form circle-create-form" onSubmit={submit}><div className="social-form-row"><label>Circle name<input name="name" required minLength={2} maxLength={70} placeholder="e.g. Product team" /></label><label>Type<select name="kind"><option value="work">Work</option><option value="friends">Friends</option><option value="family">Family</option><option value="general">General</option></select></label></div><label>Description<textarea name="description" maxLength={300} placeholder="What is this circle for?" /></label><div className="social-form-row"><label>Visibility<select name="visibility"><option value="private">Private · members only</option><option value="public">Public</option></select></label><div className="circle-form-action"><button className="button-primary" disabled={saving}>{saving ? "Creating…" : "Create circle"}</button></div></div>{error && <p className="form-error" role="alert">{error}</p>}</form>}
    <div className="circle-directory">{circles.map((circle) => <article className="circle-directory-card" key={circle.id}><div className="circle-directory-top"><span className="circle-large-initial">{circle.name.slice(0, 1)}</span><span className="visibility-mark">{circle.visibility === "public" ? "Public" : "Private"}</span></div><p className="eyebrow">{circle.kind} · {circle.locationMode}</p><h2>{circle.name}</h2><p>{circle.description}</p><div className="circle-card-footer"><span>{circle.memberCount} members</span><Link href={`/social?circle=${encodeURIComponent(circle.id)}`}>View feed →</Link></div>{ownedCircleIds.includes(circle.ownerProfileId) && <DeleteEntityButton endpoint={`/api/social/circles/${encodeURIComponent(circle.id)}`} label="Delete Circle" confirmation={`Delete ${circle.name} and its Circle posts and debates? This cannot be undone.`} onDeleted={() => setCircles((current) => current.filter((item) => item.id !== circle.id))} />}</article>)}</div>
  </>;
}
