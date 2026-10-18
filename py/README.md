# PageSequence

A **page sequence** is a short string that says which labels are printed on each page of a
document, such as a PDF. With it, a reference written in the labels printed in the publication,
such as `"20-21"`, is turned into the right pages of the document.

```sh
pip install pagesequence
```

```python
from pagesequence import PageSequence

# An unnumbered cover, roman front matter, then pages 1 to 48: 53 pages in all.
seq = PageSequence('"Omslag", i-iv, 1-48', 53)
seq.get_index_list("20-21")  # [24, 25]: the document pages, counted from 0
seq.format_at(1)  # "i"
```

Invalid input raises a `PageSequenceError` with `kind` and `position`; `PageSequence.create`
returns `None` instead. `normalize`, `clean` and `equals` work on sequence strings.

The plugin systems are imported from their own modules and passed in each call:

```python
from pagesequence import normalize
from pagesequence.plugins.roman_additive import roman_additive

normalize("I, II, III, IIII, V", plugins=[roman_additive])  # "I-V/roman_additive"
```

The plugins are `roman_additive`, `latin_sv`, `greek` and `hebrew`. The package has no
dependencies and needs Python 3.11 or later.

The notation and the API are in the
[specification](https://github.com/publication-md/pagesequence/blob/main/spec/pagesequence.md).
PageSequence is part of [publication-md](https://github.com/publication-md). The code is under the
MIT licence.
