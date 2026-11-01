"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { SocialProfile } from "@/lib/social";
import type { MetaProfileInvitation } from "@/lib/meta-profile-invitations";

export function MetaProfileInviteResponse({ token, profiles }: { token: string; profiles: SocialProfile[] }) {
  const [invitation, setInvitation] = useState<MetaProfileInvitation | null>(null);
  const [profileId, setProfileId] = useState("");
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch(`/api/meta-profile-invitations/${encodeURIComponent(token)}`)
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Invitation not found.");
        setInvitation(result.invitation as MetaProfileInvitation);
      })
      .catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "Invitation could not be loaded."));
  }, [token]);

  async function respond(action: "accept" | "decline") {
    setBusy(true);
    setError("");
    const response = await fetch(`/api/meta-profile-invitations/${encodeURIComponent(token)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, profileId: action === "accept" ? invitation?.invitedProfileId ?? profileId : undefined })
    }).catch(() => null);
    const result = await response?.json().catch(() => null);
    if (!response?.ok) {
      setError(result?.error || "Your response could not be saved.");
      setBusy(false);
      return;
    }
    setStatus(action === "accept" ? "Invitation accepted. The meta-profile is now in your account." : "Invitation declined.");
    setInvitation((current) => current ? { ...current, status: action === "accept" ? "accepted" : "declined" } : current);
    setBusy(false);
  }

  const individualProfiles = profiles.filter((profile) => profile.kind === "individual");

  return <section className="form-panel meta-invite-response">
    {error && <p className="form-error" role="alert">{error}</p>}
    {invitation && <>
      <p className="eyebrow">Circles · invitation</p>
      <h1>{invitation.metaProfileName}</h1>
      <p>This meta-profile invited one of your profiles to join. Choose which individual profile will represent you there.</p>
      {invitation.status !== "pending" ? <p className="notice" role="status">This invitation has already been answered.</p> : invitation.invitedProfileId ? <div className="form-actions"><button className="button-secondary" type="button" disabled={busy} onClick={() => void respond("decline")}>Decline</button><button className="button-primary" type="button" disabled={busy} onClick={() => void respond("accept")}>{busy ? "Saving…" : "Accept invitation"}</button></div> : individualProfiles.length ? <>
        <label htmlFor="representative-profile">Your representative profile</label>
        <select id="representative-profile" value={profileId} onChange={(event) => setProfileId(event.target.value)}><option value="">Choose a pseudonym</option>{individualProfiles.map((profile) => <option value={profile.id} key={profile.id}>{profile.name} · {profile.category}</option>)}</select>
        <div className="form-actions"><button className="button-secondary" type="button" disabled={busy} onClick={() => void respond("decline")}>Decline</button><button className="button-primary" type="button" disabled={busy || !profileId} onClick={() => void respond("accept")}>{busy ? "Saving…" : "Accept invitation"}</button></div>
      </> : <p className="notice">Sign in to Circles, then open this invitation again to choose one of your profiles.</p>}
      {status && <p className="save-notice" role="status">{status}</p>}
      {invitation.status === "accepted" && <Link className="button-secondary" href={`/circle/profiles/${encodeURIComponent(invitation.metaProfileId)}`}>View meta-profile</Link>}
      <Link className="back-link" href="/circle">Open my account</Link>
    </>}
  </section>;
}
