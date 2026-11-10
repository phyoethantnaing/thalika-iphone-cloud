# Project guide

This edition adapts the original local Thalika studio for iPhone Safari with a
Kaggle notebook GPU (`scripts/kaggle-start.py`). `Thalika-SKILL.md` records the original implementation;
its local-only prohibitions are superseded by the owner's cloud-edition request.

Read `AGENTS.md`, `docs/ARCHITECTURE.md`, `docs/AUDIT.md`, and `docs/TESTING.md`.
Keep the original audio/normalization/model behavior. Cloud additions must fail
closed, use managed paths, protect references and secrets, and never provision
billable resources. Consult `README.md` for the
Myanmar user setup guide and `docs/OPERATIONS.my.md` for recovery.
