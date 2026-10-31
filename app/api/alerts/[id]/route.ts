import { NextResponse } from "next/server";
import { markProfileAlertRead } from "@/lib/profile-modules";

export const runtime = "nodejs";

export async function PATCH(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const updated = await markProfileAlertRead(id);
  if (!updated) return NextResponse.json({ error: "Alert not found or already read." }, { status: 404 });
  return NextResponse.json({ success: true });
}