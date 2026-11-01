import { NextResponse } from "next/server";
import { leaveMetaProfile } from "@/lib/meta-profile-invitations";

export const runtime = "nodejs";

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string; memberId: string }> }) {
  const { id, memberId } = await params;
  const result = await leaveMetaProfile(id, memberId);
  if (!result) return NextResponse.json({ error: "This profile is not a member of the meta-profile or is not yours." }, { status: 404 });
  return NextResponse.json(result);
}