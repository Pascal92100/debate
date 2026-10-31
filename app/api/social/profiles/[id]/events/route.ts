import { NextResponse } from "next/server";
import { createProfileEvent, deleteProfileEvent, listProfileEvents } from "@/lib/profile-modules";

export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return NextResponse.json({ events: await listProfileEvents(id) });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json().catch(() => null);
  if (!body || typeof body.title !== "string" || body.title.trim().length < 2 || typeof body.description !== "string" || typeof body.location !== "string" || (body.startsAt !== null && typeof body.startsAt !== "string") || (body.startsAt && !Number.isFinite(Date.parse(body.startsAt)))) {
    return NextResponse.json({ error: "An event title and valid date are required." }, { status: 400 });
  }
  const event = await createProfileEvent({ profileId: id, title: body.title, description: body.description, startsAt: body.startsAt, location: body.location });
  if (!event) return NextResponse.json({ error: "Profile not found or not owned by this account." }, { status: 404 });
  return NextResponse.json({ event }, { status: 201 });
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "An event ID is required." }, { status: 400 });
  const deleted = await deleteProfileEvent(id);
  if (!deleted) return NextResponse.json({ error: "Event not found or not owned by this account." }, { status: 404 });
  return NextResponse.json({ success: true });
}