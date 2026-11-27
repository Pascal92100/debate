"use client";

import { createContext, FormEvent, useContext, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { MediaPicker } from "@/components/media-picker";
import type { MediaAttachment } from "@/lib/media";

type ReplyDraft = { title: string; text: string; evaluation: string; media: MediaAttachment[] };
const emptyDraft = (): ReplyDraft => ({ title: "", text: "", evaluation: "", media: [] });
const ReplyDraftContext = createContext<Map<string, ReplyDraft> | null>(null);

export function ReplyDraftProvider({ children }: { children: React.ReactNode }) {
  const drafts = useRef(new Map<string, ReplyDraft>());
  return <ReplyDraftContext.Provider value={drafts.current}>{children}</ReplyDraftContext.Provider>;
}

const evaluations = [
  { icon: "👍", label: "Agree", hint: "I support this point." },
  { icon: "👎", label: "Disagree", hint: "I challenge this point." },
  { icon: "ℹ️", label: "Information / facts", hint: "I am adding relevant information or evidence." },
  { icon: "🤯💡", label: "Clarify", hint: "I am asking for more detail or clearer reasoning." },
  { icon: "⚠️", label: "Reframe", hint: "I suggest looking at this from another angle." }
];

function EvaluationOption({ icon, label, hint, showHint, setHint, evaluation, setEvaluation }: { icon: string; label: string; hint: string; showHint: boolean; setHint: (label: string | null) => void; evaluation: string; setEvaluation: (value: string) => void }) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPress = useRef(false);

  function startPress() {
    longPress.current = false;
    timer.current = setTimeout(() => {
      longPress.current = true;
      setHint(label);
    }, 550);
  }

  function endPress() {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  }

  return <div className="evaluation-option-wrap">
    <label className="evaluation-choice" title={hint}>
      <input type="radio" name="evaluation" value={icon} checked={evaluation === icon} onChange={() => setEvaluation(icon)} />
      <span aria-hidden="true">{icon}</span>
      <span className="evaluation-label">{label}</span>
    </label>
    <button className="evaluation-info" type="button" aria-label={`Information: ${label}`} aria-expanded={showHint} onPointerDown={startPress} onPointerUp={endPress} onPointerCancel={endPress} onPointerLeave={endPress} onContextMenu={(event) => { event.preventDefault(); longPress.current = true; setHint(label); }} onClick={() => {
      if (longPress.current) {
        longPress.current = false;
        return;
      }
      setHint(showHint ? null : label);
    }}>i</button>
  </div>;
}

export function CommentForm({ debateId, replyTo, controlId, compactTrigger = false, profileId = "profile-john" }: { debateId: string; replyTo: string; controlId?: string; compactTrigger?: boolean; profileId?: string }) {
  const router = useRouter();
  const drafts = useContext(ReplyDraftContext);
  const draftKey = JSON.stringify([debateId, profileId, replyTo]);
  const [draft, setDraft] = useState<ReplyDraft>(() => drafts?.get(draftKey) ?? emptyDraft());
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [hint, setHint] = useState<string | null>(null);
  const evaluationRef = useRef<HTMLFieldSetElement>(null);

  function updateDraft(changes: Partial<ReplyDraft>) {
    const updated = { ...(drafts?.get(draftKey) ?? draft), ...changes };
    drafts?.set(draftKey, updated);
    setDraft(updated);
  }

  useEffect(() => {
    if (!hint) return;
    const closeOutside = (event: PointerEvent) => {
      if (event.target instanceof Element && (!evaluationRef.current?.contains(event.target) || !event.target.closest(".evaluation-info, .evaluation-hint"))) setHint(null);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setHint(null);
    };
    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [hint]);

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
      body: JSON.stringify({ replyTo, title: form.get("title"), text, evaluation: form.get("evaluation"), media: draft.media, profileId })
    }).catch(() => null);
    const result = await response?.json().catch(() => null);
    if (!response?.ok) {
      setError(result?.error || "The reply could not be published.");
      setSaving(false);
      return;
    }
    formElement.reset();
    drafts?.delete(draftKey);
    setDraft(emptyDraft());
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
        <label className="reply-title-field">Reply title<input name="title" required minLength={2} maxLength={140} placeholder="Summarize your reply" value={draft.title} onChange={(event) => updateDraft({ title: event.target.value })} /></label>
        <textarea name="text" maxLength={3000} aria-label="Your reply" placeholder="Write your reply…" value={draft.text} onChange={(event) => updateDraft({ text: event.target.value })} />
        <MediaPicker profileId={profileId} media={draft.media} onChange={(media) => updateDraft({ media })} compact />
        <fieldset className="evaluation-picker" ref={evaluationRef}>
          <legend>Rate your reply (optional)</legend>
          {evaluations.map((option) => <EvaluationOption key={option.label} {...option} showHint={hint === option.label} setHint={setHint} evaluation={draft.evaluation} setEvaluation={(evaluation) => updateDraft({ evaluation })} />)}
          {hint && <span className="evaluation-hint" role="tooltip">{evaluations.find((option) => option.label === hint)?.hint}</span>}
        </fieldset>
        <div className="comment-actions">
          <button className="button-primary" type="submit" disabled={saving}>{saving ? "Sending…" : "Post reply"}</button>
          {error && <span className="form-error" role="alert">{error}</span>}
        </div>
      </form>}
    </div>
  );
}