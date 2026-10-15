import { NextResponse } from "next/server";
import { listScripts, saveScript } from "@/lib/storage/script-store";

export const runtime = "nodejs";

export async function GET() {
  const scripts = await listScripts(20);
  return NextResponse.json({ scripts });
}

export async function POST(request: Request) {
  const { z } = await import("zod");
  const parsed = z.object({ title: z.string().max(100).optional(), script: z.string().trim().min(10).max(50000) }).safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid script" }, { status: 400 });
  return NextResponse.json({ script: await saveScript(parsed.data) }, { status: 201 });
}
