#!/usr/bin/env python3
"""Stage 1 Illustration Audit: Local structural heuristic scanner.

Scans all HSK 2.0 and HSK 3.0 SVG illustrations indexed in
images/generated_manifest.json and produces database/audit/illustration_audit.json
with per-word structural metrics, duplicate-hash detection, and priority tiers.
"""

import argparse
import hashlib
import json
import re
from collections import Counter
from pathlib import Path

MANIFEST_PATH = Path("images/generated_manifest.json")
DEFAULT_OUTPUT_PATH = Path("database/audit/illustration_audit.json")
SCHEMA_VERSION = "1.0.0"

# Priority tiers based on HSK level numbers
TIER_1_LEVELS = {"level1", "level2"}
TIER_2_LEVELS = {"level3", "level4"}

# Heuristic thresholds (named constants, no magic numbers)
LOW_COMPLEXITY_THRESHOLD = 4
EDITORIAL_MARKER = 'data-style="editorial"'

PRIMITIVE_TAG_RE = re.compile(
    r"<(?:path|circle|rect|ellipse|polygon|polyline|line)\b", re.IGNORECASE
)
TEXT_TAG_RE = re.compile(r"<(?:text|tspan)\b", re.IGNORECASE)
LEVEL_NUM_RE = re.compile(r"level(\d+)")


def compute_priority_tier(levels_hsk2: list[str], levels_hsk3: list[str]) -> int:
    """Assign priority tier: 1 (HSK 1-2), 2 (HSK 3-4), 3 (HSK 5-9)."""
    all_levels = set(levels_hsk2) | set(levels_hsk3)
    if all_levels & TIER_1_LEVELS:
        return 1
    if all_levels & TIER_2_LEVELS:
        return 2
    return 3


def select_primary_path(paths: list[str], fallback_src: str) -> str:
    """Prefer lowest-level HSK_3.0 path as canonical; fall back to manifest src."""
    hsk3_paths = [p for p in paths if "HSK_3.0/" in p]
    if hsk3_paths:
        def level_key(path: str) -> int:
            match = LEVEL_NUM_RE.search(path)
            return int(match.group(1)) if match else 99

        return min(hsk3_paths, key=level_key)
    return fallback_src


def inspect_svg_file(svg_path: Path) -> dict:
    """Extract raw structural metrics from a single SVG file."""
    raw_bytes = svg_path.read_bytes()
    content = raw_bytes.decode("utf-8", errors="replace")
    return {
        "svg_md5": hashlib.md5(raw_bytes).hexdigest(),
        "style": "editorial" if EDITORIAL_MARKER in content else "legacy",
        "primitive_count": len(PRIMITIVE_TAG_RE.findall(content)),
        "byte_size": len(raw_bytes),
        "has_text_tag": bool(TEXT_TAG_RE.search(content)),
    }


def build_audit_records(manifest: dict) -> tuple[list[dict], dict]:
    """Build Stage 1 WordAuditRecord list and summary from manifest."""
    entries = manifest.get("manifest", manifest)
    preliminary: list[dict] = []
    hash_counts: Counter[str] = Counter()

    for hanzi, meta in entries.items():
        candidate_paths = [meta.get("src", "")] + list(meta.get("alt_srcs", []))
        existing_paths = [p for p in dict.fromkeys(candidate_paths) if p and Path(p).is_file()]
        if not existing_paths:
            continue

        primary_path = select_primary_path(existing_paths, meta.get("src", existing_paths[0]))
        if not Path(primary_path).is_file():
            primary_path = existing_paths[0]

        metrics = inspect_svg_file(Path(primary_path))
        hash_counts[metrics["svg_md5"]] += 1

        preliminary.append({
            "hanzi": hanzi,
            "meaning": meta.get("meaning", ""),
            "example_zh": meta.get("example_zh", ""),
            "priority_tier": compute_priority_tier(
                meta.get("levels_hsk2", []), meta.get("levels_hsk3", [])
            ),
            "paths": existing_paths,
            "primary_path": primary_path,
            "metrics": metrics,
        })

    records: list[dict] = []
    flagged_count = 0

    for item in preliminary:
        metrics = item.pop("metrics")
        dup_count = max(0, hash_counts[metrics["svg_md5"]] - 1)
        flags: list[str] = []
        if dup_count > 0:
            flags.append("SHARED_HASH")
        if metrics["primitive_count"] <= LOW_COMPLEXITY_THRESHOLD:
            flags.append("LOW_COMPLEXITY")
        if metrics["style"] == "legacy":
            flags.append("LEGACY_STYLE")
        if metrics["has_text_tag"]:
            flags.append("HAS_TEXT")

        if flags:
            flagged_count += 1

        item["heuristics"] = {
            "svg_md5": metrics["svg_md5"],
            "duplicate_words_count": dup_count,
            "style": metrics["style"],
            "primitive_count": metrics["primitive_count"],
            "byte_size": metrics["byte_size"],
            "has_text_tag": metrics["has_text_tag"],
            "heuristic_flags": flags,
        }
        item["status"] = "pending"
        records.append(item)

    records.sort(key=lambda r: (r["priority_tier"], -len(r["heuristics"]["heuristic_flags"]), r["hanzi"]))

    summary = {
        "version": SCHEMA_VERSION,
        "total_unique_words": len(records),
        "stage1_flagged_count": flagged_count,
        "stage2_audited_count": 0,
        "needs_regen_count": 0,
        "regenerated_count": 0,
    }
    return records, summary


def print_stage1_report(records: list[dict], summary: dict) -> None:
    """Print concise Stage 1 diagnostic breakdown to stdout."""
    flag_counts: Counter[str] = Counter()
    tier_counts: Counter[int] = Counter()
    tier_flagged: Counter[int] = Counter()

    for rec in records:
        tier = rec["priority_tier"]
        tier_counts[tier] += 1
        flags = rec["heuristics"]["heuristic_flags"]
        if flags:
            tier_flagged[tier] += 1
        for flag in flags:
            flag_counts[flag] += 1

    print(f"Total unique words scanned: {summary['total_unique_words']}")
    print(f"Stage 1 flagged words:      {summary['stage1_flagged_count']}")
    print("\nBy Priority Tier:")
    for tier in sorted(tier_counts):
        print(f"  Tier {tier}: {tier_counts[tier]} words ({tier_flagged[tier]} flagged)")
    print("\nBy Heuristic Flag:")
    for flag, count in flag_counts.most_common():
        print(f"  {flag}: {count}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Stage 1 HSK Illustration Heuristic Audit")
    parser.add_argument("--manifest", type=Path, default=MANIFEST_PATH)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT_PATH)
    args = parser.parse_args()

    manifest = json.loads(args.manifest.read_text(encoding="utf-8"))
    records, summary = build_audit_records(manifest)

    args.output.parent.mkdir(parents=True, exist_ok=True)
    payload = {"summary": summary, "records": records}
    args.output.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")

    print_stage1_report(records, summary)
    print(f"\nSaved audit report to {args.output}")


if __name__ == "__main__":
    main()
