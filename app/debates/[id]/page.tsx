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
      <Link href="/debates" className="back-link">← All debates</Link>
      {!persistent && <p className="notice">Demo mode: contributions are temporary. Set DATABASE_URL to keep them.</p>}
      <header className="debate-heading">
        <p className="eyebrow">Open debate</p>
        <h1 className="serif">{debate.title}</h1>
        <div className="debate-meta">
          <span>Opened by <strong>{debate.from || "Participant"}</strong></span>
          <span>Starting point: <strong>{debate.start || "discussion"}</strong></span>
          <span>Theme: <strong>{debate.theme === "economy-tech" ? "Economy / work / tech" : debate.theme || "—"}</strong></span>
          <span>Mode: <strong>{debate.antiReaction ? "🐢 Slow mode" : "⚡ Normal"}</strong></span>
          <span>Confidence: <strong>{debate.confidence ?? 0}%</strong> 💪</span>
          <span>Icon: <strong>{debate.icon || "—"}</strong></span>
        </div>
        {debate.sourcePostId && <Link className="source-post-link" href={`/social#${encodeURIComponent(debate.sourcePostId)}`}>View original post in Circles →</Link>}
      </header>
      <DebateControls />
      <ThreadView debate={debate} comments={comments} />
    </main>
  );
}