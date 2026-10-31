"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { AccountDescription } from "@/lib/social";
import { descriptionThemes, relationshipStatusOptions } from "@/components/profile-descriptions-editor";

const fields: Array<[string, string, string]> = [
  ["firstName", "First name", "text"],
  ["lastName", "Last name", "text"],
  ["nationalities", "Nationality", "text"],
  ["birthdate", "Birthdate", "date"],
  ["sex", "Sex", "select:Male|Female|Other"],
  ["relationshipStatus", "Relationship status", `select:${relationshipStatusOptions.join("|")}`],
  ["languages", "Languages", "text"],
  ["location", "Location", "text"],
  ["address", "Address", "text"],
  ["phone", "Phone", "tel"]
];

export function AccountDescriptionsEditor({ initialDescription, persistent }: { initialDescription: AccountDescription; persistent: boolean }) {
  const router = useRouter();
  const [description, setDescription] = useState(initialDescription);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  function updateField(key: string, patch: Partial<AccountDescription["fields"][string]>) {
    setDescription((current) => ({
      ...current,
      fields: { ...current.fields, [key]: { ...(current.fields[key] ?? { value: "", enabled: false }), ...patch } }
    }));
  }

  function updateTheme(themeId: string, update: (theme: NonNullable<AccountDescription["themes"][string]>) => NonNullable<AccountDescription["themes"][string]>) {
    setDescription((current) => {
      const previous = current.themes[themeId] ?? { enabled: false, description: "", fields: {}, fieldStates: {}, tags: [] };
      return { ...current, themes: { ...current.themes, [themeId]: update(previous) } };
    });
  }

  async function save() {
    setSaving(true);
    setError("");
    setNotice("");
    const response = await fetch("/api/account/descriptions", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(description)
    }).catch(() => null);
    const result = await response?.json().catch(() => null);
    if (!response?.ok) {
      setError(result?.error ?? "Account descriptions could not be saved.");
      setSaving(false);
      return;
    }
    setDescription(result.description);
    setSaving(false);
    const referrer = document.referrer;
    if (referrer && new URL(referrer).origin === window.location.origin) router.back();
    else router.push("/circle");
  }

  return <section className="description-editor">
    {!persistent && <p className="notice social-notice">Demo data: changes remain in memory until the server restarts.</p>}
    <header className="description-editor-heading"><div><p className="eyebrow">Circle · private account</p><h2>Account Descriptions</h2><p>These details belong to your private account and are not displayed as a public profile.</p></div><button className="button-primary" onClick={save} disabled={saving}>{saving ? "Saving…" : "Save"}</button></header>
    <section className="description-section"><header className="description-section-header"><div><span className="description-section-icon">✎</span><div><h3>Text Description</h3></div></div></header><textarea className="description-textarea" value={description.text} onChange={(event) => setDescription((current) => ({ ...current, text: event.target.value }))} placeholder="Write your personal account description…" /></section>
    <section className="description-section"><header className="description-section-header"><div><span className="description-section-icon">◉</span><div><h3>Identity</h3><p>Switch each field on or off for use by your profiles.</p></div></div></header>
      <div className="identity-fields">{fields.map(([key, label, type]) => {
        const field = description.fields[key] ?? { value: "", enabled: false };
        const selectOptions = type.startsWith("select:") ? type.slice(7).split("|") : null;
        return <label className={`identity-field${field.enabled ? "" : " is-disabled"}`} key={key}>
          <span>{label}</span>
          {selectOptions ? <select value={field.value} disabled={!field.enabled} onChange={(event) => updateField(key, { value: event.target.value })}><option value="">Choose…</option>{selectOptions.map((option) => <option value={option} key={option}>{option}</option>)}</select> : <input type={type} value={field.value} disabled={!field.enabled} onChange={(event) => updateField(key, { value: event.target.value })} />}
          <input className="field-visibility-toggle" type="checkbox" aria-label={`Enable ${label}`} checked={field.enabled} onChange={(event) => updateField(key, { enabled: event.target.checked })} />
        </label>;
      })}</div>
    </section>
    <div className="description-theme-list account-reusable-themes">
      <div className="account-section-heading"><div><p className="eyebrow">Private library</p><h2>Reusable theme descriptions</h2></div><span>Nothing is copied to a profile until you choose to import it.</span></div>
      {descriptionThemes.filter((theme) => !["kinky", "sexo"].includes(theme.id)).map((theme) => {
        const data = description.themes[theme.id] ?? { enabled: false, description: "", fields: {}, fieldStates: {}, tags: [] };
        return <details className="description-theme" key={theme.id}>
          <summary><span className="theme-summary-title">{theme.label}</span><span className={`theme-switch-mark${data.enabled ? " enabled" : ""}`}>{data.enabled ? "Available to import" : "Private / off"}</span></summary>
          <div className="description-theme-body">
            <label className="theme-enable-control"><input type="checkbox" checked={data.enabled} onChange={(event) => updateTheme(theme.id, (current) => ({ ...current, enabled: event.target.checked }))} /> Make this theme available for manual profile import</label>
            <label className="description-field-label">Description<textarea value={data.description} onChange={(event) => updateTheme(theme.id, (current) => ({ ...current, description: event.target.value }))} placeholder={`${theme.label} description…`} /></label>
            {theme.fields.length > 0 && <div className="theme-standard-fields">{theme.fields.map(([fieldKey, fieldLabel]) => {
              const value = data.fields[fieldKey];
              const enabled = data.fieldStates?.[fieldKey] ?? (value !== undefined && value !== "");
              return <div className="theme-field-group" key={fieldKey}>
                <label className={`theme-standard-field${enabled ? "" : " is-disabled"}`}>
                  <span>{fieldLabel}</span><input type="text" value={String(value ?? "")} disabled={!enabled} onChange={(event) => updateTheme(theme.id, (current) => ({ ...current, fields: { ...current.fields, [fieldKey]: event.target.value } }))} />
                  <input type="checkbox" aria-label={`Include ${fieldLabel} when importing`} checked={enabled} onChange={(event) => updateTheme(theme.id, (current) => ({ ...current, fieldStates: { ...current.fieldStates, [fieldKey]: event.target.checked } }))} />
                </label>
                {enabled && theme.fieldTags?.[fieldKey] && <fieldset className="description-tags culture-subtags"><legend>{fieldLabel} tags</legend><div>{theme.fieldTags[fieldKey].map((tag) => {
                  const storedTag = `culture:${fieldKey}:${tag}`;
                  return <label className={`description-tag${data.tags.includes(storedTag) ? " selected" : ""}`} key={tag}><input type="checkbox" checked={data.tags.includes(storedTag)} onChange={(event) => updateTheme(theme.id, (current) => ({ ...current, tags: event.target.checked ? [...new Set([...current.tags, storedTag])] : current.tags.filter((item) => item !== storedTag) }))} /><span>{tag}</span></label>;
                })}</div></fieldset>}
              </div>;
            })}</div>}
            {theme.tags.length > 0 && <fieldset className="description-tags"><legend>Tags</legend><div>{theme.tags.map((tag) => <label className={`description-tag${data.tags.includes(tag) ? " selected" : ""}`} key={tag}><input type="checkbox" checked={data.tags.includes(tag)} onChange={(event) => updateTheme(theme.id, (current) => ({ ...current, tags: event.target.checked ? [...new Set([...current.tags, tag])] : current.tags.filter((item) => item !== tag) }))} /><span>{tag}</span></label>)}</div><label className="custom-tags-field">Other tags<textarea value={(data.fields.customTags as string) ?? ""} onChange={(event) => updateTheme(theme.id, (current) => ({ ...current, fields: { ...current.fields, customTags: event.target.value } }))} placeholder="Add tags separated by commas" /></label></fieldset>}
          </div>
        </details>;
      })}
    </div>
    {(error || notice) && <p className={error ? "form-error" : "save-notice"} role="status">{error || notice}</p>}
    <div className="description-save-bottom"><button className="button-primary" onClick={save} disabled={saving}>{saving ? "Saving…" : "Save account descriptions"}</button></div>
  </section>;
}
