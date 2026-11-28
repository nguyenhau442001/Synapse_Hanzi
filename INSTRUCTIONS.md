# Project Instructions - HSK Flashcards Generator

> **Single Source of Truth**: `INSTRUCTIONS.md` is the shared instruction file for all AI coding agents. `AGENTS.md` (Antigravity) and `CLAUDE.md` (Claude Code) only include this file — never duplicate rules across `AGENTS.md` and `CLAUDE.md`.

## Git Workflow Rules

- Work directly on the existing `main` branch.
- Do not create new branches unless I explicitly ask.
- Do not create pull requests unless I explicitly ask.
- Do not merge branches unless I explicitly ask.
- Do not rename branches or change remote settings.
- Do not run GitHub PR workflows.

## Commit & Push Rules

- When done with a task, run tests and checks, commit directly on `main`, and push up (`git push origin HEAD:main`).
- Do not wait for the user to ask; a task is not done until it is committed and pushed.
- If tests or checks fail, fix them first, or report the failure instead of pushing broken code.
- Keep commits small, focused, and meaningful.
- Use clear conventional commit messages (e.g. `feat: ...`, `fix: ...`, `docs: ...`).

## Semantic Versioning (SemVer) & Release Rules

Bắt buộc tuân thủ chuẩn phiên bản **`x.x.x` (Semantic Versioning)** cho mọi lần phát hành/cập nhật:
- Định dạng: `MAJOR.MINOR.PATCH` (gắn git tag `vX.Y.Z`).
  - **MAJOR (x.0.0)**: Phá vỡ tương thích ngược (breaking changes), tái cấu trúc kiến trúc cốt lõi hoặc đại tu giao diện hoàn toàn.
  - **MINOR (0.x.0)**: Thêm tính năng mới, bài tập/màn hình/công cụ mới mà không phá vỡ tính năng cũ (`feat: ...`).
  - **PATCH (0.0.x)**: Sửa lỗi (`fix: ...`), cải thiện hiệu năng (`perf: ...`), tinh chỉnh UI/UX nhỏ hoặc sửa audio (`fix`, `style`, `refactor`).

### Đồng bộ phiên bản khi phát hành
`VERSION` là nguồn duy nhất. Không sửa tay số phiên bản ở bất kỳ file nào khác — luôn chạy:
`python3 tools/bump_version.py [patch|minor|major|X.Y.Z]`
Script ghi đồng bộ vào `package.json`, `APP_VERSION` trong `sw.js` và `assets/js/utils.js`, mọi cache-buster `?v=` trong `index.html` / `assets/flashcards.css`, và badge footer.
Khi thêm file CSS/JS mới vào `index.html`, dùng `?v=<version hiện tại>` (script sẽ tự cập nhật về sau); trong JS dùng `'?v=' + APP_VERSION`.

### Quy trình đánh dấu Release & Git Tag
Sau khi kiểm tra và commit lên `main`:
1. Tạo annotated git tag với **ghi chú chi tiết về các thay đổi (detailed release notes)**:
   - **BẮT BUỘC viết 100% bằng tiếng Anh (English only)**: Tuyệt đối không dùng tiếng Việt, không pha trộn nửa Anh nửa Việt (no bilingual mixing).
   - **BẮT BUỘC note kỹ những gì đã thay đổi trong tag đó**: Tuyệt đối không ghi tag message chung chung (như chỉ ghi cụt ngủn `"Release vX.Y.Z"` hay `"update"`).
   - Nội dung tag message phải gồm:
     - Dòng tiêu đề tóm tắt ngắn gọn mục tiêu phát hành bằng tiếng Anh.
     - Danh sách gạch đầu dòng mô tả cụ thể từng thay đổi hoàn toàn bằng tiếng Anh: tính năng mới, lỗi đã sửa, cải tiến UI/UX, logic hoặc module bị ảnh hưởng.
   ```bash
   git tag -a vX.Y.Z -m "Release vX.Y.Z: <Concise summary in English>" \
     -m "- <Detailed change 1: new feature / fix in English>
   - <Detailed change 2: UI/UX improvement / styling in English>
   - <Detailed change 3: data logic / test coverage in English>"
   ```
2. Đẩy commit và git tag lên GitHub:
   ```bash
   git push origin HEAD:main
   git push origin vX.Y.Z
   ```

## Dangerous Git Commands

Before running any of these commands, stop and ask me first:

- `git reset`
- `git rebase`
- `git clean`
- `git checkout`
- `git restore`
- `git push --force`
- any command that may delete files, rewrite history, or discard local changes

## Development Style

- Make changes directly in the current working tree.
- Keep edits simple and incremental.
- Do not rewrite the whole project unless I explicitly ask.
- Follow the existing code style and file structure.
- After finishing:
  - run tests or checks
  - commit and push to `main`
  - keep final summary extremely brief (1-2 sentences max, at most 3 lines). Do not write lengthy or verbose summaries.

## Code & Language Style

- **English Only for Code & Comments**: All code, function/variable names, docstrings, inline comments, CLI help, and console logs MUST be written 100% in English. No Vietnamese or bilingual mixing in code files.
- **Human-In-The-Loop (HITL) Approval**: Always present the diff/code plan first, trigger interactive clickable approval options (pop-up buttons) and wait for user selection before modifying files on disk.
- **Concise, High-Signal Communication**: Be extremely concise. Focus strictly on key points, architecture choices, and diffs. Never write lengthy, wordy, or repetitive prose.

## Architecture-First Workflow (Strict 3-Step Development)

When designing or implementing new features/components, agents MUST strictly follow this 3-step workflow:

1. **Step 1: Architectural Consulting (No Immediate Coding)**
   - Do NOT rush into writing code immediately.
   - First, analyze the architecture: where data is stored, which component manages state, and data flow from UI to storage/DB.
   - Present at least 2 architectural options with explicit trade-offs (pros, cons, performance, maintainability) for the user to review and select.
2. **Step 2: Interface & Data Contract First**
   - Define clear data structures (TypeScript interfaces or JSDoc schemas) before implementing logic.
   - Explain the meaning and purpose of each field.
   - Ensure the user understands and signs off on the data contract before writing implementations.
3. **Step 3: Incremental Implementation & Diff Review**
   - Scope each step to only core logic or a single component at a time.
   - Explicitly explain any complex algorithms or non-trivial logic decisions (e.g., audio thresholds, formulas, state machines).
   - Review file diffs incrementally; never modify multiple unrelated files at once.

## Clean Code & Modern Engineering Principles

- **Best Practice & Clean Code**: Write clean, modular, and self-documenting code. Never scatter hardcoded magic strings or numbers across files; extract and centralize them into semantic constants (single source of truth).
- **Strictly No Magic Numbers**: Absolutely never use raw, unexplained numeric literals in logic (timeouts, animation durations, retry delays, audio thresholds, scoring penalties). All numbers MUST be declared as exported semantic constants (e.g., in `AppTimeouts.js` or dedicated domain constant modules).
- **Named Constants for Titles & Labels**: All user-facing strings, `title`, `aria-label`, and button tooltips MUST be declared as named constants/variables (e.g., from `UI_LABELS`), never left as loose hardcoded strings.
- **Readable Multiline JSX Formatting**: When a JSX/HTML tag has multiple attributes (e.g. `className`, `onClick`, `title`, `aria-label`, `ref`), format each attribute on its own separate line for maximum readability. Never cram multiple attributes into a long horizontal line.
- **Modern Standards Over Antiquated Patterns**: Always adopt modern, standard, declarative web patterns. Strictly avoid obsolete, fragile, or archaic legacy workarounds (e.g., avoid manual DOM surgery when declarative JSX/Signals can be used; avoid ad-hoc regex/string templates when proper components exist).
- **Trade-off Mindset**: Every technical decision must weigh long-term maintainability against short-term convenience. Never choose a quick hack over a sound architectural solution.

## Modern Tooling & Anti-Reinvention Rules

- **Avoid Reinventing the Wheel**: Do not hand-roll custom infrastructure from scratch (such as custom DOM routers, complex monolithic manual state engines, or raw inline SVGs) when standard, well-tested libraries exist.
- **Standardized UI & Icons**: Use standard icon sets (e.g., `lucide-preact`) instead of hand-coding raw SVG paths. For new UI components, favor modular, reusable components over bloating monolithic `assets/flashcards.css`.
- **Leverage Ecosystem Solutions**: Prefer battle-tested ecosystem solutions (e.g., standard IndexedDB wrappers like Dexie, lightweight state management like Preact Signals/Zustand, Vite PWA tools) instead of writing ad-hoc custom scripts, unless specifically required for domain-specific Mandarin speech/tone processing.

## Prebuilt Audio Standard

- Always generate prebuilt Mandarin audio using **Microsoft Edge Neural TTS** (`zh-CN-XiaoxiaoNeural`).
- Do not use Web Speech API in client code; prebuilt audio is the sole standard.
- Audio clips must be normalized using ffmpeg: 24kHz Mono, 64kbps MP3, silence trimming, and EBU R128 loudness normalization (`loudnorm=I=-18:TP=-2:LRA=7`).
- **Prioritize Complete Phrasing & Natural Pauses**: Always ensure proper Chinese punctuation and clause breaks (e.g. `，`, `：`, `他说，…`) in source text and TTS inputs so every syllable is articulated clearly without coarticulation slurring; never trim silence so aggressively that natural pauses or terminal finals are clipped.
- Keep level manifests and `database/prebuilt_audio/hanzi_audio_map.json` in sync after audio generation.

## Project Preference

This is a personal project. I prefer a simple single-branch workflow because I do not want to review pull requests for every small change. Read `INSTRUCTIONS.md` first and follow it strictly. This project uses only one branch: `main`.
