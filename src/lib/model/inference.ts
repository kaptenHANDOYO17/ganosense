import forest from './forest.json'
import { computeFeatures } from './features'
import type { Kelas, Prediksi, RawInput } from '../types'
import { KELAS } from '../types'

interface Tree { f: number[]; t: number[]; l: number[]; r: number[]; v: number[][] }
const TREES = (forest as unknown as { trees: Tree[] }).trees

export const MODEL_META = (forest as unknown as { meta: Record<string, unknown> }).meta as {
  sumber_data: string; n_pengukuran: number; n_pohon: number; cv: string
  cv_metrics: Record<string, number>; feature_importance: Record<string, number>
}

function predictTree(t: Tree, x: number[]): number[] {
  let n = 0
  while (t.l[n] !== -1) n = x[t.f[n]] <= t.t[n] ? t.l[n] : t.r[n]
  return t.v[n]
}

/** Probabilitas 4 kelas [sehat, awal, sedang, berat] = rata-rata semua pohon keputusan. */
export function predictProba(raw: RawInput): number[] {
  const x = computeFeatures(raw)
  const acc = [0, 0, 0, 0]
  for (const t of TREES) {
    const p = predictTree(t, x)
    for (let k = 0; k < 4; k++) acc[k] += p[k]
  }
  return acc.map(v => v / TREES.length)
}

export function predict(raw: RawInput): Prediksi {
  const proba = predictProba(raw)
  let best = 0
  for (let k = 1; k < 4; k++) if (proba[k] > proba[best]) best = k
  return { proba, kelas: KELAS[best] as Kelas, pInfeksi: 1 - proba[0], yakin: proba[best] }
}
