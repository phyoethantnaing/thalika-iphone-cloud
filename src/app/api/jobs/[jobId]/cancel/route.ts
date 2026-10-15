import { NextResponse } from "next/server";
import { cancelJob } from "@/lib/services/job-queue";
export const runtime = "nodejs";
export async function POST(_request: Request, context: { params: Promise<{ jobId: string }> }) {
  try { await cancelJob((await context.params).jobId); return NextResponse.json({ ok: true, message: "Cancellation requested; current model call may finish first." }); }
  catch { return NextResponse.json({ error: "Active job not found" }, { status: 409 }); }
}
