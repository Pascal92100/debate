"use client";

import Link from "next/link";
import { FormEvent, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { SocialCircle, SocialProfile } from "@/lib/social";

const individualContexts = ["Professional", "Personal", "Political", "Dating"];
const metaContexts = ["Family", "Couple", "Group"];
const contentFilters = [
  ["forbidden", "🚫", "Forbidden: troll, insult, toxic, hate, racism, discrimination"],
  ["commercial", "🤑", "Commercial, advertising or clickbait content"],
  ["sexual", "🔞", "Sexual content: enables Kinky filtering"],
  ["shocking", "⚠️", "Shocking: violent, anxiety-inducing, disturbing, or blasphemous"],
  ["aggressive", "❌", "Aggressive tone or behavior"]
] as const;

function HelpHint({ text }: { text: string }) {
  const [visible, setVisible] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressTriggered = useRef(false);
  function startPress() { longPressTriggered.current = false; timer.current = setTimeout(() => { longPressTriggered.current = true; setVisible(true); }, 500); }
  function endPress() { if (timer.current) clearTimeout(timer.current); timer.current = null; }
  return <span className={`profile-help-wrap${visible ? " help-visible" : ""}`} onPointerDown={startPress} onPointerUp={endPress} onPointerCancel={endPress} onPointerLeave={endPress}>
    <button className="profile-help-trigger" type="button" title={text} aria-label={`Help: ${text}`} aria-expanded={visible} onClick={(event) => { event.preventDefault(); event.stopPropagation(); if (longPressTriggered.current) { longPressTriggered.current = false; return; } setVisible((value) => !value); }}>ⓘ</button>
    <span className="profile-help-popover" role="tooltip">{text}</span>
  </span>;
}

export function ProfileCreateForm({ profiles, circles, kind }: { profiles: SocialProfile[]; circles: SocialCircle[]; kind: "individual" | "meta" }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [selectedFilters, setSelectedFilters] = useState<string[]>([]);

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
        contentFilters: selectedFilters,
        locationLabel: form.get("locationLabel"),
        dynamicLocationCircleId: form.get("dynamicLocationCircleId"),
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
    <fieldset className="profile-research-settings"><legend>For other&apos;s research</legend>
      <div className="profile-setting-block"><div className="profile-setting-title">Visibility <HelpHint text="Choose who can find or view this profile." /></div><div className="profile-choice-row">
        <label><input type="radio" name="visibility" value="ghost" defaultChecked /><span>Ghost</span><HelpHint text="For no one. This profile is hidden from other users." /></label>
        <label><input type="radio" name="visibility" value="relatives" /><span>Connections only</span><HelpHint text="Only for relatives with an exact pseudonym or link match." /></label>
        <label><input type="radio" name="visibility" value="all" /><span>For all</span><HelpHint text="Default visibility: everyone may find this profile, subject to social distance." /></label>
      </div></div>
      <div className="profile-setting-block"><div className="profile-setting-title">Social distance visibility <HelpHint text="Limits which connection circles can see this profile. It is separate from the visibility choice above." /></div><div className="profile-choice-row distance-choice-row">
        <label><input type="radio" name="socialDistance" value="0" defaultChecked /><span>0</span><HelpHint text="Everyone can see your profile." /></label>
        <label><input type="radio" name="socialDistance" value="1" /><span>1</span><HelpHint text="Your direct contacts will never see this profile." /></label>
        <label><input type="radio" name="socialDistance" value="2" /><span>2+</span><HelpHint text="Contacts of your contacts will not see this profile either." /></label>
      </div></div>
      <div className="profile-setting-block"><div className="profile-setting-title">Content filtering <HelpHint text="Select content categories to filter from this profile's experience." /></div><div className="content-filter-options">{contentFilters.map(([id, emoji, help]) => <label title={help} className={`content-filter-option${selectedFilters.includes(id) ? " selected" : ""}`} key={id}><input type="checkbox" checked={selectedFilters.includes(id)} onChange={(event) => setSelectedFilters((current) => event.target.checked ? [...current, id] : current.filter((value) => value !== id))} /><span aria-hidden="true">{emoji}</span><HelpHint text={help} /></label>)}</div></div>
      <label className="social-check-field"><input name="anonymous" type="checkbox" /> Anonymous navigation <HelpHint text="Browse without revealing which profile is currently active." /></label>
      <div className="profile-location-fields"><div className="field"><label htmlFor="locationLabel">Location</label><input id="locationLabel" name="locationLabel" placeholder="Your location" /></div><div className="field"><label htmlFor="dynamicLocationCircleId">Dynamic location</label><select id="dynamicLocationCircleId" name="dynamicLocationCircleId"><option value="">No dynamic location</option>{circles.map((circle) => <option value={circle.id} key={circle.id}>{circle.name}</option>)}</select></div></div>
    </fieldset>
    {error && <p className="form-error" role="alert">{error}</p>}
    <div className="form-actions"><Link href={kind === "meta" ? "/circle/meta-profiles" : "/circle/profiles"} className="button-secondary">Cancel</Link><button className="button-primary" type="submit" disabled={saving}>{saving ? "Creating…" : `Create ${kind === "meta" ? "meta-profile" : "profile"}`}</button></div>
  </form>;
}
