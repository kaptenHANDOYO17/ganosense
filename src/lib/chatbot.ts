/**
 * GanoBot — asisten tanya-jawab GanoSense.
 * Bekerja tanpa internet & tanpa biaya API: menjawab dari DATA KEBUN (hasil AI, risiko, DSS)
 * dan dari basis pengetahuan Ganoderma. Bila server punya ANTHROPIC_API_KEY, pertanyaan
 * bebas yang tidak dikenali dapat diteruskan ke /api/chat (opsional).
 */
import type { Ringkasan, StatusPohon } from './analysis'
import { LABEL_KELAS, rupiah } from './dss'
import { MODEL_META } from './model/inference'
import { cekHariIniList } from './scouting'

export interface ChatMsg { dari: 'user' | 'bot'; teks: string; saran?: string[]; pohon?: string[]; jenis?: 'data' | 'kb' | 'fallback' | 'ai' }

const norm = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[^\p{L}\p{N}\s-]/gu, ' ').replace(/\s+/g, ' ').trim()
const has = (q: string, words: string[]) => words.some(w => q.includes(w))

const SARAN_UMUM = ['Pohon mana yang dicek hari ini?', 'Bagaimana kondisi kebun saya?', 'Berapa kerugiannya?', 'Apa itu infeksi awal?']

interface KB { kunci: string[]; jawab: string; saran?: string[] }
const PENGETAHUAN: KB[] = [
  { kunci: ['apa itu ganoderma', 'ganoderma itu', 'busuk pangkal', 'bpb', 'penyakit apa'],
    jawab: 'Ganoderma boninense adalah jamur yang membusukkan akar dan pangkal batang sawit (penyakit busuk pangkal batang/BPB). Ia menular lewat **akar yang bersentuhan** dengan pohon sakit dan dari **sisa batang/tunggul** yang ditinggal di kebun. Pohon yang sudah berat bisa kehilangan hingga 80% produksi lalu mati.',
    saran: ['Apa saja gejalanya?', 'Kenapa harus dideteksi dini?'] },
  { kunci: ['gejala', 'ciri', 'tanda'],
    jawab: 'Gejala yang terlihat mata (biasanya sudah terlambat):\n• daun tombak/pucuk menumpuk ≥3 dan tidak membuka\n• daun tua menguning pucat, pelepah patah menggantung (sengkleh)\n• jamur kipas cokelat (basidiokarp) di pangkal batang\n• pangkal batang busuk/keropos.\nInfeksi **awal** belum bergejala — karena itu GanoProbe "mencium" senyawa khas jamur di pangkal batang.',
    saran: ['Apa itu infeksi awal?', 'Bagaimana cara mengukur?'] },
  { kunci: ['infeksi awal', 'tahap awal', 'stadium awal', 'kenapa awal', 'dini', 'kenapa harus'],
    jawab: 'Infeksi awal = jamur sudah masuk tetapi daun masih tampak sehat. Ini **jendela emas**: penanganan paling murah dan pohon masih bisa dipertahankan. Saat gejala terlihat, ±50% jaringan akar dan batang biasanya sudah rusak dan jamur sudah menular ke tetangga.',
    saran: ['Apa itu Trichoderma?', 'Pohon mana yang dicek hari ini?'] },
  { kunci: ['trichoderma', 'agens hayati', 'jamur baik'],
    jawab: 'Trichoderma adalah jamur "baik" yang menekan Ganoderma. Taburkan di piringan dan sekitar pangkal batang (pohon awal, sedang, dan tetangga berisiko), juga di lubang bekas bongkaran. Dosis ikuti label produk/anjuran penyuluh. Setelah dikerjakan, catat di menu pohon → **Catat tindakan**.' },
  { kunci: ['parit', 'isolasi'],
    jawab: 'Parit isolasi memutus jalur kontak akar antara pohon sakit dan pohon sehat. Dibuat mengelilingi titik/kelompok pohon terserang. Ukuran mengikuti anjuran PPKS/penyuluh setempat. Paling berguna bila ada ≥2 pohon sakit berdekatan.' },
  { kunci: ['bongkar', 'eradikasi', 'tumbang', 'sanitasi', 'tunggul', 'batang mati'],
    jawab: 'Pohon **berat/mati** tidak bisa disembuhkan dan menjadi sumber penular. Tumbang, bongkar bonggol + akar, **cacah** batangnya — jangan ditinggal utuh di kebun, karena jamur bisa bertahan bertahun-tahun dan menulari tanaman baru saat peremajaan. Beri Trichoderma di lubang bekas bongkaran.' },
  { kunci: ['pembumbunan', 'bumbun', 'timbun'],
    jawab: 'Pembumbunan = menimbun tanah di pangkal batang pohon yang terinfeksi awal/sedang. Tujuannya merangsang akar baru dan memperlambat kerusakan pangkal batang, sehingga pohon tetap berproduksi lebih lama.' },
  { kunci: ['cara ukur', 'mengukur', 'pakai alat', 'ganoprobe', 'cara pakai'],
    jawab: 'Cara mengukur dengan GanoProbe (±4 menit):\n1. Nyalakan alat, tunggu layar SIAP (±3 menit).\n2. Pilih pohon di HP → **Mulai sesi**.\n3. Tekan tombol, pegang alat di udara 60 detik.\n4. Bunyi bip → tempel sungkup ke pangkal batang, tekan tombol, tunggu 2 menit.\n5. Hasil muncul di alat dan HP.\nTips: ukur pagi, jangan sehabis hujan, bersihkan piringan dari pelepah busuk.' },
  { kunci: ['akurasi', 'akurat', 'benar', 'salah', 'percaya'],
    jawab: `Tidak ada alat yang 100% benar. Model saat ini adalah model awal (${MODEL_META.sumber_data}) dengan recall infeksi awal ${(MODEL_META.cv_metrics.recall_awal * 100).toFixed(0)}% dan spesifisitas ${(MODEL_META.cv_metrics.spesifisitas * 100).toFixed(0)}% pada uji per pohon. Model akan dilatih ulang dengan data lapangan berlabel uji laboratorium. Bila hasil ragu-ragu, sistem meminta ukur ulang.` },
  { kunci: ['cincin', 'oranye', 'risiko tertular', 'tetangga'],
    jawab: 'Cincin oranye putus-putus di peta = pohon yang masih sehat tetapi **berisiko tinggi tertular** (≥15% dalam 12 bulan) karena tetangganya sakit. Lakukan pencegahan (Trichoderma, bersihkan piringan) dan ukur ulang 30 hari lagi.' },
  { kunci: ['warna', 'arti warna', 'legenda'],
    jawab: 'Hijau = sehat · Kuning = infeksi awal · Oranye = sedang · Merah = berat · Abu-abu = belum diukur · Cincin oranye = sehat tapi berisiko tertular · ✕ = sudah dibongkar.' },
]

function daftarPohon(list: StatusPohon[], n = 8) {
  return list.slice(0, n).map((s, i) => {
    const alasan = s.kelas === 'awal' || s.kelas === 'sedang' || s.kelas === 'berat' ? s.rek.judul.toLowerCase()
      : s.level === 'tinggi' ? `risiko tertular ${Math.round(s.risiko * 100)}%`
      : s.sumber !== 'sensor' ? (s.sumber === 'visual' ? 'baru dicek visual, belum diukur alat' : 'belum pernah diukur')
      : (s.hariSejakCek ?? 0) > 60 ? `${s.hariSejakCek} hari belum diukur`
      : s.pInfeksi !== null && s.pInfeksi >= 0.3 ? 'hasil ragu-ragu' : `risiko ${Math.round(s.risiko * 100)}%`
    return `${i + 1}. **${s.pohon.kode}** — ${LABEL_KELAS[s.kelas]} · ${alasan}`
  }).join('\n')
}

export function jawab(pertanyaan: string, st: StatusPohon[], rs: Ringkasan): ChatMsg {
  const q = norm(pertanyaan)
  if (!q) return { dari: 'bot', teks: 'Silakan ketik pertanyaan Anda.', saran: SARAN_UMUM }

  // 1) Menyebut kode pohon, mis. "B1-05-04" atau "b1 05 04"
  const m = pertanyaan.toUpperCase().match(/\b([A-Z]\d{0,2})[-\s]?(\d{1,2})[-\s](\d{1,2})\b/)
  if (m) {
    const kode = `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`
    const s = st.find(x => x.pohon.kode === kode)
    if (!s) return { dari: 'bot', teks: `Pohon ${kode} tidak ditemukan di kebun ini. Periksa kembali nomor blok-baris-pokok.` }
    const p = s.pInfeksi === null ? 'belum ada data sensor' : `peluang infeksi ${Math.round(s.pInfeksi * 100)}%`
    return { dari: 'bot', pohon: [s.pohon.id],
      teks: `Pohon **${kode}**: ${LABEL_KELAS[s.kelas]} (${p}). Risiko tertular 12 bulan ${Math.round(s.risiko * 100)}%${s.tetanggaSakit ? `, ${s.tetanggaSakit} tetangga terdekat sakit` : ''}.\n\n**${s.rek.judul}** — ${s.rek.alasan}\n${s.rek.langkah.map((l, i) => `${i + 1}. ${l}`).join('\n')}`,
      saran: ['Pohon mana yang dicek hari ini?', 'Apa itu Trichoderma?'] }
  }

  // 2) Pertanyaan tentang data kebun
  if (has(q, ['cek hari ini', 'dicek', 'diperiksa', 'diukur hari', 'hari ini', 'jadwal', 'prioritas'])) {
    const list = cekHariIniList(st, 8)
    return { dari: 'bot', pohon: list.map(s => s.pohon.id),
      teks: `Ini ${list.length} pohon prioritas hari ini (sudah diurutkan sesuai jalur jalan, ±${list.length * 4} menit):\n${daftarPohon(list)}\n\nDipilih AI dari risiko tertular, keraguan hasil, dan lamanya tidak diukur.`,
      saran: ['Bagaimana cara mengukur?', 'Apa yang harus segera dikerjakan?'] }
  }
  if (has(q, ['segera', 'mendesak', 'tugas', 'kerjakan', 'harus dilakukan', 'apa yang harus'])) {
    const urg = st.filter(s => s.rek.urgensi === 'segera')
    const mg = st.filter(s => s.rek.urgensi === 'minggu_ini')
    if (!urg.length && !mg.length) return { dari: 'bot', teks: 'Tidak ada tugas mendesak. Lanjutkan pemantauan rutin sesuai daftar Cek hari ini.' }
    return { dari: 'bot', pohon: urg.map(s => s.pohon.id),
      teks: `Ada **${urg.length} pohon** yang harus ditangani segera dan **${mg.length}** untuk minggu ini.\n${urg.length ? 'Segera:\n' + daftarPohon(urg, 6) : ''}\n\nBuka menu **Tugas** untuk langkah lengkap tiap pohon.`,
      saran: ['Cara eradikasi yang benar?', 'Apa itu parit isolasi?'] }
  }
  if (has(q, ['rugi', 'kerugian', 'untung', 'rupiah', 'uang', 'nilai', 'duit', 'biaya', 'ekonomi'])) {
    return { dari: 'bot',
      teks: `Dengan asumsi saat ini, 1 pohon sehat bernilai ±**${rupiah(rs.nilaiPohon)}/tahun**.\n• Panen yang sedang hilang karena pohon sakit: **${rupiah(rs.nilaiHilangTahun)}/tahun**\n• Tambahan nilai terancam 12 bulan bila dibiarkan: **${rupiah(rs.nilaiTerancam12)}**\n\nMenangani ${rs.awal} pohon infeksi awal sekarang adalah cara termurah menekan angka ini. Ubah harga TBS di menu **Hitung Untung**.`,
      saran: ['Pohon mana yang dicek hari ini?', 'Apa yang harus segera dikerjakan?'] }
  }
  if (has(q, ['kondisi', 'ringkasan', 'berapa pohon', 'jumlah', 'status kebun', 'kebun saya', 'rekap', 'berapa yang sakit'])) {
    const inf = rs.awal + rs.sedang + rs.berat
    return { dari: 'bot',
      teks: `Kebun Anda: **${rs.total} pohon** dipantau.\n• Sehat: ${rs.sehat} · Belum diukur: ${rs.belum}\n• Terindikasi Ganoderma: **${inf}** (awal ${rs.awal}, sedang ${rs.sedang}, berat ${rs.berat})\n• Sehat tetapi berisiko tinggi tertular: **${rs.risikoTinggi}**\n\n${rs.awal > 0 ? `Kabar baiknya, ${rs.awal} pohon masih tahap awal — masih bisa ditekan bila ditangani minggu ini.` : 'Pertahankan pemantauan rutin.'}`,
      saran: ['Apa yang harus segera dikerjakan?', 'Berapa kerugiannya?'] }
  }
  if (has(q, ['halo', 'hai', 'assalam', 'pagi', 'siang', 'sore', 'malam', 'bantu', 'bisa apa', 'tolong'])) {
    return { dari: 'bot', teks: 'Halo! Saya **GanoBot**, asisten GanoSense. Saya bisa menjawab kondisi kebun Anda, pohon yang perlu dicek, status pohon tertentu (ketik kodenya, mis. B1-05-04), perhitungan untung-rugi, serta cara mengendalikan Ganoderma.', saran: SARAN_UMUM }
  }

  // 3) Basis pengetahuan
  let best: KB | null = null; let skor = 0
  for (const kb of PENGETAHUAN) {
    const s = kb.kunci.reduce((a, k) => a + (q.includes(k) ? k.length : 0), 0)
    if (s > skor) { skor = s; best = kb }
  }
  if (best) return { dari: 'bot', teks: best.jawab, saran: best.saran, jenis: 'kb' }
  if (has(q, ['awal'])) return { dari: 'bot', teks: PENGETAHUAN[2].jawab, jenis: 'kb' }

  return { dari: 'bot', teks: 'Maaf, saya belum paham pertanyaan itu. Coba salah satu pertanyaan di bawah, atau ketik kode pohon (mis. B1-05-04).', saran: SARAN_UMUM, jenis: 'fallback' }
}

/** Ringkasan data kebun yang dikirim ke model AI agar jawabannya berpijak pada data, bukan karangan. */
export function konteksAI(st: StatusPohon[], rs: Ringkasan) {
  return {
    ringkasan: { total: rs.total, sehat: rs.sehat, awal: rs.awal, sedang: rs.sedang, berat: rs.berat, belum_diukur: rs.belum,
      sehat_berisiko_tinggi: rs.risikoTinggi, nilai_pohon_per_tahun_rp: Math.round(rs.nilaiPohon),
      panen_hilang_per_tahun_rp: Math.round(rs.nilaiHilangTahun), nilai_terancam_12_bulan_rp: Math.round(rs.nilaiTerancam12) },
    cek_hari_ini: cekHariIniList(st, 8).map(s => ({ kode: s.pohon.kode, status: LABEL_KELAS[s.kelas], risiko_persen: Math.round(s.risiko * 100), saran: s.rek.judul })),
    tugas_segera: st.filter(s => s.rek.urgensi === 'segera').slice(0, 10).map(s => ({ kode: s.pohon.kode, status: LABEL_KELAS[s.kelas], saran: s.rek.judul })),
  }
}

/** Kirim pertanyaan ke /api/chat (model bahasa di server Vercel). null bila AI tidak aktif/gagal. */
export async function jawabLLM(pertanyaan: string, st: StatusPohon[], rs: Ringkasan, riwayat: ChatMsg[], rujukan?: string): Promise<string | null> {
  try {
    const r = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pertanyaan, konteks: konteksAI(st, rs), rujukan: rujukan ?? null,
        riwayat: riwayat.slice(-6).map(m => ({ role: m.dari === 'user' ? 'user' : 'assistant', content: m.teks.slice(0, 800) })) }) })
    if (!r.ok) return null
    const j = await r.json()
    return typeof j.jawaban === 'string' && j.jawaban.trim() ? j.jawaban : null
  } catch { return null }
}

/** Cek apakah server punya AI aktif (kunci API terisi). */
export async function cekAI(): Promise<boolean> {
  try { const r = await fetch('/api/health'); if (!r.ok) return false; const j = await r.json(); return j.ai === true } catch { return false }
}
