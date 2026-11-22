# HSK Prebuilt-Audio Generation Guide

## Frontier Gemini Flash TTS Workflow (HSK4 2.0 & All Levels)

The Gemini Frontier Flash TTS generator (`tools/generate_hsk_audio_gemini.py`) uses Google's latest `gemini-3.8-flash-tts` model to produce studio-grade Mandarin audio files with natural prosody and accurate tones. Audio is normalized and encoded to 24kHz MP3 via `ffmpeg`, and an atomic `manifest.json` is generated for the web app.

### Requirements

- Python 3.10+ (Standard library only; no extra pip packages required)
- `ffmpeg` installed on the system (e.g. `brew install ffmpeg`)
- Google AI API key (placed in `.api_key`, `GEMINI_API_KEY`, or passed via `--api-key`)

### Dry Run (Validate planned tasks)

```bash
python3 tools/generate_hsk_audio_gemini.py --level hsk4 --dry-run
```

### Generation Examples

Check current Gemini TTS daily quota status & reset schedule:

```bash
python3 tools/generate_hsk_audio_gemini.py --check-quota
```

Generate the first 10 rows of HSK4 on Free Tier (3 RPM with automatic 20.5s rate-limit delay):

```bash
python3 tools/generate_hsk_audio_gemini.py --level hsk4 --limit 10
```

Generate a specific batch of IDs with a custom voice (e.g. `Aoede`, `Kore`, `Puck`):

```bash
python3 tools/generate_hsk_audio_gemini.py --level hsk4 --ids 1,2,3,4,5 --voice Aoede
```

Generate using a paid / Tier 1 key with fast throughput (0.5s delay):

```bash
python3 tools/generate_hsk_audio_gemini.py --level hsk4 --fast
```

The script outputs to:
```text
database/prebuilt_audio/hsk4/
├── manifest.json
├── words/0001.mp3
└── examples/0001.mp3
```

---

## Microsoft Edge Neural TTS Prebuilt Audio (Current Standard)

The project standardizes on **Microsoft Edge Neural TTS** using `zh-CN-XiaoxiaoNeural` (24kHz Mono, 64kbps MP3 with EBU R128 loudness normalization and silence trimming).

To generate or update audio clips:

```bash
python3 tools/generate_hsk_audio_edge.py --level hsk1 --overwrite
python3 tools/generate_hsk_audio_edge.py --level hsk2 --overwrite
python3 tools/generate_hsk_audio_edge.py --level hsk3 --overwrite
python3 tools/generate_hsk_audio_edge.py --level hsk4 --overwrite
```

Manifests are automatically updated, and the global Hanzi audio map is synchronized via `tools/build_hanzi_audio_map.py`.

## Legacy Qwen workflow

The web app can use generated MP3 files for HSK1 and automatically fall back to
the Web Speech API when a clip or manifest entry is missing.

## 1. Validate the generation plan

This uses only the Python standard library:

```bash
python3 tools/generate_hsk_audio.py --level hsk1 --dry-run
```

HSK1 should report 150 rows and 300 planned clips.

## 2. Create an isolated Python 3.12 environment

The system Python may be newer than the versions supported by PyTorch/Qwen.
Using `uv` keeps the model runtime separate from the static app:

```bash
uv venv --python 3.12 .venv-qwen-tts
uv pip install --python .venv-qwen-tts/bin/python -r tools/requirements-tts.txt
```

On a CUDA machine, optionally install FlashAttention according to the Qwen3-TTS
documentation and add `--flash-attention` to the generation command.

## 3. Generate a small sample first

Generate the first five rows (ten clips):

```bash
.venv-qwen-tts/bin/python tools/generate_hsk_audio.py \
  --level hsk1 \
  --limit 5 \
  --device cuda:0
```

For a CPU smoke test, replace `cuda:0` with `cpu`. CPU and Apple Silicon MPS may
be substantially slower or encounter unsupported model operations; a CUDA machine
is the recommended path for the complete HSK1 batch.

The script writes:

```text
database/prebuilt_audio/hsk1/
├── manifest.json
├── words/0001.mp3
└── examples/0001.mp3
```

It does not overwrite valid MP3 files unless `--overwrite` is supplied. Re-run the
same command after an interruption to resume.

Qwen can vary its speaking cadence between generations. The pipeline keeps sampling
enabled, supplies the stored pinyin as a pronunciation guide, and validates output
duration against the expected syllable count. Greedy generation can be enabled with
`--deterministic`, but may choose an incorrect phoneme. Both clip kinds remain at
their native `1.0x` tempo; values can be changed with `--word-tempo` and
`--example-tempo`. Pause compaction is disabled
by default because aggressive silence removal can make Mandarin phrasing unnatural;
enable it only for a problematic batch with `--compact-example-pauses`.

Word and example clips receive dynamic instructions derived from their pinyin fields.
Use `--no-pinyin-guide` only for troubleshooting.

## 4. Test in the browser

```bash
python3 -m http.server 8000
```

Open `http://localhost:8000/flashcards.html`, select HSK1, and test both speaker
buttons. Entries in `manifest.json` use MP3; all other entries continue using Web
Speech fallback.

After the first five rows pass review, generate all 300 HSK1 clips:

```bash
.venv-qwen-tts/bin/python tools/generate_hsk_audio.py \
  --level hsk1 \
  --device cuda:0
```

Review isolated words against their pinyin before publishing, especially
polyphonic characters. To regenerate one range, use `--start-id` together with
`--overwrite`; without `--overwrite`, already generated clips remain untouched.
