import { useState } from 'react'
import type { StatusPohon } from '../lib/analysis'
import type { JenisTindakan, Tindakan } from '../lib/types'
import { Pill, ProbaBars, Sheet, WARNA, tanggal } from './ui'

export const JENIS: Record<JenisTindakan, string> = {
  trichoderma: 'Aplikasi Trichoderma', pembumbunan: 'Pembumbunan', bedah_batang: 'Bedah batang',
  parit_isolasi: 'Parit isolasi', eradikasi: 'Eradikasi (bongkar) & sanitasi', lainnya: 'Lainnya',
}

function Sparkline({ data }: { data: StatusPohon['riwayat'] }) {
  if (data.length < 2) return null
  const W = 280, H = 60
  const pts = data.map((d, i) => [8 + (i / (data.length - 1)) * (W - 16), H - 8 - d.pInfeksi * (H - 16)])
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} aria-label="Tren peluang infeksi">
      <line x1={8} x2={W - 8} y1={H / 2} y2={H / 2} stroke="var(--line)" strokeDasharray="3 3" />
      <polyline points={pts.map(p => p.join(',')).join(' ')} fill="none" stroke="var(--muted)" strokeWidth={1.5} />
      {pts.map((p, i) => <circle key={i} cx={p[0]} cy={p[1]} r={4} fill={WARNA[data[i].kelas]} />)}
    </svg>
  )
}

export function DetailPohon({ s, onClose, onUkur, onTindakan }: {
  s: StatusPohon; onClose: () => void; onUkur: (id: string) => void; onTindakan: (t: Tindakan) => Promise<void>
}) {
  const [jenis, setJenis] = useState<JenisTindakan>('trichoderma')
  const [catatan, setCatatan] = useState('')
  const [busy, setBusy] = useState(false)
  const p = s.pohon
  return (
    <Sheet onClose={onClose}>
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <div>
          <div className="muted small">Pohon</div>
          <h2 style={{ margin: 0 }}>{p.kode}</h2>
        </div>
        <Pill kelas={s.kelas} />
      </div>
      <p className="small muted" style={{ marginTop: 6 }}>
        Blok {p.blok} · baris {p.baris} · pokok {p.kolom} · generasi ke-{p.generasi} · umur {p.umur_th} th
        {s.hariSejakCek !== null && <> · diukur {s.hariSejakCek} hari lalu</>}
        {s.sumber === 'visual' && <> · <b>status dari gejala visual (belum diukur sensor)</b></>}
      </p>

      <div className="card" style={{ borderLeft: `5px solid ${WARNA[s.kelas]}` }}>
        <h2>{s.rek.judul}</h2>
        <p className="small" style={{ margin: '0 0 6px' }}>{s.rek.alasan}</p>
        <ol className="steps small">{s.rek.langkah.map((l, i) => <li key={i}>{l}</li>)}</ol>
        <p className="small muted" style={{ margin: 0 }}>Ukur ulang dalam ± {s.rek.ukurUlangHari} hari.</p>
      </div>

      {s.proba && <div className="card"><h3 style={{ marginTop: 0 }}>Hasil AI {s.sumber === 'visual' && '(perkiraan visual)'}</h3><ProbaBars proba={s.proba} /></div>}

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Risiko tertular 12 bulan: {Math.round(s.risiko * 100)}% ({s.level})</h3>
        <p className="small muted" style={{ margin: 0 }}>
          {s.tetanggaSakit > 0 ? `${s.tetanggaSakit} pohon tetangga terdekat terindikasi sakit. Jamur menular lewat kontak akar.` : 'Tidak ada tetangga terdekat yang terindikasi sakit.'}
        </p>
        {s.riwayat.length > 1 && <><h3>Riwayat peluang infeksi</h3><Sparkline data={s.riwayat} />
          <p className="small muted" style={{ margin: 0 }}>{tanggal(s.riwayat[0].waktu)} → {tanggal(s.riwayat[s.riwayat.length - 1].waktu)}</p></>}
      </div>

      {s.tindakan.length > 0 && <div className="card"><h3 style={{ marginTop: 0 }}>Tindakan tercatat</h3>
        <ul className="list small">{s.tindakan.map((t, i) => <li key={i} style={{ cursor: 'default' }}><span className="grow">{JENIS[t.jenis]}{t.catatan ? ` — ${t.catatan}` : ''}</span><span className="muted">{tanggal(t.waktu)}</span></li>)}</ul></div>}

      <button className="btn primary block" onClick={() => onUkur(p.id)}>Ukur / cek pohon ini</button>
      <div className="card" style={{ marginTop: 12 }}>
        <h3 style={{ marginTop: 0 }}>Catat tindakan yang sudah dikerjakan</h3>
        <select className="in" value={jenis} onChange={e => setJenis(e.target.value as JenisTindakan)}>
          {Object.entries(JENIS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <label className="f">Catatan (opsional)</label>
        <input className="in" value={catatan} onChange={e => setCatatan(e.target.value)} placeholder="mis. Trichoderma 1 kg, merek X" />
        <button className="btn block" style={{ marginTop: 8 }} disabled={busy} onClick={async () => {
          setBusy(true); await onTindakan({ tree_id: p.id, waktu: new Date().toISOString(), jenis, catatan }); setBusy(false); setCatatan('')
        }}>Simpan tindakan</button>
      </div>
      <button className="btn block" onClick={onClose}>Tutup</button>
    </Sheet>
  )
}
