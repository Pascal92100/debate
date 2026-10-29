"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

const evaluations = [
  { icon: "👍", label: "Agree" },
  { icon: "👎", label: "Disagree" },
  { icon: "ℹ️", label: "Information / facts" },
  { icon: "🤯💡", label: "Clarify" },
  { icon: "⚠️", label: "Reframe" }
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
      setError(result?.error || "The reply could not be published.");
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
        {isOpen ? "Cancel reply" : "↩ Reply"}
      </button>
      {isOpen && <form className="comment-form" onSubmit={submit}>
        <div className="comment-form-heading"><h3>Your reply</h3><button className="text-action" type="button" onClick={() => setIsOpen(false)}>Close</button></div>
        <input name="author" maxLength={60} aria-label="Your name" placeholder="Your name or pseudonym" />
        <input name="title" maxLength={100} aria-label="Reply title" placeholder="Title (optional)" />
        <textarea name="text" required minLength={2} maxLength={3000} aria-label="Your reply" placeholder="Reply to the argument…" />
        <fieldset className="evaluation-picker">
          <legend>Rate your reply (optional)</legend>
          {evaluations.map(({ icon, label }) => <label className="evaluation-choice" key={label} title={label}>
            <input type="radio" name="evaluation" value={icon} />
            <span aria-hidden="true">{icon}</span>
            <span className="evaluation-label">{label}</span>
          </label>)}
        </fieldset>
        <div className="comment-actions">
          <button className="button-primary" type="submit" disabled={saving}>{saving ? "Sending…" : "Post reply"}</button>
          {error && <span className="form-error" role="alert">{error}</span>}
        </div>
      </form>}
    </div>
  );
}