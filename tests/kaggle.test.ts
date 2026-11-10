import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { checkPassword } from "../src/lib/security/session";
import { studioHostStatus } from "../src/lib/cloud/control";

const launcher = path.resolve("scripts/kaggle-start.py");
function py(expression: string, env: Record<string, string> = {}) {
  const program = `import importlib.util, json, sys\nspec = importlib.util.spec_from_file_location("k", ${JSON.stringify(launcher)})\nk = importlib.util.module_from_spec(spec); spec.loader.exec_module(k)\nprint(json.dumps(${expression}))`;
  return JSON.parse(execFileSync("python3", ["-I", "-c", program], { env: { ...process.env, ...env } as NodeJS.ProcessEnv, encoding: "utf8" }));
}

test("Kaggle launcher owner hash is accepted by the Node login check", () => {
  const hash = py(`k.owner_hash("kaggle-owner-pass-123")`);
  assert.match(hash, /^[a-f0-9]{32}:[a-f0-9]{128}$/);
  process.env.OWNER_PASSWORD_HASH = hash;
  assert.equal(checkPassword("kaggle-owner-pass-123"), true);
  assert.equal(checkPassword("kaggle-owner-pass-124"), false);
  delete process.env.OWNER_PASSWORD_HASH;
});

test("Kaggle launcher parses tunnel URL, GPU capability and session deadline", () => {
  assert.equal(py(`k.find_quick_tunnel_url("INF |  https://brave-owl-12.trycloudflare.com  |")`), "https://brave-owl-12.trycloudflare.com");
  assert.equal(py(`k.find_quick_tunnel_url("https://evil.example/https://x.trycloudflare.com.evil")`), "https://x.trycloudflare.com");
  assert.equal(py(`k.find_quick_tunnel_url("no url here")`), null);
  assert.deepEqual(py(`k.parse_capability("7.5")`), [7, 5]);
  assert.equal(py(`k.parse_capability("6.0") < k.MIN_CAPABILITY`), true);
  assert.equal(py(`k.parse_capability("[N/A]")`), null);
  // Kaggle's 12 h hard limit: never plan beyond 11.5 h.
  assert.equal(py(`(k.session_deadline(k.datetime(2026,1,1,tzinfo=k.timezone.utc), 99) - k.datetime(2026,1,1,tzinfo=k.timezone.utc)).total_seconds()`), 11.5 * 3600);
});

test("Kaggle launcher restores only the newest marked thalika-data input", () => {
  const root = mkdtempSync(path.join(tmpdir(), "thalika-kaggle-"));
  for (const [dir, stamp] of [["old-version/thalika-data", "2026-01-01T00:00:00Z"], ["owner/notebook/new/thalika-data", "2026-02-01T00:00:00Z"]]) {
    mkdirSync(path.join(root, dir), { recursive: true }); writeFileSync(path.join(root, dir, ".thalika-saved-at"), stamp);
  }
  mkdirSync(path.join(root, "unmarked/thalika-data"), { recursive: true });
  assert.equal(py(`str(k.newest_saved_data(k.Path(${JSON.stringify(root)})))`), path.join(root, "owner/notebook/new/thalika-data"));
  assert.equal(py(`k.newest_saved_data(k.Path(${JSON.stringify(path.join(root, "missing"))}))`), null);
});

test("Kaggle notebook clones the repository and runs only the launcher", () => {
  const notebook = JSON.parse(readFileSync("kaggle/thalika-kaggle.ipynb", "utf8"));
  const source = notebook.cells.filter((c: { cell_type: string }) => c.cell_type === "code").map((c: { source: string[] }) => c.source.join("")).join("\n");
  assert.match(source, /scripts" \/ "kaggle-start\.py"/);
  assert.doesNotMatch(source, /7860/); // the model port is never tunnelled
  const meta = JSON.parse(readFileSync("kaggle/kernel-metadata.example.json", "utf8"));
  assert.equal(meta.is_private, true); assert.equal(meta.enable_gpu, true); assert.equal(meta.enable_internet, true);
});

test("Studio reports Kaggle host and session deadline without provider credentials", () => {
  process.env.THALIKA_GPU_HOST = "kaggle"; process.env.THALIKA_SESSION_DEADLINE = "2026-11-10T20:00:00Z";
  const status = studioHostStatus();
  assert.equal(status.host, "kaggle"); assert.equal(status.sessionEndsAt, "2026-11-10T20:00:00.000Z");
  assert.equal(status.dashboardUrl, "https://www.kaggle.com/code");
  delete process.env.THALIKA_GPU_HOST; delete process.env.THALIKA_SESSION_DEADLINE;
  assert.equal(studioHostStatus().host, "runpod");
});
