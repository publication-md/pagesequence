"""PageSequence: map the pages of a document to the labels printed on them.

The format is in spec/pagesequence.md; this module follows it section by section, and has the same
structure as the TypeScript module ts/src/pagesequence.ts.
"""

from __future__ import annotations

import re
import unicodedata
from dataclasses import dataclass
from typing import Literal, NamedTuple, Protocol, Sequence, overload

from .roman import from_roman, to_roman


class PageSequenceError(ValueError):
    """An invalid sequence. ``position`` counts code points after NFC, or is ``None`` for page
    counts."""

    def __init__(self, kind: str, position: int | None, message: str | None = None):
        if message is None:
            message = kind if position is None else f"{kind} at position {position}"
        super().__init__(message)
        self.kind = kind
        self.position = position


class NumberingSystem(Protocol):
    """A numbering system (see "API" in the spec)."""

    name: str
    #: The characters that widening moves over, or ``""``.
    token_chars: str

    def read(self, token: str) -> tuple[int, str] | None: ...

    def format(self, value: int, style: str) -> str | None: ...


class _Alphabet:
    def __init__(self, name: str, upper: str, lower: str | None):
        self.name = name
        self.token_chars = ""
        self._cases = [upper] if lower is None else [upper, lower]
        self._styles = [""] if lower is None else ["upper", "lower"]

    def read(self, token: str) -> tuple[int, str] | None:
        if len(token) != 1:
            return None
        for letters, style in zip(self._cases, self._styles):
            i = letters.find(token)
            if i >= 0:
                return i + 1, style
        return None

    def format(self, value: int, style: str) -> str | None:
        if style not in self._styles:
            return None
        letters = self._cases[self._styles.index(style)]
        return letters[value - 1] if 1 <= value <= len(letters) else None

    def __repr__(self) -> str:
        return f"alphabet({self.name!r})"


def alphabet(name: str, upper: str, lower: str | None = None) -> NumberingSystem:
    """Make a system of single letters with values by position, A = 1. Without ``lower``, the
    letters have no case."""
    return _Alphabet(name, upper, lower)


class _Roman:
    name = "roman"
    token_chars = "IVXLCDMivxlcdm"

    def read(self, token: str) -> tuple[int, str] | None:
        value = from_roman(token)
        return None if value is None else (value, "upper" if token == token.upper() else "lower")

    def format(self, value: int, style: str) -> str | None:
        return to_roman(value, style == "lower") if 1 <= value <= 3999 else None


class _Integer:
    name = "integer"
    token_chars = "0123456789"

    def read(self, token: str) -> tuple[int, str] | None:
        # [0-9] is ASCII only; int() alone would also read other digits.
        return (int(token), "") if re.fullmatch(r"0|[1-9][0-9]{0,8}", token) else None

    def format(self, value: int, style: str) -> str | None:
        return str(value) if 0 <= value <= 999_999_999 else None


_integer = _Integer()
#: The built-in systems, in hierarchy order.
_BUILT_IN: tuple[NumberingSystem, ...] = (
    _Roman(),
    alphabet("latin", "ABCDEFGHIJKLMNOPQRSTUVWXYZ", "abcdefghijklmnopqrstuvwxyz"),
    _integer,
)

_MAX_LABEL = 100
_DEFAULT_MAX_LABELS = 10_000


@dataclass
class _Context:
    """The systems and limit one call reads with."""

    by_name: dict[str, NumberingSystem]
    #: The built-in systems in hierarchy order, then the plugins in name order (for the fold).
    fold_order: list[NumberingSystem]
    max_labels: int


def _context(plugins: Sequence[NumberingSystem] = (), max_labels: int = _DEFAULT_MAX_LABELS) -> _Context:
    by_name = {s.name: s for s in _BUILT_IN}
    for p in plugins:
        if p.name in by_name:
            what = "built in" if by_name[p.name] in _BUILT_IN else "given twice"
            raise TypeError(f'plugins: "{p.name}" is {what}')
        by_name[p.name] = p
    if isinstance(max_labels, bool) or not isinstance(max_labels, int) or max_labels < 1:
        raise ValueError(f"max_labels: {max_labels!r} is not a positive integer")
    return _Context(by_name, [*_BUILT_IN, *sorted(plugins, key=lambda p: p.name)], max_labels)


# ---------------------------------------------------------------- Syntax

#: Reserved outside quotes: the operators, the characters ``clean`` repairs, and ``\``.
_RESERVED = set(',-+!"/\\;|…–—−“”„')


def _is_control(c: str) -> bool:
    return c <= "\x1f" or "\x7f" <= c <= "\x9f"


def _is_reserved(c: str) -> bool:
    return c in _RESERVED or _is_control(c)


@dataclass
class _Token:
    #: "label", "-", "+", "..", "|" or "/".
    t: str
    #: The label's text, or the flag's name.
    text: str = ""


@dataclass
class _LexedItem:
    #: The first non-space character, or just after the comma for an empty item.
    start: int
    ignored: bool
    tokens: list[_Token]
    #: Index of the comma that ends the item, or the text's length.
    end: int


def _lex_item(cps: str, i: int, pipe: bool = False) -> _LexedItem:
    """Lex one item from ``i`` (just after a comma, or 0). With ``pipe``, ``|`` is an operator
    (for ``clean``)."""
    n = len(cps)
    j = i
    while j < n and cps[j] == " ":
        j += 1
    start = j

    def fail(kind: str):
        raise PageSequenceError(kind, start)

    tokens: list[_Token] = []
    ignored = False
    if j < n and cps[j] == "!":
        ignored = True
        j += 1
    label_starts = True
    while True:
        while j < n and cps[j] == " ":
            j += 1
        if j == n or cps[j] == ",":
            break
        c = cps[j]
        if c == '"' and label_starts:
            text = ""
            j += 1
            while True:
                if j == n:
                    fail("unclosed-quote")
                ch = cps[j]
                j += 1
                if ch == '"':
                    break
                if ch == "\\":
                    if j == n:
                        fail("unclosed-quote")
                    if cps[j] not in '"\\':
                        fail("syntax")
                    text += cps[j]
                    j += 1
                else:
                    if _is_control(ch):
                        fail("reserved-char")
                    text += ch
            tokens.append(_Token("label", text))
            label_starts = False
        elif c in "-+" or (c == "|" and pipe):
            tokens.append(_Token(c))
            j += 1
            label_starts = True
        elif c == "." and cps[j + 1 : j + 2] == ".":
            tokens.append(_Token(".."))
            j += 2
            label_starts = True
        elif c == "/":
            j += 1
            k = j
            while k < n and re.fullmatch(r"[a-z0-9_]", cps[k]):
                k += 1
            tokens.append(_Token("/", cps[j:k]))
            j = k
            label_starts = False
        elif _is_reserved(c):
            fail("reserved-char")
        else:
            k = j
            while k < n and not _is_reserved(cps[k]) and not (cps[k] == "." and cps[k + 1 : k + 2] == "."):
                k += 1
            text = cps[j:k].rstrip(" ")
            j = k
            if text.startswith(".") or text.endswith("."):
                fail("dot-at-edge")
            tokens.append(_Token("label", text))
            label_starts = False
        last = tokens[-1]
        if last.t == "label" and len(last.text) > _MAX_LABEL:
            fail("too-long")
    if not tokens:
        start = i
    return _LexedItem(start, ignored, tokens, j)


@dataclass
class _Item:
    """A parsed item: a page, a range (one label per page) or a run."""

    start: int
    ignored: bool
    first: list[str]
    last: list[str] | None = None
    flag: str | None = None


def _parse_item(lexed: _LexedItem, ref: bool = False) -> _Item:
    """Parse the tokens of an item. With ``ref``, equal ends are one page (the reference
    repair)."""
    tokens, start = lexed.tokens, lexed.start

    def fail(kind: str):
        raise PageSequenceError(kind, start)

    if not tokens:
        fail("empty-item")
    k = 0

    def page() -> list[str]:
        nonlocal k
        labels = []
        while True:
            if k >= len(tokens) or tokens[k].t != "label":
                fail("syntax")
            labels.append(tokens[k].text)
            k += 1
            if k >= len(tokens) or tokens[k].t != "+":
                return labels
            k += 1

    first = page()
    item = _Item(start, lexed.ignored, first)
    op = tokens[k].t if k < len(tokens) else None
    if op in ("-", ".."):
        k += 1
        if k == len(tokens):
            fail("open-end" if op == "-" and len(first) == 1 else "syntax")
        last = page()
        if op == "-" and (len(first) > 1 or len(last) > 1):
            fail("syntax")
        if op == "..":
            if len(first) == 1 and len(last) == 1:
                fail("single-label-run")
            if len(first) != len(last):
                fail("run-shape")
        if k < len(tokens) and tokens[k].t == "/":
            if tokens[k].text == "":
                fail("syntax")
            item.flag = tokens[k].text
            k += 1
        if first == last:
            if not ref:
                fail("equal-ends")
        else:
            item.last = last
    elif op == "/":
        fail("reserved-char")
    if k < len(tokens):
        fail("syntax")
    return item


# ---------------------------------------------------------------- Numbering


def _char_case(c: str) -> str:
    if c != c.lower():
        return "upper"
    if c != c.upper():
        return "lower"
    return ""


@dataclass
class _Step:
    """A reading of two end labels by one system: the cut, and the values at both ends."""

    system: NumberingSystem
    prefix: str
    suffix: str
    #: Where the cut is, for "the first valid reading fixes where the label is cut".
    cut: tuple[int, int]
    first: tuple[int, str]
    last: tuple[int, str]


def _read_token(system: NumberingSystem, token: str) -> tuple[int, str] | None:
    """Read a token, checking the round trip."""
    r = system.read(token)
    if r is None:
        return None
    value, style = r
    if isinstance(value, bool) or not isinstance(value, int) or value < 0:
        return None
    return r if system.format(value, style) == token else None


def _find_step(a: str, b: str, systems: Sequence[NumberingSystem], step: int) -> _Step | str:
    """"Finding what steps": read ``a`` → ``b`` with ``systems``, stepping by ``step``."""
    p0 = 0
    while p0 < len(a) and p0 < len(b) and a[p0] == b[p0]:
        p0 += 1
    s0 = 0
    while s0 < len(a) - p0 and s0 < len(b) - p0 and a[len(a) - 1 - s0] == b[len(b) - 1 - s0]:
        s0 += 1
    error = None
    valid: list[_Step] = []
    for system in systems:
        p, s = p0, s0
        # Widening: move over token characters, never across case.
        middle_case = ""
        for c in a[p : len(a) - s] + b[p : len(b) - s]:
            middle_case = _char_case(c)
            if middle_case:
                break

        def joins(c: str) -> bool:
            nonlocal middle_case
            if c not in system.token_chars:
                return False
            cc = _char_case(c)
            if cc and middle_case and cc != middle_case:
                return False
            if cc:
                middle_case = cc
            return True

        while p > 0 and joins(a[p - 1]):
            p -= 1
        while s > 0 and joins(a[len(a) - s]):
            s -= 1
        first = _read_token(system, a[p : len(a) - s])
        last = _read_token(system, b[p : len(b) - s])
        if first is None or last is None:
            continue
        if first[1] != last[1]:
            e = "different-case"
        elif last[0] < first[0]:
            e = "descending"
        elif (last[0] - first[0]) % step:
            e = "uneven-run"
        else:
            e = None
        if e:
            error = error or e
            continue
        valid.append(_Step(system, a[:p], a[len(a) - s :], (p, s), first, last))
    if not valid:
        return error or "no-system"
    best = valid[0]
    for r in valid:
        if r.cut == best.cut and r.last[0] < best.last[0]:
            best = r
    return best


def _label_at(step: _Step, value: int) -> str | None:
    """The label ``step`` gives for ``value``, or ``None`` if the system can't write it."""
    token = step.system.format(value, step.first[1])
    return None if token is None else step.prefix + token + step.suffix


def _read_item(first: list[str], last: list[str], systems: Sequence[NumberingSystem]) -> list[_Step] | str:
    """Read the ends of an item column by column. Each column steps the same number of times."""
    width = len(first)
    steps: list[_Step] = []
    for a, b in zip(first, last):
        if a == b:
            return "uneven-run"
        r = _find_step(a, b, systems, width)
        if isinstance(r, str):
            return r
        if steps and r.last[0] - r.first[0] != steps[0].last[0] - steps[0].first[0]:
            return "uneven-run"
        steps.append(r)
    return steps


# ---------------------------------------------------------------- Expansion


def _page(ignored: bool, labels: list[str]) -> dict:
    return {"ignored": ignored, "labels": labels}


def _parse(text: str, ctx: _Context, ref: bool = False) -> list[dict]:
    """Parse a sequence to its page model."""
    if not isinstance(text, str):
        raise TypeError("the sequence must be a str")
    cps = unicodedata.normalize("NFC", text)
    if cps.strip(" ") == "":
        raise PageSequenceError("empty", 0)
    pages: list[dict] = []
    seen: set[str] = set()
    total = 0
    i = 0
    while True:
        lexed = _lex_item(cps, i)
        item = _parse_item(lexed, ref)

        def fail(kind: str):
            raise PageSequenceError(kind, item.start)

        if item.last is None:
            item_pages = [_page(item.ignored, item.first)]
        else:
            systems: Sequence[NumberingSystem] = _BUILT_IN
            if item.flag is not None:
                if item.flag not in ctx.by_name:
                    fail("unknown-system")
                systems = [ctx.by_name[item.flag]]
            steps = _read_item(item.first, item.last, systems)
            if isinstance(steps, str):
                fail(steps)
            width = len(item.first)
            count = (steps[0].last[0] - steps[0].first[0]) // width + 1
            if total + count * width > ctx.max_labels:
                fail("too-long")
            item_pages = []
            for n in range(count):
                labels = [_label_at(s, s.first[0] + n * width) for s in steps]
                if any(label is None for label in labels):
                    fail("no-system")
                if any(len(label) > _MAX_LABEL for label in labels):
                    fail("too-long")
                item_pages.append(_page(item.ignored, labels))
        for page in item_pages:
            total += len(page["labels"])
            if total > ctx.max_labels:
                fail("too-long")
            if page["ignored"]:
                continue
            for label in page["labels"]:
                if label == "":
                    continue
                key = label.lower()
                if key in seen:
                    fail("duplicate-label")
                seen.add(key)
        pages.extend(item_pages)
        if lexed.end >= len(cps):
            break
        i = lexed.end + 1
    return pages


def _check_length(length) -> None:
    if length is not None and (isinstance(length, bool) or not isinstance(length, int) or length < 1):
        raise PageSequenceError("bad-length", None, f"bad-length: {length!r} is not a positive whole number")


# ---------------------------------------------------------------- Normal form


def _quote(label: str) -> str:
    """Write a label, quoted when it can't be written bare or contains a space."""
    bare = (
        label != ""
        and not any(c == " " or _is_reserved(c) for c in label)
        and ".." not in label
        and not label.startswith(".")
        and not label.endswith(".")
    )
    return label if bare else '"' + re.sub(r'[\\"]', lambda m: "\\" + m.group(0), label) + '"'


def _write_page(labels: list[str]) -> str:
    return "+".join(_quote(label) for label in labels)


def _reads_as(pages: list[dict], first: list[str], last: list[str]) -> bool:
    """Do ``first``→``last``, read without a flag, give exactly ``pages``?"""
    steps = _read_item(first, last, _BUILT_IN)
    if isinstance(steps, str):
        return False
    width = len(first)
    if (steps[0].last[0] - steps[0].first[0]) // width + 1 != len(pages):
        return False
    return all(
        _label_at(s, s.first[0] + n * width) == page["labels"][c]
        for n, page in enumerate(pages)
        for c, s in enumerate(steps)
    )


def _fold(pages: list[dict], ctx: _Context) -> str:
    """"Normal form", step 2 to 4: fold the page model in one pass."""
    items: list[str] = []
    i = 0
    while i < len(pages):
        page = pages[i]
        width = len(page["labels"])

        def same(q: int) -> bool:
            return q < len(pages) and pages[q]["ignored"] == page["ignored"] and len(pages[q]["labels"]) == width

        best = None
        if same(i + 1):
            nxt = pages[i + 1]
            for system in ctx.fold_order:
                steps: list[_Step] = []
                for c in range(width):
                    r = _find_step(page["labels"][c], nxt["labels"][c], [system], width)
                    if isinstance(r, str) or r.last[0] - r.first[0] != width:
                        break
                    steps.append(r)
                if len(steps) < width:
                    continue
                n = 2
                while same(i + n) and all(
                    _label_at(s, s.first[0] + n * width) == pages[i + n]["labels"][c] for c, s in enumerate(steps)
                ):
                    n += 1
                if best is None or n > best[1]:
                    best = (system, n)
        mark = "!" if page["ignored"] else ""
        if best is not None and best[1] >= (2 if width == 1 else 3):
            stretch = pages[i : i + best[1]]
            last = stretch[-1]["labels"]
            item = mark + _write_page(page["labels"]) + ("-" if width == 1 else "..") + _write_page(last)
            if not _reads_as(stretch, page["labels"], last):
                item += "/" + best[0].name
            items.append(item)
            i += best[1]
        else:
            items.append(mark + _write_page(page["labels"]))
            i += 1
    return ", ".join(items)


def normalize(text: str, *, plugins: Sequence[NumberingSystem] = (), max_labels: int = _DEFAULT_MAX_LABELS) -> str:
    """The normal form of a sequence. Raises ``PageSequenceError`` on invalid input."""
    ctx = _context(plugins, max_labels)
    return _fold(_parse(text, ctx), ctx)


def equals(
    a: str, b: str, *, plugins: Sequence[NumberingSystem] = (), max_labels: int = _DEFAULT_MAX_LABELS
) -> bool:
    """Do two sequences have the same page model? Labels are compared exactly."""
    ctx = _context(plugins, max_labels)
    return _parse(a, ctx) == _parse(b, ctx)


# ---------------------------------------------------------------- Cleaning

_DASHES = "–—−"
_CURLY = "“”„"


def _outside_quotes(cps: str, fn) -> str:
    """Map the characters outside straight quotes."""
    out = []
    i = 0
    while i < len(cps):
        c = cps[i]
        i += 1
        if c != '"':
            out.append(fn(c))
            continue
        out.append(c)
        while i < len(cps):
            out.append(cps[i])
            i += 1
            if out[-1] == "\\" and i < len(cps):
                out.append(cps[i])
                i += 1
            elif out[-1] == '"':
                break
    return "".join(out)


def _split_items(text: str) -> list[str]:
    """Split at the commas outside straight quotes."""
    items = []
    current = ""
    quoted = False
    i = 0
    while i < len(text):
        c = text[i]
        i += 1
        if quoted and c == "\\" and i < len(text):
            current += c + text[i]
            i += 1
            continue
        if c == '"':
            quoted = not quoted
        if c == "," and not quoted:
            items.append(current)
            current = ""
        else:
            current += c
    items.append(current)
    return items


def _write_tokens(tokens: list[_Token]) -> str:
    return "".join(_quote(t.text) if t.t == "label" else "/" + t.text if t.t == "/" else t.t for t in tokens)


def _page_width(tokens: list[_Token]) -> int:
    """Tokens [label, "+", label, …] → number of labels, or 0."""
    if len(tokens) % 2 == 0:
        return 0
    if any(t.t != ("label" if k % 2 == 0 else "+") for k, t in enumerate(tokens)):
        return 0
    return (len(tokens) + 1) // 2


def _clean_item(text: str, repairs: list[str]) -> tuple[str, tuple[bool, str] | None]:
    """The repairs of one item. Gives the repaired text, or the item as it was if it doesn't lex,
    and the open range ``(ignored, label)`` if the item is one."""
    try:
        lexed = _lex_item(text, 0, True)
    except PageSequenceError:
        return text, None
    tokens = lexed.tokens
    ops = [t for t in tokens if t.t in ("-", "..")]
    if any(t.t == "|" for t in tokens):
        if ops:
            return text, None
        tokens = [_Token("+") if t.t == "|" else t for t in tokens]
        repairs.append("pipe")
    mark = "!" if lexed.ignored else ""
    if len(ops) == 1:
        at = next(k for k, t in enumerate(tokens) if t.t in ("-", ".."))
        flagged = tokens[-1].t == "/"
        left = tokens[:at]
        right = tokens[at + 1 : len(tokens) - 1 if flagged else len(tokens)]
        wl, wr = _page_width(left), _page_width(right)
        if tokens[at].t == "-" and not right and wl == 1 and not flagged:
            return mark + _write_tokens(tokens), (lexed.ignored, left[0].text)
        if wl and wl == wr:
            if tokens[at].t == ".." and wl == 1:
                tokens[at] = _Token("-")
                repairs.append("single-label-run")
            elif tokens[at].t == "-" and wl > 1:
                tokens[at] = _Token("..")
                repairs.append("dash-run")
            if _write_tokens(left) == _write_tokens(right):
                tokens = left
                repairs.append("equal-ends")
    return mark + _write_tokens(tokens), None


class Cleaned(NamedTuple):
    normalized: str
    repairs: list[str]


def clean(
    text: str,
    length: int | None = None,
    *,
    plugins: Sequence[NumberingSystem] = (),
    max_labels: int = _DEFAULT_MAX_LABELS,
) -> Cleaned:
    """Repair what a person typed or pasted, then normalise strictly. With ``length``, an open
    range at the end is closed at that page count, and the result is checked against it."""
    ctx = _context(plugins, max_labels)
    _check_length(length)
    repairs: list[str] = []
    cps = unicodedata.normalize("NFC", text)
    # Character repairs, outside straight quotes. Curly quotes become straight ones.
    chars = []
    i = 0
    while i < len(cps):
        c = cps[i]
        i += 1
        if c == '"':
            chars.append(c)
            while i < len(cps):
                chars.append(cps[i])
                i += 1
                if chars[-1] == "\\" and i < len(cps):
                    chars.append(cps[i])
                    i += 1
                elif chars[-1] == '"':
                    break
        elif c in _CURLY:
            repairs.append("curly-quote")
            chars.append('"')
            while i < len(cps) and cps[i] not in _CURLY and cps[i] != '"':
                chars.append("\\\\" if cps[i] == "\\" else cps[i])
                i += 1
            if i < len(cps):
                chars.append('"')
                i += 1
        elif c != " " and c.isspace():
            repairs.append("space")
            chars.append(" ")
        elif c in _DASHES:
            repairs.append("dash")
            chars.append("-")
        elif c == ";":
            repairs.append("semicolon")
            chars.append(",")
        elif c == "…":
            repairs.append("ellipsis")
            chars.append("..")
        else:
            chars.append(c)
    items: list[str] = []
    open_range = None
    open_at = -1
    for raw in _split_items("".join(chars)):
        if re.fullmatch(r" *!? *", raw):
            repairs.append("empty-item")
            continue
        repaired, is_open = _clean_item(raw, repairs)
        if is_open:
            open_range, open_at = is_open, len(items)
        items.append(repaired)
    if not items and length is not None:
        open_range, open_at = (False, "1"), 0
        items.append("1-")
    if open_range and open_at == len(items) - 1 and length is not None and _read_token(_integer, open_range[1]):
        before = 0 if open_at == 0 else len(_parse(", ".join(items[:open_at]), ctx))
        n = length - before
        if n < 1:
            raise PageSequenceError("open-end", 0, "open-end: no pages are left for the open range")
        ignored, label = open_range
        first = int(label)
        items[open_at] = ("!" if ignored else "") + (label if n == 1 else f"{first}-{first + n - 1}")
        repairs.append("open-end")
    seq = PageSequence(", ".join(items), length, plugins=plugins, max_labels=max_labels)
    return Cleaned(str(seq), repairs)


# ---------------------------------------------------------------- The class


class PageSequence:
    """A page sequence: the labels printed on each page of a document.

    ``PageSequence(text, length=None, *, plugins=(), max_labels=10000)`` parses ``text`` strictly
    and raises ``PageSequenceError`` on invalid input. Pass the document's page count as ``length``
    whenever it is known.
    """

    def __init__(
        self,
        text: str,
        length: int | None = None,
        *,
        plugins: Sequence[NumberingSystem] = (),
        max_labels: int = _DEFAULT_MAX_LABELS,
    ):
        _check_length(length)
        self._ctx = _context(plugins, max_labels)
        self._pages = _parse(text, self._ctx)
        if length is not None and length != len(self._pages):
            raise PageSequenceError(
                "length-mismatch",
                None,
                f"length-mismatch: the sequence has {len(self._pages)} document pages, not {length}",
            )
        #: Lowercased label → (index, label as written), for the pages that are not ignored.
        self._lookup: dict[str, tuple[int, str]] = {}
        for index, page in enumerate(self._pages):
            if not page["ignored"]:
                for label in page["labels"]:
                    self._lookup[label.lower()] = (index, label)

    @classmethod
    def create(cls, text: str, length: int | None = None, **options) -> PageSequence | None:
        """Like the constructor, but gives ``None`` instead of raising ``PageSequenceError``."""
        try:
            return cls(text, length, **options)
        except PageSequenceError:
            return None

    def get_index_length_all(self) -> int:
        """The number of document pages, ignored ones included."""
        return len(self._pages)

    def get_index_length(self) -> int:
        """The number of document pages that are not ignored."""
        return sum(1 for p in self._pages if not p["ignored"])

    def get_label_length(self) -> int:
        """The number of labels on the pages that are not ignored."""
        return sum(len(p["labels"]) for p in self._pages if not p["ignored"])

    def _find(self, pages: str) -> list[tuple[int, str]] | None:
        """The labels of a reference, or ``None`` if it is invalid or names a missing label."""
        text = _outside_quotes(unicodedata.normalize("NFC", pages), lambda c: "-" if c in _DASHES else c)
        try:
            ref = _parse(text, self._ctx, True)
        except PageSequenceError:
            return None
        found = []
        for page in ref:
            for label in page["labels"]:
                hit = None if label == "" else self._lookup.get(label.lower())
                if hit is None:
                    return None
                found.append(hit)
        return found

    @overload
    def get_index_list(self) -> list[int]: ...
    @overload
    def get_index_list(self, pages: str | None = None) -> list[int] | None: ...

    def get_index_list(self, pages: str | None = None) -> list[int] | None:
        """Without ``pages``, the indexes of all pages that are not ignored. With a reference such
        as ``"20-21"``, the indexes of the pages that carry its labels, each once, in first-seen
        order."""
        if pages is None:
            return [i for i, p in enumerate(self._pages) if not p["ignored"]]
        found = self._find(pages)
        return None if found is None else list(dict.fromkeys(index for index, _ in found))

    @overload
    def get_label_list(self) -> list[str]: ...
    @overload
    def get_label_list(self, pages: str | None = None) -> list[str] | None: ...

    def get_label_list(self, pages: str | None = None) -> list[str] | None:
        """Without ``pages``, all labels of the pages that are not ignored. With a reference, its
        labels."""
        if pages is None:
            return [label for p in self._pages if not p["ignored"] for label in p["labels"]]
        found = self._find(pages)
        return None if found is None else [label for _, label in found]

    @overload
    def labels_at(self, index: int, display: Literal[False] = False) -> list[str] | None: ...
    @overload
    def labels_at(self, index: int, display: Literal[True]) -> str | None: ...
    @overload
    def labels_at(self, index: int, display: bool = False) -> list[str] | str | None: ...

    def labels_at(self, index: int, display: bool = False) -> list[str] | str | None:
        """The labels of one document page, or ``None`` outside the document. With ``display``,
        they are one string, as displayed (``"2+3"``)."""
        if isinstance(index, bool) or not isinstance(index, int) or not 0 <= index < len(self._pages):
            return None
        labels = self._pages[index]["labels"]
        return "+".join(labels) if display else list(labels)

    def pages(self) -> list[dict]:
        """The page model: a list of ``{"ignored": bool, "labels": [str, …]}``."""
        return [_page(p["ignored"], list(p["labels"])) for p in self._pages]

    def __str__(self) -> str:
        """The normal form, written with the sequence's own plugins."""
        return _fold(self._pages, self._ctx)

    def __repr__(self) -> str:
        return f"PageSequence({str(self)!r})"
