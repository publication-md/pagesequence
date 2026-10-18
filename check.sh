#!/usr/bin/env bash
# Run every local check: both test suites and the cross-language check.
#
#     ./check.sh [--seed N] [--models N]
#
# Needs Deno, Node and Python 3.11 or later. The only thing installed is the TypeScript compiler,
# in ts/node_modules, for the npm build.
set -euo pipefail
cd "$(dirname "$0")"

work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT

echo "== TypeScript (Deno)"
(cd ts && deno task test && deno task lint && deno task fmt)

echo "== TypeScript (Node)"
(cd ts && node --test test/)

echo "== TypeScript (npm build, Node)"
(cd ts && npm ci --silent && npm run --silent build && PAGESEQUENCE_DIST=1 node --test test/)

echo "== Python"
(cd py && python3 -m unittest)

echo "== Cross-language check"
python3 testdata/generate.py "$work/inputs.json" "$@"
(cd ts && deno run --allow-read --allow-write test/crosscheck.ts "$work/inputs.json" "$work/ts.json")
python3 py/tests/crosscheck.py "$work/inputs.json" "$work/py.json"
python3 testdata/compare.py "$work/ts.json" "$work/py.json"

echo "== All checks passed"
