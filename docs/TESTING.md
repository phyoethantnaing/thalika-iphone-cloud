# Verification and release checks

Run `npm run lint`, `npm test`, `npm run build`, then `npm run test:e2e`.
The browser tests use an explicitly isolated Gradio test double that returns a
synthetic sine-wave WAV. It is never used by the Kaggle launcher. Passing those
tests proves application/job/audio contracts, not VoxCPM2 voice quality.

Automated coverage includes owner session signatures/expiry, origin validation,
unauthorized private APIs, decoded upload size/MIME/signatures, traversal rejection,
consent, Kaggle launcher owner-hash/tunnel/deadline/restore helpers, model readiness,
active-job stop refusal, persistent pending
and interrupted jobs, single-worker serialization, cancellation, original PCM master
encoding/merge, Burmese punctuation/chunking, mobile portrait/landscape overflow,
Files-style upload, saved profiles/scripts, tab-close job recovery, downloads/ranges,
manifest/icons and conservative service-worker behavior.

Browser projects: Chromium mobile viewport and WebKit with the iPhone 13 device
profile. Playwright WebKit on Linux is not a physical iPhone or Apple Safari binary.
No test relies on real credentials, Kaggle, Cloudflare or GPU inference.

## Kaggle T4 acceptance (free; requires the owner's Kaggle account)

1. Import `kaggle/thalika-kaggle.ipynb`, select GPU T4 x2 + Internet, attach secrets, Save & Run All.
2. Confirm the log shows the contract check passing, `capability=(7, 5), dtype=float32,
   compile=False`, and `Ready` in Settings. Record first startup time.
3. Generate short and multi-chunk Burmese scripts; listen for quality and compare with an
   Ampere GPU if available. Verify 48 kHz / mono / 24-bit PCM WAV.
4. Close Safari during generation; reopen the link and verify one completed job.
5. Let a short `MAX_HOURS` (e.g. `0.5`) expire during a generation: launcher must wait, stop,
   and the version output must contain `thalika-data`. Attach it to a new run; confirm restore.

## Physical iPhone acceptance

Test current iOS Safari in portrait/landscape and from Home Screen. Check Dynamic
Island/notch/bottom safe areas, keyboard focus and text entry without zoom, Myanmar
Unicode shaping, Files + iCloud Drive WAV/M4A uploads, quality feedback, native audio
seeking/pause/resume, Save to Files, Share Sheet cancellation, session expiry, tab
suspension/reopen, offline notice and Pod URL changes. Browser automation cannot
verify iCloud entitlements, actual share UI, hardware audio, or OS suspension policy.

## Local result record

See `docs/DELIVERY.md` for executed results and artifact identity. Never relabel test
double output as a successful real-model or real-GPU inference test.
