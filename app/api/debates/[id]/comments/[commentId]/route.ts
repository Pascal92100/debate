import { NextResponse } from "next/server";
import { deleteOwnComment, editOwnComment } from "@/lib/debates";
import { getSessionAccountId } from "@/lib/auth";
import { isPersistentStore } from "@/lib/debates";
import { listProfiles } from "@/lib/social";

export const runtime = "nodejs";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string; commentId: string }> }) {
  const { id, commentId } = await params;
  const body = await request.json().catch(() => null);
  if (!body || typeof body.title !== "string" || body.title.trim().length < 2 || body.title.trim().length > 140 || typeof body.text !== "string") return NextResponse.json({ error: "Enter a reply title and text." }, { status: 400 });
  const persistent = await isPersistentStore();
  const accountId = persistent ? await getSessionAccountId() : "account-demo";
  const profile = (await listProfiles()).find((item) => item.kind === "individual" && item.accountId === accountId && (typeof body.profileId !== "string" || item.id === body.profileId));
  if (!profile) return NextResponse.json({ error: "Profile not found." }, { status: 404 });
  const comment = await editOwnComment(id, commentId, profile.id, { title: body.title, text: body.text });
  if (!comment) return NextResponse.json({ error: "Only the author can edit a reply marked for rewriting." }, { status: 403 });
  return NextResponse.json({ comment });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string; commentId: string }> }) {
  const { id, commentId } = await params;
  const deleted = await deleteOwnComment(id, commentId);
  if (!deleted) return NextResponse.json({ error: "Reply not found or not owned by this account." }, { status: 404 });
  return NextResponse.json({ success: true });
}