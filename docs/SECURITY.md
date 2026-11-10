# Security notes

This is a private single-owner application, reached only through the HTTPS tunnel
started by `scripts/kaggle-start.py`. Node and Gradio bind loopback; only Node is
tunnelled. Owner secrets come from Kaggle Secrets and are never printed, written to
notebook output, or included in client bundles or this source. No cloud-provider
API key exists. Keep the Kaggle notebook private: its output holds voice data.

The upstream Next.js 16.2.6 had published runtime advisories, including proxy bypass.
This edition pins Next.js 16.4.1, PostCSS 8.5.23 and Electron 42.11.14, with compatible
transitive fixes in package-lock.json. `npm audit --omit=dev` reported zero
advisories on 2026-10-15. This is an observed registry result, not a promise against
future vulnerabilities or a full operating-system/Python security audit.

The full development dependency audit reports seven advisory records (five high,
two moderate) in Tailwind 3's braces/chokidar/micromatch/fast-glob and PostCSS
selector-parser/nested chain. These are build-time tools processing trusted source,
not installed as the app's production dependency set. Removing that chain requires
a Tailwind major-version migration, which is outside this inference/cloud change.
Do not build unreviewed source with credentials. GitHub validation has read-only
permissions. Node, cloudflared and uv downloads are version-pinned; Node and
cloudflared binaries are SHA-256 verified before use.

Owner passwords are salted scrypt hashes; generated secrets are written only to
private mode-0600 files. Session secret rotation revokes sessions. Login throttling
and action throttling are single-replica, in-memory limits; run one notebook at a
time and do not put this architecture behind a multi-replica load balancer. Shared-volume locks must work. Do not disable auth or filesystem
locks to recover a failed deployment.

Private references, execution inputs and outputs remain in the notebook's data
directory and output. Kaggle and Cloudflare remain part of the trust boundary.
Backups need separate encryption. The app never claims encrypted-at-rest storage
or perfect voice identity matching.
