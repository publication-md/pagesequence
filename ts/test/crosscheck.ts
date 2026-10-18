// Cross-language check: read the generated inputs, write this implementation's results, and check
// the properties of the normal form (see "Cross-language test" in pagesequence-v2.md).
//
//     deno run --allow-read --allow-write test/crosscheck.ts IN.json OUT.json
//     node test/crosscheck.ts IN.json OUT.json
//
// Exits with 1 and prints the first failures if a property doesn't hold.
import { readFileSync, writeFileSync } from "node:fs";
import process from "node:process";
import { clean, normalize, type Page, PageSequence, PageSequenceError } from "../src/mod.ts";
import { romanAdditive } from "../src/plugins/roman_additive.ts";
import { latinSv } from "../src/plugins/latin_sv.ts";
import { greek } from "../src/plugins/greek.ts";
import { hebrew } from "../src/plugins/hebrew.ts";

const PLUGIN_SETS = { none: [], all: [romanAdditive, latinSv, greek, hebrew] };

function quoteLabel(label: string): string {
  // Write the one-label page and read back how `normalize` quotes it.
  return normalize(`"${label.replace(/[\\"]/g, (c) => "\\" + c)}"`);
}

const plain = (pages: Page[]) =>
  pages.map((p) => (p.ignored ? "!" : "") + p.labels.map(quoteLabel).join("+")).join(", ");

function flagChars(normalized: string): number {
  // A flag is "/" and a name after the last label of an item; quoted labels may contain "/".
  let n = 0;
  let quoted = false;
  const cps = Array.from(normalized);
  for (let i = 0; i < cps.length; i++) {
    const c = cps[i];
    if (quoted && c === "\\") {
      i++;
      continue;
    }
    if (c === '"') quoted = !quoted;
    else if (c === "/" && !quoted) {
      let j = i + 1;
      while (j < cps.length && cps[j] !== "," && cps[j] !== " ") j++;
      n += j - i;
    }
  }
  return n;
}

const len = (s: string) => Array.from(s).length;
const [input, output] = process.argv.slice(2);
const inputs: { input: string }[] = JSON.parse(readFileSync(input, "utf8")).inputs;
// deno-lint-ignore no-explicit-any
const results: Record<string, any>[] = [];
const failures: unknown[] = [];
const unique = new Map<string, string>();
for (const { input: text } of inputs) {
  for (const [setName, plugins] of Object.entries(PLUGIN_SETS)) {
    // deno-lint-ignore no-explicit-any
    const r: Record<string, any> = { input: text, plugins: setName };
    const fail = (property: string, detail: unknown) =>
      failures.push({ property, input: text, plugins: setName, detail });
    let seq: PageSequence | undefined;
    try {
      seq = new PageSequence(text, { plugins });
    } catch (e) {
      if (!(e instanceof PageSequenceError)) throw e;
      r.error = { kind: e.kind, position: e.position };
    }
    if (seq) {
      const pages = seq.pages();
      const normalized = normalize(text, { plugins });
      r.pages = pages;
      r.normalized = normalized;
      if (seq.toString() !== normalized) fail("toString", seq.toString());
      try {
        const back = new PageSequence(normalized, { plugins }).pages();
        if (JSON.stringify(back) !== JSON.stringify(pages)) fail("round trip", normalized);
        const again = normalize(normalized, { plugins });
        if (again !== normalized) fail("idempotent", again);
      } catch (e) {
        if (!(e instanceof PageSequenceError)) throw e;
        fail("round trip", `${JSON.stringify(normalized)} throws ${e.kind}`);
      }
      const key = setName + JSON.stringify(pages);
      if (!unique.has(key)) unique.set(key, normalized);
      else if (unique.get(key) !== normalized) fail("unique", [unique.get(key), normalized]);
      if (len(normalized) - flagChars(normalized) > len(plain(pages))) fail("not longer", [normalized, plain(pages)]);
      if (!Array.from(text).some((c) => c !== " " && /\s/u.test(c))) {
        let cleaned: string;
        try {
          cleaned = clean(text, { plugins }).normalized;
        } catch (e) {
          if (!(e instanceof PageSequenceError)) throw e;
          cleaned = `throws ${e.kind}`;
        }
        if (cleaned !== normalized) fail("clean agrees", cleaned);
      }
    }
    try {
      r.clean = clean(text, { plugins }).normalized;
    } catch (e) {
      if (!(e instanceof PageSequenceError)) throw e;
      r.cleanError = e.kind;
    }
    results.push(r);
  }
}
writeFileSync(output, JSON.stringify(results, null, 0).replace(/\},\{"input"/g, '},\n{"input"'));
console.log(`typescript: ${results.length} results, ${failures.length} property failures`);
for (const f of failures.slice(0, 10)) console.log(JSON.stringify(f));
process.exit(failures.length ? 1 : 0);
