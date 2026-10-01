import { Sheet, WARNA } from './ui'

/** Panduan singkat bahasa awam — bisa dibuka dari mana saja. */
export function Panduan({ onClose }: { onClose: () => void }) {
  const warna: [keyof typeof WARNA, string, string][] = [
    ['sehat', 'Sehat', 'Pantau tiap 3 bulan'],
    ['awal', 'Infeksi awal (daun masih tampak sehat)', 'Tangani minggu ini — masih bisa ditekan'],
    ['sedang', 'Infeksi sedang', 'Segera: pembumbunan, Trichoderma, siapkan parit isolasi'],
    ['berat', 'Infeksi berat', 'Segera: bongkar, cacah, sanitasi'],
    ['belum', 'Belum diukur', 'Ukur sesuai jadwal'],
  ]
  return (
    <Sheet onClose={onClose}>
      <h2 style={{ marginTop: 0 }}>Panduan singkat GanoSense</h2>
      <h3>Arti warna di peta</h3>
      <table className="t small"><tbody>
        {warna.map(([k, a, b]) => <tr key={k}><td><i className="dot" style={{ background: WARNA[k] }} />{a}</td><td>{b}</td></tr>)}
        <tr><td><i className="dot" style={{ border: '2px dashed var(--risk)', background: 'transparent' }} />Cincin oranye</td><td>Pohon sehat yang berisiko tinggi tertular</td></tr>
      </tbody></table>
      <h3>Langkah pertama (sekali saja)</h3>
      <ol className="steps small">
        <li>Daftar akun, lalu buat kebun (nama kelompok tani, desa, luas).</li>
        <li>Menu <b>Lainnya → Tambah blok</b>: isi jumlah baris & pokok. Peta pohon dibuat otomatis.</li>
        <li>Tulis nomor pohon di batang sesuai kode di aplikasi (mis. <b>B1-03-12</b> = blok B1, baris 3, pokok 12).</li>
        <li>Menu <b>Lainnya → Perangkat</b>: daftarkan GanoProbe.</li>
      </ol>
      <h3>Pekerjaan rutin (± 4 menit per pohon)</h3>
      <ol className="steps small">
        <li>Buka <b>Beranda → Cek hari ini</b>. Daftar sudah diurutkan sesuai jalur jalan.</li>
        <li>Bersihkan piringan dari pelepah/janjang busuk.</li>
        <li>Ketuk pohon → <b>Ukur / cek pohon ini</b> → <b>Mulai sesi</b>, lalu tekan tombol alat.</li>
        <li>Pegang alat di udara 60 detik, lalu tempelkan corong ke pangkal batang 2 menit.</li>
        <li>Buka <b>Tugas</b>, kerjakan sarannya, lalu <b>Catat tindakan</b>.</li>
      </ol>
      <h3>Aturan emas</h3>
      <ul className="small">
        <li>Jangan tinggalkan batang pohon mati utuh di kebun — itu "gudang" jamur bertahun-tahun.</li>
        <li>Tangani selagi <b>kuning (awal)</b>: biayanya paling murah, hasilnya paling besar.</li>
        <li>Dosis Trichoderma & ukuran parit ikuti anjuran penyuluh setempat.</li>
      </ul>
      <button className="btn primary block" onClick={onClose}>Mengerti</button>
    </Sheet>
  )
}
