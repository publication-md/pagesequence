# Review: PageSequence v2 proposal

Reviewed `pagesequence-v2.md` as it stands on 2026-10-18 (547 lines). Only the current document
was reviewed. The v1 source in this repo (`PageSequence.ts`, `Roman.ts`, tests) was used only to
check what the proposal says about v1. No git history or earlier reviews were consulted.
Line numbers (`:123`) refer to `pagesequence-v2.md`.

## Verdict

The design holds together. Every worked example in the document comes out as stated when the
rules are implemented literally (see "What was checked"). The gaps are in what makes it a
**contract between two implementations**:

- which error is reported, and where;
- the exact character sets and Unicode version;
- a few numbering edge cases where the text allows two readings;
- how the v1 conversion actually gets its page model.

Close these before `testdata/cases.json` is written. The test file can only be as exact as the
spec.

**7 high, 12 medium, 13 low action points, and 5 suggested open questions.**

## What was checked

| Check | Result |
|---|---|
| v1 (run under Node 26) against the claims about v1 | `C-D` is roman 100–500 (401 labels) ✔. `create("", 52)` works in v1 ✔. `3-3` is already an error in v1 ✔. All 11 Grottan examples and both conversion examples give the same page model in v1 and v2 ✔ |
| Throwaway Python prototype of v2 numbering, parsing and normalisation, written from the text alone | Numbering table 9/9 ✔. Hierarchy statements ✔. Normalisation examples 15/15 ✔. All 11 Grottan v2 strings are already in normal form ✔. Error table 32/33: `Hej!` depends on lexing (H1) |
| Node 26 (Unicode 17.0) vs Python 3.13 (Unicode 15.1), over all code points | 55 code points lowercase differently. The whitespace and digit sets differ (H2) |
| Registries, 2026-10-18 | On PyPI, `pagesequence`, `publication-md-pagesequence` and `page-sequence` are free. npm: nothing published under `@publication-md`. JSR: scope `@publication-md` doesn't exist yet. GitHub: `publication-md/pagesequence` exists and is this repo's `origin` |

The prototype and check scripts were throwaway and are not in the repo.

---

## High: close before writing `cases.json`

### H1. Define which error wins, and where its position points
`:366-393`

**Problem.** `cases.json` checks the error *kind and position* (`:477`), but the spec doesn't say
which error is reported when there are several, or what the position points at:

- `Hej!` is `reserved-char` in the table, but a lexer that treats `!` as an operator reports
  `syntax`. My prototype did.
- `1+2..1+4` can be `equal-ends` (first column) or `uneven-run`.
- In `1-5, 3, 1–2`, the `duplicate-label` comes before the `reserved-char` in the text, but a
  lexer finds the en dash first.
- `create("1-1000000000", 52)` is both `too-long` and `length-mismatch`.
- `bad-length` and `length-mismatch` have no position in the input at all.

**Action.**
- [ ] Write down an order. For example: lexical errors left to right, then syntax, then numbering
  errors per item (in item order, then column order within a run), then whole-sequence errors
  (`duplicate-label`, `too-long`), then `length-mismatch`.
- [ ] Say what the position is for each kind:
  - the offending character;
  - the start of the item;
  - the second occurrence of a duplicate;
  - the item that passes 1000 labels;
  - `null` (or 0) for `bad-length` and `length-mismatch`.
- [ ] Say when `!` is an operator (only as the first non-space character of an item) and when it
  is a reserved character inside a label. Do the same for `"` inside a bare label (`My"label`).
- [ ] Add table rows for the cases not covered: `-5` (open start), `2+`, `+3`, `1..`, `2+3..`,
  `!` alone, `!!3`, `1-!3`, `"a"b`.

### H2. Pin character classes and the Unicode version
`:43-57`, `:147-165`

**Problem.** The spec relies on "every whitespace character", "Unicode category M", NFC, and a
lowercase mapping that JS and Python supposedly agree on ("which give the same result", `:56`).
In practice they differ:

- Node 26 (Unicode 17.0) and Python 3.13 (Unicode 15.1) lowercase **55 code points differently**
  (e.g. U+A7CB, U+10D50). `toLowerCase()` and `str.lower()` agree only at the same Unicode
  version.
- Python `str.isspace()` includes U+001C–U+001F and U+0085. JS `\s` excludes them and includes
  U+FEFF.
- Python `re` `\d` matches 680 code points, JS `\d` matches 10, and Python `int("٣")` is `3`.
- `tokenChars` (the characters a numbering system treats as part of its token) are never listed
  for roman or integer.

**Action.**
- [ ] List the reserved whitespace as explicit code points, for example the Unicode `White_Space`
  property written out. Say whether U+FEFF is included.
- [ ] State that the integer system reads ASCII `0-9` only. List the roman `tokenChars`
  (`IVXLCDM` and `ivxlcdm`).
- [ ] Pin a Unicode version for NFC, lowercasing and category M. Alternatively, say "the runtime's
  version" and accept that newer characters can differ. Either way, drop "which give the same
  result".
- [ ] Add `cases.json` cases with the divergent characters above, so both implementations must
  agree.

### H3. Bound the integer system
`:162-165`

**Problem.** There is no maximum value. JS loses precision above 2^53:
`Number("9007199254740993")` is `9007199254740992`. So `9007199254740993-9007199254740995`
expands differently in JS (or not at all) than in Python, which has big integers.

**Action.**
- [ ] Limit integer tokens, e.g. to at most 15 digits or values ≤ 2^53−1, and make longer ones
  unreadable (`no-system`). Or require BigInt in JS. Add a case.

### H4. A final-form alias at a range end rewrites the label
`:159-161`, `:285-286`

**Problem.** The text says "`ς` is read as `σ`, never generated". But a range's labels are
generated from values, so an alias at an **end** gets replaced:

- `"Tavla ς"-"Tavla ω"` gives `Tavla σ, …`.
- `"לוח א"-"לוח ך"` ends in `לוח כ`.

The label the user wrote disappears, and a lookup for it fails. This contradicts "Labels are
written exactly as in the input" (`:285`).

`"Tavla ς"-"Tavla σ"` has equal values but different strings. Neither `equal-ends` nor
`descending` covers it, so it silently becomes one page.

**Action.**
- [ ] Choose one. (b) is simpler.
  - (a) Keep both ends verbatim and generate only the labels between them.
  - (b) Make an alias unreadable as a range or run end (`no-system`).
  - (c) Drop aliases until a real case needs them (see Q3).

### H5. Make the label grammar exact
`:37-39`, `:58-64`

**Problem.**
- `char` is undefined, and is used for both bare and quoted labels. If it includes `\`, then
  `"a\\"` is ambiguous: an escaped backslash, or a literal `\` followed by `\"`.
- `bare = { char }` allows an empty label, and `quoted` allows `""`. The prototype accepts
  `"", 1-3` as a page with an empty label.
- Nothing says whether `"a"b` (a quoted label followed by bare text) or `"a" "b"` is allowed.
- Control characters (newline, tab, U+0000) are allowed inside quotes.
- The EBNF literals `'\\"'` and `'\\\\'` read as two or four characters depending on the reader.

**Action.**
- [ ] `bare = barechar { barechar }`, with `barechar` defined by what it excludes.
- [ ] Define the quoted label:
  - `qchar` = any character except `"` and `\`;
  - `escape` = `\` followed by `"` or `\`;
  - say whether a `\` before any other character is literal or an error.
- [ ] Decide on `""`: an error (`empty-item`), or the way to write an unlabelled page (Q1).
- [ ] Forbid control characters (category Cc), even inside quotes.
- [ ] State that a quoted label can't touch other label text (`"a"b` → `syntax`). This also
  settles open question 3 for now.

### H6. Make the v1 conversion workable
`:395-407`

**Problem.** The plan is to expand "every stored v1 sequence with the v1 module" and build "the v2
page model from it". That doesn't work as described:

- v1 doesn't expose how labels are grouped into pages.
- v1 **doesn't keep the labels of ignored pages at all**. `1,2|3,!3,4` gives four pages, but the
  label of the ignored page is neither in `getLabelList()` nor in the private `labelMap`.

v1 accepts things v2 rejects:

- duplicate labels, e.g. `1-5, 3` or `Omslag, 2-3, omslag`, where lookup silently returns the last
  one;
- empty strings with a page count (`create("", 52)`);
- more than 1000 labels.

Some v1 strings read differently in v2, not only `C-D`:

- `I-L`: 50 roman labels in v1, 4 letters in v2;
- `L-M` and `C-M`: 951 and 901 roman labels in v1;
- `08-12`: v1 drops the zero (`8, 9, …`).

Stored *references* (part-block `pages`) aren't mentioned, but v2 parses them differently: clean
rules, letter readings, duplicate check.

**Action.**
- [ ] Build the model by splitting each v1 string on `,` and parsing each section on its own.
  v1 labels can't contain `,`. For each section: strip `!` and record it, split the `|` groups,
  and use the v1 module only to expand ranges.
- [ ] Have the script report, and stop on:
  - v2 errors (duplicates, too long);
  - empty stored strings (they need the PDF page count);
  - every sequence whose *text* reads differently in v2 than in v1. These are likely v1 data bugs
    worth a human look, not something to preserve silently.
- [ ] Also check stored references: for each one, compare v1 `getIndexList(ref)` with v2's.

### H7. `clean` changes can change how stored data reads
`:205-207` vs `:427-432`

**Problem.** The versioning rules say a change to `clean` "only affects what people type, never
how stored data reads", so it is a minor version. But `getIndexList(pages)` and
`getLabelList(pages)` parse stored references with the `clean` rules. A changed repair therefore
changes what a stored part block points to.

**Action.**
- [ ] Choose one, then make the Versioning and Publishing text agree with it:
  - (a) The repairs used for references are a fixed, versioned list. Only adding a repair that
    turns an error into a result is a minor version.
  - (b) References are parsed strictly, plus a small fixed set of repairs (dashes, `5-5`).
  - (c) References are stored normalised.

---

## Medium

### M1. Specify how to find the longest fold efficiently
`:279-284`, `:86-89`

**Problem.** Read literally ("take the longest stretch starting there that folds"), the search
builds and compares every candidate, which is O(n³).

The prototype timed `1, x2, 3, x4, …`, where nothing folds but every candidate has the right size:

| Labels | Time |
|---|---|
| 100 | 0.6 s |
| 200 | 3.4 s |
| 400 | 19 s |

At the 1000-label limit that means minutes in Python, for a valid input. It also undercuts the
denial-of-service reason for having a limit.

**Action.**
- [ ] Say that a candidate's size is computed from its two ends first (as for `too-long`) and that
  labels are compared lazily, stopping at the first mismatch. Or describe the per-reading
  approach: from each start, each way a system can read it gives one generated sequence; match it
  forward once.
- [ ] Add a timing case at 1000 labels to both test suites.

### M2. Fix or replace the I/V/X exception
`:184-188`

**Problem.**
- "When both middles are single letters": before or after roman widening? `CC-CD` is 201 roman
  labels with the widened middles (`CC`/`CD`), but the 2 letters `CC, CD` with the raw middles
  (`C`/`D`).
- The exception also turns some roman ranges into errors: `x-l`, `v-l` and `i-c` read as
  descending letters.

**Tested alternative: the shortest span wins.** When several systems read both ends, the reading
with the fewest labels wins, and hierarchy order breaks ties. Prototype results, against the
current rules:

| Rule | Roman ranges within 1–100 read wrongly (both cases) | Letter ranges A–Z read wrongly (both cases) |
|---|---|---|
| Current (hierarchy + exception) | 14: `i-l` as letters; `i-c`, `v-l`, `v-c`, `x-l`, `x-c`, `l-c` are errors | 6: `I-V`, `I-X`, `V-X` read as roman |
| Literal: every valid reading competes | 86, e.g. `iv-ix` → `iv, iw, ix` and `vi-xi` → `vi, wi, xi` | 4: `I-V`, `I-X` |
| Refined: only readings that cut the label at the same place compete | 4: `i-l`, `v-x` as letters | 4: `I-V`, `I-X` |

- **The literal version fails.** The letter system can read a narrower cut than roman: in `iv-ix`
  it takes the shared `i` as a prefix and steps `v`→`x`, which gives fewer labels.
- **The refined version needs no exception.** `C-D`, `L-M`, `C-M` and `I-L` are still letters.
  `I-V`, `I-X`, `iv-ix` and `L-LX` are still roman.
- It changes exactly one valid reading: `V-X` becomes the letters V, W, X. Roman V–X then
  normalises to `V-IX, X`.
- It turns the six errors above into roman ranges (e.g. front matter `x-l`), and makes
  `V+W..X+Y` work (L3).
- The numbering table, the error table and the Grottan examples are unchanged. Of the
  normalisation examples, only `V, W, X` changes: it becomes `V-X` instead of `V-W, X`.
- The tie-break never triggers with the built-in systems (0 ties in 452 × 452 label pairs). It only
  matters for systems added later.
- It still reads `CC-CD` as roman 201.

**Action.**
- [ ] Recommended: replace the exception with the refined rule. Suggested wording:

  > Try each system as now. Drop readings that are invalid (descending, different case or
  > width, uneven run). The first remaining reading in hierarchy order fixes where the label is
  > cut. Of the remaining readings with that cut, the one with the fewest labels wins; equal
  > counts go by hierarchy order. If no reading is valid, report the error of the first system
  > that read both ends.

- [ ] Or keep the exception: apply it to the middles left by steps 1–2, before widening, and
  reword it to "at least one of them is not I, V or X, in either case".
- [ ] Either way, add `CC-CD`, `V-X`, `iv-ix` and `x-l` as cases.

### M3. Pin the roman system
`:116-118`, `:157`

**Problem.**
- Widening crosses case. `"Kap. Ci"-"Kap. Civ"` widens to `Ci`/`Civ`, which is mixed case and
  not roman, so it ends in `no-system`.
- `Civ-Cix` widens to `Civ`/`Cix`, fails as roman, and is then read as the *letters* v→x
  (`Civ, Ciw, Cix`) instead of roman iv→ix.
- The accepted forms aren't stated: canonical subtractive only, or also `IIII` and `IC`? What
  maximum (`MMMM`)?

**Action.**
- [ ] Widen only over `tokenChars` of the same case as the middle.
- [ ] Read only canonical numerals, 1–3999, so `format(match(t)) == t` for every token. State
  that invariant for every system.
- [ ] Add these as cases.

### M4. Define how `clean` closes an open end that isn't a plain number
`:337-340`

**Problem.** "Finding what steps" needs both ends; with only one end there is no common prefix.
Several open ends have more than one reading:

- `V-` with 6 pages could be roman (`V-X`) or letters (only 5 letters exist from V to Z).
- `C-` with 2 pages could be `C-CI` (roman) or `C-D` (letters).
- `1a-`, `inflikat.1-` and `08-` all need a rule.

**Action.**
- [ ] Choose one:
  - allow an open end only after a label that one system reads as a whole token (integer first,
    then the hierarchy), checked by round trip;
  - or define a single-label rule, e.g. the last token that some system reads, in hierarchy order.
- [ ] Add cases for `i-`, `A-`, `08-` and `inflikat.1-`.

### M5. Pin what a lookup returns
`:427-432`

**Problem.** "Keep their meaning" leaves v1's quirks implicit:

- Repeated indexes are removed only when they are next to each other. `getIndexList("20-29")` on
  1986-1 gives `[19,20,…,27,19]` (index 19 twice). `"3-4, 3"` on `1-5` gives `[2,3,2]`.
- Lookup is by label, not by physical span. `"10-12"` on 1973-1 gives `[9,14]` and skips the
  inserted pages 10a–10d.
- Parsing references as v2 sequences adds new failures. `"3, 3"` gives `[2]` in v1, but in v2 it
  hits `duplicate-label` and returns `undefined`.

**Action.**
- [ ] State the result order and the rule for repeats: keep v1's, or switch to unique indexes in
  first-seen order and list that under breaking changes (M6).
- [ ] Say whether references are exempt from `duplicate-label`.
- [ ] Document that a reference means labels, not a span. If part blocks need physical spans, add
  `getIndexSpan(pages)`: from the page of the first label to the page of the last label (see Q5).

### M6. Add an explicit "Breaking changes from v1" list
`:411`

**Problem.** The API section says "The class keeps the v1 API and meaning, with a few
additions". In fact several things change:

- `|` is invalid;
- `create("", n)` is an error;
- duplicate labels are errors;
- `C-D`, `L-M` and `I-L` read as letters;
- `08-12` keeps its zeros;
- references are parsed with the `clean` rules;
- errors have kinds;
- possibly the shape of lookup results (M5).

**Action.**
- [ ] List these in one place, with what consumers must change. For example, code that relied on
  the empty default needs ``create(text || `1-${n}`, n)``.

### M7. Specify the `clean` repairs exactly
`:326-347`

**Problem.**
- `cases.json` expects repair kinds (`:474`), but they are never named.
- Nothing says repairs apply only outside quotes. A straight-quoted label containing `“hej”` or
  `…` would be rewritten.
- Positions after earlier repairs are undefined.
- "Different spelling" doesn't say whether only the stepping token or the whole label is
  re-cased (`Plansch A, plansch B`).

**Action.**
- [ ] Give repair kinds their own table, like error kinds: `dash`, `semicolon`, `pipe`,
  `ellipsis`, `single-label-run`, `curly-quote`, `space`, `empty-item`, `equal-ends`, `open-end`,
  `case`.
- [ ] Positions refer to the NFC input before any repair.
- [ ] No repair applies inside straight quotes. Curly quotes are the exception: they still have
  to be recognised as quotes.
- [ ] Optional: repair `P-Q` to `P..Q` when both pages have the same number (2 or more) of
  labels. It has only one reading, and it is the most likely mistake, since `-` is the range
  operator.

### M8. Fix the precondition of the "`clean` agrees" property test
`:498-499`

**Problem.** The precondition is "valid input with no labels that differ only in case".
`I, ii, III` meets it, since no two of its labels are equal ignoring case. But `clean` respells it
to `I-III`, so the property fails on valid generated input.

**Action.**
- [ ] Change the precondition to "no stretch that would fold after case respelling", or have the
  generator use one case per numbering run.

### M9. Close the gaps in `cases.json` and testing
`:466-502`

**Problem.**
- The case schema has no fields for lookups (`getIndexList(pages)`, `getLabelList(pages)`), which
  are what the v1 tests exercise most.
- It also has nothing for `length` and `length-mismatch`, `clean` with `length`, or
  `labelsAt`/`formatAt` on ignored and out-of-range pages.
- Property tests run separately in each language, so nothing checks that the two implementations
  agree on *random* input.

**Action.**
- [ ] Add `length`, `lookups: [{pages, indexes, labels}]` and per-index `labelsAt` to the schema,
  and write a JSON Schema for the file.
- [ ] Add a cross-language test in CI: a seeded generator writes N inputs, both implementations
  write their results as JSON, and CI compares the two.
- [ ] Carry over the v1 test cases that still apply.

### M10. Fill in the API surface
`:352-364`, `:409-442`

**Problem.**
- For `equals(a, b)` and `diff(a, b)`, it isn't said whether the arguments are strings or
  instances, or what happens on invalid input (throw, or return `false`).
- `diff` has no defined result for equal input, for different lengths, or for pages that differ
  only in the ignored flag (`1, !2` vs `1, 2`).
- There is no public way to get the page model, although `cases.json` compares `pages`.
- No error type is named.
- No Python names are given.

**Action.**
- [ ] Define the signatures of `equals` and `diff`.
- [ ] Define `diff`'s result: `null`, or `{index, a: {ignored, labels} | null, b: …}`.
- [ ] Add `pages()` (or `toJSON()`).
- [ ] Define `PageSequenceError {kind, position}` in both languages.
- [ ] Give the Python names: `PageSequence(text, length=None)`, `get_index_list`, `labels_at`,
  `clean(text, length=None)`, and `create` returning `None`.

### M11. Tighten the publishing plan
`:444-530`

**Findings as of 2026-10-18.**
- PyPI: `pagesequence` is free, and so are `publication-md-pagesequence` and the confusable
  `page-sequence`. The fallback name isn't needed if the name is registered soon. A pending
  publisher doesn't reserve the name.
- JSR: the scope `@publication-md` doesn't exist yet. npm: nothing is published under
  `@publication-md`.
- npm's docs require npm CLI ≥ 11.5.1 **and Node ≥ 22.14.0** for trusted publishing. Provenance
  is automatic only for a public repo and a public package.
- npm's docs set up the trusted publisher in the package's settings and don't describe a first
  publish of a new package over OIDC. Third-party guides say the first publish has to be manual.

**Problems.**
- `js/` has no build step. Node refuses to strip types from `.ts` files under `node_modules`
  (`ERR_UNSUPPORTED_NODE_MODULES_TYPE_STRIPPING`), so the npm package must ship compiled `.js` and
  `.d.ts`. JSR takes the `.ts` source.
- Nothing checks that `package.json`, `jsr.json` and `pyproject.toml` all carry the tag's version.
- There is no plan for a partly failed release, e.g. npm published but PyPI failed.
- The JS test runner isn't named.
- This repo already *is* `publication-md/pagesequence`, so the new layout replaces v1's flat
  layout in place.

**Action.**
- [ ] Add the npm build: `tsc` → `dist/`, ESM, with `exports` and `types`.
- [ ] Add a CI step that fails if any manifest's version differs from the tag.
- [ ] Make each publish step re-runnable on its own, skipping a registry that already has the
  version.
- [ ] Name the test runner (`deno test`, `node --test` or vitest) and the minimum Node and Python
  versions.
- [ ] Plan the first npm publish as a manual publish with 2FA, then configure trusted publishing.
- [ ] Register the PyPI name early.
- [ ] Tag or branch v1 1.3.3 before restructuring, so a v1 fix is still possible.
- [ ] Add SPDX `license` fields to all three manifests.

### M12. Separate the format spec from the project plan
`:446-464`

**Problem.** `spec/` is meant to hold "this document, once settled" under CC0. But the document
mixes the normative format with motivation and internal material: the Grottan markup agents,
"the brief", `joinLabels`, `roots.py`, the release plan and the v1 conversion. A second
implementer can't tell which parts are requirements.

**Action.**
- [ ] Split out `spec/pagesequence.md`: syntax, numbering, normal form, errors, repairs and API
  semantics, written with MUST/SHOULD.
- [ ] Turn the rest into a non-normative design and migration note.
- [ ] Move the Grottan examples into `cases.json`, and keep a few generic examples in the spec.

---

## Low: wording and small clarifications

- [ ] **L1** `:442`: `toString()` "writes the canonical (shortest) form", but `:300-301` says the
  normal form isn't always the shortest. Say "the normal form".
- [ ] **L2** `:544-545`: Open question 2 (the three-page fold-out) is already answered at `:85`.
  Remove it.
- [ ] **L3** `:80-82`, `:388`: `run-shape` "different prefixes" means nothing when each column is
  numbered on its own, because a prefix mismatch already gives `no-system`. Define it or drop it.
  Also say that each column picks its own system: `V+W..X+Y` is `uneven-run` because the first
  column reads `V→X` as roman, while `T+U..X+Y` works. The refined rule in M2 fixes this case.
- [ ] **L4** `:78-79`: "So each sequence has one way to be written" → "so a run of single pages
  has one notation". There are many spellings and one normal form.
- [ ] **L5** `:42`: "Whitespace around …" → "Spaces (U+0020) around …", since all other
  whitespace is reserved (`:45-46`).
- [ ] **L6** `:390`: `duplicate-label` says "appears on two pages", but it also covers one page
  (`2+2`). Say "appears twice".
- [ ] **L7** `:181-182` vs `:201-204`: a gematria system would share characters with the Hebrew
  alphabet, which the versioning rule forbids in a minor version. Say it would be a major
  version, or a style of the same system.
- [ ] **L8** `:199`:
  - "The diff works on the unquoted text" means the prefix/suffix comparison, not the `diff()`
    function. Rename it.
  - "Rule 4" and "normalisation step 2" point to a section that hasn't been introduced yet. Move
    "Effect on normalisation" after "Normalisation and comparison".
  - Merge its versioning bullet with "Publishing → One version number" (`:506-510`).
- [ ] **L9** `:9-10`, `:245`:
  - "…counted the born-digital sequences wrongly in 40 issues and left out a correct
    `pageSequence`" is unclear: left out where?
  - `:245` refers to "the brief", which is never defined, and repeats the 2016-4 example. Delete
    that line.
- [ ] **L10** `:403`: "Most strings come out unchanged" is true of the meaning, not the text. Any
  v1 string not written with `, ` or not fully folded changes, e.g. `1-3,A,B,4-6` →
  `1-3, A-B, 4-6`.
- [ ] **L11** `:54-55`: "never placed just before a combining mark": say the boundary moves so the
  common part shrinks (the prefix boundary back, the suffix boundary forward).
- [ ] **L12** `:337-340`: say whether an ignored open range (`1-10, !11-`) can be closed.
- [ ] **L13** `:537-538`: "navigation-line stripping" isn't explained and isn't in the API.
  Explain it or drop it.

---

## Suggested open questions

- **Q1. Unlabelled pages.** Blank pages, plates and inserts without a printed number currently
  need invented unique names. Is `""` allowed? Should there be a placeholder that is exempt from
  `duplicate-label`?
- **Q2. Swedish letters.** `X-Ö` and `"Bilaga Å"`-style ranges are `no-system`. Should Å, Ä, Ö
  follow Z in the Latin table? Danish and Norwegian use the order Æ, Ø, Å, so one table can't serve
  all three. Adding letters after Z only makes invalid strings valid, so it is a minor version.
- **Q3. Greek and Hebrew now or later.** By the document's own rule, a new system is a minor
  version. Shipping only Latin removes the alias question (H4) from 2.0. Whether the alphabet code
  is generic can be tested in unit tests without making Greek and Hebrew part of the format.
- **Q4. The 1000-label limit.** It is plenty for Grottan, but low for a general npm/PyPI library
  (books, bound annual volumes). Raising it later is a minor version, but it depends on M1.
- **Q5. Span lookup.** Should a part block's `pages` mean the labels listed (as in v1) or the
  physical span between them (M5)?
