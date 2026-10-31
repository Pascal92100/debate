import { NextResponse } from "next/server";
import { deleteOwnDiscussionMessage } from "@/lib/discussions";

export const runtime = "nodejs";

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string; messageId: string }> }) {
  const { id, messageId } = await params;
  const deleted = await deleteOwnDiscussionMessage(id, messageId);
  if (!deleted) return NextResponse.json({ error: "Message not found or not owned by this account." }, { status: 404 });
  return NextResponse.json({ success: true });
}