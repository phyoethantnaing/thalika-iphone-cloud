import fs from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { configDir } from "../file-utils";
import { readJson, writeJson } from "./files";
import { RunpodProvider, podHourlyRate, podOrigin, type Pod } from "./runpod";

const statePath = path.join(configDir, "control.json");
const lockPath = path.join(configDir, "control.lock");
type ControlState = { podId?: string; intent?: "create" | "start" | "stop"; requestedAt?: string; readyAt?: string; lastSuccessfulSession?: string; lastError?: string; idleWarned?: boolean; handled?: string[] };
const initial = (): ControlState => ({ podId: process.env.RUNPOD_POD_ID || undefined });
const runtimeSchema = z.object({ ready: z.boolean(), stage: z.string(), activeJobs: z.array(z.object({ id: z.string() }).passthrough()), lastActivity: z.string(), bootedAt: z.string(), startup: z.object({ startedAt: z.string().optional(), readyAt: z.string().optional() }).passthrough() });
export type RuntimeStatus = z.infer<typeof runtimeSchema>;
const name = () => `thalika-${required("THALIKA_INSTALLATION_ID")}`;
function required(key: string) { const value = process.env[key]; if (!value) throw new Error(`${key} is not configured`); return value; }
async function locked<T>(action: () => Promise<T>) {
  await fs.mkdir(configDir, { recursive: true, mode: 0o700 });
  let handle;
  try { handle = await fs.open(lockPath, "wx", 0o600); }
  catch { throw new Error("GPU control is locked by another operation. If the service crashed, reconcile Pods in Runpod before removing control.lock."); }
  try { return await action(); } finally { await handle.close(); await fs.unlink(lockPath); }
}
async function runtimeCall(pod: Pod, action?: "reserve-stop" | "release"): Promise<unknown> {
  const token = required("RUNTIME_TOKEN");
  if (token.length < 32) throw new Error("RUNTIME_TOKEN must contain at least 32 characters");
  const response = await fetch(`${podOrigin(pod.id)}/api/internal/runtime`, {
    method: action ? "POST" : "GET", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: action ? JSON.stringify({ action }) : undefined, cache: "no-store", signal: AbortSignal.timeout(8000)
  });
  if (!response.ok) throw new Error(action ? "GPU refused safe stop: jobs may be active. Open Studio and check History." : "GPU application is not reachable yet");
  return response.json();
}
export async function getControlStatus() {
  if (process.env.THALIKA_ROLE !== "control") return { mode: "studio" as const, controlUrl: process.env.CONTROL_PLANE_URL || null, dashboardUrl: "https://console.runpod.io/pods" };
  const state = await readJson(statePath, initial());
  const provider = new RunpodProvider();
  let pod: Pod | undefined;
  if (state.podId) pod = await provider.get(state.podId);
  else if (process.env.THALIKA_INSTALLATION_ID) {
    const matches = (await provider.list()).filter(p => p.name === name());
    if (matches.length > 1) throw new Error("Multiple matching Pods. Reconcile in provider dashboard before any action.");
    pod = matches[0];
  }
  const live = pod?.desiredStatus === "RUNNING";
  let runtime: RuntimeStatus | null = null;
  if (live && pod) { try { runtime = runtimeSchema.parse(await runtimeCall(pod)); } catch { /* report provisioning, never infer readiness */ } }
  const hourlyRate = pod ? podHourlyRate(pod) : null;
  const seconds = live && pod?.lastStartedAt ? Math.max(0, (Date.now() - Date.parse(pod.lastStartedAt)) / 1000) : 0;
  const startupLatencyMs = state.requestedAt && state.readyAt ? Date.parse(state.readyAt) - Date.parse(state.requestedAt) : null;
  let stage = pod ? live ? runtime?.stage || "GPU Provisioning" : pod.desiredStatus === "EXITED" ? "Stopped" : pod.desiredStatus : "GPU Offline";
  if (state.intent === "stop" && live) stage = "Stopping GPU";
  const began = state.requestedAt || pod?.lastStartedAt;
  const startupTimedOut = live && !runtime?.ready && began && Date.now() - Date.parse(began) > Number(process.env.STARTUP_TIMEOUT_MS || 900000);
  if (startupTimedOut && state.intent !== "stop") stage = "Error";
  const threshold = Number(process.env.IDLE_TIMEOUT_MINUTES || 20);
  const idleSeconds = runtime ? Math.max(0, (Date.now() - Math.max(Date.parse(runtime.lastActivity), Date.parse(runtime.bootedAt))) / 1000) : null;
  return {
    mode: "control" as const, provider: "Runpod", stage, podId: pod?.id || state.podId || null,
    modelReady: runtime?.ready === true, gpu: pod?.gpu?.displayName || pod?.machine?.gpuDisplayName || pod?.machine?.gpuTypeId || null,
    // Runpod v1 does not always return VRAM; never infer it from the selected GPU name.
    vramGb: null, gpuCount: pod?.gpu?.count ?? null, activeJobs: runtime?.activeJobs ?? null,
    hourlyRate, hourlyRateSource: hourlyRate === null ? null : "Runpod Pod adjustedCostPerHr / costPerHr",
    runningSeconds: Number.isFinite(seconds) ? seconds : null,
    estimatedPodCost: hourlyRate === null || !Number.isFinite(seconds) ? null : seconds / 3600 * hourlyRate,
    networkVolumeId: pod?.networkVolume?.id || pod?.networkVolumeId || null,
    storageGb: pod?.networkVolume?.size ?? null, studioUrl: pod ? podOrigin(pod.id) : null,
    startupLatencyMs, lastSuccessfulSession: state.lastSuccessfulSession || null, lastError: state.lastError || (startupTimedOut ? "Startup exceeded its timeout. Compute may still be billed. Check private logs and the provider dashboard." : null),
    idleSeconds, idleTimeoutMinutes: threshold, autoStop: process.env.AUTO_STOP_ENABLED === "1",
    idleWarning: idleSeconds !== null && idleSeconds > Math.max(0, threshold * 60 - 120),
    budgetUsd: Number(process.env.SESSION_BUDGET_USD || 2), requestedAt: state.requestedAt || null,
    providerDesiredStatus: pod?.desiredStatus || null, runtimeReachable: Boolean(runtime),
    dashboardUrl: "https://console.runpod.io/pods", provisioningUncertain: state.intent === "create" && !pod
  };
}
export async function controlAction(action: "start" | "stop", key: string) {
  if (process.env.THALIKA_ROLE !== "control") throw new Error("Use the separate control plane or Runpod dashboard");
  return locked(async () => {
    const state = await readJson(statePath, initial());
    if (state.handled?.includes(key)) return { ok: true, duplicate: true };
    const provider = new RunpodProvider();
    try {
      const matches = (await provider.list()).filter(p => p.name === name() || p.id === state.podId);
      if (matches.length > 1) throw new Error("Multiple managed Pods found; reconcile manually to avoid duplicate charges");
      let pod = matches[0];
      if (action === "start") {
        if (pod?.desiredStatus === "RUNNING") return { ok: true, alreadyRunning: true };
        state.requestedAt = new Date().toISOString(); state.readyAt = undefined; state.lastError = undefined;
        if (pod) {
          state.intent = "start"; state.podId = pod.id; await writeJson(statePath, state);
          await provider.start(pod.id);
          await provider.get(pod.id); // accepted != ready; polling verifies readiness later
        } else {
          if (state.intent === "create" || state.podId) throw new Error("Previous Pod is missing or creation was uncertain. Reconcile in Runpod and reset the tracked Pod only after checking storage and charges.");
          if (process.env.ALLOW_GPU_PROVISIONING !== "1") throw new Error("Provisioning is disabled. Approve costs and configure ALLOW_GPU_PROVISIONING=1, or create a Pod in Runpod and set RUNPOD_POD_ID.");
          const volume = await provider.volume(required("RUNPOD_NETWORK_VOLUME_ID"));
          if (volume.dataCenterId !== required("RUNPOD_DATA_CENTER_ID")) throw new Error("Persistent volume is in a different data center");
          const templateId = required("RUNPOD_TEMPLATE_ID");
          // Template contains only provider secret references, never browser-supplied settings.
          state.intent = "create"; await writeJson(statePath, state);
          pod = await provider.create({ name: name(), templateId, cloudType: "SECURE", computeType: "GPU", gpuCount: 1,
            gpuTypeIds: (process.env.RUNPOD_GPU_TYPES || "NVIDIA RTX A5000,NVIDIA GeForce RTX 3090").split(",").map(s => s.trim()),
            gpuTypePriority: "custom", dataCenterIds: [volume.dataCenterId], networkVolumeId: volume.id,
            volumeMountPath: "/workspace", ports: ["3000/http"], interruptible: false });
          state.podId = pod.id; await writeJson(statePath, state); await provider.get(pod.id);
        }
      } else {
        if (!pod) throw new Error("No managed Pod found. Verify in the provider dashboard.");
        state.podId = pod.id;
        if (pod.desiredStatus !== "EXITED") {
          // The Pod atomically blocks submissions and verifies no pending or active jobs.
          await runtimeCall(pod, "reserve-stop");
          state.intent = "stop"; await writeJson(statePath, state);
          try { await provider.stop(pod.id); await provider.get(pod.id); }
          catch (e) { await runtimeCall(pod, "release").catch(() => undefined); throw e; }
        }
      }
      state.handled = [...(state.handled || []), key].slice(-100);
      await writeJson(statePath, state);
      return { ok: true, podId: state.podId, message: "Provider request accepted. Refresh to verify the actual state." };
    } catch (e) {
      state.lastError = e instanceof Error ? e.message : "Provider operation failed";
      await writeJson(statePath, state); throw e;
    }
  });
}
let monitoring = false;
export function startControlMonitor() {
  if (monitoring || !process.env.RUNPOD_API_KEY) return;
  monitoring = true;
  const timer = setInterval(() => { void monitor().catch(() => console.error("GPU monitor could not verify state; automatic stop skipped")); }, 30_000);
  timer.unref();
}
async function monitor() {
  const status = await getControlStatus();
  if (status.mode !== "control") return;
  await locked(async () => {
    const state = await readJson(statePath, initial());
    if (status.modelReady && !state.readyAt && state.requestedAt) {
      state.readyAt = new Date().toISOString(); state.lastSuccessfulSession = state.readyAt;
    }
    if (status.podId && !state.podId) state.podId = status.podId;
    if (status.providerDesiredStatus === "EXITED") state.intent = undefined;
    await writeJson(statePath, state);
  });
  if (status.autoStop && status.modelReady && status.idleSeconds !== null && status.idleSeconds > status.idleTimeoutMinutes * 60 && status.activeJobs?.length === 0) {
    await controlAction("stop", crypto.randomUUID());
  }
}
