import { NextResponse } from "next/server";
import { createSocialProfile, getSessionAccountId, listProfiles } from "@/lib/social";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({ profiles: await listProfiles() });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body.name !== "string" || body.name.trim().length < 2) {
    return NextResponse.json({ error: "Le profil doit avoir un nom." }, { status: 400 });
  }
  const accountId = process.env.DATABASE_URL ? await getSessionAccountId() : undefined;
  if (process.env.DATABASE_URL && !accountId) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const profile = await createSocialProfile({
    accountId: accountId ?? undefined,
    name: body.name,
    kind: typeof body.kind === "string" ? body.kind : "individual",
    category: typeof body.category === "string" ? body.category : "Personal",
    bio: typeof body.bio === "string" ? body.bio : "",
    visibility: typeof body.visibility === "string" ? body.visibility : "all",
    socialDistance: Number(body.socialDistance) || 0,
    anonymous: Boolean(body.anonymous),
    members: Array.isArray(body.members) ? body.members.filter((member: unknown): member is string => typeof member === "string") : []
  });
  return NextResponse.json({ profile }, { status: 201 });
}