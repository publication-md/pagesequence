<p align="center"><img src="logo/pagesequence.svg" alt="PageSequence" width="160"></p>

# PageSequence

A table of contents is written with the page numbers printed in the publication: "Grottor i
Värmland, s. 20–21". The document (like a PDF) of that publication rarely numbers its pages the
same way. It may have an unnumbered cover, roman front matter, an insert with its own numbering, a
missing page, or a spread scanned as one page.

A **page sequence** is a short string that says which labels are printed on each page of the
document. With it, a reference such as `"20-21"` is turned into the right pages of the document,
and each page can be shown with the label printed on it. References are always written in labels,
never in the page numbers a PDF viewer shows.

PageSequence is part of [publication-md](https://github.com/publication-md).

## The notation

- `,` separates pages, and `-` is a range of pages with one label each.
- `+` joins the labels on one page, such as a spread scanned as one page.
- `..` is a run of pages with several labels each.
- `!` marks an ignored page, such as a duplicate scan.
- A label that contains a space or a reserved character is quoted: `"Omslag, insida"`.

| Sequence | The document |
|---|---|
| `1-52` | 52 pages, numbered 1 to 52 |
| `1, 2+3..46+47, 48` | a born-digital issue: the cover, 23 spreads, the back cover |
| `"Omslag", i-iv, 1-48` | an unnumbered cover, roman front matter, then pages 1 to 48 |
| `1-20, A-H, 21-40` | eight plates, lettered A to H, after page 20 |
| `1-25, 26+27, 28-52` | a centre spread scanned as one page |
| `1-5, !3, 6-10` | page 3 scanned twice; the second scan is ignored |

The full format is in [`spec/pagesequence.md`](spec/pagesequence.md).

## Status

**v2 is in development.** It is not published yet, and the format is a draft until v2 is released.

- v2 will be published as `@publication-md/pagesequence` on npm and JSR, and as `pagesequence` on
  PyPI.
- v1 is [`@tvartom/pagesequence`](https://jsr.io/@tvartom/pagesequence) on JSR. Its code is on the
  branch `v1` and the tag `v1.3.3`.

## Documents

- [`spec/pagesequence.md`](spec/pagesequence.md): the format and the API.
- [`pagesequence-v2.md`](pagesequence-v2.md): the design of v2, its reasons, and the move from v1.
- [`ROADMAP.md`](ROADMAP.md): the work for building v2, phase by phase.

## Development

There are two implementations, TypeScript in `ts/` and Python in `py/`, and both are tested against
the shared cases in `testdata/cases.json`. `./check.sh` runs both test suites and a generated
cross-language check. It needs Deno, Node and Python 3.11 or later, and installs nothing.

## Licence

The code is under the [MIT licence](LICENSE). The format description in `spec/` is under
[CC0](LICENSE-SPEC).
