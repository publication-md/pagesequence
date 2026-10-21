"""Write random sequence inputs for the cross-language check (standard library only).

    python3 testdata/generate.py OUT.json [--seed N] [--models N]

Each input is a page model written in one of several spellings: a plain list, folded into ranges
and runs (with or without flags), partly folded, or with extra spaces. Some inputs are broken on
purpose, so the error kinds are compared too. Inputs from the same model share an ``id``; broken
inputs have none. The generator doesn't need to know how a spelling reads: the check compares
what each implementation makes of it.
"""

import argparse
import json
import random
import re

UPPER = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
LOWER = UPPER.lower()
SV_UPPER, SV_LOWER = UPPER + "ÅÄÖ", LOWER + "åäö"
GREEK_UPPER, GREEK_LOWER = "ΑΒΓΔΕΖΗΘΙΚΛΜΝΞΟΠΡΣΤΥΦΧΨΩ", "αβγδεζηθικλμνξοπρστυφχψω"
HEBREW = "אבגדהוזחטיכלמנסעפצקרשת"
ODD = ["Omslag", "Baksida", "notis", "Omslag, insida", "a b", 'My "label"', "1,2", "a-b", "a+b", "a..b",
       "1990/1", "3:12", "a\\b", ".5", "s.", "Hej!", "1–52", "x;y", "a|b", " ", "ß", "ss", "Ärende", "1.5"]
RESERVED = list(',-+!":\\;|…–—−“”„') + ["\t", ".."]


def roman(n, lower=False):
    out = ""
    for v, s in [(1000, "M"), (900, "CM"), (500, "D"), (400, "CD"), (100, "C"), (90, "XC"), (50, "L"),
                 (40, "XL"), (10, "X"), (9, "IX"), (5, "V"), (4, "IV"), (1, "I")]:
        while n >= v:
            out += s
            n -= v
    return out.lower() if lower else out


def roman_additive(n, lower=False):
    out = ""
    for v, s in [(1000, "M"), (500, "D"), (100, "C"), (50, "L"), (10, "X"), (5, "V"), (1, "I")]:
        while n >= v:
            out += s
            n -= v
    return out.lower() if lower else out


def segment(rng):
    """A run of pages: (pages, system), where system names what numbers it, or None."""
    kind = rng.choices(
        ["integer", "roman", "latin", "spread", "odd", "unlabelled", "roman_additive", "latin_sv", "greek",
         "hebrew", "foldout", "parity"],
        [30, 12, 12, 12, 8, 3, 5, 4, 4, 4, 3, 5])[0]
    lower = rng.random() < 0.5
    if kind == "integer":
        start = rng.choice([0, 1, rng.randint(1, 300), rng.randint(999_999_980, 999_999_985)])
        n = rng.randint(1, 14)
        pre = rng.choice(["", "", "", "inflikat.", "x", "Kap. ", "C", "v"])
        suf = rng.choice(["", "", "", "a", " b", ".1"])
        return [[f"{pre}{v}{suf}"] for v in range(start, start + n)], "integer"
    if kind in ("roman", "roman_additive"):
        write = roman if kind == "roman" else roman_additive
        start = rng.choice([1, rng.randint(1, 60), rng.randint(3990, 3998)])
        n = rng.randint(1, 10)
        pre = rng.choice(["", "", "", "Kap. ", "C" if lower else "c", "12", "D"])
        return [[pre + write(v, lower)] for v in range(start, min(start + n, 4000))], kind
    if kind in ("latin", "latin_sv", "greek", "hebrew"):
        letters = {"latin": (UPPER, LOWER), "latin_sv": (SV_UPPER, SV_LOWER), "greek": (GREEK_UPPER, GREEK_LOWER),
                   "hebrew": (HEBREW, HEBREW)}[kind][lower]
        start = rng.randint(0, len(letters) - 1) if kind != "latin_sv" else rng.randint(20, len(letters) - 1)
        n = rng.randint(1, min(10, len(letters) - start))
        pre = rng.choice(["", "", "", "1", "Plansch ", "I", "Bilaga "])
        return [[pre + c] for c in letters[start:start + n]], kind
    if kind in ("spread", "foldout"):
        width = 2 if kind == "spread" else 3
        start = rng.randint(0, 200)
        n = rng.randint(1, 8)
        if rng.random() < 0.2:
            letters = UPPER if not lower else LOWER
            start = rng.randint(0, 25 - width)
            n = min(n, (26 - start) // width)
            return [[letters[start + p * width + c] for c in range(width)] for p in range(n)], "latin"
        return [[str(start + p * width + c) for c in range(width)] for p in range(n)], "integer"
    if kind == "parity":
        odd = rng.random() < 0.5
        start = rng.choice([0, 1, rng.randint(1, 300)]) // 2 * 2 + odd
        n = rng.randint(1, 10)
        pre = rng.choice(["", "", "", "p", "Kap. "])
        return [[f"{pre}{v}"] for v in range(start, start + 2 * n, 2)], "odd" if odd else "even"
    if kind == "unlabelled":
        return [rng.choice([[""], ["", str(rng.randint(1, 99))], [str(rng.randint(1, 99)), ""]])], None
    return [[rng.choice(ODD)] for _ in range(rng.randint(1, 2))], None


def model(rng):
    """A random valid page model, as segments: [(pages, system, ignored)]."""
    seen = set()
    segments = []
    for _ in range(rng.randint(1, 7)):
        pages, system = segment(rng)
        ignored = rng.random() < 0.1
        labels = [label.lower() for page in pages for label in page if label != ""]
        if not ignored:
            if len(set(labels)) != len(labels) or seen & set(labels):
                continue
            seen |= set(labels)
        segments.append((pages, system, ignored))
        if not ignored and rng.random() < 0.08:
            segments.append(([rng.choice(pages)], None, True))  # a duplicate scan
    if not segments:
        segments.append(([["1"]], "integer", False))
    return segments


def bare_ok(label):
    return re.fullmatch(r"[^\s\",\-+!:\\;|…–—−“”„.]([^\",\-+!:\\;|…–—−“”„]*[^\s\",\-+!:\\;|…–—−“”„.])?", label) \
        and ".." not in label


def quote(label, rng):
    if bare_ok(label) and rng.random() < 0.9:
        return label
    return '"' + label.replace("\\", "\\\\").replace('"', '\\"') + '"'


def sp(rng):
    return rng.choice(["", "", "", " ", "  "])


def write(segments, rng, fold, spaced):
    """Write a model. ``fold`` is the chance that a segment with a system is written as one item."""
    items = []
    s = (lambda: sp(rng)) if spaced else (lambda: "")
    for pages, system, ignored in segments:
        mark = "!" + s() if ignored else ""
        page = lambda p: (s() + "+" + s()).join(quote(label, rng) for label in p)  # noqa: E731
        width = len(pages[0])
        if system and len(pages) >= 2 and rng.random() < fold:
            op = "-" if width == 1 else ".."
            flag = ":" + system if system not in ("roman", "latin", "integer") or rng.random() < 0.2 else ""
            items.append(mark + page(pages[0]) + s() + op + s() + page(pages[-1]) + flag)
        else:
            items.extend(mark + page(p) for p in pages)
    return (s() + "," + s() if spaced else rng.choice([",", ", "])).join(items)


def broken(text, rng):
    """Break an input in one of a few ways."""
    how = rng.randrange(8)
    if how == 0 or not text:
        i = rng.randint(0, len(text))
        return text[:i] + rng.choice(RESERVED) + text[i:]
    if how == 1:
        i = rng.randrange(len(text))
        return text[:i] + text[i + 1:]
    if how == 2:
        items = text.split(", ")
        return ", ".join(items + [rng.choice(items)])
    if how == 3:
        return text + rng.choice([",", ", ", "-", "+", "..", ":", ":latin", ":klingon", " !"])
    if how == 4:
        return re.sub(r"(\w+)-(\w+)", r"\2-\1", text, count=1)
    if how == 5:
        return text.replace("+", "-", 1)
    if how == 6:
        return text.replace("-", "..", 1)
    i = rng.randint(0, len(text))
    return text[:i] + '"' + text[i:]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("out")
    ap.add_argument("--seed", type=int, default=2026)
    ap.add_argument("--models", type=int, default=1200)
    args = ap.parse_args()
    rng = random.Random(args.seed)
    inputs = []
    for mid in range(args.models):
        segments = model(rng)
        spellings = {write(segments, rng, 0, False), write(segments, rng, 1, False),
                     write(segments, rng, 0.5, False), write(segments, rng, 0.5, True)}
        for text in sorted(spellings):
            inputs.append({"id": mid, "input": text})
        inputs.append({"id": None, "input": broken(write(segments, rng, 0.5, False), rng)})
    with open(args.out, "w", encoding="utf-8") as f:
        json.dump({"seed": args.seed, "inputs": inputs}, f, ensure_ascii=False, indent=0)
    print(f"{len(inputs)} inputs from {args.models} models (seed {args.seed})")


if __name__ == "__main__":
    main()
