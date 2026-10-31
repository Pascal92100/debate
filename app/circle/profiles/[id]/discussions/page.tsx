import Link from "next/link";
import { notFound } from "next/navigation";
import { ProfileDiscussions } from "@/components/profile-discussions";
import { isPersistentStore, listDebates } from "@/lib/debates";
import { listDiscussions } from "@/lib/discussions";
import { listCircles, listProfiles } from "@/lib/social";

export const dynamic = "force-dynamic";

export default async function ProfileDiscussionsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [profiles, debates, discussions, circles, persistent] = await Promise.all([
    listProfiles(),
    listDebates(),
    listDiscussions(id),
    listCircles(),
    isPersistentStore()
  ]);
  const profile = profiles.find((item) => item.id === id);
  if (!profile) notFound();
  const profileDebates = debates.filter((debate) => debate.authorProfileId === id);
  return <main className="social-shell social-directory-shell">
    <div className="social-page-heading"><div><p className="eyebrow">{profile.name} · Profile space</p><h1>Debates and discussions</h1></div><Link className="back-link" href={`/circle/profiles/${encodeURIComponent(id)}`}>← {profile.name}</Link></div>
    <ProfileDiscussions profile={profile} initialDiscussions={discussions} debates={profileDebates} circles={circles} persistent={persistent} />
  </main>;
}