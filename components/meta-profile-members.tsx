"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { InviteSearchResult, MetaProfileMember } from "@/lib/meta-profile-invitations";

export function MetaProfileMembers({ metaProfileId, members, canInvite, viewerProfileId, returnTo }: { metaProfileId: string; members: MetaProfileMember[]; canInvite: boolean; viewerProfileId?: string; returnTo?: string }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<InviteSearchResult[]>([]);
  const [busyProfileId, setBusyProfileId] = useState("");
  const [link, setLink] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [leavingProfileId, setLeavingProfileId] = useState("");

  useEffect(() => {
    const normalized = query.trim();
    if (normalized.length < 2) {
      setResults([]);
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(() => {
      fetch(`/api/social/profiles/search?q=${encodeURIComponent(normalized)}&viewerProfileId=${encodeURIComponent(metaProfileId)}`, { signal: controller.signal })
        .then(async (response) => response.ok ? response.json() : { profiles: [] })
        .then((result) => setResults(result.profiles as InviteSearchResult[]))
        .catch(() => { if (!controller.signal.aborted) setError("Profile search is unavailable."); });
    }, 180);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [query]);

  async function createInvite(profileId?: string) {
    setBusyProfileId(profileId ?? "link");
    setError("");
    setNotice("");
    const response = await fetch(`/api/social/profiles/${encodeURIComponent(metaProfileId)}/invitations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(profileId ? { profileId } : {})
    }).catch(() => null);
    const result = await response?.json().catch(() => null);
    if (!response?.ok) {
      setError(result?.error || "The invitation could not be created.");
      setBusyProfileId("");
      return;
    }
    if (profileId) {
      setNotice("Invitation sent to that profile's alerts.");
      setResults((current) => current.filter((profile) => profile.id !== profileId));
    } else {
      setLink(result.inviteUrl as string);
      setNotice("Invitation link created. Share it with the person you want to invite.");
    }
    setBusyProfileId("");
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(link);
      setNotice("Invitation link copied.");
    } catch {
      setNotice("Select and copy the invitation link.");
    }
  }

  async function leave(member: MetaProfileMember) {
    if (!window.confirm(`Remove ${member.name} from this meta-profile? If it has no other members, the meta-profile will be deleted.`)) return;
    setLeavingProfileId(member.id);
    setError("");
    const response = await fetch(`/api/social/profiles/${encodeURIComponent(metaProfileId)}/members/${encodeURIComponent(member.id)}`, { method: "DELETE" }).catch(() => null);
    const result = await response?.json().catch(() => null);
    if (!response?.ok) {
      setError(result?.error || "Could not leave this meta-profile.");
      setLeavingProfileId("");
      return;
    }
    if (result.deletedMetaProfile) {
      window.location.assign("/circle/meta-profiles");
      return;
    }
    window.dispatchEvent(new Event("circles:profile-membership-updated"));
    window.location.reload();
  }

  function memberHref(memberId: string) {
    const params = new URLSearchParams({ view: "public" });
    if (viewerProfileId) params.set("from", viewerProfileId);
    if (returnTo) params.set("returnTo", returnTo);
    return `/circle/profiles/${encodeURIComponent(memberId)}?${params.toString()}`;
  }

  return <section className="profile-members">
    <div className="account-section-heading"><div><p className="eyebrow">Meta-profile</p><h2>Members</h2></div><span>{members.length}</span></div>
    {members.length ? <div className="account-profile-list">{members.map((member) => <div className="account-profile-row" key={member.id}><Link className="meta-profile-member-link" href={memberHref(member.id)}><span className="social-avatar">{member.avatar}</span><span><strong>{member.name}</strong><small>{member.category}</small></span></Link><span className="profile-member-role">{member.category}</span>{member.isOwn && <button className="text-action meta-member-leave" type="button" disabled={Boolean(leavingProfileId)} onClick={() => void leave(member)}>{leavingProfileId === member.id ? "Leaving…" : "Leave"}</button>}</div>)}</div> : <p className="account-empty">No members have joined yet.</p>}
    {canInvite && <div className="meta-profile-invite">
      <h3>Invite a profile</h3>
      <label htmlFor="meta-profile-search">Search by pseudonym</label>
      <input id="meta-profile-search" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Type at least two characters" autoComplete="off" />
      {results.length > 0 && <ul className="meta-profile-search-results">{results.map((profile) => <li key={profile.id}><span><strong>{profile.name}</strong><small>{profile.category}</small></span><button className="button-secondary" type="button" disabled={Boolean(busyProfileId)} onClick={() => void createInvite(profile.id)}>{busyProfileId === profile.id ? "Sending…" : "Invite"}</button></li>)}</ul>}
      {query.trim().length >= 2 && results.length === 0 && <p className="field-hint">No visible profiles match this search.</p>}
      <button className="button-secondary" type="button" disabled={Boolean(busyProfileId)} onClick={() => void createInvite()}>{busyProfileId === "link" ? "Creating link…" : "Create invitation link"}</button>
      {link && <div className="meta-profile-invite-link"><input aria-label="Invitation link" readOnly value={link} /><button className="button-secondary" type="button" onClick={() => void copyLink()}>Copy link</button></div>}
      {notice && <p className="save-notice" role="status">{notice}</p>}
      {error && <p className="form-error" role="alert">{error}</p>}
    </div>}
  </section>;
}
