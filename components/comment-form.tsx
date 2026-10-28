"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

const evaluations = [
  { icon: "👍", label: "Accord" },
  { icon: "👎", label: "Désaccord" },
  { icon: "ℹ️", label: "Information / faits" },
  { icon: "🤯💡", label: "Clarifier" },
  { icon: "⚠️", label: "Recadrer" }
];

export function CommentForm({ debateId, replyTo, controlId }: { debateId: string; replyTo: string; controlId?: string }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    setSaving(true);
    setError("");
    const form = new FormData(formElement);
    const text = String(form.get("text") ?? "").replace(/\r\n?/g, "\n");
    const response = await fetch(`/api/debates/${encodeURIComponent(debateId)}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ replyTo, author: form.get("author"), title: form.get("title"), text, evaluation: form.get("evaluation") })
    }).catch(() => null);
    const result = await response?.json().catch(() => null);
    if (!response?.ok) {
      setError(result?.error || "La réponse n’a pas pu être publiée.");
      setSaving(false);
      return;
    }
    formElement.reset();
    setSaving(false);
    setIsOpen(false);
    router.refresh();
  }

  return (
    <div className="reply-action">
      <button id={controlId} className="reply-trigger" type="button" aria-expanded={isOpen} onClick={() => setIsOpen(!isOpen)}>
        {isOpen ? "Annuler la réponse" : "↩ Répondre"}
      </button>
      {isOpen && <form className="comment-form" onSubmit={submit}>
        <div className="comment-form-heading"><h3>Votre réponse</h3><button className="text-action" type="button" onClick={() => setIsOpen(false)}>Fermer</button></div>
        <input name="author" maxLength={60} aria-label="Votre nom" placeholder="Votre nom ou pseudonyme" />
        <input name="title" maxLength={100} aria-label="Titre de la réponse" placeholder="Titre (facultatif)" />
        <textarea name="text" required minLength={2} maxLength={3000} aria-label="Votre réponse" placeholder="Répondez à ce qui a été avancé…" />
        <fieldset className="evaluation-picker">
          <legend>Évaluer votre réponse (facultatif)</legend>
          {evaluations.map(({ icon, label }) => <label className="evaluation-choice" key={label} title={label}>
            <input type="radio" name="evaluation" value={icon} />
            <span aria-hidden="true">{icon}</span>
            <span className="evaluation-label">{label}</span>
          </label>)}
        </fieldset>
        <div className="comment-actions">
          <button className="button-primary" type="submit" disabled={saving}>{saving ? "Envoi…" : "Publier la réponse"}</button>
          {error && <span className="form-error" role="alert">{error}</span>}
        </div>
      </form>}
    </div>
  );
}