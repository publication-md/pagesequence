"""The plugin system ``roman_additive``: roman numerals 1–3999 written without subtraction, so 4
is ``IIII`` and 9 is ``VIIII``."""

_DIGITS = ((1000, "M"), (500, "D"), (100, "C"), (50, "L"), (10, "X"), (5, "V"), (1, "I"))
_VALUES = {d: v for v, d in _DIGITS}


class _RomanAdditive:
    name = "roman_additive"
    token_chars = "IVXLCDMivxlcdm"

    # Lenient: the reader keeps a token only if ``format`` gives it back.
    def read(self, token: str) -> tuple[int, str] | None:
        upper = token.upper()
        if token != upper and token != token.lower():
            return None
        if any(c not in _VALUES for c in upper):
            return None
        return sum(_VALUES[c] for c in upper), "upper" if token == upper else "lower"

    def format(self, value: int, style: str) -> str | None:
        if not 1 <= value <= 3999:
            return None
        result = ""
        for v, d in _DIGITS:
            while value >= v:
                result += d
                value -= v
        return result.lower() if style == "lower" else result


#: Roman numerals without subtraction (``I-X:roman_additive``).
roman_additive = _RomanAdditive()
