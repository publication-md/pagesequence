// Reference check (review 6.3): for every stored reference in publication-md, compare v1's
// getIndexList with v2's. v1 reads the original sequence and v2 the converted one (converted by
// lookup between list_of_grottan_in_v1.txt and list_of_grottan_in_v2.txt).
//
// Copy it into a converted copy of publication-md that has both packages installed, and run it
// there:
//
//     node refcheck.ts ORIGINAL_CHECKOUT .
//
// It reads `pages` and the middle segment of `key` in every part and figure block.
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { parse } from 'yaml'
import { PageSequence as V1 } from '@tvartom/pagesequence'
import { PageSequence as V2 } from '@publication-md/pagesequence'

const [original, converted] = process.argv.slice(2) as [string, string]
const seqOf = (dir: string) => /^pageSequence:\s*"(.*)"\s*$/m.exec(readFileSync(join(dir, 'publication.md'), 'utf8'))![1]!
const same = (a?: number[], b?: number[]) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null)
let refs = 0
const diffs: string[] = []
for (const unit of readdirSync(join(converted, 'content/grottan')).filter((d) => d.endsWith('-content')).sort()) {
	const v1 = V1.create(seqOf(join(original, 'content/grottan', unit)))!
	const v2 = new V2(seqOf(join(converted, 'content/grottan', unit)))
	for (const f of readdirSync(join(converted, 'content/grottan', unit)).filter((f) => /^pageIndex-\d+\.md$/.test(f)).sort()) {
		const text = readFileSync(join(converted, 'content/grottan', unit, f), 'utf8')
		for (const m of text.matchAll(/<!--\s*(part|figure):\s*([\s\S]*?)\s*-->/g)) {
			const block = parse(m[2]!) as Record<string, unknown>
			const found: [string, string][] = []
			if (typeof block.pages === 'string' || typeof block.pages === 'number') found.push(['pages', String(block.pages)])
			if (typeof block.key === 'string' && block.key.split('|').length === 3) found.push(['key', block.key.split('|')[1]!])
			for (const [field, ref] of found) {
				refs++
				const a = v1.getIndexList(ref), b = v2.getIndexList(ref)
				if (!same(a, b)) diffs.push(`${unit}/${f} ${m[1]}.${field} "${ref}": v1 ${JSON.stringify(a ?? null)}, v2 ${JSON.stringify(b ?? null)}`)
			}
		}
	}
}
console.log(`${refs} references checked, ${diffs.length} differ`)
for (const d of diffs) console.log('  ' + d)
