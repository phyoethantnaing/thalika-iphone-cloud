import { NextResponse } from "next/server";
import { z } from "zod";
import { controlAction } from "@/lib/cloud/control";
import { allowRequest } from "@/lib/security/session";
export const runtime = "nodejs";
export async function POST(request: Request) {
  const body = z.object({ action: z.enum(["start", "stop"]), confirmed: z.literal(true), key: z.string().uuid() }).safeParse(await request.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Invalid action or missing cost/stop confirmation" }, { status: 400 });
  if (!allowRequest("gpu-actions", 5)) return NextResponse.json({ error: "Wait before sending more GPU actions" }, { status: 429 });
  try { return NextResponse.json(await controlAction(body.data.action, body.data.key)); }
  catch (e) { return NextResponse.json({ error: e instanceof Error ? e.message : "GPU action failed" }, { status: 409 }); }
}
