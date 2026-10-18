# PageSequence v2: roadmap

This file lists the work for building v2, phase by phase. It holds no decisions:

- the format is in [`spec/pagesequence.md`](spec/pagesequence.md);
- the design and its reasons are in [`pagesequence-v2.md`](pagesequence-v2.md);
- decisions and open questions are in [`pagesequence-v2-review.md`](pagesequence-v2-review.md).

The phases:

- **Phases 1–6 are local work.** They end with v2 tested, built and runnable on a developer's
  machine.
- **Phases 7 and 8 (CI and publishing) come later,** and are not started now.
- **Phase 9 deprecates v1** once v2 is published.

Each task has an ID (P1.1, P1.2, …) and a checkbox. A phase is done when its exit criteria hold.

## Ground rules

- **No GitHub Actions before phase 7.** Nothing goes into `.github/workflows/` until then, so
  nothing can run on GitHub. Drafts, if wanted, live in `ci/drafts/`, which GitHub ignores.
- **No dependencies.** Neither implementation has a dependency, at run time or in its tests.
  - JS tests use `node:test` and `node:assert`, which Node and Deno both provide.
  - Python tests use `unittest`.
  - The only tools are the ones a registry needs: `tsc` for the npm build, and `uv` for the Python
    packages.
- **The spec is a draft until release.** It may change during development. When a minor change to
  the spec makes the code smaller, make it:
  1. change `spec/pagesequence.md`;
  2. then `testdata/cases.json`;
  3. then both implementations.
- **The spec leaves draft at release,** as version 1.0 (P8.1).
- **Every phase leaves the repository working.** Commit at the end of each step.

## Phase 1: README and repository structure

- **P1.1** Move v1 out of the root. It lives on in the tag `v1.3.3`, on the branch `v1` and on
  JSR (`@tvartom/pagesequence`).
  - Move `Roman.ts` to `ts/src/roman.ts` with `git mv`, so its history follows.
  - Remove `PageSequence.ts`, `index.ts` and `mod.ts`, the two v1 test files, and `deno.json` and
    `deno.lock`.
- **P1.2** Create the layout from `pagesequence-v2.md`: `testdata/`, `ts/` and `py/`, next to
  `spec/` and `v2/`, which already exist.
- **P1.3** Add `LICENSE` (MIT), `LICENSE-SPEC` (CC0) and `AUTHORS`.
- **P1.4** Write the root `README.md`:
  - what PageSequence is for: a table of contents written in the labels printed in the
    publication, turned into PDF pages;
  - a short guide to the notation, with three or four examples;
  - the status: v2 is in development, and v1 is `@tvartom/pagesequence` on JSR;
  - links to the spec, the design note and this roadmap;
  - the logo from `logo/`.

  The package READMEs come in phase 6.
- **P1.5** Extend `.gitignore` with `dist/`, `*.tgz`, `.venv/`, `__pycache__/`, `*.egg-info/`
  and `build/`.
- **P1.6** Update the dev container with the devcontainer-kit skill.
  - Add `uv`, below the Dockerfile's sentinel. Node 26, Deno 2.9.7 and Python 3.13 are already
    there.
  - Limit VS Code's Deno extension to `ts/` (`deno.enablePaths`).
- **P1.7** Create the config files in `ts/` that the layout in `pagesequence-v2.md` lists.

**Exit:**
- the new layout is in place, and the README explains the project;
- `.github/` doesn't exist.

## Phase 2: Shared test data

- **P2.1** Write `testdata/cases.json` in the format from `pagesequence-v2.md` ("Shared test
  data"), grouped into syntax, ranges, runs, quoting, numbering, flags, plugins, normalisation,
  cleaning, lookups, limits and conversion.
- **P2.2** Make every example in the spec a case. Every error kind has at least one case, and
  inputs with several errors list all of them in `errors`.
- **P2.3** Add the edge cases:
  - the reading rule: `C-D`, `V-X`, `I-M`, `x-l`, `iv-ix`, `xi-xl` and `CC-CD`;
  - widening that doesn't cross case: `Civ-Cix`, `"Kap. Ci"-"Kap. Civ"` and `Di-Div`;
  - non-canonical roman numerals: `IIII-V`;
  - `toRoman` and `fromRoman`: both cases, the values 1 and 3999, and what they reject (`IIII`,
    `IC`, `Iv`, `MMMM` and `""`; 0, 4000 and 2.5);
  - open ends that can't be closed: `i-`, `A-`, `08-` and `inflikat.1-`;
  - `-` between spreads: `2+3-46+47`, and `1-3+4-6`, which stays an error;
  - unlabelled pages: `""` more than once, `""+2`, and a lookup that contains `""`;
  - the limits: 10 000 labels and 100 code points, one more of each, and a lower and a higher
    `maxLabels`;
  - flags and plugins, as listed in `pagesequence-v2.md` ("Shared test data"), plus the run
    `I+II..VIIII+X/roman_additive`.
- **P2.4** Add conversion cases: one per distinct line of `v2/list_of_grottan_in_v1.txt` (42).
  Each has its v2 form from `v2/list_of_grottan_in_v2.txt`, and its pages.
- **P2.5** Add the v1 test cases that still apply, and lookups showing that references are
  labels: in `1-9, 10+11, 10a-10d, 12-20`, compare `10-12` with `10-11, 10a-10d, 12`.
- **P2.6** Document the fields in a short `testdata/README.md`.

**Exit:** every rule in the spec has a case, and the file has been reviewed.

## Phase 3: TypeScript implementation

- **P3.1** Write the parser module in `ts/src/`, and `mod.ts`, which exports it and `roman.ts`.
  The parser module covers:
  - the lexer and parser, flags included;
  - the three numbering systems and the reading rule;
  - the `plugins` and `maxLabels` options, the system interface and `alphabet`;
  - expansion and the fold;
  - `clean`;
  - the `PageSequence` class, `normalize`, `equals` and `PageSequenceError`.
- **P3.2** Bring `roman.ts` to the spec ("API"), remove `romanPattern`, and fix the doc comments
  (6 is `VI`, and `IV` is 4).
- **P3.3** Write the plugins in `ts/src/plugins/`, one module each, as "Plugins" in
  `pagesequence-v2.md` describes: `roman_additive.ts`, `latin_sv.ts`, `greek.ts` and `hebrew.ts`.
- **P3.4** Write `ts/test/`. It reads `../testdata/cases.json` and runs every case with
  `node:test`. It also checks the roman round trip for 1–3999 in both cases, as v1's
  `Roman.test.ts` did.
- **P3.5** Add the local tasks in `ts/deno.json`: `test`, `lint` and `fmt --check`.
- **P3.6** Record the size of the core (the parser and `roman.ts`) and of each plugin, so later
  growth is visible.

**Exit:** all shared cases pass with `deno task test`.

## Phase 4: Python implementation

- **P4.1** Write `py/src/pagesequence/` with the same structure, `roman.py` and `plugins/`
  included, using the Python names from the spec.
- **P4.2** Write `py/tests/`. It reads `../testdata/cases.json` with `unittest`.
- **P4.3** Write `pyproject.toml`: name `pagesequence`, Python 3.11 or later, no dependencies.

**Exit:** all shared cases pass with `python -m unittest`, run from `py/`.

## Phase 5: Cross-language check, locally

- **P5.1** Write a seeded generator, `testdata/generate.py`, using the standard library only.
  It writes a few thousand inputs to a file, including runs in the plugin systems. Each input is
  checked with no plugins and with all of them.
- **P5.2** Have each implementation write its results as JSON, and a compare script report the
  first difference.
- **P5.3** Check the properties from `pagesequence-v2.md`: round trip, idempotent, unique, not
  longer, and `clean` agrees.
- **P5.4** Cut any failure down to a small case and add it to `cases.json`.
- **P5.5** Write one local command, `./check.sh`, that runs both test suites and the
  cross-language check.

**Exit:**
- both implementations agree on every generated input;
- `./check.sh` runs every check locally.

## Phase 6: Build for each registry, locally

- [ ] **P6.1** Set version 2.0.0 in `ts/package.json`, `ts/deno.json` and `py/pyproject.toml`, each
  with an SPDX licence field.
- [ ] **P6.2** Build for npm:
  - `tsc` builds `ts/dist/`: ESM `.js` and `.d.ts` files.
  - Set `"sideEffects": false` in `package.json`, and give each plugin a subpath in `exports`
    (`./plugins/roman_additive`).
  - `npm pack` makes the tarball.
  - Install it in a scratch project and run a smoke test.
  - Bundle an app that uses only the core, and check that no plugin is in the bundle.
  - Run the shared cases against `dist/` with `node --test`.
- [ ] **P6.3** Give each plugin its own entry in the `exports` of `ts/deno.json`, and check JSR with
  `deno publish --dry-run`, run from `ts/`.
- [ ] **P6.4** Build for PyPI: `uv build` makes the sdist and the wheel. Install the wheel in a
  fresh virtual environment and run a smoke test.
- [ ] **P6.5** Write the package READMEs (`ts/README.md` and `py/README.md`), which the registries
  show: how to install it, a short example, and a link to the spec.
- [ ] **P6.6** Try the local npm build in publication-md.
  - Convert its stored sequences with the two `v2/` files.
  - Run the reference check (6.3 in the review), using v1 from JSR
    (`@tvartom/pagesequence@1.3.3`).

**Exit:**
- the three packages build, install and pass a smoke test locally;
- publication-md works with the local build;
- nothing is published.

## Later: not started now

### Phase 7: CI

This is the first phase that adds files to `.github/workflows/`.

- [ ] **P7.1** Add a test workflow on every push. It runs `./check.sh`: both test suites and the
  cross-language check.
- [ ] **P7.2** Add a version check: the tag's version must equal the versions in `package.json`,
  `deno.json` and `pyproject.toml`.
- [ ] **P7.3** Add a release workflow, started by a `v2.x.y` tag. Each publish step can be re-run,
  and it skips a registry that already has the version.

### Phase 8: Publishing

- [ ] **P8.1** Take the spec out of draft. Its status becomes version 1.0, and after that a change
  in behaviour follows the spec's "Versioning" rules.
- [ ] **P8.2** On PyPI, register the name `pagesequence` (free on 2026-10-18), set up a pending
  trusted publisher, and try a release on TestPyPI.
- [ ] **P8.3** On jsr.io, create the `@publication-md` scope and link the package to the
  repository.
- [ ] **P8.4** On npmjs.com, create the `@publication-md` organisation. Publish 2.0.0 there by hand,
  with 2FA, then set up trusted publishing.
- [ ] **P8.5** Push the tag `v2.0.0`. The release workflow publishes to JSR and PyPI, and skips npm,
  which already has 2.0.0.
- [ ] **P8.6** Switch publication-md to the published package.

### Phase 9: Deprecate v1

Do this once v2 is published.

- [x] **P9.1** Create the branch `v1` from the tag `v1.3.3`, and add the test fix (`97b80c6`).
- [ ] **P9.2** Mark v1 as deprecated, with a reference to v2:
  - a notice at the top of the README;
  - `@deprecated` on the exported class and functions, so editors show it;
  - the package description on JSR.

  The code stays the same.
- [ ] **P9.3** Publish 1.3.4 to JSR from the `v1` branch, and tag it `v1.3.4`.
- [ ] **P9.4** Archive `@tvartom/pagesequence` on JSR, if the package settings offer it, so its page
  shows that it is read-only. Check JSR's documentation first.
- [ ] **P9.5** Update `pagesequence-v2.md`, which says v1 "stays on JSR as it is".
