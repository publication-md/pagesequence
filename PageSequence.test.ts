import { assertEquals, assertThrows, fail, assertExists } from "jsr:@std/assert@0.217";
import { PageSequence } from "./PageSequence.ts";

type PageSequenceTests = Map<
	ConstructorParameters<typeof PageSequence>,
	{
		indexLength?: number;
		indexLengthAll?: number;
		indexList?: {
			total?: number[];
			withPages?: Record<string, number[] | undefined>;
		};
		labelLength?: number;
		labelList?: {
			total?: string[];
			withPages?: Record<string, string[] | undefined>;
		};
	}
>;

const testDataLegal: PageSequenceTests = new Map();
testDataLegal
	.set(["1"], {
		indexLength: 1,
		indexLengthAll: 1,
		indexList: {
			total: [0],
			withPages: {
				"0": undefined,
				"1": [0],
				"1-2": undefined,
			},
		},
		labelLength: 1,
		labelList: {
			total: ["1"],
			withPages: {
				"0": undefined,
				"1": ["1"],
				"1-2": undefined,
			},
		},
	})
	.set(["1 - 2"], {
		indexLength: 2,
		indexLengthAll: 2,
		indexList: {
			total: [0, 1],
			withPages: {
				"0": undefined,
				"1": [0],
				"1-2": [0, 1],
				"2": [1],
			},
		},
		labelLength: 2,
		labelList: {
			total: ["1", "2"],
			withPages: {
				"0": undefined,
				"1": ["1"],
				"1-2": ["1", "2"],
				"2": ["2"],
			},
		},
	})
	.set(["1-3"], {
		indexLength: 3,
		indexLengthAll: 3,
		indexList: {
			total: [0, 1, 2],
			withPages: {
				"0": undefined,
				"1": [0],
				"1-2": [0, 1],
				"1,2": [0, 1],
				"2": [1],
				"1,3": [0, 2],
				"2-": undefined,
			},
		},
		labelLength: 3,
		labelList: {
			total: ["1", "2", "3"],
			withPages: {
				"0": undefined,
				"1": ["1"],
				"1-2": ["1", "2"],
				"1,2": ["1", "2"],
				"2": ["2"],
				"1,3": ["1", "3"],
				"2-": undefined,
			},
		},
	})
	.set(["1-3|4-6"], {
		indexLength: 5,
		indexLengthAll: 5,
		indexList: {
			total: [0, 1, 2, 3, 4],
			withPages: {
				"0": undefined,
				"1": [0],
				"2": [1],
				"3": [2],
				"4": [2],
				"1,3": [0, 2],
				"3-4": [2],
				"3,4": [2],
			},
		},
		labelLength: 6,
		labelList: {
			total: ["1", "2", "3", "4", "5", "6"],
			withPages: {
				"0": undefined,
				"1": ["1"],
				"1-2": ["1", "2"],
				"1,5": ["1", "5"],
				"3-6": ["3", "4", "5", "6"],
				"3": ["3"],
				"4": ["4"],
			},
		},
	})
	.set(["1-3,A,B,4-6"], {
		indexLength: 8,
		indexLengthAll: 8,
		indexList: {
			total: [...Array(8).keys()],
			withPages: {
				"1": [0],
				"2": [1],
				"3": [2],
				"4": [5],
				A: [3],
				B: [4],
				"3-4": [2, 5],
				"A-B": [3, 4],
				"1-2,B": [0, 1, 4],
				"A-4": undefined,
			},
		},
		labelLength: 8,
		labelList: {
			total: ["1", "2", "3", "A", "B", "4", "5", "6"],
			withPages: {
				"1": ["1"],
				"2": ["2"],
				"3": ["3"],
				"4": ["4"],
				A: ["A"],
				B: ["B"],
				b: ["B"],
				"3-4": ["3", "4"],
				"A-B": ["A", "B"],
				"1-2,B": ["1", "2", "B"],
				"A-4": undefined,
			},
		},
	})
	// Grottan 1986-1
	.set(["1-20 | 29,21-28, !29,30-48"], {
		indexLength: 47,
		indexLengthAll: 48,
		indexList: {
			total: [...Array(48).keys()].filter((i) => i != 28),
			withPages: {
				"20-29": [19, 20, 21, 22, 23, 24, 25, 26, 27, 19],
				"20,29": [19],
			},
		},
		labelLength: 48,
		labelList: {
			total: [
				...["1", "2", "3", "4", "5", "6", "7", "8", "9"],
				...["10", "11", "12", "13", "14", "15", "16", "17", "18", "19"],
				...["20", "29"],
				...["21", "22", "23", "24", "25", "26", "27", "28"],
				...["30", "31", "32", "33", "34", "35", "36", "37", "38", "39"],
				...["40", "41", "42", "43", "44", "45", "46", "47", "48"],
			],
			withPages: {},
		},
	})
	// ~Grottan 1975-1
	.set(["1,notis,2-4"], {
		indexLength: 5,
		indexLengthAll: 5,
		indexList: {
			total: [...Array(5).keys()],
			withPages: {
				"1-4": [0, 2, 3, 4],
				notis: [1],
				NOTIS: [1],
			},
		},
		labelLength: 5,
		labelList: {
			total: ["1", "notis", "2", "3", "4"],
			withPages: {
				"notis,2": ["notis", "2"],
				Notis: ["notis"],
				"1-4": ["1", "2", "3", "4"],
			},
		},
	})
	//Grottan 1973-1
	.set(["1-10|11,10a,10b|10c,10d,!11,12-20"], {
		indexLength: 22,
		indexLengthAll: 23,
		indexList: {
			total: [...Array(23).keys()].filter((i) => i != 13),
			withPages: {
				"10": [9],
				"11": [9],
				"12": [14],
				"10-12": [9, 14],
			},
		},
		labelLength: 24,
		labelList: {
			total: [
				...["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11"],
				...["10a", "10b", "10c", "10d"],
				...["12", "13", "14", "15", "16", "17", "18", "19", "20"],
			],
			withPages: {},
		},
	})
	.set(["12a-12d"], {
		indexLength: 4,
		indexLengthAll: 4,
		indexList: {
			total: [...Array(4).keys()],
			withPages: {
				"12a-12c": [0, 1, 2],
				"12b,12d": [1, 3],
			},
		},
		labelLength: 4,
		labelList: {
			total: ["12a", "12b", "12c", "12d"],
			withPages: {
				"12a-12c": ["12a", "12b", "12c"],
				"12b,12d": ["12b", "12d"],
			},
		},
	})
	//Grottan 1978-2
	.set(["1-11,inflikat.0-inflikat.11,12-24"], {
		indexLength: 36,
		indexLengthAll: 36,
		indexList: {
			total: [...Array(36).keys()],
			withPages: {
				"10-13": [9, 10, 23, 24],
				"inflikat.4": [15],
			},
		},
		labelLength: 36,
		labelList: {
			total: [
				...["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11"],
				...[
					"inflikat.0",
					"inflikat.1",
					"inflikat.2",
					"inflikat.3",
					"inflikat.4",
					"inflikat.5",
					"inflikat.6",
					"inflikat.7",
					"inflikat.8",
					"inflikat.9",
					"inflikat.10",
					"inflikat.11",
				],
				...["12", "13", "14", "15", "16", "17", "18", "19"],
				...["20", "21", "22", "23", "24"],
			],
			withPages: {},
		},
	})
	// Jätteuppslag
	.set(["1-3|4|5|6-8"], {
		indexLength: 5,
		indexLengthAll: 5,
		indexList: {
			total: [...Array(5).keys()],
			withPages: {
				"3-6": [2],
				"4": [2],
				"7": [3],
			},
		},
		labelLength: 8,
		labelList: {
			total: ["1", "2", "3", "4", "5", "6", "7", "8"],
			withPages: {
				"3-6": ["3", "4", "5", "6"],
				"4": ["4"],
				"7": ["7"],
			},
		},
	})
	// Multipla samman-scannande sidor
	.set(["1-3|4-6|7-8"], {
		indexLength: 6,
		indexLengthAll: 6,
		indexList: {
			total: [...Array(6).keys()],
			withPages: {
				"3-6": [2, 3, 4],
				"4": [2],
				"6-7": [4],
				"7": [4],
			},
		},
		labelLength: 8,
		labelList: {
			total: ["1", "2", "3", "4", "5", "6", "7", "8"],
			withPages: {
				"3-6": ["3", "4", "5", "6"],
				"4": ["4"],
				"7": ["7"],
			},
		},
	})
	.set(["i-v"], {
		indexLength: 5,
		indexLengthAll: 5,
		indexList: {
			total: [...Array(5).keys()],
			withPages: {
				i: [0],
				v: [4],
				"III-IV": [2, 3],
			},
		},
		labelLength: 5,
		labelList: {
			total: ["i", "ii", "iii", "iv", "v"],
			withPages: {
				i: ["i"],
				I: ["i"],
				"iii,v": ["iii", "v"],
			},
		},
	})
	// roman has higher priority than letters:
	// This will be roman:
	.set(["12i-12v"], {
		indexLength: 5,
	})
	// Workaround for letters:
	.set(["12i-12u,12v"], {
		indexLength: 14,
	})
	.set(["v1-v2"], {
		indexLength: 2,
	})
	//TODO: Fix
	// .set(["a_i-b_i"], {
	// 	indexLength: 2,
	// })
	// .set(["i_a-i_b"], {
	// 	indexLength: 2,
	// })
	// Grottan 1990-1
	.set(["I-VIII,3-22,IX-XVI"], {
		indexLength: 36,
		indexLengthAll: 36,
		indexList: {
			total: [...Array(36).keys()],
			withPages: {
				"I-V": [0, 1, 2, 3, 4],
				"i,v": [0, 4],
				"4": [9],
				"VIII-X": [7, 28, 29],
				"viii-x": [7, 28, 29],
				XVI: [35],
			},
		},
		labelLength: 36,
		labelList: {
			total: [
				"I",
				"II",
				"III",
				"IV",
				"V",
				"VI",
				"VII",
				"VIII",
				...["3", "4", "5", "6", "7", "8", "9"],
				...["10", "11", "12", "13", "14", "15", "16", "17", "18", "19"],
				...["20", "21", "22"],
				"IX",
				"X",
				"XI",
				"XII",
				"XIII",
				"XIV",
				"XV",
				"XVI",
			],
			withPages: {
				"3-6": ["3", "4", "5", "6"],
				"4": ["4"],
				"7": ["7"],
				"VIII-X": ["VIII", "IX", "X"],
				"viii-x": ["VIII", "IX", "X"],
			},
		},
	}).set(["Appendix A - Appendix C"], {
		indexLength: 3,
		indexLengthAll: 3,
		indexList: {
			total: [...Array(3).keys()],
			withPages: {
				"appendix a": [0],
				"Appendix B": [1],
			},
		},
		labelLength: 3,
		labelList: {
			total: ["Appendix A", "Appendix B", "Appendix C"],
			withPages: {
				"appendix a": ["Appendix A"],
				"Appendix B, Appendix c": ["Appendix B", "Appendix C"],
			}
		}
	}).set(["Appendix ii - Appendix v"], {
		indexLength: 4,
		indexLengthAll: 4,
		indexList: {
			total: [...Array(4).keys()],
			withPages: {
				"appendix ii": [0],
				"Appendix iv": [2],
			},
		},
		labelLength: 4,
		labelList: {
			total: ["Appendix ii", "Appendix iii", "Appendix iv", "Appendix v"],
			withPages: {
				"appendix a": undefined,
				"Appendix II, Appendix iv": ["Appendix ii", "Appendix iv"],
			}
		}
	});

Deno.test("Open ended!", () => {
	assertThrows(() => new PageSequence("1-"));
	assertThrows(() => new PageSequence("1-", 1));
	assertThrows(() => new PageSequence("1-", 2));
	assertThrows(() => new PageSequence("1-", 10));
	assertThrows(() => new PageSequence("1-3", 4));
	assertExists(new PageSequence("", 10));
	assertExists(new PageSequence("1-2"));
	assertExists(new PageSequence("1-3", 3));
});
Deno.test("PageSequence testDataLegal", async (t) => {
	for (const [[sequence, indexLengthAll],tests ] of testDataLegal.entries()) {
		try {
			const pageSequence = new PageSequence(sequence, indexLengthAll);

			// index
			tests.indexLength &&
				await t.step(`"${sequence}".getIndexLength(): ${pageSequence.getIndexLength()} 🔁 ${tests.indexLength}`, () =>
					assertEquals(pageSequence.getIndexLength(), tests.indexLength));

			{
				const result = pageSequence.getIndexLengthAll();
				tests.indexLengthAll &&
				await t.step(`"${sequence}".indexLengthAll(): ${result} 🔁 ${tests.indexLengthAll}`, () =>
					assertEquals(result, tests.indexLengthAll));
			}

			{
				const result = pageSequence.getIndexList();
				tests.indexList?.total &&
				await t.step(`"${sequence}".getIndexList(): ${result} 🔁 ${tests.indexList?.total}`, () =>
				assertEquals(result, tests.indexList?.total));
			}

			for (const [pages, indexList] of Object.entries(tests.indexList?.withPages ?? {})) {
				const result = pageSequence.getIndexList(pages);
				await t.step(`"${sequence}".getIndexList("${pages}"): ${result} 🔁 ${indexList}`, () =>
					assertEquals(result, indexList));
			}
			{
				const result = pageSequence.getLabelLength();
				tests.labelLength &&
					await t.step(`"${sequence}".getLabelLength(): ${result} 🔁 ${tests.labelLength}`, () =>
						assertEquals(result, tests.labelLength));
			}
			{
				const result = pageSequence.getLabelList();
				tests.labelList?.total &&
				await t.step(`"${sequence}".getLabelList(): ${result} 🔁 ${tests.labelList?.total}`, () =>
					assertEquals(result, tests.labelList?.total));
			}
			for (const [pages, labelList] of Object.entries(tests.labelList?.withPages ?? {})) {
				const result = pageSequence.getLabelList(pages);
				await t.step(`"${sequence}".getLabelList("${pages}"): ${result} 🔁 ${labelList}`, () =>
					assertEquals(result, labelList));
			}
		} catch (e) {
			console.error(`sequence="${sequence}", indexLengthAll=${indexLengthAll}:`, e);
			await t.step(`"${sequence}"`, () => fail(e));
		}
	}
});
