// Memastikan model di browser/Vercel memberi hasil IDENTIK dengan model Python.
import vectors from '../src/lib/model/testvectors.json'
import { predictProba } from '../src/lib/model/inference'
import type { RawInput } from '../src/lib/types'

let maxErr = 0
for (const v of vectors as { raw: RawInput; proba: number[] }[]) {
  const p = predictProba(v.raw)
  for (let k = 0; k < 4; k++) maxErr = Math.max(maxErr, Math.abs(p[k] - v.proba[k]))
}
console.log(`Paritas Python↔TypeScript: ${vectors.length} vektor, selisih maks = ${maxErr.toExponential(2)}`)
if (maxErr > 2e-3) { console.error('GAGAL: model tidak identik'); process.exit(1) }
console.log('LULUS')
