// What cases.json can't express: the roman round trip, and the checks on `plugins` and options.
import { test } from "node:test";
import assert from "node:assert/strict";
import { alphabet, fromRoman, latinSv, normalize, PageSequence, toRoman } from "./lib.ts";

test("roman round trip, 1–3999, both cases", () => {
  for (let n = 1; n <= 3999; n++) {
    assert.equal(fromRoman(toRoman(n)), n);
    assert.equal(fromRoman(toRoman(n, true)), n);
    assert.equal(toRoman(n, true), toRoman(n).toLowerCase());
  }
});

test("a plugin with a built-in name throws", () => {
  assert.throws(() => normalize("1-3", { plugins: [alphabet("latin", "AB", "ab")] }), TypeError);
});

test("two plugins with the same name throw", () => {
  assert.throws(() => normalize("1-3", { plugins: [latinSv, alphabet("latin_sv", "AB")] }), TypeError);
});

test("a custom alphabet", () => {
  const plugins = [alphabet("x_abc", "ABC")];
  assert.equal(normalize("A, B, C", { plugins }), "A-C");
  assert.deepEqual(new PageSequence("A-C/x_abc", { plugins }).getLabelList(), ["A", "B", "C"]);
});

test("the constructor takes the page count as its second argument", () => {
  assert.equal(new PageSequence("1-3", 3).getIndexLengthAll(), 3);
  assert.equal(PageSequence.create("1-3", 4), undefined);
});

test("an instance keeps its plugins for lookups and toString", () => {
  const seq = new PageSequence("A-Ö/latin_sv", { plugins: [latinSv] });
  assert.deepEqual(seq.getIndexList("Å-Ö/latin_sv"), [26, 27, 28]);
  assert.equal(seq.toString(), "A-Ö/latin_sv");
});

test("maxLabels must be a positive integer", () => {
  assert.throws(() => normalize("1-3", { maxLabels: 0 }), RangeError);
});
