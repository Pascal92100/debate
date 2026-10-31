"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import type { SocialProfile } from "@/lib/social";

const individualContexts = ["Professional", "Personal", "Political", "Dating"];
const metaContexts = ["Family", "Couple", "Group"];

export function ProfileCreateForm({ profiles, kind }: { profiles: SocialProfile[]; kind: "individual" | "meta" }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setSaving(true);
    setError("");
    const response = await fetch("/api/social/profiles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        kind,
        category: form.get("category"),
        name: form.get("name"),
        bio: form.get("bio"),
        visibility: form.get("visibility"),
        socialDistance: form.get("socialDistance"),
        anonymous: form.get("anonymous") === "on",
        members: form.getAll("members")
      })
    }).catch(() => null);
    const result = await response?.json().catch(() => null);
    if (!response?.ok) {
      setError(result?.error || "The profile could not be created.");
      setSaving(false);
      return;
    }
    router.push(`/circle/profiles/${encodeURIComponent(result.profile.id)}`);
    router.refresh();
  }

  const contexts = kind === "individual" ? individualContexts : metaContexts;
  const availableMembers = profiles.filter((profile) => profile.kind === "individual");

  return <form className="form-panel profile-create-page-form" onSubmit={submit}>
    <div className="field"><label htmlFor="category">{kind === "individual" ? "Profile context" : "Meta-profile type"}</label><select id="category" name="category" required defaultValue=""><option value="" disabled>Select a context</option>{contexts.map((context) => <option value={context} key={context}>{context}</option>)}</select></div>
    <div className="field"><label htmlFor="name">Profile name</label><input id="name" name="name" required minLength={2} maxLength={70} placeholder={kind === "meta" ? "e.g. Doe Family" : "Name or pseudonym"} /></div>
    {kind === "meta" && <div className="field"><label htmlFor="members">Members</label><select id="members" name="members" multiple size={Math.max(3, Math.min(7, availableMembers.length))}>{availableMembers.map((profile) => <option value={profile.id} key={profile.id}>{profile.name} · {profile.category}</option>)}</select><span className="field-hint">Select individual profiles belonging to this meta-profile.</span></div>}
    <div className="field"><label htmlFor="bio">Introduction</label><textarea id="bio" name="bio" maxLength={500} placeholder="How should this profile be presented?" /></div>
    <div className="form-row">
      <div className="field"><label htmlFor="visibility">Visibility</label><select id="visibility" name="visibility"><option value="all">Visible to everyone</option><option value="relatives">Connections only</option><option value="ghost">Hidden from search</option></select></div>
      <div className="field"><label htmlFor="socialDistance">Social distance</label><input id="socialDistance" name="socialDistance" type="number" min="0" max="10" defaultValue="0" /></div>
    </div>
    <label className="social-check-field"><input name="anonymous" type="checkbox" /> Anonymous browsing</label>
    {error && <p className="form-error" role="alert">{error}</p>}
    <div className="form-actions"><Link href={kind === "meta" ? "/circle/meta-profiles" : "/circle/profiles"} className="button-secondary">Cancel</Link><button className="button-primary" type="submit" disabled={saving}>{saving ? "Creating…" : `Create ${kind === "meta" ? "meta-profile" : "profile"}`}</button></div>
  </form>;
}
