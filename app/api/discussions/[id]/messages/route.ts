import { NextResponse } from "next/server";
import { addDiscussionMessage } from "@/lib/discussions";
import { validMediaAttachments } from "@/lib/media";

export const runtime = "nodejs";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json().catch(() => null);
  if (!body || typeof body.profileId !== "string" || typeof body.body !== "string" || body.body.length > 5000 || (body.body.trim().length < 1 && !validMediaAttachments(body.media)) || (body.replyToId !== undefined && typeof body.replyToId !== "string")) {
    return NextResponse.json({ error: "Write a message or attach media before sending." }, { status: 400 });
  }
  if (body.media !== undefined && !validMediaAttachments(body.media)) return NextResponse.json({ error: "Invalid media attachments." }, { status: 400 });
  const message = await addDiscussionMessage(id, { profileId: body.profileId, body: body.body, media: body.media ?? [], replyToId: body.replyToId });
  if (!message) return NextResponse.json({ error: "Discussion, reply, or author profile is not available." }, { status: 404 });
  return NextResponse.json({ message }, { status: 201 });
}