import { NextResponse } from "next/server";
import { createComment, isPersistentStore } from "@/lib/debates";

export const runtime = "nodejs";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json().catch(() => null);
  if (!body || typeof body.replyTo !== "string" || typeof body.text !== "string" || !body.text.trim()) {
    return NextResponse.json({ error: "Le commentaire et son point de réponse sont nécessaires." }, { status: 400 });
  }
  const comment = await createComment(id, body);
  if (!comment) return NextResponse.json({ error: "Débat introuvable." }, { status: 404 });
  return NextResponse.json({ comment, persistent: await isPersistentStore() }, { status: 201 });
}