"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { DeleteEntityButton } from "@/components/delete-entity-button";
import type { SocialCircle } from "@/lib/social";

export function SocialCircles({ initialCircles, ownedCircleIds, persistent, initialOwnerProfileId, hideSectionTitle = false }: { initialCircles: SocialCircle[]; ownedCircleIds: string[]; persistent: boolean; initialOwnerProfileId?: string; hideSectionTitle?: boolean }) {
  const [circles, setCircles] = useState(initialCircles);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [managingCircleId, setManagingCircleId] = useState("");
  const [members, setMembers] = useState<Array<{ id: string; name: string; avatar: string; category: string }>>([]);
  const [memberQuery, setMemberQuery] = useState("");
  const [memberResults, setMemberResults] = useState<Array<{ id: string; name: string; avatar: string; category: string }>>([]);
  const [memberError, setMemberError] = useState("");
  const [memberBusy, setMemberBusy] = useState(false);

  async function loadCircleMembers(circleId: string) {
    setMemberBusy(true);
    setMemberError("");
    const response = await fetch(`/api/social/circles/${encodeURIComponent(circleId)}/members`);
    const result = await response.json().catch(() => null);
    if (!response.ok) setMemberError(result?.error || "Members could not be loaded.");
    else setMembers(result.members ?? []);
    setMemberBusy(false);
  }

  async function searchCircleContacts(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!managingCircleId || memberQuery.trim().length < 2) return;
    setMemberBusy(true);
    setMemberError("");
    const response = await fetch(`/api/social/circles/${encodeURIComponent(managingCircleId)}/members?q=${encodeURIComponent(memberQuery.trim())}`);
    const result = await response.json().catch(() => null);
    if (!response.ok) setMemberError(result?.error || "Contacts could not be searched.");
    else setMemberResults(result.profiles ?? []);
    setMemberBusy(false);
  }

  async function updateCircleMember(circleId: string, profileId: string, method: "POST" | "DELETE") {
    setMemberBusy(true);
    setMemberError("");
    const response = await fetch(`/api/social/circles/${encodeURIComponent(circleId)}/members`, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ profileId }) });
    const result = await response.json().catch(() => null);
    if (!response.ok) setMemberError(result?.error || "Circle membership could not be updated.");
    else {
      await loadCircleMembers(circleId);
      setMemberResults((current) => current.filter((profile) => profile.id !== profileId));
      setCircles((current) => current.map((circle) => circle.id === circleId ? { ...circle, memberCount: circle.memberCount + (method === "POST" ? 1 : -1) } : circle));
    }
    setMemberBusy(false);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    setSaving(true);
    setError("");
    const response = await fetch("/api/social/circles", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: form.get("name"), kind: form.get("kind"), description: form.get("description"), visibility: form.get("visibility"), ownerProfileId: initialOwnerProfileId }) }).catch(() => null);
    const result = await response?.json().catch(() => null);
    if (!response?.ok) {
      setError(result?.error || "The circle could not be created.");
      setSaving(false);
      return;
    }
    setCircles((current) => [...current, result.circle]);
    formElement.reset();
    setOpen(false);
    setSaving(false);
  }

  return <>
    {!persistent && <p className="notice social-notice">New circles are temporary without DATABASE_URL.</p>}
    <div className={`social-section-heading${hideSectionTitle ? " circle-create-only" : ""}`}>{!hideSectionTitle && <div><p className="eyebrow">Shared spaces</p><h1>Your Circles</h1><p>Spaces for sharing posts by profile and relationship.</p></div>}<button className="button-primary" onClick={() => setOpen(!open)}>{open ? "Close" : "+ Create a circle"}</button></div>
    {open && <form className="social-compose-form circle-create-form" onSubmit={submit}><div className="social-form-row"><label>Circle name<input name="name" required minLength={2} maxLength={70} placeholder="e.g. Product team" /></label><label>Type<select name="kind"><option value="work">Work</option><option value="friends">Friends</option><option value="family">Family</option><option value="general">General</option></select></label></div><label>Description<textarea name="description" maxLength={300} placeholder="What is this circle for?" /></label><div className="social-form-row"><label>Visibility<select name="visibility"><option value="private">Private · members only</option><option value="public">Public</option></select></label><div className="circle-form-action"><button className="button-primary" disabled={saving}>{saving ? "Creating…" : "Create circle"}</button></div></div>{error && <p className="form-error" role="alert">{error}</p>}</form>}
    <div className="circle-directory">{circles.map((circle) => <article className="circle-directory-card" key={circle.id}><div className="circle-directory-top"><span className="circle-large-initial">{circle.name.slice(0, 1)}</span><span className="visibility-mark">{circle.visibility === "public" ? "Public" : "Private"}</span></div><p className="eyebrow">{circle.kind} · {circle.locationMode}</p><h2>{circle.name}</h2><p>{circle.description}</p><div className="circle-card-footer"><span>{circle.memberCount} contacts</span><Link href={`/social?circle=${encodeURIComponent(circle.id)}`}>View feed →</Link></div>{ownedCircleIds.includes(circle.ownerProfileId) && <div className="circle-owner-actions"><button className="button-secondary" type="button" aria-expanded={managingCircleId === circle.id} onClick={() => { const nextId = managingCircleId === circle.id ? "" : circle.id; setManagingCircleId(nextId); setMemberResults([]); setMemberQuery(""); if (nextId) void loadCircleMembers(nextId); }}>{managingCircleId === circle.id ? "Close contacts" : "Manage contacts"}</button><DeleteEntityButton endpoint={`/api/social/circles/${encodeURIComponent(circle.id)}`} label="Delete Circle" confirmation={`Delete ${circle.name} and its Circle posts and debates? This cannot be undone.`} iconOnly onDeleted={() => setCircles((current) => current.filter((item) => item.id !== circle.id))} /></div>}{managingCircleId === circle.id && <section className="circle-contact-manager"><p>Only you can see this list. Contacts see shared posts without learning this Circle&apos;s name.</p><div className="circle-contact-list">{members.map((member) => <div className="circle-contact-row" key={member.id}><span className="social-avatar">{member.avatar}</span><span><strong>{member.name}</strong><small>{member.category}</small></span>{member.id === circle.ownerProfileId ? <small>Owner</small> : <button type="button" className="text-action" disabled={memberBusy} onClick={() => void updateCircleMember(circle.id, member.id, "DELETE")}>Remove</button>}</div>)}</div><form className="circle-contact-search" onSubmit={searchCircleContacts}><label>Find one of your profiles or a direct contact<input value={memberQuery} onChange={(event) => setMemberQuery(event.target.value)} minLength={2} placeholder="Search by profile name" /></label><button className="button-secondary" disabled={memberBusy || memberQuery.trim().length < 2}>Search</button></form>{memberResults.map((profile) => <div className="circle-contact-row" key={profile.id}><span className="social-avatar">{profile.avatar}</span><span><strong>{profile.name}</strong><small>{profile.category}</small></span><button type="button" className="text-action" disabled={memberBusy} onClick={() => void updateCircleMember(circle.id, profile.id, "POST")}>Add</button></div>)}{memberError && <p className="form-error" role="alert">{memberError}</p>}</section>}</article>)}</div>
  </>;
}
