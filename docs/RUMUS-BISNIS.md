# Rumus Bisnis — Perlu Dikonfirmasi

Rumus di bawah ini hasil pembacaan formula pada file Google Sheets asli.
Sebelum dipakai untuk laporan resmi ke atasan/manajemen, mohon dikonfirmasi
kebenarannya satu per satu. Semua angka pengali sudah saya taruh di tabel
`pengaturan_rumus` (bukan hardcode di kode), jadi kalau ada yang salah atau
berubah, tinggal update angka di database — tidak perlu ubah kode program.

## 1. opl-bahan (per No WO)
Formula asli (sheet MX, kolom O/AE/AO):
```
opl-bahan = (jasa_cr * 35%) - harga/wo
```
Dipakai di tabel `pengaturan_rumus` sebagai `opl_persen_dari_jasa = 0.35`.

**Pertanyaan:** apakah 35% ini berlaku sama untuk kategori Kansai, Cardea, DAN
Sikkens? Di sheet Sikkens kolom yang sama juga memakai pola `(jasa_cr*0.35)-harga_wo`
jadi saya asumsikan SAMA. Mohon dikoreksi jika beda per kategori.

## 2. %bahan/opl (rasio pengambilan)
```
%bahan/opl = harga/wo / (jasa_cr * 35%)
```
Kalau hasilnya "wo belum cr" artinya No WO itu belum ada jasa_cr di master CR
(nilai 0), jadi tidak bisa dihitung rasionya.

## 3. Batas wajar pemakaian
Ditemukan pola `maksimal 40%` dan `batas pengambilan 40%` di beberapa sheet
(area panel repair/surfacer/masking/spraying/poles/reassy).
Saya taruh sebagai `batas_pengambilan_max = 0.40`.

**Pertanyaan:** apakah 40% ini SAMA untuk semua area (panel repair, surfacer,
masking, spraying, poles, reassy), atau beda-beda per area? Di sheet
`data pemakaian v1` terlihat semua area memakai 40% yang sama, tapi mohon
dikonfirmasi.

## 4. Formula khusus sheet "list %by wogrup"
Ditemukan formula tambahan yang levelnya di luar per-WO, tampaknya untuk rekap
bulanan per Grup A/B:
```
V2 = ((S2*0.75)/10)*0.85
```
Saya BELUM memasukkan ini ke sistem karena konteksnya belum jelas (S2 = total
opl-bahan grup? angka 0.75, 10, 0.85 mewakili apa?).

**Pertanyaan:** boleh dijelaskan maksud formula ini dipakai untuk laporan apa?

## Master Item / Harga — ✅ SUDAH DIISI (197 item, data asli)
Diimpor dari sheet `DATA VALIDASI`, digabung jadi satu list lookup (sesuai
arahan user, tidak perlu dipisah ketat per brand):
- Kolom A (nama) + D (harga) → 34 item (Kansai & Sikkens non-basecoat campur)
- Kolom G (kode) + H (nama warna) + I (harga) → 127 item (kode warna CA0xx/Qxxx)
- Kolom K (kode) + M (nama) + N (harga) → 36 item (non-paint/consumables)

File seed: `supabase/seed_master_item.sql`. Semua satuan gram, kecuali item
dengan kata "dempul"/"putty" di namanya otomatis pcs. Tidak ada konversi
apapun — quantity yang diinput dipakai apa adanya untuk hitung harga.

## Sinkron CR — ✅ SUDAH BERJALAN (otomatis)
`src/pages/api/sync-cr.js` menarik data langsung dari sheet CR (format CSV
publik, tanpa perlu API key Google) setiap kali:
- User mencari No WO yang belum ada di arsip lokal (di halaman Input), ATAU
- Tombol "Sync CR Sekarang" ditekan di halaman Dashboard, ATAU
- Cron harian jam 01:00 UTC (lihat `vercel.json`) — catatan: Vercel plan
  gratis (Hobby) cuma izinkan cron 1x/hari, jadi untuk WO yang benar-benar
  baru sebaiknya dicari manual dulu di halaman Input (otomatis kena sync).

**Syarat:** sheet CR harus tetap di-share "Anyone with the link can view".
Kalau suatu saat mode share-nya diubah jadi private, sinkron ini akan gagal
dan perlu diganti pakai Google Service Account (lebih rumit, kabari saya
kalau perlu).

---
Setelah poin-poin di atas dikonfirmasi, saya akan update `schema.sql` (view
`v_rekap_by_wo`) dan dokumen ini supaya jadi acuan final.
