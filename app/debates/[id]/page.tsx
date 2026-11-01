import Link from "next/link";
import { notFound } from "next/navigation";
import { getDebate, isPersistentStore } from "@/lib/debates";
import { ThreadView } from "@/components/thread-view";
import { DebateControls } from "@/components/debate-controls";
import { DeleteEntityButton } from "@/components/delete-entity-button";
import { listProfiles } from "@/lib/social";

export const dynamic = "force-dynamic";

export default async function DebatePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [debate, persistent, profiles] = await Promise.all([getDebate(id), isPersistentStore(), listProfiles()]);
  if (!debate) notFound();

  const comments = debate.children ?? [];
  const ownedAuthor = profiles.find((profile) => profile.id === debate.authorProfileId);
  return (
    <main className="debate-shell">
      <nav className="debate-return-links" aria-label="Debate navigation"><Link href={ownedAuthor ? `/circle/profiles/${encodeURIComponent(ownedAuthor.id)}/discussions` : "/circle"} className="back-link">← {ownedAuthor ? `${ownedAuthor.name} discussions` : "Circles account"}</Link><Link href={debate.authorProfileId ? `/debates?profileId=${encodeURIComponent(debate.authorProfileId)}` : "/debates"} className="back-link">← All debates</Link></nav>
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
      <ThreadView debate={debate} comments={comments} ownedProfileIds={profiles.map((profile) => profile.id)} />
      {debate.authorProfileId && profiles.some((profile) => profile.id === debate.authorProfileId) && <section className="danger-zone"><p className="eyebrow">Debate ownership</p><h2>Delete this debate</h2><p>Only the profile that started this debate can delete it.</p><DeleteEntityButton endpoint={`/api/debates/${encodeURIComponent(debate.id)}`} label="Delete debate" confirmation="Permanently delete this debate and all of its replies? This cannot be undone." redirectTo="/debates" /></section>}
    </main>
  );
}