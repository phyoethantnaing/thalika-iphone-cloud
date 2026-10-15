import { NextResponse } from "next/server";
import { sessionCookie } from "@/lib/security/session";
export const runtime = "nodejs";
export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(sessionCookie, "", { httpOnly: true, secure: process.env.THALIKA_CLOUD === "1", sameSite: "strict", path: "/", maxAge: 0 });
  return response;
}
