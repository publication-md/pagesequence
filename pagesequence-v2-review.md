# Review of PageSequence v2 proposal

Mark `[x]` on the items you want followed, then hand the file back. Each item says what
would change in `pagesequence-v2.md`. Items that are alternatives to each other say so.

Already good, no change needed: the "Finding what steps" algorithm. All v1 test cases give the
same result with it, and it fixes the two v1 TODOs (`a_i-b_i`, `i_a-i_b`,
`PageSequence.test.ts:364`). The shared `cases.json` contract is also a good call.

## 1. Most v1 strings are valid v2 strings with another meaning

Every common v1 string without `|` parses in v2 as a single PDF page:

| v1 string | v1 meaning | v2 meaning |
|---|---|---|
| `1-52` | 52 PDF pages | 1 PDF page, 52 labels |
| `1-20,22-52` | 51 PDF pages | 1 PDF page, 51 labels |
| `i-iv,1-48` | 52 PDF pages | 1 PDF page, 52 labels |
| `Omslag,2-31,Baksida` | 32 PDF pages | 1 PDF page, 32 labels |

The quick syntax check only catches `|`, and `1-52` is what people and LLMs write by habit.

- [ ] **1.1 Make the page-count check mandatory.** Add a section saying that a sequence is always
  checked against the PDF's page count when it is known (v1 already has `indexLengthAll`,
  `PageSequence.ts:79`), and that validate must do so. Name it as the main guard against
  reading a string with the wrong version.
- [ ] **1.2 Flag implausible pages.** Validate warns (or fails) when one PDF page has more than
  4 labels, or when the whole sequence is a single PDF page.
- [ ] **1.3 Consider the alternative design (replaces much of the proposal).** Keep `,` and `-`
  as in v1 and in prose (`,` lists PDF pages, `-` is a range), replace `|` with `+` for labels on
  one PDF page, and add `..` for runs of spreads: `1, 2+3..46+47, 48`. Every v1 string without
  `|` keeps its meaning, so the version flag, the format bump, `toV1` and the misreading risk go
  away, and sequences and `pages` references share one notation. Cost: notation and display
  differ for spreads (`2+3` is shown "2–3"). If marked, I rewrite the Syntax, Why these
  characters, Compatibility and Grottan examples sections around it.
- [ ] **1.4 Keep the current design, but add a section** that names the risk explicitly,
  with the table above, and refers to 1.1 and 1.2.

## 2. Normalisation guarantees

- [ ] **2.1 Make equality and normal form agree.** `equals` ignores case but the normal form
  keeps it, so `Omslag; 2` and `omslag; 2` are equal with different normal forms. Choose one:
  - [ ] 2.1a The claim becomes "equal exactly when normal forms are equal, ignoring case".
  - [ ] 2.1b `equals` becomes case-sensitive; only label lookup ignores case.
- [ ] **2.2 Specify what happens when a fold doesn't round-trip.** In `V; W; X` each pair
  continues as letters, but `V..X` reads back as roman (V–X, 6 labels). Specify a deterministic
  rule: greedy left to right, take the longest fold that round-trips, list what's left. Drop
  "shortest" from the claims, or qualify it.
- [ ] **2.3 Merge the two continuation rules.** Step 3's "same shape" rule and the "Effect on
  normalisation" round-trip rule become one definition, worded for multi-label pages (a
  two-page run, not a "two-label run").
- [ ] **2.4 Fix the 2-page reason.** `1; 2` and `1..2` are both 4 characters with the `; `
  joiner. Keep the rule as a tie-break and change the stated reason.
- [ ] **2.5 Clarify or remove "spelling of their first occurrence"** (step 4, line 213).
- [ ] **2.6 State that normal forms can change between versions** (a new numbering system can
  fold what used to be listed), so publication-md compares with `equals`, never by string.

## 3. Gaps that two implementations would fill differently

- [ ] **3.1 Define unquoted labels lexically.** Replace `number | roman | letter | prefixed |
  word` with a character rule: any characters except `;` `,` `-` `!` `"`, no `..`, trimmed.
  Remove quotes from the examples that don't need them (`"Plansch A"`, `"Tavla α"`).
- [ ] **3.2 Handle `.` next to `..`.** An unquoted label can't start or end with `.`, so
  `1...3` is an error.
- [ ] **3.3 Fix the order of steps 3 and 4.** For each system in order: widen with its
  `tokenChars`, then try to read both ends.
- [ ] **3.4 Define integer width.** A leading zero means fixed width; `9..10` is valid,
  `08..9` is an error.
- [ ] **3.5 Equal ends.** `3..3` and `3-3` are errors (or: mean a single page/label; choose
  when marking).
- [ ] **3.6 `!` applies to a whole item.** Grammar becomes `item = ["!"] labels [".." labels]`;
  `!1..3` is an ignored run, `!1..!3` is invalid.
- [ ] **3.7 Case style.** Roman and letter tokens must be all upper or all lower case; mixed
  case (`Ia`, `Omslag`) is not read by any system.
- [ ] **3.8 Cap expansion.** Letter runs have at most 2 letters, a sequence expands to at most
  10 000 labels, and the page count is checked before expanding. (Today `omslag..baksida` is a
  valid run of hundreds of millions of labels.)
- [ ] **3.9 Pin down Unicode.** Input is normalised to NFC, prefixes and suffixes are computed
  by code point, and case-insensitive matching is defined precisely (JS `toLowerCase` and
  Python `lower`/`casefold` differ).
- [ ] **3.10 Empty input and empty items.** `("", n)` means `1..n` as in v1; `1;;2` and a
  trailing `;` are errors (or ignored; choose when marking).
- [ ] **3.11 List all error kinds in the spec**, since `cases.json` tests them.

## 4. Numbering hierarchy

- [ ] **4.1 Fix the exception examples.** `A..D` and `C..E` could never be roman. Use `C..D`,
  `L..M`, `C..M`.
- [ ] **4.2 Apply the single-letter exception only when both ends are single letters.**
  Otherwise `L..LX` becomes a letter run of 325 labels instead of roman 50–60.
- [ ] **4.3 Document that two-letter labels that are valid roman numerals read as roman**
  (`CC..CD` is 200–400).
- [ ] **4.4 Greek and Hebrew.** Choose one:
  - [ ] 4.4a Drop them until a real case appears (as open questions 1 and 3 do).
  - [ ] 4.4b Keep them, single letters only, no wrap after the last letter (Hebrew numbering
    continues `יא` after `י`, not `אא`).
- [ ] **4.5 Latin letters after Z.** Choose one:
  - [ ] 4.5a No wrap: `Z` is the last letter, `Y..AB` is an error.
  - [ ] 4.5b Keep the bijective wrap (`Z` → `AA`), and say explicitly that Å Ä Ö are not letters
    in this system.
- [ ] **4.6 Versioning rule for new systems.** A new system must use characters no existing
  system uses. Then it only gives meaning to strings that were invalid, and that is a minor
  version. Anything that changes how a valid string reads is a major version.

## 5. API and compatibility

- [ ] **5.1 Keep the page count in `create`.** `create(text, { version: 2, length: 52 })`, and
  say that the old `create(text, 52)` form is gone (or still accepted; choose when marking).
- [ ] **5.2 List the whole API.** Add `getIndexLength`, `getIndexLengthAll`, `getLabelLength`.
- [ ] **5.3 `toV1` may throw.** v1 labels are limited to `[a-z0-9._ ]` (`PageSequence.ts:64`),
  so `Version: 1.0.0`, `Tavla α` and `Omslag, insida` can't be written.
- [ ] **5.4 Correct the quick syntax check.** Quoted v2 labels can contain `|`, and `1..5` is a
  valid v1 label; say "unquoted" and "practically never".
- [ ] **5.5 Say which grammar parses `pages` references:** the v2 `labels` production. It gives
  the same label lists as v1 for `20-21`, `1,3` and `Appendix A - Appendix C`.
- [ ] **5.6 Define index bases.** `labelsAt(index)` takes a 0-based PDF index that counts
  ignored pages; `diff` messages show 1-based PDF page numbers.

## 6. Errors in the document

- [ ] **6.1 Page counts.** A 48-page born-digital issue is 25 PDF pages, not 24 (lines 13, 174);
  2007-1 is 27 groups, not 26 (line 150).
- [ ] **6.2 1986-1.** Use the test data (`PageSequence.test.ts:163`): v1
  `1-20 | 29,21-28, !29,30-48`, v2 `1..19; 20,29; 21..28; !29; 30..48`.
- [ ] **6.3 1978-2.** The proposal and the tests (`PageSequence.test.ts:251`) disagree. Use the
  tests' `1-11,inflikat.0-inflikat.11,12-24` (or tell me the proposal's version is the real one).
- [ ] **6.4 En dash.** Close open question 4: it is already decided in normalisation step 4.
- [ ] **6.5 Display.** Replace "no extra rule is needed" with the actual display rules: `-`
  shown as `–`, quotes dropped.
- [ ] **6.6 Drop the "s. 20,29 names pages on one sheet" argument.** In a table of contents it
  means page 20 and page 29, as in the proposal's own `pages` references.
- [ ] **6.7 Add Grottan examples** 1973-1 (`1..9; 10-11; 10a; 10b-10c; 10d; !11; 12..20`) and
  1990-1 (`I..VIII; 3..22; IX..XVI`).

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
