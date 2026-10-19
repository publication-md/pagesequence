"""Runs every case in ../testdata/cases.json (see testdata/README.md for the fields)."""

import json
import os
import unittest

from pagesequence import PageSequence, PageSequenceError, clean, equals, from_roman, normalize, to_roman
from pagesequence.plugins.greek import greek
from pagesequence.plugins.hebrew import hebrew
from pagesequence.plugins.latin_sv import latin_sv
from pagesequence.plugins.roman_additive import roman_additive

PLUGINS = {"roman_additive": roman_additive, "latin_sv": latin_sv, "greek": greek, "hebrew": hebrew}
CASES = os.path.join(os.path.dirname(__file__), "..", "..", "testdata", "cases.json")
STRICT = ("errors", "pages", "normalized", "display", "labelsAt", "lengths", "lookups", "equals")

with open(CASES, encoding="utf-8") as f:
    DATA = json.load(f)


class Cases(unittest.TestCase):
    def assert_raises_one_of(self, f, errors, positions=True):
        try:
            f()
        except PageSequenceError as e:
            ok = any(x["kind"] == e.kind and (not positions or x["position"] == e.position) for x in errors)
            self.assertTrue(ok, f"raised {e.kind} at {e.position}, expected one of {errors}")
            return
        self.fail(f"did not raise, expected one of {errors}")

    def run_sequence_case(self, c):
        opts = {"plugins": [PLUGINS[n] for n in c.get("plugins", [])]}
        if "maxLabels" in c:
            opts["max_labels"] = c["maxLabels"]
        length = c.get("length")
        if any(k in c for k in STRICT):
            if "errors" in c:
                self.assert_raises_one_of(lambda: PageSequence(c["input"], length, **opts), c["errors"])
                self.assertIsNone(PageSequence.create(c["input"], length, **opts))
                if length is None:
                    self.assert_raises_one_of(lambda: normalize(c["input"], **opts), c["errors"])
            else:
                seq = PageSequence(c["input"], length, **opts)
                pages = seq.pages()
                if "pages" in c:
                    self.assertEqual(pages, c["pages"])
                    self.assertEqual(seq.get_index_list(), [i for i, p in enumerate(pages) if not p["ignored"]])
                    self.assertEqual(seq.get_label_list(), [l for p in pages if not p["ignored"] for l in p["labels"]])
                if "normalized" in c:
                    self.assertEqual(normalize(c["input"], **opts), c["normalized"])
                    self.assertEqual(str(seq), c["normalized"])
                if "display" in c:
                    self.assertEqual([seq.labels_at(i, True) for i in range(len(pages))], c["display"])
                for x in c.get("labelsAt", []):
                    self.assertEqual(seq.labels_at(x["index"]), x["labels"], f"labels_at({x['index']})")
                    if x["labels"] is None:
                        self.assertIsNone(seq.labels_at(x["index"], True), f"labels_at({x['index']}, True)")
                if "lengths" in c:
                    got = {
                        "indexLengthAll": seq.get_index_length_all(),
                        "indexLength": seq.get_index_length(),
                        "labelLength": seq.get_label_length(),
                    }
                    self.assertEqual(got, c["lengths"])
                for x in c.get("lookups", []):
                    self.assertEqual(seq.get_index_list(x["pages"]), x["indexes"], f"get_index_list({x['pages']!r})")
                    self.assertEqual(seq.get_label_list(x["pages"]), x["labels"], f"get_label_list({x['pages']!r})")
                for x in c.get("equals", []):
                    self.assertEqual(equals(c["input"], x["with"], **opts), x["result"], f"equals with {x['with']!r}")
        for x in c.get("cleaned", []):
            call = lambda: clean(c["input"], x.get("length"), **opts)  # noqa: E731
            if "errors" in x:
                self.assert_raises_one_of(call, [{"kind": k, "position": None} for k in x["errors"]], False)
            else:
                self.assertEqual(call().normalized, x["normalized"], f"clean with length {x.get('length')}")

    def run_roman_case(self, c):
        if "fromRoman" in c:
            self.assertEqual(from_roman(c["fromRoman"]), c["value"])
        elif c.get("throws"):
            with self.assertRaises(ValueError):
                to_roman(c["toRoman"])
        else:
            self.assertEqual(to_roman(c["toRoman"], c.get("lowerCase", False)), c["roman"])


def _add(group, n, c):
    def test(self):
        (self.run_roman_case if group == "roman" else self.run_sequence_case)(c)

    what = json.dumps(c["input"] if "input" in c else c, ensure_ascii=False)
    test.__doc__ = f"{group} {n}: {what[:57] + '…' if len(what) > 60 else what}"
    setattr(Cases, f"test_{group}_{n:03}", test)


for _group, _cases in DATA["groups"].items():
    for _n, _c in enumerate(_cases, 1):
        _add(_group, _n, _c)


if __name__ == "__main__":
    unittest.main()
