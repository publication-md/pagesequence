"""Cross-language check: read the generated inputs, write this implementation's results, and check
the properties of the normal form (see "Cross-language test" in pagesequence-v2.md).

    python3 py/tests/crosscheck.py IN.json OUT.json

Exits with 1 and prints the first failures if a property doesn't hold.
"""

import json
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "src"))

from pagesequence import PageSequence, PageSequenceError, clean, normalize  # noqa: E402
from pagesequence._core import _quote  # noqa: E402
from pagesequence.plugins.greek import greek  # noqa: E402
from pagesequence.plugins.hebrew import hebrew  # noqa: E402
from pagesequence.plugins.latin_sv import latin_sv  # noqa: E402
from pagesequence.plugins.roman_additive import roman_additive  # noqa: E402

PLUGIN_SETS = {"none": [], "all": [roman_additive, latin_sv, greek, hebrew]}


def plain(pages):
    return ", ".join(("!" if p["ignored"] else "") + "+".join(_quote(label) for label in p["labels"]) for p in pages)


def flag_chars(normalized):
    # A flag is ":" and a name after the last label of an item; quoted labels may contain ":".
    n, quoted, i = 0, False, 0
    while i < len(normalized):
        c = normalized[i]
        if quoted and c == "\\":
            i += 2
            continue
        if c == '"':
            quoted = not quoted
        elif c == ":" and not quoted:
            j = i + 1
            while j < len(normalized) and normalized[j] not in ", ":
                j += 1
            n += j - i
        i += 1
    return n


def main():
    with open(sys.argv[1], encoding="utf-8") as f:
        inputs = json.load(f)["inputs"]
    results, failures = [], []
    unique = {}
    for entry in inputs:
        text = entry["input"]
        for set_name, plugins in PLUGIN_SETS.items():
            r = {"input": text, "plugins": set_name}

            def fail(prop, detail):
                failures.append({"property": prop, "input": text, "plugins": set_name, "detail": detail})

            try:
                seq = PageSequence(text, plugins=plugins)
            except PageSequenceError as e:
                r["error"] = {"kind": e.kind, "position": e.position}
            else:
                pages = seq.pages()
                normalized = normalize(text, plugins=plugins)
                r["pages"], r["normalized"] = pages, normalized
                if str(seq) != normalized:
                    fail("toString", str(seq))
                try:
                    back = PageSequence(normalized, plugins=plugins).pages()
                except PageSequenceError as e:
                    fail("round trip", f"{normalized!r} raises {e.kind}")
                else:
                    if back != pages:
                        fail("round trip", normalized)
                    again = normalize(normalized, plugins=plugins)
                    if again != normalized:
                        fail("idempotent", again)
                for i, page in enumerate(pages):
                    display = seq.labels_at(i, True)
                    back = PageSequence.create(display)
                    if back is None or back.pages() != [{"ignored": False, "labels": page["labels"]}]:
                        fail("display", display)
                key = (set_name, json.dumps(pages, ensure_ascii=False))
                if unique.setdefault(key, normalized) != normalized:
                    fail("unique", [unique[key], normalized])
                if len(normalized) - flag_chars(normalized) > len(plain(pages)):
                    fail("not longer", [normalized, plain(pages)])
                if not any(c.isspace() and c != " " for c in text):
                    try:
                        cleaned = clean(text, plugins=plugins).normalized
                    except PageSequenceError as e:
                        cleaned = f"raises {e.kind}"
                    if cleaned != normalized:
                        fail("clean agrees", cleaned)
            try:
                r["clean"] = clean(text, plugins=plugins).normalized
            except PageSequenceError as e:
                r["cleanError"] = e.kind
            results.append(r)
    with open(sys.argv[2], "w", encoding="utf-8") as f:
        json.dump(results, f, ensure_ascii=False, indent=0)
    print(f"python: {len(results)} results, {len(failures)} property failures")
    for x in failures[:10]:
        print(json.dumps(x, ensure_ascii=False))
    sys.exit(1 if failures else 0)


if __name__ == "__main__":
    main()
