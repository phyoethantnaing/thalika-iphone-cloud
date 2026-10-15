import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { dataDir, safeJoin } from "../file-utils";
import { readJson, writeJson } from "../cloud/files";
import { getJob, listJobs, saveJob } from "../storage/job-store";
import type { GenerateVoiceRequest } from "../types";

export const queueDir = path.join(dataDir, "queue");
export class SubmissionConflict extends Error {}
type Task<T = unknown> = { deleted?: boolean; key: string; digest: string; state: "pending" | "running" | "done"; context: T; result: unknown; cancel?: boolean };
const globalQueue = globalThis as typeof globalThis & { thalikaQueue?: { busy: boolean; recovery?: Promise<void>; serial: Promise<unknown>; stopped: boolean; stopping: boolean } };
export const queueState = globalQueue.thalikaQueue ||= { busy: false, serial: Promise.resolve(), stopped: false, stopping: false };
export const queuePath = (key: string) => safeJoin(queueDir, `${key}.json`);
export function submissionDigest(input: GenerateVoiceRequest) { return createHash("sha256").update(JSON.stringify(input)).digest("hex"); }
export async function withSubmissionLock<T>(action: () => Promise<T>): Promise<T> {
  const next = queueState.serial.then(action, action);
  queueState.serial = next.catch(() => undefined);
  return next;
}
export async function existingSubmission(key: string, digest: string) {
  const old = await readJson<Task | null>(queuePath(key), null);
  if (!old) return undefined;
  if (old.deleted) throw new SubmissionConflict("This submission was deleted. Start a new generation with a new key.");
  if (old.digest !== digest) throw new SubmissionConflict("Idempotency key already belongs to a different request");
  return old.result;
}
export async function enqueue<T>(key: string, digest: string, context: T, result: unknown) {
  await writeJson(queuePath(key), { key, digest, state: "pending", context, result } satisfies Task<T>);
}
export async function recoverJobs() {
  // One Node server is the sole worker. Interrupted in-flight inference is never replayed:
  // its remote submission may already have completed. User can retry with a new key.
  await fs.mkdir(queueDir, { recursive: true });
  const files = await fs.readdir(queueDir);
  const pending = new Set<string>();
  for (const file of files.filter(f => /^[a-f0-9-]+\.json$/.test(f))) {
    const task = await readJson<Task<{ baseJob: { id: string } }>>(path.join(queueDir, file), null as never);
    if (task?.state === "pending") pending.add(task.context.baseJob.id);
    if (task?.state !== "running") continue;
    const job = await getJob(task.context.baseJob.id);
    if (job?.status === "generating") await saveJob({ ...job, status: "failed", error: "Server restarted during inference. Review History before retrying; this job was not replayed.", content: "Interrupted inference. Safe explicit retry required." });
    task.state = "done";
    await writeJson(path.join(queueDir, file), task);
  }
  for (const job of await listJobs(10000)) {
    if (job.status === "generating" && !pending.has(job.id)) await saveJob({ ...job, status: "failed", error: "Server restarted before this job could finish. Retry explicitly after checking History.", content: "Interrupted job was not replayed." });
  }
}
export function ensureRecovery() { return queueState.recovery ||= recoverJobs(); }
export async function workQueue<T>(run: (context: T) => Promise<void>) {
  await ensureRecovery();
  if (queueState.busy || queueState.stopped) return;
  queueState.busy = true;
  try {
    for (const file of (await fs.readdir(queueDir)).filter(f => /^[a-f0-9-]+\.json$/.test(f)).sort()) {
      if (queueState.stopped) break;
      const location = path.join(queueDir, file);
      const task = await readJson<Task<T>>(location, null as never);
      if (!task || task.state !== "pending") continue;
      task.state = "running"; await writeJson(location, task);
      await run(task.context);
      task.state = "done"; await writeJson(location, task);
    }
  } finally { queueState.busy = false; }
}
export async function cancelJob(jobId: string) {
  const job = await getJob(jobId);
  if (!job || job.status !== "generating") throw new Error("No active job found");
  // Cancellation takes effect at the next chunk boundary; never interrupt shared PyTorch RNG.
  await writeJson(safeJoin(queueDir, `${jobId}.cancel`), { requestedAt: new Date().toISOString() });
}
export async function checkCancelled(jobId: string) {
  if (await fs.access(safeJoin(queueDir, `${jobId}.cancel`)).then(() => true, () => false)) throw new Error("Cancelled by owner at a safe chunk boundary");
}
