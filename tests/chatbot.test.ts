import demo from '../src/lib/demoData.json'
import { analisis, ringkasan } from '../src/lib/analysis'
import { ASUMSI_DEFAULT } from '../src/lib/dss'
import { jawab } from '../src/lib/chatbot'
import type { DataKebun } from '../src/lib/types'
const st = analisis({ ...(demo as unknown as DataKebun), perangkat: [] }, new Date('2026-09-29'))
const rs = ringkasan(st, ASUMSI_DEFAULT)
const cek = (q: string, harus: string) => { const a = jawab(q, st, rs).teks; if (!a.includes(harus)) { console.error('GAGAL', q, '->', a); process.exit(1) } console.log('ok -', q) }
cek('Pohon mana yang dicek hari ini?', 'prioritas')
cek('bagaimana kondisi kebun saya', 'pohon** dipantau')
cek('berapa kerugiannya', 'Rp')
cek('B1-05-04', 'B1-05-04')
cek('apa itu trichoderma', 'Trichoderma')
cek('gejalanya apa saja', 'daun tombak')
cek('xyz tidak jelas', 'Maaf')
console.log('LULUS')
