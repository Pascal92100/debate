import Link from "next/link";
import { isPersistentStore, listDebates } from "@/lib/debates";

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

export default async function DebatesPage() {
  const [debates, persistent] = await Promise.all([listDebates(), isPersistentStore()]);

  return (
    <main className="page-shell">
      <section className="home-intro">
        <div>
          <p className="eyebrow">Ideas in motion</p>
          <h1>Good questions deserve more than a feed.</h1>
          <p className="home-intro-copy">Clear conversations, arguments that respond to each other, and room to change your mind.</p>
        </div>
        <aside className="intro-note">
          <strong>Start a conversation</strong>
          Every debate begins with a question, idea, or disagreement worth exploring.
        </aside>
      </section>

      {!persistent && <p className="notice">Demo mode: debates are loaded from JSON. New contributions remain in memory until the server restarts. Set DATABASE_URL to enable persistent storage.</p>}

      <div className="section-heading">
        <h2>Open conversations</h2>
        <span>{debates.length} debate{debates.length === 1 ? "" : "s"}</span>
      </div>

      {debates.length ? (
          <section className="debate-list" aria-label="Debate list">
          {debates.map((debate) => (
            <Link href={`/debates/${encodeURIComponent(debate.id)}`} className="debate-card" key={debate.id}>
              <div className="card-meta"><span className="theme-label">{themes[debate.theme ?? ""] ?? "Discussion"}</span><span>{debate.from || "Participant"}</span></div>
              <h3>{debate.title}</h3>
              <p>{debate.content?.[0] ?? "Open this conversation."}</p>
              <div className="card-bottom"><span className="status-line"><i className="status-dot" /> Open conversation</span><span className="read-link">Read debate →</span></div>
            </Link>
          ))}
        </section>
      ) : <div className="empty-state">No debates yet.</div>}
    </main>
  );
}
