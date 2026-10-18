// The code under test: the source, or the npm build in ../dist/ with PAGESEQUENCE_DIST=1
// (run `npm run build` first).
import process from "node:process";

const dist = process.env.PAGESEQUENCE_DIST === "1";
const load = (path: string) => import(dist ? `../dist/${path}.js` : `../src/${path}.ts`);

const core: typeof import("../src/mod.ts") = await load("mod");
export const { alphabet, clean, equals, fromRoman, normalize, PageSequence, PageSequenceError, toRoman } = core;
export type { NumberingSystem } from "../src/mod.ts";

export const { romanAdditive }: typeof import("../src/plugins/roman_additive.ts") = await load(
  "plugins/roman_additive",
);
export const { latinSv }: typeof import("../src/plugins/latin_sv.ts") = await load("plugins/latin_sv");
export const { greek }: typeof import("../src/plugins/greek.ts") = await load("plugins/greek");
export const { hebrew }: typeof import("../src/plugins/hebrew.ts") = await load("plugins/hebrew");
