"use client";

import { useState } from "react";
import type { DescriptionField, ProfileDescription, SocialProfile } from "@/lib/social";

type ThemeDefinition = {
  id: string;
  label: string;
  fields: Array<[string, string]>;
  tags: string[];
};

const identityFields: Array<[string, string, string]> = [
  ["firstName", "Prénom / pseudo", "text"],
  ["lastName", "Nom", "text"],
  ["nationalities", "Nationalité(s)", "text"],
  ["birthdate", "Date de naissance", "date"],
  ["sex", "Sexe", "text"],
  ["relationshipStatus", "Situation", "text"],
  ["languages", "Langues parlées", "text"],
  ["location", "Localisation", "text"]
];

const themes: ThemeDefinition[] = [
  { id: "physical", label: "Physique", fields: [["height", "Taille"], ["weight", "Poids"], ["bodyShape", "Silhouette"], ["eyes", "Yeux"], ["hair", "Cheveux"], ["origins", "Origines"], ["smoker", "Fumeur"]], tags: [] },
  { id: "culture", label: "Culture", fields: [["architecture", "Architecture"], ["sculpture", "Sculpture"], ["painting", "Peinture"], ["music", "Musique"], ["literature", "Littérature"], ["theatre", "Théâtre"], ["cinema", "Cinéma"], ["series", "Séries"], ["media", "Médias"], ["comics", "BD / comics"], ["videoGames", "Jeux vidéo"], ["sciences", "Sciences"], ["other", "Autres"]], tags: [] },
  { id: "professional", label: "Professionnel", fields: [], tags: ["manager", "individual contributor", "freelance", "entrepreneur", "remote", "hybrid", "onsite", "tech", "creative", "consulting", "non-profit", "public sector", "education", "healthcare", "finance", "early career", "mid-career", "senior", "executive"] },
  { id: "political", label: "Politique / économie", fields: [], tags: ["left", "center-left", "center", "center-right", "right", "liberal", "conservative", "libertarian", "ecologist", "social-democrat", "socialist", "anarchist", "capitalist", "anti-capitalist", "pro-EU", "eurosceptic", "globalist", "localist", "apolitical"] },
  { id: "sport", label: "Sport", fields: [], tags: ["sedentary", "beginner", "regular", "intense", "outdoor", "indoor", "team sports", "individual sports", "running", "cycling", "swimming", "fitness", "yoga", "combat sports", "ball sports", "mountain", "water sports", "competition", "just for fun"] },
  { id: "spirituality", label: "Spiritualité", fields: [], tags: ["atheist", "agnostic", "spiritual but not religious", "religious", "christian", "muslim", "jewish", "buddhist", "hindu", "other religion", "meditation", "mindfulness", "energy work", "esoteric", "rituals", "philosophy-oriented", "questioning", "practicing", "non-practicing"] },
  { id: "psycho", label: "Psycho", fields: [], tags: ["adaptable", "affectionate", "ambitious", "ambivert", "analytical", "anxious", "assertive", "attentive", "calm", "chaotic", "confident", "creative", "curious", "dreamer", "emotional", "empathetic", "extrovert", "flexible", "grounded", "humorous", "idealistic", "independent", "introvert", "intuitive", "loyal", "mindful", "open-minded", "organized", "patient", "perfectionist", "playful", "pragmatic", "protective", "rational", "realistic", "reserved", "sensitive", "serious", "shy", "spontaneous", "stubborn", "deep talks", "intimate talks", "professional talks", "small talks"] },
  { id: "sexo", label: "Sexo", fields: [["desire", "Niveau de désir"], ["modesty", "Pudeur"], ["communication", "Communication"], ["touch", "Tactile"]], tags: ["straight", "bi", "demi", "alter", "asexual", "homo", "pan", "sapio", "skolio", "monogamy", "non-monogamy", "polyamory", "exclusive", "open"] },
  { id: "kinky", label: "Kinky · goûts et limites", fields: [["desireLevel", "Niveau de désir"], ["modesty", "Pudeur"], ["communication", "Communication"], ["touch", "Tactile"]], tags: ["Soft", "BDSM", "Roleplay", "Switch", "Dom", "Sub"] }
];

const relationships = [
  ["friends", "Friends"], ["professional", "Professional"], ["oldfriends", "Old friends"], ["socializing", "Socializing"], ["friendship", "For friendship"], ["love", "For love"], ["casual", "For casual"], ["undecided", "Undecided"], ["casualfun", "For casual fun"]
];
const activationDurations = [["permanent", "Permanent"], ["1h", "1 heure"], ["1d", "1 jour"], ["1w", "1 semaine"]] as const;

const themeAccess: Record<string, string[]> = {
  friends: [],
  professional: ["professional"],
  oldfriends: ["professional"],
  socializing: ["culture", "political", "professional", "sexo"],
  friendship: ["culture"],
  love: ["physical", "culture", "psycho"],
  casual: ["physical"],
  undecided: ["physical", "culture", "psycho"],
  casualfun: ["physical", "sexo", "kinky"]
};

function defaultDescription(profile: SocialProfile): ProfileDescription {
  const values: Record<string, string> = {
    firstName: profile.firstName ?? profile.name,
    lastName: profile.lastName ?? "",
    nationalities: profile.nationalities?.join(", ") ?? "",
    birthdate: profile.birthdate ?? "",
    sex: profile.sex ?? "",
    relationshipStatus: profile.relationshipStatus ?? "",
    languages: profile.languages?.join(", ") ?? "",
    location: profile.location ?? ""
  };
  const identity = Object.fromEntries(Object.entries(values).map(([key, value]) => [key, { value, enabled: Boolean(value) }]));
  return { profileId: profile.id, visibility: "ghost", relationship: profile.relationship ?? "friends", text: profile.bio ?? "", textEnabled: Boolean(profile.bio), identity, themes: {} };
}

export function ProfileDescriptionsEditor({ profile, initialDescription, persistent }: { profile: SocialProfile; initialDescription: ProfileDescription | null; persistent: boolean }) {
  const [document, setDocument] = useState<ProfileDescription>(initialDescription ?? defaultDescription(profile));
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const allowedThemes = new Set(themeAccess[document.relationship] ?? []);
  const isIndividual = profile.kind === "individual";

  function updateIdentity(key: string, patch: Partial<DescriptionField>) {
    setDocument((current) => ({
      ...current,
      identity: {
        ...current.identity,
        [key]: { ...(current.identity[key] ?? { value: "", enabled: false }), ...patch }
      }
    }));
  }

  function updateTheme(themeId: string, update: (theme: ProfileDescription["themes"][string]) => ProfileDescription["themes"][string]) {
    setDocument((current) => {
      const currentTheme = current.themes[themeId] ?? { enabled: false, description: "", fields: {}, fieldStates: {}, tags: [] };
      return { ...current, themes: { ...current.themes, [themeId]: update(currentTheme) } };
    });
  }

  async function save() {
    setSaving(true);
    setError("");
    setNotice("");
    const response = await fetch(`/api/social/profiles/${encodeURIComponent(profile.id)}/descriptions`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(document)
    }).catch(() => null);
    const result = await response?.json().catch(() => null);
    if (!response?.ok) {
      setError(result?.error || "La description n’a pas pu être enregistrée.");
      setSaving(false);
      return;
    }
    setDocument(result.description);
    setNotice("Descriptions enregistrées.");
    setSaving(false);
  }

  return (
    <section className="description-editor">
      {!persistent && <p className="notice social-notice">Données d’exemple : les modifications restent en mémoire jusqu’au redémarrage du serveur.</p>}
      <header className="description-editor-heading">
        <div><p className="eyebrow">Profil · {profile.name}</p><h2>Descriptions</h2><p>Chaque élément est facultatif. Les informations du compte peuvent être remplacées pour ce profil.</p></div>
        <button className="button-primary" onClick={save} disabled={saving}>{saving ? "Enregistrement…" : "Enregistrer"}</button>
      </header>

      <section className="description-section">
        <header className="description-section-header"><div><span className="description-section-icon">✎</span><div><h3>Description textuelle</h3><p>Présentation générale de ce profil</p></div></div><div className="description-activation"><label className="switch-control"><input type="checkbox" checked={document.textEnabled} onChange={(event) => setDocument((current) => ({ ...current, textEnabled: event.target.checked }))} /><span>{document.textEnabled ? "Activée" : "Désactivée"}</span></label><select aria-label="Durée d’activation de la description textuelle" value={document.textDuration ?? "permanent"} disabled={!document.textEnabled} onChange={(event) => setDocument((current) => ({ ...current, textDuration: event.target.value }))}>{activationDurations.map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></div></header>
        <textarea className="description-textarea" value={document.text} disabled={!document.textEnabled} onChange={(event) => setDocument((current) => ({ ...current, text: event.target.value }))} placeholder="Écrire une description…" />
      </section>

      {isIndividual && <section className="description-section">
        <header className="description-section-header"><div><span className="description-section-icon">◉</span><div><h3>Identité</h3><p>Profil individuel · chaque donnée peut être masquée</p></div></div></header>
        <div className="identity-fields">
          {identityFields.map(([key, label, type]) => {
            const field = document.identity[key] ?? { value: "", enabled: false };
            return <label className={`identity-field${field.enabled ? "" : " is-disabled"}`} key={key}>
              <span>{label}</span>
              <input type={type} value={field.value} onChange={(event) => updateIdentity(key, { value: event.target.value })} disabled={!field.enabled} />
              <input className="field-visibility-toggle" type="checkbox" aria-label={`Afficher ${label}`} checked={field.enabled} onChange={(event) => updateIdentity(key, { enabled: event.target.checked })} />
              <select aria-label={`Durée d’affichage de ${label}`} value={field.duration ?? "permanent"} disabled={!field.enabled} onChange={(event) => updateIdentity(key, { duration: event.target.value })}>{activationDurations.map(([value, durationLabel]) => <option value={value} key={value}>{durationLabel}</option>)}</select>
            </label>;
          })}
        </div>
      </section>}

      <section className="description-section visibility-section">
        <header className="description-section-header"><div><span className="description-section-icon">◉</span><div><h3>Visibilité dans les recherches</h3><p>Les thèmes ne sont exposés dans les recherches que selon cette visibilité</p></div></div></header>
        <div className="visibility-options">
          {[["ghost", "Ghost", "For no one"], ["relatives", "Relatives", "Correspondance exacte du pseudo/lien uniquement"], ["other", "Other", "Visible selon le type de relation choisi"]].map(([value, label, detail]) => <label className={`visibility-option${document.visibility === value ? " selected" : ""}`} key={value}>
            <input type="radio" name="profile-visibility" checked={document.visibility === value} onChange={() => setDocument((current) => ({ ...current, visibility: value as ProfileDescription["visibility"] }))} />
            <span><strong>{label}</strong><small>{detail}</small></span>
          </label>)}
        </div>
        {document.visibility === "other" && <div className="relationship-picker"><p>Type de relation</p><div>{relationships.map(([value, label]) => <button type="button" className={document.relationship === value ? "selected" : ""} key={value} onClick={() => setDocument((current) => ({ ...current, relationship: value }))}>{label}</button>)}</div><small>Les thèmes disponibles dépendent de ce choix. Sexo apparaît à partir de Socializing ; Kinky à partir de For casual fun.</small></div>}
        {document.visibility !== "other" && <p className="visibility-note">Vos descriptions thématiques restent modifiables, mais ne sont pas proposées dans les recherches avec ce réglage.</p>}
      </section>

      <div className="description-theme-list">
        <div className="account-section-heading"><div><p className="eyebrow">Présentation détaillée</p><h2>Descriptions par thème</h2></div><span>{allowedThemes.size} thème{allowedThemes.size === 1 ? "" : "s"} disponible{allowedThemes.size === 1 ? "" : "s"} pour cette relation</span></div>
        {themes.map((theme) => {
          const data = document.themes[theme.id] ?? { enabled: false, description: "", fields: {}, fieldStates: {}, tags: [] };
          const available = allowedThemes.has(theme.id);
          return <details className={`description-theme${available ? "" : " theme-unavailable"}`} key={theme.id}>
            <summary><span className="theme-summary-title">{theme.label}</span><span className={`theme-availability${available ? " available" : ""}`}>{available ? "Dans la recherche" : "Non exposé"}</span><span className={`theme-switch-mark${data.enabled ? " enabled" : ""}`}>{data.enabled ? "On" : "Off"}</span></summary>
            <div className="description-theme-body">
              {!available && <p className="theme-locked-note">Ce thème reste enregistré, mais n’est pas accessible pour le type de relation choisi. Changez la relation pour le modifier.</p>}
              <div className="description-activation"><label className="theme-enable-control"><input type="checkbox" checked={data.enabled} disabled={!available} onChange={(event) => updateTheme(theme.id, (current) => ({ ...current, enabled: event.target.checked }))} /> Activer ce thème</label><select aria-label={`Durée d’activation du thème ${theme.label}`} value={data.duration ?? "permanent"} disabled={!available || !data.enabled} onChange={(event) => updateTheme(theme.id, (current) => ({ ...current, duration: event.target.value }))}>{activationDurations.map(([value, durationLabel]) => <option value={value} key={value}>{durationLabel}</option>)}</select></div>
              <label className="description-field-label">Description<textarea value={data.description} disabled={!available} onChange={(event) => updateTheme(theme.id, (current) => ({ ...current, description: event.target.value }))} placeholder={`Description ${theme.label.toLowerCase()}…`} /></label>
              {theme.fields.length > 0 && <div className="theme-standard-fields">{theme.fields.map(([fieldKey, fieldLabel]) => {
                const currentValue = data.fields[fieldKey];
                const enabled = data.fieldStates?.[fieldKey] ?? (currentValue !== undefined && currentValue !== "");
                const isRange = typeof currentValue === "number" || ["desire", "desireLevel", "modesty", "communication", "touch"].includes(fieldKey);
                return <label className={`theme-standard-field${enabled ? "" : " is-disabled"}`} key={fieldKey}>
                  <span>{fieldLabel}</span>
                  <input type={isRange ? "range" : "text"} min={isRange ? 0 : undefined} max={isRange ? 10 : undefined} value={currentValue ?? (isRange ? 5 : "")} disabled={!available || !enabled} onChange={(event) => updateTheme(theme.id, (current) => ({ ...current, fields: { ...current.fields, [fieldKey]: isRange ? Number(event.target.value) : event.target.value } }))} />
                  <input type="checkbox" aria-label={`Activer ${fieldLabel}`} checked={enabled} disabled={!available} onChange={(event) => updateTheme(theme.id, (current) => ({ ...current, fieldStates: { ...current.fieldStates, [fieldKey]: event.target.checked } }))} />
                </label>;
              })}</div>}
              {theme.tags.length > 0 && <fieldset className="description-tags"><legend>Tags</legend><div>{theme.tags.map((tag) => <label className={`description-tag${data.tags.includes(tag) ? " selected" : ""}`} key={tag}><input type="checkbox" disabled={!available} checked={data.tags.includes(tag)} onChange={(event) => updateTheme(theme.id, (current) => ({ ...current, tags: event.target.checked ? [...new Set([...current.tags, tag])] : current.tags.filter((item) => item !== tag) }))} /><span>{tag}</span></label>)}</div><label className="custom-tags-field">Autres tags<textarea disabled={!available} value={(data.fields.customTags as string) ?? ""} onChange={(event) => updateTheme(theme.id, (current) => ({ ...current, fields: { ...current.fields, customTags: event.target.value } }))} placeholder="Ajouter vos tags, séparés par des virgules" /></label></fieldset>}
            </div>
          </details>;
        })}
      </div>
      {(error || notice) && <p className={error ? "form-error" : "save-notice"} role="status">{error || notice}</p>}
      <div className="description-save-bottom"><button className="button-primary" onClick={save} disabled={saving}>{saving ? "Enregistrement…" : "Enregistrer les descriptions"}</button></div>
    </section>
  );
}
