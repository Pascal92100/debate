import { NextRequest, NextResponse } from "next/server";

const cookieName = "circles_session";

async function validSession(token: string | undefined, secret: string) {
  if (!token) return false;
  const [accountId, expiry, signature] = token.split(".");
  const expiresAt = Number(expiry);
  if (!accountId || !signature || !Number.isInteger(expiresAt) || expiresAt <= Math.floor(Date.now() / 1000)) return false;
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["verify"]);
  const normalized = signature.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(normalized + "=".repeat((4 - normalized.length % 4) % 4));
  const signatureBytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  return crypto.subtle.verify("HMAC", key, signatureBytes, new TextEncoder().encode(`${accountId}.${expiresAt}`));
}

export async function middleware(request: NextRequest) {
  if (!process.env.DATABASE_URL) return NextResponse.next();
  const path = request.nextUrl.pathname;
  if (path === "/login" || path === "/setup" || path.startsWith("/api/auth/")) return NextResponse.next();
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    return NextResponse.json({ error: "Server authentication is not configured. Set SESSION_SECRET to a random value of at least 32 characters." }, { status: 503 });
  }
  if (await validSession(request.cookies.get(cookieName)?.value, secret)) return NextResponse.next();
  if (path.startsWith("/api/")) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("next", path);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"]
};