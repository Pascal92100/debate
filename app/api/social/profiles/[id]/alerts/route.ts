import { NextResponse } from "next/server";
import { listProfileAlerts } from "@/lib/profile-modules";

export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return NextResponse.json({ alerts: await listProfileAlerts(id) });
}