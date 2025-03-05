# PageSequence

Parse a string representing page sequence with support for merged pages, ignored pages, and ranges of pages in decimal, letters and roman.

## Tests

Run tests: `deno test`

## Usage

```ts
// Representing a pdf with page 3 and 4 merged to one page in the pdf:
const pageSequence = new PageSequence("1-3|4-6")
pageSequence.getIndexList("3-5") // Returns [2,3]
```

