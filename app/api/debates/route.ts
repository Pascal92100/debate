import { NextResponse } from "next/server";
import { createDebate, isPersistentStore, listDebates } from "@/lib/debates";
import { listProfiles } from "@/lib/social";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({ debates: await listDebates(), persistent: await isPersistentStore() });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body.title !== "string" || body.title.trim().length < 4 || !Array.isArray(body.content) || !body.content.some((text: unknown) => typeof text === "string" && text.trim())) {
    return NextResponse.json({ error: "Un titre et un premier paragraphe sont nécessaires." }, { status: 400 });
  }
  if (typeof body.authorProfileId !== "string") return NextResponse.json({ error: "Choisis le profil qui portera ce débat." }, { status: 400 });
  const profiles = await listProfiles();
  const authorProfile = profiles.find((profile) => profile.id === body.authorProfileId);
  if (!authorProfile) return NextResponse.json({ error: "Le profil auteur est introuvable." }, { status: 400 });
  const debate = await createDebate({ ...body, from: authorProfile.name });
  return NextResponse.json({ debate, persistent: await isPersistentStore() }, { status: 201 });
}