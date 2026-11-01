import { NextResponse } from "next/server";
import { searchInviteProfiles } from "@/lib/meta-profile-invitations";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get("q") ?? "";
  return NextResponse.json({ profiles: await searchInviteProfiles(query) });
}