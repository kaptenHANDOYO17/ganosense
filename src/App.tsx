import { useCallback, useEffect, useMemo, useState } from 'react'
import { analisis, ringkasan } from './lib/analysis'
import { ASUMSI_DEFAULT, type AsumsiEkonomi } from './lib/dss'
import { MODE, resetDemo, store, supabase } from './lib/store'
import type { DataKebun, Kebun } from './lib/types'
import { DetailPohon } from './components/DetailPohon'
import { ChatBot } from './components/ChatBot'
import { Panduan } from './components/Panduan'
import { Landing } from './pages/Landing'
import { Icon } from './components/ui'
import { Beranda } from './pages/Beranda'
import { CekPohon } from './pages/CekPohon'
import { Tugas } from './pages/Tugas'
import { Untung } from './pages/Untung'
import { Lainnya } from './pages/Lainnya'

type Tab = 'beranda' | 'cek' | 'tugas' | 'untung' | 'lain'

function Login({ onBack }: { onBack: () => void }) {
  const [email, setEmail] = useState(''); const [pw, setPw] = useState(''); const [msg, setMsg] = useState(''); const [daftar, setDaftar] = useState(false)
  return (
    <div className="center"><div className="card" style={{ width: '100%', maxWidth: 380 }}>
      <div className="row" style={{ marginBottom: 8 }}><div className="logo">G</div><h2 style={{ margin: 0 }}>GanoSense</h2></div>
      <p className="small muted">Masuk untuk memantau kebun Anda.</p>
      <label className="f">Email</label><input className="in" type="email" value={email} onChange={e => setEmail(e.target.value)} />
      <label className="f">Kata sandi (min. 6 karakter)</label><input className="in" type="password" value={pw} onChange={e => setPw(e.target.value)} />
      <button className="btn primary block" style={{ marginTop: 12 }} onClick={async () => {
        const r = daftar ? await supabase!.auth.signUp({ email, password: pw }) : await supabase!.auth.signInWithPassword({ email, password: pw })
        setMsg(r.error ? r.error.message : daftar ? 'Akun dibuat. Cek email untuk konfirmasi (bila diminta), lalu masuk.' : '')
      }}>{daftar ? 'Daftar' : 'Masuk'}</button>
      <button className="btn block" style={{ marginTop: 8 }} onClick={() => setDaftar(!daftar)}>{daftar ? 'Sudah punya akun? Masuk' : 'Belum punya akun? Daftar'}</button>
      {msg && <p className="small">{msg}</p>}
      <button className="btn block" style={{ marginTop: 8 }} onClick={onBack}>← Kembali ke halaman depan</button>
    </div></div>
  )
}

function PilihKebun({ onPilih }: { onPilih: (k: Kebun) => void }) {
  const [busy, setBusy] = useState(false)
  const [list, setList] = useState<Kebun[] | null>(null)
  const [nama, setNama] = useState(''); const [lokasi, setLokasi] = useState(''); const [luas, setLuas] = useState(2)
  useEffect(() => { store.daftarKebun().then(setList) }, [])
  if (!list) return <div className="center muted">Memuat…</div>
  return (
    <div className="card" style={{ marginTop: 20 }}>
      <h2>Pilih kebun</h2>
      <ul className="list">{list.map(k => <li key={k.id} onClick={() => onPilih(k)}><b className="grow">{k.nama}</b><span className="muted small">{k.lokasi}</span></li>)}</ul>
      <h3>Buat kebun baru</h3>
      <label className="f">Nama kebun / kelompok tani</label><input className="in" value={nama} onChange={e => setNama(e.target.value)} />
      <label className="f">Lokasi (desa, kabupaten)</label><input className="in" value={lokasi} onChange={e => setLokasi(e.target.value)} />
      <label className="f">Luas (ha)</label><input className="in" type="number" value={luas} onChange={e => setLuas(+e.target.value)} />
      <button className="btn primary block" style={{ marginTop: 10 }} disabled={!nama || busy} onClick={async () => onPilih(await store.buatKebun({ nama, lokasi, luas_ha: luas }))}>Buat kebun</button>
      <div className="note small" style={{ marginTop: 12 }}>Ingin langsung mencoba atau presentasi? Buat <b>kebun contoh</b> berisi 168 pohon dengan riwayat pengukuran simulasi.</div>
      <button className="btn block" style={{ marginTop: 8 }} disabled={busy} onClick={async () => {
        setBusy(true)
        const k = await store.buatKebun({ nama: 'Kebun Contoh GanoSense', lokasi: 'Data simulasi', luas_ha: 1.17 })
        await store.isiContoh(k.id); setBusy(false); onPilih(k)
      }}>{busy ? 'Menyiapkan kebun contoh…' : 'Buat kebun contoh (data simulasi)'}</button>
    </div>
  )
}

export default function App() {
  const [session, setSession] = useState<boolean>(MODE === 'demo')
  const [kebunId, setKebunId] = useState<string | null>(() => { try { return localStorage.getItem('ganosense-kebun') } catch { return null } })
  const [data, setData] = useState<DataKebun | null>(null)
  const [tab, setTab] = useState<Tab>('beranda')
  const [sel, setSel] = useState<string | null>(null)
  const [cekId, setCekId] = useState<string | null>(null)
  const [asumsi, setAsumsi] = useState<AsumsiEkonomi>(ASUMSI_DEFAULT)
  const [err, setErr] = useState('')
  const [view, setView] = useState<'landing' | 'login' | 'app'>(() => {
    try { return /^#(app|chat)$/.test(location.hash) ? 'app' : 'landing' } catch { return 'landing' }
  })
  const [chatInit, setChatInit] = useState(() => { try { return location.hash === '#chat' } catch { return false } })
  const [panduan, setPanduan] = useState(false)

  useEffect(() => {
    if (!supabase) return
    supabase.auth.getSession().then(({ data }) => setSession(!!data.session))
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(!!s))
    return () => sub.subscription.unsubscribe()
  }, [])

  const reload = useCallback(async () => {
    try {
      if (MODE === 'supabase' && !kebunId) return
      const d = await store.load(kebunId ?? undefined)
      setData({ ...d }); setErr('')
      setAsumsi(a => ({ tbs_t_ha: d.kebun.tbs_t_ha ?? a.tbs_t_ha, harga_tbs: d.kebun.harga_tbs ?? a.harga_tbs, pohon_ha: d.kebun.pohon_ha ?? a.pohon_ha }))
    } catch (e) { setErr(String((e as Error).message ?? e)); if (MODE === 'supabase') setKebunId(null) }
  }, [kebunId])
  useEffect(() => { if (session) void reload() }, [session, reload])

  const status = useMemo(() => (data ? analisis(data) : []), [data])
  const rs = useMemo(() => ringkasan(status, asumsi), [status, asumsi])

  const keApp = (chat = false) => { setChatInit(chat); setView(MODE === 'supabase' && !session ? 'login' : 'app'); try { history.replaceState(null, '', chat ? '#chat' : '#app') } catch { /* */ } window.scrollTo(0, 0) }
  if (view === 'landing') return <>
    <Landing mode={MODE} onDemo={() => keApp()} onMasuk={() => keApp()} onChat={() => keApp(true)} onPanduan={() => setPanduan(true)} />
    {panduan && <Panduan onClose={() => setPanduan(false)} />}
  </>
  if (!session) return <div className="app"><Login onBack={() => setView('landing')} /></div>
  if (MODE === 'supabase' && !kebunId) return <div className="app"><PilihKebun onPilih={k => { try { localStorage.setItem('ganosense-kebun', k.id) } catch { /* */ } setKebunId(k.id) }} /></div>
  if (!data) return <div className="app center muted">{err || 'Memuat data kebun…'}</div>

  const kid = data.kebun.id
  const selS = status.find(s => s.pohon.id === sel) ?? null
  const nav: { k: Tab; l: string; i: JSX.Element }[] = [
    { k: 'beranda', l: 'Beranda', i: Icon.home }, { k: 'cek', l: 'Cek Pohon', i: Icon.cek },
    { k: 'tugas', l: 'Tugas', i: Icon.tugas }, { k: 'untung', l: 'Hitung Untung', i: Icon.uang }, { k: 'lain', l: 'Lainnya', i: Icon.lain },
  ]
  return (
    <div className="app">
      <header className="top">
        <button className="logo" style={{ border: 0, cursor: 'pointer' }} aria-label="Halaman depan" onClick={() => { setView('landing'); try { history.replaceState(null, '', '#') } catch { /* */ } }}>G</button>
        <div style={{ minWidth: 0 }}><h1>GanoSense</h1><small>{data.kebun.nama} · {data.kebun.lokasi}</small></div>
        <span className="badge-mode">{MODE === 'demo' ? 'MODE DEMO' : 'TERHUBUNG'}</span>
        <button className="icon-btn" onClick={() => setPanduan(true)}>Panduan</button>
      </header>
      {MODE === 'demo' && tab === 'beranda' && <div className="note" style={{ marginBottom: 12 }}>
        Ini <b>data contoh</b> satu blok (168 pohon) dengan dua klaster serangan. Coba: ketuk pohon merah di peta → lihat rekomendasi → catat tindakan; atau buka <b>Cek Pohon</b> untuk menyimulasikan pengukuran.
      </div>}
      {err && <div className="warnbox" style={{ marginBottom: 12 }}>{err}</div>}

      {tab === 'beranda' && <Beranda status={status} rs={rs} selected={sel} onPick={setSel} />}
      {tab === 'cek' && <CekPohon data={data} status={status} mode={MODE} pohonId={cekId} setPohonId={setCekId}
        onSimpanVisual={async p => { await store.ubahPohon(p); await reload() }}
        onSimpanUkur={async m => { await store.tambahPengukuran(kid, m); await reload() }}
        onMulaiSesi={async (d, p) => { await store.mulaiSesi(d, p) }} onReload={reload} />}
      {tab === 'tugas' && <Tugas status={status} onPick={setSel} />}
      {tab === 'untung' && <Untung rs={rs} asumsi={asumsi} luasHa={data.pohon.length / asumsi.pohon_ha}
        setAsumsi={a => { setAsumsi(a); void store.simpanKebun({ ...data.kebun, tbs_t_ha: a.tbs_t_ha, harga_tbs: a.harga_tbs, pohon_ha: a.pohon_ha }) }} />}
      {tab === 'lain' && <Lainnya data={data} mode={MODE}
        onTambahPohon={async ps => { await store.tambahPohon(kid, ps); await reload() }}
        onTambahPerangkat={async (id, nama, h) => { await store.tambahPerangkat(kid, id, nama, h); await reload() }}
        onResetDemo={() => { resetDemo(); void reload() }}
        onLogout={async () => { await supabase?.auth.signOut(); try { localStorage.removeItem('ganosense-kebun') } catch { /* */ } setKebunId(null) }} />}

      {!selS && <ChatBot status={status} rs={rs} onPick={setSel} openInit={chatInit} />}
      {panduan && <Panduan onClose={() => setPanduan(false)} />}

      {selS && <DetailPohon s={selS} onClose={() => setSel(null)}
        onUkur={id => { setCekId(id); setSel(null); setTab('cek') }}
        onTindakan={async t => { await store.tambahTindakan(kid, t); await reload() }} />}

      <nav className="bottom"><div className="inner">
        {nav.map(n => <button key={n.k} className={tab === n.k ? 'on' : ''} onClick={() => { setTab(n.k); window.scrollTo(0, 0) }}>{n.i}{n.l}</button>)}
      </div></nav>
    </div>
  )
}
