"""
Builds database/speech/capt_token_bank.json for the on-device pronunciation scorer.

The scorer uses the sherpa-onnx zipformer CTC model (byte-level BPE output). Tokenizing
Chinese needs sentencepiece, which does not run in the browser, so token ids are
precomputed here for:
  - every character used by the HSK vocabularies (target syllables), and
  - one representative character per toned pinyin syllable (minimal-pair competitors
    used to report the detected initial/final).

Usage: python3 tools/build_capt_tokens.py
"""
import glob
import hashlib
import json
import os
import urllib.request
from collections import Counter

import sentencepiece as spm
from pypinyin import Style, lazy_pinyin, pinyin

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
CACHE_DIR = os.path.join(ROOT, 'tools', '.capt_model_cache')
OUT_PATH = os.path.join(ROOT, 'database', 'speech', 'capt_token_bank.json')
VOCAB_GLOB = os.path.join(ROOT, 'database', 'vocabs', 'hsk*_vocabularies.json')

MODEL_REPO = 'csukuangfj/sherpa-onnx-zipformer-ctc-small-zh-int8-2025-07-16'
MODEL_BASE_URL = f'https://huggingface.co/{MODEL_REPO}/resolve/main'
MODEL_FILE = 'model.int8.onnx'
BPE_FILE = 'bbpe.model'
VOCAB_SIZE = 1000

# fairseq/icefall byte-level BPE alphabet: byte b -> chr(table[b]), stored as code-point ranges.
BYTE_TABLE_RANGES = [[256, 287], [32, 126], [288, 305], [308, 318], [321, 328], [330, 382], [384, 422]]
HASH_CHUNK_BYTES = 1 << 20
CJK_FIRST, CJK_LAST = '一', '鿿'
NEUTRAL_TONE = '5'


def byte_table():
    table = [c for lo, hi in BYTE_TABLE_RANGES for c in range(lo, hi + 1)]
    assert len(table) == 256, len(table)
    return table


def fetch(name):
    os.makedirs(CACHE_DIR, exist_ok=True)
    path = os.path.join(CACHE_DIR, name)
    if not os.path.exists(path):
        print(f'Downloading {name} ...')
        urllib.request.urlretrieve(f'{MODEL_BASE_URL}/{name}', path)
    return path


def sha256(path):
    h = hashlib.sha256()
    with open(path, 'rb') as f:
        for chunk in iter(lambda: f.read(HASH_CHUNK_BYTES), b''):
            h.update(chunk)
    return h.hexdigest()


def is_cjk(c):
    return CJK_FIRST <= c <= CJK_LAST


def toned_syllable(c):
    """'中' -> 'zhong1' (pypinyin TONE3 with neutral tone 5, ü as v)."""
    s = lazy_pinyin(c, style=Style.TONE3, neutral_tone_with_five=True, v_to_u=False)[0]
    return s if s and s[-1].isdigit() else s + NEUTRAL_TONE


def is_polyphone(c):
    return len(pinyin(c, heteronym=True)[0]) > 1


def main():
    table = byte_table()
    sp = spm.SentencePieceProcessor(model_file=fetch(BPE_FILE))
    assert sp.get_piece_size() == VOCAB_SIZE, sp.get_piece_size()

    def encode(c):
        return sp.encode(''.join(chr(table[b]) for b in c.encode('utf-8')))

    freq = Counter()
    for path in sorted(glob.glob(VOCAB_GLOB)):
        with open(path, encoding='utf-8') as f:
            for item in json.load(f):
                freq.update(c for c in item.get('hanzi', '') if is_cjk(c))

    chars = {c: encode(c) for c in sorted(freq)}

    # Representative per toned syllable: most frequent single-reading character.
    by_syllable = {}
    for c, n in freq.most_common():
        syl = toned_syllable(c)
        rank = (is_polyphone(c), -n)
        if syl not in by_syllable or rank < by_syllable[syl][0]:
            by_syllable[syl] = (rank, c)
    syllables = {syl: {'c': c, 't': chars[c]} for syl, (_, c) in sorted(by_syllable.items())}

    bank = {
        'model': {
            'repo': MODEL_REPO,
            'url': f'{MODEL_BASE_URL}/{MODEL_FILE}',
            'sha256': sha256(fetch(MODEL_FILE)),
            'sizeBytes': os.path.getsize(fetch(MODEL_FILE)),
            'vocabSize': VOCAB_SIZE,
        },
        'byteTableRanges': BYTE_TABLE_RANGES,
        'pieces': [sp.id_to_piece(i) for i in range(VOCAB_SIZE)],
        'chars': chars,
        'syllables': syllables,
    }
    os.makedirs(os.path.dirname(OUT_PATH), exist_ok=True)
    with open(OUT_PATH, 'w', encoding='utf-8') as f:
        json.dump(bank, f, ensure_ascii=False, separators=(',', ':'))
    print(f'Wrote {len(chars)} chars, {len(syllables)} syllables -> {OUT_PATH} ({os.path.getsize(OUT_PATH) // 1024} KB)')


if __name__ == '__main__':
    main()
