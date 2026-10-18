"""Roman numerals, read and written as the roman numbering system does."""

import re

_ROMAN = (
    (1000, "M"),
    (900, "CM"),
    (500, "D"),
    (400, "CD"),
    (100, "C"),
    (90, "XC"),
    (50, "L"),
    (40, "XL"),
    (10, "X"),
    (9, "IX"),
    (5, "V"),
    (4, "IV"),
    (1, "I"),
)


def to_roman(num: int, lower_case: bool = False) -> str:
    """Write an integer from 1 to 3999 as a canonical roman numeral: 6 is ``VI``.

    Raises ``ValueError`` for any other number.
    """
    if isinstance(num, bool) or not isinstance(num, int) or not 1 <= num <= 3999:
        raise ValueError(f"to_roman: {num!r} is not an integer from 1 to 3999")
    result = ""
    for value, digits in _ROMAN:
        while num >= value:
            result += digits
            num -= value
    return result.lower() if lower_case else result


def from_roman(roman: str) -> int | None:
    """Read a roman numeral as the roman numbering system reads it: ``IV`` is 4.

    It must be canonical, 1–3999, and all upper or all lower case. Anything else (``IIII``,
    ``IC``, ``Iv``, ``MMMM``, ``""``) gives ``None``.
    """
    if not isinstance(roman, str) or not re.fullmatch(r"[IVXLCDM]+|[ivxlcdm]+", roman):
        return None
    upper = roman.upper()
    value = 0
    i = 0
    for v, digits in _ROMAN:
        while upper.startswith(digits, i):
            value += v
            i += len(digits)
    # Canonical means that writing the value gives the same numeral back.
    if i != len(upper) or value > 3999 or to_roman(value) != upper:
        return None
    return value
