import { NextResponse } from "next/server";
import { getSessionAccountId } from "@/lib/auth";
import { isPersistentStore, toggleArgumentEvaluation } from "@/lib/debates";
import { listProfiles } from "@/lib/social";

export const runtime = "nodejs";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json().catch(() => null);
  if (!body || typeof body.argumentId !== "string" || typeof body.evaluation !== "string") {
    return NextResponse.json({ error: "Choose an evaluation for a debate paragraph." }, { status: 400 });
  }
  const persistent = await isPersistentStore();
  const accountId = persistent ? await getSessionAccountId() : "account-demo";
  if (persistent && !accountId) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const profile = (await listProfiles()).find((item) => item.kind === "individual" && item.accountId === accountId);
  if (!profile) return NextResponse.json({ error: "Create an individual profile before evaluating a paragraph." }, { status: 400 });
  try {
    const result = await toggleArgumentEvaluation(id, body.argumentId, profile.id, body.evaluation);
    if (!result) return NextResponse.json({ error: "Debate paragraph not found." }, { status: 404 });
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "Unknown evaluation." }, { status: 400 });
  }
}