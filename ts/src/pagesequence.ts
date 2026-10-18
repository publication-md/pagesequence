/**
 * PageSequence: map the pages of a document to the labels printed on them.
 * The format is in spec/pagesequence.md; this module follows it section by section.
 * @module
 */
import { fromRoman, toRoman } from "./roman.ts";

/** The kinds of error in the spec's "Errors" table. */
export type ErrorKind =
  | "syntax"
  | "reserved-char"
  | "unclosed-quote"
  | "dot-at-edge"
  | "empty"
  | "empty-item"
  | "open-end"
  | "single-label-run"
  | "equal-ends"
  | "no-system"
  | "unknown-system"
  | "different-case"
  | "descending"
  | "run-shape"
  | "uneven-run"
  | "duplicate-label"
  | "too-long"
  | "bad-length"
  | "length-mismatch";

/** An invalid sequence. `position` counts code points after NFC, or is `null` for page counts. */
export class PageSequenceError extends Error {
  readonly kind: ErrorKind;
  readonly position: number | null;
  constructor(kind: ErrorKind, position: number | null, message?: string) {
    super(message ?? (position === null ? kind : `${kind} at position ${position}`));
    this.name = "PageSequenceError";
    this.kind = kind;
    this.position = position;
  }
}

/** One document page of the page model. */
export interface Page {
  ignored: boolean;
  labels: string[];
}

/** What a numbering system reads from a token. */
export interface Reading {
  value: number;
  style: string;
}

/** A numbering system (see "API" in the spec). */
export interface NumberingSystem {
  readonly name: string;
  /** The characters that widening moves over, or `""`. */
  readonly tokenChars: string;
  read(token: string): Reading | undefined;
  format(value: number, style: string): string | undefined;
}

/** Options for every call that reads a sequence. */
export interface Options {
  plugins?: readonly NumberingSystem[];
  maxLabels?: number;
}

/** Options for the constructor and `clean`. */
export interface LengthOptions extends Options {
  length?: number;
}

/**
 * Make a system of single letters with values by position, A = 1. Without `lower`, the letters
 * have no case.
 */
export function alphabet(name: string, upper: string, lower?: string): NumberingSystem {
  const cases = lower === undefined ? [Array.from(upper)] : [Array.from(upper), Array.from(lower)];
  const styles = lower === undefined ? [""] : ["upper", "lower"];
  return {
    name,
    tokenChars: "",
    read(token) {
      for (let c = 0; c < cases.length; c++) {
        const i = cases[c].indexOf(token);
        if (i >= 0) return { value: i + 1, style: styles[c] };
      }
      return undefined;
    },
    format(value, style) {
      return cases[styles.indexOf(style)]?.[value - 1];
    },
  };
}

const roman: NumberingSystem = {
  name: "roman",
  tokenChars: "IVXLCDMivxlcdm",
  read(token) {
    const value = fromRoman(token);
    return value === undefined ? undefined : { value, style: token === token.toUpperCase() ? "upper" : "lower" };
  },
  format(value, style) {
    return Number.isInteger(value) && value >= 1 && value <= 3999 ? toRoman(value, style === "lower") : undefined;
  },
};

const latin = alphabet("latin", "ABCDEFGHIJKLMNOPQRSTUVWXYZ", "abcdefghijklmnopqrstuvwxyz");

const integer: NumberingSystem = {
  name: "integer",
  tokenChars: "0123456789",
  read(token) {
    return /^(?:0|[1-9][0-9]{0,8})$/.test(token) ? { value: Number(token), style: "" } : undefined;
  },
  format(value) {
    return Number.isInteger(value) && value >= 0 && value <= 999_999_999 ? String(value) : undefined;
  },
};

/** The built-in systems, in hierarchy order. */
const BUILT_IN: readonly NumberingSystem[] = [roman, latin, integer];

const MAX_LABEL = 100;
const DEFAULT_MAX_LABELS = 10_000;

/** The systems and limit one call reads with. */
interface Context {
  byName: Map<string, NumberingSystem>;
  /** The built-in systems in hierarchy order, then the plugins in name order (for the fold). */
  foldOrder: NumberingSystem[];
  maxLabels: number;
}

function context(options: Options = {}): Context {
  const byName = new Map(BUILT_IN.map((s) => [s.name, s]));
  const plugins = [...(options.plugins ?? [])];
  for (const p of plugins) {
    if (byName.has(p.name)) {
      throw new TypeError(
        `plugins: "${p.name}" is ${BUILT_IN.includes(byName.get(p.name)!) ? "built in" : "given twice"}`,
      );
    }
    byName.set(p.name, p);
  }
  plugins.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
  const maxLabels = options.maxLabels ?? DEFAULT_MAX_LABELS;
  if (!Number.isInteger(maxLabels) || maxLabels < 1) {
    throw new RangeError(`maxLabels: ${maxLabels} is not a positive integer`);
  }
  return { byName, foldOrder: [...BUILT_IN, ...plugins], maxLabels };
}

// ---------------------------------------------------------------- Syntax

/** Reserved outside quotes: the operators, the characters `clean` repairs, and `\`. */
const RESERVED = new Set([...',-+!"/\\;|…–—−“”„']);
const isControl = (c: string) => c <= "\u001f" || (c >= "\u007f" && c <= "\u009f");
const isReserved = (c: string) => RESERVED.has(c) || isControl(c);

type Token =
  | { t: "label"; text: string }
  | { t: "-" | "+" | ".." | "|" }
  | { t: "/"; name: string };

interface LexedItem {
  /** The first non-space character, or just after the comma for an empty item. */
  start: number;
  ignored: boolean;
  tokens: Token[];
  /** Index of the comma that ends the item, or the text's length. */
  end: number;
}

/** Lex one item from `i` (just after a comma, or 0). With `pipe`, `|` is an operator (for `clean`). */
function lexItem(cps: string[], i: number, pipe = false): LexedItem {
  const fail = (kind: ErrorKind): never => {
    throw new PageSequenceError(kind, start);
  };
  let j = i;
  const skip = () => {
    while (cps[j] === " ") j++;
  };
  skip();
  let start = j;
  const tokens: Token[] = [];
  let ignored = false;
  if (cps[j] === "!") {
    ignored = true;
    j++;
  }
  let labelStarts = true;
  for (;;) {
    skip();
    const c = cps[j];
    if (c === undefined || c === ",") break;
    if (c === '"' && labelStarts) {
      let text = "";
      j++;
      for (;;) {
        const ch = cps[j];
        if (ch === undefined) fail("unclosed-quote");
        j++;
        if (ch === '"') break;
        if (ch === "\\") {
          const next = cps[j];
          if (next === undefined) fail("unclosed-quote");
          if (next !== '"' && next !== "\\") fail("syntax");
          text += next;
          j++;
        } else {
          if (isControl(ch)) fail("reserved-char");
          text += ch;
        }
      }
      tokens.push({ t: "label", text });
      labelStarts = false;
    } else if (c === "-" || c === "+" || (c === "|" && pipe)) {
      tokens.push({ t: c as "-" | "+" | "|" });
      j++;
      labelStarts = true;
    } else if (c === "." && cps[j + 1] === ".") {
      tokens.push({ t: ".." });
      j += 2;
      labelStarts = true;
    } else if (c === "/") {
      j++;
      let name = "";
      while (/^[a-z0-9_]$/.test(cps[j] ?? "")) name += cps[j++];
      tokens.push({ t: "/", name });
      labelStarts = false;
    } else if (isReserved(c)) {
      fail("reserved-char");
    } else {
      let k = j;
      while (k < cps.length && !isReserved(cps[k]) && !(cps[k] === "." && cps[k + 1] === ".")) k++;
      let text = cps.slice(j, k).join("");
      j = k;
      text = text.replace(/ +$/, "");
      if (text.startsWith(".") || text.endsWith(".")) fail("dot-at-edge");
      tokens.push({ t: "label", text });
      labelStarts = false;
    }
    const last = tokens[tokens.length - 1];
    if (last.t === "label" && Array.from(last.text).length > MAX_LABEL) fail("too-long");
  }
  if (tokens.length === 0) start = i;
  return { start, ignored, tokens, end: j };
}

/** A parsed item: a page, a range (one label per page) or a run. */
interface Item {
  start: number;
  ignored: boolean;
  first: string[];
  last?: string[];
  flag?: string;
}

/** Parse the tokens of an item. With `ref`, equal ends are one page (the reference repair). */
function parseItem(lexed: LexedItem, ref = false): Item {
  const { tokens, start, ignored } = lexed;
  const fail = (kind: ErrorKind): never => {
    throw new PageSequenceError(kind, start);
  };
  if (tokens.length === 0) fail("empty-item");
  let k = 0;
  const page = (): string[] => {
    const labels: string[] = [];
    for (;;) {
      const tok = tokens[k];
      if (tok?.t !== "label") fail("syntax");
      labels.push((tok as { text: string }).text);
      k++;
      if (tokens[k]?.t !== "+") return labels;
      k++;
    }
  };
  const first = page();
  const item: Item = { start, ignored, first };
  const op = tokens[k];
  if (op?.t === "-" || op?.t === "..") {
    k++;
    if (k === tokens.length) fail(op.t === "-" && first.length === 1 ? "open-end" : "syntax");
    const last = page();
    if (op.t === "-" && (first.length > 1 || last.length > 1)) fail("syntax");
    if (op.t === "..") {
      if (first.length === 1 && last.length === 1) fail("single-label-run");
      if (first.length !== last.length) fail("run-shape");
    }
    if (tokens[k]?.t === "/") {
      const flag = tokens[k++] as { name: string };
      if (flag.name === "") fail("syntax");
      item.flag = flag.name;
    }
    if (first.every((label, c) => label === last[c])) {
      if (!ref) fail("equal-ends");
    } else {
      item.last = last;
    }
  } else if (op?.t === "/") {
    fail("reserved-char");
  }
  if (k < tokens.length) fail("syntax");
  return item;
}

// ---------------------------------------------------------------- Numbering

function charCase(c: string): "upper" | "lower" | "" {
  if (c !== c.toLowerCase()) return "upper";
  if (c !== c.toUpperCase()) return "lower";
  return "";
}

/** A reading of two end labels by one system: the cut, and the values at both ends. */
interface Step {
  system: NumberingSystem;
  prefix: string;
  suffix: string;
  /** Where the cut is, for "the first valid reading fixes where the label is cut". */
  cut: string;
  first: Reading;
  last: Reading;
}

/** Read a token, checking the round trip. */
function readToken(system: NumberingSystem, token: string): Reading | undefined {
  const r = system.read(token);
  return r && Number.isInteger(r.value) && r.value >= 0 && system.format(r.value, r.style) === token ? r : undefined;
}

/** "Finding what steps": read `a` → `b` with `systems`, stepping by `step`. */
function findStep(a: string, b: string, systems: readonly NumberingSystem[], step: number): Step | ErrorKind {
  const A = Array.from(a);
  const B = Array.from(b);
  let p0 = 0;
  while (p0 < A.length && p0 < B.length && A[p0] === B[p0]) p0++;
  let s0 = 0;
  while (s0 < A.length - p0 && s0 < B.length - p0 && A[A.length - 1 - s0] === B[B.length - 1 - s0]) s0++;
  let error: ErrorKind | undefined;
  const valid: Step[] = [];
  for (const system of systems) {
    let p = p0;
    let s = s0;
    // Widening: move over token characters, never across case.
    let middleCase = "";
    for (const c of [...A.slice(p, A.length - s), ...B.slice(p, B.length - s)]) {
      if ((middleCase = charCase(c))) break;
    }
    const joins = (c: string) => {
      if (!system.tokenChars.includes(c)) return false;
      const cc = charCase(c);
      if (cc && middleCase && cc !== middleCase) return false;
      if (cc) middleCase = cc;
      return true;
    };
    while (p > 0 && joins(A[p - 1])) p--;
    while (s > 0 && joins(A[A.length - s])) s--;
    const first = readToken(system, A.slice(p, A.length - s).join(""));
    const last = readToken(system, B.slice(p, B.length - s).join(""));
    if (!first || !last) continue;
    const e: ErrorKind | undefined = first.style !== last.style
      ? "different-case"
      : last.value < first.value
      ? "descending"
      : (last.value - first.value) % step !== 0
      ? "uneven-run"
      : undefined;
    if (e) {
      error ??= e;
      continue;
    }
    const prefix = A.slice(0, p).join("");
    const suffix = A.slice(A.length - s).join("");
    valid.push({ system, prefix, suffix, cut: `${p}/${s}`, first, last });
  }
  if (valid.length === 0) return error ?? "no-system";
  let best = valid[0];
  for (const r of valid) if (r.cut === best.cut && r.last.value < best.last.value) best = r;
  return best;
}

/** The label `step` gives for `value`, or `undefined` if the system can't write it. */
function labelAt(step: Step, value: number): string | undefined {
  const token = step.system.format(value, step.first.style);
  return token === undefined ? undefined : step.prefix + token + step.suffix;
}

/** Read the ends of an item column by column. Each column steps the same number of times. */
function readItem(first: string[], last: string[], systems: readonly NumberingSystem[]): Step[] | ErrorKind {
  const width = first.length;
  const steps: Step[] = [];
  for (let c = 0; c < width; c++) {
    if (first[c] === last[c]) return "uneven-run";
    const r = findStep(first[c], last[c], systems, width);
    if (typeof r === "string") return r;
    if (steps.length && r.last.value - r.first.value !== steps[0].last.value - steps[0].first.value) {
      return "uneven-run";
    }
    steps.push(r);
  }
  return steps;
}

// ---------------------------------------------------------------- Expansion

/** Parse a sequence to its page model. */
function parse(text: string, ctx: Context, ref = false): Page[] {
  const cps = Array.from(text.normalize("NFC"));
  if (cps.every((c) => c === " ")) throw new PageSequenceError("empty", 0);
  const pages: Page[] = [];
  const seen = new Set<string>();
  let total = 0;
  for (let i = 0;;) {
    const lexed = lexItem(cps, i);
    const item = parseItem(lexed, ref);
    const fail = (kind: ErrorKind): never => {
      throw new PageSequenceError(kind, item.start);
    };
    let itemPages: Page[];
    if (!item.last) {
      itemPages = [{ ignored: item.ignored, labels: item.first }];
    } else {
      let systems = BUILT_IN;
      if (item.flag !== undefined) {
        const system = ctx.byName.get(item.flag);
        if (!system) fail("unknown-system");
        systems = [system!];
      }
      const steps = readItem(item.first, item.last, systems);
      if (typeof steps === "string") fail(steps);
      const width = item.first.length;
      const count = ((steps as Step[])[0].last.value - (steps as Step[])[0].first.value) / width + 1;
      if (total + count * width > ctx.maxLabels) fail("too-long");
      itemPages = [];
      for (let n = 0; n < count; n++) {
        const labels = (steps as Step[]).map((s) => labelAt(s, s.first.value + n * width));
        if (labels.some((l) => l === undefined)) fail("no-system");
        if (labels.some((l) => Array.from(l!).length > MAX_LABEL)) fail("too-long");
        itemPages.push({ ignored: item.ignored, labels: labels as string[] });
      }
    }
    for (const page of itemPages) {
      total += page.labels.length;
      if (total > ctx.maxLabels) fail("too-long");
      if (page.ignored) continue;
      for (const label of page.labels) {
        if (label === "") continue;
        const key = label.toLowerCase();
        if (seen.has(key)) fail("duplicate-label");
        seen.add(key);
      }
    }
    pages.push(...itemPages);
    if (lexed.end >= cps.length) break;
    i = lexed.end + 1;
  }
  return pages;
}

function checkLength(length: number | undefined): void {
  if (length !== undefined && length !== null && (!Number.isInteger(length) || length < 1)) {
    throw new PageSequenceError("bad-length", null, `bad-length: ${length} is not a positive whole number`);
  }
}

// ---------------------------------------------------------------- Normal form

/** Write a label, quoted when it can't be written bare or contains a space. */
function quote(label: string): string {
  const cps = Array.from(label);
  const bare = cps.length > 0 && !cps.some((c) => c === " " || isReserved(c)) && !label.includes("..") &&
    !label.startsWith(".") && !label.endsWith(".");
  return bare ? label : `"${label.replace(/[\\"]/g, (c) => "\\" + c)}"`;
}

const writePage = (labels: string[]) => labels.map(quote).join("+");

/** Do `first`→`last`, read without a flag, give exactly `pages`? */
function readsAs(pages: Page[], first: string[], last: string[]): boolean {
  const steps = readItem(first, last, BUILT_IN);
  if (typeof steps === "string") return false;
  const width = first.length;
  if ((steps[0].last.value - steps[0].first.value) / width + 1 !== pages.length) return false;
  return pages.every((page, n) => steps.every((s, c) => labelAt(s, s.first.value + n * width) === page.labels[c]));
}

/** "Normal form", step 2 to 4: fold the page model in one pass. */
function fold(pages: Page[], ctx: Context): string {
  const items: string[] = [];
  for (let i = 0; i < pages.length;) {
    const page = pages[i];
    const next = pages[i + 1];
    const width = page.labels.length;
    const same = (q: Page | undefined) => q !== undefined && q.ignored === page.ignored && q.labels.length === width;
    let best: { system: NumberingSystem; n: number } | undefined;
    if (same(next)) {
      for (const system of ctx.foldOrder) {
        const steps: Step[] = [];
        for (let c = 0; c < width; c++) {
          const r = findStep(page.labels[c], next.labels[c], [system], width);
          if (typeof r === "string" || r.last.value - r.first.value !== width) break;
          steps.push(r);
        }
        if (steps.length < width) continue;
        let n = 2;
        while (
          same(pages[i + n]) &&
          steps.every((s, c) => labelAt(s, s.first.value + n * width) === pages[i + n].labels[c])
        ) n++;
        if (!best || n > best.n) best = { system, n };
      }
    }
    const mark = page.ignored ? "!" : "";
    if (best && best.n >= (width === 1 ? 2 : 3)) {
      const stretch = pages.slice(i, i + best.n);
      const last = stretch[stretch.length - 1].labels;
      let item = mark + writePage(page.labels) + (width === 1 ? "-" : "..") + writePage(last);
      if (!readsAs(stretch, page.labels, last)) item += "/" + best.system.name;
      items.push(item);
      i += best.n;
    } else {
      items.push(mark + writePage(page.labels));
      i++;
    }
  }
  return items.join(", ");
}

/** The normal form of a sequence. Throws `PageSequenceError` on invalid input. */
export function normalize(text: string, options?: Options): string {
  const ctx = context(options);
  return fold(parse(text, ctx), ctx);
}

/** Do two sequences have the same page model? Labels are compared exactly. */
export function equals(a: string, b: string, options?: Options): boolean {
  const ctx = context(options);
  const pa = parse(a, ctx);
  const pb = parse(b, ctx);
  return pa.length === pb.length &&
    pa.every((p, i) =>
      p.ignored === pb[i].ignored && p.labels.length === pb[i].labels.length &&
      p.labels.every((l, c) => l === pb[i].labels[c])
    );
}

// ---------------------------------------------------------------- Cleaning

const DASHES = "–—−";
const CURLY = "“”„";

/** Map the characters outside straight quotes. */
function outsideQuotes(cps: string[], map: (c: string) => string): string {
  let out = "";
  for (let i = 0; i < cps.length; i++) {
    const c = cps[i];
    if (c !== '"') {
      out += map(c);
      continue;
    }
    out += c;
    for (i++; i < cps.length; i++) {
      out += cps[i];
      if (cps[i] === "\\" && i + 1 < cps.length) out += cps[++i];
      else if (cps[i] === '"') break;
    }
  }
  return out;
}

/** Split at the commas outside straight quotes. */
function splitItems(text: string): string[] {
  const items: string[] = [];
  let current = "";
  let quoted = false;
  const cps = Array.from(text);
  for (let i = 0; i < cps.length; i++) {
    const c = cps[i];
    if (quoted && c === "\\" && i + 1 < cps.length) {
      current += c + cps[++i];
      continue;
    }
    if (c === '"') quoted = !quoted;
    if (c === "," && !quoted) {
      items.push(current);
      current = "";
    } else {
      current += c;
    }
  }
  items.push(current);
  return items;
}

const writeTokens = (tokens: Token[]) =>
  tokens.map((t) => (t.t === "label" ? quote(t.text) : t.t === "/" ? "/" + t.name : t.t)).join("");

/** Labels of a lexed page sequence of tokens: [label, "+", label, …] → number of labels, or 0. */
function pageWidth(tokens: Token[]): number {
  if (tokens.length % 2 === 0) return 0;
  for (let k = 0; k < tokens.length; k++) {
    if (tokens[k].t !== (k % 2 === 0 ? "label" : "+")) return 0;
  }
  return (tokens.length + 1) / 2;
}

/** The repairs of one item. Gives the repaired text, or the item as it was if it doesn't lex. */
function cleanItem(text: string, repairs: string[]): { text: string; open?: { ignored: boolean; label: string } } {
  let lexed: LexedItem;
  try {
    lexed = lexItem(Array.from(text), 0, true);
  } catch {
    return { text };
  }
  let tokens = lexed.tokens;
  const ops = tokens.filter((t) => t.t === "-" || t.t === "..");
  if (tokens.some((t) => t.t === "|")) {
    if (ops.length) return { text };
    tokens = tokens.map((t) => (t.t === "|" ? { t: "+" } : t));
    repairs.push("pipe");
  }
  const mark = lexed.ignored ? "!" : "";
  if (ops.length === 1) {
    const at = tokens.indexOf(ops[0]);
    const flagged = tokens[tokens.length - 1].t === "/";
    const left = tokens.slice(0, at);
    const right = tokens.slice(at + 1, flagged ? -1 : undefined);
    const wl = pageWidth(left);
    const wr = pageWidth(right);
    if (ops[0].t === "-" && right.length === 0 && wl === 1 && !flagged) {
      return {
        text: mark + writeTokens(tokens),
        open: { ignored: lexed.ignored, label: (left[0] as { text: string }).text },
      };
    }
    if (wl && wl === wr) {
      if (ops[0].t === ".." && wl === 1) {
        tokens[at] = { t: "-" };
        repairs.push("single-label-run");
      } else if (ops[0].t === "-" && wl > 1) {
        tokens[at] = { t: ".." };
        repairs.push("dash-run");
      }
      if (writeTokens(left) === writeTokens(right)) {
        tokens = left;
        repairs.push("equal-ends");
      }
    }
  }
  return { text: mark + writeTokens(tokens) };
}

/**
 * Repair what a person typed or pasted, then normalise strictly. With `length`, an open range at
 * the end is closed at that page count, and the result is checked against it.
 */
export function clean(text: string, options: LengthOptions = {}): { normalized: string; repairs: string[] } {
  const ctx = context(options);
  const { length } = options;
  checkLength(length);
  const repairs: string[] = [];
  const cps = Array.from(text.normalize("NFC"));
  // Character repairs, outside straight quotes. Curly quotes become straight ones.
  let chars = "";
  for (let i = 0; i < cps.length; i++) {
    const c = cps[i];
    if (c === '"') {
      chars += c;
      for (i++; i < cps.length; i++) {
        chars += cps[i];
        if (cps[i] === "\\" && i + 1 < cps.length) chars += cps[++i];
        else if (cps[i] === '"') break;
      }
    } else if (CURLY.includes(c)) {
      repairs.push("curly-quote");
      chars += '"';
      for (i++; i < cps.length && !CURLY.includes(cps[i]) && cps[i] !== '"'; i++) {
        chars += cps[i] === "\\" ? "\\\\" : cps[i];
      }
      if (i < cps.length) chars += '"';
    } else if (c !== " " && /\s/u.test(c)) {
      repairs.push("space");
      chars += " ";
    } else if (DASHES.includes(c)) {
      repairs.push("dash");
      chars += "-";
    } else if (c === ";") {
      repairs.push("semicolon");
      chars += ",";
    } else if (c === "…") {
      repairs.push("ellipsis");
      chars += "..";
    } else {
      chars += c;
    }
  }
  const items: string[] = [];
  let open: { ignored: boolean; label: string } | undefined;
  let openAt = -1;
  for (const raw of splitItems(chars)) {
    if (/^ *!? *$/.test(raw)) {
      repairs.push("empty-item");
      continue;
    }
    const r = cleanItem(raw, repairs);
    if (r.open) {
      open = r.open;
      openAt = items.length;
    }
    items.push(r.text);
  }
  if (items.length === 0 && length !== undefined) {
    open = { ignored: false, label: "1" };
    openAt = 0;
    items.push("1-");
  }
  if (open && openAt === items.length - 1 && length !== undefined && readToken(integer, open.label)) {
    const before = openAt === 0 ? 0 : parse(items.slice(0, openAt).join(", "), ctx).length;
    const n = length - before;
    if (n < 1) throw new PageSequenceError("open-end", 0, "open-end: no pages are left for the open range");
    const first = Number(open.label);
    items[openAt] = (open.ignored ? "!" : "") + (n === 1 ? open.label : `${first}-${first + n - 1}`);
    repairs.push("open-end");
  }
  const seq = new PageSequence(items.join(", "), { ...options, length });
  return { normalized: seq.toString(), repairs };
}

// ---------------------------------------------------------------- The class

/** A page sequence: the labels printed on each page of a document. */
export class PageSequence {
  readonly #pages: Page[];
  readonly #ctx: Context;
  /** Lowercased label → [index, label as written], for the pages that are not ignored. */
  readonly #lookup = new Map<string, [number, string]>();

  /**
   * Parse `text` strictly. Throws `PageSequenceError` on invalid input.
   * @param options The document's page count, or `{ length, plugins, maxLabels }`.
   */
  constructor(text: string, options?: number | LengthOptions) {
    const opts: LengthOptions = typeof options === "number" ? { length: options } : options ?? {};
    checkLength(opts.length);
    this.#ctx = context(opts);
    this.#pages = parse(text, this.#ctx);
    if (opts.length !== undefined && opts.length !== null && opts.length !== this.#pages.length) {
      throw new PageSequenceError(
        "length-mismatch",
        null,
        `length-mismatch: the sequence has ${this.#pages.length} document pages, not ${opts.length}`,
      );
    }
    this.#pages.forEach((page, index) => {
      if (!page.ignored) { for (const label of page.labels) this.#lookup.set(label.toLowerCase(), [index, label]); }
    });
  }

  /** Like the constructor, but gives `undefined` instead of throwing `PageSequenceError`. */
  static create(text: string, options?: number | LengthOptions): PageSequence | undefined {
    try {
      return new PageSequence(text, options);
    } catch (e) {
      if (e instanceof PageSequenceError) return undefined;
      throw e;
    }
  }

  /** The number of document pages, ignored ones included. */
  getIndexLengthAll(): number {
    return this.#pages.length;
  }

  /** The number of document pages that are not ignored. */
  getIndexLength(): number {
    return this.#pages.filter((p) => !p.ignored).length;
  }

  /** The number of labels on the pages that are not ignored. */
  getLabelLength(): number {
    return this.#pages.reduce((n, p) => (p.ignored ? n : n + p.labels.length), 0);
  }

  /** The labels of a reference, or `undefined` if it is invalid or names a missing label. */
  #find(pages: string): [number, string][] | undefined {
    const text = outsideQuotes(Array.from(pages.normalize("NFC")), (c) => (DASHES.includes(c) ? "-" : c));
    let ref: Page[];
    try {
      ref = parse(text, this.#ctx, true);
    } catch (e) {
      if (e instanceof PageSequenceError) return undefined;
      throw e;
    }
    const found: [number, string][] = [];
    for (const page of ref) {
      for (const label of page.labels) {
        const hit = label === "" ? undefined : this.#lookup.get(label.toLowerCase());
        if (!hit) return undefined;
        found.push(hit);
      }
    }
    return found;
  }

  /**
   * Without `pages`, the indexes of all pages that are not ignored. With a reference such as
   * `"20-21"`, the indexes of the pages that carry its labels, each once, in first-seen order.
   */
  getIndexList(): number[];
  getIndexList(pages?: string): number[] | undefined;
  getIndexList(pages?: string): number[] | undefined {
    if (pages === undefined) return this.#pages.flatMap((p, i) => (p.ignored ? [] : [i]));
    const found = this.#find(pages);
    return found && [...new Set(found.map(([index]) => index))];
  }

  /** Without `pages`, all labels of the pages that are not ignored. With a reference, its labels. */
  getLabelList(): string[];
  getLabelList(pages?: string): string[] | undefined;
  getLabelList(pages?: string): string[] | undefined {
    if (pages === undefined) return this.#pages.flatMap((p) => (p.ignored ? [] : [...p.labels]));
    return this.#find(pages)?.map(([, label]) => label);
  }

  /** The labels of one document page, or `undefined` outside the document. */
  labelsAt(index: number): string[] | undefined {
    const page = Number.isInteger(index) ? this.#pages[index] : undefined;
    return page && [...page.labels];
  }

  /** The labels of one document page as displayed (`"2+3"`), or `undefined` outside the document. */
  formatAt(index: number): string | undefined {
    return this.labelsAt(index)?.join("+");
  }

  /** The page model. */
  pages(): Page[] {
    return this.#pages.map((p) => ({ ignored: p.ignored, labels: [...p.labels] }));
  }

  /** The normal form, written with the sequence's own plugins. */
  toString(): string {
    return fold(this.#pages, this.#ctx);
  }
}
