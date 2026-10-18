# PageSequence format, version 2

Status: draft. Licence: CC0.

- The spec may still change during development, wherever a small change makes the implementations
  smaller.
- It leaves draft as version 1.0 when v2 is released.
- The reasons behind the design, the move from v1 and the plans for the implementations are in
  [`pagesequence-v2.md`](../pagesequence-v2.md).

A page sequence maps the pages of a PDF to the labels printed on them. That is its purpose:
references to pages, such as the entries of a table of contents, are written with the labels
printed in the publication. This holds even where the numbering isn't 1 to n. The sequence turns
those labels into PDF pages. MUST, MUST NOT, SHOULD and MAY are used as in RFC 2119.

## Terms

- A **PDF page** is one page of the PDF. Its **index** is its 0-based position in the PDF, counting
  ignored pages: in `1, !1, 2` the page labelled 2 has index 2. Messages to people show 1-based PDF
  page numbers, so "PDF page 22" is index 21.
- A **label** is what is printed on a page: `12`, `iv`, `Omslag`. A PDF page has one or more
  labels, in reading order. A spread scanned as one PDF page has two.
- An **ignored** PDF page is a duplicate scan. It keeps its labels, but they take no part in
  lookups or in the each-label-once rule.
- The **page model** is the meaning of a sequence: a list of PDF pages, each `{ignored, labels}`.
- A **reference** names pages by their labels, written as a sequence, such as a part block's
  `pages: "20-21"`. A reference is always made of labels, never of PDF page numbers.

## Syntax

```
sequence = item { "," item }
item     = [ "!" ] ( range | run | page )   "!": every PDF page of the item is ignored
range    = label "-" label [ flag ]         PDF pages with one label each
run      = page ".." page [ flag ]          PDF pages with the same number (2 or more) of labels each
page     = label { "+" label }              one PDF page: its labels, in reading order
flag     = "/" name                         the numbering system that reads the range or run
name     = namechar { namechar }            namechar: "a"–"z", "0"–"9" and "_"
label    = bare | quoted
bare     = barechar { barechar }            trimmed of spaces; see "Bare labels"
quoted   = '"' qpart { qpart } '"'
qpart    = qchar | "\" '"' | "\" "\"        "\" '"' is a quote, "\" "\" a backslash
qchar    = any character except '"', "\" and control characters
```

- **Spaces.** U+0020 is the only whitespace. Spaces around `,`, `-`, `+`, `..`, `!` and labels are
  ignored. Spaces inside a bare label are part of it.
- **Reserved characters.** The reserved characters are:
  - `,` `-` `+` `!` `"` `/` `\`;
  - the characters that `clean` repairs: `;` `|` `…` `–` `—` `−` `“` `”` `„`;
  - the control characters U+0000–U+001F and U+007F–U+009F.

  Every other character is label text, including other spaces such as U+00A0. Reserving the
  repaired characters keeps strict mode from reading `1–52` or `1; 2` as a single label. `/`
  starts a flag (see "Flags"), and `\` is the escape inside quoted labels.
- **Bare labels.** A bare label is any text without reserved characters and without `..`. It
  can't start or end with `.`, so `1...3` is an error rather than `1.` to `3` or `1` to `.3`.
- **Where `!`, `"` and `/` count.**
  - `!` is an operator only as the first non-space character of an item. Anywhere else it is a
    reserved character: `Hej!`, `!!3` and `1-!3` are errors (`reserved-char`). Write `"Hej!"`.
  - `"` opens a quoted label only where a label starts. Anywhere else it is a reserved character
    (`My"label`).
  - `/` starts a flag only after the last label of a range or run, and the name follows it
    directly. Anywhere else it is a reserved character: `a/b`, `1990/1` and `V/latin` are errors
    (`reserved-char`). Write `"1990/1"`. A flag without a name, such as `1-5/` or `1-5/Latin`, is
    an error (`syntax`).
- **Quoted labels.**
  - A label that can't be written bare is written in double quotes. Inside the quotes everything
    is text, except that `\"` is a quote and `\\` a backslash.
  - A `\` before any other character is an error (`syntax`).
  - Control characters are not allowed, even inside quotes (`reserved-char`).
  - `""` is an error (`empty-item`).
  - A quoted label can't touch other label text: `"a"b` and `"Bilaga A-"1-12` are errors
    (`syntax`).
  - Examples: the label `My "label" - 1` is written `"My \"label\" - 1"`, and
    `"Omslag, insida", 2-31` is a cover page followed by pages 2 to 31.
- **Unicode.** Every function first converts its input to NFC, so a precomposed `å` and `a` plus a
  combining ring are the same label. Lengths, limits and positions count code points.
- **Limits.**
  - A label is at most 100 code points long, not counting quotes and escapes.
  - A sequence expands to at most 1000 labels.

  Either one exceeded is an error (`too-long`). The size of a range or run is computed from its end
  values before it is expanded, so `1-5000` fails at once.

## Meaning

- `,` separates items. An item is one or more PDF pages.
- A **page** `a+b` is one PDF page with those labels. A fold-out is a page with three: `12+13+14`.
- A **range** `a-b` is PDF pages with one label each, from `a` to `b` (see "Numbering"). `1-16` is
  16 PDF pages: 1, 2, …, 16.
- A **run** `P..Q` is PDF pages with the same number of labels each, from page `P` to page `Q`.
  Each label steps by the number of labels on the page: `2+3..46+47` is the spreads 2+3, 4+5, …,
  46+47, which is 23 PDF pages.
  - `..` is only used between pages with 2 or more labels. `1..16` is an error
    (`single-label-run`); write `1-16`.
  - Both ends of a run have the same number of labels (`run-shape`). Each column steps the same
    number of times, by whole steps (`uneven-run`).
- The two ends of a range or run differ: `3-3` and `2+3..2+3` are errors (`equal-ends`). Write `3`
  or `2+3`.
- `+` joins labels, not ranges. `1-3+4-6` is an error (`syntax`); write `1-2, 3+4, 5-6`.
- **Nothing is empty or open,** with or without a page count:
  - an empty sequence is an error (`empty`);
  - an empty item, such as `1,,2`, a trailing `,` or a lone `!`, is an error (`empty-item`);
  - an open end such as `1-` is an error (`open-end`).

  `clean` turns `""` and `1-` into plain numbering when it is given the page count.
- **Each label once.** A label appears at most once on the pages that are not ignored, compared
  without case (see "Case"). So a lookup always finds one page. `1-5, 3`, `2+2` and
  `Omslag, 2-31, omslag` are errors (`duplicate-label`). A duplicate scan is marked with `!`:
  `1-5, !3`.
- **Case.** A label keeps its case as written. Lookup and the each-label-once rule compare labels
  after lowercasing them with the language's own function (`toLowerCase()` in JS, `str.lower()` in
  Python). That is not case folding, so `ß` and `ss` stay different labels. Implementations on
  different Unicode versions can differ for characters whose case mapping changed between versions.
- **Display.** A PDF page is shown as its labels joined with `+`, without quotes: `20+29`, and
  `"Omslag, insida"+2` is shown as "Omslag, insida+2".

## Numbering

A range is expanded from its two end labels. A run is expanded column by column: the first labels
of its two ends, then the second labels, and so on.

### Finding what steps

Given the first label `a` and the last label `b`:

1. **Remove the common prefix,** the longest start the two share.
2. **Remove the common suffix,** the longest end they share, not overlapping the prefix.
3. **Read with each numbering system,** in hierarchy order, starting from the middles left by steps
   1 and 2:
   1. **Widen** the middles. Move the prefix boundary back, and the suffix boundary forward, while
      the character next to the middle is one of the system's token characters. This keeps a
      number from being cut: `10` → `19` has the common prefix `1`, but for integers the middles
      are `10` and `19`.
   2. **Read** both middles. The reading is valid when the system reads both, both have the same
      case, the last value is not lower than the first, and in a run the distance is a whole
      number of steps.
4. **Choose.** The first valid reading in hierarchy order fixes where the label is cut. Of the
   valid readings with that cut, the one whose last value is lowest wins. Equal values go by
   hierarchy order.
5. If no reading is valid, it is an error:
   - the error of the first system that read both ends (`different-case`, `descending` or
     `uneven-run`);
   - or `no-system` if no system read them.

With a flag, step 3 reads with the named system only. Its reading is the reading if it is valid,
and otherwise its error is the error (see "Flags").

The labels are the prefix, then each value from the first to the last in the system's format, then
the suffix. In a run the values step by the number of labels per page. Exactly one part of a label
steps: `1a-2c`, where two parts would step, is an error; write `1a-1c, 2a-2c`.

A system reads a token only if formatting its value gives the same token back. So the end labels
of a range always come out exactly as they were written.

### Numbering systems

Three systems are built in. Without a flag, they are read in this hierarchy order:

1. **roman**
   - Canonical roman numerals with values 1–3999, all upper case or all lower case: `I`, `IV`,
     `XLII`, `mmxxiv`. The case is kept.
   - `IIII`, `IC` and mixed case (`Iv`) are not roman.
   - Token characters: `I V X L C D M` and `i v x l c d m`.
2. **latin**
   - Single letters `A`–`Z` and `a`–`z`. A letter's value is its position, A = 1. The case is kept.
   - There is nothing after `Z`, so `Y-AB` is an error.
   - It has no token characters and never widens, so `Ia-Ic` is the prefix `I` and the letters
     a→c.
3. **integer**
   - The ASCII digits `0`–`9`: at most 9 digits, and no leading zero unless the number is `0`.
   - `08` and longer numbers are not read, so `08-12` and `1-1000000000` are errors
     (`no-system`). Such labels can still be listed.
   - Token characters: `0`–`9`.

The step 4 rule makes `C-D`, `L-M` and `I-L` letters, and `I-V`, `V-X` and `I-X` roman. For example,
the last value of `C-D` is 4 as letters but 500 as roman.

| From | To | Reading | Labels |
|---|---|---|---|
| `1` | `52` | integer 1→52 | `1`, `2`, …, `52` |
| `"Version: 1.0.0"` | `"Version: 1.12.0"` | integer, the minor version, 0→12 | `Version: 1.0.0`, `Version: 1.1.0`, …, `Version: 1.12.0` |
| `inflikat.1` | `inflikat.12` | integer 1→12 | `inflikat.1` … `inflikat.12` |
| `i` | `iv` | roman 1→4 | `i`, `ii`, `iii`, `iv` |
| `"Plansch A"` | `"Plansch D"` | latin A→D | `Plansch A` … `Plansch D` |
| `1a` | `1c` | latin a→c, prefix `1` | `1a`, `1b`, `1c` |
| `C` | `D` | latin: last value 4, not 500 | `C`, `D` |
| `V` | `X` | roman: last value 10, not 24 | `V`, `VI`, …, `X` |
| `I` | `M` | latin: last value 13, not 1000 | `I`, `J`, `K`, `L`, `M` |
| `x` | `l` | roman 10→50; as letters it would descend | `x`, `xi`, …, `l` |
| `iv` | `ix` | roman; the cut `iv`/`ix` comes first, so letters `v`→`x` don't compete | `iv`, `v`, …, `ix` |
| `xi` | `xl` | roman 11→40, for the same reason | `xi`, `xii`, …, `xl` |
| `CC` | `CD` | roman 200→400, for the same reason | `CC`, `CCI`, …, `CD` |
| `08` | `12` | error `no-system`: a leading zero is not read | |

### Flags

A flag after a range or run names the system that reads it. The name is a built-in system or a
plugin system passed in `plugins` (see "API"); any other name is an error (`unknown-system`).

- **The named system reads alone.** `V-X/latin` is the letters `V`, `W`, `X`, while `V-X` is roman.
  If the system doesn't read both ends, the error is `no-system`: `IV-X/roman_additive`. Naming the
  system that would read anyway changes nothing: `V-X/roman` is `V-X`.
- **A run's flag applies to each column.** `I+II..VIIII+X/roman_additive` is `I+II`, `III+IIII`,
  `V+VI`, `VII+VIII`, `VIIII+X`. Without the flag it is an error (`no-system`).
- **Plugin systems are read only through a flag.** They are never in the hierarchy. So a string
  without flags reads the same in every reader, and a string with a flag reads the same in every
  reader that is given its system.
- **Names.** A standard name is the name of a system or script, optionally followed by `_` and a
  language subtag (`latin_sv`) or a variant (`roman_additive`). Each system has one name.

### Plugin systems

These systems are defined here and ship with the implementations. Each one is read only by a call
that is given it in `plugins` (see "API").

1. **roman_additive**
   - Roman numerals 1–3999 written without subtraction: a digit repeats up to four times. 4 is
     `IIII`, 9 is `VIIII`, 40 is `XXXX`, 90 is `LXXXX`, 400 is `CCCC` and 900 is `DCCCC`.
   - All upper case or all lower case, and the case is kept. `IV` and `IX` are not read.
   - Token characters as for roman.
   - `I-X/roman_additive` is `I`, `II`, `III`, `IIII`, `V`, `VI`, `VII`, `VIII`, `VIIII`, `X`.
2. **latin_sv**
   - The Swedish alphabet: `A`–`Z`, then `Å`, `Ä`, `Ö`, and the same in lower case. A letter's
     value is its position. The case is kept.
   - No token characters. `A-Ö/latin_sv` is 29 PDF pages.
3. **greek**
   - The 24 letters `Α`–`Ω` and `α`–`ω`, by position. The case is kept. No token characters.
   - The final sigma `ς` is not read.
4. **hebrew**
   - The 22 letters `א`–`ת`, by position, without case. No token characters.
   - The final forms `ך`, `ם`, `ן`, `ף` and `ץ` are not read. This is the alphabet, not gematria.

## Normal form

The same sequence can be written in several ways: `1,2,3` and `1-3`, `1-3, 4-6` and `1-6`,
`1 , 2+3 .. 6+7` and `1, 2+3..6+7`. `normalize` writes one string for each page model:

1. **Expand** the text to its page model. `equals(a, b)` compares models, with labels compared
   exactly, case included.
2. **Fold** in one pass from the first PDF page:
   1. If the next page has the same ignored flag and the same number of labels, read the two pages
      as a range (one label each) or a run (several labels each), with each system in turn: the
      built-in systems in hierarchy order, then the given plugin systems in name order. Each
      valid reading is a *pair reading*. The second page must be exactly one step after the first.
   2. Extend each pair reading while the following page equals the next label (or labels) it
      generates.
   3. The longest stretch wins. Of stretches of the same length, the earlier system's wins.
   4. Write the stretch as one item if it has at least 2 pages with one label each, or at least 3
      pages with several labels each. Write the winning system's flag after it only if the item
      would read as other pages without it: the letters `V, W, X` are written `V-X/latin`, because
      `V-X` reads as roman. Otherwise write the page on its own. Continue after what was written.
3. **Join** the items with `, ` (one space after the comma), with no other whitespace. `!` is
   written directly before its item.
4. **Quote** a label when it can't be written bare, or when it contains a space, escaping `"` and
   `\`. Apart from that, labels are written exactly as in the input; `normalize` never respells a
   label.

**It is unique,** because step 1 removes every difference in notation and steps 2–4 depend only on
the model and the given systems. With `latin_sv` given, the letters A…Ö are written
`A-Ö/latin_sv`; without it, `A-Z, Å, Ä, Ö`. **It is short.** Apart from the quotes that step 4 adds
to labels with spaces, and the flags written where systems collide, it is never longer than the
plain list: `a-b` is one character shorter than `a, b`, and `P..Q` is shorter than the list from 3
pages on. Where systems collide, it is not always the shortest possible string.

Examples:

- `1,2,3` → `1-3`
- `1, 2+3, 4+5, 6+7, 8` and `1, 2+3..6+7, 8` → `1, 2+3..6+7, 8`
- `1-20, 21-52` → `1-52`, but `1-20, 22-52` stays as it is, because 21 is missing
- `i,ii,iii,iv, 1-48` → `i-iv, 1-48`
- `1, 2+3, !3, 4` stays as it is: the ignored page breaks the run
- `1, 2` → `1-2`, but `2+3, 4+5` stays: a run of two spreads is not shorter
- `"Omslag", 2-31` → `Omslag, 2-31` (the quotes were not needed)
- `Appendix A - Appendix C` → `"Appendix A"-"Appendix C"` (the labels contain a space)
- `I, ii, III` stays as it is: the labels differ in case, so they don't continue each other
- `V, W, X` → `V-X/latin`, because `V-X` would read as roman
- `V, W, X, Y` → `V-Y`, because `Y` is not a roman numeral
- the 16 letters `I, J, …, W, X` → `I-X/latin`, because `I-X` would read as roman
- `V-X/roman` → `V-X`: the flag isn't needed
- `I, II, III, IIII, V, VI, VII, VIII, VIIII, X` → `I-X/roman_additive` with `roman_additive`
  given, and `I-III, IIII, V-VIII, VIIII, X` without it
- `1–52` (with an en dash) is an error; `clean` repairs it

`normalize` is strict. It accepts exactly the syntax above, and it is what stored data uses. To
check that a stored value is in normal form, compare `normalize(x)` with `x`. That checks against
the version that is running (see "Versioning").

## Errors

An error has a **kind** from the table below and a **position**:

- The position is the first non-space character of the item that holds the error, counted in code
  points after NFC.
- For an empty item, it is the position just after the item's comma. For an empty sequence, it is
  0.
- For `bad-length` and `length-mismatch`, it is `null`.

When an input has several errors, which one is reported is up to the implementation. The wording
of the message is also up to the implementation.

| Kind | When | Examples |
|---|---|---|
| `syntax` | The text doesn't follow the grammar | `1-2-3`, `1-3+4-6`, `2+3-46+47`, `1+2..3+4..5+6`, `-5`, `2+`, `+3`, `1..`, `2+3..`, `"a"b`, `"a\b"`, `1-5/`, `1-5/Latin` |
| `reserved-char` | A reserved character is outside quotes, or a control character is anywhere | `1–52`, `1; 2`, `2\|3`, `Hej!`, `!!3`, `1-!3`, `My"label`, `a\b`, `a/b`, `V/latin` |
| `unclosed-quote` | A quoted label has no closing `"` | `"Omslag, 2-31` |
| `dot-at-edge` | A bare label starts or ends with `.` | `1...3`, `s.` |
| `empty` | The sequence is empty | the empty string |
| `empty-item` | An item or a quoted label is empty | `1,,2`, `1-52,`, `!`, `""` |
| `open-end` | A range has no last label | `1-` |
| `single-label-run` | `..` is used between pages with one label each | `1..16` |
| `equal-ends` | A range or run has the same first and last end | `3-3`, `2+3..2+3` |
| `no-system` | No numbering system reads both ends | `1a-2c`, `omslag-baksida`, `Y-AB`, `08-12`, `1-1000000000`, `IV-X/roman_additive` |
| `unknown-system` | A flag names a system that is neither built in nor given in `plugins` | `1-5/klingon`, and `A-Ö/latin_sv` without `latin_sv` |
| `different-case` | The ends are read with different case | `i-IV`, `a-C` |
| `descending` | The last value is lower than the first | `5-3`, `D-A` |
| `run-shape` | The ends of a run have different numbers of labels | `2+3..46+47+48` |
| `uneven-run` | The ends of a run are not a whole number of steps apart, or its columns step a different number of times | `2+3..5+6`, `2+3..46+49` |
| `duplicate-label` | A label appears twice on the pages that are not ignored, compared without case | `1-5, 3`, `2+2`, `Omslag, 2-31, omslag` |
| `too-long` | The sequence expands to more than 1000 labels, or a label is longer than 100 code points | `1-5000` |
| `bad-length` | The page count is not a positive whole number | `create("1-3", -1)` |
| `length-mismatch` | A page count is given, and the sequence has a different number of PDF pages | `create("1-3", 4)` |

## Cleaning

`clean(text, { length })` is for text that a person types or pastes, in a form for example.

- It repairs notation that has exactly one reading, then normalises strictly. It never guesses
  meaning: input with two readings is still an error.
- Input that is still invalid after the repairs throws, as in `normalize`.
- When the page count is given, the result is also checked against it, as in
  `create(text, length)`.

The repairs:

- `–`, `—` and `−` between labels → `-`
- `;` between items → `,`
- `|` between two single labels → `+` (a habit from v1). Next to a range, it stays an error.
- `…` → `..`
- `..` between single labels → `-`
- curly quotes `“`, `”` and `„` → `"`
- whitespace other than U+0020 → U+0020, by the language's own definition of whitespace
- empty items and a trailing `,` are dropped
- a range or run with equal ends → one page: `3-3` → `3`, `2+3..2+3` → `2+3`
- **an open end:**
  - With a page count, one open range at the very end, after an integer, is closed at that count.
    `i-iv, 1-` with 52 pages → `i-iv, 1-48`, and `1-` with 1 page → `1`.
  - An empty string counts as `1-`, so `clean("", { length: 52 })` gives `1-52`.
  - A `!` before the range doesn't change this.
  - It is an error if there is no page count, if the open range starts with anything other than an
    integer (`i-`, `A-`, `08-`, `inflikat.1-`), or if no pages are left for it.

No repair applies inside straight quotes. Curly quotes are recognised as quotes.

`clean` returns the normal form and the list of repairs: `{ normalized, repairs }`. What each
repair records is up to the implementation. `clean` is outside the strict model, so
implementations may differ on input that only `clean` accepts, such as which characters count as
whitespace. Only `normalized` is shared between them.

## API

The class keeps the v1 API and meaning, except for the changes listed in
[`pagesequence-v2.md`](../pagesequence-v2.md#breaking-changes-from-v1).

**The class:**

- `new PageSequence(text, length?)` and `new PageSequence(text, { length?, plugins? })` parse
  strictly. On invalid input they throw `PageSequenceError` with `kind` and `position`. An empty
  `text` is an error: plain numbering is stored as `1-52`.
- `PageSequence.create(text, …)` takes the same arguments, but returns `undefined` instead of
  throwing.
- Pass the PDF's page count as `length` whenever it is known. The sequence is then checked against
  it, which catches a missing spread or a page counted twice.
- `getIndexLengthAll()` is the number of PDF pages, ignored ones included; `length` is checked
  against it. `getIndexLength()` is the number of PDF pages that are not ignored.
- `getLabelLength()` is the number of labels on the pages that are not ignored.
- `getIndexList()` and `getLabelList()` without an argument give the indexes of all pages that are
  not ignored, and all their labels in order.

**Lookups:**

- `getIndexList(pages)` and `getLabelList(pages)` look up a reference, such as `"20-21"` in a part
  block.
- The reference is parsed as a sequence, with two repairs: dashes (`–`, `—` and `−` → `-`) and
  equal ends (`5-5` → `5`). No other `clean` repair applies, so a change to `clean` never changes
  what a stored reference points to. It is read with the sequence's own `plugins`.
- The lookup gives the PDF pages that carry the reference's labels.
  - A PDF page with other labels, such as an insert between them, is included only if the
    reference lists its labels: in `1-9, 10+11, 10a-10d, 12-20`, `10-12` gives the pages of 10, 11
    and 12, and `10-11, 10a-10d, 12` also gives the insert.
  - PDF page numbers are never used in a reference.
- The lookup ignores case.
- An invalid reference, or one with a label that isn't in the sequence, gives `undefined`. The
  each-label-once rule applies to references too, so `3, 3` gives `undefined`.
- `getIndexList(pages)` gives each index once, in first-seen order.

**Other methods:**

- `labelsAt(index)` gives the labels of one PDF page.
- `formatAt(index)` gives them as displayed (`"2+3"`, `"20+29"`).
- For an ignored page, both give its labels as written after `!`. For an index outside the PDF,
  they give `undefined`.
- `pages()` gives the page model as a list of `{ignored, labels}`.
- `toString()` gives the normal form, written with the sequence's own `plugins`.

**Functions:**

- `normalize(text, { plugins? }) → string` gives the normal form. It throws on invalid input.
- `clean(text, { length?, plugins? }) → { normalized, repairs }` (see "Cleaning").
- `equals(a, b, { plugins? }) → boolean` reads two sequence strings and compares their page
  models. It throws on invalid input.
- `toRoman(num, lowerCase?) → string` writes an integer from 1 to 3999 as a canonical roman
  numeral, in upper case unless `lowerCase` is true. Any other number throws a `RangeError`.
- `fromRoman(roman) → number | undefined` gives the value of a roman numeral, read as the roman
  system reads it (see "Numbering systems"): canonical, 1–3999, all upper or all lower case.
  Anything else gives `undefined`. So `fromRoman(toRoman(n)) === n` for every value, and
  `fromRoman` accepts exactly the tokens the roman system reads.

**Numbering systems:**

- **Plugin systems are passed in, never registered.** Every call that reads a sequence takes the
  plugin systems it may use in `plugins`, and without it only the built-in systems are read. There
  is no global state, so the same call with the same arguments reads the same everywhere.
- A built-in name, or two systems with the same name, in `plugins` throws.
- Each plugin system that ships with the package is imported from its own module:

  ```ts
  import { PageSequence } from "@publication-md/pagesequence";
  import { romanAdditive } from "@publication-md/pagesequence/plugins/roman_additive";

  const plugins = [romanAdditive];
  const seq = new PageSequence("i-x/roman_additive, 1-48", { length: 58, plugins });
  ```
- A system is an object with:
  - `name`, as in "Flags";
  - `tokenChars`, the characters that widening moves over (see "Finding what steps"), or `""`;
  - `read(token)`, which gives `{ value, style }` or `undefined`. The value is a whole number of
    0 or more. The style tells apart tokens with the same value, such as upper and lower case;
  - `format(value, style)`, which gives the token, or `undefined` when the value has none.

  The reader checks the round trip itself: a token is read only if `format` gives it back. Two
  ends with different styles are an error (`different-case`).
- `alphabet(name, upper, lower?)` makes a system of single letters with values by position, such
  as `alphabet("latin_sv", "ABC…XYZÅÄÖ", "abc…xyzåäö")`.

**Python** uses the same names in snake case:

- `PageSequence(text, length=None, *, plugins=())` and `PageSequence.create(...)`, which returns
  `None` on error;
- `get_index_length_all()`, `get_index_length()`, `get_label_length()`, `get_index_list(pages=None)`,
  `get_label_list(pages=None)`;
- `labels_at(index)`, `format_at(index)`, `pages()` and `str()`;
- the functions `normalize(text, *, plugins=())`, `clean(text, length=None, *, plugins=())` and
  `equals(a, b, *, plugins=())`;
- `to_roman(num, lower_case=False)`, which raises `ValueError` outside 1–3999, and
  `from_roman(roman)`, which returns `None` for anything that isn't roman;
- `alphabet(name, upper, lower=None)`. A system has `name`,
  `token_chars`, `read(token)`, which returns `(value, style)` or `None`, and
  `format(value, style)`, which returns a `str` or `None`. The plugin systems are imported from
  their own modules: `from pagesequence.plugins.roman_additive import roman_additive`;
- the exception `PageSequenceError`, with `.kind` and `.position`.

## Versioning

- The built-in systems, their hierarchy, the flags and the plugin systems defined in this spec are
  part of the format version.
- A new built-in system must use characters that no existing system uses and that are not
  reserved. It then only gives a meaning to strings that were invalid before, so it is a minor
  version.
- A new plugin system is a minor version too. It is read only through its flag, which was an error
  (`unknown-system`) before.
- Raising a limit is also a minor version, for the same reason.
- Anything that changes how a valid string reads is a major version.
- What `clean` repairs, and how, can change in a minor version. It only affects what people type;
  references don't use it.
- A new version can still change the normal form of an unchanged model, for example when a new
  system can fold what an earlier version listed. So a normal form is tied to the version that
  wrote it and the systems it was given, and stored sequences are compared with `equals`,
  never as strings.
