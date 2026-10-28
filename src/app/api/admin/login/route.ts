import { NextResponse } from "next/server";
import { z } from "zod";
import { ADMIN_COOKIE, PRIVATE_HEADERS, adminCookieOptions, allowAdminLogin, createAdminSession, getAdminPassword, isSameOrigin, passwordsMatch } from "@/lib/admin-auth";
import { readBoundedJson } from "@/lib/request-body";

const input = z.object({ password: z.string().min(1).max(1024) });

export async function POST(req: Request) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403, headers: PRIVATE_HEADERS });
  if (!req.headers.get("content-type")?.includes("application/json")) {
    return NextResponse.json({ error: "Expected JSON" }, { status: 415, headers: PRIVATE_HEADERS });
  }
  try {
    if (!getAdminPassword()) return NextResponse.json({ error: "Set UPLOAD_PASSWORD in the Worker runtime secrets or local .dev.vars" }, { status: 503, headers: PRIVATE_HEADERS });
    if (!(await allowAdminLogin(req))) {
      return NextResponse.json({ error: "Too many login attempts. Try again in a minute." }, { status: 429, headers: { ...PRIVATE_HEADERS, "Retry-After": "60" } });
    }
    const parsed = await readBoundedJson(req, 16 * 1024);
    if (!parsed.ok) return NextResponse.json({ error: parsed.status === 413 ? "Login request is too large" : "Enter a valid password" }, { status: parsed.status, headers: PRIVATE_HEADERS });
    const body = input.safeParse(parsed.value);
    if (!body.success) return NextResponse.json({ error: "Enter a valid password" }, { status: 400, headers: PRIVATE_HEADERS });
    if (!(await passwordsMatch(body.data.password, getAdminPassword()))) {
      return NextResponse.json({ error: "Wrong password" }, { status: 401, headers: PRIVATE_HEADERS });
    }
    const { token, maxAge } = await createAdminSession();
    const response = NextResponse.json({ ok: true }, { headers: PRIVATE_HEADERS });
    response.cookies.set(ADMIN_COOKIE, token, adminCookieOptions(maxAge));
    return response;
  } catch {
    console.error("Admin login configuration or rate limiter unavailable.");
    return NextResponse.json({ error: "Admin login is unavailable. Check the runtime configuration." }, { status: 503, headers: PRIVATE_HEADERS });
  }
}
