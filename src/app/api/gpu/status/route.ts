import { NextResponse } from "next/server";
import { gpuHostStatus } from "@/lib/cloud/host";
import { runtimeStatus } from "@/lib/cloud/runtime";
export const runtime = "nodejs";
export async function GET() {
  try {
    const status = await runtimeStatus();
    return NextResponse.json({ ...gpuHostStatus(), ready: status.ready, stage: status.stage, activeJobs: status.activeJobs.length, error: status.startup.error || null }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    return NextResponse.json({ ...gpuHostStatus(), ready: false, stage: "Unavailable", activeJobs: 0, error: e instanceof Error ? e.message : "Status unavailable" }, { status: 503 });
  }
}
