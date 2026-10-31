import { NextResponse } from "next/server";
import { deleteOwnCircle } from "@/lib/social";

export const runtime = "nodejs";

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const deleted = await deleteOwnCircle(id);
  if (!deleted) return NextResponse.json({ error: "Circle not found or not owned by this account." }, { status: 404 });
  return NextResponse.json({ success: true });
}