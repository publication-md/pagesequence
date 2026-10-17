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

- [ ] **2.1 Make equality and normal form agree.** `equals` ignores case but the normal form
  keeps it, so `Omslag, 2` and `omslag, 2` are equal with different normal forms. Choose one:
  - [ ] 2.1a The claim becomes "equal exactly when normal forms are equal, ignoring case".
  - [ ] 2.1b `equals` becomes case-sensitive; only label lookup ignores case.
- [ ] **2.2 Specify what happens when a fold doesn't round-trip.** In `V, W, X` each pair
  continues as letters, but `V-X` reads back as roman (V–X, 6 labels). Specify a deterministic
  rule: greedy left to right, take the longest fold that round-trips, list what's left. Drop
  "shortest" from the claims, or qualify it.
- [ ] **2.3 Merge the two continuation rules.** Step 2's "same shape" rule (line 208) and the
  "Effect on normalisation" round-trip rule (line 141) become one definition.
- [ ] **2.5 Clarify or remove "spelling of their first occurrence"** (step 3, line 216).
- [ ] **2.6 State that normal forms can change between versions** (a new numbering system can
  fold what used to be listed), so publication-md compares with `equals`, never by string.

## 3. Gaps that two implementations would fill differently

- [ ] **3.1 Define unquoted labels lexically.** Replace `number | roman | letter | prefixed |
  word` with a character rule: any characters except `,` `-` `+` `!` `"`, no `..`, trimmed.
  (The quotes in the Numbering examples, `"Plansch A"` and `"Tavla α"`, now match the normal
  form and can stay.)
- [ ] **3.2 Handle `.` next to `..`.** An unquoted label can't start or end with `.`, so
  `1...3` is an error.
- [ ] **3.3 Fix the order of steps 3 and 4.** For each system in order: widen with its
  `tokenChars`, then try to read both ends.
- [ ] **3.4 Define integer width.** A leading zero means fixed width; `9-10` is valid,
  `08-9` is an error.
- [ ] **3.5 Equal ends.** `3-3` and `2+3..2+3` are errors (or: mean a single page; choose
  when marking).
- [ ] **3.7 Case style.** Roman and letter tokens must be all upper or all lower case; mixed
  case (`Ia`, `Omslag`) is not read by any system.
- [ ] **3.8 Cap expansion.** Letter ranges have at most 2 letters, a sequence expands to at most
  10 000 labels, and the page count is checked before expanding. (Today `omslag-baksida` is a
  valid range of hundreds of millions of labels.)
- [ ] **3.9 Pin down Unicode.** Input is normalised to NFC, prefixes and suffixes are computed
  by code point, and case-insensitive matching is defined precisely (JS `toLowerCase` and
  Python `lower`/`casefold` differ).
- [ ] **3.10 Empty input and empty items.** `("", n)` means `1-n` as in v1; `1,,2` and a
  trailing `,` are errors (or ignored; choose when marking).
- [ ] **3.11 List all error kinds in the spec**, since `cases.json` tests them.

## 4. Numbering hierarchy

- [ ] **4.1 Fix the exception examples** (line 133). `A-D` and `C-E` could never be roman. Use
  `C-D`, `L-M`, `C-M`.
- [ ] **4.2 Apply the single-letter exception only when both ends are single letters.**
  Otherwise `L-LX` becomes a letter range of 325 labels instead of roman 50–60.
- [ ] **4.3 Document that two-letter labels that are valid roman numerals read as roman**
  (`CC-CD` is 200–400).
- [ ] **4.4 Greek and Hebrew.** Choose one:
  - [ ] 4.4a Drop them until a real case appears (as open questions 1 and 3 do).
  - [ ] 4.4b Keep them, single letters only, no wrap after the last letter (Hebrew numbering
    continues `יא` after `י`, not `אא`).
- [ ] **4.5 Latin letters after Z.** Choose one:
  - [ ] 4.5a No wrap: `Z` is the last letter, `Y-AB` is an error.
  - [ ] 4.5b Keep the bijective wrap (`Z` → `AA`), and say explicitly that Å Ä Ö are not letters
    in this system.
- [ ] **4.6 Versioning rule for new systems** (line 150). A new system must use characters no
  existing system uses. Then it only gives meaning to strings that were invalid, and that is a
  minor version. Anything that changes how a valid string reads is a major version.

## 5. API

- [ ] **5.2 List the whole API.** Add `getIndexLength`, `getIndexLengthAll`, `getLabelLength`.
- [ ] **5.6 Define index bases.** `labelsAt(index)` takes a 0-based PDF index that counts
  ignored pages; `diff` messages show 1-based PDF page numbers.

## 6. Errors in the document

- [ ] **6.1 Page counts.** A 48-page born-digital issue is 25 PDF pages, not 24 (lines 12, 180);
  2007-1 is 27 groups, not 26 (line 160).
- [ ] **6.2 1986-1** (line 172). Use the test data (`PageSequence.test.ts:163`): v1
  `1-20 | 29,21-28, !29,30-48`, v2 `1-19, 20+29, 21-28, !29, 30-48`.
- [ ] **6.3 1978-2** (line 174). The proposal and the tests (`PageSequence.test.ts:251`) disagree.
  Use the tests' `1-11, inflikat.0-inflikat.11, 12-24` (or tell me the proposal's version is the
  real one).
- [ ] **6.4 En dash.** Close open question 4 (line 352): it is already decided in normalisation
  step 3 (line 216).
- [ ] **6.5 Display.** With `+` the display is the notation, except that quotes are dropped
  (`"Omslag, insida"+2` is shown `Omslag, insida+2`). Say so instead of "no extra rule is
  needed" (line 67).
- [ ] **6.7 Add Grottan examples** 1973-1 (`1-9, 10+11, 10a, 10b+10c, 10d, !11, 12-20`) and
  1990-1 (`I-VIII, 3-22, IX-XVI`, the same in v1 and v2).

## 7. Distribution

- [ ] **7.1 v1 is on JSR, not "Deno".** Fix the wording, and consider publishing v2 to JSR too
  (`@publication-md/pagesequence`), next to npm.
- [ ] **7.2 npm first publish.** Note that, as far as I know, npm trusted publishing can only be
  set up for an existing package, so the first publish needs a token (PyPI has pending
  publishers). To verify before release.
- [ ] **7.3 Split distribution out of the spec.** Move "Distribution and implementations" to a
  separate document, since `spec/` is this document under CC0.
- [ ] **7.4 Add a property test** in both languages: random page model → `normalize` → parse →
  same model.

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
- **6.6 The "s. 20,29" argument:** removed from problem 1.
- Also fixed while rewriting: the quoted-label example said `"Omslag, insida"; 2..31` "gives two
  PDF pages"; it is 31.
