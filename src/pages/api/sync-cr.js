import { supabaseAdmin } from '../../lib/supabaseAdmin';

// ID spreadsheet CR (sumber: link yang diberikan user). Sheet ini harus tetap
// di-share "Anyone with the link can view" supaya endpoint CSV publik ini bisa
// diakses tanpa perlu bikin Google Cloud service account / API key.
const CR_SHEET_ID = process.env.CR_SHEET_ID || '1BW45XdnYCxrfHgp0QJvj_wrkloDYOAS2BoIvGNDYJlw';
const CR_SHEET_TAB = process.env.CR_SHEET_TAB || 'CR';

function normalize(s) {
  return String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
}

// Setiap field wo_master dicocokkan ke header asli CR lewat beberapa kemungkinan
// nama kolom (supaya tahan kalau ada sedikit perbedaan penulisan header).
const FIELD_ALIASES = {
  no_wo: ['NOWO', 'NO.WO', 'NOWORKORDER'],
  no_pol: ['NOPOL', 'NOPOLISI'],
  tipe_kendaraan: ['TYPE', 'TIPE', 'TIPEKENDARAAN'],
  warna: ['WARNA'],
  asuransi: ['ASURANSI'],
  sa: ['SA'],
  kategori: ['KATEGORI'],
  grup: ['GROUP', 'GRUP', 'CHECKGROUP'],
  jml_panel: ['JMLPNL', 'JMLPANEL'],
  jasa_light_medium: ['JASALIGHTMEDIUM', 'JASALIGHTMED'],
  jasa_part: ['JASAPART'],
  jasa_heavy: ['JASAHEAVY'],
  invoice: ['INVOICE'],
  proses_status: ['PROSESSOUT', 'PROSESOUT', 'PROSES'],
  tgl_masuk_produksi: ['TANGGALMASUKPRODUKSI', 'TGLMASUKPRODUKSI'],
  jam_masuk: ['JAMMASUK'],
  janji_penyerahan: ['JANJIPENYERAHANWO', 'JANJIPENYERAHAN'],
  est_selesai_produksi: ['ESTSELESAIPRODUKSI'],
  selesai_produksi: ['SELESAIPRODUKSI'],
  tgl_delivery: ['TGLDELIVERYTOCUSTOMER', 'TGLDELIVERY'],
  otd_status: ['OTD'],
};

function parseCsv(text) {
  // Parser CSV sederhana yang tetap menangani koma di dalam tanda kutip.
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; } else { inQuotes = false; }
      } else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
    else if (c !== '\r') field += c;
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows;
}

export default async function handler(req, res) {
  try {
    const targetNoWo = req.query.no_wo ? String(req.query.no_wo).trim() : null;

    const url = `https://docs.google.com/spreadsheets/d/${CR_SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(CR_SHEET_TAB)}`;
    const resp = await fetch(url);
    if (!resp.ok) {
      return res.status(502).json({
        error: `Gagal mengambil CSV dari Google Sheets (status ${resp.status}). ` +
          `Pastikan sheet CR masih di-share "Anyone with the link can view".`,
      });
    }
    const csvText = await resp.text();
    const rows = parseCsv(csvText);
    if (rows.length < 2) {
      return res.status(200).json({ synced: 0, message: 'Tidak ada baris data di sheet CR.' });
    }

    const header = rows[0].map(normalize);
    const colIndex = {};
    for (const [field, aliases] of Object.entries(FIELD_ALIASES)) {
      for (const alias of aliases) {
        const idx = header.indexOf(alias);
        if (idx !== -1) { colIndex[field] = idx; break; }
      }
    }
    if (colIndex.no_wo === undefined) {
      return res.status(500).json({ error: 'Kolom NO.WO tidak ditemukan di header sheet CR. Cek nama header di sheet aslinya.' });
    }

    const periode = new Date().toISOString().slice(0, 7);
    const toUpsert = [];

    for (let r = 1; r < rows.length; r++) {
      const raw = rows[r];
      const noWoVal = (raw[colIndex.no_wo] || '').trim();
      if (!noWoVal) continue;
      if (targetNoWo && noWoVal !== targetNoWo) continue;

      const record = { no_wo: noWoVal, periode_snapshot: periode, raw_source: raw };
      for (const field of Object.keys(FIELD_ALIASES)) {
        if (field === 'no_wo') continue;
        const idx = colIndex[field];
        if (idx !== undefined && raw[idx] !== undefined && raw[idx] !== '') {
          record[field] = raw[idx];
        }
      }
      toUpsert.push(record);
      if (targetNoWo) break; // sudah ketemu yang dicari, tidak perlu lanjut scan semua baris
    }

    if (toUpsert.length === 0) {
      return res.status(404).json({
        synced: 0,
        message: targetNoWo ? `No WO ${targetNoWo} tidak ditemukan di sheet CR.` : 'Tidak ada baris cocok.',
      });
    }

    const { data, error } = await supabaseAdmin
      .from('wo_master')
      .upsert(toUpsert, { onConflict: 'no_wo' })
      .select();

    if (error) return res.status(500).json({ error: error.message });

    return res.status(200).json({ synced: data.length, rows: data });
  } catch (err) {
    return res.status(500).json({ error: String(err.message || err) });
  }
}
