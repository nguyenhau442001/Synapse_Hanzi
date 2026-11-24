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

## Clean Code & Modern Engineering

- Follow modern best practices: write clean, modular code and extract strings/magic numbers into centralized constants (single source of truth).
- All `title`, `aria-label`, and text strings MUST use named constants/variables, never hardcoded loose strings.
- Break multiple JSX attributes into separate lines (multiline JSX) for readability.
- Always evaluate trade-offs (pros, cons, maintainability) and avoid antiquated or obsolete legacy workarounds.

## Architecture-First Workflow

Always follow the 3-step feature development:
1. **Architectural Consulting**: Analyze data flow and component states; propose at least 2 architectural options with pros/cons before writing code.
2. **Interface & Contract First**: Define and explain TypeScript/JSDoc data structures before implementing logic.
3. **Incremental Implementation & Diff**: Scope edits to single components/modules and explain any non-trivial logic clearly.

## Final summary

- After finishing a task, summarize the result in **at most 3 lines** (overrides the longer summary format in AGENTS.md).
