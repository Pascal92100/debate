"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import type { SocialCircle } from "@/lib/social";

export function SocialCircles({ initialCircles, persistent }: { initialCircles: SocialCircle[]; persistent: boolean }) {
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
    const response = await fetch("/api/social/circles", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: form.get("name"), kind: form.get("kind"), description: form.get("description"), visibility: form.get("visibility") }) }).catch(() => null);
    const result = await response?.json().catch(() => null);
    if (!response?.ok) {
      setError(result?.error || "Le cercle n’a pas pu être créé.");
      setSaving(false);
      return;
    }
    setCircles((current) => [...current, result.circle]);
    formElement.reset();
    setOpen(false);
    setSaving(false);
  }

  return <>
    {!persistent && <p className="notice social-notice">Les nouveaux cercles sont temporaires sans DATABASE_URL.</p>}
    <div className="social-section-heading"><div><p className="eyebrow">Espaces de confiance</p><h1>Vos cercles</h1><p>Des espaces de publication partagés par profil et par relation.</p></div><button className="button-primary" onClick={() => setOpen(!open)}>{open ? "Fermer" : "+ Créer un cercle"}</button></div>
    {open && <form className="social-compose-form circle-create-form" onSubmit={submit}><div className="social-form-row"><label>Nom du cercle<input name="name" required minLength={2} maxLength={70} placeholder="Ex. Équipe produit" /></label><label>Type<select name="kind"><option value="work">Travail</option><option value="friends">Amis</option><option value="family">Famille</option><option value="general">Général</option></select></label></div><label>Description<textarea name="description" maxLength={300} placeholder="À quoi sert ce cercle ?" /></label><div className="social-form-row"><label>Visibilité<select name="visibility"><option value="private">Privé · membres uniquement</option><option value="public">Public</option></select></label><div className="circle-form-action"><button className="button-primary" disabled={saving}>{saving ? "Création…" : "Créer le cercle"}</button></div></div>{error && <p className="form-error" role="alert">{error}</p>}</form>}
    <div className="circle-directory">{circles.map((circle) => <article className="circle-directory-card" key={circle.id}><div className="circle-directory-top"><span className="circle-large-initial">{circle.name.slice(0, 1)}</span><span className="visibility-mark">{circle.visibility === "public" ? "Public" : "Privé"}</span></div><p className="eyebrow">{circle.kind} · {circle.locationMode}</p><h2>{circle.name}</h2><p>{circle.description}</p><div className="circle-card-footer"><span>{circle.memberCount} membres</span><Link href={`/social?circle=${encodeURIComponent(circle.id)}`}>Voir le fil →</Link></div></article>)}</div>
  </>;
}
