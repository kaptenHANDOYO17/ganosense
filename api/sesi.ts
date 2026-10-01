/**
 * GET /api/sesi?device_id=GP-0001&key=XXXX
 * Dipanggil GanoProbe sebelum mengukur: "pohon mana yang sedang dipilih petani di HP?"
 * Kode pohon ditampilkan di layar OLED agar petani bisa memastikan.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { admin, verifyDevice } from './_lib'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const dev = await verifyDevice(String(req.query.device_id ?? ''), String(req.query.key ?? ''))
  if (!dev) return res.status(401).json({ ok: false, pesan: 'Perangkat tidak dikenal / kunci salah' })
  const db = admin()
  await db.from('perangkat').update({ terakhir_online: new Date().toISOString() }).eq('id', dev.id)
  if (!dev.pohon_aktif_id || !dev.sesi_sampai || new Date(dev.sesi_sampai) < new Date())
    return res.status(200).json({ ok: true, aktif: false, pesan: 'Pilih pohon di HP dulu' })
  const { data: p } = await db.from('pohon').select('id,kode').eq('id', dev.pohon_aktif_id).single()
  return res.status(200).json({ ok: true, aktif: true, pohon_id: p?.id, kode: p?.kode })
}
