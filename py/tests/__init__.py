# Lets `python -m unittest`, run from py/, import the package from src/ without installing it.
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "src"))
