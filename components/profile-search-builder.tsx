"use client";

import { FormEvent, useRef, useState } from "react";
import type { SavedProfileSearch } from "@/lib/profile-modules";
import { descriptionRelationships, descriptionThemes } from "@/lib/profile-description-taxonomy";

const themes = [
  ["politics-society", "Politics / society"], ["culture-entertainment", "Culture / entertainment"], ["sports", "Sport"], ["science-health", "Science / health"], ["economy-tech", "Economy / work / tech"], ["lifestyle-ideas", "Lifestyle / ideas"], ["other", "Other"]
] as const;
const targets = [["🔑", "useful", "Useful: practical, actionable or valuable information."], ["💡", "inspiring", "Inspiring: ideas that open possibilities or encourage reflection."], ["🎓", "interesting", "Interesting: informative, thoughtful or worth exploring."], ["☀️", "feelgood", "Feel-good: positive, supportive or wellbeing-oriented."]] as const;
const safetyFilters = [["🚫", "forbidden", "Troll, insults, toxicity, hate, racism or discrimination."], ["🤑", "commercial", "Commercial, advertising or clickbait content."], ["🔞", "sexual", "Sexual content; enables the Kinky filter."], ["⚠️", "shocking", "Violence, anxiety-inducing, disturbing or blasphemous content."], ["❌", "aggressive", "Aggressive tone or behavior."]] as const;
const formats = [["text", "Text"], ["image", "Image"], ["video", "Video"], ["reel", "Reel"], ["event", "Event"], ["alert", "Alert"]] as const;

function EmojiChoice({ emoji, id, label, description, checked, onChange }: { emoji: string; id: string; label: string; description: string; checked: boolean; onChange: (checked: boolean) => void }) {
  const [showHelp, setShowHelp] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPress = useRef(false);
  function startPress() {
    longPress.current = false;
    timer.current = setTimeout(() => { longPress.current = true; setShowHelp(true); }, 500);
  }
  function endPress() {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  }
  return <div className={`search-emoji-choice${checked ? " selected" : ""}${showHelp ? " help-visible" : ""}`} title={description} onPointerDown={startPress} onPointerUp={endPress} onPointerCancel={endPress} onPointerLeave={endPress} onContextMenu={(event) => { event.preventDefault(); longPress.current = true; setShowHelp(true); }} onClickCapture={(event) => { if (longPress.current) { event.preventDefault(); event.stopPropagation(); longPress.current = false; } }}>
    <label className={`description-tag${checked ? " selected" : ""}`}><input type="checkbox" name={id} value={id} checked={checked} onChange={(event) => onChange(event.target.checked)} /><span aria-hidden="true">{emoji}</span><strong>{label}</strong></label>
    <button type="button" className="search-emoji-info" aria-label={`Explain ${label}`} aria-expanded={showHelp} onClick={() => { if (longPress.current) longPress.current = false; else setShowHelp((visible) => !visible); }}>i</button>
    {showHelp && <span className="search-emoji-tooltip" role="tooltip">{description}</span>}
  </div>;
}

export function ProfileSearchBuilder({ profileId, descriptionGoals, availableThemeIds, onSaved }: { profileId: string; descriptionGoals: string[]; availableThemeIds: string[]; onSaved: (search: SavedProfileSearch) => void }) {
  const [what, setWhat] = useState("Profiles");
  const [targetValues, setTargetValues] = useState<string[]>([]);
  const [filterValues, setFilterValues] = useState<string[]>([]);
  const [formatValues, setFormatValues] = useState<string[]>([]);
  const [themeValues, setThemeValues] = useState<string[]>([]);
  const [descriptionThemeValues, setDescriptionThemeValues] = useState<string[]>([]);
  const [descriptionTagValues, setDescriptionTagValues] = useState<string[]>([]);
  const [descriptionRanges, setDescriptionRanges] = useState<Record<string, { min: number; max: number }>>({});
  const [tagText, setTagText] = useState("");
  const [tagMatchValue, setTagMatchValue] = useState<"one" | "all">("one");
  const [scopeValue, setScopeValue] = useState("world");
  const [region, setRegion] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const selectedThemeLabels = themes.filter(([id]) => themeValues.includes(id)).map(([, label]) => label);

  function criteriaFrom(form: HTMLFormElement) {
    const data = new FormData(form);
    const array = (key: string) => data.getAll(key).map(String);
    return {
      what: String(data.get("what") ?? "Profiles"),
      profileKind: String(data.get("profileKind") ?? "individual"),
      keywords: String(data.get("keywords") ?? "").trim(),
      themes: array("theme"),
      targets: array("target"),
      filters: array("filter"),
      formats: array("format"),
      tagMatch: String(data.get("tagMatch") ?? "one"),
      tags: String(data.get("tags") ?? "").split(",").map((tag) => tag.trim()).filter(Boolean),
      visibility: String(data.get("visibility") ?? "any"),
      descriptionGoals,
      descriptionThemes: array("descriptionTheme"),
      descriptionTags: array("descriptionTag"),
      descriptionRanges: Object.fromEntries(availableThemeIds.filter((themeId) => descriptionThemeValues.includes(themeId)).flatMap((themeId) => {
        const theme = descriptionThemes.find((item) => item.id === themeId);
        return (theme?.searchRanges ?? []).flatMap((range) => {
          const value = descriptionRanges[`${themeId}:${range.id}`] ?? { min: range.min, max: range.max };
          return value.min === range.min && value.max === range.max ? [] : [[`${themeId}:${range.id}`, value]];
        });
      })),
      scope: String(data.get("scope") ?? "world"),
      region: String(data.get("region") ?? "").trim(),
      radius: String(data.get("radius") ?? "").trim(),
      language: String(data.get("language") ?? "").trim()
    };
  }

  async function saveSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const name = String(data.get("name") ?? "").trim();
    if (name.length < 2) { setError("Give this search a short name before saving it."); return; }
    const criteria = criteriaFrom(form);
    if (criteria.scope === "radius" && (!criteria.radius || Number(criteria.radius) < 1)) { setError("Enter a distance in kilometres."); return; }
    if (["continent", "country", "region"].includes(criteria.scope) && !criteria.region) { setError("Enter a continent, country, or region for this search area."); return; }
    setSaving(true);
    setError("");
    const response = await fetch(`/api/social/profiles/${encodeURIComponent(profileId)}/searches`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, criteria }) }).catch(() => null);
    const result = await response?.json().catch(() => null);
    if (!response?.ok) {
      setError(result?.error || "The search could not be saved.");
      setSaving(false);
      return;
    }
    onSaved(result.search as SavedProfileSearch);
    form.reset();
    setTargetValues([]);
    setFilterValues([]);
    setFormatValues([]);
    setThemeValues([]);
    setDescriptionThemeValues([]);
    setDescriptionTagValues([]);
    setDescriptionRanges({});
    setTagText("");
    setTagMatchValue("one");
    setScopeValue("world");
    setRegion("");
    setSaving(false);
  }

  return <form className="social-compose-form profile-search-builder" onSubmit={saveSearch}>
    <label className="search-name-field">Search name <span>Optional for a one-time search</span><input name="name" minLength={2} placeholder="e.g. Culture nearby" /></label>
    <div className="search-builder-grid">
      <label>What are you looking for?<select name="what" value={what} onChange={(event) => setWhat(event.target.value)}><option>Profiles</option><option>Forums</option><option>Publications</option><option>Debates / discussions</option><option>Messages</option></select></label>
      {what === "Profiles" && <><label>Profile type<select name="profileKind"><option value="individual">Individual profile</option><option value="meta">Meta-profile</option><option value="all">Both types</option></select></label><label>Profile visibility<select name="visibility"><option value="any">Any discoverable profile</option><option value="all">For all</option><option value="relatives">Exact pseudonym / link</option></select></label></>}
    </div>
    <label>Keywords<input name="keywords" maxLength={120} placeholder="Words or phrases" /></label>
    {what !== "Profiles" && <details className="search-builder-accordion search-theme-menu">
      <summary><span>Themes</span><small>{selectedThemeLabels.length ? selectedThemeLabels.join(" · ") : "Any theme"}</small></summary>
      <fieldset className="search-builder-section"><legend>Choose one or more themes</legend><div className="search-check-grid">{themes.map(([id, label]) => <label key={id}><input type="checkbox" name="theme" value={id} checked={themeValues.includes(id)} onChange={(event) => setThemeValues((current) => event.target.checked ? [...current, id] : current.filter((value) => value !== id))} />{label}</label>)}</div></fieldset>
    </details>}
    {what !== "Forums" && <details className="search-builder-accordion"><summary><span>Qualitative filtering</span><small>{targetValues.length ? `${targetValues.length} selected` : "Optional"}</small></summary><fieldset className="search-builder-section"><legend>Choose desired qualities</legend><div className="search-emoji-grid">{targets.map(([emoji, id, description]) => <EmojiChoice key={id} emoji={emoji} id="target" label={id === "feelgood" ? "Feel-good" : id[0].toUpperCase() + id.slice(1)} description={description} checked={targetValues.includes(id)} onChange={(checked) => setTargetValues((current) => checked ? [...current, id] : current.filter((value) => value !== id))} />)}</div></fieldset></details>}
    {what !== "Profiles" && what !== "Forums" && <details className="search-builder-accordion"><summary><span>Safety filters</span><small>{filterValues.length ? `${filterValues.length} selected` : "No exclusions"}</small></summary><fieldset className="search-builder-section"><legend>Hide content tagged as</legend><div className="search-emoji-grid">{safetyFilters.map(([emoji, id, description]) => <EmojiChoice key={id} emoji={emoji} id="filter" label={id[0].toUpperCase() + id.slice(1)} description={description} checked={filterValues.includes(id)} onChange={(checked) => setFilterValues((current) => checked ? [...current, id] : current.filter((value) => value !== id))} />)}</div></fieldset></details>}
    {what === "Publications" && <fieldset className="search-builder-section"><legend>Format</legend><div className="search-check-grid">{formats.map(([id, label]) => <label key={id}><input type="checkbox" name="format" value={id} checked={formatValues.includes(id)} onChange={(event) => setFormatValues((current) => event.target.checked ? [...current, id] : current.filter((value) => value !== id))} />{label}</label>)}</div></fieldset>}
    {what === "Profiles" && availableThemeIds.length > 0 && <details className="search-builder-accordion profile-description-search">
      <summary><span>Thematic filtering</span><small>{descriptionGoals.map((goal) => descriptionRelationships.find(([id]) => id === goal)?.[1] ?? goal).join(" · ")}{descriptionTagValues.length ? ` · ${descriptionTagValues.length} tags` : ""}</small></summary>
      <div className="description-search-theme-list">{availableThemeIds.map((themeId) => {
        const theme = descriptionThemes.find((item) => item.id === themeId);
        if (!theme) return null;
        const themeSelected = descriptionThemeValues.includes(theme.id);
        const updateRange = (rangeId: string, side: "min" | "max", nextValue: number, min: number, max: number) => {
          const key = `${theme.id}:${rangeId}`;
          setDescriptionThemeValues((current) => current.includes(theme.id) ? current : [...current, theme.id]);
          setDescriptionRanges((current) => {
            const value = current[key] ?? { min, max };
            return { ...current, [key]: side === "min" ? { min: Math.min(nextValue, value.max), max: value.max } : { min: value.min, max: Math.max(nextValue, value.min) } };
          });
        };
        const renderTags = (field: string, tags: string[]) => <div className="description-search-tags">{tags.map((tag) => {
          const key = field ? `${theme.id}:${field}:${tag}` : `${theme.id}:${tag}`;
          const selected = descriptionTagValues.includes(key);
          return <label className={`search-tag-toggle${selected ? " selected" : ""}`} key={key}><input type="checkbox" name="descriptionTag" value={key} checked={selected} onChange={(event) => { setDescriptionTagValues((current) => event.target.checked ? [...current, key] : current.filter((value) => value !== key)); if (event.target.checked && !themeSelected) setDescriptionThemeValues((current) => [...current, theme.id]); }} /><span>{tag}</span></label>;
        })}</div>;
        return <details className={`description-search-theme${themeSelected ? " selected" : ""}`} key={theme.id} open={themeSelected}>
          <summary><span className={`description-search-theme-heading${themeSelected ? " selected" : ""}`}><input type="checkbox" name="descriptionTheme" value={theme.id} checked={themeSelected} onClick={(event) => event.stopPropagation()} onChange={(event) => { setDescriptionThemeValues((current) => event.target.checked ? [...current, theme.id] : current.filter((value) => value !== theme.id)); if (!event.target.checked) { setDescriptionTagValues((current) => current.filter((value) => !value.startsWith(`${theme.id}:`))); setDescriptionRanges((current) => Object.fromEntries(Object.entries(current).filter(([key]) => !key.startsWith(`${theme.id}:`)))); } }} /><strong>{theme.label}</strong></span><small>{themeSelected ? "Selected" : "Choose to filter"}</small></summary>
          <div className="description-search-theme-body">
          {theme.tags.length > 0 && renderTags("", theme.tags)}
          {Object.entries(theme.fieldTags ?? {}).map(([field, tags]) => <details className="description-search-subtheme" key={field}><summary><span>{theme.fields.find(([key]) => key === field)?.[1] ?? field}</span><small>{tags.filter((tag) => descriptionTagValues.includes(`${theme.id}:${field}:${tag}`)).length || "Tags"}</small></summary>{renderTags(field, tags)}</details>)}
          {(theme.searchRanges ?? []).map((range) => {
            const key = `${theme.id}:${range.id}`;
            const current = descriptionRanges[key] ?? { min: range.min, max: range.max };
            return <div className="description-range-filter" key={key}>
              <strong>{range.label}{range.unit ? ` (${range.unit})` : ""}</strong>
              <label><span>Min <output>{current.min}</output></span><input aria-label={`${range.label} minimum`} name={`range:${key}:min`} type="range" min={range.min} max={range.max} step={range.step} value={current.min} onChange={(event) => updateRange(range.id, "min", Number(event.target.value), range.min, range.max)} /></label>
              <label><span>Max <output>{current.max}</output></span><input aria-label={`${range.label} maximum`} name={`range:${key}:max`} type="range" min={range.min} max={range.max} step={range.step} value={current.max} onChange={(event) => updateRange(range.id, "max", Number(event.target.value), range.min, range.max)} /></label>
            </div>;
          })}
          </div>
        </details>;
      })}</div>
    </details>}
    <details className="search-builder-accordion"><summary><span>Tags</span><small>{tagText.trim() ? `${tagText.split(",").filter((tag) => tag.trim()).length} tags · ${tagMatchValue === "all" ? "all" : "any"}` : "Optional"}</small></summary><fieldset className="search-builder-section search-tags-section"><legend>Tag matching</legend><div className="search-mode"><span>Match</span><div className="search-mode-options"><label className={tagMatchValue === "one" ? "selected" : ""}><input type="radio" name="tagMatch" value="one" checked={tagMatchValue === "one"} onChange={() => setTagMatchValue("one")} /><span>Any selected tag</span></label><label className={tagMatchValue === "all" ? "selected" : ""}><input type="radio" name="tagMatch" value="all" checked={tagMatchValue === "all"} onChange={() => setTagMatchValue("all")} /><span>All selected tags</span></label></div></div><input name="tags" value={tagText} onChange={(event) => setTagText(event.target.value)} placeholder="Comma-separated tags" /></fieldset></details>
    {what !== "Messages" && <details className="search-builder-accordion"><summary><span>Scope</span><small>{scopeValue === "world" ? "World" : scopeValue[0].toUpperCase() + scopeValue.slice(1)}{region ? ` · ${region}` : ""}</small></summary><fieldset className="search-builder-section"><legend>Where should results come from?</legend><div className="search-builder-grid"><label>Area<select name="scope" value={scopeValue} onChange={(event) => setScopeValue(event.target.value)}><option value="world">World</option><option value="continent">Continent</option><option value="country">Country</option><option value="region">Region</option><option value="radius">Distance around me</option></select></label><label>Region, country or city<input name="region" value={region} onChange={(event) => setRegion(event.target.value)} placeholder="Optional place" /></label><label>Distance in km<input name="radius" type="number" min="1" max="20000" placeholder="e.g. 50" /></label><label>Language<input name="language" placeholder="e.g. French" /></label></div></fieldset></details>}
    {error && <p className="form-error" role="alert">{error}</p>}
    <div className="search-builder-actions"><button className="button-secondary" type="button" onClick={(event) => { const form = event.currentTarget.form; if (!form) return; const criteria = criteriaFrom(form); if (criteria.scope === "radius" && (!criteria.radius || Number(criteria.radius) < 1)) { setError("Enter a distance in kilometres."); return; } if (["continent", "country", "region"].includes(criteria.scope) && !criteria.region) { setError("Enter a continent, country, or region for this search area."); return; } window.location.assign(`/circle/profiles/${encodeURIComponent(profileId)}/searches/results?criteria=${encodeURIComponent(JSON.stringify(criteria))}`); }}>See results</button><button className="button-primary" type="submit" disabled={saving}>{saving ? "Saving…" : "Save search"}</button></div>
  </form>;
}
