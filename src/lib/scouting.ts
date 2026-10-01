import type { StatusPohon } from './analysis'

/** Urutan jalan "zig-zag" per baris agar petani tidak bolak-balik. */
export function urutanJalan(list: StatusPohon[]) {
  return list.slice().sort((a, b) => a.pohon.blok.localeCompare(b.pohon.blok) || a.pohon.baris - b.pohon.baris ||
    (a.pohon.baris % 2 ? a.pohon.kolom - b.pohon.kolom : b.pohon.kolom - a.pohon.kolom))
}

/** Smart Scouting: n pohon prioritas tertinggi, lalu diurutkan sesuai jalur jalan. */
export function cekHariIniList(status: StatusPohon[], n = 12) {
  return urutanJalan(status.filter(s => s.prioritas > 0).sort((a, b) => b.prioritas - a.prioritas).slice(0, n))
}
