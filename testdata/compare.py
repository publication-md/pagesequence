"""Compare the result files of two implementations and report the first difference.

    python3 testdata/compare.py A.json B.json
"""

import json
import sys


def main():
    names = sys.argv[1:3]
    a, b = (json.load(open(name, encoding="utf-8")) for name in names)
    if len(a) != len(b):
        print(f"different numbers of results: {len(a)} and {len(b)}")
        sys.exit(1)
    for n, (x, y) in enumerate(zip(a, b)):
        if x != y:
            print(f"first difference, result {n}: input {x['input']!r}, plugins {x['plugins']}")
            for name, r in zip(names, (x, y)):
                print(f"  {name}: " + json.dumps({k: v for k, v in r.items() if k not in ("input", "plugins")},
                                                ensure_ascii=False))
            sys.exit(1)
    print(f"compare: all {len(a)} results agree")


if __name__ == "__main__":
    main()
