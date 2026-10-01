# GanoSense 🌴

**Sistem peringatan dini busuk pangkal batang (*Ganoderma boninense*) untuk sawit rakyat**
— gabungan **IoT** (GanoProbe), **AI spasial**, dan **Decision Support System (DSS)**.

> Satu alat genggam murah untuk satu kelompok tani → AI menilai tiap pohon dari "bau" pangkal batangnya → peta risiko memperkirakan pohon mana yang akan tertular berikutnya → aplikasi memberi daftar tugas yang jelas dan nilai Rupiah yang dipertaruhkan.

## Isi repositori
| Folder | Isi |
|---|---|
| `src/` | Aplikasi web (React + TypeScript, Vite). Jalan di HP petani. |
| `src/lib/model/` | Model AI (`forest.json`) + kode inferensi — dijalankan di browser & server |
| `src/lib/spatial.ts` | Model risiko penularan lewat kontak akar |
| `src/lib/dss.ts` | Aturan rekomendasi tindakan & perhitungan ekonomi |
| `api/` | Fungsi server Vercel: `/api/sesi`, `/api/ingest`, `/api/health` (perangkat IoT) dan `/api/chat` (otak AI GanoBot) |
| `supabase/schema.sql` | Skema database + keamanan (RLS) |
| `firmware/` | Kode ESP32 GanoProbe + daftar komponen & sambungan |
| `ml/` | Python: generator data, pelatihan & validasi model, simulasi sebaran, analisis ekonomi (`ekonomi.py`) |
| `src/lib/chatbot.ts` | GanoBot — asisten tanya-jawab: jawaban lokal dari data kebun + model bahasa Claude (opsional) |
| `src/pages/Landing.tsx` | Halaman depan untuk orang awam (masalah → cara kerja → mulai) |
| `hardware/3d/` | Model 3D GanoProbe (three.js) + file STL sungkup & rumah sensor untuk cetak 3D |
| `tests/` | Uji paritas model Python↔TypeScript & uji logika |
| `PANDUAN_PENGGUNA.md` | Panduan bahasa awam untuk petani |

## Coba cepat di komputer (mode demo, tanpa database)
```bash
npm install
npm run dev          # buka http://localhost:5173
npm test             # uji model & logika
```
Tanpa pengaturan apa pun aplikasi berjalan dalam **mode demo** (data contoh 168 pohon).

## Pasang online: GitHub → Supabase → Vercel (± 20 menit, semuanya gratis)

### 1. Unggah ke GitHub
1. Buat akun di github.com → **New repository** → nama `ganosense` → Create.
2. Di komputer, dalam folder ini:
   ```bash
   git init && git add . && git commit -m "GanoSense v1"
   git branch -M main
   git remote add origin https://github.com/USERNAME/ganosense.git
   git push -u origin main
   ```
   (Atau pakai tombol **uploading an existing file** di halaman repo lalu seret semua isi folder.)

### 2. Siapkan Supabase (database + login)
1. supabase.com → **New project** (region Singapore). Simpan kata sandi database.
2. Menu **SQL Editor** → New query → tempel seluruh isi `supabase/schema.sql` → **Run**.
3. Menu **Project Settings → API**, catat:
   - `Project URL`
   - `anon public` key
   - `service_role` key (**rahasia**, jangan dibagikan)
4. (Opsional) **Authentication → Providers → Email**: matikan "Confirm email" agar petani bisa langsung masuk.

### 3. Deploy ke Vercel
1. vercel.com → login dengan GitHub → **Add New → Project** → pilih repo `ganosense` → Import.
2. Framework otomatis terdeteksi **Vite**. Buka **Environment Variables**, isi:
   | Nama | Nilai |
   |---|---|
   | `VITE_SUPABASE_URL` | Project URL |
   | `VITE_SUPABASE_ANON_KEY` | anon public key |
   | `SUPABASE_URL` | Project URL |
   | `SUPABASE_SERVICE_ROLE_KEY` | service_role key |
   | `ANTHROPIC_API_KEY` | (opsional) kunci API dari console.anthropic.com → GanoBot menjawab pertanyaan bebas dengan AI |
   | `CHAT_MODEL` | (opsional) default `claude-haiku-4-5-20251001` |

   Variabel tanpa awalan `VITE_` hanya dibaca server, jadi kunci rahasia tidak pernah terkirim ke HP pengguna.
3. Klik **Deploy**. Selesai → alamat seperti `https://ganosense-xxx.vercel.app`.
4. Cek server: buka `https://.../api/health` → harus `"supabase_terhubung": true` (dan `"ai": true` bila `ANTHROPIC_API_KEY` diisi).
5. Buka web → **Masuk** → daftar akun → **Buat kebun contoh (data simulasi)** bila ingin langsung mencoba/presentasi dengan 168 pohon contoh.

> **Tips presentasi/juri:** bila ingin tautan yang bisa langsung dicoba siapa pun tanpa daftar, buat proyek Vercel kedua dari repo yang sama **tanpa** variabel `VITE_SUPABASE_*` → aplikasi otomatis berjalan dalam **mode demo**. `ANTHROPIC_API_KEY` tetap boleh diisi agar GanoBot memakai AI.

### 4. Hubungkan GanoProbe
1. Di web: daftar/masuk → buat kebun → **Lainnya → Tambah blok** → **Lainnya → Perangkat → Daftarkan perangkat**.
2. Salin `DEVICE_ID`, `DEVICE_KEY`, `API_BASE` yang muncul ke `firmware/ganoprobe/config.h`, lalu upload ke ESP32 (lihat `firmware/README.md`).

## GanoBot (chatbot AI)
Tombol **Tanya GanoBot** di kanan bawah (atau tombol *Tanya GanoBot* di halaman depan). GanoBot punya dua "otak":
1. **Lokal (selalu aktif, gratis)** — pertanyaan tentang data kebun dijawab presisi dari hasil AI & DSS: kondisi kebun, pohon yang dicek hari ini, status pohon tertentu (ketik kodenya, mis. `B1-05-04`), tugas, untung-rugi.
2. **Model bahasa Claude (opsional)** — bila `ANTHROPIC_API_KEY` diisi di Vercel, pertanyaan bebas ("kenapa daun tombak menumpuk?", "bedanya Trichoderma dan fungisida?") dijawab lewat `/api/chat` dengan konteks ringkasan data kebun. Lencana **AI aktif** muncul di kepala chat. Biaya mengikuti pemakaian API Anthropic (model Haiku: sangat murah per pertanyaan); tanpa kunci, GanoBot tetap berjalan dengan otak lokal.

## Arsitektur
```
 GanoProbe (ESP32 + 3 sensor gas + SHT31 + sensor tanah + GPS)
      │  HTTPS (WiFi/hotspot HP; offline → antre di kartu SD)
      ▼
 Vercel /api/ingest ──► AI Random Forest (sama persis dengan di HP) ──► Supabase (Postgres + RLS)
                                                                          │
 HP petani (web app) ◄────────────────────────────────────────────────────┘
   ├─ Lapisan 1: status tiap pohon (sehat / awal / sedang / berat)
   ├─ Lapisan 2: risiko tertular 12 bulan dari tetangga (kontak akar) + "Cek hari ini"
   └─ Lapisan 3: DSS → daftar tugas, pencatatan tindakan, nilai Rupiah
```

## Model AI & kejujuran data
- `ml/train.py` melatih Random Forest dan membandingkannya dengan regresi logistik, metode ambang 1 sensor (tanpa AI), dan sensus visual, memakai **GroupKFold per pohon** (mencegah kebocoran data).
- Model yang disertakan adalah **baseline dari data sintetis berbasis literatur** — BUKAN performa lapangan. Setelah data lapangan berlabel terkumpul (menu **Lainnya → Unduh CSV**, isi kolom `label`):
  ```bash
  cd ml && pip install -r requirements.txt
  python train.py --csv data/lapangan.csv   # otomatis menimpa src/lib/model/forest.json
  cd .. && npm test && git commit -am "model lapangan" && git push   # Vercel deploy ulang otomatis
  ```
- `ml/simulate_spread.py` mensimulasikan sebaran 5 tahun (dikalibrasi ke data lapangan Indonesia 3,7% → 42,2% dalam 8 tahun).

## Lisensi & HKI
Sesuai Panduan Teknis Lomba Riset BPDP 2026–2027, HKI yang timbul dari kegiatan riset menjadi milik BPDP.
