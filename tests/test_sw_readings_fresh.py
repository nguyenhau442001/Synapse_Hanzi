#!/usr/bin/env python3
"""Service worker must not serve stale reading/manga JSON after a deploy."""

import re
from pathlib import Path

SW = (Path(__file__).resolve().parent.parent / "sw.js").read_text(encoding="utf-8")


def test_readings_are_network_first():
    assert "READINGS_PATH" in SW
    block = SW[SW.index("url.pathname.startsWith(READINGS_PATH)"):]
    block = block[: block.index("return;\n  }")]
    # Network is tried before the cache; the cache is only an offline fallback.
    assert block.index("fetch(request") < block.index("cache.match(")
    assert "catch" in block


def test_readings_rule_precedes_generic_data_rule():
    assert SW.index("startsWith(READINGS_PATH)") < SW.index("startsWith(DATA_PATH)")


def test_data_cache_bumped_to_evict_stale_copies():
    version = int(re.search(r"hsk-data-v(\d+)", SW).group(1))
    assert version >= 18
