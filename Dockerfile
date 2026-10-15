# syntax=docker/dockerfile:1.7
FROM node:22.22.0-bookworm-slim@sha256:dd9d21971ec4395903fa6143c2b9267d048ae01ca6d3ea96f16cb30df6187d94 AS web
WORKDIR /build
ENV NEXT_TELEMETRY_DISABLED=1
COPY package.json package-lock.json ./
RUN --mount=type=secret,id=proxy_ca \
    if [ -f /run/secrets/proxy_ca ]; then export NODE_EXTRA_CA_CERTS=/run/secrets/proxy_ca; fi; \
    npm ci --ignore-scripts
COPY next.config.ts next-env.d.ts tsconfig.json postcss.config.js tailwind.config.ts ./
COPY src ./src
COPY public ./public
RUN npm run lint && npm run build

# Python wheels contain the pinned CUDA 12.8 runtime. NVIDIA drivers come from the host.
FROM python:3.11.14-slim-bookworm@sha256:65a93d69fa75478d554f4ad27c85c1e69fa184956261b4301ebaf6dbb0a3543d AS runtime-base
# One assembly layer also avoids full filesystem copies on VFS builders.
RUN --mount=type=bind,from=web,source=/usr/local/bin/node,target=/tmp/web-node \
    --mount=type=bind,from=web,source=/build/.next,target=/tmp/web-next \
    --mount=type=bind,from=web,source=/build/public,target=/tmp/web-public \
    --mount=type=bind,source=scripts/container-start.py,target=/tmp/container-start.py \
    --mount=type=bind,source=LICENSE,target=/tmp/source-LICENSE \
    --mount=type=bind,source=NOTICE,target=/tmp/source-NOTICE \
    apt-get update && apt-get install -y --no-install-recommends ffmpeg libsndfile1 libgomp1 ca-certificates tini && \
    rm -rf /var/lib/apt/lists/* && \
    groupadd --gid 10001 thalika && useradd --uid 10001 --gid 10001 --create-home thalika && \
    cp /tmp/web-node /usr/local/bin/node && chmod 0755 /usr/local/bin/node && \
    mkdir -p /app/.next/static /app/public /app/scripts && cp -a /tmp/web-next/standalone/. /app/ && \
    cp -a /tmp/web-next/static/. /app/.next/static/ && cp -a /tmp/web-public/. /app/public/ && \
    cp /tmp/container-start.py /app/scripts/container-start.py && \
    cp /tmp/source-LICENSE /app/LICENSE && cp /tmp/source-NOTICE /app/NOTICE && chown -R 10001:10001 /app
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 HOSTNAME=0.0.0.0 PORT=3000 \
    THALIKA_CLOUD=1 THALIKA_DATA_DIR=/workspace/persistent/data \
    THALIKA_CONFIG_DIR=/workspace/persistent/config HF_HOME=/workspace/persistent/models/huggingface \
    HF_VOXCPM2_URL=http://127.0.0.1:7860 HF_HUB_DISABLE_TELEMETRY=1 GRADIO_ANALYTICS_ENABLED=False \
    XDG_CACHE_HOME=/workspace/persistent/models/cache MODELSCOPE_CACHE=/workspace/persistent/models/modelscope \
    TORCH_HOME=/workspace/persistent/models/torch NUMBA_CACHE_DIR=/tmp/numba \
    PYTHONUNBUFFERED=1 VOXCPM_BIND=127.0.0.1
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 CMD ["node", "-e", "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"]
USER 10001:10001
ENTRYPOINT ["/usr/bin/tini", "--", "python", "scripts/container-start.py"]

# Lightweight, separate always-available control service. No GPU libraries in this target.
FROM runtime-base AS control
ENV THALIKA_ROLE=control

# Install Python dependencies in the final filesystem's last mutating layer.
# This avoids duplicating a 9GB venv on Docker's VFS storage driver. Build-time
# compilers are removed in the same layer; no installation runs at Pod startup.
FROM runtime-base AS gpu
USER root
ENV THALIKA_ROLE=studio VOXCPM_DEVICE=cuda \
    NVIDIA_VISIBLE_DEVICES=all NVIDIA_DRIVER_CAPABILITIES=compute,utility
RUN --mount=type=secret,id=proxy_ca \
    --mount=type=bind,source=local-server,target=/tmp/model-source \
    --mount=type=bind,source=tests/python-contract.py,target=/tmp/contract-source.py \
    if [ -f /run/secrets/proxy_ca ]; then export PIP_CERT=/run/secrets/proxy_ca; fi; \
    apt-get update && apt-get install -y --no-install-recommends build-essential && \
    python -m venv /opt/venv && \
    /opt/venv/bin/pip install --no-cache-dir pip==25.2 && \
    /opt/venv/bin/pip install --no-cache-dir -r /tmp/model-source/requirements.lock && \
    /opt/venv/bin/pip check && \
    cp -a /tmp/model-source /app/local-server && chown -R 10001:10001 /app/local-server && \
    cp /tmp/contract-source.py /tmp/python-contract.py && chmod 0644 /tmp/python-contract.py && \
    runuser -u thalika -- /opt/venv/bin/python /tmp/python-contract.py && \
    rm -f /tmp/python-contract.py /tmp/thalika-model-status.json && \
    apt-get purge -y --auto-remove build-essential && rm -rf /var/lib/apt/lists/*
USER 10001:10001
