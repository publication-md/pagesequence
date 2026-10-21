# Plus or pipe: joining the labels on one page

*2026-10-21*

A spread scanned as one page of the document (like a PDF) carries two printed page numbers: the
left half is page 2 and the right half is page 3. A page sequence needs a way to say that both
labels belong to one page. PageSequence v1 used `|`, and v2 uses `+`. Neither character is free of
other meanings, so this post explains why we changed, and why we kept `+` after finding that it
means "and following pages" elsewhere.

## What went wrong with `|` in v1

In v1, `,` separates pages and `|` joins the labels on one page. An issue with a cover, three
spreads and a back cover was written:

```
1,2|3,4|5,6|7,8
```

But `|` looks like a stronger break than `,`. People, and the language models we used to add
markup, read it as the groups "1,2", "3,4", "5,6" and "7,8": four spreads instead of a cover,
three spreads and a back cover. In the Grottan corpus, the markup agents counted such sequences
wrongly in 40 issues.

![1,2|3,4|5,6|7,8 is meant as five pages: a cover, the spreads 2 and 3, 4 and 5, 6 and 7, and a
back cover. It was read as four spreads: 1 and 2, 3 and 4, 5 and 6, 7 and 8.](img/plus-or-pipe-misreading.svg)

`|` has two more problems. It separates the columns of a Markdown table, where publication-md
writes table-of-contents entries, so it has to be escaped there as `\|`. And in a shell it is a
pipe.

## Why `+` in v2

`+` reads as "together": `2+3` is pages 2 and 3 on one sheet. It can't be taken for a break that is
stronger or weaker than `,`. And a page is shown the way it is written, so a reader sees `2+3`.
The issue above in v2, one page at a time:

```
1, 2+3, 4+5, 6+7, 8
```

v2 also introduces a way to write it shorter. The three spreads in a row continue each other, so
they can be written as one run, from `2+3` to `6+7`. That is how PageSequence writes the issue in
its normal form:

```
1, 2+3..6+7, 8
```

![The issue as five document pages, a cover, three spreads and a back cover, with what v1 and v2
write for each.](img/plus-or-pipe-issue.svg)

The choice had one consequence: `-` can't step through spreads, because `2+3-6+7` reads as
arithmetic. A run of pages with several labels each uses `..` instead.

## But `+` already means something

When we surveyed other page notations (see
[Is there a standard for page labels?](2026-10-20-page-label-notations.md)), `+` turned up with
other meanings:

- **BibTeX:** `pages = {43+}` means 43 and following pages that don't form a simple range.
- **Library catalogues:** `xii+345 p.` is twelve roman pages plus 345 arabic ones, and `+ 1 map` is
  material that comes with the book.

Swedish writes "and following" as `s. 43 f.` and `43 ff.`, without a `+`.

We kept `+`, for three reasons:

1. **Its position tells the meanings apart.** BibTeX's `+` comes after a number. PageSequence's
   `+` always stands between two labels. `43+`, `+43` and `43++44` are errors, so someone who
   writes the BibTeX form is told so, instead of getting other pages than they meant.
2. **The catalogue meaning is close.** `xii+345` means "this and that together", which is what
   `2+3` says about one page.
3. **The alternatives are worse.** `|` failed in practice. `&` reads as "and", but it is special in
   shells, in HTML and in URL query strings. `/` already names a numbering system (`V-X/latin`) and
   appears in labels such as `1990/1`. `:` reads as a ratio, and `~` as "about".

## One thing to watch: URLs

In a URL query string, `+` is decoded as a space. `?pages=2+3` arrives as `2 3`, which PageSequence
reads as one label, `2 3`, without an error. Encode a sequence before you put it in a query string:
`encodeURIComponent("2+3")` gives `2%2B3`. A sequence in the path of a URL is not affected.

The format is described in [`spec/pagesequence.md`](../spec/pagesequence.md).
