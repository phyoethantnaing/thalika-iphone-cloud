#!/usr/bin/env bash
set -euo pipefail
: "${IMAGE_REPOSITORY:?Set registry/account/thalika-iphone-cloud}"
version="${IMAGE_TAG:-$(git rev-parse --short=12 HEAD)}"
for target in control gpu; do
  docker build --platform linux/amd64 --target "$target" --label "org.opencontainers.image.source=$(git remote get-url origin)" -t "${IMAGE_REPOSITORY}-${target}:${version}" .
  if [ "${PUSH_IMAGE:-0}" = 1 ]; then
    docker push "${IMAGE_REPOSITORY}-${target}:${version}"
    docker image inspect "${IMAGE_REPOSITORY}-${target}:${version}" --format '{{json .RepoDigests}}'
  fi
done
