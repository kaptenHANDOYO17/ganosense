import type { ReactNode } from 'react'
import { LABEL_KELAS } from '../lib/dss'
import type { Kelas } from '../lib/types'

export const WARNA: Record<Kelas | 'belum', string> = {
  sehat: 'var(--sehat)', awal: 'var(--awal)', sedang: 'var(--sedang)', berat: 'var(--berat)', belum: 'var(--belum)',
}

export function Pill({ kelas }: { kelas: Kelas | 'belum' }) {
  return <span className="pill" style={{ background: WARNA[kelas] }}>{LABEL_KELAS[kelas]}</span>
}

export function Sheet({ onClose, children }: { onClose: () => void; children: ReactNode }) {
  return (
    <div className="sheet-bg" onClick={onClose}>
      <div className="sheet" onClick={e => e.stopPropagation()} role="dialog">{children}</div>
    </div>
  )
}

export function ProbaBars({ proba }: { proba: number[] }) {
  const k: Kelas[] = ['sehat', 'awal', 'sedang', 'berat']
  return (
    <div className="grid" style={{ gap: 6 }}>
      {k.map((c, i) => (
        <div key={c} className="row" style={{ flexWrap: 'nowrap' }}>
          <span style={{ width: 96 }} className="small">{LABEL_KELAS[c]}</span>
          <div className="bar" style={{ flex: 1 }}><i style={{ width: `${proba[i] * 100}%`, background: WARNA[c] }} /></div>
          <span className="small" style={{ width: 40, textAlign: 'right' }}>{Math.round(proba[i] * 100)}%</span>
        </div>
      ))}
    </div>
  )
}

const P = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
export const Icon = {
  home: <svg viewBox="0 0 24 24" {...P}><path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z" /></svg>,
  cek: <svg viewBox="0 0 24 24" {...P}><circle cx="11" cy="11" r="6" /><path d="M20 20l-4.5-4.5M8.5 11l2 2 3.5-4" /></svg>,
  tugas: <svg viewBox="0 0 24 24" {...P}><path d="M9 6h11M9 12h11M9 18h11M4 6l1 1 2-2M4 12l1 1 2-2M4 18l1 1 2-2" /></svg>,
  uang: <svg viewBox="0 0 24 24" {...P}><rect x="3" y="6" width="18" height="12" rx="2" /><circle cx="12" cy="12" r="2.5" /><path d="M6 9v.01M18 15v.01" /></svg>,
  lain: <svg viewBox="0 0 24 24" {...P}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-2.9 1.2V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-2.9-1.2l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0-1.2-2.9H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.2-2.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 2.9-1.2V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 2.9 1.2l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0 1.2 2.9H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" /></svg>,
}

export function tanggal(iso: string) {
  return new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
}
