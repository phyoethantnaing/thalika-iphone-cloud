import { NextResponse } from "next/server";
import { releaseStop, reserveStop, runtimeStatus } from "@/lib/cloud/runtime";
import { validInternal } from "@/lib/security/session";
export const runtime = "nodejs";
export async function GET(request: Request) {
  if (!validInternal(request.headers.get("authorization"))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json(await runtimeStatus(), { headers: { "Cache-Control": "no-store" } });
}
export async function POST(request: Request) {
  if (!validInternal(request.headers.get("authorization"))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => null);
  if (body?.action === "release") { releaseStop(); return NextResponse.json({ released: true }); }
  if (body?.action !== "reserve-stop") return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  try { return NextResponse.json(await reserveStop()); }
  catch (e) { return NextResponse.json({ error: (e as Error).message }, { status: 409 }); }
}
