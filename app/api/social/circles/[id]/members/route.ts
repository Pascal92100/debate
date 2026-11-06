import { NextResponse } from "next/server";
import { contactGraphFor, searchDiscoverableProfiles } from "@/lib/meta-profile-invitations";
import { addOwnCircleMember, listCircles, listProfilesCached, listOwnCircleMembers, removeOwnCircleMember } from "@/lib/social";

export const runtime = "nodejs";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const members = await listOwnCircleMembers(id);
  if (!members) return NextResponse.json({ error: "Circle not found or not owned by this account." }, { status: 404 });
  const query = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (!query) return NextResponse.json({ members });
  const circle = (await listCircles()).find((item) => item.id === id);
  if (!circle) return NextResponse.json({ error: "Circle not found." }, { status: 404 });
  const profiles = await listProfilesCached();
  const owner = profiles.find((profile) => profile.id === circle.ownerProfileId);
  const direct = owner ? await contactGraphFor([owner.id]) : new Map<string, Set<string>>();
  const allowed = new Set([...profiles.filter((profile) => profile.accountId === owner?.accountId).map((profile) => profile.id), ...(direct.get(circle.ownerProfileId) ?? [])]);
  const results = await searchDiscoverableProfiles(query, "individual", circle.ownerProfileId);
  return NextResponse.json({ profiles: results.filter((profile) => allowed.has(profile.id) && !members.some((member) => member.id === profile.id)) });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json().catch(() => null);
  if (!body || typeof body.profileId !== "string") return NextResponse.json({ error: "Choose a profile to add." }, { status: 400 });
  const added = await addOwnCircleMember(id, body.profileId);
  if (!added) return NextResponse.json({ error: "Only one of your profiles or a direct contact can be added." }, { status: 403 });
  return NextResponse.json({ success: true });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json().catch(() => null);
  if (!body || typeof body.profileId !== "string") return NextResponse.json({ error: "Choose a profile to remove." }, { status: 400 });
  const removed = await removeOwnCircleMember(id, body.profileId);
  if (!removed) return NextResponse.json({ error: "Member not found or not removable." }, { status: 404 });
  return NextResponse.json({ success: true });
}
