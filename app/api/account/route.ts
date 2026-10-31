import { NextResponse } from "next/server";
import { deleteOwnAccount, getSessionAccountId, sessionCookieName } from "@/lib/social";

export const runtime = "nodejs";

export async function DELETE() {
  const accountId = await getSessionAccountId();
  if (!accountId) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const deleted = await deleteOwnAccount(accountId);
  if (!deleted) return NextResponse.json({ error: "Account not found or not owned by this session." }, { status: 404 });
  const response = NextResponse.json({ success: true });
  response.cookies.set(sessionCookieName, "", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 0 });
  return response;
}