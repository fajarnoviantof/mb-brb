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

## 5. Gram material (primer/surfacer/cat/clear/thinner)
Di sheet `data pemakaian v1` ada perhitungan "gram primer", "gram surfacer",
dst — sepertinya konversi dari satuan pembelian (kg/liter) ke gram terpakai
per WO, tapi formula konversinya memakai XLOOKUP ke tabel referensi yang
belum saya temukan sumber angkanya secara eksplisit.

**Pertanyaan:** apakah konversi ke gram ini masih dipakai/dibutuhkan di
dashboard baru, atau cukup sampai satuan "Quantity" yang diinput apa adanya
(sesuai satuan asli tiap item)?

---
Setelah poin-poin di atas dikonfirmasi, saya akan update `schema.sql` (view
`v_rekap_by_wo`) dan dokumen ini supaya jadi acuan final.
