import Link from "next/link";
import { isPersistentStore, listDebates } from "@/lib/debates";

const themes: Record<string, string> = {
  "politics-society": "Société",
  "culture-entertainment": "Culture",
  sports: "Sport",
  "science-health": "Science & santé",
  "economy-tech": "Économie & tech",
  "lifestyle-ideas": "Idées & société",
  other: "Autre"
};

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [debates, persistent] = await Promise.all([listDebates(), isPersistentStore()]);

  return (
    <main className="page-shell">
      <section className="home-intro">
        <div>
          <p className="eyebrow">Le lieu des idées en mouvement</p>
          <h1>Les bonnes questions méritent mieux qu’un fil.</h1>
          <p className="home-intro-copy">Des conversations lisibles, des arguments qui se répondent, et la place de changer d’avis.</p>
        </div>
        <aside className="intro-note">
          <strong>Commencer une conversation</strong>
          Chaque débat part d’une question, d’une idée ou d’un désaccord à explorer.
        </aside>
      </section>

      {!persistent && <p className="notice">Mode de démonstration : débats chargés depuis le JSON. Les nouvelles contributions restent en mémoire jusqu’au redémarrage du serveur. Ajoutez DATABASE_URL pour activer le stockage permanent.</p>}

      <div className="section-heading">
        <h2>Conversations ouvertes</h2>
        <span>{debates.length} débat{debates.length > 1 ? "s" : ""}</span>
      </div>

      {debates.length ? (
        <section className="debate-list" aria-label="Liste des débats">
          {debates.map((debate) => (
            <Link href={`/debates/${encodeURIComponent(debate.id)}`} className="debate-card" key={debate.id}>
              <div className="card-meta"><span className="theme-label">{themes[debate.theme ?? ""] ?? "Discussion"}</span><span>{debate.from || "Participant"}</span></div>
              <h3>{debate.title}</h3>
              <p>{debate.content?.[0] ?? "Ouvrir cette conversation."}</p>
              <div className="card-bottom"><span className="status-line"><i className="status-dot" /> Conversation ouverte</span><span className="read-link">Lire le débat →</span></div>
            </Link>
          ))}
        </section>
      ) : <div className="empty-state">Aucun débat pour le moment. Lancez la première conversation.</div>}
    </main>
  );
}