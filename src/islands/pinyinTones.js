// Pinyin tone detection and tone-colored markup.
// Syllables keep their tone marks; each is wrapped in <span class="tone tone-N"> (N = 1-4, 5 = neutral)
// and CSS decides whether the colors are shown (see .tone-colors-off).

const VOWELS = 'aeiouüvāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ';
const TONE_MARKS = {
  1: 'āēīōūǖ',
  2: 'áéíóúǘ',
  3: 'ǎěǐǒǔǚ',
  4: 'àèìòùǜ',
};

// Initial + vowel cluster + optional final n/ng (+ erhua r) that does not start the next syllable.
const SYLLABLE_RE = new RegExp(
  `(?:zh|ch|sh|[bpmfdtnlgkhjqxrzcsyw])?[${VOWELS}]+(?:(?:ng|n)r?|r)?(?![${VOWELS}])`,
  'giu'
);

export function toneOfSyllable(syllable) {
  const text = String(syllable || '').toLowerCase();
  for (const tone of [1, 2, 3, 4]) {
    if ([...TONE_MARKS[tone]].some((mark) => text.includes(mark))) return tone;
  }
  return 5;
}

export function splitPinyinSyllables(text) {
  return String(text || '').match(SYLLABLE_RE) || [];
}

const escapeText = (value) => String(value)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function colorizeText(text) {
  let out = '';
  let last = 0;
  SYLLABLE_RE.lastIndex = 0;
  let match;
  while ((match = SYLLABLE_RE.exec(text)) !== null) {
    out += escapeText(text.slice(last, match.index));
    out += `<span class="tone tone-${toneOfSyllable(match[0])}">${escapeText(match[0])}</span>`;
    last = match.index + match[0].length;
  }
  return out + escapeText(text.slice(last));
}

// Plain pinyin text -> tone-colored HTML.
export function colorizePinyin(text) {
  return colorizeText(String(text || ''));
}

// Pinyin that already contains markup (e.g. "Zhège <u>tài</u> guì le."): only text between
// tags is wrapped, tags are kept as they are.
export function colorizePinyinHtml(html) {
  return String(html || '')
    .split(/(<[^>]+>)/)
    .map((part) => (part.startsWith('<') && part.endsWith('>') ? part : colorizeText(part.replace(/&amp;/g, '&'))))
    .join('');
}
