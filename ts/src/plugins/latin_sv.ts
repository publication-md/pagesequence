/**
 * The plugin system `latin_sv`: the Swedish alphabet, A–Z then Å, Ä, Ö.
 * @module
 */
import { alphabet } from "../pagesequence.ts";

/** The Swedish alphabet (`A-Ö/latin_sv`). */
export const latinSv = /* @__PURE__ */ alphabet(
  "latin_sv",
  "ABCDEFGHIJKLMNOPQRSTUVWXYZÅÄÖ",
  "abcdefghijklmnopqrstuvwxyzåäö",
);
