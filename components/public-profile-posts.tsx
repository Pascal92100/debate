"use client";

import { useEffect, useState } from "react";
import { MediaGallery } from "@/components/media-gallery";
import type { PublicProfileView } from "@/lib/public-profile";

const reactions = [
  ["👍", "Agree"], ["👎", "Disagree"], ["⚠️", "Shocking"], ["🔑", "Useful"], ["💡", "Inspiring"],
  ["🎓", "Interesting"], ["❌", "Toxic"], ["❓", "Unverifiable"], ["☀️", "Feel-good"]
] as const;

type ReactionState = { reactions: Record<string, number>; viewerReaction: string | null };

export function PublicProfilePosts({ posts, viewerProfiles, initialProfileId }: { posts: PublicProfileView["posts"]; viewerProfiles: Array<{ id: string; name: string }>; initialProfileId: string }) {
  const [profileId, setProfileId] = useState(initialProfileId || viewerProfiles[0]?.id || "");
  const [reactionStates, setReactionStates] = useState<Record<string, ReactionState>>(() => Object.fromEntries(posts.map((post) => [post.id, { reactions: post.reactions ?? {}, viewerReaction: post.viewerReaction }])));
  const [busyPostId, setBusyPostId] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!profileId || posts.length === 0) return;
    const query = new URLSearchParams({ profileId });
    posts.forEach((post) => query.append("postId", post.id));
    let active = true;
    void fetch(`/api/social/posts/reactions?${query.toString()}`)
      .then(async (response) => ({ response, result: await response.json().catch(() => null) }))
      .then(({ response, result }) => {
        if (!active) return;
        if (!response.ok) {
          setError(result?.error || "Reactions could not be loaded.");
          return;
        }
        setReactionStates((current) => ({ ...current, ...(result.reactions ?? {}) }));
        setError("");
      })
      .catch(() => { if (active) setError("Reactions could not be loaded."); });
    return () => { active = false; };
  }, [profileId, posts]);

  async function react(postId: string, reaction: string) {
    if (!profileId) return;
    setBusyPostId(postId);
    setError("");
    const response = await fetch(`/api/social/posts/${encodeURIComponent(postId)}/reactions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reaction, profileId })
    }).catch(() => null);
    const result = await response?.json().catch(() => null);
    if (!response?.ok) setError(result?.error || "Your reaction could not be saved.");
    else setReactionStates((current) => ({ ...current, [postId]: { reactions: result.reactions, viewerReaction: result.viewerReaction } }));
    setBusyPostId("");
  }

  return <section className="public-profile-section">
    <div className="account-section-heading"><div><p className="eyebrow">Public activity</p><h2>Publications</h2></div><span>{posts.length}</span></div>
    {viewerProfiles.length > 0 && <div className="public-reaction-profile"><label>{viewerProfiles.length > 1 ? "React as" : "Your profile"}<select value={profileId} onChange={(event) => setProfileId(event.target.value)}>{viewerProfiles.map((profile) => <option value={profile.id} key={profile.id}>{profile.name}</option>)}</select></label></div>}
    <div className="public-profile-items">{posts.map((post) => {
      const state = reactionStates[post.id] ?? { reactions: post.reactions ?? {}, viewerReaction: post.viewerReaction };
      return <article className="profile-activity-item public-content-item" key={post.id}>
        <div className="profile-post-meta">{post.circleName || "Public feed"} · {new Date(post.createdAt).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}</div>
        <strong>{post.title}</strong>
        {post.body && <p>{post.body}</p>}
        <MediaGallery media={post.media} compact />
        {viewerProfiles.length > 0 && <div className="social-reactions public-post-reactions" aria-label="Reactions">{reactions.map(([emoji, label]) => <button type="button" key={emoji} title={`React: ${label}`} aria-label={`React: ${label}`} aria-pressed={state.viewerReaction === emoji} className={state.viewerReaction === emoji ? "selected" : ""} disabled={busyPostId === post.id} onClick={() => void react(post.id, emoji)}>{emoji}{state.reactions[emoji] ? <small>{state.reactions[emoji]}</small> : null}</button>)}</div>}
      </article>;
    })}</div>
    {error && <p className="form-error" role="status">{error}</p>}
  </section>;
}