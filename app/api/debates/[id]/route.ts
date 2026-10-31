import { NextResponse } from "next/server";
import { deleteOwnDebate, getDebate, isPersistentStore } from "@/lib/debates";

export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const debate = await getDebate(id);
  if (!debate) return NextResponse.json({ error: "Debate not found." }, { status: 404 });
  return NextResponse.json({ debate, persistent: await isPersistentStore() });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const deleted = await deleteOwnDebate(id);
  if (!deleted) return NextResponse.json({ error: "Debate not found or not owned by this account." }, { status: 404 });
  return NextResponse.json({ success: true });
}