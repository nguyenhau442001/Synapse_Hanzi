#!/usr/bin/env python3
"""
tools/fill_reading_meanings.py - give every reading token a Vietnamese meaning.

Walks every JSON file under database/readings and fills `meaning_vi` on word
tokens (lists named `tokens` / `word_hotspots`) that contain Chinese characters
but have no meaning yet. Lookup order:

  1. meanings already used for the same word elsewhere in the readings
  2. the HSK 2.0 / HSK 3.0 decks, the memory-game bank and the manga glossary
  3. a draft machine translation (Google Translate web endpoint), cached in
     database/readings/meanings_vi_cache.json so reruns stay offline
  4. the Hán-Việt reading as a last resort

Usage:
    python3 tools/fill_reading_meanings.py            # translate + fill
    python3 tools/fill_reading_meanings.py --offline  # fill from cache/dicts only
    python3 tools/fill_reading_meanings.py --check    # exit 1 if a token lacks a meaning
"""

import argparse
import json
import re
import sys
import time
from pathlib import Path
from urllib.parse import urlencode
from urllib.request import Request, urlopen

REPO_ROOT = Path(__file__).resolve().parent.parent
READINGS_DIR = REPO_ROOT / 'database' / 'readings'
VOCAB_DIR = REPO_ROOT / 'database' / 'vocabs'
CACHE_FILE = READINGS_DIR / 'meanings_vi_cache.json'
GLOSSARY_FILE = READINGS_DIR / 'manga' / 'glossary_vi.json'
HANVIET_JS = REPO_ROOT / 'assets' / 'js' / 'hanviet-dict.js'
TOKEN_LIST_KEYS = ('tokens', 'word_hotspots')
CJK_RE = re.compile(r'[㐀-鿿]')
HOMONYM_MARK_RE = re.compile(r'[⁰¹²³⁴⁵⁶⁷⁸⁹]+$')
ENDPOINT = 'https://translate.googleapis.com/translate_a/single?client=gtx&sl=zh-CN&tl=vi&dt=t&'
BATCH_SIZE = 40


def load_json(path):
    return json.loads(path.read_text(encoding='utf-8'))


def reading_files():
    return sorted(p for p in READINGS_DIR.rglob('*.json')
                  if p.name not in ('manifest.json', CACHE_FILE.name, GLOSSARY_FILE.name))


def iter_tokens(node):
    """Yield every word-token dict inside a reading document."""
    if isinstance(node, dict):
        for key, value in node.items():
            if key in TOKEN_LIST_KEYS and isinstance(value, list):
                for tok in value:
                    if isinstance(tok, dict) and 'text' in tok:
                        yield tok
            else:
                yield from iter_tokens(value)
    elif isinstance(node, list):
        for item in node:
            yield from iter_tokens(item)


def needs_meaning(tok):
    return not tok.get('punct') and bool(CJK_RE.search(tok.get('text') or '')) and not (tok.get('meaning_vi') or '').strip()


def needs_upgrade(tok):
    if tok.get('punct') or not bool(CJK_RE.search(tok.get('text') or '')):
        return False
    mvi = (tok.get('meaning_vi') or '').strip().lower()
    hv = (tok.get('hanviet') or '').strip().lower()
    return not mvi or (bool(hv) and mvi == hv)


def build_dictionary(docs):
    lex = {}

    def add(word, meaning):
        word = HOMONYM_MARK_RE.sub('', (word or '').strip())
        meaning = (meaning or '').strip()
        if word and meaning and not CJK_RE.search(meaning) and word not in lex:
            lex[word] = meaning

    for doc in docs.values():
        for tok in iter_tokens(doc):
            mvi = (tok.get('meaning_vi') or '').strip()
            hv = (tok.get('hanviet') or '').strip()
            if mvi and (not hv or mvi.lower() != hv.lower()):
                add(tok.get('text'), mvi)
    for lvl in range(1, 7):
        path = VOCAB_DIR / f'hsk{lvl}_vocabularies.json'
        if path.exists():
            for entry in load_json(path):
                add(entry.get('hanzi'), entry.get('meaning'))
    for lvl in range(1, 10):
        path = VOCAB_DIR / 'hsk3_0' / f'level{lvl}_vocabularies.json'
        if path.exists():
            for entry in load_json(path):
                add(entry.get('hanzi'), entry.get('meaning'))
    bank = VOCAB_DIR / 'memory_game_bank.json'
    if bank.exists():
        for entry in load_json(bank):
            add(entry.get('hanzi'), entry.get('meaning'))
    if GLOSSARY_FILE.exists():
        glossary = load_json(GLOSSARY_FILE)
        if isinstance(glossary, dict):
            for word, value in glossary.items():
                add(word, value.get('meaning_vi') if isinstance(value, dict) else value)
    return lex


def load_hanviet():
    text = HANVIET_JS.read_text(encoding='utf-8')
    tables = {}
    for name in ('HANVIET_COMPOUNDS', 'HANVIET_CHARS'):
        match = re.search(rf'const {name} = (\{{.*?\}});', text, re.S)
        tables[name] = json.loads(match.group(1)) if match else {}
    return tables['HANVIET_COMPOUNDS'], tables['HANVIET_CHARS']


def hanviet_of(word, compounds, chars):
    if word in compounds:
        return compounds[word]
    return ' '.join(chars.get(ch, ch) for ch in word).strip()


def clean_translation(word, line):
    line = re.sub(r'^(?:ý nghĩa của(?: việc)?\s+)', '', (line or '').strip(), flags=re.IGNORECASE)
    line = line.strip(' .。')
    if not line or CJK_RE.search(line) or line == word:
        return ''
    return line


def translate(words, cache):
    pending = [w for w in words if w not in cache]
    print(f'Translating {len(pending)} words not yet cached', flush=True)
    for offset in range(0, len(pending), BATCH_SIZE):
        batch = pending[offset:offset + BATCH_SIZE]
        url = ENDPOINT + urlencode({'q': '\n'.join(batch)})
        for attempt in range(4):
            try:
                req = Request(url, headers={'User-Agent': 'Mozilla/5.0'})
                payload = json.loads(urlopen(req, timeout=30).read().decode('utf-8'))
                text = ''.join(part[0] for part in payload[0] if part and isinstance(part[0], str))
                lines = [line.strip() for line in text.splitlines()]
                if len(lines) != len(batch):
                    raise ValueError(f'expected {len(batch)} lines, got {len(lines)}')
                for word, line in zip(batch, lines):
                    cache[word] = clean_translation(word, line)
                break
            except Exception as exc:  # network hiccup or line mismatch
                if attempt == 3:
                    if len(batch) > 1:
                        # Fall back to one-by-one so a single odd word cannot block a batch
                        for word in batch:
                            translate([word], cache)
                    else:
                        print(f'  failed: {batch[0]} ({exc})', flush=True)
                        cache[batch[0]] = ''
                    break
                time.sleep(1.5 * (attempt + 1))
        done = offset // BATCH_SIZE + 1
        if done % 25 == 0 or offset + BATCH_SIZE >= len(pending):
            save_cache(cache)
            print(f'  {min(offset + BATCH_SIZE, len(pending))}/{len(pending)}', flush=True)
        time.sleep(0.2)
    save_cache(cache)


def save_cache(cache):
    CACHE_FILE.write_text(json.dumps(dict(sorted(cache.items())), ensure_ascii=False, indent=1) + '\n', encoding='utf-8')


def dump_like(raw, doc):
    if raw.lstrip().startswith('{\n') or raw.lstrip().startswith('[\n'):
        out = json.dumps(doc, ensure_ascii=False, indent=2)
    else:
        out = json.dumps(doc, ensure_ascii=False, separators=(',', ':'))
    return out + ('\n' if raw.endswith('\n') else '')


def main():
    parser = argparse.ArgumentParser(description='Fill missing Vietnamese meanings on reading tokens.')
    parser.add_argument('--offline', action='store_true', help='do not call the translation endpoint')
    parser.add_argument('--check', action='store_true', help='only report tokens without a meaning')
    args = parser.parse_args()

    raws = {p: p.read_text(encoding='utf-8') for p in reading_files()}
    docs = {p: json.loads(raw) for p, raw in raws.items()}

    if args.check:
        missing = sum(1 for doc in docs.values() for tok in iter_tokens(doc) if needs_meaning(tok))
        print(f'{missing} reading tokens without meaning_vi')
        return 1 if missing else 0

    lex = build_dictionary(docs)
    cache = load_json(CACHE_FILE) if CACHE_FILE.exists() else {}
    unknown = sorted({tok['text'] for doc in docs.values() for tok in iter_tokens(doc)
                      if needs_meaning(tok) and tok['text'] not in lex})
    if unknown and not args.offline:
        translate(unknown, cache)

    compounds, chars = load_hanviet()
    filled = fallback = changed_files = 0
    for path, doc in docs.items():
        changed = False
        for tok in iter_tokens(doc):
            if not needs_upgrade(tok):
                continue
            word = tok['text']
            meaning = lex.get(word) or cache.get(word)
            if not meaning:
                if tok.get('meaning_vi'):
                    continue
                meaning = tok.get('hanviet') or hanviet_of(word, compounds, chars)
                fallback += 1
            if tok.get('meaning_vi') != meaning:
                tok['meaning_vi'] = meaning
                filled += 1
                changed = True
        if changed:
            path.write_text(dump_like(raws[path], doc), encoding='utf-8')
            changed_files += 1
    print(f'Filled {filled} tokens in {changed_files} files ({fallback} via Hán-Việt fallback)')
    return 0


if __name__ == '__main__':
    sys.exit(main())
