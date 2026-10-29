"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import type { SocialProfile } from "@/lib/social";

export function DebateForm({ profiles, initialProfileId }: { profiles: SocialProfile[]; initialProfileId?: string }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/debates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: form.get("title"),
        authorProfileId: form.get("profileId"),
        from: profiles.find((profile) => profile.id === form.get("profileId"))?.name ?? "Participant",
        start: form.get("start"),
        theme: form.get("theme"),
        content: [form.get("content")]
      })
    }).catch(() => null);
    const result = await response?.json().catch(() => null);
    if (!response?.ok) {
      setError(result?.error || "The debate could not be published. Please try again.");
      setSaving(false);
      return;
    }
    router.push(`/debates/${encodeURIComponent(result.debate.id)}`);
    router.refresh();
  }

  return (
    <form className="form-panel" onSubmit={submit}>
      <div className="field"><label htmlFor="title">Debate title</label><input id="title" name="title" required minLength={4} maxLength={140} placeholder="e.g. Should the city slow down traffic?" /></div>
      <div className="form-row">
        <div className="field"><label htmlFor="profileId">Author profile</label><select id="profileId" name="profileId" required defaultValue={profiles.some((profile) => profile.id === initialProfileId) ? initialProfileId : profiles[0]?.id ?? ""}>{profiles.map((profile) => <option value={profile.id} key={profile.id}>{profile.name} · {profile.kind === "individual" ? profile.category : `Meta-profile · ${profile.category}`}</option>)}</select></div>
        <div className="field"><label htmlFor="theme">Theme</label><select id="theme" name="theme"><option value="lifestyle-ideas">Ideas & society</option><option value="politics-society">Politics & society</option><option value="culture-entertainment">Culture</option><option value="science-health">Science & health</option><option value="economy-tech">Economy & tech</option><option value="sports">Sports</option></select></div>
      </div>
      <div className="field"><label htmlFor="start">Starting point</label><select id="start" name="start"><option value="question">Question</option><option value="statement">Statement</option><option value="topic">Topic</option><option value="dilemma">Dilemma</option><option value="hypothesis">Hypothesis</option></select></div>
      <div className="field"><label htmlFor="content">Your introduction</label><textarea id="content" name="content" required minLength={8} maxLength={5000} placeholder="Share your point of view and why you want to open this discussion…" /><span className="field-hint">One paragraph is enough to start. You can add replies later.</span></div>
      <div className="form-actions"><button className="button-primary" type="submit" disabled={saving}>{saving ? "Publishing…" : "Publish debate"}</button>{error && <span className="form-error" role="alert">{error}</span>}</div>
    </form>
  );
}