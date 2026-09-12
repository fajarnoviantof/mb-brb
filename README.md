# Dashboard Monitoring Pemakaian Bahan Cat (Sikkens/Kansai)

Skeleton awal — menggantikan sistem Google Sheets (`data pemakaian v1`, `list %by
wogrup`, `MX`, `CR`, dst.) yang berat/lemot, dengan aplikasi web + database
ringan (Supabase/Postgres) yang update-nya real-time.

## Status
🚧 **Mulai dari 0 dulu, asal jalan.** Keputusan yang disepakati:
- Sistem dibangun mulai dari nol (bukan migrasi penuh data lama).
- **Migrasi histori** dari sheet `mx kansai`, `mx sikkens`, `MX NON PAINT`
  akan menyusul SETELAH sistem baru ini jalan & stabil — bukan syarat mulai.
- Sinkron otomatis dari sheet CR **belum dibuat**; sementara dipakai form
  input manual singkat di halaman Input kalau No WO belum ada di arsip
  (lihat `showManualWo` di `src/pages/input.js`), supaya tetap bisa langsung
  dipakai sambil sinkron CR dikerjakan menyusul.
- Satuan: **semua item dianggap gram**, kecuali dempul/putty pakai **pcs**
  (murni label tampilan, tidak ada konversi apapun di belakangnya).

## Cara Upload ke GitHub (saya belum bisa push otomatis dari sini)
Saya tidak punya akses langsung ke akun GitHub Anda, jadi silakan ikuti salah
satu cara ini:

**Cara A — paling gampang, lewat browser (tanpa install apa-apa):**
1. Login ke https://github.com, klik **New repository** → beri nama misal
   `dashboard-pemakaian-cat` → pilih Private atau Public → Create.
2. Di halaman repo kosong, klik **"uploading an existing file"**.
3. Extract file zip yang saya kirim, lalu drag semua isinya (folder
   `src`, `supabase`, `docs`, `package.json`, `README.md`, dst) ke halaman
   upload tsb.
4. Klik **Commit changes**. Selesai — repo Anda sudah terisi.

**Cara B — lewat terminal (kalau sudah biasa pakai git):**
```bash
cd dashboard-pemakaian-cat
git init
git add .
git commit -m "Skeleton awal dashboard pemakaian cat"
git branch -M main
git remote add origin https://github.com/USERNAME/dashboard-pemakaian-cat.git
git push -u origin main
```

Setelah repo ada di GitHub, langkah berikutnya (deploy ke Vercel supaya bisa
diakses lewat link) tinggal: buka https://vercel.com → Import dari GitHub →
pilih repo ini → isi Environment Variables (`NEXT_PUBLIC_SUPABASE_URL`,
`NEXT_PUBLIC_SUPABASE_ANON_KEY`) → Deploy. Kalau sudah sampai tahap ini dan
ada kendala, kabari saya, saya bantu troubleshoot langkah demi langkah.

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
  terjadwal atau saat No WO baru dicari di menu Input. **Sementara pakai
  form manual** di halaman Input.
- [ ] **Isi data master** `master_item` (nama item + harga per kategori) —
  untuk mulai dari 0, bisa diisi manual sedikit-sedikit lewat Supabase Table
  Editor dulu, tidak harus tunggu import besar.
- [ ] **Migrasi histori** dari `mx kansai`, `mx sikkens`, `MX NON PAINT` ke
  tabel `pemakaian` — **menyusul, bukan syarat mulai** (sesuai kesepakatan).
- [ ] **Autentikasi & role** — saat ini tabel `app_users` baru kerangka;
  perlu dipasangkan ke Supabase Auth (login pakai kode akses/PIN atau
  email+password) dan proteksi halaman per role (`admin` vs `input_view`).
- [ ] **Konfirmasi rumus bisnis sisa** — lihat `docs/RUMUS-BISNIS.md` poin
  1-4 (persen 35%/40%/15%/85%), poin 5 (satuan gram/pcs) sudah selesai.
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
