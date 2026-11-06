import Link from "next/link";
import { notFound } from "next/navigation";
import { isPersistentStore, listPublicDebates } from "@/lib/debates";
import { searchDiscoverableProfiles } from "@/lib/meta-profile-invitations";
import { listProfileSearches } from "@/lib/profile-modules";
import { listProfileSpacesForProfiles } from "@/lib/profile-spaces";
import { listDiscussions } from "@/lib/discussions";
import { descriptionRelationships, descriptionThemes as descriptionThemeCatalog } from "@/lib/profile-description-taxonomy";
import { getPublicProfileView } from "@/lib/public-profile";
import { listProfilesCached, listPublicSocialPosts } from "@/lib/social";

export const dynamic = "force-dynamic";

export default async function SavedSearchResultsPage({ params, searchParams }: { params: Promise<{ id: string; searchId: string }>; searchParams: Promise<{ criteria?: string }> }) {
  const { id, searchId } = await params;
  const queryParams = await searchParams;
  const [profiles, searches, persistent] = await Promise.all([listProfilesCached(), searchId === "results" ? Promise.resolve([]) : listProfileSearches(id), isPersistentStore()]);
  const profile = profiles.find((item) => item.id === id);
  let criteria: Record<string, unknown>;
  let searchName = "Search results";
  if (searchId === "results") {
    try { criteria = JSON.parse(queryParams.criteria ?? "{}"); } catch { notFound(); }
  } else {
    const search = searches.find((item) => item.id === searchId);
    if (!search) notFound();
    criteria = search.criteria;
    searchName = search.name;
  }
  if (!profile) notFound();
  const values = (key: string) => Array.isArray(criteria[key]) ? (criteria[key] as unknown[]).map(String) : typeof criteria[key] === "string" && criteria[key] !== "Any theme" ? [String(criteria[key])] : [];
  const what = String(criteria.what ?? "Profiles");
  const profileKind = String(criteria.profileKind ?? (what === "Meta-profiles" ? "meta" : "individual"));
  const scope = profileKind === "all" ? "all" : profileKind === "meta" ? "meta" : "individual";
  const savedKeywords = typeof criteria.keywords === "string" ? criteria.keywords.trim() : "";
  const query = savedKeywords || (searchId !== "results" && !Array.isArray(criteria.themes) ? searchName : "");
  const selectedThemes = values("theme");
  const descriptionGoals = Array.isArray(criteria.descriptionGoals)
    ? criteria.descriptionGoals.map(String)
    : typeof criteria.descriptionGoal === "string" ? [criteria.descriptionGoal] : values("audience").length ? values("audience") : ["friends"];
  const selectedDescriptionThemes = values("descriptionThemes");
  const selectedDescriptionTags = values("descriptionTags");
  const descriptionRanges = criteria.descriptionRanges && typeof criteria.descriptionRanges === "object" ? criteria.descriptionRanges as Record<string, { min?: number; max?: number }> : {};
  const selectedTargets = values("targets");
  const selectedFilters = values("filters");
  const selectedFormats = values("formats");
  const selectedTags = values("tags").map((tag) => tag.toLocaleLowerCase());
  const tagMatch = String(criteria.tagMatch ?? "one");
  const visibility = String(criteria.visibility ?? "any");
  const region = typeof criteria.region === "string" ? criteria.region.trim().toLocaleLowerCase() : "";
  const language = typeof criteria.language === "string" ? criteria.language.trim().toLocaleLowerCase() : "";
  const descriptionGoalLabels = descriptionGoals.map((goal) => String(descriptionRelationships.find(([id]) => id === goal)?.[1] ?? goal));
  const selectedSummary = [...selectedThemes, ...(what === "Profiles" ? [...descriptionGoalLabels, ...selectedDescriptionThemes.map((themeId) => descriptionThemeCatalog.find((theme) => theme.id === themeId)?.label ?? themeId), ...(selectedDescriptionTags.length ? [`${selectedDescriptionTags.length} description tags`] : [])] : []), ...selectedTargets, ...selectedFormats];
  const returnHref = searchId === "results"
    ? `/circle/profiles/${encodeURIComponent(id)}/searches`
    : `/circle/profiles/${encodeURIComponent(id)}/searches`;
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const matches = (value: string) => !normalizedQuery || value.toLocaleLowerCase().includes(normalizedQuery);
  const matchTags = (haystack: string) => !selectedTags.length || (tagMatch === "all" ? selectedTags.every((tag) => haystack.includes(tag)) : selectedTags.some((tag) => haystack.includes(tag)));
  const isIncluded = (description: string, format: string | string[], safetyTags: string[] = []) => {
    const normalizedSafety = safetyTags.map((tag) => tag.toLocaleLowerCase());
    const availableFormats = Array.isArray(format) ? format : [format];
    return matches(description) && (!region || description.toLocaleLowerCase().includes(region)) && (!selectedFormats.length || selectedFormats.some((selected) => availableFormats.includes(selected))) && !selectedFilters.some((filter) => normalizedSafety.includes(filter));
  };
  const themeMatches = (theme: string) => !selectedThemes.length || selectedThemes.includes(theme) || selectedThemes.some((selected) => selected.includes(theme) || theme.includes(selected));
  const descriptionMatches = (description: import("@/lib/public-profile").VisibleDescription | null) => {
    if (descriptionGoals.some((goal) => goal !== "friends") && !description?.audience.some((audience) => descriptionGoals.includes(audience))) return false;
    if (selectedDescriptionThemes.length && !description?.themes.some((theme) => selectedDescriptionThemes.includes(theme.id))) return false;
    if (!selectedDescriptionTags.length) return true;
    const hasTag = (selection: string) => {
      const separator = selection.indexOf(":");
      const themeId = selection.slice(0, separator);
      const suffix = selection.slice(separator + 1);
      return description?.themes.some((theme) => theme.id === themeId && theme.tags.some((tag) => tag === selection || tag === suffix || tag.endsWith(`:${suffix}`))) ?? false;
    };
    return tagMatch === "all" ? selectedDescriptionTags.every(hasTag) : selectedDescriptionTags.some(hasTag);
  };
  const descriptionRangesMatch = (description: import("@/lib/public-profile").VisibleDescription | null) => Object.entries(descriptionRanges).every(([key, range]) => {
    const [themeId, fieldId] = key.split(":");
    let value: number | undefined;
    if (themeId === "physical" && fieldId === "age") {
      const birthdate = description?.identity.find((field) => field.id === "birthdate")?.value;
      if (birthdate) {
        const born = new Date(birthdate);
        const today = new Date();
        value = today.getFullYear() - born.getFullYear() - (today < new Date(today.getFullYear(), born.getMonth(), born.getDate()) ? 1 : 0);
      }
    } else {
      const fieldValue = description?.themes.find((theme) => theme.id === themeId)?.fieldValues[fieldId];
      if (fieldValue !== undefined) {
        const numeric = typeof fieldValue === "number" ? fieldValue : Number.parseFloat(String(fieldValue));
        if (Number.isFinite(numeric)) value = numeric;
      }
    }
    if (value === undefined) return false;
    return value >= Number(range.min) && value <= Number(range.max);
  });
  const allowedMessage = (message: { body: string; safetyTags?: string[]; targetTags?: string[] }) => !selectedFilters.some((filter) => message.safetyTags?.includes(filter)) && (!selectedTargets.length || (tagMatch === "all" ? selectedTargets.every((target) => message.targetTags?.includes(target)) : selectedTargets.some((target) => message.targetTags?.includes(target))));
  let profileResults: Awaited<ReturnType<typeof searchDiscoverableProfiles>> = [];
  let contentResults: Array<{ id: string; title: string; detail: string; href: string }> = [];
  let unsupported = false;
  let locationNotice = "";
  if (what === "Profiles") {
    profileResults = await searchDiscoverableProfiles(query, scope, id);
    const visibleProfiles = await Promise.all(profileResults.map(async (candidate) => ({ candidate, view: await getPublicProfileView(candidate.id, false, false, id, true) })));
    profileResults = visibleProfiles.filter(({ candidate, view }) => {
      if (visibility !== "any" && candidate.visibility !== visibility) return false;
      if (!descriptionMatches(view?.description ?? null)) return false;
      if (!descriptionRangesMatch(view?.description ?? null)) return false;
      const descriptionText = view?.description ? [view.description.text, ...view.description.identity.map((field) => `${field.label} ${field.value}`), ...view.description.themes.flatMap((theme) => [theme.label, theme.description, ...theme.fields, ...theme.tags])].join(" ") : `${candidate.name} ${candidate.category}`;
      if (!isIncluded(`${candidate.name} ${candidate.category} ${descriptionText}`, "text", [])) return false;
      if (language && !descriptionText.toLocaleLowerCase().includes(language)) return false;
      if (!matchTags(descriptionText.toLocaleLowerCase())) return false;
      if (selectedTargets.length) {
        const signalValues: Record<string, number> = { useful: view?.signals.useful ?? 0, inspiring: view?.signals.inspiring ?? 0, interesting: view?.signals.interesting ?? 0, feelgood: view?.signals.feelGood ?? 0 };
        if (!selectedTargets.some((target) => signalValues[target] > 0)) return false;
      }
      return true;
    }).map(({ candidate }) => candidate);
  } else if (what === "Publications") {
    const posts = await listPublicSocialPosts({ keywords: query, themes: selectedThemes, formats: selectedFormats, tags: selectedTags, tagMatch: tagMatch as "one" | "all", safetyFilters: selectedFilters, language, location: region });
    contentResults = posts.filter((post) => {
      const metadata = post.metadata as Record<string, unknown> | undefined;
      const postFormats = post.formats?.length ? post.formats : ["text"];
      const safetyTags = Array.isArray(metadata?.safetyTags) ? metadata.safetyTags.map(String) : [];
      const targetReactions: Record<string, string> = { useful: "🔑", inspiring: "💡", interesting: "🎓", feelgood: "☀️" };
      const locationText = String(metadata?.location ?? "");
      return isIncluded(`${post.title} ${post.body} ${post.author} ${String(metadata?.theme ?? "")} ${locationText}`, postFormats, safetyTags) && (!selectedThemes.length || selectedThemes.some((theme) => String(metadata?.theme ?? "").includes(theme))) && (!selectedTargets.length || selectedTargets.some((target) => (post.reactions?.[targetReactions[target]] ?? 0) > 0)) && (!language || String(metadata?.language ?? "").toLocaleLowerCase().includes(language)) && matchTags(`${post.title} ${post.body} ${String(metadata?.tags ?? "")}`.toLocaleLowerCase());
    }).map((post) => ({ id: post.id, title: post.title, detail: `${post.author} · ${post.body}`, href: `/social#${encodeURIComponent(post.id)}` }));
  } else if (what === "Forums") {
    const discoverable = await searchDiscoverableProfiles("", "all", id);
    const spaces = await listProfileSpacesForProfiles(discoverable.map((item) => item.id), "forums");
    contentResults = spaces.filter((space) => isIncluded(`${space.name} ${space.description}`, "text") && themeMatches(`${space.name} ${space.description}`.toLocaleLowerCase()) && matchTags(`${space.name} ${space.description}`.toLocaleLowerCase()) && (!language || `${space.name} ${space.description}`.toLocaleLowerCase().includes(language))).map((space) => ({ id: space.id, title: space.name, detail: space.description, href: `/circle/profiles/${encodeURIComponent(space.profileId)}/forums` }));
  } else if (what === "Debates / discussions") {
    const debates = await listPublicDebates();
    const debateResults = debates.filter((debate) => isIncluded(`${debate.title} ${debate.content.join(" ")} ${debate.theme ?? ""}`, "text", debate.safetyTags ?? []) && themeMatches(debate.theme ?? "") && (!selectedTargets.length || selectedTargets.some((target) => debate.targetTags?.includes(target))) && matchTags(`${debate.title} ${debate.content.join(" ")} ${debate.theme ?? ""}`.toLocaleLowerCase())).map((debate) => ({ id: debate.id, title: debate.title, detail: debate.content[0] ?? "", href: `/debates/${encodeURIComponent(debate.id)}` }));
    const simpleDiscussions = (await Promise.all(profiles.map((item) => listDiscussions(item.id)))).flat();
    const discussionResults = simpleDiscussions.filter((discussion, index, all) => {
      const visibleMessages = discussion.messages.filter(allowedMessage);
      const text = `${discussion.title} ${visibleMessages.map((message) => message.body).join(" ")}`;
      return all.findIndex((other) => other.id === discussion.id) === index && themeMatches(discussion.theme ?? "") && isIncluded(text, "text") && matchTags(text.toLocaleLowerCase());
    }).map((discussion) => ({ id: discussion.id, title: discussion.title, detail: discussion.messages.filter(allowedMessage).at(-1)?.body ?? "", href: `/circle/profiles/${encodeURIComponent(discussion.profileId)}/discussions/${encodeURIComponent(discussion.id)}` }));
    contentResults = [...debateResults, ...discussionResults];
  } else if (what === "Messages") {
    const simpleDiscussions = (await Promise.all(profiles.map((item) => listDiscussions(item.id)))).flat();
    contentResults = simpleDiscussions.filter((discussion, index, all) => {
      const visibleMessages = discussion.messages.filter(allowedMessage);
      const text = `${discussion.title} ${visibleMessages.map((message) => message.body).join(" ")}`;
      return all.findIndex((other) => other.id === discussion.id) === index && themeMatches(discussion.theme ?? "") && isIncluded(text, "text") && matchTags(text.toLocaleLowerCase());
    }).map((discussion) => ({ id: discussion.id, title: discussion.title, detail: discussion.messages.filter(allowedMessage).at(-1)?.body ?? "", href: `/circle/profiles/${encodeURIComponent(discussion.profileId)}/discussions/${encodeURIComponent(discussion.id)}` }));
    unsupported = true;
  } else {
    unsupported = true;
  }
  if (String(criteria.scope ?? "world") === "radius" && criteria.radius) locationNotice = "Distance radius is not applied yet: profiles do not have verified geographic coordinates.";
  else if (String(criteria.scope ?? "world") !== "world" && region) locationNotice = "Area is matched against visible location text; exact country and regional boundaries are not available yet.";
  return <main className="social-shell social-directory-shell">
    <div className="social-page-heading"><div><p className="eyebrow">{profile.name} · {searchId === "results" ? "Search preview" : "Saved search"}</p><h1>{searchName}</h1></div><Link className="back-link" href={returnHref}>← Search builder</Link></div>
    {!persistent && <p className="notice social-notice">Search results use demo profiles and are temporary.</p>}
    <p className="profile-search-summary">{what}{query && ` matching “${query}”`}{selectedSummary.length > 0 && ` · ${selectedSummary.join(" · ")}`}{region && ` · ${region}`}{language && ` · ${language}`}</p>
    {locationNotice && <p className="notice social-notice">{locationNotice}</p>}
    {unsupported && what === "Messages" && <p className="notice social-notice">Only messages in discussions accessible to this profile are searched; private one-to-one messages are not indexed yet.</p>}
    {profileResults.length ? <div className="social-profile-directory">{profileResults.map((result) => <Link className="social-profile-card" href={`/circle/profiles/${encodeURIComponent(result.id)}?view=public&from=${encodeURIComponent(id)}&returnTo=${encodeURIComponent(searchId === "results" ? returnHref : `/circle/profiles/${id}/searches/${searchId}`)}`} key={result.id}><span className="social-avatar social-avatar-large">{result.avatar}</span><span className="social-profile-result-copy"><strong>{result.name}</strong><small>{result.category}{result.visibility ? ` · ${result.visibility}` : ""}</small></span><span className="account-profile-row-arrow" aria-hidden="true">→</span></Link>)}</div> : contentResults.length ? <div className="profile-post-list">{contentResults.map((result) => <Link className="profile-activity-item profile-search-result" href={result.href} key={result.id}><strong>{result.title}</strong><p>{result.detail}</p></Link>)}</div> : <p className="account-empty">No results match this search.</p>}
  </main>;
}
