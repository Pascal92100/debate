import Link from "next/link";
import { notFound } from "next/navigation";
import { getDebate, isPersistentStore, listArgumentEvaluations, listDebateReports } from "@/lib/debates";
import { ThreadView } from "@/components/thread-view";
import { DeleteEntityButton } from "@/components/delete-entity-button";
import { listProfilesCached } from "@/lib/social";
import { getSessionAccountId } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function DebatePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ profileId?: string }> }) {
  const { id } = await params;
  const [debate, persistent, profiles, query] = await Promise.all([getDebate(id), isPersistentStore(), listProfilesCached(), searchParams]);
  if (!debate) notFound();

  const comments = debate.children ?? [];
  const accountId = persistent ? await getSessionAccountId() : "account-demo";
  const ownProfiles = profiles.filter((profile) => profile.accountId === accountId);
  const evaluatorProfile = ownProfiles.find((profile) => profile.kind === "individual" && profile.id === query.profileId) ?? ownProfiles.find((profile) => profile.kind === "individual");
  const [evaluations, reports] = await Promise.all([listArgumentEvaluations(debate.id, evaluatorProfile?.id), listDebateReports(debate.id, evaluatorProfile?.id)]);
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
      <ThreadView debate={debate} comments={comments} ownedProfileIds={ownProfiles.map((profile) => profile.id)} evaluatorProfileId={evaluatorProfile?.id} initialEvaluations={evaluations} initialReports={reports} />
      {debate.authorProfileId && profiles.some((profile) => profile.id === debate.authorProfileId) && <DeleteEntityButton endpoint={`/api/debates/${encodeURIComponent(debate.id)}`} label="Delete debate" confirmation="Permanently delete this debate and all of its replies? This cannot be undone." redirectTo="/debates" />}
    </main>
  );
}