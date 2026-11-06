import { NextResponse } from "next/server";
import { getPublicSocialPost, getSessionAccountId, listProfiles, listSocialPostReactionData } from "@/lib/social";
import { isPersistentStore } from "@/lib/debates";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const profileId = searchParams.get("profileId") ?? "";
  const postIds = [...new Set(searchParams.getAll("postId"))].slice(0, 50);
  if (!profileId || postIds.length === 0) return NextResponse.json({ error: "Choose a profile and at least one post." }, { status: 400 });

  const persistent = await isPersistentStore();
  const accountId = persistent ? await getSessionAccountId() : "account-demo";
  if (persistent && !accountId) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const profiles = await listProfiles();
  if (!profiles.some((profile) => profile.id === profileId && profile.kind === "individual" && profile.accountId === accountId)) {
    return NextResponse.json({ error: "Profile not found." }, { status: 404 });
  }

  const publicPosts = (await Promise.all(postIds.map((id) => getPublicSocialPost(id))))
    .filter((post): post is NonNullable<typeof post> => Boolean(post));
  const data = await listSocialPostReactionData(publicPosts.map((post) => post.id), profileId);
  const reactions = Object.fromEntries(publicPosts.map((post) => {
    const totals = { ...(post.reactions ?? {}) };
    for (const [reaction, count] of Object.entries(data[post.id]?.counts ?? {})) totals[reaction] = (totals[reaction] ?? 0) + count;
    return [post.id, { reactions: totals, viewerReaction: data[post.id]?.viewerReaction ?? null }];
  }));
  return NextResponse.json({ reactions });
}