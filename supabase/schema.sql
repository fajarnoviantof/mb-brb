-- =====================================================================
-- SKEMA DATABASE: Dashboard Monitoring Pemakaian Bahan Cat (Sikkens/Kansai)
-- Target: Postgres (Supabase)
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. USER & AKSES
-- ---------------------------------------------------------------------
create type user_role as enum ('admin', 'input_view');

create table app_users (
  id            uuid primary key default gen_random_uuid(),
  nama          text not null,
  kode_akses    text not null unique,   -- contoh: 'alf', 'ani' (nanti disimpan hashed via Supabase Auth, ini kolom referensi tampilan)
  role          user_role not null default 'input_view',
  aktif         boolean not null default true,
  created_at    timestamptz not null default now()
);
-- Catatan migrasi auth:
-- Untuk keamanan sebaiknya kode_akses dipasangkan dengan Supabase Auth (email+password
-- atau magic code). Tabel ini hanya menyimpan profil & role, bukan kredensial mentah.

-- ---------------------------------------------------------------------
-- 2. MASTER DATA KENDARAAN / WO  (ex-sheet "CR")
--    CR di sumbernya reset tiap bulan -> di sini kita ARSIPKAN permanen.
--    Setiap No WO disalin ke tabel ini SEKALI saat pertama kali disentuh
--    (saat dicari/diinput), sehingga riwayat tetap ada meski tab CR asli berganti bulan.
-- ---------------------------------------------------------------------
create table wo_master (
  no_wo             text primary key,          -- No WO, contoh '2609001'
  no_pol            text,
  tipe_kendaraan    text,
  warna             text,
  asuransi          text,
  sa                text,                       -- Service Advisor
  kategori          text,                       -- LGT/MED/HVY
  grup              text,                       -- A / B / C / D
  jml_panel         numeric,
  jasa_light_medium numeric,
  jasa_part         numeric,
  jasa_heavy        numeric,
  invoice           numeric,
  proses_status     text,                       -- Out / Panel Repair / Surfacer / Poles / dst
  tgl_masuk_produksi date,
  jam_masuk         time,
  janji_penyerahan  date,
  est_selesai_produksi date,
  selesai_produksi  date,
  tgl_delivery      date,
  otd_status        text,
  periode_snapshot  text not null,              -- contoh '2026-09' -> bulan saat data ini diarsipkan
  synced_at         timestamptz not null default now(),
  raw_source        jsonb                        -- simpan mentah hasil tarik dari CR untuk audit/debug
);
create index idx_wo_master_periode on wo_master(periode_snapshot);

-- ---------------------------------------------------------------------
-- 3. MASTER HARGA / VALIDASI ITEM (ex-sheet "DATA VALIDASI" + "PL")
--    Satu tabel untuk semua kategori item, dibedakan lewat kolom `kategori`.
-- ---------------------------------------------------------------------
create type kategori_item as enum (
  'kansai', 'cardea', 'sikkens_basecoat', 'sikkens_non_basecoat', 'non_paint',
  'panel_repair', 'putty_sfr', 'masking', 'spraying', 'poles', 'reassy'
);

create type satuan_item as enum ('gram', 'pcs');

-- Catatan: master_item SENGAJA DIGABUNG jadi satu list lookup harga
-- (tidak dipisah ketat per brand Kansai/Cardea/Sikkens), sesuai arahan user:
-- "tidak harus dipisah, boleh digabung, yang penting bisa untuk lookup perhitungan."
-- Kolom `sumber_list` cuma catatan asal data (item_cat / item_warna / non_paint),
-- BUKAN filter wajib saat mencari harga.
create table master_item (
  id           uuid primary key default gen_random_uuid(),
  kode_item    text,                 -- kode cat/material (kalau ada, ex: K-380-041, CA010)
  nama_item    text not null unique, -- ex: 'CLEAR HS J', 'STABILIZER', 'KERTAS MASKING'
  satuan       satuan_item not null default 'gram',  -- 'gram' default; 'pcs' khusus dempul/putty
  harga_satuan numeric not null default 0,
  sumber_list  text,                 -- 'item_cat' | 'item_warna' | 'non_paint' -- info saja
  aktif        boolean not null default true,
  updated_at   timestamptz not null default now()
);
-- Catatan: satuan HANYA untuk tampilan (label di UI, ex: "35 gram" / "1 pcs").
-- Tidak ada konversi apapun di belakangnya -- quantity disimpan & dihitung apa adanya.

-- ---------------------------------------------------------------------
-- 4. TRANSAKSI PEMAKAIAN (ex-sheet "Rekap Mixing Kansai" & "Rekap Mixing Sikkens")
--    Ini tabel inti untuk MENU INPUT. Satu baris = satu kali input item
--    ("kasir style": No WO -> Item -> Qty -> Enter).
-- ---------------------------------------------------------------------
create table pemakaian (
  id            uuid primary key default gen_random_uuid(),
  no_wo         text not null references wo_master(no_wo),
  kategori      kategori_item not null,     -- kansai / cardea / sikkens_basecoat / sikkens_non_basecoat / non_paint
  nama_item     text not null,
  quantity      numeric not null check (quantity > 0),
  harga_satuan_saat_input numeric not null,  -- snapshot harga saat itu (supaya histori tidak berubah kalau harga master di-update nanti)
  harga_pengambilan numeric generated always as (quantity * harga_satuan_saat_input) stored,
  input_by      uuid references app_users(id),
  input_at      timestamptz not null default now(),
  catatan       text
);
create index idx_pemakaian_no_wo on pemakaian(no_wo);
create index idx_pemakaian_kategori on pemakaian(kategori);
create index idx_pemakaian_input_at on pemakaian(input_at);

-- ---------------------------------------------------------------------
-- 5. PENGATURAN RUMUS BISNIS (supaya persen bisa diubah tanpa ubah kode)
--    ex: opl 35%, batas pengambilan 40%, faktor grup 15%, 0.85, dst.
-- ---------------------------------------------------------------------
create table pengaturan_rumus (
  kunci         text primary key,     -- ex: 'opl_persen_dari_jasa', 'batas_pengambilan_max', 'faktor_grup_b'
  nilai         numeric not null,
  keterangan    text,
  updated_at    timestamptz not null default now(),
  updated_by    uuid references app_users(id)
);

insert into pengaturan_rumus (kunci, nilai, keterangan) values
  ('opl_persen_dari_jasa', 0.35, 'opl-bahan = (jasa_cr * persen_ini) - harga_wo  -- KONFIRMASI ke user'),
  ('batas_pengambilan_max', 0.40, 'Batas maksimal wajar rasio pengambilan bahan/opl (40%)'),
  ('faktor_grup_b_var1', 0.15, 'Dipakai di formula list %by wo/grup kolom W (grup A) -- KONFIRMASI ke user'),
  ('faktor_grup_b_var2', 0.85, 'Dipakai di formula list %by wo/grup (sum(R)*85%) -- KONFIRMASI ke user');

-- ---------------------------------------------------------------------
-- 6. VIEW REKAP "list %by wo/grup" (Menu Dashboard)
--    Menggantikan seluruh SUMPRODUCT/LET/QUERY di Google Sheets dengan
--    satu VIEW SQL yang dihitung oleh database (jauh lebih ringan & instan).
-- ---------------------------------------------------------------------
create or replace view v_rekap_by_wo as
select
  p.no_wo,
  w.grup,
  w.no_pol,
  w.tipe_kendaraan,
  sum(p.harga_pengambilan) as total_harga_pengambilan,
  coalesce(w.jasa_light_medium,0) + coalesce(w.jasa_part,0) + coalesce(w.jasa_heavy,0) as jasa_cr,
  (
    (coalesce(w.jasa_light_medium,0) + coalesce(w.jasa_part,0) + coalesce(w.jasa_heavy,0))
    * (select nilai from pengaturan_rumus where kunci = 'opl_persen_dari_jasa')
  ) - sum(p.harga_pengambilan) as opl_bahan,
  case
    when (coalesce(w.jasa_light_medium,0) + coalesce(w.jasa_part,0) + coalesce(w.jasa_heavy,0)) = 0
      then null
    else sum(p.harga_pengambilan) /
      ((coalesce(w.jasa_light_medium,0) + coalesce(w.jasa_part,0) + coalesce(w.jasa_heavy,0))
        * (select nilai from pengaturan_rumus where kunci = 'opl_persen_dari_jasa'))
  end as rasio_bahan_opl
from pemakaian p
join wo_master w on w.no_wo = p.no_wo
group by p.no_wo, w.grup, w.no_pol, w.tipe_kendaraan,
         w.jasa_light_medium, w.jasa_part, w.jasa_heavy;

-- Catatan: rumus di atas ADAPTASI AWAL dari pembacaan formula Google Sheets.
-- Perlu dikonfirmasi ulang dengan Anda sebelum dipakai untuk laporan resmi
-- (lihat docs/RUMUS-BISNIS.md).

-- ---------------------------------------------------------------------
-- 7. VIEW DETAIL PER-ITEM (Menu Data Pemakaian, ganti-ganti No WO)
-- ---------------------------------------------------------------------
create or replace view v_detail_pemakaian as
select
  p.no_wo,
  p.kategori,
  p.nama_item,
  p.quantity,
  p.harga_satuan_saat_input,
  p.harga_pengambilan,
  p.input_at,
  u.nama as diinput_oleh
from pemakaian p
left join app_users u on u.id = p.input_by
order by p.no_wo, p.input_at;
