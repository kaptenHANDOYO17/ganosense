import { createClient } from '@supabase/supabase-js'
import { createHash } from 'node:crypto'

export function admin() {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY belum diisi di Vercel')
  return createClient(url, key, { auth: { persistSession: false } })
}

export const sha256 = (s: string) => createHash('sha256').update(s).digest('hex')

/** Verifikasi perangkat: id + kunci (kunci asli dikirim perangkat, yang disimpan hanya hash-nya). */
export async function verifyDevice(id?: string, key?: string) {
  if (!id || !key) return null
  const db = admin()
  const { data } = await db.from('perangkat').select('*').eq('id', id).maybeSingle()
  if (!data || data.kunci_hash !== sha256(key)) return null
  return data as { id: string; kebun_id: string; pohon_aktif_id: string | null; sesi_sampai: string | null }
}
