#!/usr/bin/env bash
# One-time operation on a newly created mount. Does not change existing data ownership.
set -euo pipefail
root="${THALIKA_PERSISTENT_ROOT:-/workspace/persistent}"
if [ -e "$root" ]; then echo 'Persistent root already exists; inspect permissions manually. No data changed.' >&2; exit 1; fi
install -d -m 0700 -o 10001 -g 10001 "$root" "$root/models" "$root/data" "$root/config"
echo 'Created private directories for UID/GID 10001. No software or weights installed.'
