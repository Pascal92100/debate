"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { AccountDescription, DescriptionField, ProfileDescription, SocialCircle, SocialProfile } from "@/lib/social";
import { ContentFilterOption, contentFilters } from "@/components/profile-create-form";

export type ThemeDefinition = {
  id: string;
  label: string;
  fields: Array<[string, string]>;
  tags: string[];
  fieldTags?: Record<string, string[]>;
  fieldHints?: Record<string, string>;
};

export const relationshipStatusOptions = ["Single", "Married", "In relationship", "Open relationship", "Complicated"];

const identityFields: Array<[string, string, string]> = [
  ["firstName", "First name / pseudonym", "text"],
  ["lastName", "Last name", "text"],
  ["nationalities", "Nationalities", "text"],
  ["birthdate", "Date of birth", "date"],
  ["sex", "Sex", "select:Male|Female|Other"],
  ["relationshipStatus", "Relationship status", `select:${relationshipStatusOptions.join("|")}`],
  ["languages", "Languages spoken", "text"],
  ["location", "Location", "text"]
];

export const descriptionThemes: ThemeDefinition[] = [
  { id: "physical", label: "Physical", fields: [["height", "Height"], ["weight", "Weight"], ["bodyShape", "Body shape"], ["eyes", "Eyes"], ["hair", "Hair"], ["origins", "Origins"], ["smoker", "Smoker"]], tags: [] },
  { id: "culture", label: "Culture", fields: [["architecture", "Architecture"], ["sculpture", "Sculpture"], ["painting", "Painting"], ["music", "Music"], ["literature", "Literature"], ["theatre", "Theatre"], ["cinema", "Cinema"], ["series", "TV series"], ["media", "Media"], ["comics", "Comics"], ["videoGames", "Video games"], ["sciences", "Science"], ["other", "Other"]], tags: [], fieldTags: {
    architecture: ["Classical", "Gothic", "Renaissance", "Modern", "Contemporary", "Art Deco", "Sustainable"],
    sculpture: ["Classical", "Modern", "Contemporary", "Abstract", "Public art", "Installation"],
    painting: ["Renaissance", "Impressionism", "Modern", "Contemporary", "Abstract", "Street art", "Photography"],
    music: ["Classical", "Jazz", "Rock", "Pop", "Hip-hop", "Electronic", "Folk", "World music", "Live music"],
    literature: ["Novels", "Poetry", "Essays", "History", "Science fiction", "Fantasy", "Mystery", "Biography"],
    theatre: ["Classical", "Contemporary", "Comedy", "Musical", "Opera", "Dance", "Live performance"],
    cinema: ["Drama", "Comedy", "Documentary", "Thriller", "Science fiction", "Animation", "Independent", "World cinema"],
    series: ["Drama", "Comedy", "Documentary", "Crime", "Science fiction", "Fantasy", "Animation", "Mini-series"],
    media: ["News", "Podcasts", "Radio", "Magazines", "Long-form", "Independent media"],
    comics: ["Comics", "Graphic novels", "Manga", "Webcomics", "Independent"],
    videoGames: ["Adventure", "Strategy", "Role-playing", "Puzzle", "Simulation", "Cooperative", "Indie"],
    sciences: ["Physics", "Biology", "Astronomy", "Technology", "Psychology", "Environment", "Popular science"],
    other: ["Museums", "Design", "Photography", "Crafts", "Heritage", "Festivals"]
  } },
  { id: "professional", label: "Professional", fields: [], tags: ["manager", "individual contributor", "freelance", "entrepreneur", "remote", "hybrid", "onsite", "tech", "creative", "consulting", "non-profit", "public sector", "education", "healthcare", "finance", "early career", "mid-career", "senior", "executive"] },
  { id: "political", label: "Politics / Economy", fields: [], tags: ["far Left", "radical Left", "left", "center-left", "center", "center-right", "right", "radical Right", "Far right", "liberal", "conservative", "libertarian", "ecologist", "social-democrat", "socialist", "anarchist", "capitalist", "anti-capitalist", "pro-EU", "eurosceptic", "globalist", "localist", "apolitical"] },
  { id: "sport", label: "Sports", fields: [], tags: ["sedentary", "beginner", "regular", "intense", "outdoor", "indoor", "team sports", "individual sports", "running", "cycling", "swimming", "fitness", "yoga", "combat sports", "ball sports", "mountain", "water sports", "competition", "just for fun"] },
  { id: "spirituality", label: "Spirituality", fields: [], tags: ["atheist", "agnostic", "spiritual but not religious", "religious", "christian", "muslim", "jewish", "buddhist", "hindu", "other religion", "meditation", "mindfulness", "energy work", "esoteric", "rituals", "philosophy-oriented", "questioning", "practicing", "non-practicing"] },
  { id: "psycho", label: "Psycho", fields: [], tags: ["adaptable", "affectionate", "ambitious", "ambivert", "analytical", "anxious", "assertive", "attentive", "calm", "chaotic", "confident", "creative", "curious", "dreamer", "emotional", "empathetic", "extrovert", "flexible", "grounded", "humorous", "idealistic", "independent", "introvert", "intuitive", "loyal", "mindful", "open-minded", "organized", "patient", "perfectionist", "playful", "pragmatic", "protective", "rational", "realistic", "reserved", "sensitive", "serious", "shy", "spontaneous", "stubborn", "deep talks", "intimate talks", "professional talks", "small talks"] },
  { id: "sexo", label: "Sexuality", fields: [["desire", "Desire level"], ["modesty", "Modesty"], ["communication", "Communication"], ["touch", "Physical touch"]], fieldHints: { desire: "Interest and intensity", modesty: "Comfort with exposure", communication: "How openly you talk", touch: "Comfort with physical contact" }, tags: ["straight", "bi", "demi", "alter", "asexual", "homo", "pan", "sapio", "skolio", "monogamy", "non-monogamy", "polyamory", "exclusive", "open"] },
  { id: "kinky", label: "Kinky · preferences and limits", fields: [], tags: ["Soft", "BDSM", "Roleplay", "Switch", "Dom", "Sub"] }
];

const relationships = [
  ["friends", "Friends"], ["professional", "Professional"], ["oldfriends", "Old friends"], ["socializing", "Socializing"], ["friendship", "For friendship"], ["love", "For love"], ["casual", "For casual"], ["undecided", "Undecided"], ["casualfun", "For casual fun"]
];
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

const contextThemeAccess: Record<string, string[]> = {
  Professional: ["professional", "culture", "political", "sport", "spirituality", "psycho", "physical"],
  Personal: ["physical", "culture", "sport", "spirituality", "psycho"],
  Political: ["political", "culture", "professional", "psycho"],
  Dating: ["physical", "culture", "spirituality", "psycho", "sexo", "kinky"]
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

type ReusableAccountDescription = { text: string; fields: Record<string, { value: string; enabled: boolean }>; themes: ProfileDescription["themes"] };

function buildProfileDraft(profile: SocialProfile, saved: ProfileDescription | null, account: ReusableAccountDescription | null) {
  const draft = saved ?? defaultDescription(profile);
  if (!account) return draft;
  const identity = { ...draft.identity };
  for (const [key, field] of Object.entries(account.fields)) {
    if (identityFields.some(([identityKey]) => identityKey === key) && field.enabled && !identity[key]?.value) {
      identity[key] = { value: field.value, enabled: false };
    }
  }
  const themes = { ...draft.themes };
  for (const [themeId, theme] of Object.entries(account.themes)) {
    if (themeId === "kinky" || themeId === "sexo") continue;
    const hasSavedValues = theme.enabled || Boolean(theme.description.trim()) || Object.keys(theme.fields).length > 0 || theme.tags.length > 0;
    if (!hasSavedValues) continue;
    const existing = themes[themeId] ?? { enabled: false, description: "", fields: {}, fieldStates: {}, tags: [] };
    const fields = { ...theme.fields, ...existing.fields };
    const fieldStates = { ...Object.fromEntries(Object.keys(theme.fields).map((fieldKey) => [fieldKey, false])), ...existing.fieldStates };
    themes[themeId] = {
      ...theme,
      ...existing,
      enabled: existing.enabled,
      description: existing.description || theme.description,
      fields,
      fieldStates,
      tags: [...new Set([...theme.tags, ...existing.tags])]
    };
  }
  return { ...draft, identity, themes, text: draft.text || account.text, textEnabled: Boolean(draft.textEnabled) };
}

export function ProfileDescriptionsEditor({ profile, initialDescription, accountDescription, circles, persistent }: { profile: SocialProfile; initialDescription: ProfileDescription | null; accountDescription: ReusableAccountDescription | null; circles: SocialCircle[]; persistent: boolean }) {
  const [document, setDocument] = useState<ProfileDescription>(() => buildProfileDraft(profile, initialDescription, accountDescription));
  const [profileSettings, setProfileSettings] = useState({
    visibility: profile.visibility || "ghost",
    socialDistance: profile.socialDistance ?? 0,
    anonymous: profile.anonymous ?? false,
    contentFilters: profile.contentFilters ?? [],
    locationLabel: profile.locationLabel ?? "",
    dynamicLocationEnabled: profile.dynamicLocationEnabled ?? false,
    dynamicLocationCircleId: profile.dynamicLocationCircleId ?? ""
  });
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [showThemes, setShowThemes] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const selectedGoals = document.relationship.split("|").filter(Boolean);
  const contextThemes = new Set(profile.kind === "individual" ? contextThemeAccess[profile.category] ?? [] : descriptionThemes.filter((theme) => !["sexo", "kinky"].includes(theme.id)).map((theme) => theme.id));
  const allowedThemes = new Set(selectedGoals.flatMap((goal) => themeAccess[goal] ?? []).filter((themeId) => contextThemes.has(themeId)));
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
      body: JSON.stringify({ ...document, visibility: "other", profileSettings })
    }).catch(() => null);
    const result = await response?.json().catch(() => null);
    if (!response?.ok) {
      setError(result?.error || "The description could not be saved.");
      setSaving(false);
      return;
    }
    setDocument(result.description);
    setSaving(false);
    const referrer = window.document.referrer;
    if (referrer && new URL(referrer).origin === window.location.origin) router.back();
    else router.push(`/circle/profiles/${encodeURIComponent(profile.id)}`);
  }

  return (
    <section className="description-editor">
      {!persistent && <p className="notice social-notice">Demo data: changes remain in memory until the server restarts.</p>}
      <header className="description-editor-heading">
        <div><p className="eyebrow">Profile · {profile.name}</p><h2>Descriptions</h2><p>Every item is optional. Account details are available here but only used when enabled.</p></div>
        <div className="description-heading-actions"><button className="button-primary" onClick={save} disabled={saving}>{saving ? "Saving…" : "Save"}</button></div>
      </header>

      <section className="description-section">
        <header className="description-section-header"><div><span className="description-section-icon">✎</span><div><h3>Text description</h3><p>General introduction for this profile</p></div></div><div className="description-activation"><label className="switch-control"><input type="checkbox" checked={document.textEnabled} onChange={(event) => setDocument((current) => ({ ...current, textEnabled: event.target.checked }))} /><span>{document.textEnabled ? "Enabled" : "Disabled"}</span></label></div></header>
        <textarea className="description-textarea" value={document.text} disabled={!document.textEnabled} onChange={(event) => setDocument((current) => ({ ...current, text: event.target.value }))} placeholder="Write a description…" />
      </section>

      <section className="description-section visibility-section">
        <header className="description-section-header"><div><span className="description-section-icon">◉</span><div><h3>For other&apos;s research</h3><p>Profile privacy, social distance, content filters and location.</p></div></div></header>
        <div className="profile-setting-block"><div className="profile-setting-title">Visibility</div><div className="profile-choice-row">
          {[["ghost", "Ghost"], ["relatives", "Connections only"], ["all", "For all"]].map(([value, label]) => <label key={value} title={value === "ghost" ? "For no one." : value === "relatives" ? "Exact pseudonym or link match for relatives." : "Default visibility."}><input type="radio" name="profile-visibility" checked={profileSettings.visibility === value} onChange={() => setProfileSettings((current) => ({ ...current, visibility: value }))} /><span>{label}</span></label>)}
        </div></div>
        <div className="profile-setting-block"><div className="profile-setting-title">Social distance visibility</div><div className="profile-choice-row distance-choice-row">
          {[[0, "0", "Everyone can see your profile."], [1, "1", "Your direct contacts will never see this profile."], [2, "2+", "Contacts of your contacts will not see this profile either."]].map(([value, label, help]) => <label key={String(value)} title={String(help)}><input type="radio" name="profile-social-distance" checked={profileSettings.socialDistance === value} onChange={() => setProfileSettings((current) => ({ ...current, socialDistance: Number(value) }))} /><span>{label}</span></label>)}
        </div></div>
        <div className="profile-setting-block"><div className="profile-setting-title">Content filtering</div><div className="content-filter-options">{contentFilters.map(([id, emoji, text]) => <ContentFilterOption key={id} id={id} emoji={emoji} text={text} selected={profileSettings.contentFilters.includes(id)} onToggle={(checked) => setProfileSettings((current) => ({ ...current, contentFilters: checked ? [...current.contentFilters, id] : current.contentFilters.filter((item) => item !== id) }))} />)}</div></div>
        <label className="social-check-field"><input type="checkbox" checked={profileSettings.anonymous} onChange={(event) => setProfileSettings((current) => ({ ...current, anonymous: event.target.checked }))} /> Anonymous navigation</label>
        <div className="profile-location-fields"><label className="field">Location<input value={profileSettings.locationLabel} onChange={(event) => setProfileSettings((current) => ({ ...current, locationLabel: event.target.value }))} placeholder="Your location" /></label><div className="field"><span className="field-label">Dynamic location</span><div className="dynamic-location-choice"><label><input type="radio" checked={!profileSettings.dynamicLocationEnabled} onChange={() => setProfileSettings((current) => ({ ...current, dynamicLocationEnabled: false, dynamicLocationCircleId: "" }))} /> No</label><label><input type="radio" checked={profileSettings.dynamicLocationEnabled} onChange={() => setProfileSettings((current) => ({ ...current, dynamicLocationEnabled: true }))} /> Yes</label></div>{profileSettings.dynamicLocationEnabled && <select required aria-label="Share location with Circle" value={profileSettings.dynamicLocationCircleId} onChange={(event) => setProfileSettings((current) => ({ ...current, dynamicLocationCircleId: event.target.value }))}><option value="">Select a Circle</option>{circles.map((circle) => <option value={circle.id} key={circle.id}>{circle.name}</option>)}</select>}</div></div>
      </section>

      {isIndividual && <section className="description-section">
        <header className="description-section-header"><div><span className="description-section-icon">◉</span><div><h3>Identity</h3><p>Individual profile · each field can be hidden</p></div></div></header>
        <div className="identity-fields">
          {identityFields.map(([key, label, type]) => {
            const field = document.identity[key] ?? { value: "", enabled: false };
            const selectOptions = type.startsWith("select:") ? type.slice(7).split("|") : null;
            return <label className={`identity-field${field.enabled ? "" : " is-disabled"}`} key={key}>
              <span>{label}</span>
              {selectOptions ? <select value={field.value} onChange={(event) => updateIdentity(key, { value: event.target.value })} disabled={!field.enabled}><option value="">Choose…</option>{selectOptions.map((option) => <option value={option} key={option}>{option}</option>)}</select> : <input type={type} value={field.value} onChange={(event) => updateIdentity(key, { value: event.target.value })} disabled={!field.enabled} />}
              <input className="field-visibility-toggle" type="checkbox" aria-label={`Show ${label}`} checked={field.enabled} onChange={(event) => updateIdentity(key, { enabled: event.target.checked })} />
            </label>;
          })}
        </div>
      </section>}

      <div className="description-theme-list">
        <div className="account-section-heading"><div><p className="eyebrow">Detailed introduction</p><h2>Themed descriptions</h2></div><button className="button-secondary" type="button" onClick={() => setShowThemes((current) => !current)}>{showThemes ? "Hide theme descriptions" : "Edit theme descriptions"}</button></div>
        {showThemes && <div className="available-theme-list">
          <section className="presentation-goal-panel">
            <header className="description-section-header"><div><span className="description-section-icon">◎</span><div><h3>Presentation goal</h3><p>Choose the targeted people. This determines which description themes are available.</p></div></div></header>
            <div className="relationship-picker"><p>Choose all that apply</p><div>{relationships.map(([value, label]) => <label className="goal-option" key={value}><input type="checkbox" checked={selectedGoals.includes(value)} onChange={(event) => setDocument((current) => {
              const goals = current.relationship.split("|").filter(Boolean);
              const nextGoals = event.target.checked ? [...new Set([...goals, value])] : goals.filter((goal) => goal !== value);
              return { ...current, visibility: "other", relationship: nextGoals.join("|") };
            })} /><span>{label}</span></label>)}</div></div>
          </section>
          <span>{allowedThemes.size} themes available for this profile and presentation goal.</span>{descriptionThemes.filter((theme) => allowedThemes.has(theme.id)).map((theme) => {
          const data = document.themes[theme.id] ?? { enabled: false, description: "", fields: {}, fieldStates: {}, tags: [] };
          return <details className="description-theme" key={theme.id}>
            <summary><span className="theme-summary-title">{theme.label}</span><span className={`theme-switch-mark${data.enabled ? " enabled" : ""}`}>{data.enabled ? "On" : "Off"}</span></summary>
            <div className="description-theme-body">
              <div className="description-activation"><label className="theme-enable-control"><input type="checkbox" checked={data.enabled} onChange={(event) => updateTheme(theme.id, (current) => ({ ...current, enabled: event.target.checked }))} /> Use this theme in my profile description</label></div>
              <label className="description-field-label">Description<textarea value={data.description} onChange={(event) => updateTheme(theme.id, (current) => ({ ...current, description: event.target.value }))} placeholder={`${theme.label} description…`} /></label>
              {theme.fields.length > 0 && <div className="theme-standard-fields">{theme.fields.map(([fieldKey, fieldLabel]) => {
                const currentValue = data.fields[fieldKey];
                const enabled = data.fieldStates?.[fieldKey] ?? (currentValue !== undefined && currentValue !== "");
                const isRange = typeof currentValue === "number" || ["desire", "desireLevel", "modesty", "communication", "touch"].includes(fieldKey);
                return <div className="theme-field-group" key={fieldKey}>
                  <label className={`theme-standard-field${enabled ? "" : " is-disabled"}`}>
                    <span>{fieldLabel}{theme.fieldHints?.[fieldKey] && <small className="theme-field-hint">{theme.fieldHints[fieldKey]}</small>}</span>
                    <input type={isRange ? "range" : "text"} min={isRange ? 0 : undefined} max={isRange ? 10 : undefined} value={currentValue ?? (isRange ? 5 : "")} disabled={!enabled} onChange={(event) => updateTheme(theme.id, (current) => ({ ...current, fields: { ...current.fields, [fieldKey]: isRange ? Number(event.target.value) : event.target.value } }))} />
                    <input type="checkbox" aria-label={`Use ${fieldLabel}`} checked={enabled} onChange={(event) => updateTheme(theme.id, (current) => ({ ...current, fieldStates: { ...current.fieldStates, [fieldKey]: event.target.checked } }))} />
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
        })}</div>}
      </div>
      {error && <p className="form-error" role="status">{error}</p>}
      <div className="description-save-bottom"><button className="button-primary" onClick={save} disabled={saving}>{saving ? "Saving…" : "Save descriptions"}</button></div>
    </section>
  );
}
