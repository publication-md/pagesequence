"""Check that the package manifests carry one version, and that it is the release tag's.

    python3 .github/version.py           # the manifests agree; prints the version
    python3 .github/version.py v2.1.0    # and the tag is v + that version; prints the outputs
                                         # the release workflow needs

npm and JSR write a release candidate as 2.0.0-rc.1, PyPI as 2.0.0rc1 (PEP 440). A release
candidate goes to npm under the dist-tag next, so latest isn't moved.
"""

import json
import re
import sys
import tomllib
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
VERSION = re.compile(r"(\d+\.\d+\.\d+)(?:-rc\.(\d+))?")


def load(path):
    text = (ROOT / path).read_text(encoding="utf-8")
    return tomllib.loads(text) if path.endswith(".toml") else json.loads(text)


def main():
    version = load("ts/package.json")["version"]
    m = VERSION.fullmatch(version)
    if not m:
        sys.exit(f"ts/package.json: {version!r} is not X.Y.Z or X.Y.Z-rc.N")
    python = m[1] + (f"rc{m[2]}" if m[2] else "")
    lock = load("ts/package-lock.json")
    found = [
        ("ts/package-lock.json", lock["version"], version),
        ('ts/package-lock.json, packages[""]', lock["packages"][""]["version"], version),
        ("ts/deno.json", load("ts/deno.json")["version"], version),
        ("py/pyproject.toml", load("py/pyproject.toml")["project"]["version"], python),
    ]
    wrong = [f"  {name}: {v}, expected {expected}" for name, v, expected in found if v != expected]
    if wrong:
        sys.exit("\n".join([f"versions differ from ts/package.json ({version}):"] + wrong))
    if len(sys.argv) < 2:
        print(f"versions: all {version}")
        return
    tag = sys.argv[1]
    if tag != "v" + version:
        sys.exit(f"tag {tag} doesn't match the manifests' version {version}")
    print(f"version={version}")
    print(f"python={python}")
    print(f"npm_tag={'next' if m[2] else 'latest'}")


if __name__ == "__main__":
    main()
