import { NextResponse } from "next/server";
import { createMetaProfileInvitation } from "@/lib/meta-profile-invitations";

export const runtime = "nodejs";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json().catch(() => null);
  const invitation = await createMetaProfileInvitation(id, id, typeof body?.profileId === "string" ? body.profileId : null);
  if (!invitation) return NextResponse.json({ error: "The meta-profile or selected profile is not available for invitation." }, { status: 404 });
  const inviteUrl = new URL(`/circle/meta-profiles/invite/${encodeURIComponent(invitation.token)}`, request.url).toString();
  return NextResponse.json({ invitation, inviteUrl }, { status: 201 });
}