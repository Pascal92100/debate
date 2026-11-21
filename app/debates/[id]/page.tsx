import Link from "next/link";
import { notFound } from "next/navigation";
import { getDebate, isPersistentStore, listArgumentEvaluations, listDebateReports, listDebateStatuses } from "@/lib/debates";
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
  const [evaluations, reports, statuses] = await Promise.all([listArgumentEvaluations(debate.id, evaluatorProfile?.id), listDebateReports(debate.id, evaluatorProfile?.id), listDebateStatuses(debate.id, evaluatorProfile?.id)]);
  const ownedAuthor = profiles.find((profile) => profile.id === debate.authorProfileId);
  return (
    <main className="debate-shell">
      <nav className="debate-return-links" aria-label="Debate navigation"><Link href={ownedAuthor ? `/circle/profiles/${encodeURIComponent(ownedAuthor.id)}/discussions` : "/circle"} className="back-link">← {ownedAuthor ? `${ownedAuthor.name} discussions` : "Circles account"}</Link><Link href={debate.authorProfileId ? `/debates?profileId=${encodeURIComponent(debate.authorProfileId)}` : "/debates"} className="back-link">← All debates</Link></nav>
      {!persistent && <p className="notice">Demo mode: contributions are temporary. Set DATABASE_URL to keep them.</p>}
      <ThreadView debate={debate} comments={comments} ownedProfileIds={ownProfiles.map((profile) => profile.id)} evaluatorProfileId={evaluatorProfile?.id} initialEvaluations={evaluations} initialReports={reports} initialStatuses={statuses} />
      {debate.authorProfileId && profiles.some((profile) => profile.id === debate.authorProfileId) && <DeleteEntityButton endpoint={`/api/debates/${encodeURIComponent(debate.id)}`} label="Delete debate" confirmation="Permanently delete this debate and all of its replies? This cannot be undone." redirectTo="/debates" />}
    </main>
  );
}