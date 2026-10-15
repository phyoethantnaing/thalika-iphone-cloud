import path from "node:path";
import { NextResponse } from "next/server";
import { z } from "zod";
import { configDir } from "@/lib/file-utils";
import { readJson, writeJson } from "@/lib/cloud/files";
export const runtime = "nodejs";
const file = path.join(configDir, "preferences.json");
const schema = z.object({ speed: z.number().min(.8).max(1.2), emotion: z.enum(["calm", "neutral", "energetic", "dramatic"]), cloneMode: z.enum(["balanced", "high_fidelity"]), cloneStrength: z.number().min(1).max(3), inferenceTimesteps: z.number().int().min(4).max(50), denoiseReference: z.boolean(), normalizeText: z.boolean() });
export async function GET() { return NextResponse.json({ preferences: await readJson(file, null) }); }
export async function PUT(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid preferences" }, { status: 400 });
  await writeJson(file, parsed.data); return NextResponse.json({ ok: true });
}
