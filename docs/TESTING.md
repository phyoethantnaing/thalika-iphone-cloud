# Verification and release checks

Run `npm run lint`, `npm test`, `npm run build`, then `npm run test:e2e`.
The browser tests use an explicitly isolated Gradio test double that returns a
synthetic sine-wave WAV. It is excluded from all production images. Passing those
tests proves application/job/audio contracts, not VoxCPM2 voice quality.

Automated coverage includes owner session signatures/expiry, origin validation,
unauthorized private APIs, decoded upload size/MIME/signatures, traversal rejection,
consent, provider request contracts and credential redaction, actual-state vs model
readiness, active-job stop refusal, ambiguous create suppression, persistent pending
and interrupted jobs, single-worker serialization, cancellation, original PCM master
encoding/merge, Burmese punctuation/chunking, mobile portrait/landscape overflow,
Files-style upload, saved profiles/scripts, tab-close job recovery, downloads/ranges,
manifest/icons and conservative service-worker behavior.

Browser projects: Chromium mobile viewport and WebKit with the iPhone 13 device
profile. Playwright WebKit on Linux is not a physical iPhone or Apple Safari binary.
No test relies on real provider credentials or creates paid resources.

## Real GPU acceptance (requires owner authorization and credentials)

1. Build GPU image, verify its import checks and push an immutable digest.
2. Create a supported network volume and Pod after reviewing current prices.
3. Verify CUDA host driver, `torch.cuda.is_available()` and actual GPU count.
4. Record first startup time, cached restart time, image digest and model revision.
5. Upload a consented reference; generate a short Burmese script and long multi-chunk
   script. Listen for pronunciation, timbre consistency, gaps, clipping and repetition.
6. Check `file` and header parsing: 48 kHz, one channel, 24-bit PCM RIFF/WAVE.
7. Close the browser during generation; reconnect and verify one completed job.
8. Attempt safe stop while generating (must refuse); cancel or complete, then stop.
9. Verify provider EXITED state and billing. Resume and confirm saved data/cache.
10. After backup, replace the Pod in the same volume location; reattach during creation,
    confirm cached weights, reference profiles, scripts, lexicon, history and outputs.
11. Test network loss / provider timeout and verify no duplicate paid Pod is created.
12. Check provider billing for compute, stopped storage and any transfer charges.

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
