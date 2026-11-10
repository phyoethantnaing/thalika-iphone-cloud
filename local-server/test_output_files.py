"""Run with: local-server/.voxcpm-venv/bin/python -m unittest local-server/test_output_files.py"""
import os
import sys
import tempfile
import unittest

sys.path.insert(0, os.path.dirname(__file__))
from output_files import output_dir, prune_legacy_outputs, prune_outputs  # noqa: E402


def touch(path, mtime):
    with open(path, "wb") as handle:
        handle.write(b"RIFF")
    os.utime(path, (mtime, mtime))


class OutputFilesTest(unittest.TestCase):
    def setUp(self):
        self.base = tempfile.mkdtemp(prefix="thalika-output-test-")

    def test_old_takes_go_fresh_ones_stay(self):
        directory = output_dir(self.base)
        now = 10_000.0
        touch(os.path.join(directory, "old.wav"), now - 600)
        touch(os.path.join(directory, "fresh.wav"), now - 5)  # Gradio may still be copying this
        touch(os.path.join(directory, "notes.txt"), now - 600)  # not ours to judge
        removed = prune_outputs(directory, 120, now)
        self.assertEqual([os.path.basename(p) for p in removed], ["old.wav"])
        self.assertTrue(os.path.exists(os.path.join(directory, "fresh.wav")))
        self.assertTrue(os.path.exists(os.path.join(directory, "notes.txt")))

    def test_startup_sweep_clears_everything_left_by_a_crash(self):
        directory = output_dir(self.base)
        now = 10_000.0
        touch(os.path.join(directory, "a.wav"), now)
        self.assertEqual(len(prune_outputs(directory, 0, now)), 1)

    def test_legacy_leak_is_swept_but_nothing_else_in_temp(self):
        now = 10_000.0
        touch(os.path.join(self.base, "thalika-output-abc.wav"), now - 3600)
        touch(os.path.join(self.base, "someone-elses.wav"), now - 3600)
        removed = prune_legacy_outputs(self.base, 120, now)
        self.assertEqual([os.path.basename(p) for p in removed], ["thalika-output-abc.wav"])
        self.assertTrue(os.path.exists(os.path.join(self.base, "someone-elses.wav")))


if __name__ == "__main__":
    unittest.main()
