-- =====================================================================
-- GanoSense — skema database Supabase
-- Cara pakai: Supabase Dashboard > SQL Editor > New query > tempel semua > Run
-- =====================================================================
create extension if not exists pgcrypto;

-- Kebun / kelompok tani (satu akun bisa punya beberapa kebun)
create table if not exists public.kebun (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null default auth.uid() references auth.users(id) on delete cascade,
  nama text not null,
  lokasi text default '',
  luas_ha numeric default 0,
  tbs_t_ha numeric default 15,        -- produktivitas TBS (ton/ha/tahun)
  harga_tbs numeric default 3800,     -- Rp/kg
  pohon_ha numeric default 143,
  created_at timestamptz default now()
);

-- Pohon (posisi x,y dalam meter di dalam blok; lat/lon opsional dari GPS)
create table if not exists public.pohon (
  id uuid primary key default gen_random_uuid(),
  kebun_id uuid not null references public.kebun(id) on delete cascade,
  kode text not null,                 -- mis. B1-03-12 (blok-baris-pokok); dicetak sebagai QR di label pohon
  blok text default 'B1',
  baris int, kolom int,
  x numeric not null, y numeric not null,
  lat double precision, lon double precision,
  generasi int default 2 check (generasi between 1 and 4),
  umur_th numeric default 10,
  visual_score int default 0 check (visual_score between 0 and 4),
  catatan text default '',
  created_at timestamptz default now(),
  unique (kebun_id, kode)
);

-- Pengukuran GanoProbe / manual. raw = JSON data mentah sensor (lihat src/lib/types.ts RawInput)
create table if not exists public.pengukuran (
  id uuid primary key default gen_random_uuid(),
  kebun_id uuid not null references public.kebun(id) on delete cascade,
  pohon_id uuid not null references public.pohon(id) on delete cascade,
  perangkat_id text,
  waktu timestamptz not null default now(),
  sumber text default 'manual' check (sumber in ('perangkat','manual','demo')),
  raw jsonb not null,
  kelas text,                         -- hasil AI saat diterima server (audit)
  proba jsonb,
  lat double precision, lon double precision,
  label_lapangan text                 -- diisi peneliti: hasil sensus/uji lab GSM (untuk latih ulang)
);
create index if not exists pengukuran_kebun_idx on public.pengukuran(kebun_id, waktu);

-- Catatan tindakan pengendalian
create table if not exists public.tindakan (
  id uuid primary key default gen_random_uuid(),
  kebun_id uuid not null references public.kebun(id) on delete cascade,
  pohon_id uuid not null references public.pohon(id) on delete cascade,
  waktu timestamptz not null default now(),
  jenis text not null check (jenis in ('trichoderma','pembumbunan','bedah_batang','parit_isolasi','eradikasi','lainnya')),
  catatan text default ''
);

-- Perangkat GanoProbe. kunci disimpan sebagai hash SHA-256 (kunci asli hanya tampil sekali)
create table if not exists public.perangkat (
  id text primary key,                -- mis. GP-0001 (sama dengan DEVICE_ID di firmware)
  kebun_id uuid not null references public.kebun(id) on delete cascade,
  nama text default 'GanoProbe',
  kunci_hash text not null,
  pohon_aktif_id uuid references public.pohon(id) on delete set null,
  sesi_sampai timestamptz,
  terakhir_online timestamptz
);

-- ============================ KEAMANAN (RLS) ============================
alter table public.kebun enable row level security;
alter table public.pohon enable row level security;
alter table public.pengukuran enable row level security;
alter table public.tindakan enable row level security;
alter table public.perangkat enable row level security;

create or replace function public.milik_saya(k uuid) returns boolean
language sql stable security definer set search_path = public as
$$ select exists(select 1 from public.kebun where id = k and owner = auth.uid()) $$;

drop policy if exists kebun_owner on public.kebun;
create policy kebun_owner on public.kebun for all using (owner = auth.uid()) with check (owner = auth.uid());

drop policy if exists pohon_owner on public.pohon;
create policy pohon_owner on public.pohon for all using (public.milik_saya(kebun_id)) with check (public.milik_saya(kebun_id));

drop policy if exists pengukuran_owner on public.pengukuran;
create policy pengukuran_owner on public.pengukuran for all using (public.milik_saya(kebun_id)) with check (public.milik_saya(kebun_id));

drop policy if exists tindakan_owner on public.tindakan;
create policy tindakan_owner on public.tindakan for all using (public.milik_saya(kebun_id)) with check (public.milik_saya(kebun_id));

drop policy if exists perangkat_owner on public.perangkat;
create policy perangkat_owner on public.perangkat for all using (public.milik_saya(kebun_id)) with check (public.milik_saya(kebun_id));

-- Catatan: perangkat IoT TIDAK memakai akun pengguna. Ia mengirim data ke /api/ingest (Vercel)
-- yang memverifikasi kunci perangkat lalu menulis ke database memakai service role key.

-- Tampilan untuk ekspor data latih (dipakai peneliti)
create or replace view public.data_latih with (security_invoker = true) as
select p.kode as tree_id, m.waktu, m.raw, m.label_lapangan as label
from public.pengukuran m join public.pohon p on p.id = m.pohon_id
where m.label_lapangan is not null;
