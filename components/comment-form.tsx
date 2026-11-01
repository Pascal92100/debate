"use client";

import { FormEvent, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { MediaPicker } from "@/components/media-picker";
import type { MediaAttachment } from "@/lib/media";

const evaluations = [
  { icon: "👍", label: "Agree", hint: "I support this point." },
  { icon: "👎", label: "Disagree", hint: "I challenge this point." },
  { icon: "ℹ️", label: "Information / facts", hint: "I am adding relevant information or evidence." },
  { icon: "🤯💡", label: "Clarify", hint: "I am asking for more detail or clearer reasoning." },
  { icon: "⚠️", label: "Reframe", hint: "I suggest looking at this from another angle." }
];

function EvaluationOption({ icon, label, hint }: { icon: string; label: string; hint: string }) {
  const [showHint, setShowHint] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPress = useRef(false);

  function startPress() {
    longPress.current = false;
    timer.current = setTimeout(() => {
      longPress.current = true;
      setShowHint(true);
    }, 550);
  }

  function endPress() {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  }

  return <div className="evaluation-option-wrap">
    <label className="evaluation-choice" title={hint}>
      <input type="radio" name="evaluation" value={icon} />
      <span aria-hidden="true">{icon}</span>
      <span className="evaluation-label">{label}</span>
    </label>
    <button className="evaluation-info" type="button" aria-label={`Information: ${label}`} aria-expanded={showHint} onPointerDown={startPress} onPointerUp={endPress} onPointerCancel={endPress} onPointerLeave={endPress} onContextMenu={(event) => { event.preventDefault(); longPress.current = true; setShowHint(true); }} onClick={() => {
      if (longPress.current) {
        longPress.current = false;
        return;
      }
      setShowHint((current) => !current);
    }}>i</button>
    {showHint && <span className="evaluation-hint" role="tooltip">{hint}</span>}
  </div>;
}

export function CommentForm({ debateId, replyTo, controlId, compactTrigger = false, profileId = "profile-john" }: { debateId: string; replyTo: string; controlId?: string; compactTrigger?: boolean; profileId?: string }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [media, setMedia] = useState<MediaAttachment[]>([]);

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
      body: JSON.stringify({ replyTo, text, evaluation: form.get("evaluation"), media })
    }).catch(() => null);
    const result = await response?.json().catch(() => null);
    if (!response?.ok) {
      setError(result?.error || "The reply could not be published.");
      setSaving(false);
      return;
    }
    formElement.reset();
    setMedia([]);
    setSaving(false);
    setIsOpen(false);
    router.refresh();
  }

  return (
    <div className="reply-action">
      <button id={controlId} className={`reply-trigger${compactTrigger ? " argument-action reply-icon" : ""}`} type="button" aria-label={isOpen ? "Cancel reply" : "Reply"} title={isOpen ? "Cancel reply" : "Reply"} aria-expanded={isOpen} onClick={() => setIsOpen(!isOpen)}>
        {isOpen ? "Cancel reply" : compactTrigger ? "↩" : "↩ Reply"}
      </button>
      {isOpen && <form className="comment-form" onSubmit={submit}>
        <div className="comment-form-heading"><h3>Your reply</h3><button className="text-action" type="button" onClick={() => setIsOpen(false)}>Close</button></div>
        <textarea name="text" maxLength={3000} aria-label="Your reply" placeholder="Write your reply…" />
        <MediaPicker profileId={profileId} media={media} onChange={setMedia} compact />
        <fieldset className="evaluation-picker">
          <legend>Rate your reply (optional)</legend>
          {evaluations.map(({ icon, label, hint }) => <EvaluationOption key={label} icon={icon} label={label} hint={hint} />)}
        </fieldset>
        <div className="comment-actions">
          <button className="button-primary" type="submit" disabled={saving}>{saving ? "Sending…" : "Post reply"}</button>
          {error && <span className="form-error" role="alert">{error}</span>}
        </div>
      </form>}
    </div>
  );
}