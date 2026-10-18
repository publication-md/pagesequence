# PageSequence v2: design and migration

This note explains PageSequence v2 and how to get there from v1. The format itself is in
[`spec/pagesequence.md`](spec/pagesequence.md); where the two differ, the spec wins. The
implementation plan is in [`ROADMAP.md`](ROADMAP.md).

## What it is for

A table of contents is written with the page numbers printed in the publication. A part block in
publication-md says `pages: "20-21"` in labels. That works even where the numbering isn't 1 to n:

- an unnumbered cover;
- roman front matter;
- an insert with its own numbering;
- a missing page;
- a spread scanned as one PDF page.

The page sequence turns those labels into PDF pages. References are always made of labels, never
of PDF page numbers.

## Why

A PageSequence maps PDF pages to the labels printed on them. Version 1 has three problems.

1. **`|` is read the wrong way round.** In v1, `,` separates PDF pages and `|` joins the labels on
   one PDF page: `1,2|3,4|5`. But `|` looks like a stronger break than `,`, so people and LLMs read
   `2|3,4|5` as the groups "2", "3,4" and "5". In the Grottan corpus, markup agents counted the
   born-digital sequences wrongly in 40 issues.
2. **Long patterns can't be written short.** A born-digital issue (cover, spreads, back cover) is
   `1,2|3,4|5,6|…|47,48`: 25 PDF pages written out one by one.
3. **The notation for one PDF page differs from how its labels are shown.** v1 writes `2|3` and
   shows it as "2–3", and writes `20|29` and shows it as "20,29".

## Goals

- **Keep what works in v1:** `,` lists PDF pages and `-` is a range, as in running text, so `1-52`
  means what everyone expects.
- **A join that reads as "together":** `+` for the labels on one PDF page (`2+3`, `20+29`),
  replacing `|`.
- **The same notation for one PDF page as its display:** a page is shown as it is written, `2+3`
  or `20+29`.
- **Runs of PDF pages written once,** whether single pages (`1-52`) or spreads (`2+3..46+47`).
- **Readable without instructions:** spaces are allowed, and every part looks like what it means.
- **The same capabilities as v1:** ranges of numbers, roman numerals and letters, prefixed labels,
  and ignored duplicate pages.
- **Small and without dependencies:** each implementation is a small core, with no dependencies
  at run time or in its tests. Numbering systems beyond the three built-in ones are plugins, which
  code that doesn't use them leaves out. Only the npm build uses a tool, the TypeScript compiler.
- **Every numbering written exactly:** where the reading rule picks the wrong system, or a
  publication numbers its pages its own way, a flag names the system: `V-X/latin`,
  `I-X/roman_additive`.

## Why these characters

- **`,` between PDF pages (as in v1):** it matches lists in running text.
- **`-` for a range of PDF pages (as in v1):** it matches "s. 1–52", and it is what people and LLMs
  write without instructions. A `pages` reference in text uses the same two characters the same
  way.
- **`+` for the labels on one PDF page:** it reads as "together", and it can't be taken for a break
  that is stronger or weaker than `,`, which is what went wrong with `|`. It is also how the page
  is displayed.
- **`..` for a run of PDF pages:** it is well known from programming ("from … to"), and it can step
  pages with several labels. `-` can't do that: `2+3-46+47` reads as arithmetic.
- **`!` unchanged:** it marks an ignored page.
- **`/` for a flag:** it names the numbering system of a range or run (`V-X/latin`). Unlike `\`,
  it needs no escaping in JSON, YAML, JavaScript or Python strings. None of the known strings
  contains a `/`. `\` stays reserved, since it is the escape inside quoted labels.

## Choices that keep it small

The format covers what the known data needs, so that each implementation stays a small module
without dependencies:

- **Three built-in numbering systems:** roman numerals, Latin letters and integers. Every other
  system is a plugin, read only through a flag. `roman_additive`, `latin_sv`, `greek` and `hebrew`
  ship with the package, and code that doesn't pass them in leaves them out (see "Plugins").
  Fixed-width integers (`08`) and aliases are left out until a real case needs them (see
  "Later").
- **A simple strict model.** Only the plain space is whitespace, and control characters are
  reserved. What `clean` accepts on top of that may differ between languages.
- **One rule where roman numerals and letters collide:** the reading that ends lowest wins. That
  makes `C-D` letters and `V-X` roman, without a special case for I, V and X. A flag gives the
  other reading: `V-X/latin`. So the normal form never has to shorten a stretch to avoid a
  collision.
- **A linear normal form:** it is built in one pass. Together with the limits (1000 labels, 100
  code points per label, 9-digit integers), this also bounds the work done on hostile input.
- **Errors:** the kinds are fixed, but the order between several errors is not. A test case lists
  every error it allows.
- **References** are read strictly, plus two repairs. So `clean` can change without changing what
  stored data points to.
- **A small API:** `diff` is left out. `pages()` lets a caller compare two models.

## Grottan data

`v2/list_of_grottan_in_v1.txt` holds the 235 v1 sequences known to be in use, 42 of them distinct:

| Strings | Kind | v1 | v2 |
|---|---|---|---|
| 143 (61%) | scanned, one label per PDF page | `1-52` | `1-52` |
| 43 (18%) | born-digital: cover, spreads, back | `1,2\|3,4\|5,6\|…\|51,52` | `1, 2+3..50+51, 52` |
| 37 (16%) | a centre spread scanned as one PDF page | `1-26\|27-52` | `1-25, 26+27, 28-52` |
| 12 (5%) | inserts, letters, words, roman numerals | `1-20,A-H,21-40` | `1-20, A-H, 21-40` |

- The 143 scanned strings keep their text exactly, and the 12 others without `|` change only in
  spacing.
- The 80 that use `|` are rewritten. A merged centre spread grows from one item to three, because
  `+` joins labels, not ranges.
- No known string uses `!`, a page with three labels, zero padding, spaces in labels or non-ASCII
  characters. The longest has 60 labels.

Examples, all from the list unless marked otherwise:

- **Scanned, one label per PDF page (1987-2):** `1-52` in both.
- **Born-digital, 52 pages (2007-1):** v1 `1,2|3,4|5,6|…|51,52` (27 groups), v2
  `1, 2+3..50+51, 52`.
- **Born-digital, 48 pages (2016-4):** v1 `1,2|3,4|…|47,48`, v2 `1, 2+3..46+47, 48`.
- **A merged centre spread:** v1 `1-26|27-52`, v2 `1-25, 26+27, 28-52`.
- **PDF missing printed page 21 (1984-3):** v1 `1-20,22-52`, v2 `1-20, 22-52`.
- **Centrefold with unrelated labels:** v1 `1-20|29,21-28,30-48`, v2
  `1-19, 20+29, 21-28, 30-48`.
- **Insert with its own numbering (1978-2):** v1 `1-11,inflikat.0-inflikat.11,12-24`, v2
  `1-11, inflikat.0-inflikat.11, 12-24`.
- **A merged spread inside an insert:** v1
  `1-24,inflikat.1-inflikat.6|inflikat.7-inflikat.12,25-48`, v2
  `1-24, inflikat.1-inflikat.5, inflikat.6+inflikat.7, inflikat.8-inflikat.12, 25-48`.
- **Pages with letter suffixes and joined pages:** v1 `1-10|11,10a,10b|10c,10d,12-20`, v2
  `1-9, 10+11, 10a, 10b+10c, 10d, 12-20`.
- **Inserted plates:** v1 `1-20,A-H,21-40` and `1-14,14a-14d,15-28`, v2 `1-20, A-H, 21-40` and
  `1-14, 14a-14d, 15-28`.
- **A named page:** v1 `1,notis,2-32`, v2 `1, notis, 2-32`.
- **Roman front and back matter (1990-1):** v1 `I-VIII,3-22,IX-XVI`, v2 `I-VIII, 3-22, IX-XVI`.
- **An ignored duplicate scan (invented):** v1 `1,2|3,!3,4`, v2 `1, 2+3, !3, 4`.

## Conversion from v1

v1 is used in one project, so it is converted once rather than supported.

- **The known strings are already converted.** `v2/list_of_grottan_in_v2.txt` has the v2 form of
  each line of `v2/list_of_grottan_in_v1.txt`, in the same order. Each v2 line reads back to the
  same PDF pages as its v1 line does under v1 (`@tvartom/pagesequence` 1.3.3). Converting the
  stored data is a lookup between the two files.
- **How the v2 forms were made,** which also works for any other string:
  1. Split the v1 string on `,` and parse each section on its own with v1. v1 labels can't contain
     `,`.
  2. Strip a leading `!` and record it, because v1 doesn't keep the labels of ignored pages.
  3. Group the labels into PDF pages, and write the page model with `normalize()`.
- **No known string is rejected by v2, or reads differently in v2.**
  - No string has a duplicate label, and none is empty.
  - None of the 155 strings without `|` reads differently when v2 reads its text as it is.
  - `C-D`, which v1 reads as roman 100–500, does not occur.
- **Check the stored references once.** Before switching, publication-md compares v1
  `getIndexList(ref)` with v2's for every stored reference.
- The v2 packages contain no v1 parser and no conversion function. In v2, `|` is a reserved
  character.
- **No version flag.** After the conversion, every stored string is v2.

## Breaking changes from v1

- **`|` is invalid.** `+` joins the labels on one PDF page, and only between single labels:
  `1-3|4-6` becomes `1-2, 3+4, 5-6`.
- **An empty string is an error,** even with a page count. Plain numbering is stored as `1-52`,
  which `clean("", { length: 52 })` gives. Code that relied on the empty default needs
  ``create(text || `1-${n}`, n)``.
- **A label may appear only once** on the pages that are not ignored. v1 accepted duplicates, and
  its lookups returned the last one.
- **Single-letter ranges** such as `C-D`, `L-M` and `I-L` read as letters. v1 read them as roman.
- **A number with a leading zero can't be a range end.** `08-12` is an error; v1 read it as 8, 9,
  …, dropping the zero.
- **`!`, `"`, `/`, `\` and control characters are reserved,** so a label that contains one is
  quoted: `"1990/1"`.
- **References** (`getIndexList(pages)`) are read as v2 sequences, plus two repairs: dashes and
  equal ends. Each index appears once, in first-seen order. v1 could repeat an index:
  `[19, 20, …, 27, 19]`.
- **Errors have a kind and a position** (`PageSequenceError`).
- **New limits:** at most 1000 labels, labels of at most 100 code points, and integers of at most 9
  digits.
- **`fromRoman` is strict.** It reads what the roman system reads, and gives `undefined` for
  anything else. v1 gave 4 for `IIII`, 1 for `IC` and 0 for text that isn't roman, and it read
  mixed case (`Iv`) and `MMMM`.
- **`toRoman` throws outside 1–3999.** v1 gave `""` for 0 and `MMMM` for 4000.
- **`romanPattern` is gone.** It matched `MMMM` and mixed case, which v2 doesn't read as roman.
  `fromRoman` tells whether a token is roman.
- **New functions:** `labelsAt`, `formatAt`, `pages()`, `toString()`, `normalize`, `clean`,
  `equals` and `alphabet`.
- **New syntax:** flags (`V-X/latin`), and the plugin systems they name. Every call that reads a
  sequence takes the plugin systems in a `plugins` option. The constructor still takes the page
  count as its second argument, as in v1, or `{ length, plugins }`.

## Distribution and implementations

PageSequence is part of **publication-md** and lives at
<https://github.com/publication-md/pagesequence>. v1 was published on JSR
(`@tvartom/pagesequence`).

v2 is published on **npm** and **JSR** (TypeScript) and on **PyPI** (Python), with one
implementation per language:

- Neither implementation has dependencies, either at run time or in its tests. The npm package is
  compiled with the TypeScript compiler (`tsc`), which is only a build tool.
- The licences are publication-md's: **MIT** for the code, and **CC0** for the format description
  (`spec/`).

### Repository layout

```
pagesequence/
  spec/pagesequence.md   the format                                        CC0
  testdata/cases.json    shared test cases, used by every implementation
  ts/                    TypeScript → npm and JSR  @publication-md/pagesequence  MIT
    package.json  jsr.json  tsconfig.json  src/  test/    (dist/ is built, not committed)
  py/                    Python → PyPI  pagesequence                       MIT
    pyproject.toml  src/pagesequence/  tests/
  v2/                    the known v1 strings and their v2 forms (conversion)
  .github/workflows/     test both on every push; publish everywhere on a tag
  LICENSE (MIT)  LICENSE-SPEC (CC0)  AUTHORS
```

The plugin systems are in `ts/src/plugins/` and `py/src/pagesequence/plugins/`, one module each.

### Plugins

The plugin systems ship in the package, but a plugin does nothing until the caller passes it in,
and code that doesn't use it leaves it out:

- **Passed in, never registered.** Each call that reads a sequence gets its plugin systems in
  `plugins`. A global registry would make the same code in a file behave differently depending on
  what another module had registered. Passing them in means the same call with the same arguments
  always reads the same, and tests can run a case with or without plugins without resetting
  anything.
- **Each plugin is its own module,** exported as a subpath
  (`@publication-md/pagesequence/plugins/roman_additive`) and not from `mod.ts`. A plugin that
  isn't imported is then never loaded, with or without a bundler. In Python, it is a module that
  isn't imported.
- **Importing a plugin does nothing else.** So the package has no side effects, and
  `package.json` declares `"sideEffects": false`.
- **A plugin made by a call,** such as `alphabet(…)`, is marked `/* @__PURE__ */`. Otherwise a
  bundler that reads the source, not the npm package, keeps it.
- **The exports are named after the systems:** `romanAdditive`, `latinSv`, `greek` and `hebrew` in
  TypeScript, and `roman_additive`, `latin_sv`, `greek` and `hebrew` in Python.

A bundling test (`deno bundle`, which uses esbuild) backs these rules. An app that used only the
core left out all plugins, even when `mod.ts` re-exported them, as long as the package declared
`"sideEffects": false`. Without that, an unmarked `alphabet(…)` call stayed in.
These plugins replace the data files of item 20.6 in `pagesequence-v2-review.md`.

### Shared test data

`testdata/cases.json` is the contract between the implementations. Both test suites read the same
file, and CI runs both, so a change in behaviour fails in both languages at once. Each case has an
`input`, and the expected results that apply to it:

- `pages`: the expansion, one entry per PDF page, `{ignored, labels}`;
- `normalized`: the expected `normalize()` output;
- `cleaned`: the expected `clean()` output, with `length` when a page count is given;
- `format`: the expected display of each PDF page (`"2+3"`, `"20+29"`);
- `labelsAt`: expected `labelsAt(index)` results, including ignored and out-of-range pages;
- `lookups`: a list of `{pages, indexes, labels}`, the expected `getIndexList(pages)` and
  `getLabelList(pages)`;
- `equals`: pairs, and the expected result for each;
- `plugins`: the names of the plugin systems that every call in the case is given, such as
  `["roman_additive"]`. Without it, none;
- `errors`: for invalid input, every error the input may give, as `{kind, position}`. An
  implementation passes when the error it reports matches one of them. Every kind has at least one
  case.

```json
{"input": "1-5, 3, 1–2",
 "errors": [{"kind": "duplicate-label", "position": 5},
            {"kind": "reserved-char", "position": 8}]}
```

Cases are grouped by feature: syntax, ranges, runs, quoting, numbering, flags, plugins,
normalisation, cleaning, lookups, limits and conversion. The groups include:

- **numbering:**
  - each system;
  - the reading rule: `C-D`, `V-X`, `I-M`, `x-l`, `iv-ix`, `xi-xl`, `CC-CD`;
  - roman numerals that are not canonical: `IIII-V` is `no-system`.
- **flags:** `V-X/latin`, `V-X/roman` → `V-X`, the letters I…X → `I-X/latin`, and the errors
  `1-5/klingon`, `V/latin`, `1-5/` and `IV-X/roman_additive`.
- **plugins:** each plugin system, with its normal forms with and without the plugin:
  A…Ö is `A-Ö/latin_sv` or `A-Z, Å, Ä, Ö`.
- **cleaning:** open ends that can't be closed: `i-`, `A-`, `08-`, `inflikat.1-`.
- **limits:**
  - exactly 1000 labels and a label of exactly 100 code points, and one more of each;
  - no timer, since the test runner's timeout catches a slow fold.
- **conversion:** one case per distinct line of `v2/list_of_grottan_in_v1.txt` (42). Each case
  holds the v1 string, its v2 form from `v2/list_of_grottan_in_v2.txt`, and the pages.
- **v1:** the v1 test cases that still apply.
- **Unicode:** only characters that both languages lowercase and normalise the same way.

### Cross-language test

`cases.json` holds examples someone thought of. CI also runs a generated test, without any test
library:

1. A seeded generator writes a few thousand random inputs to a file. Each input is a page model
   built from:
   - runs of integers, roman numerals, letters and prefixed labels;
   - runs in the plugin systems;
   - single pages, spreads and ignored pages;
   - odd labels (spaces, quotes, `,`, `-`, `+`, `..`, `/`, `\`).

   Each model is written as a plain list, partly folded, and with extra spaces. Each input is run
   twice: with no plugin systems, and with all of them.
2. Each implementation reads the file and writes its results (pages, normal form, error kind) as
   JSON. CI compares the two result files.
3. On the same inputs, each test suite also checks:
   - **round trip:** parsing the normal form gives the model back;
   - **idempotent:** `normalize(normalize(x))` equals `normalize(x)`;
   - **unique:** different spellings of the same model give the same normal form;
   - **not longer:** the normal form is never longer than the plain list, apart from the quotes
     added to labels with spaces and the flags written where systems collide;
   - **`clean` agrees:** for valid input whose only whitespace is U+0020, `clean(x).normalized`
     equals `normalize(x)`.

A failing input is cut down by hand to a small case and added to `cases.json`.

### Publishing

- **The spec leaves draft at the first release,** as version 1.0. Until then it may change wherever
  a small change makes the code smaller.
- **One version number everywhere.** It is the PageSequence version (2.x), so "pagesequence 2.1"
  behaves the same in both languages and on every registry. The spec's "Versioning" section says
  what is a minor and what is a major version.
- **One tag publishes everything.** A tag such as `v2.1.0` triggers a GitHub Actions release. It
  checks that `package.json`, `jsr.json` and `pyproject.toml` carry the tag's version, runs both
  test suites, and then publishes:
  - **npm:** `tsc` builds `dist/` (ESM `.js` and `.d.ts`, with `exports` and `types` in
    `package.json`). Then `npm publish --access public` runs from `ts/`.
    - The `@publication-md` npm organisation is created once on npmjs.com.
    - Use npm trusted publishing: OIDC from GitHub Actions, with npm CLI 11.5.1 or later and Node
      22.14 or later. Then no token is stored, and provenance is generated automatically.
    - Trusted publishing is set up in the package's settings, so the package must exist first.
      Publish the first version by hand, with 2FA, then configure trusted publishing.
  - **JSR:** `deno publish` from `ts/`. The `@publication-md` scope is created once on jsr.io, and
    the package is linked to the GitHub repository there, so the workflow publishes with OIDC and
    no token.
  - **PyPI:** `uv build` then `uv publish` from `py/`, with PyPI **Trusted Publishing** (OIDC)
    configured once on pypi.org for this repo and workflow. PyPI allows this before the project
    exists (a "pending publisher"), so the first release needs no token either. Try it on TestPyPI
    first.

  **Each publish step can be re-run on its own.** It skips a registry that already has the
  version, so a release that failed half-way is finished by re-running the workflow.
- **Register the PyPI name early.** A pending publisher doesn't reserve it. `pagesequence` was free
  on 2026-10-18.
- **Tests without dependencies:** `deno test` (or `node --test`) for JS, and Python's `unittest`.
  The JS package targets current runtimes (Deno 2, Node 22 or later). The Python package needs
  Python 3.11 or later.
- **Licence fields:** `"license": "MIT"` in `package.json` and `jsr.json`, and `license = "MIT"` in
  `pyproject.toml`.
- **Deno** users import from JSR (`jsr:@publication-md/pagesequence`). The v1 package
  `@tvartom/pagesequence` stays on JSR as it is, and its description points to the new package.
- **v1 is tagged** `v1.3.3`, on commit `286b6f1`. That commit holds the code that was published on
  JSR as 1.3.3 on 2025-03-05; versions 1.0.0–1.3.2 were published in February and March 2024. A fix
  to v1 starts from the branch `v1`: that tag plus the one-line test fix in `97b80c6`.

### Consumers

- **publication-md** vendors v1 today (`vendor/pagesequence`).
  - It switches to `@publication-md/pagesequence` from npm, and its stored sequences are converted
    once (see "Conversion from v1").
  - It can store the normal form. Its tools (`toc-sync`, validate) compare sequences with
    `equals`, never as strings. So formatting differences between the sheet and the repo, and
    normal forms written by different versions, are never reported as changes.
  - To show where two sequences differ, it compares their `pages()`.
  - Validate passes the PDF's page count when the PDF is available.
  - Its config lists the plugin systems a project uses, and its tools pass that list to every
    call, so validate and `toc-sync` read the same.
  - `formatAt` replaces publication-md's own label joining (`joinLabels`).
- **Python skills** (`roots.py` and friends) can then use the Python package instead of copying
  the logic.

## Later

Each of these only makes valid some strings that are invalid in 2.0, so each can come in a minor
version:

- **More plugin systems,** and a helper for systems of whole tokens, such as software releases
  (item 20.6b of the review).
- **Fixed-width integers** (`08-12`).
- **Aliases,** such as the Greek final sigma and the Hebrew final forms.
- **A run stepping by something other than its width,** e.g. every second page.
- **A higher label limit,** if a publication needs more than 1000 labels.
