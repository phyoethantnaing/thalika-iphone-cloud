#!/usr/bin/env python3
"""Supervise the Node app and the VoxCPM2 model as separate processes (no installs here)."""
import os
import sys
import signal
import subprocess
import time
from pathlib import Path

os.umask(0o077)
for key in ("OWNER_PASSWORD_HASH", "SESSION_SECRET"):
    if not os.environ.get(key):
        raise SystemExit(f"{key} is required; use Kaggle secrets via scripts/kaggle-start.py")
if len(os.environ["SESSION_SECRET"]) < 32:
    raise SystemExit("SESSION_SECRET is too short")
if not os.environ.get("APP_ORIGIN", "").startswith("https://"):
    raise SystemExit("Set the HTTPS APP_ORIGIN (the tunnel URL) for this deployment")
for name, fallback in (("THALIKA_DATA_DIR", "/kaggle/working/thalika-data"), ("THALIKA_CONFIG_DIR", "/tmp/thalika-kaggle/config"), ("HF_HOME", "/tmp/thalika-kaggle/models/huggingface")):
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
# scripts/kaggle-start.py points these at its prepared venv, source checkout and Next build.
python = os.environ.get("THALIKA_PYTHON", sys.executable)
model_server = os.environ.get("THALIKA_MODEL_SERVER", "local-server/server.py")
children.append(subprocess.Popen([python, model_server], start_new_session=True))
children.append(subprocess.Popen([os.environ.get("THALIKA_NODE", "node"), "server.js"], cwd=os.environ.get("THALIKA_WEB_DIR") or None, start_new_session=True))
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
