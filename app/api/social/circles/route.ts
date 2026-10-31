import { NextResponse } from "next/server";
import { createCircle, listCircles } from "@/lib/social";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({ circles: await listCircles() });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body.name !== "string" || body.name.trim().length < 2) {
    return NextResponse.json({ error: "Le cercle doit avoir un nom." }, { status: 400 });
  }
  let circle;
  try {
    circle = await createCircle({
      name: body.name,
      kind: typeof body.kind === "string" ? body.kind : "general",
      description: typeof body.description === "string" ? body.description : "",
      visibility: body.visibility === "public" ? "public" : "private",
      ownerProfileId: typeof body.ownerProfileId === "string" ? body.ownerProfileId : undefined
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "The Circle could not be created." }, { status: 400 });
  }
  return NextResponse.json({ circle }, { status: 201 });
}
