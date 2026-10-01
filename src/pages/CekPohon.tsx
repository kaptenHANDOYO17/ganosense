import { useEffect, useMemo, useState } from 'react'
import demo from '../lib/demoData.json'
import type { StatusPohon } from '../lib/analysis'
import { predict } from '../lib/model/inference'
import { validateRaw } from '../lib/model/features'
import { LABEL_KELAS } from '../lib/dss'
import type { DataKebun, Kelas, Pengukuran, Pohon, Prediksi, RawInput } from '../lib/types'
import { Pill, ProbaBars } from '../components/ui'

const GEJALA = [
  { t: 'Daun tombak (pucuk) menumpuk ≥ 3 helai dan tidak membuka', s: 'Pertumbuhan pucuk terhambat' },
  { t: 'Daun tua menguning pucat / pelepah patah menggantung (sengkleh)', s: 'Pengangkutan air & hara terganggu' },
  { t: 'Ada jamur berbentuk kipas/kuping cokelat di pangkal batang', s: 'Tubuh buah Ganoderma (basidiokarp)' },
  { t: 'Pangkal batang busuk, keropos, atau berbunyi kopong bila diketuk', s: 'Jaringan batang sudah rusak' },
]

const DEMO_POOL = (demo as unknown as { pengukuran: Pengukuran[] }).pengukuran
function contohRaw(kelas: Kelas): RawInput | null {
  const c = DEMO_POOL.filter(m => predict(m.raw).kelas === kelas)
  if (!c.length) return null
  const r = c[Math.floor(Math.random() * c.length)].raw
  const j = (v: number) => +(v * (1 + (Math.random() - 0.5) * 0.06)).toFixed(3)
  return { ...r, rs_mq138: j(r.rs_mq138), rs_mq135: j(r.rs_mq135), rs_tgs2602: j(r.rs_tgs2602) }
}

const FIELD: { k: keyof RawInput; l: string }[] = [
  { k: 'r0_mq138', l: 'MQ-138 R0 udara (kΩ)' }, { k: 'rs_mq138', l: 'MQ-138 Rs sungkup (kΩ)' },
  { k: 'r0_mq135', l: 'MQ-135 R0 udara (kΩ)' }, { k: 'rs_mq135', l: 'MQ-135 Rs sungkup (kΩ)' },
  { k: 'r0_tgs2602', l: 'TGS2602 R0 udara (kΩ)' }, { k: 'rs_tgs2602', l: 'TGS2602 Rs sungkup (kΩ)' },
  { k: 'slope_mq138', l: 'Laju naik MQ-138 (/menit)' }, { k: 'slope_tgs2602', l: 'Laju naik TGS2602 (/menit)' },
  { k: 'temp_c', l: 'Suhu sungkup (°C)' }, { k: 'rh_pct', l: 'RH sungkup (%)' }, { k: 'rh_ambient', l: 'RH udara luar (%)' },
  { k: 'soil_moist', l: 'Kelembapan tanah (%)' }, { k: 'soil_temp', l: 'Suhu tanah (°C)' },
]

export function CekPohon({ data, status, mode, pohonId, setPohonId, onSimpanVisual, onSimpanUkur, onMulaiSesi, onReload }: {
  data: DataKebun; status: StatusPohon[]; mode: 'demo' | 'supabase'; pohonId: string | null; setPohonId: (id: string) => void
  onSimpanVisual: (p: Pohon) => Promise<void>; onSimpanUkur: (m: Pengukuran) => Promise<void>
  onMulaiSesi: (perangkatId: string, pohonId: string | null) => Promise<void>; onReload: () => Promise<void>
}) {
  const [tab, setTab] = useState<'alat' | 'visual' | 'manual'>('alat')
  const s = status.find(x => x.pohon.id === pohonId) ?? null
  const [gejala, setGejala] = useState<boolean[]>([false, false, false, false])
  const [raw, setRaw] = useState<Partial<RawInput>>({})
  const [hasil, setHasil] = useState<Prediksi | null>(null)
  const [pesan, setPesan] = useState('')
  const [dev, setDev] = useState(data.perangkat[0]?.id ?? '')
  const [menunggu, setMenunggu] = useState(false)
  const nUkur = useMemo(() => data.pengukuran.filter(m => m.tree_id === pohonId).length, [data, pohonId])

  useEffect(() => { setHasil(null); setPesan(''); setGejala([false, false, false, false]) }, [pohonId])
  useEffect(() => { // polling hasil GanoProbe (mode Supabase)
    if (!menunggu) return
    const t = setInterval(() => { void onReload() }, 5000)
    const stop = setTimeout(() => setMenunggu(false), 180000)
    return () => { clearInterval(t); clearTimeout(stop) }
  }, [menunggu, onReload])
  useEffect(() => { if (menunggu) { setMenunggu(false); setPesan('Hasil GanoProbe diterima ✔') } }, [nUkur]) // eslint-disable-line

  const pohon = s?.pohon
  const baseRaw = (r: Partial<RawInput>): RawInput => ({
    ...(r as RawInput), visual_score: pohon?.visual_score ?? 0, generasi: pohon?.generasi ?? 2, umur_th: pohon?.umur_th ?? 10,
  })
  async function simpanPengukuran(r: RawInput, sumber: Pengukuran['sumber']) {
    if (!pohon) return
    const err = validateRaw(r)
    if (err.length) { setPesan('Data belum lengkap/valid: ' + err.join('; ')); return }
    const pr = predict(r)
    setHasil(pr)
    await onSimpanUkur({ tree_id: pohon.id, waktu: new Date().toISOString(), raw: r, sumber })
    setPesan(`Tersimpan. Hasil AI: ${LABEL_KELAS[pr.kelas]} (peluang infeksi ${Math.round(pr.pInfeksi * 100)}%).`)
  }

  return (
    <>
      <div className="card">
        <h2>Pilih pohon</h2>
        <select className="in" value={pohonId ?? ''} onChange={e => setPohonId(e.target.value)}>
          <option value="" disabled>— pilih kode pohon (atau ketuk di peta) —</option>
          {status.map(x => <option key={x.pohon.id} value={x.pohon.id}>{x.pohon.kode} · {LABEL_KELAS[x.kelas]}</option>)}
        </select>
        {s && <div className="row" style={{ marginTop: 8 }}><Pill kelas={s.kelas} /><span className="small muted">risiko tertular {Math.round(s.risiko * 100)}% · {s.rek.judul}</span></div>}
      </div>

      {pohon && <>
        <div className="tabs">
          <button className={tab === 'alat' ? 'on' : ''} onClick={() => setTab('alat')}>Ukur dengan GanoProbe</button>
          <button className={tab === 'visual' ? 'on' : ''} onClick={() => setTab('visual')}>Cek visual (tanpa alat)</button>
          <button className={tab === 'manual' ? 'on' : ''} onClick={() => setTab('manual')}>Isi angka sensor</button>
        </div>

        {tab === 'alat' && <div className="card">
          <h2>Ukur dengan GanoProbe</h2>
          <ol className="steps small">
            <li>Nyalakan GanoProbe, tunggu layar menulis <b>SIAP</b> (pemanasan sensor ± 3 menit).</li>
            <li>Bersihkan piringan pangkal batang dari pelepah/janjang busuk.</li>
            <li>Tekan <b>Mulai sesi</b> di bawah. Layar alat akan menampilkan kode <b>{pohon.kode}</b> — pastikan sama.</li>
            <li>Tempelkan sungkup ke pangkal batang (10–30 cm dari tanah), tancapkan sensor tanah, tekan tombol alat.</li>
            <li>Tunggu ± 3 menit hingga bunyi "bip" dua kali. Hasil muncul di layar alat dan di sini.</li>
          </ol>
          {mode === 'supabase' ? <>
            <label className="f">Perangkat</label>
            <select className="in" value={dev} onChange={e => setDev(e.target.value)}>
              {data.perangkat.length === 0 && <option value="">Belum ada perangkat — daftarkan di menu Lainnya</option>}
              {data.perangkat.map(d => <option key={d.id} value={d.id}>{d.nama} ({d.id})</option>)}
            </select>
            <button className="btn primary block" style={{ marginTop: 8 }} disabled={!dev || menunggu}
              onClick={async () => { await onMulaiSesi(dev, pohon.id); setMenunggu(true); setPesan('Sesi aktif 15 menit. Silakan ukur dengan alat…') }}>
              {menunggu ? 'Menunggu data dari alat…' : 'Mulai sesi'}
            </button>
          </> : <>
            <div className="note small">Mode demo: belum terhubung ke alat sungguhan. Tekan tombol di bawah untuk menyimulasikan hasil GanoProbe pada pohon ini.</div>
            <button className="btn primary block" style={{ marginTop: 8 }} onClick={async () => {
              const lbl = (pohon as Pohon & { _label_demo?: number })._label_demo ?? 0
              const r = contohRaw((['sehat', 'awal', 'sedang', 'berat'] as Kelas[])[lbl])
              if (r) await simpanPengukuran(baseRaw(r), 'demo')
            }}>Simulasikan pengukuran GanoProbe</button>
          </>}
        </div>}

        {tab === 'visual' && <div className="card">
          <h2>Cek gejala dengan mata</h2>
          <p className="small muted" style={{ marginTop: -4 }}>Centang yang terlihat. Ingat: infeksi <b>awal</b> biasanya belum bergejala — karena itu tetap perlu diukur alat.</p>
          {GEJALA.map((g, i) => (
            <label key={i} className="check">
              <input type="checkbox" checked={gejala[i]} onChange={e => setGejala(v => v.map((x, j) => (j === i ? e.target.checked : x)))} />
              <span><b>{g.t}</b><br /><span className="small muted">{g.s}</span></span>
            </label>
          ))}
          <button className="btn primary block" onClick={async () => {
            const score = gejala.filter(Boolean).length
            await onSimpanVisual({ ...pohon, visual_score: score })
            setPesan(score === 0 ? 'Tersimpan: tidak ada gejala terlihat. Tetap jadwalkan pengukuran alat.' : `Tersimpan: skor gejala ${score}/4. Status & rekomendasi diperbarui.`)
          }}>Simpan hasil cek visual</button>
        </div>}

        {tab === 'manual' && <div className="card">
          <h2>Isi angka sensor</h2>
          <p className="small muted" style={{ marginTop: -4 }}>Untuk peneliti/teknisi: salin angka dari layar/kartu SD alat. Atau isi contoh untuk mencoba.</p>
          <div className="row" style={{ marginBottom: 6 }}>
            {(['sehat', 'awal', 'sedang', 'berat'] as Kelas[]).map(k => <button key={k} className="btn" onClick={() => { const r = contohRaw(k); if (r) setRaw(r) }}>Contoh {LABEL_KELAS[k].toLowerCase()}</button>)}
          </div>
          <div className="two">
            {FIELD.map(f => (
              <div key={f.k}>
                <label className="f">{f.l}</label>
                <input className="in" inputMode="decimal" value={raw[f.k] ?? ''} onChange={e => setRaw(r => ({ ...r, [f.k]: e.target.value === '' ? undefined : Number(e.target.value.replace(',', '.')) }))} />
              </div>
            ))}
          </div>
          <div className="row" style={{ marginTop: 10 }}>
            <button className="btn" onClick={() => { const r = baseRaw(raw); const e = validateRaw(r); if (e.length) setPesan(e.join('; ')); else { setHasil(predict(r)); setPesan('Pratinjau (belum disimpan).') } }}>Hitung saja</button>
            <button className="btn primary" onClick={() => simpanPengukuran(baseRaw(raw), 'manual')}>Hitung & simpan</button>
          </div>
        </div>}

        {(hasil || pesan) && <div className="card">
          {pesan && <p className="small" style={{ marginTop: 0 }}>{pesan}</p>}
          {hasil && <><div className="row" style={{ marginBottom: 8 }}><b>Hasil AI:</b><Pill kelas={hasil.kelas} /></div><ProbaBars proba={hasil.proba} /></>}
        </div>}
      </>}
    </>
  )
}
