# Sizes

The size of the TypeScript source, recorded so that later growth is visible (roadmap P3.6). Code lines leave out blank
lines and comments. Gzip is `gzip -9` of the source file, not of a bundle.

## 2026-10-18, first implementation

| File                        |   Lines | Code lines |      Bytes |      Gzip |
| --------------------------- | ------: | ---------: | ---------: | --------: |
| `pagesequence.ts`           |     844 |        709 |     29 080 |     8 585 |
| `roman.ts`                  |      56 |         42 |      1 580 |       769 |
| **core**                    | **900** |    **751** | **30 660** | **9 121** |
| `plugins/roman_additive.ts` |      37 |         28 |      1 240 |       657 |
| `plugins/latin_sv.ts`       |      12 |          6 |        334 |       295 |
| `plugins/greek.ts`          |       8 |          2 |        370 |       326 |
| `plugins/hebrew.ts`         |       9 |          2 |        356 |       296 |

Measured with:

```sh
wc -l -c src/*.ts src/plugins/*.ts
grep -cvE '^\s*($|//|/\*\*|\*)' src/pagesequence.ts
gzip -9c src/pagesequence.ts | wc -c
```
