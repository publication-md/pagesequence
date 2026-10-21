<p align="center"><img src="https://raw.githubusercontent.com/publication-md/pagesequence/main/logo/pagesequence.svg" alt="PageSequence" width="160"></p>

# PageSequence

A **page sequence** is a short string that says which labels are printed on each page of a document, such as a PDF. With
it, a reference written in the labels printed in the publication, such as `"20-21"`, is turned into the right pages of
the document.

```sh
npm install @publication-md/pagesequence
deno add jsr:@publication-md/pagesequence
```

```ts
import { PageSequence } from "@publication-md/pagesequence";

// An unnumbered cover, roman front matter, then pages 1 to 48: 53 pages in all.
const seq = new PageSequence('"Omslag", i-iv, 1-48', 53);
seq.getIndexList("20-21"); // [24, 25]: the document pages, counted from 0
seq.labelsAt(1); // ["i"]
```

Invalid input throws a `PageSequenceError` with `kind` and `position`; `PageSequence.create` returns `undefined`
instead. `normalize`, `clean` and `equals` work on sequence strings.

The plugin systems are imported from their own modules and passed in each call, so code that doesn't use them leaves
them out:

```ts
import { normalize } from "@publication-md/pagesequence";
import { romanAdditive } from "@publication-md/pagesequence/plugins/roman_additive";

normalize("I, II, III, IIII, V", { plugins: [romanAdditive] }); // "I-V:roman_additive"
```

The plugins are `roman_additive`, `latin_sv`, `greek` and `hebrew`. The package has no dependencies and runs on Node 22
or later, Deno 2 and in browsers.

The notation and the API are in the
[specification](https://github.com/publication-md/pagesequence/blob/main/spec/pagesequence.md). PageSequence is part of
[publication-md](https://github.com/publication-md). The code is under the MIT licence.
