import { toRoman, fromRoman } from "./Roman.ts";
import { assertEquals } from "jsr:@std/assert@0.217/assert_equals";

Deno.test("PageSequence roman numerals", async (t) => {
	await t.step(`toRoman`, () => {
		assertEquals(toRoman(1), "I");
		assertEquals(toRoman(1, true), "i");
		assertEquals(toRoman(2), "II");
		assertEquals(toRoman(3), "III");
		assertEquals(toRoman(4), "IV");
		assertEquals(toRoman(5), "V");
		assertEquals(toRoman(6), "VI");
		assertEquals(toRoman(7), "VII");
		assertEquals(toRoman(8), "VIII");
		assertEquals(toRoman(9), "IX");
		assertEquals(toRoman(19), "XIX");
		assertEquals(toRoman(20), "XX");
	});
	await t.step(`fromRoman`, () => {
		assertEquals(fromRoman("I"), 1);
		assertEquals(fromRoman("V"), 5);
		assertEquals(fromRoman("IV"), 4);
	});
	await t.step(`toRoman -> fromRoman`, () => {
		for (let i = 0; i < 1024; i++) {
			assertEquals(fromRoman(toRoman(i)),i);
			assertEquals(fromRoman(toRoman(i).toLowerCase()),i);
			assertEquals(fromRoman(toRoman(i, true)),i);
		}
	});
});
