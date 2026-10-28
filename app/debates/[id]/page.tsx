import Link from "next/link";
import { notFound } from "next/navigation";
import { getDebate, isPersistentStore } from "@/lib/debates";
import { ThreadView } from "@/components/thread-view";
import { DebateControls } from "@/components/debate-controls";

export const dynamic = "force-dynamic";

export default async function DebatePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [debate, persistent] = await Promise.all([getDebate(id), isPersistentStore()]);
  if (!debate) notFound();

  const comments = debate.children ?? [];
  return (
    <main className="debate-shell">
      <Link href="/" className="back-link">← Tous les débats</Link>
      {!persistent && <p className="notice">Mode de démonstration : les contributions sont temporaires. Configurez DATABASE_URL pour les conserver.</p>}
      <header className="debate-heading">
        <p className="eyebrow">Débat ouvert</p>
        <h1 className="serif">{debate.title}</h1>
        <div className="debate-meta">
          <span>Ouvert par <strong>{debate.from || "Participant"}</strong></span>
          <span>Départ : <strong>{debate.start || "discussion"}</strong></span>
          <span>Thème : <strong>{debate.theme === "economy-tech" ? "Économie / travail / tech" : debate.theme || "—"}</strong></span>
          <span>Mode : <strong>{debate.antiReaction ? "🐢 Anti-quick" : "⚡ Normal"}</strong></span>
          <span>Confiance : <strong>{debate.confidence ?? 0}%</strong> 💪</span>
          <span>Icône : <strong>{debate.icon || "—"}</strong></span>
        </div>
      </header>
      <DebateControls />
      <ThreadView debate={debate} comments={comments} />
    </main>
  );
}