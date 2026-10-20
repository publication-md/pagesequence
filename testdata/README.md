# Shared test data

`cases.json` is the contract between the implementations. The TypeScript and the Python test
suites both read it, so a change in behaviour fails in both languages at once. The format is in
[`../spec/pagesequence.md`](../spec/pagesequence.md); where a case and the spec differ, the spec
wins and the case is fixed.

## Layout

```json
{"description": "…", "groups": {"syntax": [case, …], "ranges": [case, …], …}}
```

The groups are `syntax`, `ranges`, `runs`, `quoting`, `numbering`, `flags`, `plugins`,
`normalisation`, `cleaning`, `lookups`, `limits`, `conversion` and `roman`. The order of the
groups and of the cases has no meaning.

## Sequence cases

Every group except `roman` holds sequence cases. Each has an `input`, and only the fields that
apply to it.

| Field | Meaning |
|---|---|
| `input` | The sequence text. |
| `plugins` | The names of the plugin systems that every call in the case is given, such as `["roman_additive"]`. Without it, none. |
| `maxLabels` | The label limit that every call in the case is given. Without it, the default (10 000). |
| `length` | The page count passed to the constructor as `indexLengthAll`. Without it, none. |
| `errors` | The input is invalid: every error the constructor may throw, as `{kind, position}`. It passes when the error it throws matches one entry, kind and position. `normalize` must throw a matching error too, unless `length` is set: `normalize` takes no page count. |
| `pages` | The page model, `pages()`: one entry per document page, `{ignored, labels}`. |
| `normalized` | `normalize(input)`, and `toString()` of the instance. |
| `display` | `labelsAt(i, true)` for every document page, ignored ones included. |
| `labelsAt` | `[{index, labels}]`: `labelsAt(index)`. `labels` is `null` for an index outside the document (`undefined` in TypeScript, `None` in Python). |
| `lengths` | `{indexLengthAll, indexLength, labelLength}`: `getIndexLengthAll()`, `getIndexLength()` and `getLabelLength()`. |
| `lookups` | `[{pages, indexes, labels}]`: `getIndexList` and `getLabelList` with `pages`. `null` means `undefined`/`None`. |
| `equals` | `[{with, result}]`: `equals(input, with)`. |
| `cleaned` | `[{length?, normalized?, errors?}]`: `clean(input, {indexLengthAll: length})`. `normalized` is the expected result; `errors` lists the error kinds it may throw instead. Positions aren't checked for `clean`, since its repairs are up to the implementation. |
| `v1` | `conversion` only: the v1 string, from `../v2/list_of_grottan_in_v1.txt`. `input` is its v2 form, from `../v2/list_of_grottan_in_v2.txt`, and `pages` is the page model v1 gives it. |
| `note` | A comment for people. |

A case without any of `errors`, `pages`, `normalized`, `display`, `labelsAt`, `lengths`, `lookups`
and `equals` (a case with only `cleaned`) says nothing about strict parsing, so the constructor is
not called. When `pages` is given, a test also checks `getIndexList()` and `getLabelList()` without an argument
against it: the indexes of the pages that are not ignored, and their labels in order.

## Roman cases

The `roman` group tests `toRoman` and `fromRoman`.

| Fields | Meaning |
|---|---|
| `toRoman`, `lowerCase`?, `roman` | `toRoman(toRoman, lowerCase)` gives `roman`. |
| `toRoman`, `throws` | `toRoman(toRoman)` throws (`RangeError` in TypeScript, `ValueError` in Python). |
| `fromRoman`, `value` | `fromRoman(fromRoman)` gives `value`; `null` is `undefined`/`None`. |

## Choices the cases make

These follow from the spec as it reads now. Each of them is tested here:

- A run whose column doesn't step, such as `1+2..1+4`, is `uneven-run`; the case also allows
  `equal-ends` and `no-system`.
- A label generated inside a range counts towards the 100-code-point limit.
- The labels of ignored pages count towards the label limit.
- Text with nothing but spaces is `empty`; the case also allows `empty-item`.
- `getLabelList(sequence)` gives each label of the reference as the instance spells it, in the
  order of the reference.

## Unicode

The cases use only characters that both languages lowercase and normalise the same way. Whitespace
in `clean` cases is limited to tab, newline and U+00A0, which both languages treat as whitespace.
