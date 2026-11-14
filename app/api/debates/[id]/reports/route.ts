import { NextResponse } from "next/server";
import { getSessionAccountId } from "@/lib/auth";
import { isPersistentStore, toggleDebateReport } from "@/lib/debates";
import { listProfiles } from "@/lib/social";

export const runtime = "nodejs";

const reasons = new Set([
  "🚫 Prohibited",
  "💨 Off topic",
  "🤣 Humor",
  "🔀 Derailment",
  "🔄🤯 Faulty reasoning",
  "❓ Unverifiable",
  "☢️ Manipulation",
  "🔞 Sexual",
  "⚠️ Disturbing",
  "❌ Aggressive"
]);

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json().catch(() => null);
  if (!body || typeof body.messageId !== "string" || typeof body.reason !== "string" || !reasons.has(body.reason)) {
    return NextResponse.json({ error: "Invalid message or report reason." }, { status: 400 });
  }
  const persistent = await isPersistentStore();
  const accountId = persistent ? await getSessionAccountId() : "account-demo";
  if (!accountId) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const profiles = await listProfiles();
  const profile = profiles.find((item) => item.kind === "individual" && item.accountId === accountId && (typeof body.profileId === "string" ? item.id === body.profileId : true));
  if (!profile) return NextResponse.json({ error: "Create a profile before reporting." }, { status: 400 });
  const report = await toggleDebateReport(id, body.messageId, body.reason, profile.id);
  if (!report) return NextResponse.json({ error: "Debate message not found." }, { status: 404 });
  return NextResponse.json(report);
}