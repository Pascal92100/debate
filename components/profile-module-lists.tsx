"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { DeleteEntityButton } from "@/components/delete-entity-button";
import { ProfileSearchBuilder } from "@/components/profile-search-builder";
import type { ProfileEvent, SavedProfileSearch } from "@/lib/profile-modules";
import { descriptionThemes } from "@/lib/profile-description-taxonomy";
import type { SocialProfile } from "@/lib/social";

function searchDescription(search: SavedProfileSearch) {
  const criteria = search.criteria;
  const what = String(criteria.what ?? "Profiles");
  const parts = [what];
  if (what === "Profiles") {
    const goals = Array.isArray(criteria.descriptionGoals) ? criteria.descriptionGoals.map(String) : [];
    if (goals.length) parts.push(goals.join(", "));
    const descriptionThemes = Array.isArray(criteria.descriptionThemes) ? criteria.descriptionThemes.map(String) : [];
    const descriptionTags = Array.isArray(criteria.descriptionTags) ? criteria.descriptionTags.map(String) : [];
    if (descriptionThemes.length) parts.push(descriptionThemes.map((id) => descriptionThemesCatalogLabel(id)).join(", "));
    if (descriptionTags.length) parts.push(descriptionTags.slice(0, 3).map(descriptionTagLabel).join(", ") + (descriptionTags.length > 3 ? ` +${descriptionTags.length - 3}` : ""));
  }
  if (Array.isArray(criteria.themes) && criteria.themes.length) parts.push((criteria.themes as string[]).join(", "));
  if (typeof criteria.keywords === "string" && criteria.keywords.trim()) parts.push(criteria.keywords.trim());
  return parts.join(" · ");
}

function descriptionThemesCatalogLabel(id: string) {
  return descriptionThemes.find((theme) => theme.id === id)?.label ?? id;
}

function descriptionTagLabel(value: string) {
  const [themeId, ...parts] = value.split(":");
  const theme = descriptionThemes.find((item) => item.id === themeId);
  if (parts.length > 1) {
    const field = theme?.fields.find(([id]) => id === parts[0])?.[1] ?? parts[0];
    return `${field}: ${parts.slice(1).join(":")}`;
  }
  return parts[0] ?? value;
}

export function ProfileModuleLists({ profile, kind, initialSearches = [], initialEvents = [], descriptionGoals = ["friends"], availableThemeIds = [] }: { profile: SocialProfile; kind: "searches" | "events"; initialSearches?: SavedProfileSearch[]; initialEvents?: ProfileEvent[]; descriptionGoals?: string[]; availableThemeIds?: string[] }) {
  const [searches, setSearches] = useState(initialSearches);
  const [events, setEvents] = useState(initialEvents);
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [deletingSearchId, setDeletingSearchId] = useState("");
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

  async function deleteSearch(search: SavedProfileSearch) {
    setError("");
    setDeletingSearchId(search.id);
    const response = await fetch(`/api/social/profiles/${encodeURIComponent(profile.id)}/searches?id=${encodeURIComponent(search.id)}`, { method: "DELETE" }).catch(() => null);
    const result = await response?.json().catch(() => null);
    if (!response?.ok) {
      setError(result?.error || "The saved search could not be deleted.");
      setDeletingSearchId("");
      return;
    }
    setSearches((current) => current.filter((item) => item.id !== search.id));
    setDeletingSearchId("");
  }

  return <>
    <div className="profile-section-toolbar"><p>{isSearch ? "Save the filters you use to find profiles and content." : "Upcoming and past events created by this profile."}</p><button className="button-primary" type="button" onClick={() => setCreating((current) => !current)}>{creating ? "Cancel" : isSearch ? "+ New search" : "+ Create event"}</button></div>
    {creating && isSearch && <ProfileSearchBuilder profileId={profile.id} descriptionGoals={descriptionGoals} availableThemeIds={availableThemeIds} onSaved={(search) => { setSearches((current) => [search, ...current]); setCreating(false); }} />}
    {creating && !isSearch && <form className="social-compose-form profile-module-form" onSubmit={submit}><label>Event title<input name="title" required minLength={2} placeholder="Event name" /></label><div className="social-form-row"><label>Date and time<input name="startsAt" type="datetime-local" /></label><label>Location<input name="location" placeholder="Online or a place" /></label></div><label>Description<textarea name="description" placeholder="What is happening?" /></label>{error && <p className="form-error" role="alert">{error}</p>}<button className="button-primary" disabled={busy}>{busy ? "Saving…" : "Create event"}</button></form>}
    {isSearch && error && !creating && <p className="form-error" role="alert">{error}</p>}
    {isSearch ? searches.length ? <div className="profile-post-list">{searches.map((search) => <article className="profile-activity-item saved-search-item" key={search.id}><strong>{search.name}</strong><p>{searchDescription(search)}</p><small>Saved {new Date(search.updatedAt).toLocaleDateString("en-US")}</small><div className="saved-search-actions"><Link className="button-secondary" href={`/circle/profiles/${encodeURIComponent(profile.id)}/searches/${encodeURIComponent(search.id)}`}>View results</Link><button className="button-icon-danger" type="button" aria-label={`Delete search ${search.name}`} title="Delete search" disabled={Boolean(deletingSearchId)} onClick={() => void deleteSearch(search)}>{deletingSearchId === search.id ? "…" : "🗑"}</button></div></article>)}</div> : <p className="account-empty">No saved searches for this profile yet.</p>
      : events.length ? <div className="profile-post-list">{events.map((item) => <article className="profile-activity-item" key={item.id}><div className="profile-post-meta">{item.startsAt ? new Date(item.startsAt).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" }) : "Date to be announced"}{item.location && ` · ${item.location}`}</div><strong>{item.title}</strong><p>{item.description}</p><DeleteEntityButton endpoint={`/api/social/profiles/${encodeURIComponent(profile.id)}/events?id=${encodeURIComponent(item.id)}`} label="Delete event" confirmation={`Delete the event “${item.title}”?`} iconOnly onDeleted={() => setEvents((current) => current.filter((event) => event.id !== item.id))} /></article>)}</div> : <p className="account-empty">No events created by this profile yet.</p>}
  </>;
}