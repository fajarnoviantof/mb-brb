-- =====================================================================
-- RESET: jalankan ini SEBELUM menjalankan ulang schema.sql
-- (menghapus semua tabel/tipe/view lama supaya tidak bentrok)
-- AMAN dipakai sekarang karena belum ada data penting yang perlu disimpan.
-- Kalau nanti sudah ada data produksi asli, JANGAN pakai script ini lagi
-- tanpa backup dulu.
-- =====================================================================

drop view if exists v_detail_pemakaian;
drop view if exists v_rekap_by_wo;

drop table if exists pemakaian;
drop table if exists pengaturan_rumus;
drop table if exists master_item;
drop table if exists wo_master;
drop table if exists app_users;

drop type if exists kategori_item;
drop type if exists satuan_item;
drop type if exists user_role;
