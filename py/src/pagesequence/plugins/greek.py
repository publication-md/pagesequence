"""The plugin system ``greek``: the 24 letters Α–Ω and α–ω. The final sigma ``ς`` is not read."""

from .._core import alphabet

#: The Greek alphabet (``Α-Ω:greek``).
greek = alphabet("greek", "ΑΒΓΔΕΖΗΘΙΚΛΜΝΞΟΠΡΣΤΥΦΧΨΩ", "αβγδεζηθικλμνξοπρστυφχψω")
