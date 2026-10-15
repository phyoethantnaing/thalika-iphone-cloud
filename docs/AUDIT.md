# Upstream and provider audit

Audited base: `sanlinhtik3/thalika-voice-clone` at
`cf00a0c8eb269efb1796c26f152372325465eba6` (Apache-2.0).
The original README and agent instructions are preserved beside this document.

The source uses Next.js 16.2.6 / React 19 / TypeScript, file-backed scripts, job
Markdown and profiles, Gemini REST rewriting, and a separate Python Gradio
VoxCPM2 2.0.3 service. Electron is optional and remains available. The Python
service already serialized inference and seeded Python/NumPy/Torch. The Node
provider already chunked Burmese text, normalized/approved pronunciation,
matched chunk loudness, selected outlier takes and mastered PCM WAV.

The cloud edition upgrades Next.js to pinned 16.4.1 and PostCSS to 8.5.23 after
registry advisories identified a proxy bypass and other issues in the upstream
versions. Compatible transitive fixes and Electron 42.11.14 are locked as well.

Original gaps addressed:

- All filesystem, settings and model process routes trusted local callers.
  Owner sessions and centralized proxy checks now protect these routes.
- Data paths were tied to `cwd/data`; they are configurable persistent mounts.
- Gemini settings were written into the checkout; now private runtime config.
- Accepted jobs ran as background promises with Markdown progress, but no durable
  pending input or restart reconciliation. A private JSON spool now coordinates
  a single worker; interrupted in-flight inference fails safely without replay.
- Profile upload sizes trusted metadata. Actual base64 byte size, signatures,
  MIME and extension are validated independently of client filenames.
- Gradio listened on every interface; it now binds loopback by default.
- The local shell installed dependencies at startup; the container never calls
  that shell and runs the preinstalled Python environment directly.
- No external lifecycle service, mobile bottom navigation, PWA or cloud docs.

Inference changes are deliberately limited to upload validation, quota checks,
loopback binding, and startup status / cloud warmup failure handling. Core model
arguments, transcript suppression, chunk selection, seeds and PCM mastering are
preserved. In cloud mode a failed warmup is fatal rather than silently declaring
readiness. Cancellation checks occur at progress/chunk boundaries.

## Official references checked on 2026-10-15

- https://docs.runpod.io/pods/manage-pods
- https://docs.runpod.io/pods/storage/types
- https://docs.runpod.io/storage/network-volumes
- https://docs.runpod.io/pods/pricing
- https://docs.runpod.io/pods/configuration/expose-ports
- https://docs.runpod.io/api-reference/pods/POST/pods
- https://docs.runpod.io/api-reference/pods/GET/pods/podId
- https://docs.runpod.io/api-reference/pods/POST/pods/podId/start
- https://docs.runpod.io/api-reference/pods/POST/pods/podId/stop
- https://docs.runpod.io/api-reference/network-volumes/POST/networkvolumes
- https://docs.runpod.io/api-reference-v2/overview
- https://pypi.org/pypi/voxcpm/2.0.3/json
- https://github.com/pytorch/torchcodec#installing-torchcodec

This adapter uses the still-documented REST v1 base `https://rest.runpod.io/v1`.
Runpod also documents v2; it is not treated as shape-compatible. An independent
provider adapter can implement the GpuProvider interface without changing audio.

Network volumes are Secure Cloud / location dependent, attached at Pod creation,
and cannot be detached from a live Pod. Reuse on another Pod requires ending the
previous Pod's attachment in the provider dashboard. Volume disks, unlike network
volumes, are tied to the Pod and are lost on termination. Stop does not reserve
future GPU capacity. Never automatically terminate a Pod or volume.

No specific GPU price or availability is promised. Only a real Pod record's
adjustedCostPerHr/costPerHr is displayed; estimates are not a provider invoice.
No GPU utilization or VRAM numbers are invented when the API omits them.
