#!/usr/bin/env python3
"""Supervise Node and model as separate processes, without installs at startup."""
import os
import signal
import subprocess
import time
from pathlib import Path

os.umask(0o077)
role = os.environ.get("THALIKA_ROLE", "studio")
if role not in ("studio", "control"):
    raise SystemExit("THALIKA_ROLE must be studio or control")
for key in ("OWNER_PASSWORD_HASH", "SESSION_SECRET"):
    if not os.environ.get(key):
        raise SystemExit(f"{key} is required; use provider secrets")
if len(os.environ["SESSION_SECRET"]) < 32:
    raise SystemExit("SESSION_SECRET is too short")
if not os.environ.get("APP_ORIGIN", "").startswith("https://"):
    # Runpod origin is assigned only after Pod creation. Use the official injected Pod ID.
    pod_id = os.environ.get("RUNPOD_POD_ID")
    if role == "studio" and pod_id:
        os.environ["APP_ORIGIN"] = f"https://{pod_id}-3000.proxy.runpod.net"
    else:
        raise SystemExit("Set HTTPS APP_ORIGIN for this deployment")
for name, fallback in (("THALIKA_DATA_DIR", "/workspace/persistent/data"), ("THALIKA_CONFIG_DIR", "/workspace/persistent/config"), ("HF_HOME", "/workspace/persistent/models/huggingface")):
    directory = Path(os.environ.setdefault(name, fallback))
    directory.mkdir(parents=True, exist_ok=True)
    if not os.access(directory, os.W_OK):
        raise SystemExit(f"{name} is not writable; initialize mount ownership before launch")
# An advisory Linux lock also protects shared network volumes from two Studio replicas.
import fcntl
lock = open(Path(os.environ["THALIKA_DATA_DIR"]) / "studio.lock", "a")
try:
    fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
except BlockingIOError:
    raise SystemExit("Another app is using this persistent data directory")
children = []
stop = False

def shutdown(*_args):
    global stop
    stop = True
    for child in children:
        if child.poll() is None:
            os.killpg(child.pid, signal.SIGTERM)

signal.signal(signal.SIGTERM, shutdown)
signal.signal(signal.SIGINT, shutdown)
if role == "studio":
    # No shell launcher / pip here. All dependencies are in /opt/venv in the image.
    children.append(subprocess.Popen(["/opt/venv/bin/python", "local-server/server.py"], start_new_session=True))
children.append(subprocess.Popen(["node", "server.js"], start_new_session=True))
exit_code = 0
while not stop:
    for child in children:
        code = child.poll()
        if code is not None:
            exit_code = code or 1
            shutdown()
            break
    time.sleep(1)
deadline = time.monotonic() + 25
for child in children:
    try:
        child.wait(timeout=max(0.1, deadline - time.monotonic()))
    except subprocess.TimeoutExpired:
        os.killpg(child.pid, signal.SIGKILL)
raise SystemExit(exit_code)
