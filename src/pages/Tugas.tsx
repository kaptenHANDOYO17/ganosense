import type { StatusPohon } from '../lib/analysis'
import type { Urgensi } from '../lib/dss'
import { Pill } from '../components/ui'
import { urutanJalan } from './Beranda'

const GRUP: { k: Urgensi; judul: string; ket: string }[] = [
  { k: 'segera', judul: 'Kerjakan segera', ket: 'Pohon sakit sedang/berat — sumber penular' },
  { k: 'minggu_ini', judul: 'Minggu ini', ket: 'Infeksi awal, hasil ragu-ragu, atau tetangga pohon sakit yang belum diukur' },
  { k: 'bulan_ini', judul: 'Bulan ini', ket: 'Pencegahan pada pohon berisiko & cek rutin yang terlambat' },
]

export function Tugas({ status, onPick }: { status: StatusPohon[]; onPick: (id: string) => void }) {
  return (
    <>
      <div className="note" style={{ marginBottom: 12 }}>
        Daftar ini dibuat otomatis oleh sistem pendukung keputusan (DSS) dari hasil AI dan peta risiko.
        Ketuk pohon untuk melihat langkah lengkap lalu catat tindakan yang sudah dikerjakan.
      </div>
      {GRUP.map(g => {
        const items = urutanJalan(status.filter(s => s.rek.urgensi === g.k))
        return (
          <div className="card" key={g.k}>
            <h2>{g.judul} <span className="muted">({items.length})</span></h2>
            <p className="small muted" style={{ marginTop: -4 }}>{g.ket}</p>
            {items.length === 0 ? <p className="small muted">Tidak ada.</p> : (
              <ul className="list">
                {items.slice(0, 60).map(s => (
                  <li key={s.pohon.id} onClick={() => onPick(s.pohon.id)}>
                    <div className="grow">
                      <div className="row"><b>{s.pohon.kode}</b><Pill kelas={s.kelas} />
                        {s.tindakan.length > 0 && <span className="small muted">✓ {s.tindakan.length} tindakan</span>}</div>
                      <div className="small"><b>{s.rek.judul}.</b> <span className="muted">{s.rek.langkah[0]}</span></div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )
      })}
    </>
  )
}
