import { NextResponse } from "next/server";
import { addDiscussionMessage } from "@/lib/discussions";

export const runtime = "nodejs";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json().catch(() => null);
  if (!body || typeof body.profileId !== "string" || typeof body.body !== "string" || body.body.trim().length < 1 || body.body.length > 5000 || (body.replyToId !== undefined && typeof body.replyToId !== "string")) {
    return NextResponse.json({ error: "Write a message before sending it." }, { status: 400 });
  }
  const message = await addDiscussionMessage(id, { profileId: body.profileId, body: body.body, replyToId: body.replyToId });
  if (!message) return NextResponse.json({ error: "Discussion, reply, or author profile is not available." }, { status: 404 });
  return NextResponse.json({ message }, { status: 201 });
}