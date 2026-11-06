import { NextResponse } from "next/server";
import { getSessionAccountId, getSocialPost, listProfiles, listSocialPostReactionData, toggleSocialReaction } from "@/lib/social";

export const runtime = "nodejs";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json().catch(() => null);
  if (!body || typeof body.reaction !== "string") return NextResponse.json({ error: "Invalid reaction." }, { status: 400 });
  const post = await getSocialPost(id);
  if (!post || post.visibility !== "public" || post.circleId) return NextResponse.json({ error: "Post not found." }, { status: 404 });
  try {
    const accountId = process.env.DATABASE_URL ? await getSessionAccountId() : "account-demo";
    if (process.env.DATABASE_URL && !accountId) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    const profiles = await listProfiles();
    const profileId = typeof body.profileId === "string" ? body.profileId : "";
    if (!profileId) return NextResponse.json({ error: "Create a profile before reacting." }, { status: 400 });
    if (!profiles.some((profile) => profile.id === profileId && profile.accountId === accountId)) return NextResponse.json({ error: "Profile not found." }, { status: 404 });
    const reactions = await toggleSocialReaction(id, body.reaction, profileId);
    const reactionData = await listSocialPostReactionData([id], profileId);
    return NextResponse.json({ reactions, viewerReaction: reactionData[id]?.viewerReaction ?? null });
  } catch {
    return NextResponse.json({ error: "Unknown reaction." }, { status: 400 });
  }
}
