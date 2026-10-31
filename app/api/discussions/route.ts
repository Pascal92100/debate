import { NextResponse } from "next/server";
import { createDiscussion, listDiscussions } from "@/lib/discussions";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const profileId = searchParams.get("profileId");
  if (!profileId) return NextResponse.json({ error: "A profile is required." }, { status: 400 });
  return NextResponse.json({ discussions: await listDiscussions(profileId) });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body.profileId !== "string" || typeof body.title !== "string" || body.title.trim().length < 2 || typeof body.body !== "string" || body.body.trim().length < 1) {
    return NextResponse.json({ error: "A title and opening message are required." }, { status: 400 });
  }
  if (body.circleId !== undefined && body.circleId !== null && typeof body.circleId !== "string") return NextResponse.json({ error: "Choose a valid Circle." }, { status: 400 });
  const discussion = await createDiscussion({ profileId: body.profileId, title: body.title, body: body.body, circleId: typeof body.circleId === "string" ? body.circleId : null });
  if (!discussion) return NextResponse.json({ error: "Profile not found or not owned by this account." }, { status: 404 });
  return NextResponse.json({ discussion }, { status: 201 });
}