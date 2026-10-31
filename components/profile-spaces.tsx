"use client";

import { FormEvent, useState } from "react";
import { DeleteEntityButton } from "@/components/delete-entity-button";
import type { ProfileSpace, ProfileSpaceKind } from "@/lib/profile-spaces";
import type { SocialProfile } from "@/lib/social";

const labels: Record<ProfileSpaceKind, { singular: string; description: string }> = {
  communities: { singular: "community", description: "A community can bring related groups and profiles together." },
  groups: { singular: "group", description: "A group is a shared space where members can see one another." },
  forums: { singular: "forum", description: "A thematic forum collects posts and conversations around a topic." }
};

export function ProfileSpaces({ profile, kind, initialSpaces }: { profile: SocialProfile; kind: ProfileSpaceKind; initialSpaces: ProfileSpace[] }) {
  const [spaces, setSpaces] = useState(initialSpaces);
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const label = labels[kind];

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setBusy(true);
    setError("");
    const response = await fetch("/api/profile-spaces", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ profileId: profile.id, kind, name: data.get("name"), description: data.get("description") }) }).catch(() => null);
    const result = await response?.json().catch(() => null);
    if (!response?.ok) {
      setError(result?.error || `The ${label.singular} could not be created.`);
      setBusy(false);
      return;
    }
    setSpaces((current) => [result.space as ProfileSpace, ...current]);
    form.reset();
    setCreating(false);
    setBusy(false);
  }

  return <>
    <div className="profile-section-toolbar"><p>{label.description}</p><button className="button-primary" type="button" onClick={() => setCreating((current) => !current)}>{creating ? "Cancel" : `+ Create ${label.singular}`}</button></div>
    {creating && <form className="social-compose-form profile-module-form" onSubmit={submit}><label>{kind === "forums" ? "Forum name" : `${label.singular[0].toUpperCase()}${label.singular.slice(1)} name`}<input name="name" required minLength={2} placeholder={kind === "forums" ? "e.g. Local history" : `Name your ${label.singular}`} /></label><label>Description<textarea name="description" placeholder="What is this space for?" /></label>{error && <p className="form-error" role="alert">{error}</p>}<button className="button-primary" disabled={busy}>{busy ? "Creating…" : `Create ${label.singular}`}</button></form>}
    {spaces.length ? <div className="profile-post-list">{spaces.map((space) => <article className="profile-activity-item" key={space.id}><div className="profile-post-meta">Created {new Date(space.createdAt).toLocaleDateString("en-US")}</div><strong>{space.name}</strong><p>{space.description || label.description}</p><DeleteEntityButton endpoint={`/api/profile-spaces?id=${encodeURIComponent(space.id)}`} label={`Delete ${label.singular}`} confirmation={`Delete “${space.name}”? This cannot be undone.`} onDeleted={() => setSpaces((current) => current.filter((item) => item.id !== space.id))} /></article>)}</div> : <p className="account-empty">No {kind} for this profile yet.</p>}
  </>;
}