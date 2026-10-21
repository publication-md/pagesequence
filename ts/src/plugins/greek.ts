/**
 * The plugin system `greek`: the 24 letters Α–Ω and α–ω. The final sigma `ς` is not read.
 * @module
 */
import { alphabet, type NumberingSystem } from "../pagesequence.ts";

/** The Greek alphabet (`Α-Ω:greek`). */
export const greek: NumberingSystem = /* @__PURE__ */ alphabet(
  "greek",
  "ΑΒΓΔΕΖΗΘΙΚΛΜΝΞΟΠΡΣΤΥΦΧΨΩ",
  "αβγδεζηθικλμνξοπρστυφχψω",
);
