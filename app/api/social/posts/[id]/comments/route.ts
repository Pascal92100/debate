import { NextResponse } from "next/server";
import { createPostComment, listPostComments } from "@/lib/post-comments";
import { validMediaAttachments } from "@/lib/media";

export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return NextResponse.json({ comments: await listPostComments(id) });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json().catch(() => null);
  if (!body || typeof body.profileId !== "string" || typeof body.body !== "string" || body.body.trim().length < 1 && !validMediaAttachments(body.media)) return NextResponse.json({ error: "Write a comment or attach media." }, { status: 400 });
  if (body.media !== undefined && !validMediaAttachments(body.media)) return NextResponse.json({ error: "Invalid media attachments." }, { status: 400 });
  if (body.replyToId !== undefined && typeof body.replyToId !== "string") return NextResponse.json({ error: "Invalid reply target." }, { status: 400 });
  const comment = await createPostComment(id, { profileId: body.profileId, body: body.body, media: body.media ?? [], replyToId: body.replyToId });
  if (!comment) return NextResponse.json({ error: "Post or author profile is not available." }, { status: 404 });
  return NextResponse.json({ comment }, { status: 201 });
}