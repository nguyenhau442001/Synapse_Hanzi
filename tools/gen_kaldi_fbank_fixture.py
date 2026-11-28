"""Generates the KaldiFbank.js parity fixture with kaldi-native-fbank (reference implementation)."""
import json
import os

import kaldi_native_fbank as knf
import numpy as np

SAMPLE_RATE = 16000
DURATION_SEC = 0.8
LOW_TONE_HZ, LOW_TONE_AMP = 220.0, 0.3
HIGH_TONE_HZ, HIGH_TONE_AMP = 1750.0, 0.2
NOISE_AMP, NOISE_PRIME, NOISE_PERIOD = 0.05, 7919, 1000
ROUND_DIGITS = 4
OUT_PATH = os.path.join(os.path.dirname(__file__), 'fixtures', 'kaldi_fbank_fixture.json')


def synth_signal():
    """Deterministic test signal; tools/test_kaldi_fbank.mjs uses the same formula."""
    n = np.arange(int(SAMPLE_RATE * DURATION_SEC))
    noise = ((n * NOISE_PRIME) % NOISE_PERIOD) / NOISE_PERIOD - 0.5
    x = (LOW_TONE_AMP * np.sin(2 * np.pi * LOW_TONE_HZ * n / SAMPLE_RATE)
         + HIGH_TONE_AMP * np.sin(2 * np.pi * HIGH_TONE_HZ * n / SAMPLE_RATE)
         + NOISE_AMP * noise)
    return x.astype(np.float32)


def main():
    opts = knf.FbankOptions()
    opts.frame_opts.dither = 0
    opts.frame_opts.snip_edges = False
    opts.frame_opts.samp_freq = SAMPLE_RATE
    opts.mel_opts.num_bins = 80
    opts.mel_opts.low_freq = 20
    opts.mel_opts.high_freq = -400
    fbank = knf.OnlineFbank(opts)
    fbank.accept_waveform(SAMPLE_RATE, synth_signal().tolist())
    fbank.input_finished()
    frames = [[round(float(v), ROUND_DIGITS) for v in fbank.get_frame(i)] for i in range(fbank.num_frames_ready)]
    with open(OUT_PATH, 'w', encoding='utf-8') as f:
        json.dump({'numFrames': len(frames), 'frames': frames}, f, separators=(',', ':'))
    print(f'Wrote {len(frames)} frames to {OUT_PATH}')


if __name__ == '__main__':
    main()
