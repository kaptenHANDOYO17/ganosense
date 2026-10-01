import { Fragment, useEffect, useRef, useState } from 'react'
import type { Ringkasan, StatusPohon } from '../lib/analysis'
import { cekAI, jawab, jawabLLM, type ChatMsg } from '../lib/chatbot'

function Teks({ t }: { t: string }) {
  return <>{t.split('\n').map((line, i) => (
    <Fragment key={i}>{i > 0 && <br />}{line.split(/(\*\*[^*]+\*\*)/g).map((seg, j) =>
      seg.startsWith('**') ? <b key={j}>{seg.slice(2, -2)}</b> : <Fragment key={j}>{seg}</Fragment>)}</Fragment>
  ))}</>
}

/**
 * GanoBot — gabungan dua otak:
 *  1. Lokal (selalu aktif, gratis): pertanyaan tentang DATA kebun dijawab langsung dari hasil AI deteksi & DSS.
 *  2. Model bahasa (bila server punya ANTHROPIC_API_KEY): pertanyaan bebas dijawab AI dengan konteks data kebun.
 */
export function ChatBot({ status, rs, onPick, openInit = false }: {
  status: StatusPohon[]; rs: Ringkasan; onPick: (id: string) => void; openInit?: boolean
}) {
  const [open, setOpen] = useState(openInit)
  const [input, setInput] = useState('')
  const [msgs, setMsgs] = useState<ChatMsg[]>(() => [jawab('halo', status, rs)])
  const [busy, setBusy] = useState(false)
  const [ai, setAi] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)
  useEffect(() => { endRef.current?.scrollIntoView({ block: 'end' }) }, [msgs, open, busy])
  useEffect(() => { void cekAI().then(setAi) }, [])

  async function kirim(q: string) {
    if (!q.trim() || busy) return
    setInput('')
    const user: ChatMsg = { dari: 'user', teks: q }
    const lokal = jawab(q, status, rs)
    const riwayat = [...msgs, user]
    // pertanyaan data kebun (kode pohon, cek hari ini, tugas, rugi, kondisi) → jawaban lokal yang presisi
    const pakaiAI = ai && (lokal.jenis === 'kb' || lokal.jenis === 'fallback')
    if (!pakaiAI) { setMsgs([...riwayat, lokal]); return }
    setMsgs(riwayat); setBusy(true)
    const t = await jawabLLM(q, status, rs, msgs, lokal.jenis === 'kb' ? lokal.teks : undefined)
    setBusy(false)
    setMsgs([...riwayat, t ? { dari: 'bot', teks: t, jenis: 'ai', saran: lokal.saran } : lokal])
  }
  const kode = (id: string) => status.find(s => s.pohon.id === id)?.pohon.kode ?? id

  if (!open) return (
    <button className="fab" onClick={() => setOpen(true)} aria-label="Buka GanoBot">
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M4 5h16v11H9l-5 4z" /><path d="M8.5 10.5h.01M12 10.5h.01M15.5 10.5h.01" /></svg>
      <span>Tanya GanoBot</span>
    </button>
  )
  return (
    <div className="chat" role="dialog" aria-label="GanoBot">
      <div className="chat-head">
        <div className="logo" style={{ width: 30, height: 30 }}>G</div>
        <div style={{ flex: 1 }}><b>GanoBot</b> {ai && <span className="ai-badge">AI aktif</span>}
          <div className="small muted">Asisten kebun · jawab dari data kebun Anda</div></div>
        <button className="btn" onClick={() => setOpen(false)} aria-label="Tutup">Tutup</button>
      </div>
      <div className="chat-body">
        {msgs.map((m, i) => (
          <div key={i} className={'bubble ' + m.dari}>
            <Teks t={m.teks} />
            {m.pohon && m.pohon.length > 0 && <div className="row" style={{ marginTop: 6 }}>
              {m.pohon.slice(0, 6).map(id => <button key={id} className="chip" onClick={() => { onPick(id); setOpen(false) }}>Buka {kode(id)}</button>)}
            </div>}
            {m.saran && i === msgs.length - 1 && !busy && <div className="row" style={{ marginTop: 8 }}>
              {m.saran.map(s => <button key={s} className="chip" onClick={() => kirim(s)}>{s}</button>)}
            </div>}
          </div>
        ))}
        {busy && <div className="bubble bot muted">GanoBot sedang berpikir…</div>}
        <div ref={endRef} />
      </div>
      <form className="chat-input" onSubmit={e => { e.preventDefault(); void kirim(input) }}>
        <input id="chat-q" className="in" value={input} onChange={e => setInput(e.target.value)} placeholder="Tanya, mis. pohon mana dicek hari ini?" />
        <button className="btn primary" type="submit" disabled={busy}>Kirim</button>
      </form>
    </div>
  )
}
