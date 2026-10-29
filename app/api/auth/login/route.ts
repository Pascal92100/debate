import { NextResponse } from "next/server";
import { authenticateAccount, createSessionToken, sessionCookieName, sessionLifetimeSeconds } from "@/lib/social";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body.email !== "string" || typeof body.password !== "string") {
    return NextResponse.json({ error: "Enter your email and password." }, { status: 400 });
  }
  try {
    if (!process.env.DATABASE_URL) return NextResponse.json({ error: "Database sign-in is unavailable in demo mode." }, { status: 503 });
    const accountId = await authenticateAccount(body.email, body.password);
    if (!accountId) return NextResponse.json({ error: "Email or password is incorrect." }, { status: 401 });
    const response = NextResponse.json({ success: true });
    response.cookies.set(sessionCookieName, createSessionToken(accountId), { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: sessionLifetimeSeconds });
    return response;
  } catch (error) {
    console.error("Sign-in failed.", error);
    return NextResponse.json({ error: "Sign-in is unavailable. Check the SESSION_SECRET configuration." }, { status: 503 });
  }
}