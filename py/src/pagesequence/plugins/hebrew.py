"""The plugin system ``hebrew``: the 22 letters א–ת, without case. The final forms are not read.
This is the alphabet, not gematria."""

from .._core import alphabet

#: The Hebrew alphabet (``א-ת/hebrew``).
hebrew = alphabet("hebrew", "אבגדהוזחטיכלמנסעפצקרשת")
