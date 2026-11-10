# Thalika iPhone + Kaggle GPU edition

The owner authorizes owner authentication and Kaggle notebook GPU hosting reached
from iPhone Safari through a tunnel; Runpod/Docker hosting was removed by the owner.
This supersedes the original local-only prohibitions, retained in
`docs/UPSTREAM_AGENTS.md` and `Thalika-SKILL.md` for provenance. Read `SKILL.md` and
`docs/ARCHITECTURE.md` before changes.

- Preserve VoxCPM2 2.0.3 and the 11-argument local Gradio contract.
- Preserve Burmese approval, deterministic seeds, chunk QA/mastering and 48kHz
  mono 24-bit PCM WAV. Do not substitute voice models or production mocks.
- Keep model on loopback; expose only the authenticated Node app.
- One Node replica per data directory (one Kaggle notebook run at a time).
- All filesystem routes use nodejs runtime. Never accept arbitrary client paths.
- Never remove user files without an explicit selected-item delete confirmation.
- Secrets come from Kaggle Secrets; never print them or write them to notebook output.
- Do not provision paid compute/storage or contact Kaggle/Cloudflare in tests.
- Retain Apache-2.0 license, NOTICE and upstream attribution.
- Do not push upstream. Verify the owner's destination and remote commit SHA.
- Check `npm run lint`, `npm test`, `npm run build`, and `npm run test:e2e`.
  Browser tests use an explicit test double, not real voice inference.
- Host: `scripts/kaggle-start.py` + `kaggle/`; see `docs/KAGGLE.my.md`.
- Read `docs/TESTING.md` for remaining real Kaggle/iPhone release checks.
