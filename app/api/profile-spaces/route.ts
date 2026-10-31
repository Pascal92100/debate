import { NextResponse } from "next/server";
import { createProfileSpace, deleteProfileSpace, listProfileSpaces, type ProfileSpaceKind } from "@/lib/profile-spaces";

export const runtime = "nodejs";
const kinds = new Set<ProfileSpaceKind>(["communities", "groups", "forums"]);

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const profileId = searchParams.get("profileId");
  const kind = searchParams.get("kind") as ProfileSpaceKind | null;
  if (!profileId || !kind || !kinds.has(kind)) return NextResponse.json({ error: "A profile and valid space type are required." }, { status: 400 });
  return NextResponse.json({ spaces: await listProfileSpaces(profileId, kind) });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body.profileId !== "string" || typeof body.kind !== "string" || !kinds.has(body.kind as ProfileSpaceKind) || typeof body.name !== "string" || body.name.trim().length < 2 || typeof body.description !== "string") {
    return NextResponse.json({ error: "A valid space type, name, and description are required." }, { status: 400 });
  }
  const space = await createProfileSpace({ profileId: body.profileId, kind: body.kind as ProfileSpaceKind, name: body.name, description: body.description });
  if (!space) return NextResponse.json({ error: "Profile not found or not owned by this account." }, { status: 404 });
  return NextResponse.json({ space }, { status: 201 });
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "A space ID is required." }, { status: 400 });
  const deleted = await deleteProfileSpace(id);
  if (!deleted) return NextResponse.json({ error: "Space not found or not owned by this account." }, { status: 404 });
  return NextResponse.json({ success: true });
}