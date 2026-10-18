"""PageSequence: map the pages of a PDF to the labels printed on them.

The plugin systems are not imported here. Each one is imported from its own module, such as
``pagesequence.plugins.roman_additive``, and passed in ``plugins``.
"""

from ._core import (
    Cleaned,
    NumberingSystem,
    PageSequence,
    PageSequenceError,
    alphabet,
    clean,
    equals,
    normalize,
)
from .roman import from_roman, to_roman

__all__ = [
    "Cleaned",
    "NumberingSystem",
    "PageSequence",
    "PageSequenceError",
    "alphabet",
    "clean",
    "equals",
    "from_roman",
    "normalize",
    "to_roman",
]
