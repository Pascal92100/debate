"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ProfileAlert } from "@/lib/profile-modules";
import type { MetaProfileInvitation } from "@/lib/meta-profile-invitations";
import type { SocialProfile } from "@/lib/social";

export function ProfileAlerts({ initialAlerts, initialInvitations, profiles, showProfileNames = false }: { initialAlerts: ProfileAlert[]; initialInvitations: MetaProfileInvitation[]; profiles: SocialProfile[]; showProfileNames?: boolean }) {
  const router = useRouter();
  const [alerts, setAlerts] = useState(initialAlerts);
  const [invitations, setInvitations] = useState(initialInvitations);
  const [representatives, setRepresentatives] = useState<Record<string, string>>({});
  const [error, setError] = useState("");

  async function markRead(alertId: string) {
    setError("");
    const response = await fetch(`/api/alerts/${encodeURIComponent(alertId)}`, { method: "PATCH" }).catch(() => null);
    const result = await response?.json().catch(() => null);
    if (!response?.ok) {
      setError(result?.error || "The alert could not be updated.");
      return;
    }
    setAlerts((current) => current.map((alert) => alert.id === alertId ? { ...alert, readAt: new Date().toISOString() } : alert));
  }

  async function respondToInvitation(invitation: MetaProfileInvitation, action: "accept" | "decline") {
    setError("");
    const response = await fetch(`/api/meta-profile-invitations/${encodeURIComponent(invitation.token)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, profileId: action === "accept" ? invitation.invitedProfileId ?? representatives[invitation.token] : undefined })
    }).catch(() => null);
    const result = await response?.json().catch(() => null);
    if (!response?.ok) {
      setError(result?.error || "The invitation response could not be saved.");
      return;
    }
    setInvitations((current) => current.filter((item) => item.token !== invitation.token));
    setAlerts((current) => current.map((alert) => alert.payload.invitationToken === invitation.token ? { ...alert, readAt: new Date().toISOString() } : alert));
    window.dispatchEvent(new Event("circles:profile-membership-updated"));
    if (action === "accept") router.refresh();
  }

  const individualProfiles = profiles.filter((profile) => profile.kind === "individual");

  return <>
    {error && <p className="form-error" role="alert">{error}</p>}
    {invitations.map((invitation) => <article className="profile-activity-item meta-profile-invitation-alert" key={invitation.id}><div className="profile-post-meta">Meta-profile invitation</div><strong>{invitation.metaProfileName}</strong><p>{invitation.invitedProfileId ? "This profile has invited you to join." : "Choose which of your pseudonyms will represent you in this meta-profile."}</p>{!invitation.invitedProfileId && <><label htmlFor={`invite-profile-${invitation.id}`}>Representative profile</label><select id={`invite-profile-${invitation.id}`} value={representatives[invitation.token] ?? ""} onChange={(event) => setRepresentatives((current) => ({ ...current, [invitation.token]: event.target.value }))}><option value="">Choose a pseudonym</option>{individualProfiles.map((profile) => <option value={profile.id} key={profile.id}>{profile.name} · {profile.category}</option>)}</select></>}<div className="form-actions"><button className="button-secondary" type="button" onClick={() => void respondToInvitation(invitation, "decline")}>Decline</button><button className="button-primary" type="button" disabled={!invitation.invitedProfileId && !representatives[invitation.token]} onClick={() => void respondToInvitation(invitation, "accept")}>Accept invitation</button></div></article>)}
    {alerts.length ? <div className="profile-post-list">{alerts.map((alert) => <article className={`profile-activity-item profile-alert-item${alert.readAt ? " is-read" : ""}`} key={alert.id}><div className="profile-post-meta">{new Date(alert.createdAt).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}{!alert.readAt && <span className="alert-unread-mark">Unread</span>}</div>{showProfileNames && <small className="profile-alert-profile-name">{profiles.find((profile) => profile.id === alert.profileId)?.name ?? "Profile"}</small>}<strong>{String(alert.payload.title ?? alert.kind)}</strong><p>{String(alert.payload.message ?? alert.payload.text ?? "You have a new update for this profile.")}</p>{!alert.readAt && <button className="text-action" type="button" onClick={() => void markRead(alert.id)}>Mark as read</button>}</article>)}</div> : !invitations.length && <p className="account-empty">No alerts for this profile yet.</p>}
  </>;
}