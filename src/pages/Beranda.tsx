import { useMemo } from 'react'
import type { Ringkasan, StatusPohon } from '../lib/analysis'
import { rupiah } from '../lib/dss'
import { Legenda, PetaBlok } from '../components/PetaBlok'
import { Pill } from '../components/ui'
import { cekHariIniList } from '../lib/scouting'

export { urutanJalan } from '../lib/scouting'
export function cekHariIni(status: StatusPohon[], n = 12) { return cekHariIniList(status, n) }

export function Beranda({ status, rs, selected, onPick }: {
  status: StatusPohon[]; rs: Ringkasan; selected: string | null; onPick: (id: string) => void
}) {
  const today = useMemo(() => cekHariIni(status), [status])
  const hl = useMemo(() => new Set(today.map(t => t.pohon.id)), [today])
  const terinfeksi = rs.awal + rs.sedang + rs.berat
  return (
    <>
      <div className="grid stats" style={{ marginBottom: 12 }}>
        <div className="stat"><b>{rs.total}</b><span>pohon dipantau</span></div>
        <div className="stat"><b style={{ color: 'var(--berat)' }}>{terinfeksi}</b><span>terindikasi Ganoderma ({rs.awal} tahap awal)</span></div>
        <div className="stat"><b style={{ color: 'var(--risk)' }}>{rs.risikoTinggi}</b><span>pohon sehat berisiko tinggi tertular</span></div>
        <div className="stat"><b>{rupiah(rs.nilaiTerancam12)}</b><span>nilai TBS terancam 12 bulan ke depan</span></div>
      </div>

      <div className="card">
        <h2>Peta kesehatan kebun</h2>
        <p className="small muted" style={{ marginTop: -4 }}>Ketuk lingkaran untuk melihat detail & rekomendasi. Lingkaran bergaris hijau = daftar cek hari ini.</p>
        <PetaBlok status={status} selected={selected} onPick={onPick} highlight={hl} />
        <Legenda />
      </div>

      <div className="card">
        <h2>Cek hari ini ({today.length} pohon)</h2>
        <p className="small muted" style={{ marginTop: -4 }}>
          Dipilih AI: pohon paling berisiko & paling lama tidak diukur, diurutkan sesuai jalur jalan per baris.
          Perkiraan waktu ± {today.length * 4} menit.
        </p>
        <ul className="list">
          {today.map((s, i) => (
            <li key={s.pohon.id} onClick={() => onPick(s.pohon.id)}>
              <b style={{ width: 22 }}>{i + 1}.</b>
              <div className="grow">
                <div className="row"><b>{s.pohon.kode}</b><Pill kelas={s.kelas} /></div>
                <div className="small muted">{s.rek.judul} · risiko {Math.round(s.risiko * 100)}%</div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </>
  )
}
