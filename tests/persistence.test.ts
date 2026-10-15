import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";

test("durable jobs survive reconnect, pending jobs recover, uncertain calls are never replayed", async () => {
  const temp = await fs.mkdtemp(path.join(os.tmpdir(), "thalika-unit-"));
  process.env.THALIKA_DATA_DIR = temp; process.env.THALIKA_CONFIG_DIR = path.join(temp, "config");
  const { saveJob, getJob } = await import("../src/lib/storage/job-store");
  const { enqueue, queuePath, recoverJobs, existingSubmission, submissionDigest, workQueue, queueState, cancelJob, checkCancelled } = await import("../src/lib/services/job-queue");
  const { readJson, writeJson } = await import("../src/lib/cloud/files");
  const { reserveStop, releaseStop, runtimeStatus } = await import("../src/lib/cloud/runtime");
  const base = { scriptId: "script_unit", title: "Test", provider: "voxcpm2", format: "wav" as const, speed: 1, emotion: "calm" as const, status: "generating" as const, content: "Test metadata" };
  try {
    await saveJob({ ...base, id: "job_pending" }); await saveJob({ ...base, id: "job_uncertain" }); await saveJob({ ...base, id: "job_orphan" });
    const key = randomUUID(); const uncertainKey = randomUUID();
    const input = { script: "A sample script", provider: "voxcpm2" as const, format: "wav" as const, speed: 1, emotion: "calm" as const };
    const digest = submissionDigest(input);
    await enqueue(key, digest, { baseJob: { id: "job_pending" } }, { jobId: "job_pending" });
    await enqueue(uncertainKey, "uncertain", { baseJob: { id: "job_uncertain" } }, {});
    const task = await readJson<Record<string, unknown>>(queuePath(uncertainKey), {}); task.state = "running"; await writeJson(queuePath(uncertainKey), task);
    await recoverJobs();
    assert.equal((await getJob("job_pending"))?.status, "generating");
    assert.equal((await getJob("job_uncertain"))?.status, "failed");
    assert.equal((await getJob("job_orphan"))?.status, "failed");
    assert.deepEqual(await existingSubmission(key, digest), { jobId: "job_pending" });
    await assert.rejects(existingSubmission(key, "changed"));
    await assert.rejects(reserveStop()); assert.equal(queueState.stopping, false);
    await cancelJob("job_pending"); await assert.rejects(checkCancelled("job_pending"));
    queueState.recovery = Promise.resolve();
    let calls = 0;
    await Promise.all([workQueue<{ baseJob: { id: string } }>(async c => { calls++; await saveJob({ ...base, id: c.baseJob.id, status: "completed" }); }), workQueue(async () => { calls++; })]);
    assert.equal(calls, 1);
    assert.equal((await getJob("job_pending"))?.status, "completed");
    await reserveStop(); assert.equal(queueState.stopping, true); releaseStop();
    // A stale startup file must never claim Ready when the actual inference probe fails.
    process.env.THALIKA_MODEL_STATUS = path.join(temp, "model-status.json");
    await writeJson(process.env.THALIKA_MODEL_STATUS, { stage: "Ready" });
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => new Response("unavailable", { status: 503 });
    try { const runtime = await runtimeStatus(); assert.equal(runtime.ready, false); assert.notEqual(runtime.stage, "Ready"); }
    finally { globalThis.fetch = originalFetch; }
  } finally { await fs.rm(temp, { recursive: true, force: true }); }
});
