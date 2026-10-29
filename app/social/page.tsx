import { SocialFeed } from "@/components/social-feed";
import { SocialNav } from "@/components/social-nav";
import { isPersistentStore } from "@/lib/debates";
import { listCircles, listProfiles, listSocialPosts } from "@/lib/social";

export const dynamic = "force-dynamic";

export default async function SocialPage({ searchParams }: { searchParams: Promise<{ circle?: string; profileId?: string }> }) {
  const [{ circle, profileId }, persistent] = await Promise.all([searchParams, isPersistentStore()]);
  const [posts, circles, profiles] = await Promise.all([listSocialPosts(circle), listCircles(), listProfiles()]);
  return <main className="social-shell"><div className="social-page-heading"><div><p className="eyebrow">Réseau</p><h1>Circle</h1></div><SocialNav active="feed" /></div><SocialFeed initialPosts={posts} circles={circles} profiles={profiles} persistent={persistent} initialCircleId={circle ?? ""} initialProfileId={profileId ?? ""} /></main>;
}
