import { NextResponse } from "next/server";
import { toggleSocialReaction } from "@/lib/social";

export const runtime = "nodejs";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json().catch(() => null);
  if (!body || typeof body.reaction !== "string") return NextResponse.json({ error: "Invalid reaction." }, { status: 400 });
  try {
    const reactions = await toggleSocialReaction(id, body.reaction);
    return NextResponse.json({ reactions });
  } catch {
    return NextResponse.json({ error: "Unknown reaction." }, { status: 400 });
  }
}
