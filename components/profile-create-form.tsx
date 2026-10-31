"use client";

import Link from "next/link";
import { FormEvent, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { SocialCircle, SocialProfile } from "@/lib/social";

const individualContexts = ["Professional", "Personal", "Political", "Dating"];
const metaContexts = ["Family", "Couple", "Group"];
export const contentFilters = [
  ["forbidden", "🚫", "Forbidden: troll, insult, toxic, hate, racism, discrimination"],
  ["commercial", "🤑", "Commercial, advertising or clickbait content"],
  ["sexual", "🔞", "Sexual content: enables Kinky filtering"],
  ["shocking", "⚠️", "Shocking: violent, anxiety-inducing, disturbing, or blasphemous"],
  ["aggressive", "❌", "Aggressive tone or behavior"]
] as const;

export function ContentFilterOption({ id, emoji, text, selected, onToggle }: { id: string; emoji: string; text: string; selected: boolean; onToggle: (checked: boolean) => void }) {
  const [visible, setVisible] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressTriggered = useRef(false);
  function startPress() { longPressTriggered.current = false; timer.current = setTimeout(() => { longPressTriggered.current = true; setVisible(true); }, 550); }
  function endPress() { if (timer.current) clearTimeout(timer.current); timer.current = null; }
  function showTooltip() {
    setVisible(true);
    if (dismissTimer.current) clearTimeout(dismissTimer.current);
    dismissTimer.current = setTimeout(() => setVisible(false), 3500);
  }
  return <label className={`content-filter-option${selected ? " selected" : ""}${visible ? " help-visible" : ""}`} title={text} onPointerDown={startPress} onPointerUp={endPress} onPointerCancel={endPress} onPointerLeave={endPress} onContextMenu={(event) => { event.preventDefault(); longPressTriggered.current = true; showTooltip(); }} onClick={(event) => { if (longPressTriggered.current) { event.preventDefault(); event.stopPropagation(); longPressTriggered.current = false; showTooltip(); } }}>
    <input type="checkbox" checked={selected} onChange={(event) => onToggle(event.target.checked)} /><span aria-hidden="true">{emoji}</span><span className="content-filter-tooltip" role="tooltip">{text}</span>
  </label>;
}

export function ProfileCreateForm({ profiles, circles, kind }: { profiles: SocialProfile[]; circles: SocialCircle[]; kind: "individual" | "meta" }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [selectedFilters, setSelectedFilters] = useState<string[]>([]);
  const [dynamicLocationEnabled, setDynamicLocationEnabled] = useState(false);

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
        dynamicLocationEnabled: form.get("dynamicLocationEnabled") === "yes",
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
      <div className="profile-setting-block"><div className="profile-setting-title">Visibility</div><div className="profile-choice-row">
        <label title="Ghost: for no one. This profile is hidden from other users."><input type="radio" name="visibility" value="ghost" defaultChecked /><span>Ghost</span></label>
        <label title="Connections only: exact pseudonym or link match for relatives."><input type="radio" name="visibility" value="relatives" /><span>Connections only</span></label>
        <label title="For all: default visibility; social distance still applies."><input type="radio" name="visibility" value="all" /><span>For all</span></label>
      </div></div>
      <div className="profile-setting-block"><div className="profile-setting-title">Social distance visibility</div><div className="profile-choice-row distance-choice-row">
        <label title="0: everyone can see your profile."><input type="radio" name="socialDistance" value="0" defaultChecked /><span>0</span></label>
        <label title="1: your direct contacts will never see this profile."><input type="radio" name="socialDistance" value="1" /><span>1</span></label>
        <label title="2+: contacts of your contacts will not see this profile either."><input type="radio" name="socialDistance" value="2" /><span>2+</span></label>
      </div></div>
      <div className="profile-setting-block"><div className="profile-setting-title">Content filtering</div><div className="content-filter-options">{contentFilters.map(([id, emoji, help]) => <ContentFilterOption key={id} id={id} emoji={emoji} text={help} selected={selectedFilters.includes(id)} onToggle={(checked) => setSelectedFilters((current) => checked ? [...current, id] : current.filter((value) => value !== id))} />)}</div></div>
      <label className="social-check-field" title="Browse without revealing which profile is currently active."><input name="anonymous" type="checkbox" /> Anonymous navigation</label>
      <div className="profile-location-fields"><div className="field"><label htmlFor="locationLabel">Location</label><input id="locationLabel" name="locationLabel" placeholder="Your location" /></div><div className="field"><span className="field-label">Dynamic location</span><div className="dynamic-location-choice"><label><input type="radio" name="dynamicLocationEnabled" value="no" checked={!dynamicLocationEnabled} onChange={() => setDynamicLocationEnabled(false)} /> No</label><label><input type="radio" name="dynamicLocationEnabled" value="yes" checked={dynamicLocationEnabled} onChange={() => setDynamicLocationEnabled(true)} /> Yes</label></div>{dynamicLocationEnabled && <><label className="dynamic-location-circle-label" htmlFor="dynamicLocationCircleId">Share location with Circle</label><select id="dynamicLocationCircleId" name="dynamicLocationCircleId" required defaultValue=""><option value="">Select a Circle</option>{circles.map((circle) => <option value={circle.id} key={circle.id}>{circle.name}</option>)}</select></>}</div></div>
    </fieldset>
    {error && <p className="form-error" role="alert">{error}</p>}
    <div className="form-actions"><Link href={kind === "meta" ? "/circle/meta-profiles" : "/circle/profiles"} className="button-secondary">Cancel</Link><button className="button-primary" type="submit" disabled={saving}>{saving ? "Creating…" : `Create ${kind === "meta" ? "meta-profile" : "profile"}`}</button></div>
  </form>;
}
