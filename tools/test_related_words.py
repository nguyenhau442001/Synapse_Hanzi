#!/usr/bin/env python3
"""
Unit tests for the 'Chữ liên quan' (Related Characters & Clustering) feature
and the example box display fix.
"""

import unittest
import json
import re
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
INDEX_HTML = ROOT / "index.html"
FLASHCARD_JS = ROOT / "src" / "islands" / "FlashcardStudy.jsx"
RELATED_JS = ROOT / "src" / "islands" / "RelatedWords.jsx"
PROGRESS_JS = ROOT / "src" / "islands" / "StudyProgress.jsx"
FLASHCARD_CSS = ROOT / "assets" / "css" / "flashcard.css"
WORKSTATION_CSS = ROOT / "assets" / "css" / "workstation.css"
SW_JS = ROOT / "sw.js"

class TestRelatedWordsFeature(unittest.TestCase):
    def test_related_script_registered(self):
        html = INDEX_HTML.read_text(encoding="utf-8")
        self.assertIn("assets/js/preact/islands.js", html, "the Preact islands bundle (RelatedWords.jsx) must be loaded by index.html")
        self.assertIn("mountRelatedWords()", (ROOT / "src" / "islands" / "main.jsx").read_text(encoding="utf-8"))

    def test_sw_caches_related_script(self):
        sw = SW_JS.read_text(encoding="utf-8")
        self.assertIn("preact/islands.js", sw, "sw.js must precache the islands bundle that contains RelatedWords.jsx")

    def test_card_related_wrap_in_template(self):
        flashcard_code = FLASHCARD_JS.read_text(encoding="utf-8")
        self.assertIn('id="cardRelatedWrap"', flashcard_code, "cardRelatedWrap must exist in flashcard template")
        self.assertIn("renderCardRelated(w)", flashcard_code, "renderCardRelated must be invoked in render()")

    def test_progress_calls_hint_on_unknown(self):
        prog = PROGRESS_JS.read_text(encoding="utf-8")
        self.assertIn("showRelatedClusterHint(word)", prog, "progress.js must show cluster hint on rating 'again'")

    def test_css_styles_defined(self):
        fc_css = FLASHCARD_CSS.read_text(encoding="utf-8")
        ws_css = WORKSTATION_CSS.read_text(encoding="utf-8")
        
        self.assertIn(".card-related-wrap", fc_css)
        self.assertIn(".related-chip", fc_css)
        self.assertIn(".related-chip--known", fc_css)
        self.assertIn(".related-chip--unknown", fc_css)
        self.assertIn(".related-chip--unseen", fc_css)
        self.assertIn(".related-cluster-toast", fc_css)
        self.assertIn(".card:not(.is-flipped) .card-related-wrap", fc_css)
        self.assertIn(".card-related-wrap", ws_css)

    def run_query(self, cases):
        """Runs the real RelatedWordsQuery.js over HSK 1-6 + HSK 3.0 decks; cases = {name: [levelKey, hanzi, pinyin]}."""
        node_script = """
        const fs = require('fs');
        (async () => {
          const q = await import('./src/islands/RelatedWordsQuery.js');
          const decomps = JSON.parse(fs.readFileSync('database/radicals/hanzi_decompositions.json', 'utf8'));
          const files = {};
          for (let n = 1; n <= 6; n++) files['hsk' + n] = [`database/vocabs/hsk${n}_vocabularies.json`, n];
          for (let n = 1; n <= 9; n++) files['hsk30_' + n] = [`database/vocabs/hsk3_0/level${n}_vocabularies.json`, n];
          const words = Object.entries(files).flatMap(([levelKey, [path, levelRank]]) =>
            JSON.parse(fs.readFileSync(path, 'utf8')).map(w => ({ ...w, levelKey, levelRank })));
          const index = q.createRelatedIndex(decomps, words);
          const cases = JSON.parse(process.argv[1]);
          const out = {};
          for (const [name, [levelKey, hanzi, pinyin]] of Object.entries(cases)) {
            const target = words.find(w => w.levelKey === levelKey && w.hanzi === hanzi && (!pinyin || w.pinyin === pinyin));
            out[name] = q.queryRelated(index, target, levelKey, target.levelRank)
              .map(x => ({ hanzi: x.word.hanzi, pinyin: x.word.pinyin, type: x.type, shared: x.shared }));
          }
          console.log(JSON.stringify(out));
        })();
        """
        proc = subprocess.run(["node", "--input-type=commonjs", "-e", node_script, json.dumps(cases)],
                              capture_output=True, text=True, check=True, cwd=ROOT)
        return json.loads(proc.stdout)

    def test_node_query_sample_words(self):
        res = self.run_query({
            "yiYuan": ["hsk1", "医院", None],
            "maMa": ["hsk1", "妈妈", None],
            "xueXiao": ["hsk1", "学校", None],
            "ai": ["hsk30_8", "挨", "āi"],
        })
        self.assertEqual(res["yiYuan"][0]["type"], "whole-char")
        self.assertIn("医生", [x["hanzi"] for x in res["yiYuan"]])

        ma_phonetic = [x["hanzi"] for x in res["maMa"] if x["type"] == "phonetic"]
        self.assertIn("吗", ma_phonetic, "妈 and 吗 share the phonetic 马")

        self.assertTrue(any(x["hanzi"] in ("学生", "学习", "同学") for x in res["xueXiao"]))

        ai = res["ai"]
        by_type = lambda t: [x for x in ai if x["type"] == t]
        self.assertTrue(any(x["pinyin"] == "ái" for x in by_type("polyphone")), "挨 āi must list 挨 ái as another reading")
        self.assertIn("唉", [x["hanzi"] for x in by_type("phonetic")], "唉 shares the phonetic 矣, not the radical")
        radical = by_type("radical")
        self.assertTrue(radical and all(x["shared"] == "扌" for x in radical))
        self.assertFalse(any(x["hanzi"] in ("我", "我们", "唉") for x in radical), "我 (radical 戈) and 唉 (radical 口) are not 扌 words")

    def test_example_box_cut_off_fixed(self):
        ws_css = WORKSTATION_CSS.read_text(encoding="utf-8")
        # Ensure scrollbar is enabled or height expanded so content does not get cut off
        self.assertIn("overflow-y: auto !important", ws_css)
        self.assertIn("scrollbar-width: thin !important", ws_css)


if __name__ == "__main__":
    unittest.main()
