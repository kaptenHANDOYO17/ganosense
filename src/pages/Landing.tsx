import probe from '../assets/probe.jpg'
import gejala from '../assets/gejala.jpg'
import pakai from '../assets/pakai.jpg'

/** Halaman depan untuk orang awam: masalah → cara kerja → siapa yang cocok → mulai. */
export function Landing({ mode, onDemo, onMasuk, onChat, onPanduan }: {
  mode: 'demo' | 'supabase'; onDemo: () => void; onMasuk: () => void; onChat: () => void; onPanduan: () => void
}) {
  return (
    <div className="landing">
      <header className="lp-top">
        <div className="row" style={{ gap: 10 }}><div className="logo">G</div><b style={{ fontSize: 18 }}>GanoSense</b></div>
        <nav className="row lp-links">
          <a href="#cara-kerja">Cara kerja</a><a href="#kenapa">Kenapa dini?</a><a href="#tanya">Tanya jawab</a>
          <button className="btn lp-panduan" onClick={onPanduan}>Panduan</button>
          <button className="btn primary" onClick={mode === 'supabase' ? onMasuk : onDemo}>{mode === 'supabase' ? 'Masuk' : 'Buka aplikasi'}</button>
        </nav>
      </header>

      <section className="lp-hero">
        <div className="lp-hero-text">
          <span className="eyebrow">Lomba Riset Mahasiswa BPDP 2026 · Universitas Diponegoro</span>
          <h1>Temukan Ganoderma sebelum daun sawit menguning</h1>
          <p className="lead">GanoSense <b>mencium</b> senyawa khas jamur di pangkal batang, lalu kecerdasan buatan memberi tahu
            <b> pohon mana yang sakit</b>, <b>pohon mana yang akan tertular</b>, dan <b>apa yang harus dikerjakan</b> — dalam bahasa yang mudah dipahami.</p>
          <div className="row" style={{ marginTop: 18 }}>
            <button className="btn primary lg" onClick={onDemo}>Coba demo sekarang</button>
            {mode === 'supabase' && <button className="btn lg" onClick={onMasuk}>Masuk ke kebun saya</button>}
            <button className="btn lg" onClick={onChat}>Tanya GanoBot</button>
          </div>
          <p className="small muted" style={{ marginTop: 10 }}>Gratis dicoba. Demo memakai data contoh 168 pohon — tidak perlu daftar. <button className="linkbtn" onClick={onPanduan}>Baca panduan singkat</button></p>
        </div>
        <figure className="lp-hero-img"><img src={probe} alt="Render 3D alat GanoProbe dengan sungkup dan probe tanah" /></figure>
      </section>

      <section className="lp-stats" aria-label="Besarnya masalah">
        <div><b>170.593 ha</b><span>kebun sawit terserang Ganoderma (2023)</span></div>
        <div><b>3,7% → 42,2%</b><span>pohon terserang dalam 8 tahun di kebun monokultur</span></div>
        <div><b>Rp7,8 triliun</b><span>perkiraan kerugian nasional per tahun</span></div>
        <div><b>±Rp398.600</b><span>nilai panen 1 pohon sehat per tahun (TBS Rp3.800/kg)</span></div>
      </section>
      <p className="small muted lp-src">Sumber: Sawit Indonesia (2024), Warta PPKS (2024), HaiSawit (2026), InfoSAWIT (Sep 2026).</p>

      <section id="cara-kerja" className="lp-section">
        <h2>Cara kerjanya, dalam 3 langkah</h2>
        <div className="lp-steps">
          <article><span className="step">1</span><h3>Cium</h3><p>Tempelkan corong GanoProbe ke pangkal batang selama ±3 menit. Tiga sensor gas mencium senyawa yang dilepaskan jamur saat membusukkan batang.</p></article>
          <article><span className="step">2</span><h3>Petakan</h3><p>AI menilai pohon: <i>sehat, infeksi awal, sedang,</i> atau <i>berat</i>. Karena jamur menular lewat akar, AI juga menandai pohon sehat yang berisiko tertular.</p></article>
          <article><span className="step">3</span><h3>Kerjakan</h3><p>Aplikasi menyusun daftar tugas (segera, minggu ini, bulan ini) lengkap dengan nilai Rupiah yang diselamatkan. Ragu? Tanya GanoBot.</p></article>
        </div>
        <figure className="lp-wide"><img src={pakai} alt="Ilustrasi 3D cara memakai GanoProbe di pangkal batang sawit" />
          <figcaption>Corong ditempel 10–30 cm dari tanah; probe tanah ditancapkan di piringan. Hasil muncul di layar alat dan di HP.</figcaption></figure>
      </section>

      <section id="kenapa" className="lp-section">
        <h2>Kenapa harus dideteksi dini?</h2>
        <p className="lead">Ganoderma bekerja seperti rayap di fondasi rumah. Saat daun mulai menguning, separuh jaringan akar dan batang sudah rusak —
          dan jamur sudah menular ke pohon sebelahnya. Pohon yang sudah berat <b>tidak bisa disembuhkan</b>; yang bisa diselamatkan adalah tetangganya.</p>
        <figure className="lp-wide"><img src={gejala} alt="Ilustrasi perkembangan gejala Ganoderma dari sehat sampai tumbang" />
          <figcaption>Kolom kedua (infeksi awal) adalah sasaran GanoSense: pohon tampak sehat, tetapi sensor sudah mencium jamurnya.</figcaption></figure>
      </section>

      <section className="lp-section">
        <h2>Untuk siapa?</h2>
        <div className="lp-steps">
          <article><h3>Petani & kelompok tani</h3><p>Satu alat dipakai bergilir oleh satu kelompok. Aplikasi memilihkan pohon yang perlu dicek hari ini, sesuai jalur jalan.</p></article>
          <article><h3>Penyuluh & dinas</h3><p>Peta sebaran serangan per blok membantu merencanakan sanitasi, parit isolasi, dan peremajaan (PSR).</p></article>
          <article><h3>Peneliti</h3><p>Semua pengukuran bisa diunduh untuk melatih ulang model AI dengan data lapangan berlabel uji laboratorium.</p></article>
        </div>
      </section>

      <section id="tanya" className="lp-section">
        <h2>Pertanyaan yang sering muncul</h2>
        <details><summary>Apakah hasil AI pasti benar?</summary><p>Tidak ada alat yang 100% benar. Bila hasilnya ragu-ragu, aplikasi meminta ukur ulang. Untuk keputusan besar, mintalah konfirmasi penyuluh atau uji laboratorium.</p></details>
        <details><summary>Saya tidak punya alatnya. Bisa tetap dipakai?</summary><p>Bisa. Gunakan menu <b>Cek visual</b> untuk mencatat gejala. Hanya saja cara ini tidak bisa menemukan infeksi awal.</p></details>
        <details><summary>Butuh sinyal internet?</summary><p>Alat menyimpan data di kartu SD bila tidak ada sinyal dan mengirim otomatis saat sinyal kembali.</p></details>
        <details><summary>Bisa dipakai di kebun siapa saja?</summary><p>Ya. GanoSense tidak terikat pada satu perusahaan atau mitra; cukup buat akun, tambahkan blok kebun, lalu mulai mengukur.</p></details>
        <div className="row" style={{ marginTop: 16 }}>
          <button className="btn primary lg" onClick={onDemo}>Buka aplikasi demo</button>
          <button className="btn lg" onClick={onChat}>Tanya GanoBot</button>
        </div>
      </section>

      <footer className="lp-foot">
        <b>GanoSense</b> · Sistem peringatan dini Ganoderma berbasis IoT, AI spasial, dan Decision Support System.<br />
        Tim Universitas Diponegoro: Handoyo (Teknik Komputer) · Naswa Dyfa Nabilla (Bioteknologi) · Pembimbing: Yudi Eko Windarto, S.T., M.Kom.<br />
        Rekomendasi bersifat pendukung keputusan; konsultasikan tindakan teknis dengan penyuluh/PPKS setempat.
      </footer>
    </div>
  )
}
