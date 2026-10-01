export type Kelas = 'sehat' | 'awal' | 'sedang' | 'berat'
export const KELAS: Kelas[] = ['sehat', 'awal', 'sedang', 'berat']

/** Data mentah dari GanoProbe (atau diisi manual). Resistansi dalam kΩ. */
export interface RawInput {
  r0_mq138: number; rs_mq138: number
  r0_mq135: number; rs_mq135: number
  r0_tgs2602: number; rs_tgs2602: number
  slope_mq138: number; slope_tgs2602: number
  temp_c: number; rh_pct: number; rh_ambient: number
  soil_moist: number; soil_temp: number
  visual_score: number; generasi: number; umur_th: number
}

export interface Kebun {
  id: string; nama: string; lokasi: string; luas_ha: number
  tbs_t_ha?: number; harga_tbs?: number; pohon_ha?: number
}

export interface Pohon {
  id: string; kode: string; blok: string; baris: number; kolom: number
  x: number; y: number; generasi: number; umur_th: number
  visual_score: number; catatan?: string
}

export interface Pengukuran {
  id?: string; tree_id: string; waktu: string; raw: RawInput
  sumber?: 'perangkat' | 'manual' | 'demo'
}

export type JenisTindakan = 'trichoderma' | 'pembumbunan' | 'bedah_batang' | 'parit_isolasi' | 'eradikasi' | 'lainnya'
export interface Tindakan { id?: string; tree_id: string; waktu: string; jenis: JenisTindakan; catatan?: string }

export interface Perangkat { id: string; nama: string; pohon_aktif_id?: string | null; terakhir_online?: string | null }

export interface DataKebun {
  kebun: Kebun; pohon: Pohon[]; pengukuran: Pengukuran[]; tindakan: Tindakan[]; perangkat: Perangkat[]
}

export interface Prediksi { proba: number[]; kelas: Kelas; pInfeksi: number; yakin: number }
