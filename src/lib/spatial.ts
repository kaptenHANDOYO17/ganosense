/**
 * Lapisan 2 — Model risiko spasial (penularan lewat kontak akar).
 *
 * Ganoderma menular terutama lewat kontak akar pohon sakit -> pohon sehat di sekitarnya,
 * sehingga serangan membentuk klaster. Risiko tertular 12 bulan pohon i:
 *
 *   risiko_i = 1 − (1 − b0_gen)^12 · exp(−12 · β · Σ_j w_ij · s_j)
 *
 *   s_j  = daya tular tetangga j = 0,3·P(awal) + 1·P(sedang) + 1·P(berat), dikali efek tindakan
 *   w_ij = 1 untuk tetangga cincin-1 (< 10 m), 0,25 untuk cincin-2 (10–19 m)
 *   β, b0 = hasil kalibrasi simulasi terhadap data lapangan (3,7% → 42,2% dalam 8 tahun)
 *           dan AKAN dikalibrasi ulang dengan data riset.
 */
import type { Pohon, Tindakan } from './types'

export const SPATIAL_PARAMS = {
  beta: 0.0065,                               // per bulan per satuan tekanan (ml/out/simulasi.json)
  b0: { 1: 0.0003, 2: 0.0006, 3: 0.001 } as Record<number, number>,
  ring1: 10, ring2: 19, w2: 0.25,
}

export function neighbours(pohon: Pohon[]): Map<string, { id: string; w: number }[]> {
  const out = new Map<string, { id: string; w: number }[]>()
  for (const a of pohon) {
    const list: { id: string; w: number }[] = []
    for (const b of pohon) {
      if (a.id === b.id) continue
      const d = Math.hypot(a.x - b.x, a.y - b.y)
      if (d < SPATIAL_PARAMS.ring1) list.push({ id: b.id, w: 1 })
      else if (d < SPATIAL_PARAMS.ring2) list.push({ id: b.id, w: SPATIAL_PARAMS.w2 })
    }
    out.set(a.id, list)
  }
  return out
}

/** Pengali daya tular akibat tindakan yang sudah dicatat. */
export function treatmentFactor(tindakan: Tindakan[]): number {
  if (tindakan.some(t => t.jenis === 'eradikasi')) return 0
  let f = 1
  if (tindakan.some(t => t.jenis === 'parit_isolasi')) f *= 0.5
  if (tindakan.some(t => t.jenis === 'trichoderma' || t.jenis === 'pembumbunan' || t.jenis === 'bedah_batang')) f *= 0.6
  return f
}

export function infectivity(proba: number[] | null): number {
  if (!proba) return 0
  return 0.3 * proba[1] + proba[2] + proba[3]
}

export function risk12(generasi: number, pressure: number): number {
  const b0 = SPATIAL_PARAMS.b0[generasi] ?? SPATIAL_PARAMS.b0[2]
  return 1 - Math.pow(1 - b0, 12) * Math.exp(-12 * SPATIAL_PARAMS.beta * pressure)
}

export function riskLevel(r: number): 'rendah' | 'sedang' | 'tinggi' {
  return r >= 0.15 ? 'tinggi' : r >= 0.05 ? 'sedang' : 'rendah'
}
