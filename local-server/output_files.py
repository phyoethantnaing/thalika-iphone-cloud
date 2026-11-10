"""
Where the engine writes each rendered take, and how those files get cleaned up.

server.py used to write every take to the system temp directory with delete=False and never remove
it. Gradio COPIES a returned file into its own cache (which delete_cache prunes hourly) before
serving it - verified: deleting the original right after a request still downloads with HTTP 200 -
so the original is dead weight the moment the request finishes. One session alone left 15 files /
25 MB behind, and 24-bit output makes each one 1.5x larger.

Kept free of torch/gradio/voxcpm imports so it is testable without loading the model.
"""

import glob
import os
import tempfile
import time

# Gradio copies the file while finishing the same request, milliseconds after generate() returns.
# The grace period only has to outlast that; two minutes is generous.
OUTPUT_GRACE_SECONDS = 120.0


def output_dir(base=None):
    directory = os.path.join(base or tempfile.gettempdir(), "thalika-engine-outputs")
    os.makedirs(directory, exist_ok=True)
    return directory


def prune_outputs(directory, max_age_seconds=OUTPUT_GRACE_SECONDS, now=None):
    """Delete take files older than max_age_seconds. Returns the removed paths."""
    return _prune(os.path.join(directory, "*.wav"), max_age_seconds, now)


def prune_legacy_outputs(base=None, max_age_seconds=OUTPUT_GRACE_SECONDS, now=None):
    """One-time sweep of takes the old code leaked straight into the temp directory."""
    return _prune(os.path.join(base or tempfile.gettempdir(), "thalika-output-*.wav"), max_age_seconds, now)


def _prune(pattern, max_age_seconds, now):
    now = time.time() if now is None else now
    removed = []
    for path in glob.glob(pattern):
        try:
            if now - os.path.getmtime(path) >= max_age_seconds:
                os.remove(path)
                removed.append(path)
        except OSError:
            pass  # already gone, or in use: the next prune gets it
    return removed
