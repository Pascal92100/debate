"use client";

import { FormEvent, useState } from "react";
import type { SocialProfile } from "@/lib/social";

export function SocialProfiles({ initialProfiles, persistent, kind }: { initialProfiles: SocialProfile[]; persistent: boolean; kind?: "individual" | "meta" }) {
  const [profiles, setProfiles] = useState(initialProfiles);
  const [open, setOpen] = useState(false);
  const [newProfileKind, setNewProfileKind] = useState<"individual" | "meta">(kind ?? "individual");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const visibleProfiles = kind ? profiles.filter((profile) => kind === "individual" ? profile.kind === "individual" : profile.kind !== "individual") : profiles;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    setSaving(true);
    setError("");
    const response = await fetch("/api/social/profiles", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: form.get("name"), kind: form.get("kind"), category: form.get("category"), bio: form.get("bio"), visibility: form.get("visibility"), socialDistance: form.get("socialDistance"), anonymous: form.get("anonymous") === "on", members: form.getAll("members") }) }).catch(() => null);
    const result = await response?.json().catch(() => null);
    if (!response?.ok) {
      setError(result?.error || "The profile could not be created.");
      setSaving(false);
      return;
    }
    setProfiles((current) => [...current, result.profile]);
    formElement.reset();
    setSaving(false);
    setOpen(false);
  }

  return <>
    {!persistent && <p className="notice social-notice">New profiles are temporary without DATABASE_URL.</p>}
    <div className="social-section-heading"><div><p className="eyebrow">Identities and contexts</p><h1>{kind === "meta" ? "Your Meta-Profiles" : kind === "individual" ? "Your Individual Profiles" : "Your Profiles"}</h1><p>An account can have separate individual and meta-profiles.</p></div><button className="button-primary" onClick={() => setOpen(!open)}>{open ? "Close" : kind === "meta" ? "+ Create a meta-profile" : "+ Create a profile"}</button></div>
    {open && <form className="social-compose-form profile-create-form" onSubmit={submit}><div className="social-form-row"><label>Profile name<input name="name" required minLength={2} maxLength={70} placeholder="Name or pseudonym" /></label><label>Type<select name="kind" value={newProfileKind} onChange={(event) => setNewProfileKind(event.target.value as "individual" | "meta")}><option value="individual">Individual</option><option value="meta">Meta-profile · couple, family, group</option></select></label></div>{newProfileKind === "meta" && <label>Members<select name="members" multiple size={Math.min(5, profiles.filter((profile) => profile.kind === "individual").length)}>{profiles.filter((profile) => profile.kind === "individual").map((profile) => <option value={profile.id} key={profile.id}>{profile.name} · {profile.category}</option>)}</select><small>Select the individual profiles that make up this meta-profile.</small></label>}<div className="social-form-row"><label>Context<input name="category" maxLength={50} placeholder="Professional, personal…" /></label><label>Visibility<select name="visibility"><option value="all">Visible to everyone</option><option value="relatives">Connections only</option><option value="ghost">Hidden from search</option></select></label></div><label>Introduction<textarea name="bio" maxLength={500} placeholder="How should this profile be presented?" /></label><div className="social-form-row"><label>Social distance<input name="socialDistance" type="number" min="0" max="10" defaultValue="0" /></label><label className="social-check-field"><input name="anonymous" type="checkbox" /> Anonymous browsing</label></div><div className="circle-form-action"><button className="button-primary" disabled={saving}>{saving ? "Creating…" : "Create profile"}</button></div>{error && <p className="form-error" role="alert">{error}</p>}</form>}
  <section className="social-profile-directory">{visibleProfiles.map((profile) => <article className="social-profile-card" key={profile.id}><span className="social-avatar social-avatar-large">{profile.avatar}</span><div><h2>{profile.name}</h2><p>{profile.kind === "individual" ? "Individual profile" : `${profile.category} (Meta-profile)`}</p><p>{profile.relationship ? profile.relationship : profile.includesLabel ? `Includes: ${profile.includesLabel}` : profile.members?.length ? `Includes: ${profile.members.map((id) => profiles.find((member) => member.id === id)?.name).filter(Boolean).join(", ")}` : profile.bio}</p><div className="profile-card-actions"><a href={`/circle/profiles/${encodeURIComponent(profile.id)}`}>View profile</a><a href={`/circle/profiles/${encodeURIComponent(profile.id)}/descriptions`}>Descriptions</a><a href={`/debates/new?profileId=${encodeURIComponent(profile.id)}`}>Start a debate as this profile</a></div></div><div className="profile-visibility">{profile.visibility === "all" ? "Visible to everyone" : profile.visibility === "ghost" ? "Hidden from search" : "Connections only"}<small>Social distance: {profile.socialDistance}{profile.anonymous ? " · Anonymous browsing" : ""}</small></div></article>)}</section>
  </>;
}
