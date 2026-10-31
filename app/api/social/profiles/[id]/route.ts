import { NextResponse } from "next/server";
import { deleteOwnProfile } from "@/lib/social";

export const runtime = "nodejs";

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const deleted = await deleteOwnProfile(id);
  if (!deleted) return NextResponse.json({ error: "Profile not found or not owned by this account." }, { status: 404 });
  return NextResponse.json({ success: true });
}