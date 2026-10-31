"use client";

import { useState } from "react";
import type { AccountDescription } from "@/lib/social";

const fields: Array<[string, string, string]> = [
  ["firstName", "First name", "text"],
  ["lastName", "Last name", "text"],
  ["nationalities", "Nationality", "text"],
  ["birthdate", "Birthdate", "date"],
  ["sex", "Sex", "select:Male|Female|Other"],
  ["relationshipStatus", "Relationship status", "select:Single|Married|In relationship|Open relationship|Complicated"],
  ["languages", "Languages", "text"],
  ["location", "Location", "text"],
  ["address", "Address", "text"],
  ["phone", "Phone", "tel"]
];

export function AccountDescriptionsEditor({ initialDescription, persistent }: { initialDescription: AccountDescription; persistent: boolean }) {
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
    setNotice("Account descriptions saved.");
    setSaving(false);
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
    {(error || notice) && <p className={error ? "form-error" : "save-notice"} role="status">{error || notice}</p>}
    <div className="description-save-bottom"><button className="button-primary" onClick={save} disabled={saving}>{saving ? "Saving…" : "Save account descriptions"}</button></div>
  </section>;
}
