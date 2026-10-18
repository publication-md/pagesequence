/**
 * The plugin system `hebrew`: the 22 letters א–ת, without case. The final forms are not read.
 * This is the alphabet, not gematria.
 * @module
 */
import { alphabet } from "../pagesequence.ts";

/** The Hebrew alphabet (`א-ת/hebrew`). */
export const hebrew = /* @__PURE__ */ alphabet("hebrew", "אבגדהוזחטיכלמנסעפצקרשת");
