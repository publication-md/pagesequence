# Is there a standard for page labels?

*2026-10-20*

A table of contents says "Grottor i Värmland, s. 20–21". The scanned document (like a PDF) of that
issue has an unnumbered cover, so page 20 is the document's 21st page. Another issue has roman front
matter, a lettered insert, or a centre spread scanned as one page. To turn "s. 20–21" into the right
pages of the document, something has to say which labels are printed on each page.

PageSequence says it in one short string:

```
"Omslag", i-iv, 1-48
1, 2+3..46+47, 48
1-20, A-H, 21-40
```

Before settling the notation for version 2, we looked for an existing one to adopt. There isn't one.
The idea is old and well supported, but every format we found stores it as data, one page or one
range at a time. The short notations that people do write describe something else.

## The same idea, stored as data

**PDF page labels.** The PDF standard (ISO 32000, table 159 in PDF 1.7) has a `/PageLabels` number
tree in the document catalogue. Its keys are 0-based page indexes, and each starts a range with a
style (`D` decimal, `R` and `r` roman, `A` and `a` letters), a prefix and a start number. A PDF
viewer that shows "iv (4 of 52)" reads it from there. It is the closest relative of PageSequence,
but it gives each page one label, has no way to mark a duplicate scan, and nobody writes it by hand.

**METS.** Digital libraries describe a scanned book in METS XML. Each page in the physical structure
has an `ORDER`, its position, and an `ORDERLABEL`, the number printed on it, such as `xii`. Tools
such as Goobi generate the labels from a pagination dialog: a start value, a numbering (arabic,
roman, uncounted) and a mode (pages, columns, leaves, recto/verso). What ends up in the file is one
label per image.

**IIIF.** A IIIF manifest lists the canvases of a book, each with its own label, such as `p. 12`.
`behavior: paged` asks a viewer to turn pages, and a canvas marked `facing-pages` is a spread.

**The Internet Archive.** Each scanned item has a `scandata.xml` with one entry per leaf (image). An
entry can carry the printed page number, and a page of type "Delete", such as a colour calibration
card, is left out of what readers see. That is PageSequence's `!` for an ignored page, written per
image.

**EPUB and DAISY.** E-books and talking books mark where each printed page begins, so that a reader
can go to "page 45" of the print edition. DAISY sorts the page targets into front matter (`front`),
the normal numbering (`normal`) and anything else (`special`), such as `1-15b` or `A-1`.

## Short notations for other jobs

**Print dialogs and PDF tools.** `1-5, 8, 11-13` is the page range of almost every print dialog.
qpdf adds `r1` for the last page (also `z`), `x3-4` to leave pages out, and `:odd` and `:even`.
These use the same `,` and `-` as PageSequence, but they count the pages of the file. A PageSequence
reference is the opposite: it is always made of the labels printed on the pages.

**Citations.** BibTeX's `pages` field takes `42--111`, `7,41,73--97` or `43+`, where the `+` means
"and pages following that don't form a simple range". In PageSequence, `+` joins the labels on one
page, as in `2+3` for a spread. Style guides also shorten ranges: Chicago writes `123–24` for 123 to
124, and tables of contents copy it.

**Library catalogues.** A catalogue record gives the extent of a book as
`xii, 345 p., [8] leaves of plates`: twelve roman pages, 345 numbered pages, and eight unnumbered
leaves in brackets. It is the nearest human shorthand for how a book is numbered, but it counts
pages. It can't say that the plates sit after page 20.

**Collation formulas.** Bibliographers describe how a book was printed and folded, as in `A–Z⁸ 2A⁴`.
That is about sheets and gatherings, not page numbers.

## What PageSequence takes, and what it adds

| | Where it lives | Labels per page | Duplicate scans | Written by people |
|---|---|---|---|---|
| PDF page labels | inside the PDF | one | no | no |
| METS `ORDERLABEL` | XML, one per image | one | no | no |
| IIIF canvas labels | JSON, one per canvas | one (spreads marked) | no | no |
| Internet Archive scandata | XML, one per image | one | yes ("Delete") | no |
| Print page ranges | a string | none: file pages | no | yes |
| PageSequence | a string | one or more (`2+3`) | yes (`!`) | yes |

PageSequence takes the `,` and `-` that people already write in print dialogs and running text, and
the numbering systems of PDF page labels: integers, roman numerals and letters, with a prefix
(`inflikat.1-12`). It adds what none of the formats above has in a form a person can type: several
labels on one page (`2+3`), runs of spreads written once (`2+3..46+47`), and duplicate scans that
keep their place but take no part in lookups (`!3`).

The search also turned up some ideas:

- **Export to PDF page labels.** A sequence with one label per page maps onto PDF page labels, so a
  tool could write them into the PDF and let any viewer show the printed numbers.
- **Recto and verso.** Manuscripts and early books number leaves, not pages: `1r`, `1v`, `2r`. That
  fits PageSequence as a plugin numbering system.
- **Shortened ranges.** References copied from a table of contents may say `123–24`.

The format is described in [`spec/pagesequence.md`](../spec/pagesequence.md).

## Sources

- [PDF page labels: W3C technique PDF17](https://www.w3.org/WAI/WCAG20/Techniques/pdf/PDF17), and
  [Page Labels in PDF (Mapsoft)](https://mapsoft.com/posts/pdf-page-labels.html)
- [Goobi workflow: Pagination](https://docs.goobi.io/goobi-workflow-en/user/4/4.2/4.2.1)
- [IIIF cookbook: Book behavior variations](https://iiif.io/api/cookbook/recipe/0011-book-3-behavior)
- [FromThePage: Importing works from the Internet Archive](https://github.com/benwbrum/fromthepage/wiki/Importing-Works-from-the-Internet-Archive),
  and [an Internet Archive upload guide (AIT)](https://admin.biodiversitylibrary.org/wiki-archive/mainSpace/files/AIT_WP3_IA_upload.pdf)
- [DAISY Format 2.0 Specification](https://daisy.org/activities/standards/daisy/daisy-2/daisy-format-2-0-specification/)
- [qpdf manual: page ranges](https://github.com/qpdf/qpdf/blob/main/manual/cli.rst)
- BibTeX: *BibTeXing* (`btxdoc`), the description of the `pages` field
