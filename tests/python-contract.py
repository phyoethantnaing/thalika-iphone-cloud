"""Real dependency/Gradio validation with an explicitly mocked model (no weights)."""
from pathlib import Path
import runpy
from types import SimpleNamespace
from unittest.mock import patch
import numpy as np
import soundfile as sf
import torch
import torchcodec
import torchaudio
import gradio
from voxcpm import VoxCPM

class ContractModel:
    tts_model = SimpleNamespace(device='cpu', sample_rate=48000)
    def generate(self, **kwargs):
        return np.sin(np.arange(4800, dtype=np.float32) / 48000 * 440 * 2 * np.pi) * .1

with patch.object(VoxCPM, 'from_pretrained', return_value=ContractModel()):
    module = runpy.run_path('/app/local-server/server.py', run_name='contract_test')
    result = module['generate']('hello', 'calm', None, False, '', 2.0, True, False, 10, True, 42)
    assert sf.info(result).samplerate == 48000
    assert sf.info(result).channels == 1
    Path(result).unlink()
    interface = module['demo']
    assert len(interface.input_components) == 11
    assert any(d.get('api_name') == 'generate' for d in interface.config['dependencies'])
    assert torch.__version__.startswith('2.8.0')
    assert torch.version.cuda == '12.8'
    print('Real Python/CUDA ABI imports and 11-argument Gradio interface validated. Model was a test double; no real inference performed.')
