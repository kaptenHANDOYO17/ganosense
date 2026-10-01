/**
 * Lapisan 3 — Decision Support System (DSS).
 * Menerjemahkan status AI + risiko spasial menjadi TINDAKAN yang jelas & bernilai Rupiah.
 * Tindakan mengikuti prinsip Pengendalian Hama Terpadu (PHT) Ganoderma:
 * deteksi dini, sanitasi sumber inokulum, agens hayati (Trichoderma), pembumbunan,
 * dan isolasi kontak akar. Dosis/ukuran teknis mengikuti anjuran penyuluh/PPKS setempat.
 */
import type { Kelas } from './types'

export type Urgensi = 'segera' | 'minggu_ini' | 'bulan_ini' | 'pantau'

export interface Rekomendasi {
  urgensi: Urgensi; judul: string; alasan: string; langkah: string[]; ukurUlangHari: number
}

export const LABEL_KELAS: Record<Kelas | 'belum', string> = {
  sehat: 'Sehat', awal: 'Infeksi awal', sedang: 'Infeksi sedang', berat: 'Infeksi berat', belum: 'Belum diukur',
}

export function rekomendasi(opts: {
  kelas: Kelas | 'belum'; pInfeksi: number | null; risiko: number; sumber: 'sensor' | 'visual' | 'belum'
  hariSejakCek: number | null; sudahEradikasi: boolean
}): Rekomendasi {
  const { kelas, pInfeksi, risiko, sumber, hariSejakCek, sudahEradikasi } = opts
  if (sudahEradikasi) return {
    urgensi: 'pantau', judul: 'Sudah dieradikasi', ukurUlangHari: 90,
    alasan: 'Pohon sudah dibongkar. Yang penting sekarang: sisa akar/batang tidak ditinggal di lahan.',
    langkah: ['Pastikan potongan batang & bonggol dicacah/dikeluarkan, tidak ditumpuk di piringan.',
      'Beri Trichoderma di lubang bekas bongkaran sebelum sisip/tanam ulang.',
      'Ukur pohon-pohon tetangga (lihat tanda cincin oranye di peta).'],
  }
  if (kelas === 'berat') return {
    urgensi: 'segera', judul: 'Eradikasi & sanitasi', ukurUlangHari: 30,
    alasan: 'Pohon ini sudah menjadi sumber penular utama bagi tetangganya lewat kontak akar.',
    langkah: ['Tumbang dan bongkar bonggol beserta akarnya.',
      'Cacah batang & bonggol; JANGAN ditinggal utuh di lahan (menjadi sarang jamur bertahun-tahun).',
      'Buat parit isolasi di sekeliling titik serangan untuk memutus kontak akar ke pohon sehat.',
      'Taburkan Trichoderma pada lubang bekas bongkaran.',
      'Ukur ulang semua tetangga cincin-1 dalam 2 minggu.'],
  }
  if (kelas === 'sedang') return {
    urgensi: 'segera', judul: 'Selamatkan & isolasi', ukurUlangHari: 30,
    alasan: 'Infeksi sudah berjalan tetapi pohon masih bisa dipertahankan beberapa tahun bila ditangani.',
    langkah: ['Bersihkan jaringan busuk di pangkal batang (bedah batang) bila memungkinkan.',
      'Lakukan pembumbunan (timbun tanah di pangkal batang).',
      'Aplikasikan Trichoderma di piringan pohon.',
      'Siapkan parit isolasi bila ≥2 pohon berdekatan terserang.',
      'Ukur ulang 30 hari lagi untuk melihat apakah tren membaik.'],
  }
  if (kelas === 'awal') return {
    urgensi: 'minggu_ini', judul: 'Tangani sejak dini', ukurUlangHari: 30,
    alasan: 'Sensor mencium senyawa khas Ganoderma padahal daun masih tampak sehat — ini jendela emas pengendalian.',
    langkah: ['Aplikasikan Trichoderma di piringan & pangkal batang.',
      'Lakukan pembumbunan pangkal batang.',
      'Bersihkan piringan dari tumpukan pelepah/janjang busuk (agar sensor tidak tertipu & inokulum berkurang).',
      'Tandai pohon (cat kuning) dan ukur ulang 30 hari lagi.',
      'Opsional: konfirmasi lab (isolasi media selektif Ganoderma).'],
  }
  if (kelas === 'belum') {
    if (risiko >= 0.15) return {
      urgensi: 'minggu_ini', judul: 'Ukur segera (tetangga pohon sakit)', ukurUlangHari: 7,
      alasan: `Belum pernah diukur, tetapi risiko tertular 12 bulan ${Math.round(risiko * 100)}% karena dekat pohon sakit.`,
      langkah: ['Ukur dengan GanoProbe atau isi cek visual.'],
    }
    return {
      urgensi: 'bulan_ini', judul: 'Belum diukur', ukurUlangHari: 30,
      alasan: 'Belum ada data. Ukur sesuai jadwal prioritas.', langkah: ['Ukur saat melewati blok ini.'],
    }
  }
  // sehat
  if (pInfeksi !== null && pInfeksi >= 0.35 && sumber === 'sensor') return {
    urgensi: 'minggu_ini', judul: 'Hasil ragu-ragu — ukur ulang', ukurUlangHari: 7,
    alasan: `Model condong sehat, tetapi peluang infeksi ${Math.round(pInfeksi * 100)}% masih cukup tinggi.`,
    langkah: ['Bersihkan piringan dari bahan organik busuk lalu ukur ulang (pagi hari, tidak sehabis hujan).'],
  }
  if (risiko >= 0.15) return {
    urgensi: 'bulan_ini', judul: 'Sehat, tetapi berisiko tinggi', ukurUlangHari: 30,
    alasan: `Tetangganya sakit. Peluang tertular 12 bulan ≈ ${Math.round(risiko * 100)}%.`,
    langkah: ['Pencegahan: aplikasikan Trichoderma di piringan.',
      'Jangan menumpuk batang/pelepah pohon sakit di dekat pohon ini.', 'Ukur ulang 30 hari lagi.'],
  }
  const stale = hariSejakCek !== null && hariSejakCek > 90
  return {
    urgensi: stale ? 'bulan_ini' : 'pantau', judul: stale ? 'Waktunya cek rutin' : 'Sehat', ukurUlangHari: 90,
    alasan: stale ? 'Sudah lebih dari 3 bulan tidak diukur.' : 'Tidak ada tanda Ganoderma. Pantau rutin.',
    langkah: ['Pantau rutin setiap 3 bulan.'],
  }
}

// ---------------- Ekonomi ----------------
export interface AsumsiEkonomi { tbs_t_ha: number; pohon_ha: number; harga_tbs: number }
export const ASUMSI_DEFAULT: AsumsiEkonomi = { tbs_t_ha: 15, pohon_ha: 143, harga_tbs: 3800 }

/** Porsi produksi yang hilang per stadium (literatur: stadium lanjut 50–80%). */
export const KEHILANGAN: Record<Kelas, number> = { sehat: 0, awal: 0.1, sedang: 0.5, berat: 0.8 }

export function nilaiPohonPerTahun(a: AsumsiEkonomi): number {
  return (a.tbs_t_ha * 1000 / a.pohon_ha) * a.harga_tbs
}

export function rupiah(n: number): string {
  return 'Rp' + Math.round(n).toLocaleString('id-ID')
}
