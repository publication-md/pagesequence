// Runs every case in ../testdata/cases.json (see testdata/README.md for the fields).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  clean,
  equals,
  fromRoman,
  greek,
  hebrew,
  latinSv,
  normalize,
  type NumberingSystem,
  PageSequence,
  PageSequenceError,
  romanAdditive,
  toRoman,
} from "./lib.ts";

const PLUGINS: Record<string, NumberingSystem> = { roman_additive: romanAdditive, latin_sv: latinSv, greek, hebrew };

// deno-lint-ignore no-explicit-any
type Case = Record<string, any>;
const data = JSON.parse(readFileSync(new URL("../../testdata/cases.json", import.meta.url), "utf8"));

const STRICT = ["errors", "pages", "normalized", "display", "labelsAt", "lengths", "lookups", "equals"];
const nil = <T>(v: T | undefined) => (v === undefined ? null : v);

function throwsOneOf(f: () => unknown, errors: { kind: string; position: number | null }[], positions = true) {
  try {
    f();
  } catch (e) {
    if (!(e instanceof PageSequenceError)) throw e;
    const ok = errors.some((x) => x.kind === e.kind && (!positions || x.position === e.position));
    assert.ok(ok, `threw ${e.kind} at ${e.position}, expected one of ${JSON.stringify(errors)}`);
    return;
  }
  assert.fail(`did not throw, expected one of ${JSON.stringify(errors)}`);
}

function runSequenceCase(c: Case) {
  const opts = { plugins: (c.plugins ?? []).map((n: string) => PLUGINS[n]), maxLabels: c.maxLabels };
  if (STRICT.some((k) => k in c)) {
    if (c.errors) {
      throwsOneOf(() => new PageSequence(c.input, { ...opts, length: c.length }), c.errors);
      assert.equal(PageSequence.create(c.input, { ...opts, length: c.length }), undefined);
      if (c.length === undefined) throwsOneOf(() => normalize(c.input, opts), c.errors);
    } else {
      const seq = new PageSequence(c.input, { ...opts, length: c.length });
      const pages = seq.pages();
      if (c.pages) {
        assert.deepEqual(pages, c.pages);
        assert.deepEqual(seq.getIndexList(), pages.flatMap((p, i) => (p.ignored ? [] : [i])));
        assert.deepEqual(seq.getLabelList(), pages.flatMap((p) => (p.ignored ? [] : p.labels)));
      }
      if ("normalized" in c) {
        assert.equal(normalize(c.input, opts), c.normalized);
        assert.equal(seq.toString(), c.normalized);
      }
      if (c.display) assert.deepEqual(pages.map((_, i) => seq.labelsAt(i, true)), c.display);
      for (const { index, labels } of c.labelsAt ?? []) {
        assert.deepEqual(nil(seq.labelsAt(index)), labels, `labelsAt(${index})`);
        if (labels === null) assert.equal(seq.labelsAt(index, true), undefined, `labelsAt(${index}, true)`);
      }
      if (c.lengths) {
        assert.deepEqual(
          {
            indexLengthAll: seq.getIndexLengthAll(),
            indexLength: seq.getIndexLength(),
            labelLength: seq.getLabelLength(),
          },
          c.lengths,
        );
      }
      for (const l of c.lookups ?? []) {
        assert.deepEqual(nil(seq.getIndexList(l.pages)), l.indexes, `getIndexList(${JSON.stringify(l.pages)})`);
        assert.deepEqual(nil(seq.getLabelList(l.pages)), l.labels, `getLabelList(${JSON.stringify(l.pages)})`);
      }
      for (const e of c.equals ?? []) {
        assert.equal(equals(c.input, e.with, opts), e.result, `equals with ${JSON.stringify(e.with)}`);
      }
    }
  }
  for (const x of c.cleaned ?? []) {
    const call = () => clean(c.input, { ...opts, length: x.length });
    if (x.errors) throwsOneOf(call, x.errors.map((kind: string) => ({ kind, position: null })), false);
    else assert.equal(call().normalized, x.normalized, `clean with length ${x.length}`);
  }
}

function runRomanCase(c: Case) {
  if ("fromRoman" in c) assert.equal(nil(fromRoman(c.fromRoman)), c.value);
  else if (c.throws) assert.throws(() => toRoman(c.toRoman), RangeError);
  else assert.equal(toRoman(c.toRoman, c.lowerCase), c.roman);
}

for (const [group, cases] of Object.entries(data.groups) as [string, Case[]][]) {
  cases.forEach((c, n) => {
    const what = "input" in c ? JSON.stringify(c.input) : JSON.stringify(c);
    const name = `${group} ${n + 1}: ${what.length > 60 ? what.slice(0, 57) + "…" : what}`;
    test(name, () => (group === "roman" ? runRomanCase(c) : runSequenceCase(c)));
  });
}
