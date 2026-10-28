import { NextResponse } from "next/server";
import { createReport, getDebate } from "@/lib/debates";

export const runtime = "nodejs";

const reasons = new Set([
  "🚫 Interdit",
  "💨 Hors sujet",
  "🤣 Humour",
  "🔀 Déviation",
  "🔄🤯 Mauvais raisonnement",
  "❓ Invérifiable",
  "☢️ Manipulation",
  "🔞 Sexuel",
  "⚠️ Choquant",
  "❌ Agressif"
]);

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json().catch(() => null);
  if (!body || typeof body.messageId !== "string" || typeof body.reason !== "string" || !reasons.has(body.reason)) {
    return NextResponse.json({ error: "Message ou motif de signalement invalide." }, { status: 400 });
  }
  if (!await getDebate(id)) return NextResponse.json({ error: "Débat introuvable." }, { status: 404 });
  const report = await createReport(id, body.messageId, body.reason);
  return NextResponse.json({ report }, { status: 201 });
}