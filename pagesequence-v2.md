# PageSequence v2 — proposal

## Why

A PageSequence maps PDF pages to the labels printed on them. Version 1 has three problems.

1. **`,` and `|` mean the opposite of what a reader expects.** In v1 `,` separates PDF pages and
   `|` joins the labels on one PDF page: `1,2|3,4|5`. In running text, "s. 20,29" or "s. 2–3"
   names the pages on one sheet. People and LLMs read `2|3,4|5` the wrong way round. In the
   Grottan corpus, markup agents counted the born-digital sequences wrongly in 40 issues and left
   out a correct `pageSequence`.
2. **Long patterns can't be written short.** A born-digital issue (cover, spreads, back cover) is
   `1,2|3,4|5,6|…|47,48`, 24 PDF pages written out one by one.
3. **The notation for one PDF page differs from how its labels are shown.** v1 writes `2|3` and
   shows it as "2–3", writes `20|29` and shows it as "20,29".

## Goals

- **The same notation for one PDF page as in text:** `2-3` for a spread, `20,29` for a
  centrefold with two unrelated labels.
- **A separator for PDF pages that nobody confuses with a label list:** `;`.
- **Runs of PDF pages written once,** whether single pages or spreads.
- **Readable without instructions:** spaces allowed, and every part looks like what it means.
- **The same capabilities as v1:** ranges of numbers, roman numerals and letters, prefixed labels,
  and ignored duplicate pages.

## Syntax

```
sequence  = item { ";" item }
item      = page | run
page      = [ "!" ] labels           one PDF page; "!" = ignore (a duplicate scan)
labels    = span { "," span }        the labels printed on that PDF page, in reading order
span      = label [ "-" label ]      consecutive labels on the SAME PDF page (a spread)
run       = page ".." page           a run of PDF pages: first … last, same shape, stepping
label     = number | roman | letter | prefixed | word | quoted
quoted    = '"' { char | '\\"' | '\\\\' } '"'   any text; \" is a quote, \\ a backslash
```

- Whitespace around `;`, `..`, `,` and `-` is allowed and ignored.
- **Quoted labels.** A label containing a separator (`;` `,` `-` `..`), a `!`, a `"` or
  leading/trailing spaces is written in double quotes. Inside the quotes, `\"` is a quote and
  `\\` a backslash; everything else is literal, spaces included. Example: the label
  `My "label" - 1` is written `"My \"label\" - 1"`, and `"Omslag, insida"; 2..31` gives two
  PDF pages. Inside quotes a `-` is text. A quoted label takes part in spans and runs like any
  other label (see "Numbering").
- A label keeps its case as written (`iv`, `Omslag`, `inflikat.8`). Matching is case-insensitive,
  as in v1.
- **Runs (`..`)** expand from the first page to the last in steps of the page's width:
  - `1..16` is 16 PDF pages: 1, 2, …, 16.
  - `2-3..46-47` is spreads 2–3, 4–5, …, 46–47 (width 2, so 23 PDF pages).
  - `i..iv` and `A..D` work as roman numeral and letter runs.
  - `inflikat.1..inflikat.12` is a run with a prefix: the prefix is kept, the number steps.
  - The first and last page must have the same shape: the same width, and the same prefix if
    there is one. The distance between them must be a whole number of steps. Otherwise the
    sequence is invalid.
- **Display** of a PDF page's labels is the `page` notation itself: `2-3` → "2–3", `20,29` →
  "20,29". Notation and presentation are the same thing, so no extra rule is needed.

## Numbering

Spans (`a-b`, labels on one PDF page) and runs (`a..b`, PDF pages) are both built from their two
end labels in the same way, whether the labels are quoted or not.

### Finding what steps

Given the first label `a` and the last label `b`:

1. **Remove the common prefix**, the longest start the two share.
2. **Remove the common suffix**, the longest end they share (not overlapping the prefix).
3. **Widen the middle to whole numbering tokens.** Step the prefix boundary back, and the suffix
   boundary forward, while the character next to the middle belongs to the same token. This
   keeps a number from being cut: `10`→`19` has the common prefix `1`, but the middle is
   `10`/`19`, not `0`/`9`.
4. **Read both middles with the same numbering system** (below). The step is from the first value
   to the last. The prefix and suffix are kept as they are.

Examples:

| From | To | Steps | Labels |
|---|---|---|---|
| `1` | `52` | integer 1→52 | `1`, `2`, …, `52` |
| `"Version: 1.0.0"` | `"Version: 1.12.0"` | integer, the minor version, 0→12 | `Version: 1.0.0`, `Version: 1.1.0`, …, `Version: 1.12.0` |
| `inflikat.1` | `inflikat.12` | integer 1→12 | `inflikat.1` … `inflikat.12` |
| `i` | `iv` | roman 1→4 | `i`, `ii`, `iii`, `iv` |
| `"Plansch A"` | `"Plansch D"` | letter A→D | `Plansch A` … `Plansch D` |
| `"Tavla α"` | `"Tavla δ"` | greek α→δ | `Tavla α`, `Tavla β`, `Tavla γ`, `Tavla δ` |
| `1a` | `1c` | letter a→c (prefix `1`) | `1a`, `1b`, `1c` |
| `"לוח א"` | `"לוח ד"` | hebrew א→ד | `לוח א`, `לוח ב`, `לוח ג`, `לוח ד` |
| `08` | `12` | integer, width 2 | `08`, `09`, `10`, `11`, `12` |

Exactly one part steps; there is no multi-part (product) stepping. It is an error when the
middles can't be read by one system (e.g. `1a..2c`, where two parts would step; write
`1a..1c; 2a..2c`), when they are read with different
case or width, or when the last value is lower than the first.

### Numbering systems: a separate, extensible part

A numbering system is an object with:
- `name`;
- `match(token)`, which returns `{value, style}` or nothing (`style` holds case, zero padding and
  the like);
- `format(value, style)`;
- `tokenChars`, the characters that belong to a token, used in step 3.

The systems are kept in an **ordered list**, the hierarchy. Both middles are tried against each
system in order, and the first system that reads both wins:

1. **roman**: `I, II, …` and `i, ii, …`, case kept.
2. **letter** (Latin): `A … Z` / `a … z`.
3. **greek**: `Α … Ω` / `α … ω` (24 letters); the final form `ς` is read as `σ`, never generated.
4. **hebrew**: `א … ת` (22 letters, no case); the final forms `ך ם ן ף ץ` are read as
   `כ מ נ פ צ`, never generated.
5. **integer**: `0, 1, …`, with zero padding kept (`08`).

Systems 2–4 are one implementation, **alphabet**, given its letters (and an upper/lower pair
when the script has case) and its aliases (final forms). They count bijectively, as spreadsheet
columns do: after the last letter come two letters (`Z` → `AA`, `ω` → `αα`, `ת` → `אא`). A new
script is one line: its letters and aliases. The scripts never share characters, so their order
in the list doesn't matter between them. Hebrew numerals (gematria, `יא` = 11) are a different
counting and would be a separate system.

Roman comes before letter, so `I..IV` is roman. One exception keeps common cases right: **a
single letter other than `I`, `V`, `X` is read as a letter**. That makes `A..D` and `C..E`
alphabetical, not roman 100–500, while `I..III` and `V..X` stay roman. More systems (Cyrillic, …) can be added by putting them into the list at the right place.

### Effect on normalisation

`normalize` must not write a run or span that reads back differently, for example `C;D;E` written
as `C..E` must not turn into something roman. So:

- Folding is checked by **round trip**. A stretch of pages (or labels) is written as `a..b` (or
  `a-b`) only if expanding `a..b` with the hierarchy gives exactly those labels. Otherwise it stays
  listed. This keeps the form unique and correct whatever systems are registered.
- Breaks are still where neighbours don't continue each other. A neighbour continues when the
  two-label "run" from it to the next page expands to exactly those two labels. The partition
  stays deterministic.
- Quoting is written only where needed (rule 5). The diff works on the unquoted text, so
  `"Plansch A".."Plansch D"` and the quoted list give the same normal form.
- Changing the hierarchy, for example adding a system, can change how an existing string reads.
  So the hierarchy is part of the format version, and a new system means a minor version of
  PageSequence plus a check that all stored sequences still expand the same.

## Grottan examples

- **Scanned, one label per PDF page (1987-2)**
  - v1: `1-52`
  - v2: `1..52`
- **Born-digital: cover, spreads, back (2007-1)**
  - v1: `1,2|3,4|5,6|…|51,52` (26 groups)
  - v2: `1; 2-3..50-51; 52`
- **Born-digital, 48 pages (2016-4)**
  - v1: `1,2|3,4|…|47,48`
  - v2: `1; 2-3..46-47; 48`
- **PDF missing printed page 21 (1984-3)**
  - v1: `1-20,22-52`
  - v2: `1..20; 22..52`
- **Ignored duplicate scan**
  - v1: `1,2|3,!3,4`
  - v2: `1; 2-3; !3; 4`
- **Centrefold with unrelated labels (1986-1)**
  - v1: `…,19,20|29,30,…`
  - v2: `…; 19; 20,29; 30; …`
- **Insert with its own numbering (1978-2)**
  - v1: `1-8,inflikat.1-inflikat.12,9-40`
  - v2: `1..8; inflikat.1..inflikat.12; 9..40`
- **Roman front matter**
  - v1: `i-iv,1-48`
  - v2: `i..iv; 1..48`
- **Named cover and back**
  - v1: `Omslag,2-31,Baksida`
  - v2: `Omslag; 2..31; Baksida`

The 24-group line from the brief, `1,2|3,4|5,6|…|47,48`, becomes `1; 2-3..46-47; 48`.

## Why these characters

- **`;` between PDF pages:** it is a stronger break than `,`, as in prose lists ("s. 2–3; s. 20,29").
  It does not occur inside a label.
- **`,` within a PDF page:** it matches the text convention "s. 20,29" and the way the labels are
  shown.
- **`-` for consecutive labels on one PDF page:** it matches "s. 2–3". In v1, `-` meant a run of
  PDF pages, which is why runs get their own operator.
- **`..` for a run of PDF pages:** it can't be confused with a page range in text, it is
  well-known from programming ("from … to"), and it lets one operator cover single pages and
  spreads alike.
- **`!` unchanged:** it marks an ignored page.

## Normalisation and comparison

The same sequence can be written in several ways: `1;2;3` and `1..3`, `2,3` and `2-3`,
`1..3; 4..6` and `1..6`, `1 ; 2-3 .. 4-5` and `1; 2-3..4-5`. `normalize()` always writes the same,
shortest string for a sequence, so two sequences are equal exactly when their normal forms are
equal.

**Algorithm.**

1. **Expand** to the canonical model: a list of PDF pages, each `{ignored, labels[]}`, every run
   and span written out. This model *is* the meaning. `equals(a, b)` compares models (labels
   case-insensitive) and needs no string at all.
2. **Write each page.** Within a page, every maximal stretch of consecutive labels becomes a span
   (`2,3,4` → `2-4`, `iv,v` → `iv-v`). Consecutive means the same successor rule as runs: numbers,
   roman numerals, letters, and a constant prefix with a stepping number. Everything else is
   listed with `,` (`20,29`). A span is used only for 2 or more labels.
3. **Fold runs.** Scan the pages left to right. Two neighbouring pages continue a run when:
   - they have the same *shape*: the same ignored flag, the same number of labels, the same
     label kinds and the same prefixes;
   - every label steps by the page's width (`2-3` → `4-5`, `1` → `2`).

   Each maximal stretch of 3 or more such pages becomes `first..last`. Two pages stay as
   `a; b`, which is shorter (`1;2` beats `1..2`).
4. **Join** the items with `; ` (one space after `;`), with no other whitespace. Labels keep the
   spelling of their first occurrence, and an en dash `–` in the input becomes `-`.
5. **Quote only when needed.** A label is written in quotes exactly when it would otherwise not
   read back as the same single label (it contains a separator, `!`, `"` or edge spaces), with
   `"` and `\` escaped. So `"Omslag"` normalises to `Omslag`, and `My "label" - 1` always to
   `"My \"label\" - 1"`.

**Why it is unique.** Step 1 removes every difference in notation. Steps 2–3 are deterministic:
breaks fall exactly where two neighbouring pages (or labels) do *not* continue each other, so the
maximal runs are a fixed partition of the sequence, whatever the input looked like.

**Why it is shortest.** Within that partition, a run of 3 or more pages written with `..` is
never longer than the same pages listed, and a stretch can't be merged with its neighbour (by
definition the neighbour breaks it). The 3-page threshold is where `a..c` stops being longer than
`a; b; c` for single labels.

**Examples.**

- `1;2;3` and `1..3` → `1..3`
- `1; 2,3; 4,5; 6,7; 8` and `1; 2-3..6-7; 8` → `1; 2-3..6-7; 8`
- `1..20; 21..52` → `1..52`, but `1..20; 22..52` stays as it is, because 21 is missing
- `i;ii;iii;iv; 1..48` → `i..iv; 1..48`
- `1; 2-3; !3; 4` stays as it is: the ignored page breaks the run
- `1;2` stays `1; 2`, since a run of two is not shorter
- `"Omslag"; 2..31` → `Omslag; 2..31` (the quotes were not needed)

**API.**

- `normalize(text) → string`: the canonical form; throws on invalid input.
- `equals(a, b) → boolean`: the same page model.
- `diff(a, b)`: the first PDF index where the two differ, with both pages' labels. Useful in
  validate ("pageSequence in publication.md differs from the sheet at PDF page 22: 21 vs 22").
- publication-md can store the normal form, and its tools (`toc-sync`, validate) compare with
  `equals`, so formatting differences between the sheet and the repo are never reported as
  changes.

## Compatibility and migration

- A v1 string and a v2 string can look alike. `1-16` is 16 PDF pages in v1, but in v2 it is one
  PDF page carrying labels 1–16. So the version is explicit, never guessed:
  - The API is `PageSequence.create(text, { version: 2 })`, with v1 as the default until the next
    major release.
  - publication-md records it either by format version (`format: publication-md/0.2` uses v2) or
    with a field `pageSequenceVersion: 2`. I lean towards the format version, which goes with
    `npm run content -- upgrade` and its migrations.
- `PageSequence.toV2(v1)` converts losslessly and writes the shortest v2 form, folding runs and
  spread runs. `toV1(v2)` goes the other way, for readers that still use v1.
- **Quick syntax check:** a v2 string never contains `|`, and a v1 string never contains `;` or
  `..`. A validator can warn about "v1 syntax in a v2 field", and the other way round, but it
  should not decide the version from that.

## API (unchanged in meaning)

- `getIndexList(pages?)` and `getLabelList(pages?)` keep their meaning. `pages` (a reference such
  as `"20-21"` in a part block) is a printed page range in text, not a sequence, so it keeps the
  text conventions: `-` is a range of printed pages and `,` lists them.
- New: `labelsAt(index)` returns the labels of one PDF page, and `formatAt(index)` returns them as
  displayed (`"2–3"`, `"20,29"`). This replaces the label joining that tools such as
  publication-md's `joinLabels` do today.
- New: `toString()` writes the canonical (shortest) v2 form, and `toV2()` / `toV1()`.

## Distribution and implementations

PageSequence is part of **publication-md** and lives at
<https://github.com/publication-md/pagesequence>. v1 was published on Deno; v2 is published on
**npm** and **PyPI**, with one implementation per language. The licences are publication-md's:
**MIT** for the code and **CC0** for the format description (`spec/`).

### Repository layout

```
pagesequence/
  spec/                  the format (this document, once settled)   CC0
  testdata/cases.json    shared test cases, used by every implementation
  js/                    TypeScript → npm  @publication-md/pagesequence   MIT
    package.json  src/  test/
  py/                    Python → PyPI  pagesequence (see below)        MIT
    pyproject.toml  src/pagesequence/  tests/
  .github/workflows/     test both on every push; publish both on a tag
  LICENSE (MIT)  LICENSE-SPEC (CC0)  AUTHORS
```

### Shared test data

`testdata/cases.json` is the contract between the implementations. Both test suites read the same
file, and CI runs both, so a change in behaviour fails in both languages at once. Each case has:

- `input` and `version` (`"1; 2-3..46-47; 48"`, `2`);
- `pages`: the expected expansion, one entry per PDF page, `{ignored, labels}`;
- `normalized`: the expected `normalize()` output;
- `format`: the expected display per PDF page (`"2–3"`, `"20,29"`);
- `equals` / `diff` cases: a pair and the expected result;
- `error`: for invalid input, the error *kind* only (`"mixed-systems"`, `"descending"`,
  `"unknown-label"` …), not the message, so each language can word it its own way;
- `v1`: for conversion cases, the v1 string and the expected `toV2` / `toV1` result.

Cases are grouped by feature: syntax, runs, spans, quoting, numbering (each system plus the
hierarchy), normalisation and conversion. Each Grottan example in this document becomes a case.

### Publishing

- **One version number for both packages.** It is the PageSequence version (2.x), so
  "pagesequence 2.1" behaves the same in both languages. Adding a numbering system is a minor
  version, because it can change how a string reads (see "Effect on normalisation").
- **One tag publishes both.** A tag `v2.1.0` triggers a GitHub Actions release. It runs both test
  suites, then publishes:
  - **npm:** `npm publish --access public --provenance` from `js/`. The `@publication-md` npm
    organisation must be created once on npmjs.com. Use npm trusted publishing (OIDC from GitHub
    Actions), so no token is stored.
  - **PyPI:** `uv build` then `uv publish` from `py/`, with PyPI **Trusted Publishing** (OIDC)
    configured once on pypi.org for this repo and workflow. Try the first release on TestPyPI.
- **Deno:** Deno users import the npm package directly (`npm:@publication-md/pagesequence`). The
  v1 Deno module stays as it is and is marked as superseded.
- **Python package name:** `pagesequence` if it is free on PyPI, otherwise
  `publication-md-pagesequence` (import name `pagesequence` either way). Check before the first
  release.

### Consumers

- **publication-md** vendors v1 today (`vendor/pagesequence`). It switches to
  `@publication-md/pagesequence` from npm with format `publication-md/0.2` (see "Compatibility and
  migration").
- **Python skills** (`roots.py` and friends) can then use the Python package instead of copying
  logic. The navigation-line stripping is one such copy today.

## Open questions

1. **A run stepping by something other than its width** (e.g. every second page). Grottan doesn't
   need it, so leave it out until a real case appears.
2. **A three-page fold-out:** `12-14` is one PDF page with labels 12, 13 and 14. It works with
   width 3 and needs nothing new.
3. **Quoting inside prefixed runs:** should `"Bilaga A-"1..12` (a quoted prefix with a stepping
   number) be allowed? Not needed for Grottan, so it is left out for now.
4. **Unicode dash:** `2–3` (en dash) could be accepted as input, normalised to `-` on output.
   That would be useful when copying from the printed contents page.
