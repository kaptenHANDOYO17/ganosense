/**
 * POST /api/ingest   (dipanggil GanoProbe setelah selesai mengukur 1 pohon)
 * Body JSON:
 * {
 *   "device_id": "GP-0001", "key": "XXXX", "pohon_id": "<uuid dari /api/sesi>",
 *   "lat": -0.51, "lon": 101.45,
 *   "raw": { r0_mq138, rs_mq138, r0_mq135, rs_mq135, r0_tgs2602, rs_tgs2602,
 *            slope_mq138, slope_tgs2602, temp_c, rh_pct, rh_ambient, soil_moist, soil_temp }
 * }
 * Balasan: { ok, kelas, p_infeksi, pesan }  -> ditampilkan di OLED perangkat.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { admin, verifyDevice } from './_lib'
import { predict } from '../src/lib/model/inference'
import { validateRaw } from '../src/lib/model/features'
import type { RawInput } from '../src/lib/types'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ ok: false, pesan: 'Gunakan POST' })
  const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body
  const dev = await verifyDevice(body?.device_id, body?.key)
  if (!dev) return res.status(401).json({ ok: false, pesan: 'Perangkat tidak dikenal / kunci salah' })

  const db = admin()
  const pohonId: string | undefined = body.pohon_id ?? dev.pohon_aktif_id ?? undefined
  if (!pohonId) return res.status(400).json({ ok: false, pesan: 'Belum ada pohon terpilih' })
  const { data: pohon } = await db.from('pohon').select('id,kebun_id,visual_score,generasi,umur_th').eq('id', pohonId).single()
  if (!pohon || pohon.kebun_id !== dev.kebun_id) return res.status(403).json({ ok: false, pesan: 'Pohon bukan milik kebun perangkat ini' })

  const raw: RawInput = { ...body.raw, visual_score: pohon.visual_score ?? 0, generasi: pohon.generasi ?? 2, umur_th: pohon.umur_th ?? 10 }
  const err = validateRaw(raw)
  if (err.length) return res.status(422).json({ ok: false, pesan: 'Data sensor tidak valid', detail: err })

  const pr = predict(raw)
  const { error } = await db.from('pengukuran').insert({
    kebun_id: dev.kebun_id, pohon_id: pohonId, perangkat_id: dev.id, sumber: 'perangkat',
    raw, kelas: pr.kelas, proba: pr.proba, lat: body.lat ?? null, lon: body.lon ?? null,
  })
  if (error) return res.status(500).json({ ok: false, pesan: error.message })
  await db.from('perangkat').update({ terakhir_online: new Date().toISOString(), pohon_aktif_id: null, sesi_sampai: null }).eq('id', dev.id)
  const label: Record<string, string> = { sehat: 'SEHAT', awal: 'AWAL!', sedang: 'SEDANG!', berat: 'BERAT!' }
  return res.status(200).json({ ok: true, kelas: pr.kelas, p_infeksi: Math.round(pr.pInfeksi * 100), pesan: `${label[pr.kelas]} ${Math.round(pr.pInfeksi * 100)}%` })
}
