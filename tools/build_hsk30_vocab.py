#!/usr/bin/env python3
"""Build the HSK 3.0 decks from the 2025 exam syllabus CSV.

The official syllabus data supplies the word, pinyin, part of speech, and
level. Vietnamese meanings are loaded from the local 2.0 decks where possible
and from a checked-in translation map for the remaining terms. Examples are
reused from the project's Vietnamese sentence bank when a matching sentence
is available; the card UI supports entries without examples.

Hand-reviewed meanings and example sentences in curated_vi.json take
precedence over both sources. Their example pinyin is generated here so the
Chinese text, pinyin, and expected_pinyin always stay aligned.
"""

import csv
import json
import re
import argparse
import time
from urllib.parse import urlencode
from urllib.request import Request, urlopen
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
VOCAB_DIR = ROOT / 'database/vocabs'
HSK30_DIR = VOCAB_DIR / 'hsk3_0'
SOURCE_CSV = HSK30_DIR / 'source_hsk_2025.csv'
TRANSLATIONS = HSK30_DIR / 'translations_vi.json'
CURATED = HSK30_DIR / 'curated_vi.json'
SENTENCE_BANK = VOCAB_DIR / 'sentence_bank.json'
OLD_LEVELS = [VOCAB_DIR / f'hsk{i}_vocabularies.json' for i in range(1, 7)]

LEVEL_NAMES = {
    '一级': 1,
    '二级': 2,
    '三级': 3,
    '四级': 4,
    '五级': 5,
    '六级': 6,
    '七-九级': 7,
}
POS_FULL = {
    '名': '名词', '动': '动词', '形': '形容词', '副': '副词', '代': '代词',
    '数': '数词', '量': '量词', '数量': '数量词', '介': '介词', '连': '连词',
    '助': '助词', '叹': '叹词', '拟声': '拟声词', '前缀': '前缀', '后缀': '后缀',
}
DISPLAY_DIGITS = str.maketrans('0123456789', '⁰¹²³⁴⁵⁶⁷⁸⁹')


def load_json(path):
    with path.open(encoding='utf-8') as file:
        return json.load(file)


def load_local_words():
    words = {}
    for path in OLD_LEVELS:
        for word in load_json(path):
            words.setdefault(word['hanzi'], word)
    return words


def load_examples():
    examples = defaultdict(list)
    for sentence in load_json(SENTENCE_BANK):
        tokens = sentence.get('zh_tokens') or []
        pinyin = sentence.get('pinyin_tokens') or []
        if len(tokens) != len(pinyin):
            continue
        for index, token in enumerate(tokens):
            examples[token].append((sentence, index))
    return examples


def clean_word(raw):
    """The syllabus uses trailing digits to distinguish senses; show them as superscripts."""
    match = re.fullmatch(r'(.+?)(\d+)', raw)
    return match.group(1) + match.group(2).translate(DISPLAY_DIGITS) if match else raw


def normalize_pinyin(value):
    tone_chars = {
        'ā': 'a1', 'á': 'a2', 'ǎ': 'a3', 'à': 'a4', 'ē': 'e1', 'é': 'e2', 'ě': 'e3', 'è': 'e4',
        'ī': 'i1', 'í': 'i2', 'ǐ': 'i3', 'ì': 'i4', 'ō': 'o1', 'ó': 'o2', 'ǒ': 'o3', 'ò': 'o4',
        'ū': 'u1', 'ú': 'u2', 'ǔ': 'u3', 'ù': 'u4', 'ǖ': 'ü1', 'ǘ': 'ü2', 'ǚ': 'ü3', 'ǜ': 'ü4',
    }
    return ''.join(tone_chars.get(char.lower(), char.lower()) for char in str(value)
                   if char not in " '\t\n’'/-")


def pinyin_matches(left, right):
    left_readings = {normalize_pinyin(part) for part in str(left).split('/')}
    right_readings = {normalize_pinyin(part) for part in str(right).split('/')}
    return bool(left_readings & right_readings)


def translation_key(row):
    canonical = re.sub(r'\d+$', '', row['word'])
    return '|'.join((canonical, row['pinyin'], translation_context(row.get('cixing', ''))))


def translation_context(raw_pos):
    parts = []
    for part in raw_pos.replace('（', '').replace('）', '').split('、'):
        name = POS_FULL.get(part.strip())
        if name and name not in parts:
            parts.append(name)
    return '、'.join(parts)


def syllabus_rows():
    with SOURCE_CSV.open(encoding='utf-8-sig', newline='') as file:
        return list(csv.DictReader(file))


def pronunciation_sets(rows):
    result = defaultdict(set)
    for row in rows:
        canonical = re.sub(r'\d+$', '', row['word'])
        for reading in row['pinyin'].split('/'):
            result[canonical].add(normalize_pinyin(reading))
    return result


def can_reuse_local_meaning(old_word, canonical, pinyin, readings):
    return bool(old_word.get('meaning')) and (
        pinyin_matches(old_word.get('pinyin', ''), pinyin) or len(readings.get(canonical, set())) <= 1
    )


def translate_missing():
    """Create draft Vietnamese meanings for terms without a local gloss."""
    translations = load_json(TRANSLATIONS) if TRANSLATIONS.exists() else {}
    local = load_local_words()
    rows = syllabus_rows()
    readings = pronunciation_sets(rows)
    pending = []
    seen = set()
    for row in rows:
        canonical = re.sub(r'\d+$', '', row['word'])
        key = translation_key(row)
        old = local.get(canonical, {})
        cached_meaning = translations.get(key, '')
        has_untranslated_hanzi = bool(re.search(r'[\u3400-\u9fff]', cached_meaning))
        if can_reuse_local_meaning(old, canonical, row['pinyin'], readings) or (cached_meaning and not has_untranslated_hanzi) or key in seen:
            continue
        seen.add(key)
        pending.append((key, canonical, translation_context(row['cixing']), has_untranslated_hanzi))

    # Google Translate's public web endpoint accepts a newline-separated batch
    # and preserves one translated line per source term. This is an offline
    # data-preparation step; the app itself never calls the service.
    endpoint = 'https://translate.googleapis.com/translate_a/single?client=gtx&sl=zh-CN&tl=vi&dt=t&'
    batch_size = 35
    for offset in range(0, len(pending), batch_size):
        batch = pending[offset:offset + batch_size]
        queries = [f'{word}的含义（{pos}）' if retry and pos else
                   f'{word}的含义' if retry else
                   f'{word}（{pos}）' if pos else word
                   for _, word, pos, retry in batch]
        url = endpoint + urlencode({'q': '\n'.join(queries)})
        for attempt in range(4):
            try:
                request = Request(url, headers={'User-Agent': 'Mozilla/5.0'})
                payload = json.loads(urlopen(request, timeout=30).read().decode('utf-8'))
                translated = ''.join(part[0] for part in payload[0] if part and isinstance(part[0], str))
                lines = [line.strip() for line in translated.splitlines()]
                if len(lines) != len(batch):
                    raise ValueError(f'expected {len(batch)} translated lines, got {len(lines)}')
                for (key, _, _, _), meaning in zip(batch, lines):
                    meaning = re.sub(r'^(?:ý nghĩa của(?: việc)?\s+)', '', meaning, flags=re.IGNORECASE)
                    translations[key] = meaning
                break
            except Exception:
                if attempt == 3:
                    raise
                time.sleep(1.5 * (attempt + 1))
        if (offset // batch_size + 1) % 20 == 0 or offset + batch_size >= len(pending):
            TRANSLATIONS.write_text(json.dumps(translations, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
            print(f'Translated {min(offset + batch_size, len(pending))}/{len(pending)} missing terms', flush=True)
        time.sleep(0.2)
    TRANSLATIONS.write_text(json.dumps(translations, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')


def highlighted_example(sentence, index):
    tokens = sentence['zh_tokens']
    pinyin_tokens = sentence['pinyin_tokens']
    zh = ''.join(f'<u>{token}</u>' if token_index == index else token for token_index, token in enumerate(tokens))
    py = ' '.join(f'<u>{token_py}</u>' if token_index == index else token_py
                  for token_index, token_py in enumerate(pinyin_tokens))
    return zh, py, sentence.get('meaning', '')


PUNCTUATION = {'，': ', ', '、': ', ', '。': '. ', '？': '? ', '！': '! ', '：': ': ', '；': '; ',
               '“': ' "', '”': '" ', '‘': " '", '’': "' ", '（': ' (', '）': ') ', '…': '… ', '—': ' — '}


TONE_BASES = str.maketrans('āáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜü', 'aaaaeeeeiiiioooouuuuvvvvv')
PROPER_NOUNS = {
    '中国', '汉语', '汉字', '中文', '英语', '英文', '法语', '日语', '北京', '上海', '广州', '香港', '台湾',
    '长城', '长江', '黄河', '春节', '中秋节', '国庆节', '端午节', '日本', '美国', '英国', '法国', '德国',
    '越南', '河内', '亚洲', '欧洲', '非洲', '中国人', '中华', '奥运会', '世界杯', '西安', '南京', '天津',
    '杭州', '深圳', '成都', '重庆', '西藏', '新疆', '云南', '四川', '广东', '山东', '海南', '黄山', '泰山',
    '故宫', '西湖', '东京', '首尔', '纽约', '伦敦', '巴黎', '韩国', '俄罗斯', '美洲',
    '天安门', '韩语', '越南语', '普通话', '元旦', '圣诞节',
}
_LEXICON = None


def word_syllables(hanzi, reading):
    """Split a word's tone-marked pinyin into one syllable per character, or None if it does not align."""
    from pypinyin import Style, lazy_pinyin

    bases = lazy_pinyin(hanzi, style=Style.NORMAL, v_to_u=False)
    letters = re.sub(r"[\s'’\-·]", '', reading).lower()
    if len(hanzi) > 1 and hanzi.endswith('儿') and letters.endswith('r') and not letters.translate(TONE_BASES).endswith('er'):
        bases[-1] = 'r'
    syllables, offset = [], 0
    for base in bases:
        chunk = letters[offset:offset + len(base)]
        if chunk.translate(TONE_BASES) != base.replace('ü', 'v'):
            return None
        syllables.append(chunk)
        offset += len(base)
    return syllables if offset == len(letters) else None


def lexicon():
    """Multi-character words with reviewed readings (neutral tones included) from the syllabus and 2.0 decks."""
    global _LEXICON
    if _LEXICON is None:
        import jieba
        import pypinyin

        jieba.setLogLevel(60)
        # The 2025 syllabus wins over the older decks; a word read two ways in one source is left to pypinyin.
        sources = [[(re.sub(r'\d+$', '', row['word']), row['pinyin']) for row in syllabus_rows()],
                   [(word['hanzi'], word['pinyin']) for word in load_local_words().values()]]
        _LEXICON = {}
        for entries in sources:
            readings = defaultdict(set)
            for hanzi, reading in entries:
                if len(hanzi) > 1 and hanzi not in _LEXICON and re.fullmatch(r'[\u3400-\u9fff]+', hanzi):
                    syllables = word_syllables(hanzi, reading.split('/')[0])
                    if syllables:
                        readings[hanzi].add(tuple(syllables))
            _LEXICON.update((hanzi, list(options.pop())) for hanzi, options in readings.items() if len(options) == 1)
        pypinyin.load_phrases_dict({hanzi: [[syllable] for syllable in syllables] for hanzi, syllables in _LEXICON.items()})
        for hanzi in _LEXICON:
            jieba.add_word(hanzi)
    return _LEXICON


NUMERALS = set('零一二三四五六七八九十百千万亿')


def split_known(token, known):
    """Forward maximum match a jieba token into known words; runs of numerals stay together (十八 shíbā)."""
    pieces, index = [], 0
    while index < len(token):
        if token[index] in NUMERALS:
            end = index
            while end < len(token) and token[end] in NUMERALS:
                end += 1
            if end - index > 1:
                pieces.append(token[index:end])
                index = end
                continue
        for size in range(min(4, len(token) - index), 0, -1):
            piece = token[index:index + size]
            if size == 1 or piece in known:
                pieces.append(piece)
                index += size
                break
    return pieces


def sentence_pinyin(text):
    """Word-separated pinyin for plain Chinese text; readings come from whole jieba tokens for context."""
    import jieba
    from pypinyin import Style, lazy_pinyin

    known = lexicon()
    parts = []
    previous = ''
    position = 0
    for token in jieba.lcut(text, HMM=False):
        following = text[position + len(token):position + len(token) + 1]
        position += len(token)
        if token in PUNCTUATION:
            parts.append(PUNCTUATION[token])
            previous = token
            continue
        if not re.search(r'[\u3400-\u9fff]', token):
            parts.append(' ' + token + ' ')
            continue
        syllables = lazy_pinyin(token, style=Style.TONE)
        offset = 0
        for piece in ([token] if token in known or token in PROPER_NOUNS else split_known(token, known)):
            piece_syllables = known.get(piece) or syllables[offset:offset + len(piece)]
            offset += len(piece)
            if piece in ('儿', '们') and parts and parts[-1].strip():
                # Erhua and the plural suffix belong to the previous word: 玩儿 wánr, 孩子们 háizimen.
                parts[-1] = parts[-1].rstrip() + ('r' if piece == '儿' else 'men') + ' '
                continue
            if len(piece) > 1 and piece.endswith('儿') and piece not in ('女儿', '婴儿', '幼儿', '儿子', '儿童'):
                piece_syllables = piece_syllables[:-1] + ['r']
            if piece == '得':
                piece_syllables = ['de']  # structural particle; the verb 得 děi is marked with a py override
            if piece == '地' and offset == len(token) and previous and re.search(r'[\u3400-\u9fff]$', previous) \
                    and previous[-1] not in '在到满一大土' and following not in '上下里面方区铁图点址':
                piece_syllables = ['de']  # adverbial particle: 慢慢地走
            if piece == '只' and previous[-1:] in NUMERALS | set('两几这那每哪'):
                piece_syllables = ['zhī']  # measure word: 两只猫
            word = piece_syllables[0] + ''.join("'" + syllable if syllable[:1] in 'aāáǎàoōóǒòeēéěè' else syllable
                                                 for syllable in piece_syllables[1:])
            if piece in PROPER_NOUNS:
                word = word[:1].upper() + word[1:]
            parts.append(' ' + word + ' ')
            previous = piece
    return ''.join(parts)


def curated_example(marked_zh, marked_vi, word_pinyin, marked_py=None):
    """Build example fields from a curated sentence whose target word is wrapped in <u>…</u>."""
    from normalize_expected_pinyin import normalize_expected_pinyin

    match = re.fullmatch(r'(.*?)<u>(.+?)</u>(.*)', marked_zh)
    if not match:
        raise ValueError(f'Curated example must mark the target word: {marked_zh!r}')
    before, _, after = match.groups()
    target = word_pinyin.split('/')[0].strip()
    py = marked_py or sentence_pinyin(before) + f' <u>{target}</u> ' + sentence_pinyin(after)
    py = re.sub(r'\s+', ' ', py).strip()
    py = re.sub(r'\s+([,.?!:;"\')…])(?=\s|$)', r'\1', py)
    py = re.sub(r'([("\'])\s+', r'\1', py)
    # Capitalize the first letter of the example and of each sentence inside it.
    py = re.sub(r'(^|[.!?] )(<u>)?([^\W\d_])', lambda m: m.group(1) + (m.group(2) or '') + m.group(3).upper(), py)
    try:
        expected = normalize_expected_pinyin(marked_zh, py)
    except ValueError:
        expected = ''
    return marked_zh, py, marked_vi, expected


def build():
    translations = load_json(TRANSLATIONS)
    curated = load_json(CURATED) if CURATED.exists() else {}
    local = load_local_words()
    examples = load_examples()
    rows = syllabus_rows()
    readings = pronunciation_sets(rows)
    groups = defaultdict(list)
    curated_applied = 0
    for row in rows:
        raw_level = row['levelName'].split('（', 1)[0]
        level = LEVEL_NAMES.get(raw_level)
        if level is None:
            raise ValueError(f"Unknown HSK level label: {row['levelName']}")

        hanzi = clean_word(row['word'])
        canonical = re.sub(r'\d+$', '', row['word'])
        old = local.get(canonical, {})
        old_matches_pronunciation = pinyin_matches(old.get('pinyin', ''), row['pinyin'])
        old_meaning_is_safe = can_reuse_local_meaning(old, canonical, row['pinyin'], readings)
        review = curated.get(f"{row['word']}|{row['pinyin']}", {})
        curated_applied += bool(review)
        fallback_meaning = translations.get(translation_key(row), '') or translations.get(canonical, '')
        fallback_meaning = re.sub(r'\s*\((?:danh|động|tính|phó|trạng|liên|giới|trợ|thán) từ(?:,\s*(?:danh|động|tính|phó|trạng|liên|giới|trợ|thán) từ)*\)$', '', fallback_meaning)
        meaning = review.get('meaning') or (old.get('meaning') if old_meaning_is_safe else '') or fallback_meaning
        if not meaning:
            raise ValueError(f'Missing Vietnamese meaning for {canonical!r}')
        meaning = meaning.strip()
        if meaning:
            meaning = meaning[:1].lower() + meaning[1:]

        example_zh = old.get('example_zh', '') if old_matches_pronunciation else ''
        example_py = old.get('example_py', '') if old_matches_pronunciation else ''
        example_vi = old.get('example_vi', '') if old_matches_pronunciation else ''
        expected_pinyin = old.get('expected_pinyin', '') if old_matches_pronunciation else ''
        if review.get('zh'):
            example_zh, example_py, example_vi, expected_pinyin = curated_example(review['zh'], review['vi'], row['pinyin'], review.get('py'))
        if not example_zh:
            candidate = next((candidate for candidate in examples.get(canonical, [])
                              if pinyin_matches(candidate[0]['pinyin_tokens'][candidate[1]], row['pinyin'])), None)
            if candidate:
                example_zh, example_py, example_vi = highlighted_example(*candidate)

        entry = {
            'id': len(groups[level]) + 1,
            '_source_key': (canonical, row['pinyin']),
            'hanzi': hanzi,
            'pinyin': row['pinyin'],
            'meaning': meaning,
            'example_zh': example_zh,
            'example_py': example_py,
            'expected_pinyin': expected_pinyin,
            'example_vi': example_vi,
        }
        # Optional grammar patterns for function words: [{form, meaning, match?}], where `match`
        # is a regex that highlights the whole pattern inside example_zh.
        if review.get('patterns'):
            entry['patterns'] = review['patterns']
        groups[level].append(entry)

    expected = {1: 300, 2: 200, 3: 500, 4: 1000, 5: 1600, 6: 1800, 7: 5600}
    for level, count in expected.items():
        if len(groups[level]) != count:
            raise ValueError(f'Level {level} expected {count} rows; found {len(groups[level])}')

    for level in range(1, 7):
        previous_path = HSK30_DIR / f'level{level}_vocabularies.json'
        previous = load_json(previous_path) if previous_path.exists() else []
        previous_ids = {}
        exact_ids = {(old_word['hanzi'], old_word['pinyin']): old_word['id'] for old_word in previous}
        previous_ids_by_hanzi = defaultdict(list)
        used_ids = set()
        for old_word in previous:
            old_key = (re.sub(r'[⁰¹²³⁴⁵⁶⁷⁸⁹]+$', '', old_word['hanzi']), old_word['pinyin'])
            if old_key not in previous_ids:
                previous_ids[old_key] = old_word['id']
            previous_ids_by_hanzi[old_key[0]].append(old_word['id'])
            used_ids.add(old_word['id'])
        next_id = max((int(value) for value in used_ids), default=0) + 1
        assigned_ids = set()
        current_hanzi_counts = Counter(re.sub(r'[⁰¹²³⁴⁵⁶⁷⁸⁹]+$', '', word['hanzi']) for word in groups[level])
        for word in groups[level]:
            key = word.pop('_source_key')
            preserved_id = exact_ids.get((word['hanzi'], word['pinyin']))
            if preserved_id is None or preserved_id in assigned_ids:
                preserved_id = previous_ids.get(key)
            plain_hanzi = re.sub(r'[⁰¹²³⁴⁵⁶⁷⁸⁹]+$', '', word['hanzi'])
            if preserved_id is None and current_hanzi_counts[plain_hanzi] == 1 and len(previous_ids_by_hanzi[plain_hanzi]) == 1:
                preserved_id = previous_ids_by_hanzi[plain_hanzi][0]
            if preserved_id is not None and preserved_id not in assigned_ids:
                word['id'] = preserved_id
            else:
                while next_id in used_ids:
                    next_id += 1
                word['id'] = next_id
                used_ids.add(next_id)
                next_id += 1
            assigned_ids.add(word['id'])
        output = HSK30_DIR / f'level{level}_vocabularies.json'
        output.write_text(json.dumps(groups[level], ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    # The 2025 syllabus has a single advanced word pool shared by exam levels 7–9.
    # Separate copies keep each level's existing progress storage independent.
    for level in range(7, 10):
        output = HSK30_DIR / f'level{level}_vocabularies.json'
        public_words = [{key: value for key, value in word.items() if not key.startswith('_')} for word in groups[7]]
        output.write_text(json.dumps(public_words, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')

    print('Built HSK 3.0 decks:', ', '.join(f'{level}={expected[level]}' for level in expected))
    print('Rows with examples:', sum(bool(word['example_zh']) for group in groups.values() for word in group))
    print('Curated entries applied:', curated_applied)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--translate-missing', action='store_true', help='generate draft Vietnamese meanings for terms without local glosses')
    parser.add_argument('--build', action='store_true', help='build the nine JSON decks')
    args = parser.parse_args()
    if args.translate_missing:
        translate_missing()
    if args.build:
        build()
