import type { StatusPohon } from '../lib/analysis'
import { WARNA } from './ui'

/** Peta blok: setiap lingkaran = 1 pohon pada pola tanam segitiga. Cincin oranye = risiko tertular tinggi. */
export function PetaBlok({ status, selected, onPick, highlight }: {
  status: StatusPohon[]; selected?: string | null; onPick: (id: string) => void; highlight?: Set<string>
}) {
  if (!status.length) return <p className="muted">Belum ada pohon. Tambahkan blok di menu Lainnya.</p>
  const xs = status.map(s => s.pohon.x), ys = status.map(s => s.pohon.y)
  const minX = Math.min(...xs) - 8, minY = Math.min(...ys) - 8
  const w = Math.max(...xs) - minX + 8, h = Math.max(...ys) - minY + 8
  const blok = new Map<string, { x: number; y: number }>()
  for (const s of status) {
    const b = blok.get(s.pohon.blok)
    if (!b || s.pohon.y < b.y) blok.set(s.pohon.blok, { x: Math.min(b?.x ?? 1e9, s.pohon.x), y: s.pohon.y })
  }
  return (
    <div className="map-wrap">
      <svg viewBox={`${minX} ${minY} ${w} ${h}`} role="img" aria-label="Peta status pohon">
        {[...blok.entries()].map(([k, p]) => (
          <text key={k} x={p.x - 4} y={p.y - 5.5} fontSize={3.2} fill="var(--muted)" fontWeight={700}>Blok {k}</text>
        ))}
        {status.map(s => {
          const risky = (s.kelas === 'sehat' || s.kelas === 'belum') && s.level === 'tinggi'
          const erad = s.tindakan.some(t => t.jenis === 'eradikasi')
          const sel = selected === s.pohon.id
          return (
            <g key={s.pohon.id} className="tree" onClick={() => onPick(s.pohon.id)}>
              <title>{`${s.pohon.kode} — ${s.kelas}${risky ? ' (risiko tinggi)' : ''}`}</title>
              {risky && <circle cx={s.pohon.x} cy={s.pohon.y} r={3.9} fill="none" stroke="var(--risk)" strokeWidth={0.9} strokeDasharray="1.6 1" />}
              {highlight?.has(s.pohon.id) && <circle cx={s.pohon.x} cy={s.pohon.y} r={4.3} fill="none" stroke="var(--brand)" strokeWidth={0.8} />}
              <circle className="core" cx={s.pohon.x} cy={s.pohon.y} r={2.9} fill={erad ? 'transparent' : WARNA[s.kelas]}
                stroke={erad ? 'var(--muted)' : 'none'} strokeWidth={0.6} opacity={s.sumber === 'visual' ? 0.7 : 1} />
              {erad && <path d={`M${s.pohon.x - 1.6} ${s.pohon.y - 1.6}l3.2 3.2m0-3.2l-3.2 3.2`} stroke="var(--muted)" strokeWidth={0.6} />}
              {sel && <circle cx={s.pohon.x} cy={s.pohon.y} r={3.4} fill="none" stroke="var(--ink)" strokeWidth={0.9} />}
            </g>
          )
        })}
      </svg>
    </div>
  )
}

export function Legenda() {
  return (
    <div className="legend">
      {(['sehat', 'awal', 'sedang', 'berat', 'belum'] as const).map(k => (
        <span key={k}><i className="dot" style={{ background: WARNA[k] }} />{{ sehat: 'Sehat', awal: 'Awal', sedang: 'Sedang', berat: 'Berat', belum: 'Belum diukur' }[k]}</span>
      ))}
      <span><i className="dot" style={{ border: '2px dashed var(--risk)', background: 'transparent' }} />Risiko tertular tinggi</span>
      <span>✕ Sudah dibongkar</span>
    </div>
  )
}
