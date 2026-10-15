# Security notes

This is a private single-owner application. Deploy only through HTTPS and keep
Gradio on loopback. The control host is separate from the GPU. The Runpod API key
must exist only on that control host or in an operator's protected environment.
No provider key is included in client bundles, templates, images or this source.

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
permissions and publishing is a separate manually invoked workflow.

Owner passwords are salted scrypt hashes; generated secrets are written only to
private mode-0600 files. Session secret rotation revokes sessions. Login throttling
and action throttling are single-replica, in-memory limits, so use a persistent
long-lived control host and do not put this architecture behind a multi-replica
load balancer. Shared-volume locks must work. Do not disable auth or filesystem
locks to recover a failed deployment.

Private references, execution inputs and outputs remain on the managed volume.
The provider and its host/storage access remain part of the trust boundary.
Backups need separate encryption. The app never claims encrypted-at-rest network
volumes or perfect voice identity matching.
