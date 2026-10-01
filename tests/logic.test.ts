// Uji logika: analisis demo, risiko spasial, dan DSS berjalan konsisten.
import demo from '../src/lib/demoData.json'
import { analisis, ringkasan } from '../src/lib/analysis'
import { ASUMSI_DEFAULT } from '../src/lib/dss'
import { risk12 } from '../src/lib/spatial'
import type { DataKebun } from '../src/lib/types'

const data = { ...(demo as unknown as DataKebun), perangkat: [] }
const st = analisis(data, new Date('2026-09-29'))
const rs = ringkasan(st, ASUMSI_DEFAULT)
const assert = (c: boolean, m: string) => { if (!c) { console.error('GAGAL:', m); process.exit(1) } else console.log('ok -', m) }

assert(st.length === 168, '168 pohon dianalisis')
assert(rs.awal + rs.sedang + rs.berat > 0, `terdeteksi pohon terinfeksi (${rs.awal} awal, ${rs.sedang} sedang, ${rs.berat} berat)`)
assert(risk12(2, 3) > risk12(2, 0), 'risiko naik bila tetangga sakit')
const sehatDekat = st.filter(s => s.kelas === 'sehat' && s.tetanggaSakit >= 2)
const sehatJauh = st.filter(s => s.kelas === 'sehat' && s.tetanggaSakit === 0)
const avg = (a: typeof st) => a.reduce((x, s) => x + s.risiko, 0) / Math.max(1, a.length)
assert(avg(sehatDekat) > avg(sehatJauh), `pohon sehat dekat klaster lebih berisiko (${(avg(sehatDekat)*100).toFixed(1)}% vs ${(avg(sehatJauh)*100).toFixed(1)}%)`)
assert(st.filter(s => s.kelas === 'berat').every(s => s.rek.urgensi === 'segera'), 'pohon berat selalu "segera"')
// akurasi pada data demo terhadap label tersembunyi (pohon yang diukur)
const lab = new Map((demo as any).pohon.map((p: any) => [p.id, p._label_demo]))
const diukur = st.filter(s => s.sumber === 'sensor')
const benar = diukur.filter(s => ['sehat','awal','sedang','berat'].indexOf(s.kelas) === lab.get(s.pohon.id)).length
console.log(`info - kecocokan status vs label demo: ${benar}/${diukur.length}`)
console.log('LULUS')
