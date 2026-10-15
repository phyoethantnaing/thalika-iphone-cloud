import { test } from "node:test";
import assert from "node:assert/strict";
import { RunpodProvider, podHourlyRate, podOrigin } from "../src/lib/cloud/runpod";

test("provider uses official authenticated v1 lifecycle endpoints without browser secrets", async () => {
  const requests: { url: string; method: string; authorization: string | null }[] = [];
  const fake: typeof fetch = async (url, init) => {
    requests.push({ url: String(url), method: init?.method || "GET", authorization: new Headers(init?.headers).get("authorization") });
    const pod = { id: "pod123", desiredStatus: "EXITED", costPerHr: .8, adjustedCostPerHr: .6, env: { SECRET: "must-not-leak" } };
    return Response.json(String(url).includes("/pods?") ? [pod] : pod);
  };
  const provider = new RunpodProvider("test-only-provider-key", fake);
  const pod = await provider.get("pod123");
  assert.equal("env" in pod, false); assert.equal(podHourlyRate(pod), .6);
  await provider.start(pod.id); await provider.stop(pod.id); await provider.create({ name: "test" });
  assert.ok(requests.every(r => r.url.startsWith("https://rest.runpod.io/v1/") && r.authorization === "Bearer test-only-provider-key"));
  assert.ok(requests.some(r => r.url.endsWith("/pod123/stop") && r.method === "POST"));
  assert.equal(podOrigin("pod123"), "https://pod123-3000.proxy.runpod.net");
  assert.throws(() => podOrigin("evil/path"));
  assert.equal(podHourlyRate({ id: "x", desiredStatus: "RUNNING" }), null);
});
test("provider errors never reflect provider bodies containing credentials", async () => {
  const provider = new RunpodProvider("key", async () => new Response("private-token", { status: 403 }));
  await assert.rejects(provider.start("x"), e => e instanceof Error && !e.message.includes("private-token") && e.message.includes("403"));
});
