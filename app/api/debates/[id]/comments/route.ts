import { NextResponse } from "next/server";
import { createComment, isPersistentStore } from "@/lib/debates";

export const runtime = "nodejs";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json().catch(() => null);
  if (!body || typeof body.replyTo !== "string" || typeof body.text !== "string" || !body.text.trim()) {
    return NextResponse.json({ error: "A reply and its target are required." }, { status: 400 });
  }
  const comment = await createComment(id, {
    replyTo: body.replyTo,
    text: body.text,
    title: typeof body.title === "string" ? body.title : undefined,
    evaluation: typeof body.evaluation === "string" ? body.evaluation : undefined
  });
  if (!comment) return NextResponse.json({ error: "Debate not found." }, { status: 404 });
  return NextResponse.json({ comment, persistent: await isPersistentStore() }, { status: 201 });
}