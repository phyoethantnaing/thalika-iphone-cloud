import path from "node:path";
import { dataDir } from "../file-utils";
import { readJson, writeJson } from "./files";
import { listJobs } from "../storage/job-store";
import { checkVoxCPM2Health } from "../providers/voxcpm2-health";
import { queueState, withSubmissionLock } from "../services/job-queue";

const activityFile = path.join(dataDir, "activity.json");
const bootedAt = new Date().toISOString();
export async function touchActivity() { await writeJson(activityFile, { at: new Date().toISOString() }); }
export async function runtimeStatus() {
  const jobs = await listJobs(10000);
  const activeJobs = jobs.filter(j => j.status === "generating").map(j => ({ id: j.id, completedChunks: j.completedChunks, totalChunks: j.totalChunks }));
  const activity = await readJson(activityFile, { at: bootedAt });
  const startup = await readJson<{ stage: string; startedAt?: string; readyAt?: string; error?: string }>(process.env.THALIKA_MODEL_STATUS || "/tmp/thalika-model-status.json", { stage: "GPU Offline" });
  const health = await checkVoxCPM2Health();
  return { ready: health.ok, stage: health.ok ? activeJobs.length ? "Generating" : "Ready" : startup.stage === "Ready" ? "Loading VoxCPM2" : startup.stage, activeJobs, lastActivity: activity.at, bootedAt, startup, stopping: queueState.stopping };
}
export async function reserveStop() {
  return withSubmissionLock(async () => {
    // Lock out new submissions BEFORE checking jobs; release if stopping is unsafe.
    queueState.stopping = true;
    const active = (await listJobs(10000)).filter(j => j.status === "generating");
    if (active.length || queueState.busy) { queueState.stopping = false; throw new Error("Generation is active; wait for completion or cancel at a chunk boundary."); }
    return { reserved: true };
  });
}
export function releaseStop() { queueState.stopping = false; }
