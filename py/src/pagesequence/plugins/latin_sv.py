"""The plugin system ``latin_sv``: the Swedish alphabet, A–Z then Å, Ä, Ö."""

from .._core import alphabet

#: The Swedish alphabet (``A-Ö:latin_sv``).
latin_sv = alphabet("latin_sv", "ABCDEFGHIJKLMNOPQRSTUVWXYZÅÄÖ", "abcdefghijklmnopqrstuvwxyzåäö")
