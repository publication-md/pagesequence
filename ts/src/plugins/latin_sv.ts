/**
 * The plugin system `latin_sv`: the Swedish alphabet, A–Z then Å, Ä, Ö.
 * @module
 */
import { alphabet, type NumberingSystem } from "../pagesequence.ts";

/** The Swedish alphabet (`A-Ö:latin_sv`). */
export const latinSv: NumberingSystem = /* @__PURE__ */ alphabet(
  "latin_sv",
  "ABCDEFGHIJKLMNOPQRSTUVWXYZÅÄÖ",
  "abcdefghijklmnopqrstuvwxyzåäö",
);
