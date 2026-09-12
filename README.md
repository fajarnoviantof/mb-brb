# Dashboard Monitoring Pemakaian Bahan Cat (Sikkens/Kansai)

Skeleton awal — menggantikan sistem Google Sheets (`data pemakaian v1`, `list %by
wogrup`, `MX`, `CR`, dst.) yang berat/lemot, dengan aplikasi web + database
ringan (Supabase/Postgres) yang update-nya real-time.

## Status
✅ **Sudah bisa dipakai kerja** — 3 menu jalan, terhubung CR (otomatis), dan
harga terhubung ke 197 item asli dari `DATA VALIDASI`. Yang masih perlu
dikonfirmasi hanya soal PERSEN rumus bisnis (lihat `docs/RUMUS-BISNIS.md`
poin 1-4) sebelum dipakai untuk laporan resmi ke atasan.

- **Sinkron CR**: otomatis saat cari No WO baru di menu Input, atau klik
  "Sync CR Sekarang" di menu Dashboard, atau cron harian.
- **Harga item**: 197 item (lihat `supabase/seed_master_item.sql`) — tinggal
  cari nama/kode item di kolom "Item" pada menu Input, harga muncul otomatis.
- **Perhitungan**: %bahan/opl di menu Dashboard sudah jalan otomatis (view
  SQL `v_rekap_by_wo`), tapi masih pakai rumus 35%/40% hasil pembacaan sheet
  lama — **belum dikonfirmasi final**.

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
3. Jalankan juga isi `supabase/seed_master_item.sql` di SQL Editor yang sama
   (mengisi 197 item + harga asli).
4. Buka Project Settings > API Keys di Supabase, catat: Project URL, anon/
   publishable key, DAN **service_role key** (yang terakhir ini rahasia,
   jangan pernah taruh di kode/browser).
5. Copy `.env.local.example` jadi `.env.local`, isi semua variabelnya.
6. `npm install`
7. `npm run dev` → buka `http://localhost:3000`

**Untuk deploy ke Vercel:** di Vercel Project Settings > Environment
Variables, isi juga `SUPABASE_SERVICE_ROLE_KEY` (selain 2 variabel
`NEXT_PUBLIC_...` yang sudah diisi sebelumnya) — ini dipakai oleh
`/api/sync-cr` untuk menulis ke database.

## Yang masih perlu dikerjakan
- [ ] **Konfirmasi rumus bisnis sisa** — lihat `docs/RUMUS-BISNIS.md` poin
  1-4 (persen 35%/40%/15%/85%). Item master & sinkron CR sudah selesai.
- [ ] **Migrasi histori** dari `mx kansai`, `mx sikkens`, `MX NON PAINT` —
  menyusul, bukan syarat mulai (sesuai kesepakatan).
- [ ] **Autentikasi & role** — tabel `app_users` baru kerangka; perlu
  dipasangkan ke Supabase Auth dan proteksi halaman per role
  (`admin` vs `input_view`), termasuk kode akses per orang (alf, ani, dst).
- [ ] **Export PDF** untuk data pemakaian — nunggu rule perhitungan output
  final.
- [ ] Styling/UI — masih tabel HTML polos, belum didesain.
- [ ] Kalau suatu saat sheet CR di-private-kan (bukan lagi "anyone with
  link"), sinkron CR perlu diganti pakai Google Service Account.

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
