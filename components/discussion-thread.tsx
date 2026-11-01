"use client";

import { FormEvent, useRef, useState } from "react";
import { DeleteEntityButton } from "@/components/delete-entity-button";
import { MediaPicker } from "@/components/media-picker";
import { MediaGallery } from "@/components/media-gallery";
import type { MediaAttachment } from "@/lib/media";
import type { SimpleDiscussion } from "@/lib/discussions";
import type { SocialProfile } from "@/lib/social";

export function DiscussionThread({ initialDiscussion, profiles, authorProfileId }: { initialDiscussion: SimpleDiscussion; profiles: SocialProfile[]; authorProfileId: string }) {
  const [discussion, setDiscussion] = useState(initialDiscussion);
  const [replyTo, setReplyTo] = useState<SimpleDiscussion["messages"][number] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [activeMessageId, setActiveMessageId] = useState("");
  const [media, setMedia] = useState<MediaAttachment[]>([]);
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const profileId = profiles.some((profile) => profile.id === authorProfileId) ? authorProfileId : "";
  const ownedProfileIds = profiles.map((profile) => profile.id);

  function startMessagePress(messageId: string) {
    pressTimer.current = setTimeout(() => setActiveMessageId(messageId), 450);
  }

  function finishMessagePress() {
    if (pressTimer.current) clearTimeout(pressTimer.current);
    pressTimer.current = null;
  }

  async function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const body = new FormData(form).get("message");
    setBusy(true);
    setError("");
    const response = await fetch(`/api/discussions/${encodeURIComponent(discussion.id)}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ profileId, body, media, replyToId: replyTo?.id })
    }).catch(() => null);
    const result = await response?.json().catch(() => null);
    if (!response?.ok) {
      setError(result?.error || "The message could not be sent.");
      setBusy(false);
      return;
    }
    setDiscussion((current) => ({ ...current, updatedAt: result.message.createdAt, messages: [...current.messages, result.message] }));
    setReplyTo(null);
    setMedia([]);
    form.reset();
    setBusy(false);
  }

  return <>
    <div className="discussion-messages" aria-live="polite">{discussion.messages.map((message) => <article className={`discussion-message${message.authorProfileId === profileId ? " own-message" : ""}${activeMessageId === message.id ? " message-actions-open" : ""}`} key={message.id} onPointerDown={(event) => { if (event.pointerType === "touch") startMessagePress(message.id); }} onPointerUp={finishMessagePress} onPointerCancel={finishMessagePress} onContextMenu={(event) => { event.preventDefault(); setActiveMessageId(message.id); }}>
      <header><strong>{message.author}</strong><time dateTime={message.createdAt}>{new Date(message.createdAt).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}</time></header>
      {message.replyTo && <blockquote><strong>{message.replyTo.author}</strong><span>{message.replyTo.excerpt}</span></blockquote>}
      <p>{message.body}</p>
      <MediaGallery media={message.media} compact />
      {activeMessageId === message.id && <nav className="discussion-message-actions" aria-label="Message actions" onPointerDown={(event) => event.stopPropagation()}><button className="text-action" type="button" onClick={() => { setReplyTo(message); setActiveMessageId(""); }}>Reply</button><button className="text-action" type="button" onClick={() => { void navigator.clipboard.writeText(message.body); setActiveMessageId(""); }}>Copy</button>{ownedProfileIds.includes(message.authorProfileId) && <DeleteEntityButton endpoint={`/api/discussions/${encodeURIComponent(discussion.id)}/messages/${encodeURIComponent(message.id)}`} label="Delete message" confirmation="Delete this message? This cannot be undone." iconOnly onDeleted={() => { setDiscussion((current) => ({ ...current, messages: current.messages.filter((item) => item.id !== message.id) })); setActiveMessageId(""); }} />}</nav>}
    </article>)}</div>
    {!discussion.messages.length && <p className="account-empty">This discussion has no messages yet.</p>}
    {replyTo && <div className="discussion-reply-preview"><span><strong>Replying to {replyTo.author}</strong>{replyTo.body}</span><button className="text-action" type="button" onClick={() => setReplyTo(null)}>Cancel reply</button></div>}
    <form className="discussion-composer" onSubmit={send}><label htmlFor="discussion-message">Message</label><textarea id="discussion-message" name="message" maxLength={5000} placeholder="Write a message…" /><MediaPicker profileId={profileId} media={media} onChange={setMedia} compact /><div><span>{error && <span className="form-error" role="alert">{error}</span>}</span><button className="button-primary" type="submit" disabled={busy || !profileId}>{busy ? "Sending…" : "Send message"}</button></div></form>
  </>;
}