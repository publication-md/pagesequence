# How the page sequence was born

*2026-10-21*

The table of contents of the Swedish caving magazine Grottan says where each article starts, in the
page numbers printed in the magazine: "s. 3–5". The issues are scanned to PDF, and we wanted each
entry to open the right pages of it. That sounds like a lookup, until you notice that page 3 of
the magazine is seldom page 3 of the PDF.

So next to the table of contents, each issue got a short string that says which printed page
numbers, or *labels*, are on each page of its PDF. That string is the page sequence. The first
ones were written by hand in the spreadsheet that holds Grottan's table of contents. Most were as
plain as `1-52`: 143 of the 235 sequences in use. The rest are below, simplified to an
eight-page issue. Each shows what the PDF looked like, the sequence that describes it, and where
the entries of the table of contents end up.

## A spread scanned as one page

A cave map across the centre spread is no use cut in half, so the scan keeps pages 4 and 5
together as one image. The PDF has seven pages, not eight.

![An eight-page issue with a cave map across the centre spread. The PDF has seven pages: 1, 2, 3,
the spread 4+5 as one page, 6, 7 and 8. The sequence is 1-3, 4+5, 6-8.](img/born-1-spread.svg)

```
1-3, 4+5, 6-8
```

| Article | Printed pages | PDF pages |
|---|---|---|
| A | 2 | 2 |
| B | 3–5 | 3–4 |
| C | 7 | 6 |

37 of the 235 sequences have a centre spread scanned as one page. In the first version of the
notation, the example was written `1-4|5-8`: `|` joined the last page of one range to the first
page of the next, so the whole issue was one item. A 52-page issue was `1-26|27-52`, which version
2 writes as `1-25, 26+27, 28-52`. `+` joins labels, not ranges. The compact form was left out on
purpose: in `1-26|27-52` the reader has to work out that 26 and 27 share a page, while `26+27`
says so directly. The longer form is easier to read, both for people and for language models. Why
`|` became `+` is the subject of [Plus or pipe](2026-10-21-plus-or-pipe.md).

## A born-digital issue

Newer issues come from the layout program, not the scanner. Their PDF has the cover, then every
spread as one page, then the back cover.

![The same eight-page issue as a born-digital PDF, made from the layout: the cover, three spreads
and the back cover, five pages in all. The sequence is 1, 2+3..6+7, 8.](img/born-2-digital.svg)

```
1, 2+3, 4+5, 6+7, 8
```

The spreads continue each other, so they can be written as one run, which is the normal form:

```
1, 2+3..6+7, 8
```

| Article | Printed pages | PDF pages |
|---|---|---|
| A | 2 | 2 |
| B | 3–5 | 2–3 |
| C | 7 | 4 |

43 of the sequences are like this. In the first version they had to list every spread, so a
52-page issue was `1,2|3,4|5,6|` … `|51,52`. The run `..` was added for them:
`1, 2+3..50+51, 52`.

## An insert

Some issues have an insert with its own numbering, such as plates lettered A–D between pages 4
and 5. In Swedish an insert is an *inflikat*, and Grottan 1978-2 has one numbered
`inflikat.0`–`inflikat.11`.

![An eight-page issue with a four-page insert, A to D, between pages 4 and 5. The PDF has twelve
pages. The sequence is 1-4, A-D, 5-8.](img/born-3-insert.svg)

```
1-4, A-D, 5-8
```

| Article | Printed pages | PDF pages |
|---|---|---|
| An article that continues after the insert | 4–6 | 4, 9–10 |
| The insert | A–D | 5–8 |

The article on pages 4–6 skips the insert. A reference is made of labels, so it gives the pages
that carry 4, 5 and 6, never the PDF pages in between.

## A spread behind an insert

Here the insert lies in the middle of the centre spread. To scan the spread, the insert is lifted,
so the PDF has the spread as one page, then the insert's pages.

![An eight-page issue with an insert lying on the centre spread 4 and 5, which has a cave map.
The spread is scanned as one page, then the insert's pages A to D. The sequence is 1-3, 4+5, A-D,
6-8.](img/born-4-spread-behind-insert.svg)

```
1-3, 4+5, A-D, 6-8
```

| Article | Printed pages | PDF pages |
|---|---|---|
| The cave map | 4–5 | 4 |
| An article around it | 3–6 | 3, 4, 9 |
| The insert | A–D | 5–8 |

The Grottan sequence this comes from is `1-19, 20+29, 21-28, 30-48`. There, the pages inside the
spread carry the magazine's own numbers, 21–28, so the spread is 20 and 29. The labels on one page
don't have to follow each other.

## A page scanned twice

Scanners slip. When a page is scanned twice, the PDF has an extra page, and every page after it
moves one step. `!` marks the second scan as ignored: it keeps its place in the PDF, but no lookup
ever lands on it.

![An eight-page issue where page 5 was scanned twice. The PDF has nine pages, and the second scan
of page 5 is ignored. The sequence is 1-5, !5, 6-8.](img/born-5-duplicate.svg)

```
1-5, !5, 6-8
```

| Article | Printed pages | PDF pages |
|---|---|---|
| A | 5 | 5 |
| B | 6 | 7 |

The opposite happens too. Grottan 1984-3 is missing printed page 21, which is simply
`1-20, 22-52`.

## Roman front matter

Reports and books number their front matter with roman numerals, and start again at 1. Grottan
1990-1 even has roman numerals at both ends: `I-VIII, 3-22, IX-XVI`.

![A report with front matter numbered i to iv, then pages 1 to 8. The PDF has twelve pages. The
sequence is i-iv, 1-8.](img/born-6-roman.svg)

```
i-iv, 1-8
```

| Article | Printed pages | PDF pages |
|---|---|---|
| Foreword | iii | 3 |
| A | 1–3 | 5–7 |

## From a spreadsheet column to a format

The notation grew out of those strings. `,` separates pages and `-` is a range, because that is
how page numbers are written in running text. Ranges step through numbers, letters and roman
numerals, and a label can be any word, such as `Omslag` for an unnumbered cover. `|` joined the
labels on one page, and `!` marked a duplicate scan. In February 2024 it became a small library,
`@tvartom/pagesequence` on JSR.

Version 2 keeps all of that and changes what the first years taught us:

- `+` joins the labels on one page, because `|` was read the wrong way round (see
  [Plus or pipe](2026-10-21-plus-or-pipe.md)).
- `..` writes a run of spreads once, for the born-digital issues.
- A label with a reserved character is quoted: `"Omslag, insida"`.
- A flag names the numbering system where the reading rule can't guess it, such as `V-X:latin`,
  or `1-99:odd` for a document scanned one side at a time.

Every example above could be written in the first version too, with `|` for `+` and without the
run. The format is described in [`spec/pagesequence.md`](../spec/pagesequence.md).
