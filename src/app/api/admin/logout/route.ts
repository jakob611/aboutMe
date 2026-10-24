import { NextResponse } from "next/server";
import { ADMIN_COOKIE, PRIVATE_HEADERS, adminCookieOptions, isSameOrigin } from "@/lib/admin-auth";

export async function POST(req: Request) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403, headers: PRIVATE_HEADERS });
  const response = NextResponse.json({ ok: true }, { headers: PRIVATE_HEADERS });
  response.cookies.set(ADMIN_COOKIE, "", adminCookieOptions(0));
  return response;
}
