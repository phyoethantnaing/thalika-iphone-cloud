import { z } from "zod";

const podSchema = z.object({
  id: z.string(), name: z.string().optional(), desiredStatus: z.string(),
  costPerHr: z.number().nullable().optional(), adjustedCostPerHr: z.number().nullable().optional(),
  lastStartedAt: z.string().nullable().optional(), networkVolumeId: z.string().nullable().optional(),
  networkVolume: z.object({ id: z.string(), size: z.number().optional(), dataCenterId: z.string().optional() }).nullable().optional(),
  gpu: z.object({ count: z.number().optional(), displayName: z.string().optional() }).nullable().optional(),
  machine: z.object({ gpuDisplayName: z.string().optional(), gpuTypeId: z.string().optional() }).nullable().optional()
});
export type Pod = z.infer<typeof podSchema>;
export interface GpuProvider {
  list(): Promise<Pod[]>;
  get(id: string): Promise<Pod>;
  create(config: Record<string, unknown>): Promise<Pod>;
  start(id: string): Promise<void>;
  stop(id: string): Promise<void>;
}
export class RunpodProvider implements GpuProvider {
  constructor(private apiKey = process.env.RUNPOD_API_KEY || "", private transport: typeof fetch = fetch) {}
  private async request(endpoint: string, method = "GET", body?: unknown) {
    if (!this.apiKey) throw new Error("RUNPOD_API_KEY is not configured on the control plane");
    const response = await this.transport(`https://rest.runpod.io/v1${endpoint}`, {
      method, headers: { Authorization: `Bearer ${this.apiKey}`, "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(30_000), cache: "no-store"
    });
    // Never reflect raw provider responses: they may contain environment secrets.
    if (!response.ok) throw new Error(`Runpod ${method} failed (HTTP ${response.status}). Check the provider dashboard before retrying.`);
    return response.status === 204 ? null : response.json().catch(() => null);
  }
  async list() { return z.array(podSchema).parse(await this.request("/pods?includeMachine=true&includeNetworkVolume=true")); }
  async get(id: string) { return podSchema.parse(await this.request(`/pods/${encodeURIComponent(id)}?includeMachine=true&includeNetworkVolume=true`)); }
  async create(config: Record<string, unknown>) { return podSchema.parse(await this.request("/pods", "POST", config)); }
  async start(id: string) { await this.request(`/pods/${encodeURIComponent(id)}/start`, "POST"); }
  async stop(id: string) { await this.request(`/pods/${encodeURIComponent(id)}/stop`, "POST"); }
  async volume(id: string) {
    return z.object({ id: z.string(), size: z.number(), dataCenterId: z.string() }).parse(await this.request(`/networkvolumes/${encodeURIComponent(id)}`));
  }
}
export function podOrigin(podId: string) {
  if (!/^[a-z0-9]+$/i.test(podId)) throw new Error("Invalid Pod ID");
  return `https://${podId}-3000.proxy.runpod.net`;
}
export function podHourlyRate(pod: Pod): number | null {
  const value = pod.adjustedCostPerHr ?? pod.costPerHr;
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : null;
}
