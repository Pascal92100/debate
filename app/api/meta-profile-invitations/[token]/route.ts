import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getMetaProfileInvitation, respondToMetaProfileInvitation } from "@/lib/meta-profile-invitations";

export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const invitation = await getMetaProfileInvitation(token);
  if (!invitation) return NextResponse.json({ error: "This invitation link is invalid." }, { status: 404 });
  return NextResponse.json({ invitation });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const body = await request.json().catch(() => null);
  if (!body || !["accept", "decline"].includes(body.action)) return NextResponse.json({ error: "Choose whether to accept or decline." }, { status: 400 });
  const invitation = await getMetaProfileInvitation(token);
  const updated = await respondToMetaProfileInvitation(token, body.action, typeof body.profileId === "string" ? body.profileId : undefined);
  if (!updated) return NextResponse.json({ error: "Invitation expired, already answered, or not available to this profile." }, { status: 404 });
  if (body.action === "accept" && invitation) revalidatePath(`/circle/profiles/${encodeURIComponent(invitation.metaProfileId)}`);
  return NextResponse.json({ success: true });
}