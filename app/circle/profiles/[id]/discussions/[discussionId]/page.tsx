import Link from "next/link";
import { notFound } from "next/navigation";
import { DeleteEntityButton } from "@/components/delete-entity-button";
import { DiscussionThread } from "@/components/discussion-thread";
import { getDiscussion } from "@/lib/discussions";
import { listCircles, listProfiles } from "@/lib/social";

export const dynamic = "force-dynamic";

export default async function SimpleDiscussionPage({ params }: { params: Promise<{ id: string; discussionId: string }> }) {
  const { id, discussionId } = await params;
  const [profiles, circles, discussion] = await Promise.all([listProfiles(), listCircles(), getDiscussion(discussionId)]);
  const profile = profiles.find((item) => item.id === id);
  const canAccess = discussion?.profileId === profile?.id || Boolean(discussion?.circleId && circles.some((circle) => circle.id === discussion.circleId));
  if (!profile || !discussion || !canAccess) notFound();
  const basePath = `/circle/profiles/${encodeURIComponent(profile.id)}/discussions`;
  return <main className="social-shell social-directory-shell">
    <div className="social-page-heading"><div><p className="eyebrow">{profile.name} · Simple discussion</p><h1>{discussion.title}</h1></div><Link className="back-link" href={basePath}>← Discussions</Link></div>
    <p className="discussion-mode-note">Messages appear in writing order. Replies quote the message they refer to; this is not a structured debate.</p>
    <DiscussionThread initialDiscussion={discussion} profiles={profiles} authorProfileId={profile.id} />
    <section className="danger-zone"><p className="eyebrow">Discussion ownership</p><h2>Delete this discussion</h2><p>This permanently removes the discussion and all its messages.</p><DeleteEntityButton endpoint={`/api/discussions/${encodeURIComponent(discussion.id)}`} label="Delete discussion" confirmation="Permanently delete this discussion and all its messages? This cannot be undone." redirectTo={basePath} /></section>
  </main>;
}