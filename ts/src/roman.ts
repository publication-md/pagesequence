const ROMAN = [
  [1000, "M"],
  [900, "CM"],
  [500, "D"],
  [400, "CD"],
  [100, "C"],
  [90, "XC"],
  [50, "L"],
  [40, "XL"],
  [10, "X"],
  [9, "IX"],
  [5, "V"],
  [4, "IV"],
  [1, "I"],
] as const;

/**
 * Write an integer from 1 to 3999 as a canonical roman numeral: 6 is `VI`.
 * @param num The value.
 * @param lowerCase Write lower case (`vi`) instead of upper case.
 * @throws RangeError for any other number.
 */
export function toRoman(num: number, lowerCase = false): string {
  if (!Number.isInteger(num) || num < 1 || num > 3999) {
    throw new RangeError(`toRoman: ${num} is not an integer from 1 to 3999`);
  }
  let result = "";
  for (const [value, digits] of ROMAN) {
    while (num >= value) {
      result += digits;
      num -= value;
    }
  }
  return lowerCase ? result.toLowerCase() : result;
}

/**
 * Read a roman numeral as the roman numbering system reads it: `IV` is 4. It must be canonical,
 * 1–3999, and all upper or all lower case.
 * @returns The value, or `undefined` for anything else (`IIII`, `IC`, `Iv`, `MMMM`, `""`).
 */
export function fromRoman(roman: string): number | undefined {
  if (!/^(?:[IVXLCDM]+|[ivxlcdm]+)$/.test(roman)) return undefined;
  const upper = roman.toUpperCase();
  let value = 0;
  let i = 0;
  for (const [v, digits] of ROMAN) {
    while (upper.startsWith(digits, i)) {
      value += v;
      i += digits.length;
    }
  }
  // Canonical means that writing the value gives the same numeral back.
  if (i !== upper.length || value > 3999 || toRoman(value) !== upper) return undefined;
  return value;
}
