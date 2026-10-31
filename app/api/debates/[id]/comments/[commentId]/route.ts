import { NextResponse } from "next/server";
import { deleteOwnComment } from "@/lib/debates";

export const runtime = "nodejs";

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string; commentId: string }> }) {
  const { id, commentId } = await params;
  const deleted = await deleteOwnComment(id, commentId);
  if (!deleted) return NextResponse.json({ error: "Reply not found or not owned by this account." }, { status: 404 });
  return NextResponse.json({ success: true });
}