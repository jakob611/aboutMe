import { getCloudflareContext } from "@opennextjs/cloudflare";
import { NextResponse } from "next/server";

export const ADMIN_COOKIE = "admin_session";
const SESSION_TTL_SEC = 60 * 60 * 24 * 7;
export const PRIVATE_HEADERS = { "Cache-Control": "private, no-store" };

export function getAdminPassword(): string {
  // Preserve the existing file-upload password as the shared admin credential.
  return process.env.UPLOAD_PASSWORD || process.env.ADMIN_PASSWORD || "";
}

function sessionSecret() {
  const secret = process.env.ADMIN_SESSION_SECRET || "";
  if (secret.length < 32) throw new Error("Set ADMIN_SESSION_SECRET to at least 32 random characters.");
  return secret;
}

export function adminCookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict" as const,
    path: "/",
    maxAge,
  };
}

function b64url(buf: ArrayBuffer) {
  return btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function sessionKey() {
  if (!getAdminPassword()) throw new Error("Set UPLOAD_PASSWORD (or ADMIN_PASSWORD).");
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(sessionSecret() + ":" + getAdminPassword()),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]
  );
}

export async function passwordsMatch(provided: string, expected: string) {
  if (!expected) return false;
  const enc = new TextEncoder();
  const [a, b] = await Promise.all([
    crypto.subtle.digest("SHA-256", enc.encode(provided)),
    crypto.subtle.digest("SHA-256", enc.encode(expected)),
  ]);
  const av = new Uint8Array(a), bv = new Uint8Array(b);
  let diff = 0;
  for (let i = 0; i < av.length; i++) diff |= av[i] ^ bv[i];
  return diff === 0;
}

export async function createAdminSession() {
  const payload = `${Math.floor(Date.now() / 1000) + SESSION_TTL_SEC}.${crypto.randomUUID()}`;
  const sig = await crypto.subtle.sign("HMAC", await sessionKey(), new TextEncoder().encode(payload));
  return { token: `${payload}.${b64url(sig)}`, maxAge: SESSION_TTL_SEC };
}

export async function verifyAdminSession(token: string | undefined | null) {
  if (!token || token.length > 200 || !getAdminPassword()) return false;
  const parts = token.split(".");
  if (parts.length !== 3 || !/^\d+$/.test(parts[0]) || !/^[\w-]{36}$/.test(parts[1]) || !/^[\w-]{43}$/.test(parts[2])) return false;
  const exp = Number(parts[0]), now = Math.floor(Date.now() / 1000);
  if (!Number.isSafeInteger(exp) || exp <= now || exp > now + SESSION_TTL_SEC) return false;
  try {
    const signature = Uint8Array.from(atob(parts[2].replace(/-/g, "+").replace(/_/g, "/") + "="), c => c.charCodeAt(0));
    return crypto.subtle.verify("HMAC", await sessionKey(), signature, new TextEncoder().encode(parts.slice(0, 2).join(".")));
  } catch {
    return false;
  }
}

export function readCookie(header: string | null, name: string) {
  return header?.split(";").map(p => p.trim()).find(p => p.startsWith(name + "="))?.slice(name.length + 1);
}

export function isSameOrigin(req: Request) {
  if (req.headers.get("sec-fetch-site") === "cross-site") return false;
  const origin = req.headers.get("origin");
  if (!origin) return true; // Non-browser API clients still need a valid session.
  try { return new URL(origin).origin === new URL(req.url).origin; }
  catch { return false; }
}

export async function allowAdminLogin(req: Request) {
  const { env } = await getCloudflareContext({ async: true });
  const limiter = (env as unknown as {
    ADMIN_LOGIN_LIMITER?: { limit(options: { key: string }): Promise<{ success: boolean }> };
  }).ADMIN_LOGIN_LIMITER;
  if (!limiter) throw new Error("ADMIN_LOGIN_LIMITER binding is missing.");
  // Cloudflare supplies this header in production. Never trust arbitrary forwarded IPs.
  const key = "aboutme-admin:" + (req.headers.get("cf-connecting-ip") || "local");
  return (await limiter.limit({ key })).success;
}

export async function requireAdmin(req: Request) {
  if (req.method !== "GET" && req.method !== "HEAD" && !isSameOrigin(req)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403, headers: PRIVATE_HEADERS });
  }
  if (!(await verifyAdminSession(readCookie(req.headers.get("cookie"), ADMIN_COOKIE)))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: PRIVATE_HEADERS });
  }
  return null;
}
