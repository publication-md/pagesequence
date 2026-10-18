"""What cases.json can't express: the roman round trip, and the checks on ``plugins`` and
options."""

import unittest

from pagesequence import PageSequence, alphabet, from_roman, normalize, to_roman
from pagesequence.plugins.latin_sv import latin_sv


class Api(unittest.TestCase):
    def test_roman_round_trip(self):
        for n in range(1, 4000):
            self.assertEqual(from_roman(to_roman(n)), n)
            self.assertEqual(from_roman(to_roman(n, True)), n)
            self.assertEqual(to_roman(n, True), to_roman(n).lower())

    def test_builtin_name_in_plugins(self):
        with self.assertRaises(TypeError):
            normalize("1-3", plugins=[alphabet("latin", "AB", "ab")])

    def test_same_name_twice(self):
        with self.assertRaises(TypeError):
            normalize("1-3", plugins=[latin_sv, alphabet("latin_sv", "AB")])

    def test_custom_alphabet(self):
        plugins = [alphabet("x_abc", "ABC")]
        self.assertEqual(normalize("A, B, C", plugins=plugins), "A-C")
        self.assertEqual(PageSequence("A-C/x_abc", plugins=plugins).get_label_list(), ["A", "B", "C"])

    def test_length_argument(self):
        self.assertEqual(PageSequence("1-3", 3).get_index_length_all(), 3)
        self.assertIsNone(PageSequence.create("1-3", 4))

    def test_instance_keeps_plugins(self):
        seq = PageSequence("A-Ö/latin_sv", plugins=[latin_sv])
        self.assertEqual(seq.get_index_list("Å-Ö/latin_sv"), [26, 27, 28])
        self.assertEqual(str(seq), "A-Ö/latin_sv")

    def test_max_labels_positive(self):
        with self.assertRaises(ValueError):
            normalize("1-3", max_labels=0)

    def test_importing_the_package_imports_no_plugin(self):
        import subprocess
        import sys

        code = "import sys, pagesequence; print(any(m.startswith('pagesequence.plugins') for m in sys.modules))"
        out = subprocess.run([sys.executable, "-c", code], capture_output=True, text=True, env={"PYTHONPATH": sys.path[0]})
        self.assertEqual(out.stdout.strip(), "False", out.stderr)


if __name__ == "__main__":
    unittest.main()
