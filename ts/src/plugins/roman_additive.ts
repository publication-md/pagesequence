/**
 * The plugin system `roman_additive`: roman numerals 1–3999 written without subtraction, so 4 is
 * `IIII` and 9 is `VIIII`.
 * @module
 */
import type { NumberingSystem } from "../pagesequence.ts";

const DIGITS = [[1000, "M"], [500, "D"], [100, "C"], [50, "L"], [10, "X"], [5, "V"], [1, "I"]] as const;

/** Roman numerals without subtraction (`I-X:roman_additive`). */
export const romanAdditive: NumberingSystem = {
  name: "roman_additive",
  tokenChars: "IVXLCDMivxlcdm",
  // Lenient: the reader keeps a token only if `format` gives it back.
  read(token) {
    const upper = token.toUpperCase();
    if (token !== upper && token !== token.toLowerCase()) return undefined;
    let value = 0;
    for (const c of upper) {
      const digit = DIGITS.find(([, d]) => d === c);
      if (!digit) return undefined;
      value += digit[0];
    }
    return { value, style: token === upper ? "upper" : "lower" };
  },
  format(value, style) {
    if (!Number.isInteger(value) || value < 1 || value > 3999) return undefined;
    let result = "";
    for (const [v, d] of DIGITS) {
      while (value >= v) {
        result += d;
        value -= v;
      }
    }
    return style === "lower" ? result.toLowerCase() : result;
  },
};
