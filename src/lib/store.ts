/**
 * Lapisan data. Dua mode:
 *  - DEMO     : bila VITE_SUPABASE_URL kosong. Data contoh di memori (tersimpan di browser bila bisa).
 *  - SUPABASE : data asli per akun petani/kelompok tani.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import demo from './demoData.json'
import type { DataKebun, Kebun, Pengukuran, Perangkat, Pohon, Tindakan } from './types'

const URL = import.meta.env.VITE_SUPABASE_URL as string | undefined
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined
export const supabase: SupabaseClient | null = URL && KEY ? createClient(URL, KEY) : null
export const MODE: 'demo' | 'supabase' = supabase ? 'supabase' : 'demo'

export interface Store {
  load(kebunId?: string): Promise<DataKebun>
  daftarKebun(): Promise<Kebun[]>
  buatKebun(k: Omit<Kebun, 'id'>): Promise<Kebun>
  simpanKebun(k: Kebun): Promise<void>
  tambahPohon(kebunId: string, p: Omit<Pohon, 'id'>[]): Promise<void>
  ubahPohon(p: Pohon): Promise<void>
  tambahPengukuran(kebunId: string, m: Pengukuran): Promise<void>
  tambahTindakan(kebunId: string, t: Tindakan): Promise<void>
  tambahPerangkat(kebunId: string, id: string, nama: string, kunciHash: string): Promise<void>
  mulaiSesi(perangkatId: string, pohonId: string | null): Promise<void>
  isiContoh(kebunId: string): Promise<void>
}

// ---------------- DEMO ----------------
const LS = 'ganosense-demo-v1'
function freshDemo(): DataKebun {
  const d = JSON.parse(JSON.stringify(demo)) as DataKebun & { pohon: (Pohon & { _label_demo?: number })[] }
  return { ...d, perangkat: [{ id: 'GP-DEMO-01', nama: 'GanoProbe Demo', pohon_aktif_id: null }] } as DataKebun
}
let demoData: DataKebun | null = null
function getDemo(): DataKebun {
  if (demoData) return demoData
  try { const s = localStorage.getItem(LS); if (s) demoData = JSON.parse(s) } catch { /* abaikan */ }
  if (!demoData) demoData = freshDemo()
  return demoData
}
function saveDemo() { try { localStorage.setItem(LS, JSON.stringify(demoData)) } catch { /* abaikan */ } }
export function resetDemo() { demoData = freshDemo(); saveDemo() }

const demoStore: Store = {
  async load() { return getDemo() },
  async daftarKebun() { return [getDemo().kebun] },
  async buatKebun(k) { const d = getDemo(); d.kebun = { ...k, id: 'demo' }; saveDemo(); return d.kebun },
  async simpanKebun(k) { getDemo().kebun = k; saveDemo() },
  async tambahPohon(_k, ps) { const d = getDemo(); ps.forEach(p => d.pohon.push({ ...p, id: p.kode })); saveDemo() },
  async ubahPohon(p) { const d = getDemo(); d.pohon = d.pohon.map(x => (x.id === p.id ? p : x)); saveDemo() },
  async tambahPengukuran(_k, m) { getDemo().pengukuran.push(m); saveDemo() },
  async tambahTindakan(_k, t) { getDemo().tindakan.push(t); saveDemo() },
  async tambahPerangkat(_k, id, nama) { getDemo().perangkat.push({ id, nama }); saveDemo() },
  async mulaiSesi(pid, pohonId) { const d = getDemo(); d.perangkat = d.perangkat.map(x => (x.id === pid ? { ...x, pohon_aktif_id: pohonId } : x)); saveDemo() },
  async isiContoh() { resetDemo() },
}

// ---------------- SUPABASE ----------------
function must<T>(r: { data: T; error: unknown }): T { if (r.error) throw r.error; return r.data }

const sbStore: Store = {
  async daftarKebun() { return must(await supabase!.from('kebun').select('*').order('created_at')) as Kebun[] },
  async buatKebun(k) { return must(await supabase!.from('kebun').insert(k).select().single()) as Kebun },
  async simpanKebun(k) { must(await supabase!.from('kebun').update(k).eq('id', k.id)) },
  async load(kebunId) {
    const kebun = must(await supabase!.from('kebun').select('*').eq('id', kebunId!).single()) as Kebun
    const pohon = must(await supabase!.from('pohon').select('*').eq('kebun_id', kebunId!)) as Pohon[]
    const pm = must(await supabase!.from('pengukuran').select('pohon_id,waktu,raw,sumber').eq('kebun_id', kebunId!).order('waktu')) as { pohon_id: string; waktu: string; raw: Pengukuran['raw']; sumber: Pengukuran['sumber'] }[]
    const tn = must(await supabase!.from('tindakan').select('pohon_id,waktu,jenis,catatan').eq('kebun_id', kebunId!)) as { pohon_id: string; waktu: string; jenis: Tindakan['jenis']; catatan: string }[]
    const perangkat = must(await supabase!.from('perangkat').select('id,nama,pohon_aktif_id,terakhir_online').eq('kebun_id', kebunId!)) as Perangkat[]
    return {
      kebun, pohon, perangkat,
      pengukuran: pm.map(m => ({ tree_id: m.pohon_id, waktu: m.waktu, raw: m.raw, sumber: m.sumber })),
      tindakan: tn.map(t => ({ tree_id: t.pohon_id, waktu: t.waktu, jenis: t.jenis, catatan: t.catatan })),
    }
  },
  async tambahPohon(kebunId, ps) { must(await supabase!.from('pohon').insert(ps.map(p => ({ ...p, kebun_id: kebunId })))) },
  async ubahPohon(p) { must(await supabase!.from('pohon').update({ visual_score: p.visual_score, catatan: p.catatan, generasi: p.generasi, umur_th: p.umur_th }).eq('id', p.id)) },
  async tambahPengukuran(kebunId, m) { must(await supabase!.from('pengukuran').insert({ kebun_id: kebunId, pohon_id: m.tree_id, waktu: m.waktu, raw: m.raw, sumber: m.sumber ?? 'manual' })) },
  async tambahTindakan(kebunId, t) { must(await supabase!.from('tindakan').insert({ kebun_id: kebunId, pohon_id: t.tree_id, waktu: t.waktu, jenis: t.jenis, catatan: t.catatan })) },
  async tambahPerangkat(kebunId, id, nama, kunciHash) { must(await supabase!.from('perangkat').insert({ id, nama, kebun_id: kebunId, kunci_hash: kunciHash })) },
  async mulaiSesi(pid, pohonId) {
    const sampai = new Date(Date.now() + 15 * 60000).toISOString()
    must(await supabase!.from('perangkat').update({ pohon_aktif_id: pohonId, sesi_sampai: pohonId ? sampai : null }).eq('id', pid))
  },
  /** Mengisi kebun dengan data contoh (168 pohon + riwayat ukur) agar aplikasi langsung bisa dicoba/presentasi. */
  async isiContoh(kebunId) {
    const d = demo as unknown as { pohon: (Pohon & { _label_demo?: number })[]; pengukuran: Pengukuran[] }
    const rows = d.pohon.map(({ id: _id, _label_demo: _l, ...p }) => ({ ...p, kebun_id: kebunId }))
    must(await supabase!.from('pohon').upsert(rows, { onConflict: 'kebun_id,kode' }))
    const ids = must(await supabase!.from('pohon').select('id,kode').eq('kebun_id', kebunId)) as { id: string; kode: string }[]
    const map = new Map(ids.map(x => [x.kode, x.id]))
    const ms = d.pengukuran.filter(m => map.has(m.tree_id)).map(m => ({ kebun_id: kebunId, pohon_id: map.get(m.tree_id), waktu: m.waktu, raw: m.raw, sumber: 'demo' }))
    for (let i = 0; i < ms.length; i += 200) must(await supabase!.from('pengukuran').insert(ms.slice(i, i + 200)))
  },
}

export const store: Store = MODE === 'supabase' ? sbStore : demoStore

export async function sha256(text: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('')
}

export function randomKey(): string {
  const a = new Uint8Array(12); crypto.getRandomValues(a)
  return Array.from(a).map(b => b.toString(36).padStart(2, '0')).join('').slice(0, 20).toUpperCase()
}
