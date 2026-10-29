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
      setError(result?.error || "Le débat n’a pas pu être publié. Réessayez.");
      setSaving(false);
      return;
    }
    router.push(`/debates/${encodeURIComponent(result.debate.id)}`);
    router.refresh();
  }

  return (
    <form className="form-panel" onSubmit={submit}>
      <div className="field"><label htmlFor="title">Titre du débat</label><input id="title" name="title" required minLength={4} maxLength={140} placeholder="Ex. La ville doit-elle ralentir la circulation ?" /></div>
      <div className="form-row">
        <div className="field"><label htmlFor="profileId">Profil auteur</label><select id="profileId" name="profileId" required defaultValue={profiles.some((profile) => profile.id === initialProfileId) ? initialProfileId : profiles[0]?.id ?? ""}>{profiles.map((profile) => <option value={profile.id} key={profile.id}>{profile.name} · {profile.kind === "individual" ? profile.category : `Méta-profil · ${profile.category}`}</option>)}</select></div>
        <div className="field"><label htmlFor="theme">Thème</label><select id="theme" name="theme"><option value="lifestyle-ideas">Idées & société</option><option value="politics-society">Politique & société</option><option value="culture-entertainment">Culture</option><option value="science-health">Science & santé</option><option value="economy-tech">Économie & tech</option><option value="sports">Sport</option></select></div>
      </div>
      <div className="field"><label htmlFor="start">Point de départ</label><select id="start" name="start"><option value="question">Question</option><option value="statement">Affirmation</option><option value="topic">Sujet</option><option value="dilemma">Dilemme</option><option value="hypothesis">Hypothèse</option></select></div>
      <div className="field"><label htmlFor="content">Votre introduction</label><textarea id="content" name="content" required minLength={8} maxLength={5000} placeholder="Exposez votre point de vue et les raisons de lancer cette discussion…" /><span className="field-hint">Un paragraphe suffit pour démarrer. Vous pourrez ajouter des réponses ensuite.</span></div>
      <div className="form-actions"><button className="button-primary" type="submit" disabled={saving}>{saving ? "Publication…" : "Publier le débat"}</button>{error && <span className="form-error" role="alert">{error}</span>}</div>
    </form>
  );
}