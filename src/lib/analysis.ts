/** Menggabungkan 3 lapisan (AI deteksi, risiko spasial, DSS) menjadi status tiap pohon. */
import { predict } from './model/inference'
import { infectivity, neighbours, risk12, riskLevel, treatmentFactor } from './spatial'
import { KEHILANGAN, nilaiPohonPerTahun, rekomendasi, type AsumsiEkonomi, type Rekomendasi } from './dss'
import type { DataKebun, Kelas, Pohon, Prediksi, Tindakan } from './types'

export interface StatusPohon {
  pohon: Pohon
  pred: Prediksi | null
  sumber: 'sensor' | 'visual' | 'belum'
  kelas: Kelas | 'belum'
  proba: number[] | null
  pInfeksi: number | null
  risiko: number
  level: 'rendah' | 'sedang' | 'tinggi'
  hariSejakCek: number | null
  prioritas: number
  rek: Rekomendasi
  tindakan: Tindakan[]
  riwayat: { waktu: string; pInfeksi: number; kelas: Kelas }[]
  tetanggaSakit: number
}

const VISUAL_PROBA: Record<number, number[]> = {
  1: [0.55, 0.3, 0.15, 0], 2: [0.1, 0.2, 0.6, 0.1], 3: [0, 0.05, 0.45, 0.5], 4: [0, 0, 0.1, 0.9],
}
const DAY = 86400000

export function analisis(data: DataKebun, now = new Date()): StatusPohon[] {
  const byTree = new Map<string, typeof data.pengukuran>()
  for (const m of data.pengukuran) {
    if (!byTree.has(m.tree_id)) byTree.set(m.tree_id, [])
    byTree.get(m.tree_id)!.push(m)
  }
  const tByTree = new Map<string, Tindakan[]>()
  for (const t of data.tindakan) {
    if (!tByTree.has(t.tree_id)) tByTree.set(t.tree_id, [])
    tByTree.get(t.tree_id)!.push(t)
  }

  // Tahap 1: status individu (AI dari sensor, atau gejala visual bila belum diukur)
  const base = data.pohon.map(p => {
    const ms = (byTree.get(p.id) ?? []).slice().sort((a, b) => a.waktu.localeCompare(b.waktu))
    const riwayat = ms.map(m => { const pr = predict(m.raw); return { waktu: m.waktu, pInfeksi: pr.pInfeksi, kelas: pr.kelas } })
    const last = ms[ms.length - 1]
    let pred: Prediksi | null = null
    let sumber: StatusPohon['sumber'] = 'belum'
    let proba: number[] | null = null
    if (last) { pred = predict({ ...last.raw, visual_score: Math.max(last.raw.visual_score, p.visual_score) }); proba = pred.proba; sumber = 'sensor' }
    else if (p.visual_score > 0) { proba = VISUAL_PROBA[Math.min(4, p.visual_score)]; sumber = 'visual' }
    const kelas: StatusPohon['kelas'] = pred ? pred.kelas : proba ? (['sehat', 'awal', 'sedang', 'berat'] as Kelas[])[proba.indexOf(Math.max(...proba))] : 'belum'
    const hari = last ? Math.floor((now.getTime() - new Date(last.waktu).getTime()) / DAY) : null
    const tindakan = tByTree.get(p.id) ?? []
    return { p, pred, sumber, proba, kelas, hari, tindakan, riwayat }
  })

  // Tahap 2: tekanan infeksi dari tetangga (kontak akar)
  const nb = neighbours(data.pohon)
  const src = new Map(base.map(b => [b.p.id, infectivity(b.proba) * treatmentFactor(b.tindakan)]))
  return base.map(b => {
    const list = nb.get(b.p.id) ?? []
    const pressure = list.reduce((s, n) => s + n.w * (src.get(n.id) ?? 0), 0)
    const tetanggaSakit = list.filter(n => n.w === 1 && (src.get(n.id) ?? 0) >= 0.5).length
    const risiko = risk12(b.p.generasi, pressure)
    const pInf = b.proba ? 1 - b.proba[0] : null
    const sudahEradikasi = b.tindakan.some(t => t.jenis === 'eradikasi')
    let rek = rekomendasi({ kelas: b.kelas, pInfeksi: pInf, risiko, sumber: b.sumber, hariSejakCek: b.hari, sudahEradikasi })
    // Bila sudah ada tindakan setelah pengukuran terakhir, turunkan urgensi (tinggal menunggu ukur ulang)
    const lastM = b.riwayat.length ? b.riwayat[b.riwayat.length - 1].waktu : ''
    const baruDitangani = b.tindakan.some(t => t.jenis !== 'eradikasi' && t.waktu >= lastM &&
      now.getTime() - new Date(t.waktu).getTime() < rek.ukurUlangHari * DAY)
    if (!sudahEradikasi && baruDitangani && (rek.urgensi === 'segera' || rek.urgensi === 'minggu_ini'))
      rek = { ...rek, urgensi: 'bulan_ini', judul: `Sudah ditangani · ${rek.judul}`, alasan: 'Tindakan sudah dicatat. Ukur ulang sesuai jadwal untuk melihat hasilnya. ' + rek.alasan }
    // Tahap 3: prioritas pemindaian (Smart Scouting) — pohon mana dicek lebih dulu
    const stale = b.hari === null ? 3 : Math.min(3, b.hari / 30)
    const unsure = pInf === null ? 0.1 : Math.min(pInf, 1 - pInf) // makin ragu makin perlu dicek
    const prioritas = sudahEradikasi || b.kelas === 'berat' ? 0 : (risiko + unsure + (b.kelas === 'awal' ? 0.3 : 0)) * (0.4 + stale)
    return {
      pohon: b.p, pred: b.pred, sumber: b.sumber, kelas: b.kelas, proba: b.proba, pInfeksi: pInf,
      risiko, level: riskLevel(risiko), hariSejakCek: b.hari, prioritas, rek, tindakan: b.tindakan,
      riwayat: b.riwayat, tetanggaSakit,
    }
  })
}

export interface Ringkasan {
  total: number; sehat: number; awal: number; sedang: number; berat: number; belum: number
  risikoTinggi: number; nilaiHilangTahun: number; nilaiTerancam12: number; nilaiPohon: number
}

export function ringkasan(st: StatusPohon[], a: AsumsiEkonomi): Ringkasan {
  const nilaiPohon = nilaiPohonPerTahun(a)
  const r: Ringkasan = { total: st.length, sehat: 0, awal: 0, sedang: 0, berat: 0, belum: 0, risikoTinggi: 0, nilaiHilangTahun: 0, nilaiTerancam12: 0, nilaiPohon }
  for (const s of st) {
    r[s.kelas]++
    if (s.kelas !== 'belum') r.nilaiHilangTahun += KEHILANGAN[s.kelas] * nilaiPohon
    if ((s.kelas === 'sehat' || s.kelas === 'belum') && s.level === 'tinggi') r.risikoTinggi++
    // nilai terancam 12 bln: pohon sehat yg mungkin tertular (+ asumsi hilang 50% sesudah terinfeksi lanjut)
    if (s.kelas === 'sehat' || s.kelas === 'belum') r.nilaiTerancam12 += s.risiko * 0.5 * nilaiPohon
    if (s.kelas === 'awal') r.nilaiTerancam12 += (KEHILANGAN.sedang - KEHILANGAN.awal) * nilaiPohon * 0.6
  }
  return r
}
