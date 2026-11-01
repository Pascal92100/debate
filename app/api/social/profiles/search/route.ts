import { NextResponse } from "next/server";
import { searchDiscoverableProfiles } from "@/lib/meta-profile-invitations";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get("q") ?? "";
  const searchParams = new URL(request.url).searchParams;
  const requestedScope = searchParams.get("scope");
  const scope = requestedScope === "meta" || requestedScope === "all" ? requestedScope : "individual";
  if (scope === "individual" && query.trim().length < 2) return NextResponse.json({ profiles: [] });
  return NextResponse.json({ profiles: await searchDiscoverableProfiles(query, scope, searchParams.get("viewerProfileId") ?? undefined) });
}