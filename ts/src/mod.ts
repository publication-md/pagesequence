/**
 * PageSequence: map the pages of a PDF to the labels printed on them.
 *
 * The plugin systems are not exported here. Each one is imported from its own module, such as
 * `@publication-md/pagesequence/plugins/roman_additive`, and passed in `plugins`.
 * @module
 */
export * from "./pagesequence.ts";
export { fromRoman, toRoman } from "./roman.ts";
