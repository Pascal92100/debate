"use client";

import { FormEvent, useState } from "react";
import { DeleteEntityButton } from "@/components/delete-entity-button";
import { MediaGallery } from "@/components/media-gallery";
import { MediaPicker } from "@/components/media-picker";
import type { MediaAttachment } from "@/lib/media";
import type { SocialPostComment } from "@/lib/post-comments";

export function SocialPostDiscussion({ postId, profileId, initialCount }: { postId: string; profileId: string; initialCount: number }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [comments, setComments] = useState<SocialPostComment[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [replyTo, setReplyTo] = useState<SocialPostComment | null>(null);
  const [media, setMedia] = useState<MediaAttachment[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [activeCommentId, setActiveCommentId] = useState("");
  let pressTimer: ReturnType<typeof setTimeout> | null = null;

  async function toggleOpen() {
    const next = !open;
    setOpen(next);
    if (next && !loaded) {
      setLoading(true);
      const response = await fetch(`/api/social/posts/${encodeURIComponent(postId)}/comments`).catch(() => null);
      const result = await response?.json().catch(() => null);
      if (response?.ok) setComments(result.comments as SocialPostComment[]);
      else setError(result?.error || "Comments could not be loaded.");
      setLoaded(true);
      setLoading(false);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const body = String(new FormData(form).get("body") ?? "");
    setBusy(true);
    setError("");
    const response = await fetch(`/api/social/posts/${encodeURIComponent(postId)}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ profileId, body, media, replyToId: replyTo?.id })
    }).catch(() => null);
    const result = await response?.json().catch(() => null);
    if (!response?.ok) {
      setError(result?.error || "The comment could not be sent.");
      setBusy(false);
      return;
    }
    setComments((current) => [...current, result.comment as SocialPostComment]);
    setReplyTo(null);
    setMedia([]);
    form.reset();
    setBusy(false);
  }

  return <section className="post-discussion">
    <button className="post-discussion-toggle" type="button" aria-expanded={open} onClick={() => void toggleOpen()}>{open ? "Hide comments" : `Comments · ${Math.max(initialCount, comments.length)}`}</button>
    {open && <div className="post-discussion-body">
      {loading ? <p className="discussion-loading">Loading comments…</p> : comments.map((comment) => <article className="post-comment" key={comment.id} onPointerDown={(event) => { if (event.pointerType === "touch") pressTimer = setTimeout(() => setActiveCommentId(comment.id), 450); }} onPointerUp={() => { if (pressTimer) clearTimeout(pressTimer); }} onPointerCancel={() => { if (pressTimer) clearTimeout(pressTimer); }} onContextMenu={(event) => { event.preventDefault(); setActiveCommentId(comment.id); }}>
        <header><strong>{comment.author}</strong><time dateTime={comment.createdAt}>{new Date(comment.createdAt).toLocaleString("en-US", { dateStyle: "short", timeStyle: "short" })}</time></header>
        {comment.replyTo && <blockquote><strong>{comment.replyTo.author}</strong><span>{comment.replyTo.excerpt}</span></blockquote>}
        <p>{comment.body}</p><MediaGallery media={comment.media} compact />
        {activeCommentId === comment.id && <nav className="post-comment-actions" aria-label="Comment actions"><button className="text-action" type="button" onClick={() => { setReplyTo(comment); setActiveCommentId(""); }}>Reply</button><button className="text-action" type="button" onClick={() => void navigator.clipboard.writeText(comment.body)}>Copy</button>{comment.profileId === profileId && <DeleteEntityButton endpoint={`/api/social/posts/${encodeURIComponent(postId)}/comments/${encodeURIComponent(comment.id)}`} label="Delete comment" confirmation="Delete this comment and replies to it?" iconOnly onDeleted={() => setComments((current) => current.filter((item) => item.id !== comment.id))} />}</nav>}
      </article>)}
      {replyTo && <div className="discussion-reply-preview"><span><strong>Replying to {replyTo.author}</strong>{replyTo.body}</span><button className="text-action" type="button" onClick={() => setReplyTo(null)}>Cancel</button></div>}
      <form className="post-comment-form" onSubmit={submit}><textarea name="body" aria-label="Comment" placeholder="Write a comment…" /><MediaPicker profileId={profileId} media={media} onChange={setMedia} compact />{error && <p className="form-error" role="alert">{error}</p>}<button className="button-secondary" type="submit" disabled={busy}>{busy ? "Sending…" : "Comment"}</button></form>
    </div>}
  </section>;
}