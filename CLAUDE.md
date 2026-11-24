# CLAUDE.md

Read and follow all project rules in AGENTS.md:

@AGENTS.md

## Always commit and push after each task

- After every finished task: run tests/checks, then `git commit` directly on `main` and `git push origin HEAD:main`.
- Do not wait for the user to ask; a task is not done until it is committed and pushed.
- Use small, focused conventional commit messages (`feat: ...`, `fix: ...`, `docs: ...`).
- If tests or checks fail, fix them first, or report the failure instead of pushing broken code.

## Prebuilt Audio Standard

- Always generate prebuilt Mandarin audio using **Microsoft Edge Neural TTS** (`zh-CN-XiaoxiaoNeural`).
- Never fall back to Web Speech API in client code; prebuilt studio audio is the sole standard.
- Audio files must be 24kHz Mono, 64kbps MP3 normalized with ffmpeg EBU R128 (`loudnorm=I=-18:TP=-2:LRA=7`).
- Keep level manifests and `database/prebuilt_audio/hanzi_audio_map.json` synchronized.

## Anti-Reinvention & Modern Tooling

- Do not hand-roll custom infrastructure (e.g. routers, complex manual state stores, raw SVGs) when established libraries exist.
- Use standard icon sets (e.g., `lucide-preact`) and modern modular UI rather than growing monolithic CSS.

## Final summary

- After finishing a task, summarize the result in **at most 3 lines** (overrides the longer summary format in AGENTS.md).
