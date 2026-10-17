# Review of PageSequence v2 proposal

Mark `[x]` on the items you want followed, then hand the file back. Each item says what
would change in `pagesequence-v2.md`. Items that are alternatives to each other say so.
Line numbers refer to the proposal as revised for 1.3.

Already good, no change needed: the "Finding what steps" algorithm. All v1 test cases give the
same result with it, and it fixes the two v1 TODOs (`a_i-b_i`, `i_a-i_b`,
`PageSequence.test.ts:364`). The shared `cases.json` contract is also a good call.

## 1. Notation

- [x] **1.3 Keep `,` and `-` as in v1, replace `|` with `+`, add `..` for runs of spreads.**
  Applied, with `+` also used in the display of a page (`2+3`, `20+29`), so notation and display
  are the same again. Sections rewritten: Why (problem 1), Goals, Syntax, Numbering examples,
  Grottan examples, Why these characters, Normalisation, Conversion from v1, API, test data, open
  questions. Since v1 is used in one project, Compatibility became a one-off conversion: no v1
  parser, no `toV2` and no `v1-join` error in the v2 packages.
- [x] **1.1 Recommend the page-count check.** Applied as a recommendation, not a requirement:
  the API section says to pass the PDF's page count to `create(text, length)` whenever it is
  known (`indexLengthAll` in v1, `PageSequence.ts:79`), and that publication-md's validate should
  do so when the PDF is available.
- [x] **1.6 `..` between single labels.** Applied as 1.6b: `..` is only used between pages with
  2 or more labels, and `1..16` is an error (write `1-16`). Changed in the grammar, the Runs
  rules and the normalisation examples.
- [x] **1.7 Labels with spaces in the normal form.** Applied as 1.7b: the normal form quotes
  every label that contains a space (`"Appendix A"-"Appendix C"`); input without quotes is still
  accepted. Changed in the Syntax rules, normalisation step 4, "Why it is shortest" (quotes
  excepted) and the examples.

## 2. Normalisation guarantees

- [x] **2.1 Make equality and normal form agree.** Applied as 2.1b: `equals` compares labels
  exactly, case included; only label lookup (`getIndexList(pages)`, `getLabelList(pages)`)
  ignores case. Changed in the Syntax rules, algorithm step 1 and the API.
- [x] **2.2 Specify what happens when a fold doesn't round-trip.** Applied: step 2 scans left to
  right and at each page takes the longest stretch that folds (the longest, not the one before the
  first failure, since `V-Y` folds where `V-X` doesn't). "Shortest" is now "short": never longer
  than the plain list, and the shortest in the usual case. New examples: `V, W, X` → `V-W, X`,
  `V, W, X, Y` → `V-Y`, `I, J, …, X` → `I-W, X`.
- [x] **2.3 Merge the two continuation rules.** Applied: step 2 has one rule. A stretch (same
  ignored flag, same number of labels) folds when writing it as one item and expanding it gives
  the same pages back; that covers stepping, label kinds, prefixes, case and the hierarchy. "Effect
  on normalisation" now points to step 2, and "Why it is unique" is rewritten to match.
- [x] **2.5 "Spelling of their first occurrence".** Applied: removed from `normalize`, which
  never respells a label. Respelling to the case of the first label of a stretch is now one of
  the `clean` repairs (`I, ii, III` → `I-III`).
- [x] **2.6 Normal forms can change between versions.** Applied in "Effect on normalisation"
  (a new Cyrillic system would fold `"Табл. А", "Табл. Б", "Табл. В"`), in the introduction to
  Normalisation ("written by the same version"), in the strict paragraph (`normalize(x) === x`
  checks against the running version) and in the API (publication-md compares with `equals`,
  never as strings).
- [x] **2.7 Two normalisation modes.** Applied as 2.7a: strict `normalize(text) → string` and
  `clean(text) → { normalized, repairs }` for user input. New paragraph "Strict and cleaning"
  under Normalisation with the repair list; the en dash and all other variant spellings are
  accepted only by `clean`. Also added to the API list and to `cases.json` (`cleaned`,
  `repairs`), and open question 4 (en dash) is closed.

## 3. Gaps that two implementations would fill differently

- [x] **3.1 Define unquoted labels lexically.** Applied: `label = bare | quoted`, and a new
  "Unquoted labels" rule. I also reserved the characters that `clean` repairs (`;` `|` `…`
  `–` `—` `−` `“` `”` `„`). Without that, strict mode would read `1–52` or `1; 2` as one label
  instead of rejecting it, which contradicts 2.7. The quoting rule and normalisation step 4 now
  point to "Unquoted labels".
- [x] **3.2 Handle `.` next to `..`.** Applied as part of "Unquoted labels": a bare label can't
  start or end with `.`, so `1...3` is an error.
- [x] **3.3 Fix the order of steps 3 and 4.** Applied: step 3 tries each system in hierarchy
  order, each time widening with that system's `tokenChars` from the original middles and then
  reading. Example: `xa-xc` (roman widens to `xa`/`xc` and fails, letter reads `a`/`c`).
- [x] **3.4 Define integer width.** Applied in the integer system: a leading zero and two or
  more digits give a fixed width, and the other end must have the same number of digits
  (`08-12` is valid, `08-9` and `08-100` are errors, `9-10` is valid).
- [x] **3.5 Equal ends** (`3-3`, `2+3..2+3`). Applied per function:
  - 3.5a Strict: an error, `equal-ends`, in the Ranges and Runs rules and the error kinds of
    `cases.json`.
  - 3.5b `clean`: a new repair, equal ends → one page.
  - 3.5c Lookups: in the API, `pages` references are parsed with the `clean` rules and the
    repairs are ignored, so `5-5` and `20–21` work.
- [x] **3.7 Case style.** Applied. Since letters are single letters, only roman needs the rule: a
  token in mixed case (`Iv`) is not roman. `Ia-Ic` now works as the prefix `I` plus the letters
  a→c, because the alphabet systems never widen.
- [x] **3.8 Cap expansion.** Applied with a cap of 1000 labels: a new "Limit" rule in Syntax,
  with the error kind `too-long`. The size of each range and run, and the comparison with the
  page count, are computed from the end values before anything is expanded, so `1-1000000000`
  fails at once. The letter part was already solved by single-letter alphabets.
- [x] **3.9 Pin down Unicode.** Applied as a new "Unicode" rule in Syntax.
  - Every function converts its input to NFC, and the normal form is NFC.
  - Lengths, positions and prefixes/suffixes count code points, and a boundary never falls just
    before a combining mark.
  - Lookup uses the full lowercase mapping, which JS `toLowerCase()` and Python `str.lower()`
    share, not case folding (so `ß` ≠ `ss`).

  Two notes:
  - I also reserved every whitespace character other than the plain space, since `clean`
    repairs them. Otherwise `Appendix A` with a no-break space would silently be a different
    label from `Appendix A` with a space.
  - `cases.json` should include `Σ`/`ς`, `İ` and `ß`, to catch the two languages disagreeing
    on lowercasing.
- [x] **3.10 Empty input, empty items and an open end.** Applied as you decided:
  - Strict mode: an empty sequence (`empty`), empty items and a trailing `,` (`empty-item`) and
    an open end (`open-end`) are all errors, with or without a page count. New rule "Nothing
    empty or open" in Syntax. Unlike v1, `create("", 52)` is an error (noted in the API).
  - `clean(text, { length })` closes one open `-` at the very end at the page count
    (`i-iv, 1-` with 52 → `i-iv, 1-48`; `1-` with 1 → `1`, for plain numbering). `""` is the same
    as `1-`. Without a page count, or with no pages left, it is an error. With a page count,
    `clean` also checks the result against it.
- [x] **3.11 List all error kinds in the spec.** Applied: a new section "Error kinds" after
  Normalisation, with a table of 18 kinds (when, example). Each error has a kind and a
  position in code points; the message is up to each implementation. `clean` throws the same
  kinds, and lookups return `undefined` as in v1. `cases.json` now refers to the table and needs
  at least one case per kind.

  Two changes beyond the list:
  - I renamed the example kind `mixed-systems` to `no-system`. It also covers ends that no
    system reads at all (`omslag-baksida`, `Y-AB`).
  - I added `bad-length` and `length-mismatch` for the page count, as v1 has.
- [ ] **3.12 The same label twice.** Collecting the errors showed a gap: the spec doesn't say
  whether a label may appear on two pages that are not ignored (`1-5, 3`). A lookup for `3` is
  then ambiguous; v1 silently takes the last one. Choose one:
  - [ ] 3.12a An error (`duplicate-label`) in strict mode. A real duplicate scan is marked with
    `!`.
  - [ ] 3.12b Allowed; lookups use the first occurrence, and validate warns.

## 4. Numbering hierarchy

- [x] **4.1 Fix the exception examples.** Applied: `C-D`, `L-M` and `C-M` (not roman 100–500,
  50–1000, 100–1000). The same mistake in "Effect on normalisation" (`C, D, E` as `C-E`) is
  replaced by the real case, `V, W, X` as `V-X`.
- [ ] **4.2 Apply the single-letter exception only when both ends are single letters.** With
  single-letter alphabets, `L-LX` is now an error instead of 325 letters, but it should be roman
  50–60.
- [ ] **4.4 Greek and Hebrew.** All alphabets are single letters now, so the wrap problem is gone
  for these two as well. What's left is whether to keep them:
  - [ ] 4.4a Drop them until a real case appears (as open questions 1 and 3 do).
  - [ ] 4.4b Keep them.
- [ ] **4.6 Versioning rule for new systems** (line 186). A new system must use characters no
  existing system uses. Then it only gives meaning to strings that were invalid, and that is a
  minor version. Anything that changes how a valid string reads is a major version.

## 5. API

- [ ] **5.2 List the whole API.** Add `getIndexLength`, `getIndexLengthAll`, `getLabelLength`.
- [ ] **5.6 Define index bases.** `labelsAt(index)` takes a 0-based PDF index that counts
  ignored pages; `diff` messages show 1-based PDF page numbers.

## 6. Errors in the document

- [ ] **6.1 Page counts.** A 48-page born-digital issue is 25 PDF pages, not 24 (lines 12, 220);
  2007-1 is 27 groups, not 26 (line 200).
- [ ] **6.2 1986-1** (line 212). Use the test data (`PageSequence.test.ts:163`): v1
  `1-20 | 29,21-28, !29,30-48`, v2 `1-19, 20+29, 21-28, !29, 30-48`.
- [ ] **6.3 1978-2** (line 214). The proposal and the tests (`PageSequence.test.ts:251`) disagree.
  Use the tests' `1-11, inflikat.0-inflikat.11, 12-24` (or tell me the proposal's version is the
  real one).
- [ ] **6.5 Display.** With `+` the display is the notation, except that quotes are dropped
  (`"Omslag, insida"+2` is shown `Omslag, insida+2`). Say so instead of "no extra rule is
  needed" (line 95).
- [ ] **6.7 Add Grottan examples** 1973-1 (`1-9, 10+11, 10a, 10b+10c, 10d, !11, 12-20`) and
  1990-1 (`I-VIII, 3-22, IX-XVI`, the same in v1 and v2).

## 7. Distribution

- [x] **7.1 v1 is on JSR, not "Deno".** Applied, and checked: `@tvartom/pagesequence` 1.3.3 is
  on jsr.io. v2's TypeScript package is now published to JSR as well as npm (repository layout,
  Publishing, Deno users import from `jsr:`).
- [x] **7.2 npm first publish.** Applied. npm's docs say trusted publishing is set up in the
  package's settings and needs npm CLI 11.5.1 or later; they don't say outright that the package
  must exist first, so the proposal says "seems to" and keeps "verify before release". Also
  dropped `--provenance`: with trusted publishing, npm generates provenance automatically. PyPI's
  pending publishers are now mentioned.
- [ ] **7.3 Split distribution out of the spec.** Move "Distribution and implementations" to a
  separate document, since `spec/` is this document under CC0.
- [x] **7.4 Add property tests.** Applied: a new "Property tests" section after "Shared test
  data", with the generator, five properties (round trip, idempotent, unique, not longer, `clean`
  agrees) and the rule that shrunk failures are added to `cases.json`.

## Resolved or no longer relevant after 1.3

- **1.2 Flag implausible pages:** many labels on one page now needs an explicit `+` each, so it
  can't happen by accident.
- **1.4 Keep the old design with a warning section:** replaced by 1.3.
- **1.5 Accept v1 `|` in v2:** v1 is converted once, so v2 doesn't need to read it.
- **2.4 The 2-page reason:** rewritten. A range of two single pages folds (`1-2` beats `1, 2`);
  two spreads stay listed (`2+3, 4+5` is as short as `2+3..4+5`).
- **3.6 `!` on runs:** the grammar now puts `!` on the whole item, as v1 does.
- **5.1 Page count in `create`:** `create(text, length?)` keeps its v1 signature; there is no
  version option.
- **5.3 `toV1` may throw:** there is no `toV1`. v2 strings with new syntax fail in v1, the rest
  are v1 strings.
- **5.4 Quick syntax check:** removed; the version is never guessed.
- **5.5 Grammar for `pages` references:** a `pages` reference is parsed as a sequence, as in v1,
  and the notation is the same in both.
- **4.3 Two-letter roman numerals:** with single-letter alphabets, a token of two or more
  letters can only be roman, so `CC-CD` has a single reading.
- **4.5 Latin letters after Z:** applied as 4.5a, and extended: every alphabet is single letters
  only (`A … Z`, no `AA`). The proposal's alphabet paragraph says so, and `Y-AB` is an error.
- **6.4 En dash:** settled by 2.7. Only `clean` accepts it, and open question 4 is removed.
- **6.6 The "s. 20,29" argument:** removed from problem 1.
- Also fixed while rewriting: the quoted-label example said `"Omslag, insida"; 2..31` "gives two
  PDF pages"; it is 31.
