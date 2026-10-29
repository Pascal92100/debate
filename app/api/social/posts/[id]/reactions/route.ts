import { NextResponse } from "next/server";
import { getSessionAccountId, getSocialPost, listProfiles, toggleSocialReaction } from "@/lib/social";

export const runtime = "nodejs";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json().catch(() => null);
  if (!body || typeof body.reaction !== "string") return NextResponse.json({ error: "Invalid reaction." }, { status: 400 });
  if (!await getSocialPost(id)) return NextResponse.json({ error: "Post not found." }, { status: 404 });
  try {
    const accountId = process.env.DATABASE_URL ? await getSessionAccountId() : null;
    const profiles = await listProfiles();
    const profileId = typeof body.profileId === "string" && profiles.some((profile) => profile.id === body.profileId)
      ? body.profileId
      : profiles.find((profile) => profile.id === "profile-john")?.id ?? profiles[0]?.id;
    if (!profileId) return NextResponse.json({ error: "Create a profile before reacting." }, { status: 400 });
    if (accountId && !profiles.some((profile) => profile.id === profileId && profile.accountId === accountId)) return NextResponse.json({ error: "Profile not found." }, { status: 404 });
    const reactions = await toggleSocialReaction(id, body.reaction, profileId);
    return NextResponse.json({ reactions });
  } catch {
    return NextResponse.json({ error: "Unknown reaction." }, { status: 400 });
  }
}
