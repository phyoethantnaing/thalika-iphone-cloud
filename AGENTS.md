# Thalika iPhone Cloud edition

The owner's master prompt authorizes Docker, owner authentication, and Runpod cloud
hosting. This supersedes the original local-only prohibitions, retained in
`docs/UPSTREAM_AGENTS.md` and `Thalika-SKILL.md` for provenance. Read `SKILL.md` and
`docs/ARCHITECTURE.md` before changes.

- Preserve VoxCPM2 2.0.3 and the 11-argument local Gradio contract.
- Preserve Burmese approval, deterministic seeds, chunk QA/mastering and 48kHz
  mono 24-bit PCM WAV. Do not substitute voice models or production mocks.
- Keep model on loopback; expose only the authenticated Node app.
- One Node replica per data directory; one control replica per config directory.
- All filesystem routes use nodejs runtime. Never accept arbitrary client paths.
- Never remove user files without an explicit selected-item delete confirmation.
- Provider credentials stay on the separate control plane; never on the GPU.
- Do not provision paid compute/storage or publish billable services in tests.
- Retain Apache-2.0 license, NOTICE and upstream attribution.
- Do not push upstream. Verify the owner's destination and remote commit SHA.
- Check `npm run lint`, `npm test`, `npm run build`, and `npm run test:e2e`.
  Browser tests use an explicit test double, not real voice inference.
- Read `docs/TESTING.md` for remaining real-device/GPU release checks.
