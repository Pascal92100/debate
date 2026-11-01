import Link from "next/link";
import { notFound } from "next/navigation";
import { isPersistentStore, listDebates } from "@/lib/debates";
import { searchDiscoverableProfiles } from "@/lib/meta-profile-invitations";
import { listProfileSearches } from "@/lib/profile-modules";
import { listProfileSpaces } from "@/lib/profile-spaces";
import { listDiscussions } from "@/lib/discussions";
import { listProfiles, listSocialPosts } from "@/lib/social";

export const dynamic = "force-dynamic";

export default async function SavedSearchResultsPage({ params }: { params: Promise<{ id: string; searchId: string }> }) {
  const { id, searchId } = await params;
  const [profiles, searches, persistent] = await Promise.all([listProfiles(), listProfileSearches(id), isPersistentStore()]);
  const profile = profiles.find((item) => item.id === id);
  const search = searches.find((item) => item.id === searchId);
  if (!profile || !search) notFound();
  const what = String(search.criteria.what ?? "Profiles");
  const scope = what === "Meta-profiles" ? "meta" : "individual";
  const query = typeof search.criteria.keywords === "string" ? search.criteria.keywords : "";
  const theme = typeof search.criteria.theme === "string" && search.criteria.theme !== "Any theme" ? search.criteria.theme : "";
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const matches = (value: string) => !normalizedQuery || value.toLocaleLowerCase().includes(normalizedQuery);
  let profileResults: Awaited<ReturnType<typeof searchDiscoverableProfiles>> = [];
  let contentResults: Array<{ id: string; title: string; detail: string; href: string }> = [];
  let unsupported = false;
  if (what === "Profiles" || what === "Meta-profiles") {
    profileResults = await searchDiscoverableProfiles(query, scope, id);
  } else if (what === "Publications") {
    const posts = await listSocialPosts();
    contentResults = posts.filter((post) => matches(`${post.title} ${post.body} ${post.author}`)).map((post) => ({ id: post.id, title: post.title, detail: `${post.author} · ${post.body}`, href: `/social#${encodeURIComponent(post.id)}` }));
  } else if (what === "Forums") {
    const spaces = (await Promise.all(profiles.map((item) => listProfileSpaces(item.id, "forums")))).flat();
    contentResults = spaces.filter((space) => matches(`${space.name} ${space.description}`)).map((space) => ({ id: space.id, title: space.name, detail: space.description, href: `/circle/profiles/${encodeURIComponent(space.profileId)}/forums` }));
  } else if (what === "Debates / discussions") {
    const debates = await listDebates();
    const debateResults = debates.filter((debate) => matches(`${debate.title} ${debate.content.join(" ")} ${debate.theme ?? ""}`)).map((debate) => ({ id: debate.id, title: debate.title, detail: debate.content[0] ?? "", href: `/debates/${encodeURIComponent(debate.id)}` }));
    const simpleDiscussions = (await Promise.all(profiles.map((item) => listDiscussions(item.id)))).flat();
    const discussionResults = simpleDiscussions.filter((discussion, index, all) => all.findIndex((other) => other.id === discussion.id) === index && matches(`${discussion.title} ${discussion.messages.map((message) => message.body).join(" ")}`)).map((discussion) => ({ id: discussion.id, title: discussion.title, detail: discussion.messages.at(-1)?.body ?? "", href: `/circle/profiles/${encodeURIComponent(discussion.profileId)}/discussions/${encodeURIComponent(discussion.id)}` }));
    contentResults = [...debateResults, ...discussionResults];
  } else {
    unsupported = true;
  }
  return <main className="social-shell social-directory-shell">
    <div className="social-page-heading"><div><p className="eyebrow">{profile.name} · Saved search</p><h1>{search.name}</h1></div><Link className="back-link" href={`/circle/profiles/${encodeURIComponent(id)}/searches`}>← Saved searches</Link></div>
    {!persistent && <p className="notice social-notice">Search results use demo profiles and are temporary.</p>}
    <p className="profile-search-summary">{what}{query && ` matching “${query}”`}{theme && ` · ${theme}`}</p>
    {unsupported ? <p className="account-empty">Search results for private messages are not available yet.</p> : profileResults.length ? <div className="social-profile-directory">{profileResults.map((result) => <article className="social-profile-card" key={result.id}><span className="social-avatar social-avatar-large">{result.avatar}</span><div><h2>{result.name}</h2><p>{what === "Meta-profiles" ? `${result.category} · Meta-profile` : result.category}</p><Link className="button-secondary" href={`/circle/profiles/${encodeURIComponent(result.id)}?view=public&from=${encodeURIComponent(id)}&returnTo=${encodeURIComponent(`/circle/profiles/${id}/searches/${searchId}`)}`}>View public profile</Link></div></article>)}</div> : contentResults.length ? <div className="profile-post-list">{contentResults.map((result) => <Link className="profile-activity-item profile-search-result" href={result.href} key={result.id}><strong>{result.title}</strong><p>{result.detail}</p></Link>)}</div> : <p className="account-empty">No results match this search.</p>}
  </main>;
}
