import { SocialCircles } from "@/components/social-circles";
import { SocialNav } from "@/components/social-nav";
import { isPersistentStore } from "@/lib/debates";
import { listCircles } from "@/lib/social";

export const dynamic = "force-dynamic";

export default async function CirclesPage() {
  const [circles, persistent] = await Promise.all([listCircles(), isPersistentStore()]);
  return <main className="social-shell social-directory-shell"><div className="social-page-heading"><div><p className="eyebrow">Social network</p><h1>Circles</h1></div><SocialNav active="circles" /></div><SocialCircles initialCircles={circles} persistent={persistent} /></main>;
}
