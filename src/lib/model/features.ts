import type { RawInput } from '../types'

/** Urutan HARUS sama dengan FEATURES di ml/ganosense_ml.py */
export const FEATURES = [
  'resp_mq138', 'resp_mq135', 'resp_tgs2602',
  'slope_mq138', 'slope_tgs2602',
  'ratio_138_135', 'ratio_2602_135',
  'temp_c', 'rh_pct', 'd_rh',
  'soil_moist', 'soil_temp',
  'visual_score', 'generasi', 'umur_th',
] as const

/** Respons relatif sensor MOS: R0/Rs − 1 (R0 = udara sekitar, Rs = di dalam sungkup pangkal batang). */
export function computeFeatures(r: RawInput): number[] {
  const resp138 = r.r0_mq138 / r.rs_mq138 - 1
  const resp135 = r.r0_mq135 / r.rs_mq135 - 1
  const resp2602 = r.r0_tgs2602 / r.rs_tgs2602 - 1
  return [
    resp138, resp135, resp2602,
    r.slope_mq138, r.slope_tgs2602,
    resp138 / (Math.abs(resp135) + 0.05),
    resp2602 / (Math.abs(resp135) + 0.05),
    r.temp_c, r.rh_pct, r.rh_pct - r.rh_ambient,
    r.soil_moist, r.soil_temp,
    r.visual_score, r.generasi, r.umur_th,
  ]
}

/** Validasi sederhana agar data rusak (sensor lepas, baterai lemah) tidak masuk model. */
export function validateRaw(r: Partial<RawInput>): string[] {
  const err: string[] = []
  const req: (keyof RawInput)[] = ['r0_mq138', 'rs_mq138', 'r0_mq135', 'rs_mq135', 'r0_tgs2602', 'rs_tgs2602']
  for (const k of req) {
    const v = r[k]
    if (typeof v !== 'number' || !isFinite(v) || v <= 0) err.push(`${k} harus angka > 0`)
    else if (v > 5000) err.push(`${k} terlalu besar (sensor lepas?)`)
  }
  if (typeof r.rh_pct === 'number' && (r.rh_pct < 0 || r.rh_pct > 100)) err.push('rh_pct harus 0–100')
  if (typeof r.temp_c === 'number' && (r.temp_c < 5 || r.temp_c > 60)) err.push('temp_c di luar rentang wajar')
  return err
}
