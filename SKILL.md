# Project guide

This edition adapts the original local Thalika studio for iPhone and optional
on-demand cloud GPU use. `Thalika-SKILL.md` records the original implementation;
its local-only prohibitions are superseded by the owner's cloud-edition request.

Read `AGENTS.md`, `docs/ARCHITECTURE.md`, `docs/AUDIT.md`, and `docs/TESTING.md`.
Keep the original audio/normalization/model behavior. Cloud additions must fail
closed, use persistent managed paths, protect references and secrets, and never
provision billable resources without owner action. Consult `README.md` for the
Myanmar user setup guide and `docs/OPERATIONS.my.md` for recovery.
