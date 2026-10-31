import { NextResponse } from "next/server";
import { deleteOwnDiscussion } from "@/lib/discussions";

export const runtime = "nodejs";

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const deleted = await deleteOwnDiscussion(id);
  if (!deleted) return NextResponse.json({ error: "Discussion not found or not owned by this account." }, { status: 404 });
  return NextResponse.json({ success: true });
}