import { NextResponse } from "next/server";
import { allowRequest, checkPassword, newSession, sessionCookie, sessionSeconds } from "@/lib/security/session";
export const runtime = "nodejs";
export async function POST(request: Request) {
  if (!allowRequest("login", 6, 15 * 60_000)) return NextResponse.json({ error: "Too many attempts. Wait 15 minutes." }, { status: 429 });
  const body = await request.json().catch(() => null);
  if (typeof body?.password !== "string" || body.password.length > 1024 || !checkPassword(body.password)) return NextResponse.json({ error: "Incorrect password" }, { status: 401 });
  const response = NextResponse.json({ ok: true });
  response.cookies.set(sessionCookie, newSession(), { httpOnly: true, secure: process.env.THALIKA_CLOUD === "1", sameSite: "strict", path: "/", maxAge: sessionSeconds });
  return response;
}
