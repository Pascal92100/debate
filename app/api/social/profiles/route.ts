import { NextResponse } from "next/server";
import { createSocialProfile, getSessionAccountId, listProfiles } from "@/lib/social";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({ profiles: await listProfiles() });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body.name !== "string" || body.name.trim().length < 2) {
    return NextResponse.json({ error: "The profile must have a name." }, { status: 400 });
  }
  const kind = body.kind === "meta" ? "meta" : "individual";
  const allowedContexts = kind === "meta" ? ["Family", "Couple", "Group"] : ["Professional", "Personal", "Political", "Dating"];
  if (typeof body.category !== "string" || !allowedContexts.includes(body.category)) {
    return NextResponse.json({ error: `Choose a valid ${kind === "meta" ? "meta-profile type" : "profile context"}.` }, { status: 400 });
  }
  const accountId = process.env.DATABASE_URL ? await getSessionAccountId() : undefined;
  if (process.env.DATABASE_URL && !accountId) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const profile = await createSocialProfile({
    accountId: accountId ?? undefined,
    name: body.name,
    kind,
    category: body.category,
    relationship: kind === "meta" && body.category === "Couple" ? "For friends" : undefined,
    bio: typeof body.bio === "string" ? body.bio : "",
    visibility: typeof body.visibility === "string" ? body.visibility : "all",
    socialDistance: Number(body.socialDistance) || 0,
    anonymous: Boolean(body.anonymous),
    members: Array.isArray(body.members) ? body.members.filter((member: unknown): member is string => typeof member === "string") : []
  });
  return NextResponse.json({ profile }, { status: 201 });
}