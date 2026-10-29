import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

export const sessionCookieName = "circles_session";
export const sessionLifetimeSeconds = 60 * 60 * 24 * 7;

function sessionSecret() {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) throw new Error("SESSION_SECRET must contain at least 32 characters.");
  return secret;
}

export function createSessionToken(accountId: string) {
  const expiresAt = Math.floor(Date.now() / 1000) + sessionLifetimeSeconds;
  const payload = `${accountId}.${expiresAt}`;
  const signature = createHmac("sha256", sessionSecret()).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

export function verifySessionToken(token: string | undefined) {
  if (!token) return null;
  const [accountId, expiresAtText, signature] = token.split(".");
  const expiresAt = Number(expiresAtText);
  if (!accountId || !signature || !Number.isInteger(expiresAt) || expiresAt <= Math.floor(Date.now() / 1000)) return null;
  const expected = createHmac("sha256", sessionSecret()).update(`${accountId}.${expiresAt}`).digest();
  let actual: Buffer;
  try { actual = Buffer.from(signature, "base64url"); } catch { return null; }
  return actual.length === expected.length && timingSafeEqual(actual, expected) ? accountId : null;
}

export async function getSessionAccountId() {
  const cookieStore = await cookies();
  try {
    return verifySessionToken(cookieStore.get(sessionCookieName)?.value);
  } catch {
    return null;
  }
}
