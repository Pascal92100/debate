import { NextResponse } from "next/server";
import { createComment, isPersistentStore } from "@/lib/debates";
import { validMediaAttachments } from "@/lib/media";

export const runtime = "nodejs";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json().catch(() => null);
  if (!body || typeof body.replyTo !== "string" || typeof body.text !== "string" || (body.text.trim().length < 2 && !validMediaAttachments(body.media))) {
    return NextResponse.json({ error: "Write a reply or attach media." }, { status: 400 });
  }
  if (body.media !== undefined && !validMediaAttachments(body.media)) return NextResponse.json({ error: "Invalid media attachments." }, { status: 400 });
  const comment = await createComment(id, {
    replyTo: body.replyTo,
    text: body.text,
    title: typeof body.title === "string" ? body.title : undefined,
    evaluation: typeof body.evaluation === "string" ? body.evaluation : undefined,
    media: body.media ?? []
  });
  if (!comment) return NextResponse.json({ error: "Debate not found." }, { status: 404 });
  return NextResponse.json({ comment, persistent: await isPersistentStore() }, { status: 201 });
}