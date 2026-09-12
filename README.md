# Dashboard Monitoring Pemakaian Bahan Cat (Sikkens/Kansai)

Skeleton awal — menggantikan sistem Google Sheets (`data pemakaian v1`, `list %by
wogrup`, `MX`, `CR`, dst.) yang berat/lemot, dengan aplikasi web + database
ringan (Supabase/Postgres) yang update-nya real-time.

## Status
🚧 **Skeleton awal.** Struktur database & 3 halaman inti sudah ada, tapi
BELUM siap produksi — lihat "Yang masih perlu dikerjakan" di bawah.

## 3 Menu
1. **`/input`** — pilih/ketik No WO → tampil data kendaraan & riwayat item yang
   sudah diinput → form kosong di bawah untuk tambah item baru (gaya kasir,
   Enter langsung tersimpan & langsung tampil di dashboard/detail).
2. **`/dashboard`** — rekap %bahan/opl per No WO, bisa difilter per Grup
   (pengganti sheet `list %by wo/grup`).
3. **`/detail`** — cari No WO, tampil rincian semua item yang pernah diinput
   untuk WO tersebut (pengganti sheet `data pemakaian v1`).

## Arsitektur
- **Database**: Postgres via [Supabase](https://supabase.com) (free tier cukup
  untuk skala puluhan user). Skema lengkap ada di `supabase/schema.sql`.
- **Frontend**: Next.js, di-deploy ke Vercel (gratis, auto-deploy tiap push ke
  GitHub).
- **Realtime**: pakai fitur Supabase Realtime — begitu ada baris baru masuk ke
  tabel `pemakaian`, halaman Dashboard & Input yang sedang terbuka otomatis
  ter-update tanpa reload.

## Cara mulai (development)
1. Buat project baru di https://supabase.com (gratis).
2. Buka SQL Editor di Supabase, jalankan isi `supabase/schema.sql`.
3. Copy `.env.local.example` jadi `.env.local`, isi `NEXT_PUBLIC_SUPABASE_URL`
   dan `NEXT_PUBLIC_SUPABASE_ANON_KEY` dari Project Settings > API di Supabase.
4. `npm install`
5. `npm run dev` → buka `http://localhost:3000/input`

## Yang masih perlu dikerjakan (belum ada di skeleton ini)
- [ ] **Sinkronisasi CR otomatis**: fungsi untuk menarik data terbaru dari
  Google Sheet CR (via Google Sheets API) ke tabel `wo_master`, dijalankan
  terjadwal (misal tiap 15 menit) atau saat No WO baru dicari di menu Input.
- [ ] **Import data master** `master_item` dari sheet `DATA VALIDASI` & `PL`
  (harga tiap item per kategori) — perlu file CSV/export dari Anda.
- [ ] **Import histori** dari `mx kansai`, `mx sikkens`, dan `MX NON PAINT` ke
  tabel `pemakaian` (supaya data lama tidak hilang saat migrasi).
- [ ] **Autentikasi & role** — saat ini tabel `app_users` baru kerangka;
  perlu dipasangkan ke Supabase Auth (login pakai kode akses/PIN atau
  email+password) dan proteksi halaman per role (`admin` vs `input_view`).
- [ ] **Konfirmasi rumus bisnis** — lihat `docs/RUMUS-BISNIS.md`, ada
  beberapa persen (35%, 40%, 15%, 85%) yang perlu dipastikan ke Anda.
- [ ] **Export PDF** untuk data pemakaian — nunggu rule perhitungan output
  final.
- [ ] Styling/UI — skeleton ini masih tabel HTML polos, belum didesain.

## Struktur folder
```
dashboard-pemakaian-cat/
├── supabase/schema.sql       # skema database + view rekap
├── docs/RUMUS-BISNIS.md      # daftar rumus yang perlu dikonfirmasi
├── src/lib/supabaseClient.js
├── src/pages/input.js        # Menu 1: Input
├── src/pages/dashboard.js    # Menu 2: Dashboard (list %by wo/grup)
├── src/pages/detail.js       # Menu 3: Data Pemakaian (detail per WO)
├── package.json
└── README.md (file ini)
```
