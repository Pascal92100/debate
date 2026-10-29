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
      setError(result?.error || "Le profil n’a pas pu être créé.");
      setSaving(false);
      return;
    }
    setProfiles((current) => [...current, result.profile]);
    formElement.reset();
    setSaving(false);
    setOpen(false);
  }

  return <>
    {!persistent && <p className="notice social-notice">Les nouveaux profils sont temporaires sans DATABASE_URL.</p>}
    <div className="social-section-heading"><div><p className="eyebrow">Identités et contextes</p><h1>{kind === "meta" ? "Vos méta-profils" : kind === "individual" ? "Vos profils individuels" : "Vos profils"}</h1><p>Un compte peut séparer identité individuelle et méta-profils.</p></div><button className="button-primary" onClick={() => setOpen(!open)}>{open ? "Fermer" : kind === "meta" ? "+ Créer un méta-profil" : "+ Créer un profil"}</button></div>
    {open && <form className="social-compose-form profile-create-form" onSubmit={submit}><div className="social-form-row"><label>Nom du profil<input name="name" required minLength={2} maxLength={70} placeholder="Nom ou pseudonyme" /></label><label>Type<select name="kind" value={newProfileKind} onChange={(event) => setNewProfileKind(event.target.value as "individual" | "meta")}><option value="individual">Individuel</option><option value="meta">Méta-profil · couple, famille, groupe</option></select></label></div>{newProfileKind === "meta" && <label>Membres<select name="members" multiple size={Math.min(5, profiles.filter((profile) => profile.kind === "individual").length)}>{profiles.filter((profile) => profile.kind === "individual").map((profile) => <option value={profile.id} key={profile.id}>{profile.name} · {profile.category}</option>)}</select><small>Sélectionnez les profils individuels qui composent ce méta-profil.</small></label>}<div className="social-form-row"><label>Contexte<input name="category" maxLength={50} placeholder="Professionnel, personnel…" /></label><label>Visibilité<select name="visibility"><option value="all">Visible à tous</option><option value="relatives">Relations uniquement</option><option value="ghost">Invisible dans la recherche</option></select></label></div><label>Présentation<textarea name="bio" maxLength={500} placeholder="Comment présenter ce profil ?" /></label><div className="social-form-row"><label>Distance sociale<input name="socialDistance" type="number" min="0" max="10" defaultValue="0" /></label><label className="social-check-field"><input name="anonymous" type="checkbox" /> Navigation anonyme</label></div><div className="circle-form-action"><button className="button-primary" disabled={saving}>{saving ? "Création…" : "Créer le profil"}</button></div>{error && <p className="form-error" role="alert">{error}</p>}</form>}
  <section className="social-profile-directory">{visibleProfiles.map((profile) => <article className="social-profile-card" key={profile.id}><span className="social-avatar social-avatar-large">{profile.avatar}</span><div><h2>{profile.name}</h2><p>{profile.kind === "individual" ? "Profil individuel" : `${profile.category} (Méta-profil)`}</p><p>{profile.relationship ? profile.relationship : profile.includesLabel ? `Includes: ${profile.includesLabel}` : profile.members?.length ? `Includes: ${profile.members.map((id) => profiles.find((member) => member.id === id)?.name).filter(Boolean).join(", ")}` : profile.bio}</p><div className="profile-card-actions"><a href={`/circle/profiles/${encodeURIComponent(profile.id)}`}>Voir le profil</a><a href={`/circle/profiles/${encodeURIComponent(profile.id)}/descriptions`}>Descriptions</a><a href={`/debates/new?profileId=${encodeURIComponent(profile.id)}`}>Lancer un débat sous ce profil</a></div></div><div className="profile-visibility">{profile.visibility === "all" ? "Visible à tous" : profile.visibility === "ghost" ? "Invisible dans la recherche" : "Relations uniquement"}<small>Distance sociale : {profile.socialDistance}{profile.anonymous ? " · Navigation anonyme" : ""}</small></div></article>)}</section>
  </>;
}
