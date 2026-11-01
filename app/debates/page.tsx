import Link from "next/link";
import { DeleteEntityButton } from "@/components/delete-entity-button";
import { isPersistentStore, listDebates } from "@/lib/debates";
import { listProfiles } from "@/lib/social";

const themes: Record<string, string> = {
  "politics-society": "Society",
  "culture-entertainment": "Culture",
  sports: "Sports",
  "science-health": "Science & health",
  "economy-tech": "Economy & tech",
  "lifestyle-ideas": "Ideas & society",
  other: "Other"
};

export const dynamic = "force-dynamic";

export default async function DebatesPage({ searchParams }: { searchParams: Promise<{ profileId?: string }> }) {
  const [{ profileId }, allDebates, persistent, profiles] = await Promise.all([searchParams, listDebates(), isPersistentStore(), listProfiles()]);
  const profile = profiles.find((item) => item.id === profileId);
  const debates = profile ? allDebates.filter((debate) => debate.authorProfileId === profile.id) : allDebates;

  return (
    <main className="page-shell">
      <nav className="debates-return-links" aria-label="Return to profile sections">
        {profile ? <Link className="back-link" href={`/circle/profiles/${encodeURIComponent(profile.id)}/discussions`}>← {profile.name} discussions</Link> : <Link className="back-link" href="/circle">← Circles account</Link>}
        {profile && <Link className="back-link" href={`/circle/profiles/${encodeURIComponent(profile.id)}`}>← {profile.name}</Link>}
      </nav>
      {!persistent && <p className="notice">Demo mode: debates are loaded from JSON. New contributions remain in memory until the server restarts. Set DATABASE_URL to enable persistent storage.</p>}

      <div className="section-heading">
        <div><h2>{profile ? `${profile.name}'s debates` : "Open conversations"}</h2><span>{debates.length} debate{debates.length === 1 ? "" : "s"}</span></div>
        <Link className="section-add-button" aria-label="Start a debate" title="Start a debate" href={`/debates/new${profile ? `?profileId=${encodeURIComponent(profile.id)}` : ""}`}>+</Link>
      </div>

      {debates.length ? (
          <section className="debate-list" aria-label="Debate list">
          {debates.map((debate) => (
            <article className="debate-list-item" key={debate.id}>
              <Link href={`/debates/${encodeURIComponent(debate.id)}`} className="debate-card">
                <div className="card-meta"><span className="theme-label">{themes[debate.theme ?? ""] ?? "Discussion"}</span><span>{debate.from || "Participant"}</span></div>
                <h3>{debate.title}</h3>
                <p>{debate.content?.[0] ?? "Open this conversation."}</p>
                <div className="card-bottom"><span className="status-line"><i className="status-dot" /> Open conversation</span><span className="read-link">Read debate →</span></div>
              </Link>
                  {debate.authorProfileId && profiles.some((item) => item.id === debate.authorProfileId) && <DeleteEntityButton endpoint={`/api/debates/${encodeURIComponent(debate.id)}`} label="Delete debate" confirmation={`Delete “${debate.title}” and its replies? This cannot be undone.`} iconOnly />}
            </article>
          ))}
        </section>
      ) : <div className="empty-state">No debates yet.</div>}
    </main>
  );
}
