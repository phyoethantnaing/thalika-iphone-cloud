#!/usr/bin/env python3
"""Run Thalika Studio on a Kaggle GPU notebook (T4), reachable from iPhone over HTTPS.

One command from a Kaggle notebook cell:

    !python thalika-iphone-cloud/scripts/kaggle-start.py

What it does, in order (everything is pinned and checksum-verified where possible):
  1. Checks the notebook has a supported NVIDIA GPU (T4 / sm_75 or newer).
  2. Reads owner secrets from Kaggle "Add-ons -> Secrets" (never printed).
  3. Prepares Node 22, a Python 3.11 venv with local-server/requirements.lock, and
     the production Next.js build. VoxCPM2 2.0.3 and its 11-argument contract are unchanged.
  4. Restores saved Studio data from an attached previous notebook output, if any.
  5. Opens a Cloudflare tunnel to the authenticated Node app ONLY (port 3000).
     Gradio stays on 127.0.0.1:7860 and is never exposed.
  6. Supervises model + Node through scripts/supervise.py until the session
     deadline, then stops safely (waits for active jobs) so Kaggle saves the data.

Kaggle is a free, time-limited host: no cloud-provider API key is used or stored.
"""
from __future__ import annotations

import hashlib
import json
import os
import re
import secrets
import shutil
import signal
import subprocess
import sys
import tarfile
import threading
import time
import urllib.request
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import NoReturn

NODE_VERSION = "22.22.0"
NODE_SHA256 = "9aa8e9d2298ab68c600bd6fb86a6c13bce11a4eca1ba9b39d79fa021755d7c37"
CLOUDFLARED_VERSION = "2026.9.0"
CLOUDFLARED_SHA256 = "53b7a7a5420d188758d24341294acb0d1bca54296548ac05e38811a694ac6134"
UV_VERSION = "0.13.5"
PYTHON_VERSION = "3.11"
QUICK_TUNNEL = re.compile(r"https://[a-z0-9-]+\.trycloudflare\.com")
MIN_PASSWORD = 12
MIN_CAPABILITY = (7, 5)  # torch 2.8 cu128 wheels do not ship kernels for P100 (sm_60).

REPO = Path(__file__).resolve().parents[1]
WORK = Path(os.environ.get("THALIKA_KAGGLE_WORK", "/kaggle/working"))
INPUT = Path(os.environ.get("THALIKA_KAGGLE_INPUT", "/kaggle/input"))
RUNTIME = Path(os.environ.get("THALIKA_KAGGLE_RUNTIME", "/tmp/thalika-kaggle"))
DATA = WORK / "thalika-data"
SAVED_MARKER = ".thalika-saved-at"


def log(message: str) -> None:
    print(f"[thalika-kaggle] {message}", flush=True)


def fail(message: str) -> NoReturn:
    print(f"\n[thalika-kaggle] ERROR: {message}\n", file=sys.stderr, flush=True)
    raise SystemExit(1)


# ---------------------------------------------------------------- pure helpers (tested)
def owner_hash(password: str, salt_hex: str | None = None) -> str:
    """Same format and parameters as scripts/setup-owner.mjs (Node scryptSync defaults)."""
    salt_hex = salt_hex or secrets.token_hex(16)
    digest = hashlib.scrypt(password.encode(), salt=salt_hex.encode(), n=16384, r=8, p=1, dklen=64)
    return f"{salt_hex}:{digest.hex()}"


def parse_capability(text: str) -> tuple[int, int] | None:
    match = re.fullmatch(r"\s*(\d+)\.(\d+)\s*", text)
    return (int(match.group(1)), int(match.group(2))) if match else None


def find_quick_tunnel_url(line: str) -> str | None:
    match = QUICK_TUNNEL.search(line)
    return match.group(0) if match else None


def normalize_origin(value: str) -> str:
    value = value.strip().rstrip("/")
    if not re.fullmatch(r"https://[A-Za-z0-9.-]+(:\d+)?", value):
        fail("THALIKA_APP_ORIGIN must look like https://studio.example.com (no path).")
    return value


def newest_saved_data(root: Path) -> Path | None:
    """Pick the most recent thalika-data folder inside attached Kaggle inputs."""
    if not root.is_dir():
        return None
    best: tuple[str, Path] | None = None
    for depth in ("*", "*/*", "*/*/*", "*/*/*/*"):
        for candidate in root.glob(f"{depth}/thalika-data"):
            marker = candidate / SAVED_MARKER
            if candidate.is_dir() and not candidate.is_symlink() and marker.is_file():
                stamp = marker.read_text(encoding="utf-8").strip()
                if best is None or stamp > best[0]:
                    best = (stamp, candidate)
    return best[1] if best else None


def session_deadline(started: datetime, hours: float) -> datetime:
    # Kaggle hard-stops GPU sessions at 12 h; keep a margin so Kaggle can save output.
    return started + timedelta(hours=max(0.25, min(hours, 11.5)))


# ---------------------------------------------------------------- environment
def secret(name: str) -> str:
    value = os.environ.get(name, "")
    if value:
        return value
    try:
        from kaggle_secrets import UserSecretsClient  # type: ignore

        return UserSecretsClient().get_secret(name) or ""
    except Exception:  # noqa: BLE001 - secret not attached / not running on Kaggle
        return ""


def check_gpu() -> str:
    if not shutil.which("nvidia-smi"):
        fail("No GPU. In the notebook: Settings -> Accelerator -> 'GPU T4 x2', then run again.")
    out = subprocess.run(["nvidia-smi", "--query-gpu=name,compute_cap,memory.total", "--format=csv,noheader"],
                         capture_output=True, text=True, check=False).stdout.strip().splitlines()
    if not out:
        fail("nvidia-smi found no GPU. Choose 'GPU T4 x2' as the accelerator.")
    name, cap_text, memory = [part.strip() for part in (out[0].split(",") + ["", ""])[:3]]
    capability = parse_capability(cap_text)
    if capability and capability < MIN_CAPABILITY:
        fail(f"{name} (sm_{capability[0]}{capability[1]}) is not supported by the pinned PyTorch 2.8. Choose 'GPU T4 x2'.")
    log(f"GPU: {name} · compute {cap_text or 'unknown'} · {memory}")
    return name


def download(url: str, destination: Path, sha256: str) -> Path:
    if destination.is_file() and hashlib.sha256(destination.read_bytes()).hexdigest() == sha256:
        return destination
    log(f"downloading {url.rsplit('/', 1)[-1]} ...")
    temp = destination.with_suffix(destination.suffix + ".part")
    with urllib.request.urlopen(url, timeout=120) as response, open(temp, "wb") as handle:
        shutil.copyfileobj(response, handle)
    actual = hashlib.sha256(temp.read_bytes()).hexdigest()
    if actual != sha256:
        temp.unlink(missing_ok=True)
        fail(f"checksum mismatch for {url}")
    temp.replace(destination)
    return destination


def run(command: list[str], **kwargs) -> None:
    log("$ " + " ".join(command))
    result = subprocess.run(command, **kwargs)
    if result.returncode:
        fail(f"command failed ({result.returncode}): {' '.join(command)}")


def ensure_node() -> Path:
    home = RUNTIME / f"node-v{NODE_VERSION}-linux-x64"
    node = home / "bin" / "node"
    if not node.exists():
        archive = download(f"https://nodejs.org/dist/v{NODE_VERSION}/node-v{NODE_VERSION}-linux-x64.tar.xz",
                           RUNTIME / f"node-v{NODE_VERSION}.tar.xz", NODE_SHA256)
        with tarfile.open(archive) as tar:
            try:
                tar.extractall(RUNTIME, filter="tar")
            except TypeError:  # Python without extraction filters; archive is checksum-pinned
                tar.extractall(RUNTIME)
    os.environ["PATH"] = f"{home / 'bin'}{os.pathsep}{os.environ['PATH']}"
    return node


def ensure_python() -> Path:
    venv = RUNTIME / "venv"
    python = venv / "bin" / "python"
    lock = REPO / "local-server" / "requirements.lock"
    stamp = venv / ".thalika-lock-sha256"
    digest = hashlib.sha256(lock.read_bytes()).hexdigest()
    if python.exists() and stamp.is_file() and stamp.read_text() == digest:
        return python
    run([sys.executable, "-m", "pip", "install", "--quiet", "--disable-pip-version-check", f"uv=={UV_VERSION}"])
    uv = [sys.executable, "-m", "uv"]
    # uv fetches a standalone CPython 3.11, so Kaggle's own Python version does not matter.
    run(uv + ["venv", "--python", PYTHON_VERSION, "--seed", str(venv)])
    run(uv + ["pip", "install", "--python", str(python), "-r", str(lock)])
    run([str(python), "-c", "import torch, torchaudio, gradio, voxcpm; print('torch', torch.__version__, 'cuda', torch.cuda.is_available())"])
    # Real dependencies + the 11-argument Gradio contract, with a test-double model (no weights).
    run([str(python), str(REPO / "tests" / "python-contract.py")],
        env={**os.environ, "THALIKA_MODEL_STATUS": str(RUNTIME / "contract-status.json"), "GRADIO_ANALYTICS_ENABLED": "False"})
    stamp.write_text(digest)
    return python


def ensure_web(node: Path) -> Path:
    standalone = REPO / ".next" / "standalone"
    stamp = standalone / ".thalika-source"
    head = subprocess.run(["git", "-C", str(REPO), "rev-parse", "HEAD"], capture_output=True, text=True).stdout.strip()
    dirty = subprocess.run(["git", "-C", str(REPO), "status", "--porcelain"], capture_output=True, text=True).stdout.strip()
    identity = f"{head}:{hashlib.sha256(dirty.encode()).hexdigest()}"
    if (standalone / "server.js").is_file() and stamp.is_file() and stamp.read_text() == identity:
        return standalone
    npm = str(node.parent / "npm")
    env = {**os.environ, "NEXT_TELEMETRY_DISABLED": "1"}
    run([npm, "ci", "--ignore-scripts", "--no-audit", "--no-fund"], cwd=REPO, env=env)
    run([npm, "run", "build"], cwd=REPO, env=env)
    shutil.copytree(REPO / ".next" / "static", standalone / ".next" / "static", dirs_exist_ok=True)
    shutil.copytree(REPO / "public", standalone / "public", dirs_exist_ok=True)
    stamp.write_text(identity)
    return standalone


def restore_data() -> None:
    DATA.mkdir(parents=True, exist_ok=True)
    if any(p.name not in ("studio.lock", SAVED_MARKER) for p in DATA.iterdir()):
        log(f"using existing data in {DATA}")
        return
    previous = newest_saved_data(INPUT)
    if previous:
        log(f"restoring saved Studio data from {previous}")
        shutil.copytree(previous, DATA, dirs_exist_ok=True, symlinks=False,
                        ignore=shutil.ignore_patterns("studio.lock"))
    else:
        log("no saved data attached; starting with an empty Studio")


def mark_saved() -> None:
    (DATA / SAVED_MARKER).write_text(datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"), encoding="utf-8")


# ---------------------------------------------------------------- tunnel
def start_tunnel(token: str) -> tuple[subprocess.Popen, str | None]:
    binary = download(f"https://github.com/cloudflare/cloudflared/releases/download/{CLOUDFLARED_VERSION}/cloudflared-linux-amd64",
                      RUNTIME / f"cloudflared-{CLOUDFLARED_VERSION}", CLOUDFLARED_SHA256)
    binary.chmod(0o755)
    # http2 over TCP 443: Kaggle can block the QUIC/UDP default.
    common = [str(binary), "tunnel", "--no-autoupdate", "--protocol", "http2"]
    env = {**os.environ}
    if token:
        env["TUNNEL_TOKEN"] = token  # via env, never argv, so it is not visible in process lists
        command = common + ["run"]
    else:
        command = common + ["--url", "http://127.0.0.1:3000"]
    process = subprocess.Popen(command, env=env, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True, bufsize=1)
    found: dict[str, str] = {}
    ready = threading.Event()

    def pump() -> None:
        assert process.stdout
        for line in process.stdout:
            url = find_quick_tunnel_url(line)
            if url and "url" not in found:
                found["url"] = url
                ready.set()
            if "ERR" in line or "Registered tunnel connection" in line:
                print(f"[cloudflared] {line.rstrip()}", flush=True)
                if "Registered tunnel connection" in line:
                    ready.set()
        ready.set()

    threading.Thread(target=pump, daemon=True).start()
    ready.wait(timeout=90)
    if process.poll() is not None:
        fail("Cloudflare tunnel exited. Check that 'Internet' is ON in notebook settings (phone-verified account).")
    if not token and "url" not in found:
        fail("Could not obtain a trycloudflare.com URL within 90 s.")
    return process, found.get("url")


def notify(url: str) -> None:
    target = secret("THALIKA_NOTIFY_URL")
    if not target.startswith("https://"):
        return
    try:
        request = urllib.request.Request(target, data=f"Thalika Studio: {url}".encode(), method="POST",
                                         headers={"Content-Type": "text/plain; charset=utf-8"})
        urllib.request.urlopen(request, timeout=10).close()
        log("sent the Studio link to THALIKA_NOTIFY_URL")
    except Exception as exc:  # noqa: BLE001 - notification is optional
        log(f"notification failed: {exc}")


# ---------------------------------------------------------------- supervise
def internal(token: str, action: str | None = None) -> dict:
    request = urllib.request.Request("http://127.0.0.1:3000/api/internal/runtime", method="POST" if action else "GET",
                                     data=json.dumps({"action": action}).encode() if action else None,
                                     headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"})
    with urllib.request.urlopen(request, timeout=10) as response:
        return json.loads(response.read() or b"{}")


def banner(url: str, deadline: datetime) -> None:
    line = "=" * 72
    print(f"\n{line}\n  Thalika Studio (Kaggle GPU)\n\n  iPhone Safari:  {url}\n"
          f"  Sign in with your THALIKA_OWNER_PASSWORD secret.\n"
          f"  Session ends:   {deadline:%Y-%m-%d %H:%M} UTC\n{line}\n", flush=True)


def main() -> None:
    if os.environ.get("THALIKA_KAGGLE_SELFTEST") == "1":
        return
    started = datetime.now(timezone.utc)
    deadline = session_deadline(started, float(os.environ.get("THALIKA_MAX_HOURS", "11")))
    RUNTIME.mkdir(parents=True, exist_ok=True)
    os.chmod(RUNTIME, 0o700)
    check_gpu()

    password, password_hash = secret("THALIKA_OWNER_PASSWORD"), secret("OWNER_PASSWORD_HASH")
    if not password_hash:
        if len(password) < MIN_PASSWORD:
            fail(f"Add a Kaggle secret THALIKA_OWNER_PASSWORD (at least {MIN_PASSWORD} characters) and attach it to this notebook.")
        password_hash = owner_hash(password)
    session_secret = secret("THALIKA_SESSION_SECRET")
    if len(session_secret) < 32:
        session_secret = secrets.token_hex(48)  # sign in again each Kaggle session
    runtime_token = secrets.token_hex(48)
    tunnel_token = secret("CLOUDFLARE_TUNNEL_TOKEN")
    fixed_origin = normalize_origin(secret("THALIKA_APP_ORIGIN")) if tunnel_token else ""

    node = ensure_node()
    python = ensure_python()
    web = ensure_web(node)
    restore_data()

    tunnel, quick_url = start_tunnel(tunnel_token)
    origin = fixed_origin or quick_url or ""
    models = RUNTIME / "models"
    env = {
        **os.environ,
        "NODE_ENV": "production", "NEXT_TELEMETRY_DISABLED": "1", "HOSTNAME": "127.0.0.1", "PORT": "3000",
        "THALIKA_CLOUD": "1", "THALIKA_GPU_HOST": "kaggle",
        "THALIKA_SESSION_DEADLINE": deadline.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "APP_ORIGIN": origin, "OWNER_PASSWORD_HASH": password_hash, "SESSION_SECRET": session_secret,
        "RUNTIME_TOKEN": runtime_token,
        "THALIKA_DATA_DIR": str(DATA), "THALIKA_CONFIG_DIR": str(RUNTIME / "config"),
        "THALIKA_MODEL_STATUS": str(RUNTIME / "model-status.json"),
        "HF_HOME": str(models / "huggingface"), "XDG_CACHE_HOME": str(models / "cache"),
        "MODELSCOPE_CACHE": str(models / "modelscope"), "TORCH_HOME": str(models / "torch"),
        "NUMBA_CACHE_DIR": str(RUNTIME / "numba"), "HF_HUB_DISABLE_TELEMETRY": "1", "GRADIO_ANALYTICS_ENABLED": "False",
        "HF_VOXCPM2_URL": "http://127.0.0.1:7860", "VOXCPM_BIND": "127.0.0.1", "VOXCPM_DEVICE": "cuda",
        "PYTHONUNBUFFERED": "1", "CUDA_VISIBLE_DEVICES": os.environ.get("CUDA_VISIBLE_DEVICES", "0"),
        "THALIKA_PYTHON": str(python), "THALIKA_MODEL_SERVER": str(REPO / "local-server" / "server.py"),
        "THALIKA_NODE": str(node), "THALIKA_WEB_DIR": str(web),
    }
    for optional in ("GEMINI_API_KEY", "HF_TOKEN"):
        if (value := secret(optional)):
            env[optional] = value
    for drop in ("CLOUDFLARE_TUNNEL_TOKEN", "THALIKA_OWNER_PASSWORD", "TUNNEL_TOKEN"):
        env.pop(drop, None)

    supervisor = subprocess.Popen([sys.executable, str(REPO / "scripts" / "supervise.py")], cwd=REPO, env=env)
    banner(origin, deadline)
    (WORK / "THALIKA_URL.txt").write_text(origin + "\n", encoding="utf-8")
    notify(origin)

    stopping = {"now": False}

    def request_stop(*_args) -> None:
        stopping["now"] = True

    signal.signal(signal.SIGTERM, request_stop)
    signal.signal(signal.SIGINT, request_stop)
    hard_stop = deadline + timedelta(minutes=25)
    reserved = False
    try:
        while supervisor.poll() is None:
            now = datetime.now(timezone.utc)
            if stopping["now"] or now >= deadline:
                if stopping["now"] and hard_stop > now + timedelta(minutes=10):
                    hard_stop = now + timedelta(minutes=10)  # manual stop: wait at most 10 min for a job
                if not reserved and now < hard_stop:
                    try:
                        internal(runtime_token, "reserve-stop")
                        reserved = True
                    except Exception:  # noqa: BLE001 - busy (409) or not up yet
                        log("waiting for the active generation to finish before stopping ...")
                        time.sleep(30)
                        continue
                break
            if tunnel.poll() is not None:
                log("tunnel closed unexpectedly; restarting it")
                tunnel, new_url = start_tunnel(tunnel_token)
                if new_url and new_url != origin:
                    log("quick-tunnel URL changed; restarting the app with the new origin")
                    supervisor.send_signal(signal.SIGTERM)
                    supervisor.wait(timeout=60)
                    origin = new_url
                    env["APP_ORIGIN"] = origin
                    supervisor = subprocess.Popen([sys.executable, str(REPO / "scripts" / "supervise.py")], cwd=REPO, env=env)
                    banner(origin, deadline)
                    (WORK / "THALIKA_URL.txt").write_text(origin + "\n", encoding="utf-8")
                    notify(origin)
            time.sleep(5)
    finally:
        if supervisor.poll() is None:
            supervisor.send_signal(signal.SIGTERM)
            try:
                supervisor.wait(timeout=40)
            except subprocess.TimeoutExpired:
                supervisor.kill()
        tunnel.terminate()
        mark_saved()
        log(f"stopped. Studio data is in {DATA}; Kaggle keeps it as this version's output.")
    if supervisor.returncode not in (0, -signal.SIGTERM, None) and not reserved:
        fail(f"Studio exited with code {supervisor.returncode}; see the log above.")


if __name__ == "__main__":
    main()
