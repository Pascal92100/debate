"use client";

import { FormEvent, useState } from "react";
import { DeleteEntityButton } from "@/components/delete-entity-button";
import type { ProfileEvent, SavedProfileSearch } from "@/lib/profile-modules";
import type { SocialProfile } from "@/lib/social";

export function ProfileModuleLists({ profile, kind, initialSearches = [], initialEvents = [] }: { profile: SocialProfile; kind: "searches" | "events"; initialSearches?: SavedProfileSearch[]; initialEvents?: ProfileEvent[] }) {
  const [searches, setSearches] = useState(initialSearches);
  const [events, setEvents] = useState(initialEvents);
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const isSearch = kind === "searches";

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setBusy(true);
    setError("");
    const body = isSearch
      ? { name: data.get("name"), criteria: { what: data.get("what"), keywords: data.get("keywords"), theme: data.get("theme") } }
      : { title: data.get("title"), description: data.get("description"), startsAt: data.get("startsAt") ? new Date(String(data.get("startsAt"))).toISOString() : null, location: data.get("location") };
    const response = await fetch(`/api/social/profiles/${encodeURIComponent(profile.id)}/${kind}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).catch(() => null);
    const result = await response?.json().catch(() => null);
    if (!response?.ok) {
      setError(result?.error || `The ${isSearch ? "search" : "event"} could not be saved.`);
      setBusy(false);
      return;
    }
    if (isSearch) setSearches((current) => [result.search as SavedProfileSearch, ...current]);
    else setEvents((current) => [...current, result.event as ProfileEvent].sort((a, b) => (a.startsAt ?? a.createdAt).localeCompare(b.startsAt ?? b.createdAt)));
    form.reset();
    setCreating(false);
    setBusy(false);
  }

  return <>
    <div className="profile-section-toolbar"><p>{isSearch ? "Save the filters you use to find profiles and content." : "Upcoming and past events created by this profile."}</p><button className="button-primary" type="button" onClick={() => setCreating((current) => !current)}>{creating ? "Cancel" : isSearch ? "+ New search" : "+ Create event"}</button></div>
    {creating && <form className="social-compose-form profile-module-form" onSubmit={submit}>
      {isSearch ? <><label>Search name<input name="name" required minLength={2} placeholder="e.g. Culture near me" /></label><div className="social-form-row"><label>What<select name="what"><option>Profiles</option><option>Forums</option><option>Publications</option><option>Debates / discussions</option><option>Messages</option></select></label><label>Theme<select name="theme"><option>Any theme</option><option>Politics / society</option><option>Culture / entertainment</option><option>Sport</option><option>Science / health</option><option>Economy / work / tech</option><option>Lifestyle / ideas</option><option>Other</option></select></label></div><label>Keywords<input name="keywords" placeholder="Optional keywords" /></label></> : <><label>Event title<input name="title" required minLength={2} placeholder="Event name" /></label><div className="social-form-row"><label>Date and time<input name="startsAt" type="datetime-local" /></label><label>Location<input name="location" placeholder="Online or a place" /></label></div><label>Description<textarea name="description" placeholder="What is happening?" /></label></>}
      {error && <p className="form-error" role="alert">{error}</p>}
      <button className="button-primary" disabled={busy}>{busy ? "Saving…" : isSearch ? "Save search" : "Create event"}</button>
    </form>}
    {isSearch ? searches.length ? <div className="profile-post-list">{searches.map((search) => <article className="profile-activity-item" key={search.id}><strong>{search.name}</strong><p>{String(search.criteria.what ?? "Profiles")} · {String(search.criteria.theme ?? "Any theme")}{search.criteria.keywords ? ` · ${String(search.criteria.keywords)}` : ""}</p><small>Saved {new Date(search.updatedAt).toLocaleDateString("en-US")}</small><DeleteEntityButton endpoint={`/api/social/profiles/${encodeURIComponent(profile.id)}/searches?id=${encodeURIComponent(search.id)}`} label="Delete search" confirmation={`Delete the saved search “${search.name}”?`} onDeleted={() => setSearches((current) => current.filter((item) => item.id !== search.id))} /></article>)}</div> : <p className="account-empty">No saved searches for this profile yet.</p>
      : events.length ? <div className="profile-post-list">{events.map((item) => <article className="profile-activity-item" key={item.id}><div className="profile-post-meta">{item.startsAt ? new Date(item.startsAt).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" }) : "Date to be announced"}{item.location && ` · ${item.location}`}</div><strong>{item.title}</strong><p>{item.description}</p><DeleteEntityButton endpoint={`/api/social/profiles/${encodeURIComponent(profile.id)}/events?id=${encodeURIComponent(item.id)}`} label="Delete event" confirmation={`Delete the event “${item.title}”?`} onDeleted={() => setEvents((current) => current.filter((event) => event.id !== item.id))} /></article>)}</div> : <p className="account-empty">No events created by this profile yet.</p>}
  </>;
}