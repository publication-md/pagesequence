# Review: PageSequence v2 proposal

Reviewed `pagesequence-v2.md` as it stood on 2026-10-18 (547 lines), before the format was split
out into `spec/pagesequence.md` (item 19). Line numbers (`:123`) refer to that version. The v1
source in this repo (`PageSequence.ts`, `Roman.ts`, tests) was used only to check what the
proposal says about v1. No git history or earlier reviews were consulted.

**Revised after the author's responses.** Four principles now apply:

- keep the library small;
- behaviour outside the strict model may differ between languages;
- the error order follows the simplest implementation;
- folding must be simple and bounded.

Items 1, 2, 3, 8 and 9 were rewritten to follow them, and item 20 (range flags) was added. Item 20
follows the author's design, and flags are in 2.0: `V-X/latin`, with plugins for the systems
beyond the three built-in ones. The author has also decided that `!` and `"` are reserved inside
labels and must be quoted (1.4a), and that a test case lists every error it allows (1.2).

**Numbering.** Items 1–7 are high priority and 8–20 medium. Item 21 collects the low-priority
points and item 22 the open questions. Action points are numbered *item.point* (1.1, 1.2, …), and
the entries of a sub-list add a letter (1.4a, 1.4b).

**Checkboxes.** A checkbox marks a point that is still an option. The author ticks the points to
act on, and a point loses its box once it is implemented. So a ticked box is chosen but not done
yet, and an unticked box is an option that is still open, with the reason it waits in italics. A
point without a box is implemented or settled, or is an alternative that was not chosen.

**Status (2026-10-18).** Every point without a box is in `spec/pagesequence.md` (the format) or
`pagesequence-v2.md` (the design and migration note). The ticked points left need files that don't
exist yet, and `ROADMAP.md` has a task for each:

- 8.3, 9.2, 10.3, 11.2, 16.3, 16.4 and 19.3: cases in `testdata/cases.json` (phase 2);
- 16.2: the cross-language test (phase 5, then CI);
- 18.8: licence fields in the manifests (phase 6);
- 6.3: the reference check in publication-md (phase 6);
- 18.2: the version check in CI (phase 7);
- 18.6: registering the PyPI name (phase 8).

## Verdict

The design holds together. Every worked example in the document comes out as stated when the
rules are implemented literally (see "What was checked"). The gaps are in what makes it a
**contract between two implementations**:

- which error is reported, and where;
- the exact character sets and Unicode version;
- a few numbering edge cases where the text allows two readings;
- how the v1 conversion actually gets its page model.

Close these before `testdata/cases.json` is written. The test file can only be as exact as the
spec. All of them are now closed in the spec.

## What was checked

| Check | Result |
|---|---|
| v1 (run under Node 26) against the claims about v1 | `C-D` is roman 100–500 (401 labels) ✔. `create("", 52)` works in v1 ✔. `3-3` is already an error in v1 ✔. All 11 Grottan examples and both conversion examples give the same page model in v1 and v2 ✔ |
| Throwaway Python prototype of v2 numbering, parsing and normalisation, written from the text alone | Numbering table 9/9 ✔. Hierarchy statements ✔. Normalisation examples 15/15 ✔. All 11 Grottan v2 strings are already in normal form ✔. Error table 32/33: the prototype read `Hej!` as `syntax` because it treated `!` as an operator everywhere. With `!` reserved inside labels (1.4a), the table's `reserved-char` is right ✔ |
| Node 26 (Unicode 17.0) vs Python 3.13 (Unicode 15.1), over all code points | 55 code points lowercase differently. The whitespace and digit sets differ (item 2) |
| Registries, 2026-10-18 | On PyPI, `pagesequence`, `publication-md-pagesequence` and `page-sequence` are free. npm: nothing published under `@publication-md`. JSR: scope `@publication-md` doesn't exist yet. GitHub: `publication-md/pagesequence` exists and is this repo's `origin` |
| Follow-up tests (items 8 and 9) | On 3000 random page models, the linear fold gives the same normal form as the longest-stretch rule, under both the current reading rules and item 9's, and every result reads back to the same pages. Five reading rules were compared over every roman range within 1–100 and every letter range (item 9). Overload probes: a 40 kB input expands to 20 million code points, and a 5000-digit integer crashes Python's `int()` |
| Range flags (item 20) | A prototype of flags (then written `\name`), a Swedish alphabet and a release list. 3000 random page models were normalised both with and without these systems, and every result reads back to the same pages |
| After the review: roman, flags and plugins | The strict roman reader (10.2) accepts exactly the canonical numerals among all 299 592 strings of up to 6 characters from `IVXLCDMa`. A fold with plugins gives the spec's normal forms, e.g. `V-X/latin`, `I-X/roman_additive` and `A-Ö/latin_sv`. A bundle (`deno bundle`) of an app that uses only the core leaves out every plugin when the package declares `"sideEffects": false` |
| Real v1 data: `v2/list_of_grottan_in_v1.txt` (235 strings, 42 distinct) | All 235 parse in v1. Section-by-section parsing (6.1) gives the same pages as v1 for every one. All 235 convert to v2 and read back to the same pages. None is rejected (no duplicates; at most 60 labels), none reads differently in v2 as written, and none needs a flag. 143 keep their text, 12 change only in spacing, and the 80 with `\|` are rewritten. No string uses `!`, 3-label pages, zero padding, spaces in labels or non-ASCII characters |

The prototype and check scripts were throwaway and are not in the repo.

---

## High: close before writing `cases.json`

### 1. Leave the error order to the implementation, but keep `cases.json` testable
`:366-393`

**Problem.** `cases.json` checks the error *kind and position* (`:477`), but the spec doesn't say
which error wins when there are several, or what the position points at:

- `1+2..1+4` can be `equal-ends` (first column) or `uneven-run`.
- In `1-5, 3, 1–2`, the duplicate comes first in the text, but a lexer finds the en dash first.
- `create("1-1000000000", 52)` is both `too-long` and `length-mismatch`.

Fixing an order costs code. Following the simplest implementation is cheaper, as long as the shared
tests don't depend on it.

**Action.**
- **1.1** Say that when an input has several errors, which one is reported is up to the
  implementation.
- **1.2** Let an invalid case list every error it allows, instead of the single `error` field
  (`:477-478`). An implementation passes when the error it reports matches one entry, kind and
  position. Inputs with several errors can then stay in `cases.json`. *Decided by the author.*

  ```json
  {"input": "1-5, 3, 1–2",
   "errors": [{"kind": "duplicate-label", "position": 5},
              {"kind": "reserved-char", "position": 8}]}
  ```

- **1.3** Define the position as the first non-space character of the item that holds the error,
  in code points. For an empty item, it is the position just after its comma. Use `null` for
  `bad-length` and `length-mismatch`. Every implementation knows this without tracking characters
  inside labels.
- **1.4** One lexing rule still decides the *kind* of an error. Choose one:
  - **1.4a** `!` and `"` are reserved characters and must be quoted inside a label (`"Hej!"`,
    `"My \"label\""`). `!` is an operator only at the start of an item, and `"` opens a quoted
    label only at the start of a label. So `Hej!` and `My"label` are `reserved-char`, as the error
    table already says. *Chosen by the author.*
  - **1.4b** ~~Or let `Hej!` be `syntax` and change the table.~~ Not chosen.
- **1.5** Add table rows for the cases not covered: `-5`, `2+`, `+3`, `1..`, `2+3..`, `!` alone, `!!3`,
  `1-!3`, `"a"b`.

### 2. Separate the strict model from language-specific behaviour
`:43-57`, `:147-165`

**Problem.** The spec relies on "every whitespace character", "Unicode category M", NFC, and a
lowercase mapping that JS and Python supposedly share. Measured in Node 26 (Unicode 17.0) and
Python 3.13 (Unicode 15.1):

- Lowercasing differs for 55 code points (e.g. U+A7CB, U+10D50).
- Python `isspace()` also matches U+001C–U+001F and U+0085. JS `\s` also matches U+FEFF.
- Python `re` `\d` matches 680 code points and JS `\d` matches 10. Python `int("٣")` is `3`.

The author's rule is: strict mode uses only the plain space, and outside the strict model each
language does whatever is simplest. With that rule, the strict model needs no Unicode tables.

**Action.**
- **2.1** **Strict mode:**
  - **2.1a** U+0020 is the only whitespace.
  - **2.1b** Control characters (U+0000–U+001F, U+007F–U+009F) are `reserved-char`. That is a simple range
    check.
  - **2.1c** Every other character, NBSP included, is label text. Remove "every whitespace character other
    than the plain space U+0020" from the reserved list (`:45-46`).
- **2.2** **`clean`:** convert whitespace to U+0020 by the language's own definition. Results may
  differ between languages, so `cases.json` uses only tab, newline and U+00A0, which both treat
  the same way.
- **2.3** **Integers:** ASCII `0-9` only, checked explicitly. Don't rely on Python's `\d`, `isdigit()`
  or `int()` alone.
- **2.4** **Lowercasing and NFC:** use the language's own `toLowerCase()`/`lower()` and
  `normalize()`. Lowercasing *is* inside the strict model (`duplicate-label`), so:
  - **2.4a** say that characters whose case mapping changed in recent Unicode versions may give different
    results;
  - **2.4b** keep those characters out of `cases.json`;
  - **2.4c** drop "which give the same result" (`:56`).
- **2.5** **Drop the combining-mark boundary rule** (`:54-55`). It only affects ranges like `x̃-z̃`
  (a letter plus a combining mark that has no precomposed form), and it needs Unicode property
  support in both languages. Without it, such a range reads as letters with the mark as a suffix.

### 3. Bound the integer system
`:162-165`

**Problem.** There is no maximum value.

- JS loses precision above 2^53: `Number("9007199254740993")` is `9007199254740992`.
- Python 3.11+ `int()` raises `ValueError` beyond 4300 digits. A 5000-digit range crashes the
  prototype with an exception that isn't a sequence error.

**Action.**
- **3.1** Read integer tokens of at most 9 digits. That fits in 32 bits and is far beyond any page
  number. Longer tokens are not readable (`no-system`). One length check fixes both problems. Add a
  case.
- **3.2** Drop fixed-width integers for 2.0. A number with a leading zero is not readable in a
  range (`no-system`). That removes the width rule and `different-width` (`:162-165`), and `08-12`
  (`:138`) becomes an error case. No known string uses zero padding, and width can return in a
  minor version.

### 4. A final-form alias at a range end rewrites the label
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
- **4.1** Choose one. *Recommended: 4.1c, the simplest.*
  - **4.1a** Keep both ends verbatim and generate only the labels between them. *Not chosen.*
  - **4.1b** Make an alias unreadable as a range or run end (`no-system`). *Not chosen.*
  - **4.1c** Drop aliases until a real case needs them (see 22.3 and item 20). *No known string has a non-ASCII character. Aliases can come in a minor version, since they only make invalid ends readable; they are under "Later" in `pagesequence-v2.md`.*

### 5. Make the label grammar exact
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
- **5.1** `bare = barechar { barechar }`, with `barechar` defined by what it excludes.
- **5.2** Define the quoted label:
  - **5.2a** `qchar` = any character except `"` and `\`;
  - **5.2b** `escape` = `\` followed by `"` or `\`;
  - **5.2c** say whether a `\` before any other character is literal or an error. *Recommended: an error, so `\"` and `\\` are the only escapes.*
- **5.3** Decide on `""`: an error (`empty-item`), or the way to write an unlabelled page (22.1). *Decided by the author: the way to write an unlabelled page (22.1).*
- **5.4** Forbid control characters (category Cc), even inside quotes.
- **5.5** State that a quoted label can't touch other label text (`"a"b` → `syntax`). This also
  settles open question 3 for now.

### 6. Make the v1 conversion workable
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
- more labels than v2's limit.

Some v1 strings read differently in v2, not only `C-D`:

- `I-L`: 50 roman labels in v1, 4 letters in v2;
- `L-M` and `C-M`: 951 and 901 roman labels in v1;
- `08-12`: v1 drops the zero (`8, 9, …`).

Stored *references* (part-block `pages`) aren't mentioned, but v2 parses them differently: clean
rules, letter readings, duplicate check.

**Checked on the real data** (`v2/list_of_grottan_in_v1.txt`, 235 strings, 42 distinct):

- 6.1 works on all of them: the pages match v1's own result for every string.
- Nothing would be stopped by 6.2: there are no duplicates or empty strings, the longest string
  has 60 labels, and none of the 155 strings without `|` reads differently in v2.
- What changes:

  | Share | v1 | v2 |
  |---|---|---|
  | 143 (61%) | `1-52` | unchanged |
  | 43 (18%) | `1,2\|3,4\|…\|51,52` | `1, 2+3..50+51, 52` |
  | 37 (16%) | `1-26\|27-52` (a merged centre spread) | `1-25, 26+27, 28-52` |
  | 12 (5%) | `1-20,A-H,21-40` | `1-20, A-H, 21-40` (spacing only) |

  The merged-spread rows grow from one item to three. That follows from "`+` joins labels, not
  ranges" (`:84`).

**Action.**
- **6.1** Build the model by splitting each v1 string on `,` and parsing each section on its own.
  v1 labels can't contain `,`. For each section: strip `!` and record it, split the `|` groups,
  and use the v1 module only to expand ranges. *Done for the known strings: `v2/list_of_grottan_in_v2.txt` is the checked v2 form of each line of `v2/list_of_grottan_in_v1.txt`, so converting is a lookup between the two files.*
- **6.2** Have the script report, and stop on: *Not chosen: converting is a lookup between the two `v2/` files (6.1), and none of these occur in the known data.*
  - **6.2a** v2 errors (duplicates, too long);
  - **6.2b** empty stored strings (they need the PDF page count);
  - **6.2c** every sequence whose *text* reads differently in v2 than in v1. These are likely v1 data bugs
    worth a human look, not something to preserve silently.
- [x] **6.3** Also check stored references: for each one, compare v1 `getIndexList(ref)` with v2's. *Recommended: as a one-off check in publication-md.*

### 7. `clean` changes can change how stored data reads
`:205-207` vs `:427-432`

**Problem.** The versioning rules say a change to `clean` "only affects what people type, never
how stored data reads", so it is a minor version. But `getIndexList(pages)` and
`getLabelList(pages)` parse stored references with the `clean` rules. A changed repair therefore
changes what a stored part block points to.

**Action.**
- **7.1** Choose one, then make the Versioning and Publishing text agree with it: *Recommended: 7.1b. `clean` can then change freely.*
  - **7.1a** The repairs used for references are a fixed, versioned list. Only adding a repair that
    turns an error into a result is a minor version. *Not chosen.*
  - **7.1b** References are parsed strictly, plus a small fixed set of repairs (dashes, `5-5`).
  - **7.1c** References are stored normalised. *Not chosen.*

---

## Medium

### 8. Fold in one linear pass, and cap label length
`:279-284`, `:86-89`

**Problem.**
- **Fold cost.** Read literally ("take the longest stretch starting there that folds"), the search
  builds and compares every candidate, which is O(n³). The prototype took 0.6 s, 3.4 s and 19 s
  for 100, 200 and 400 labels of `1, x2, 3, x4, …`. At the 1000-label limit that means minutes,
  from a valid input.
- **Memory.** The label-count limit doesn't bound memory. A 40 kB input (`"xxx…1"-"xxx…1000"` with
  20 000-character labels) expands to 20 million code points of labels, 500 times the input. A
  2 MB input would give about 1 GB.

**Tested replacement.** At each page:
1. Read the page and the next one as a range or run: the *pair reading*. The second page must be
   exactly one step after the first.
2. Extend while the next page equals the next generated label (one comparison per page).
3. Shorten from the end until `first-last` itself reads the same way as the pair (same system,
   cut, case and start value). Only collisions such as `V, W, X` shorten, by one or two pages.
4. Write the stretch as one item if it is long enough (2 single-label pages, or 3 pages with
   several labels). Otherwise write the page on its own.

With range flags in 2.0 (item 20), step 1 also tries every plugin system that is given, and step 3
writes a flag instead of shortening (20.8).

The test used 3000 random page models: integers, padded numbers, roman, letters, prefixes,
spreads, fold-outs, quoted words and ignored pages. Results:

- Every model got exactly the same normal form as with the longest-stretch rule, under both the
  current reading rules and item 9's.
- Every result read back to the same pages.
- At 1000 labels it takes 0.04 s on the worst input above, and 0.006 s for `1-1000`.

**Action.**
- **8.1** Define the normal form by these four steps instead of "the longest stretch that folds". The
  results are the same, the cost is linear, and the steps are the implementation. *Applied, with
  step 3 replaced by 20.8.*
- **8.2** Cap label length, e.g. at 100 code points (error `too-long`). This bounds an expansion to
  the label limit × 100 code points.
- [x] **8.3** Add a timing case at the limits to both test suites. *Recommended: as a plain case at the limits, without a timer; the test runner's timeout catches a slow fold.*

### 9. Replace the I/V/X exception with "the lowest end wins"
`:184-188`

**Problem.**
- "When both middles are single letters": before or after roman widening? `CC-CD` is 201 roman
  labels with the widened middles, but the 2 letters `CC, CD` with the raw ones.
- In each case (upper and lower), the exception turns 12 roman ranges into errors, e.g. `x-l`,
  `v-l` and `i-c`, because it reads them as descending letters.
- It hard-codes `I`, `V` and `X`, which doesn't carry over to systems added later (item 20).

**Tested rules.** Every rule below keeps the same-cut restriction: the first valid reading in
hierarchy order fixes where the label is cut, and only readings with that cut compete. Within one
cut, only single letters can compete (roman vs Latin). That is 9 pairs per case where both readings
are valid, and none of them tie.

| Rule | `V-X` | `I-L` | `I-M` | `x-l` | Roman ranges within 1–100 read wrongly | Letter ranges read wrongly |
|---|---|---|---|---|---|---|
| Current (exception) | roman | letters | letters | error | 14 | 6 |
| Fewest labels | letters | letters | letters | roman | 4 | 4 |
| **Lowest end value** | **roman** | **letters** | **letters** | **roman** | **2** (`i-l`, both cases) | **6** |
| Lowest start value | roman | roman (50) | roman (1000) | roman | 0 | 10 |
| Lowest end, any cut | roman | letters | letters | roman | 186, e.g. `xi-xl` → `xi, xj, xk, xl` | 6 |

"Lowest end value":
- makes the same choice as the proposal on all 9 contested pairs, and gives the proposal's result
  for all 15 normalisation examples;
- keeps `V-X`, `iv-ix` and `xi-xl` roman;
- turns the 12 error pairs into roman ranges;
- makes `V+W..X+Y` work (21.3);
- needs no list of letters;
- still reads `CC-CD` as roman 201.

**Action.**
- **9.1** Replace the exception (`:184-188`) with:

  > Try each system as now. Drop readings that are invalid (descending, different case, uneven
  > run). The first remaining reading in hierarchy order fixes where the label is
  > cut. Of the remaining readings with that cut, the one whose last value is lowest wins; equal
  > values go by hierarchy order. If no reading is valid, report the error of the first system
  > that read both ends.

- [x] **9.2** Add `CC-CD`, `V-X`, `I-M`, `iv-ix`, `xi-xl` and `x-l` as cases.

### 10. Pin the roman system
`:116-118`, `:157`

**Problem.**
- Widening crosses case. `"Kap. Ci"-"Kap. Civ"` widens to `Ci`/`Civ`, which is mixed case and
  not roman, so it ends in `no-system`.
- `Civ-Cix` widens to `Civ`/`Cix`, fails as roman, and is then read as the *letters* v→x
  (`Civ, Ciw, Cix`) instead of roman iv→ix.
- The accepted forms aren't stated: canonical subtractive only, or also `IIII` and `IC`? What
  maximum (`MMMM`)?

**Action.**
- [ ] **10.1** Widen only over `tokenChars` of the same case as the middle. *Skip: an edge case that no known string has. Revisit if one appears.*
- **10.2** Read only canonical numerals, 1–3999, so `format(match(t)) == t` for every token. State
  that invariant for every system.
- [x] **10.3** Add these as cases. *Recommended: for 10.2.*
- **10.4** Keep v1's `toRoman` and `fromRoman` as public API, and make them agree with the
  parser: `fromRoman` reads what the roman system reads and gives `undefined` for anything else,
  and `toRoman` throws outside 1–3999. *The author decided they stay public. The strictness is
  recommended, so that a public `fromRoman` never accepts what the parser rejects.*
- **10.5** Drop `romanPattern`. It matches `MMMM` and mixed case such as `Iv`, which v2 doesn't
  read as roman, and Python's `re` can't compile it (variable-width look-behind). *Decided by the
  author.*

### 11. Define how `clean` closes an open end that isn't a plain number
`:337-340`

**Problem.** "Finding what steps" needs both ends; with only one end there is no common prefix.
Several open ends have more than one reading:

- `V-` with 6 pages could be roman (`V-X`) or letters (only 5 letters exist from V to Z).
- `C-` with 2 pages could be `C-CI` (roman) or `C-D` (letters).
- `1a-`, `inflikat.1-` and `08-` all need a rule.

**Action.**
- **11.1** Choose one: *Recommended: 11.1c.*
  - **11.1a** Allow an open end only after a label that one system reads as a whole token
    (integer first, then the hierarchy), checked by round trip. *Not chosen.*
  - **11.1b** Or define a single-label rule, e.g. the last token that some system reads, in
    hierarchy order. *Not chosen.*
  - **11.1c** Allow an open end only after an integer (`1-`, `i-iv, 1-`). Everything else stays
    `open-end`, so no system has to be guessed.
- [x] **11.2** Add cases for `i-`, `A-`, `08-` and `inflikat.1-`. *Recommended: with 11.1c, `i-`, `A-`, `08-` and `inflikat.1-` become error cases.*

### 12. Pin what a lookup returns
`:427-432`

**Problem.** "Keep their meaning" leaves v1's quirks implicit:

- Repeated indexes are removed only when they are next to each other. `getIndexList("20-29")` on
  1986-1 gives `[19,20,…,27,19]` (index 19 twice). `"3-4, 3"` on `1-5` gives `[2,3,2]`.
- Lookup is by label, not by physical span. `"10-12"` on 1973-1 gives `[9,14]` and skips the
  inserted pages 10a–10d.
- Parsing references as v2 sequences adds new failures. `"3, 3"` gives `[2]` in v1, but in v2 it
  hits `duplicate-label` and returns `undefined`.

**Action.**
- **12.1** State the result order and the rule for repeats: keep v1's, or switch to unique indexes in
  first-seen order and list that under breaking changes (item 13). *Recommended: unique indexes in first-seen order. It is one rule that is easy to state; add it to item 13.*
- **12.2** Say whether references are exempt from `duplicate-label`. *Recommended: not exempt, since references use the same parser.*
- **12.3** Document that a reference means labels, not a span. If part blocks need physical spans, add
  `getIndexSpan(pages)`: from the page of the first label to the page of the last label (see 22.5). *Settled by the author: a reference is made of labels, never of PDF pages, which is the whole idea of the library. No span API.*

### 13. Add an explicit "Breaking changes from v1" list
`:411`

**Problem.** The API section says "The class keeps the v1 API and meaning, with a few
additions". In fact several things change:

- `|` is invalid;
- `create("", n)` is an error;
- duplicate labels are errors;
- `C-D`, `L-M` and `I-L` read as letters;
- `08-12` is an error (3.2);
- references are parsed as v2 sequences (7.1b);
- errors have kinds;
- possibly the shape of lookup results (item 12).

**Action.**
- **13.1** List these in one place, with what consumers must change. For example, code that relied on
  the empty default needs ``create(text || `1-${n}`, n)``. *Applied: "Breaking changes from v1" in
  `pagesequence-v2.md`.*

### 14. Specify the `clean` repairs exactly
`:326-347`

**Problem.**
- `cases.json` expects repair kinds (`:474`), but they are never named.
- Nothing says repairs apply only outside quotes. A straight-quoted label containing `“hej”` or
  `…` would be rewritten.
- Positions after earlier repairs are undefined.
- "Different spelling" doesn't say whether only the stepping token or the whole label is
  re-cased (`Plansch A, plansch B`).

**Action.**
- **14.1** Give repair kinds their own table, like error kinds: `dash`, `semicolon`, `pipe`,
  `ellipsis`, `single-label-run`, `curly-quote`, `space`, `empty-item`, `equal-ends`, `open-end`,
  `case`. *Not chosen: `clean` is outside the strict model, so only its result is tested, and each implementation names its own repairs.*
- **14.2** Positions refer to the NFC input before any repair. *Not chosen, for the same reason as 14.1.*
- **14.3** No repair applies inside straight quotes. Curly quotes are the exception: they still have
  to be recognised as quotes.
- **14.4** Optional: repair `P-Q` to `P..Q` when both pages have the same number (2 or more) of
  labels. It has only one reading, and it is the most likely mistake, since `-` is the range
  operator. *Chosen by the author.*
- **14.5** Drop the "different spelling" repair (`:341-343`). It needs its own case-insensitive
  fold, it only fixes typos such as `i-IV`, and without it `clean` and `normalize` agree on all valid
  input (item 15).

### 15. Fix the precondition of the "`clean` agrees" property test
`:498-499`

**Problem.** The precondition is "valid input with no labels that differ only in case".
`I, ii, III` meets it, since no two of its labels are equal ignoring case. But `clean` respells it
to `I-III`, so the property fails on valid generated input.

**Action.**
- **15.1** Change the precondition to "no stretch that would fold after case respelling", or have the
  generator use one case per numbering run. *Not needed with 14.5. Without respelling, `clean` agrees with `normalize` on valid input.*

### 16. Close the gaps in `cases.json` and testing
`:466-502`

**Problem.**
- The case schema has no fields for lookups (`getIndexList(pages)`, `getLabelList(pages)`), which
  are what the v1 tests exercise most.
- It also has nothing for `length` and `length-mismatch`, `clean` with `length`, or
  `labelsAt`/`formatAt` on ignored and out-of-range pages.
- Property tests run separately in each language, so nothing checks that the two implementations
  agree on *random* input.

**Action.**
- **16.1** Add `length`, `lookups: [{pages, indexes, labels}]`, per-index `labelsAt` and `errors`
  (1.2) to the schema, and write a JSON Schema for the file. *Recommended: skip the JSON Schema part, since checking it needs a validator dependency.*
- [x] **16.2** Add a cross-language test in CI: a seeded generator writes N inputs, both implementations
  write their results as JSON, and CI compares the two. *This can replace fast-check and Hypothesis (`:486`), so neither test suite needs a dependency.*
- [x] **16.3** Carry over the v1 test cases that still apply.
- [x] **16.4** Add every distinct string in `v2/list_of_grottan_in_v1.txt` (42) as a conversion case:
  the v1 string, the expected v2 normal form and the pages. All 42 convert and read back in the
  prototype.

### 17. Fill in the API surface
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
- **17.1** Define the signatures of `equals` and `diff`. *Applied: only `equals(a, b)` on two strings, throwing on invalid input like `normalize`. It also takes `{ plugins }` (20.13).*
- **17.2** Define `diff`'s result: `null`, or `{index, a: {ignored, labels} | null, b: …}`. *Not needed: `diff` is dropped from the API. With `pages()`, a caller can find the first difference in a few lines.*
- **17.3** Add `pages()` (or `toJSON()`).
- **17.4** Define `PageSequenceError {kind, position}` in both languages.
- **17.5** Give the Python names: `PageSequence(text, length=None)`, `get_index_list`, `labels_at`,
  `clean(text, length=None)`, and `create` returning `None`. *Applied, with a keyword-only
  `plugins=()` added (20.13).*

### 18. Tighten the publishing plan
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
- The TypeScript package (`ts/`) has no build step. Node refuses to strip types from `.ts` files under `node_modules`
  (`ERR_UNSUPPORTED_NODE_MODULES_TYPE_STRIPPING`), so the npm package must ship compiled `.js` and
  `.d.ts`. JSR takes the `.ts` source.
- Nothing checks that `package.json`, `deno.json` and `pyproject.toml` all carry the tag's version.
- There is no plan for a partly failed release, e.g. npm published but PyPI failed.
- The JS test runner isn't named.
- This repo already *is* `publication-md/pagesequence`, so the new layout replaces v1's flat
  layout in place.

**Action.**
- **18.1** Add the npm build: `tsc` → `dist/`, ESM, with `exports` and `types`. *Chosen by the author: npm with a build, next to JSR.*
- [x] **18.2** Add a CI step that fails if any manifest's version differs from the tag.
- **18.3** Make each publish step re-runnable on its own, skipping a registry that already has the
  version. *Chosen by the author.*
- **18.4** Name the test runner (`deno test`, `node --test` or vitest) and the minimum Node and Python
  versions. *Recommended: test runners without dependencies: `deno test` or `node --test` for JS, and `unittest` for Python.*
- **18.5** Plan the first npm publish as a manual publish with 2FA, then configure trusted publishing. *Chosen by the author, with 18.1.*
- [x] **18.6** Register the PyPI name early.
- **18.7** Tag or branch v1 1.3.3 before restructuring, so a v1 fix is still possible. *Done: the annotated tag `v1.3.3` is on `286b6f1`, which JSR published as 1.3.3 on 2025-03-05, and the branch `v1` holds that tag plus the test fix `97b80c6`. Neither is pushed yet: `git push origin v1.3.3 v1`.*
- [x] **18.8** Add SPDX `license` fields to all three manifests. *All three, since npm stays (18.1). The JSR config is `deno.json` (22.6).*

### 19. Separate the format spec from the project plan
`:446-464`

**Problem.** `spec/` is meant to hold "this document, once settled" under CC0. But the document
mixes the normative format with motivation and internal material: the Grottan markup agents,
"the brief", `joinLabels`, `roots.py`, the release plan and the v1 conversion. A second
implementer can't tell which parts are requirements.

**Action.**
- **19.1** Split out `spec/pagesequence.md`: syntax, numbering, normal form, errors, repairs and API
  semantics, written with MUST/SHOULD.
- **19.2** Turn the rest into a non-normative design and migration note.
- [x] **19.3** Move the Grottan examples into `cases.json`, and keep a few generic examples in the spec. *The spec part is done; the cases come with `cases.json`.*

### 20. Range flags: name the system after the range (`V-X/latin`)
This is the author's design. Flags are in 2.0 (20.10) and are written with `/` (20.11). The
prototype below wrote them with `\`.

**Design.**
- A range or run can end with `/name`, which names the numbering system to read it with:
  `A-U, 1-2, V-X/latin` or `A-Ö/latin_sv`.
- Flags are part of strict mode, and stored strings may contain them.
- A name must be built in or given as a plugin (e.g. `latin_sv`); otherwise parsing throws
  (`unknown-system`).
- Standard names follow a naming rule (20.3). Custom systems can be given under their own names,
  for example a list of software releases.

**Prototype results.**
- `A-U,1-2,V-X/latin` gives 26 pages.
- `A-Ö/latin_sv` gives 29 pages with `latin_sv` given, and an error without it.
- A flag after a single page (`V/latin`) is an error.
- A list system works with the existing prefix and suffix rule, as long as widening uses the
  characters of the system's tokens: `"Version 1.0"-"Version 3.0"/x_releases` gives Version 1.0,
  1.1, 2.0, 2.1 and 3.0.
- Normal forms (20.8):
  - `V, W, X` → `V-X/latin`, and the letters I…X → `I-X/latin`.
  - Swedish A…Ö → `A-Ö/latin_sv` with the system given, and `A-Z, Å, Ä, Ö` without it.
  - `A-E`, `C-D`, roman `V-X` and all the other examples need no flag.
- 3000 random page models were normalised twice, with no extra systems and with all of them. Every
  result reads back to the same pages (0 failures).
- None of the 235 known v1 strings needs a flag.

**Consequences.**
- Collisions get an explicit answer. The default rule (item 9) then only has to get common cases
  right, and the fold no longer needs to shorten a stretch (item 8, step 3).
- Swedish, Greek and Hebrew become plugins outside the core (20.12, 20.19), which answers 22.2 and
  22.3. Aliases (item 4) stay out until a real case needs them.
- "Every reader agrees on every string" (`:178-179`) becomes "every reader given the same plugins
  agrees".
- The normal form also depends on which plugins are given (A…Ö above), just as it already depends
  on the version (`:208-211`).

**Action.**

- **20.1** Syntax:
  - **20.1a** `/name` goes right after the last label of a range or run.
  - **20.1b** There is one flag per item, and it applies to every column.
  - [ ] **20.1c** A flag anywhere else is `syntax`. *Not taken: the spec makes it `reserved-char`,
    like a misplaced `!` (20.17). Tick this to use `syntax` instead.*
  - **20.1d** `\` becomes a reserved character in bare labels, so `a\b` must be quoted. `/` is
    reserved too, since it starts a flag (20.11).
- **20.2** Names are `[a-z0-9_]+`. An unknown name is a new error kind, `unknown-system`; add it
  to the error table.
- **20.3** Choose the naming standard:
  - **20.3a** A system name, optionally followed by a BCP 47 language subtag: `roman`, `int`,
    `latin`, `latin_sv`, `latin_da`, `greek`, `hebrew`, `cyrillic_ru`. This is readable, and it
    matches `latin_sv`. *Extended by 20.18 with variants such as `roman_additive`.*
  - **20.3b** Short names such as `az`. They are shorter, but `az` is also the BCP 47 code for
    Azerbaijani, so this can't be combined with language subtags. *Not chosen.*
- **20.4** Choose the rule for custom names:
  - **20.4a** They start with `x_` (e.g. `x_releases`), like private-use tags. A later standard
    name can then never change what a stored string means. *Not chosen.*
  - **20.4b** Any name is allowed, but a plugin whose name is built in throws, so a clash fails
    loudly. *The author's rule ("custom can use any name"), plus that safeguard.*
- **20.5** Give each system exactly one name. Alternative names for the same system (`az` and
  `latin`) would give the normal form two spellings.
- **20.6** What a plugin holds. *Plugins are code, not data files that both languages load
  (20.12), and `alphabet()` makes one from its letters (20.15).*
  - **20.6a** the name;
  - [ ] **20.6b** a `list` kind besides `alphabet`: whole tokens such as release numbers, without
    case, widening over the characters of its tokens. *Later: a helper for it is under "Later" in
    `pagesequence-v2.md`.*
  - **20.6c** the ordered letters (or tokens, for 20.6b);
  - [ ] **20.6d** the aliases. *Later, with aliases (4.1c).*
- **20.8** Normal form:
  - **20.8a** At each page, try the default rule, then every plugin given, in a fixed order: the
    built-ins in hierarchy order, then the plugins by name.
  - **20.8b** The longest stretch wins; on a tie, the earlier candidate wins.
  - **20.8c** Write `/name` only when the default rule doesn't read `first-last` the same way.

  This replaces step 3 of item 8.
- **20.9** Replace `:178-179` with the rule for which systems a reader has, and say that a project
  declares the systems it uses (e.g. in publication-md's config). *Applied with 20.13: the project
  lists its plugins in its config, and its tools pass them to every call.*

**Decided after the review.** The spec and `pagesequence-v2.md` ("Plugins") hold the result.

- **20.10** Put flags in 2.0, with 20.1 and 20.8 as the syntax and the normal form. *Decided by
  the author.*
- **20.11** Write flags with `/` instead of `\`: `V-X/latin`. They then need no escaping in
  JSON, YAML or code. `/` becomes a reserved character, and `\` stays reserved as the escape inside
  quotes. *Decided by the author.*
- **20.12** Build in only `roman`, `latin` and `integer`. Every other system is a plugin: a code
  module that ships in the package and is left out of code that doesn't use it. This replaces the
  data files of 20.6. *Decided by the author.*
- **20.13** No global registry: each call that reads a sequence takes its plugins in a `plugins`
  option. A registry would make the same code behave differently depending on what was registered.
  This is how 20.9 is applied. *Decided by the author.*
- **20.14** The plugin interface: `name`, `tokenChars`, `read(token)` → `{ value, style }` and
  `format(value, style)`. The reader checks the round trip itself, so `read` can be lenient.
  *Recommended, not yet confirmed.*
- **20.15** Make `alphabet(name, upper, lower?)` public, so a custom alphabet takes one line.
  *Recommended, not yet confirmed.*
- **20.16** Implement the built-in systems through the same interface, so the core exercises
  it. *Recommended, not yet confirmed.*
- **20.17** A flag after a single page (`V/latin`) is `reserved-char`, like a misplaced `!`,
  instead of `syntax` (20.1c). *Recommended, not yet confirmed.*
- **20.18** A standard name may end in a variant (`roman_additive`), not only in a language
  subtag (20.3a). *Recommended, not yet confirmed.*
- **20.19** Ship four plugins in 2.0: `roman_additive`, `latin_sv`, `greek` and `hebrew`, with
  Greek and Hebrew read without their final forms until aliases come (4.1c). This answers 22.2 and
  replaces the recommendation in 22.3. *The author named these plugins. Shipping all four in 2.0
  is recommended, not yet confirmed.*

---

## 21. Low: wording and small clarifications

- **21.1** `:442`: `toString()` "writes the canonical (shortest) form", but `:300-301` says the
  normal form isn't always the shortest. Say "the normal form".
- **21.2** `:544-545`: Open question 2 (the three-page fold-out) is already answered at `:85`.
  Remove it.
- **21.3** `:80-82`, `:388`: `run-shape` "different prefixes" means nothing when each column is
  numbered on its own, because a prefix mismatch already gives `no-system`. Define it or drop it.
  Also say that each column picks its own system: `V+W..X+Y` is `uneven-run` because the first
  column reads `V→X` as roman, while `T+U..X+Y` works. The rule in item 9 fixes this case. *Recommended: drop the phrase.*
- **21.4** `:78-79`: "So each sequence has one way to be written" → "so a run of single pages
  has one notation". There are many spellings and one normal form.
- **21.5** `:42`: "Whitespace around …" → "Spaces (U+0020) around …", since all other
  whitespace is reserved (`:45-46`).
- **21.6** `:390`: `duplicate-label` says "appears on two pages", but it also covers one page
  (`2+2`). Say "appears twice".
- **21.7** `:181-182` vs `:201-204`: a gematria system would share characters with the Hebrew
  alphabet, which the versioning rule forbids in a minor version. Say it would be a major
  version, or a style of the same system. *Recommended: delete the gematria remark, which is simplest.*
- **21.8** `:199`:
  - **21.8a** "The diff works on the unquoted text" means the prefix/suffix comparison, not the `diff()`
    function. Rename it.
  - **21.8b** "Rule 4" and "normalisation step 2" point to a section that hasn't been introduced yet. Move
    "Effect on normalisation" after "Normalisation and comparison".
  - **21.8c** Merge its versioning bullet with "Publishing → One version number" (`:506-510`).
- **21.9** `:9-10`, `:245`:
  - **21.9a** "…counted the born-digital sequences wrongly in 40 issues and left out a correct
    `pageSequence`" is unclear: left out where?
  - **21.9b** `:245` refers to "the brief", which is never defined, and repeats the 2016-4 example. Delete
    that line.
- **21.10** `:403`: "Most strings come out unchanged" is true of the meaning, not the text. Any
  v1 string not written with `, ` or not fully folded changes, e.g. `1-3,A,B,4-6` →
  `1-3, A-B, 4-6`.
- **21.12** `:337-340`: say whether an ignored open range (`1-10, !11-`) can be closed. *Recommended: yes; `!` changes nothing.*
- **21.13** `:537-538`: "navigation-line stripping" isn't explained and isn't in the API.
  Explain it or drop it.
- **21.14** `:213-245`: five of the eleven Grottan examples don't occur in
  `v2/list_of_grottan_in_v1.txt`:
  - **21.14a** The ignored duplicate scan `1,2|3,!3,4`. No listed string uses `!` at all.
  - **21.14b** 1986-1 with `!29`. The list has `1-20|29,21-28,30-48`, one PDF page fewer.
  - **21.14c** 1973-1 with `!11`. The list has `1-10|11,10a,10b|10c,10d,12-20`.
  - **21.14d** `i-iv, 1-48` and `Omslag, 2-31, Baksida`.

  Take the examples from the list, and mark invented ones as such. Show the most common
  conversion: `1-26|27-52` → `1-25, 26+27, 28-52`, which applies to 37 strings.

---

## 22. Suggested open questions

- **22.1 Unlabelled pages.** Blank pages, plates and inserts without a printed number currently
  need invented unique names. Is `""` allowed? Should there be a placeholder that is exempt from
  `duplicate-label`? *Decided by the author: `""` is the empty label for an unlabelled page. It is
  exempt from `duplicate-label`, so it may repeat, and a reference can't contain it, so a lookup
  never finds it.*
- **22.2 Swedish letters.** `X-Ö` and `"Bilaga Å"`-style ranges are `no-system`. Should Å, Ä, Ö
  follow Z in the Latin table? Danish and Norwegian use the order Æ, Ø, Å, so one table can't serve
  all three. *Answered by 20.19: the Latin table stays A–Z, and the plugin `latin_sv` reads
  `A-Ö/latin_sv`. Danish and Norwegian can get their own plugins.*
- **22.3 Greek and Hebrew now or later.** By the document's own rule, a new system is a minor
  version. Shipping only Latin removes the alias question (item 4) from 2.0. The known v1 data has
  no non-ASCII characters at all. *Answered by 20.12 and 20.19: only roman numerals, Latin letters
  and integers are built in, and Greek and Hebrew ship as plugins, read without their final forms
  until aliases come (4.1c).*
- **22.4 The 1000-label limit.** It is plenty for Grottan, but low for a general npm/PyPI library
  (books, bound annual volumes). Raising it later is a minor version, but it depends on item 8.
  The longest known v1 string has 60 labels. *Decided by the author: the default is 10 000, and a
  caller can set another limit with `maxLabels`, next to `plugins`.*
- **22.5 Span lookup.** Should a part block's `pages` mean the labels listed (as in v1) or the
  physical span between them (item 12)? *Settled by the author: labels. References are written with
  the labels printed in the publication, never with PDF pages.*
- **22.6 One config file for JSR.** `ts/deno.json` can be both the JSR config and the place for
  the local tasks, which makes `jsr.json` unnecessary. *Chosen by the author: `deno.json`, which
  the local tasks need anyway. `jsr.json` is gone from the layout and the publishing steps.*
