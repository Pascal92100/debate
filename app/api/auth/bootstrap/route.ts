import { NextResponse } from "next/server";
import { createSessionToken, createInitialAccount, getAccountCount, sessionCookieName, sessionLifetimeSeconds } from "@/lib/social";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body.firstName !== "string" || !body.firstName.trim() || typeof body.lastName !== "string" || !body.lastName.trim() || typeof body.email !== "string" || !/^\S+@\S+\.\S+$/.test(body.email) || typeof body.password !== "string" || body.password.length < 12) {
    return NextResponse.json({ error: "Enter your first name, last name, a valid email address, and a password of at least 12 characters." }, { status: 400 });
  }
  try {
    if (!process.env.DATABASE_URL) return NextResponse.json({ error: "Connect the Neon database before creating the primary account." }, { status: 503 });
    if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32) return NextResponse.json({ error: "Set SESSION_SECRET to a random value of at least 32 characters before setup." }, { status: 503 });
    if ((await getAccountCount()) !== 0) return NextResponse.json({ error: "The primary account has already been created. Please sign in." }, { status: 409 });
    const { accountId } = await createInitialAccount({ displayName: `${body.firstName.trim()} ${body.lastName.trim()}`, email: body.email, password: body.password });
    const response = NextResponse.json({ success: true });
    response.cookies.set(sessionCookieName, createSessionToken(accountId), { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: sessionLifetimeSeconds });
    return response;
  } catch (error) {
    console.error("Primary account setup failed.", error);
    return NextResponse.json({ error: "The primary account could not be created. Check the database schema and SESSION_SECRET configuration." }, { status: 500 });
  }
}