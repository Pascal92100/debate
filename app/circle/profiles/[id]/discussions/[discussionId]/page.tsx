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
    <header className="discussion-sticky-header"><div className="discussion-sticky-profile"><Link className="back-link" href={basePath}>← {profile.name}</Link><span className="eyebrow">Simple discussion</span></div><h1>{discussion.title}</h1><Link className="discussion-back-action" href={basePath} aria-label="Back to discussions" title="Back to discussions">←</Link></header>
    <DiscussionThread initialDiscussion={discussion} profiles={profiles} authorProfileId={profile.id} />
    {discussion.profileId === profile.id && <DeleteEntityButton endpoint={`/api/discussions/${encodeURIComponent(discussion.id)}`} label="Delete discussion" confirmation="Permanently delete this discussion and all its messages? This cannot be undone." redirectTo={basePath} />}
  </main>;
}