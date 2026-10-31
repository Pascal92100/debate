import { NextResponse } from "next/server";
import { getAccountDescription, getSessionAccountId, saveAccountDescription, type AccountDescription, type DescriptionTheme } from "@/lib/social";

export const runtime = "nodejs";

export async function GET() {
  const description = await getAccountDescription();
  if (!description) return NextResponse.json({ error: "Account not found." }, { status: 404 });
  return NextResponse.json({ description });
}

export async function PUT(request: Request) {
  const accountId = process.env.DATABASE_URL ? await getSessionAccountId() : (await getAccountDescription())?.accountId;
  if (!accountId) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const body = await request.json().catch(() => null);
  if (!body || body.accountId !== accountId || typeof body.text !== "string" || typeof body.fields !== "object" || !body.fields || typeof body.themes !== "object" || !body.themes) {
    return NextResponse.json({ error: "Invalid account description." }, { status: 400 });
  }
  const fields: AccountDescription["fields"] = {};
  for (const key of ["firstName", "lastName", "nationalities", "birthdate", "sex", "relationshipStatus", "languages", "location", "address", "phone"]) {
    const field = body.fields[key];
    if (!field || typeof field.value !== "string" || typeof field.enabled !== "boolean") return NextResponse.json({ error: `Invalid ${key} field.` }, { status: 400 });
    fields[key] = { value: field.value, enabled: field.enabled };
  }
  const themes: AccountDescription["themes"] = {};
  for (const [themeId, value] of Object.entries(body.themes)) {
    if (themeId === "kinky") continue;
    const theme = value as DescriptionTheme;
    if (!theme || typeof theme.enabled !== "boolean" || typeof theme.description !== "string" || !theme.fields || typeof theme.fields !== "object" || !Array.isArray(theme.tags)) {
      return NextResponse.json({ error: `Invalid ${themeId} theme.` }, { status: 400 });
    }
    themes[themeId] = theme;
  }
  const description = await saveAccountDescription({ accountId, text: body.text, fields, themes });
  return NextResponse.json({ description });
}
