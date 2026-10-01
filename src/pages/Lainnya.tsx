import { useState } from 'react'
import { MODEL_META } from '../lib/model/inference'
import sim from '../lib/simSummary.json'
import { randomKey, sha256 } from '../lib/store'
import type { DataKebun, Pohon } from '../lib/types'

function csvPengukuran(d: DataKebun): string {
  const kode = new Map(d.pohon.map(p => [p.id, p.kode]))
  const cols = ['r0_mq138', 'rs_mq138', 'r0_mq135', 'rs_mq135', 'r0_tgs2602', 'rs_tgs2602', 'slope_mq138', 'slope_tgs2602',
    'temp_c', 'rh_pct', 'rh_ambient', 'soil_moist', 'soil_temp', 'visual_score', 'generasi', 'umur_th'] as const
  const rows = d.pengukuran.map(m => [kode.get(m.tree_id) ?? m.tree_id, m.waktu, ...cols.map(c => m.raw[c]), ''].join(','))
  return ['tree_id,waktu,' + cols.join(',') + ',label', ...rows].join('\n')
}

export function Lainnya({ data, mode, onTambahPohon, onTambahPerangkat, onResetDemo, onLogout }: {
  data: DataKebun; mode: 'demo' | 'supabase'
  onTambahPohon: (p: Omit<Pohon, 'id'>[]) => Promise<void>
  onTambahPerangkat: (id: string, nama: string, hash: string) => Promise<void>
  onResetDemo: () => void; onLogout: () => void
}) {
  const [blok, setBlok] = useState('B2'); const [baris, setBaris] = useState(10); const [pokok, setPokok] = useState(14)
  const [gen, setGen] = useState(2); const [umur, setUmur] = useState(12); const [msg, setMsg] = useState('')
  const [devNama, setDevNama] = useState('GanoProbe 1'); const [kunciBaru, setKunciBaru] = useState<{ id: string; key: string } | null>(null)
  const m = MODEL_META.cv_metrics

  async function buatBlok() {
    if (data.pohon.some(p => p.blok === blok)) { setMsg(`Blok ${blok} sudah ada.`); return }
    const y0 = data.pohon.length ? Math.max(...data.pohon.map(p => p.y)) + 20 : 0
    const ps: Omit<Pohon, 'id'>[] = []
    for (let r = 1; r <= baris; r++) for (let c = 1; c <= pokok; c++) ps.push({
      kode: `${blok}-${String(r).padStart(2, '0')}-${String(c).padStart(2, '0')}`, blok, baris: r, kolom: c,
      x: +((c - 1) * 9 + ((r - 1) % 2) * 4.5).toFixed(2), y: +(y0 + (r - 1) * 9 * Math.sqrt(3) / 2).toFixed(2),
      generasi: gen, umur_th: umur, visual_score: 0, catatan: '',
    })
    await onTambahPohon(ps); setMsg(`${ps.length} pohon ditambahkan ke blok ${blok}.`)
  }

  return (
    <>
      <div className="card">
        <h2>Tambah blok kebun</h2>
        <p className="small muted" style={{ marginTop: -4 }}>Sistem membuat peta pohon otomatis dengan pola tanam segitiga 9 m. Kode pohon = Blok-Baris-Pokok (tulis/tempel di batang).</p>
        <div className="two">
          <div><label className="f">Nama blok</label><input className="in" value={blok} onChange={e => setBlok(e.target.value.toUpperCase())} /></div>
          <div><label className="f">Generasi tanam</label><select className="in" value={gen} onChange={e => setGen(+e.target.value)}><option value={1}>Ke-1 (bekas hutan/karet)</option><option value={2}>Ke-2 (replanting)</option><option value={3}>Ke-3 atau lebih</option></select></div>
          <div><label className="f">Jumlah baris</label><input className="in" type="number" value={baris} onChange={e => setBaris(+e.target.value)} /></div>
          <div><label className="f">Pokok per baris</label><input className="in" type="number" value={pokok} onChange={e => setPokok(+e.target.value)} /></div>
          <div><label className="f">Umur tanaman (tahun)</label><input className="in" type="number" value={umur} onChange={e => setUmur(+e.target.value)} /></div>
        </div>
        <button className="btn primary block" style={{ marginTop: 10 }} onClick={buatBlok}>Buat blok</button>
        {msg && <p className="small">{msg}</p>}
      </div>

      <div className="card">
        <h2>Perangkat GanoProbe</h2>
        <ul className="list small">{data.perangkat.map(d => <li key={d.id} style={{ cursor: 'default' }}><span className="grow"><b>{d.nama}</b> · {d.id}</span>
          <span className="muted">{d.terakhir_online ? 'online ' + new Date(d.terakhir_online).toLocaleString('id-ID') : 'belum pernah online'}</span></li>)}</ul>
        {mode === 'supabase' ? <>
          <label className="f">Nama perangkat baru</label>
          <input className="in" value={devNama} onChange={e => setDevNama(e.target.value)} />
          <button className="btn block" style={{ marginTop: 8 }} onClick={async () => {
            const id = 'GP-' + Math.random().toString(36).slice(2, 7).toUpperCase(); const key = randomKey()
            await onTambahPerangkat(id, devNama, await sha256(key)); setKunciBaru({ id, key })
          }}>Daftarkan perangkat</button>
          {kunciBaru && <div className="warnbox" style={{ marginTop: 8 }}>
            <b>Catat sekarang — kunci hanya tampil sekali.</b> Salin ke file <code>config.h</code> firmware:<br />
            <code className="k">#define DEVICE_ID "{kunciBaru.id}"</code><br /><code className="k">#define DEVICE_KEY "{kunciBaru.key}"</code><br />
            <code className="k">#define API_BASE "{location.origin}"</code>
          </div>}
        </> : <p className="small muted">Mode demo: pendaftaran perangkat aktif setelah Supabase dihubungkan (lihat README).</p>}
      </div>

      <div className="card">
        <h2>Data untuk riset</h2>
        <p className="small muted" style={{ marginTop: -4 }}>Unduh semua pengukuran (CSV). Isi kolom <b>label</b> dengan hasil sensus/uji lab, lalu latih ulang model: <code>python ml/train.py --csv file.csv</code>.</p>
        <button className="btn" onClick={() => {
          const blob = new Blob([csvPengukuran(data)], { type: 'text/csv' })
          const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'ganosense_pengukuran.csv'; a.click()
        }}>Unduh CSV pengukuran</button>
      </div>

      <div className="card">
        <h2>Tentang model AI</h2>
        <table className="t small"><tbody>
          <tr><td>Arsitektur</td><td>Random Forest 60 pohon keputusan + fitur respons relatif multisensor, dijalankan langsung di HP/server</td></tr>
          <tr><td>Sumber data latih</td><td>{MODEL_META.sumber_data}</td></tr>
          <tr><td>Jumlah data</td><td>{MODEL_META.n_pengukuran} pengukuran dari {MODEL_META.n_pohon} pohon</td></tr>
          <tr><td>Validasi</td><td>{MODEL_META.cv}</td></tr>
          <tr><td>Akurasi / Macro-F1</td><td>{(m.akurasi * 100).toFixed(1)}% / {m.macro_f1.toFixed(3)}</td></tr>
          <tr><td>Recall infeksi awal</td><td>{(m.recall_awal * 100).toFixed(1)}% (sensus visual: {(sim.banding_model['Sensus visual konvensional'].recall_awal * 100).toFixed(0)}%)</td></tr>
          <tr><td>Sensitivitas / spesifisitas</td><td>{(m.sensitivitas_terinfeksi * 100).toFixed(1)}% / {(m.spesifisitas * 100).toFixed(1)}%</td></tr>
        </tbody></table>
        <div className="warnbox" style={{ marginTop: 8 }}>Model saat ini adalah <b>model baseline</b> dari data sintetis berbasis literatur. Angka di atas bukan performa lapangan. Riset GanoSense akan menggantinya dengan data lapangan berlabel (sensus + isolasi media selektif Ganoderma).</div>
      </div>

      <div className="card">
        <h2>Pengaturan</h2>
        <div className="row">
          {mode === 'demo' && <button className="btn" onClick={onResetDemo}>Kembalikan data demo</button>}
          {mode === 'supabase' && <button className="btn" onClick={onLogout}>Keluar akun</button>}
        </div>
        <p className="small muted">GanoSense v1.0 · Mode: {mode === 'demo' ? 'Demo (data contoh)' : 'Terhubung Supabase'}. Rekomendasi bersifat pendukung keputusan; konsultasikan tindakan teknis dengan penyuluh/PPKS setempat.</p>
      </div>
    </>
  )
}
