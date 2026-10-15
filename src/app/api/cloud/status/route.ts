import { NextResponse } from "next/server";
import { getControlStatus } from "@/lib/cloud/control";
export const runtime = "nodejs";
export async function GET() {
  try { return NextResponse.json(await getControlStatus(), { headers: { "Cache-Control": "no-store" } }); }
  catch (e) { return NextResponse.json({ error: e instanceof Error ? e.message : "Provider status unavailable" }, { status: 503 }); }
}
