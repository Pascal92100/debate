import { NextResponse } from "next/server";
import { createProfileSearch, deleteProfileSearch, listProfileSearches } from "@/lib/profile-modules";

export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return NextResponse.json({ searches: await listProfileSearches(id) });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json().catch(() => null);
  if (!body || typeof body.name !== "string" || body.name.trim().length < 2 || body.name.trim().length > 100 || !body.criteria || typeof body.criteria !== "object" || Array.isArray(body.criteria)) return NextResponse.json({ error: "A search name and valid criteria are required." }, { status: 400 });
  const criteria = body.criteria as Record<string, unknown>;
  const allowedWhat = ["Profiles", "Forums", "Publications", "Debates / discussions", "Messages"];
  const allowedProfileKinds = ["individual", "meta", "all"];
  const allowedThemes = ["politics-society", "culture-entertainment", "sports", "science-health", "economy-tech", "lifestyle-ideas", "other"];
  const allowedAudiences = ["friends", "professional", "oldfriends", "socializing", "friendship", "love", "casual", "undecided", "casualfun"];
  const allowedTargets = ["useful", "inspiring", "interesting", "feelgood"];
  const allowedFilters = ["forbidden", "commercial", "sexual", "shocking", "aggressive"];
  const allowedFormats = ["text", "image", "video", "reel", "event", "alert"];
  const arrayHasOnly = (value: unknown, allowed: string[]) => Array.isArray(value) && value.length <= 30 && value.every((item) => typeof item === "string" && allowed.includes(item));
  if (!allowedWhat.includes(String(criteria.what)) || !allowedProfileKinds.includes(String(criteria.profileKind ?? "individual")) || typeof criteria.keywords !== "string" || criteria.keywords.length > 120 || !arrayHasOnly(criteria.themes, allowedThemes) || !arrayHasOnly(criteria.audience, allowedAudiences) || !arrayHasOnly(criteria.targets, allowedTargets) || !arrayHasOnly(criteria.filters, allowedFilters) || !arrayHasOnly(criteria.formats, allowedFormats) || !Array.isArray(criteria.purpose) || criteria.purpose.length > 30 || criteria.purpose.some((item) => typeof item !== "string") || !Array.isArray(criteria.tags) || criteria.tags.length > 30 || criteria.tags.some((item) => typeof item !== "string" || item.length > 60) || !["one", "all"].includes(String(criteria.tagMatch)) || !["world", "continent", "country", "region", "radius"].includes(String(criteria.scope)) || typeof criteria.region !== "string" || criteria.region.length > 120 || typeof criteria.radius !== "string" || criteria.radius.length > 8 || (criteria.scope === "radius" && (!criteria.radius || Number(criteria.radius) < 1)) || (["continent", "country", "region"].includes(String(criteria.scope)) && !criteria.region.trim()) || typeof criteria.language !== "string" || criteria.language.length > 40 || !["any", "all", "relatives"].includes(String(criteria.visibility))) return NextResponse.json({ error: "Some search criteria are invalid or too long." }, { status: 400 });
  const search = await createProfileSearch({ profileId: id, name: body.name, criteria });
  if (!search) return NextResponse.json({ error: "Profile not found or not owned by this account." }, { status: 404 });
  return NextResponse.json({ search }, { status: 201 });
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "A search ID is required." }, { status: 400 });
  const deleted = await deleteProfileSearch(id);
  if (!deleted) return NextResponse.json({ error: "Search not found or not owned by this account." }, { status: 404 });
  return NextResponse.json({ success: true });
}