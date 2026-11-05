import Link from "next/link";
import { notFound } from "next/navigation";
import { ProfileContextBar } from "@/components/profile-context-bar";
import { ProfileDescriptionsEditor } from "@/components/profile-descriptions-editor";
import { isPersistentStore } from "@/lib/debates";
import { getAccountDescription, getProfileDescription, listCircles, listProfilesCached } from "@/lib/social";

export const dynamic = "force-dynamic";

export default async function ProfileDescriptionsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [profiles, description, accountDescription, circles, persistent] = await Promise.all([listProfilesCached(), getProfileDescription(id), getAccountDescription(), listCircles(), isPersistentStore()]);
  const profile = profiles.find((item) => item.id === id);
  if (!profile) notFound();
  return <main className="social-shell social-directory-shell">
    <div className="social-page-heading"><div><p className="eyebrow">Profile space</p><h1>Descriptions</h1></div><Link className="back-link" href={`/circle/profiles/${encodeURIComponent(id)}`}>← {profile.name}</Link></div>
    <ProfileContextBar profile={profile} profiles={profiles} />
    <ProfileDescriptionsEditor profile={profile} initialDescription={description} accountDescription={accountDescription} circles={circles} persistent={persistent} />
  </main>;
}
