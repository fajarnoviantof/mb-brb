import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

const KATEGORI_OPTIONS = [
  { value: 'kansai', label: 'Kansai' },
  { value: 'cardea', label: 'Cardea' },
  { value: 'sikkens_basecoat', label: 'Sikkens - Basecoat' },
  { value: 'sikkens_non_basecoat', label: 'Sikkens - Non Basecoat' },
  { value: 'non_paint', label: 'Non Paint' },
];

export default function InputPage() {
  const [noWo, setNoWo] = useState('');
  const [woInfo, setWoInfo] = useState(null);
  const [riwayat, setRiwayat] = useState([]);
  const [kategori, setKategori] = useState('kansai');
  const [namaItem, setNamaItem] = useState('');
  const [qty, setQty] = useState('');
  const [loading, setLoading] = useState(false);
  const [errMsg, setErrMsg] = useState('');

  // Ambil / arsipkan data WO dari master saat No WO diketik lalu di-blur/enter
  async function handleCariWo() {
    setErrMsg('');
    if (!noWo) return;

    // 1) cek apakah wo_master sudah ada (arsip lokal)
    let { data: existing } = await supabase
      .from('wo_master')
      .select('*')
      .eq('no_wo', noWo)
      .maybeSingle();

    if (!existing) {
      // TODO: di sini panggil fungsi/endpoint yang menarik data dari sheet CR
      // (lewat Google Sheets API) lalu insert ke wo_master sebagai arsip.
      // Untuk skeleton ini, tampilkan pesan supaya user tahu WO belum ada di arsip.
      setErrMsg(
        `No WO ${noWo} belum ada di arsip lokal. Perlu diisi manual dulu atau ` +
        `disinkronkan dari CR (lihat fungsi syncWoFromCR di lib/syncCr.js).`
      );
    }
    setWoInfo(existing);

    // 2) ambil riwayat item yang sudah diinput untuk WO ini
    const { data: hist } = await supabase
      .from('pemakaian')
      .select('*')
      .eq('no_wo', noWo)
      .order('input_at', { ascending: true });
    setRiwayat(hist || []);
  }

  // Realtime: begitu ada input baru untuk No WO yang sedang dibuka, list otomatis update
  useEffect(() => {
    if (!noWo) return;
    const channel = supabase
      .channel(`pemakaian-wo-${noWo}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'pemakaian', filter: `no_wo=eq.${noWo}` },
        (payload) => setRiwayat((prev) => [...prev, payload.new])
      )
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [noWo]);

  async function handleSubmitItem(e) {
    e.preventDefault();
    if (!noWo || !namaItem || !qty) return;
    setLoading(true);
    setErrMsg('');

    // Ambil harga master sesuai kategori + nama item
    const { data: master } = await supabase
      .from('master_item')
      .select('harga_satuan')
      .eq('kategori', kategori)
      .eq('nama_item', namaItem)
      .maybeSingle();

    const harga = master?.harga_satuan ?? 0;

    const { error } = await supabase.from('pemakaian').insert({
      no_wo: noWo,
      kategori,
      nama_item: namaItem,
      quantity: Number(qty),
      harga_satuan_saat_input: harga,
    });

    if (error) {
      setErrMsg('Gagal menyimpan: ' + error.message);
    } else {
      setNamaItem('');
      setQty('');
    }
    setLoading(false);
  }

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: 24, fontFamily: 'sans-serif' }}>
      <h1>Menu Input Pemakaian</h1>

      <div style={{ marginBottom: 16 }}>
        <label>No WO: </label>
        <input
          value={noWo}
          onChange={(e) => setNoWo(e.target.value)}
          onBlur={handleCariWo}
          onKeyDown={(e) => e.key === 'Enter' && handleCariWo()}
          placeholder="Ketik No WO lalu Enter"
        />
      </div>

      {woInfo && (
        <div style={{ background: '#f5f5f5', padding: 12, marginBottom: 16 }}>
          <b>{woInfo.no_pol}</b> — {woInfo.tipe_kendaraan} ({woInfo.warna}) — Grup {woInfo.grup}
        </div>
      )}

      {errMsg && <p style={{ color: 'crimson' }}>{errMsg}</p>}

      <h3>Riwayat item untuk WO ini</h3>
      <table width="100%" border="1" cellPadding="4" style={{ borderCollapse: 'collapse', marginBottom: 16 }}>
        <thead>
          <tr><th>Kategori</th><th>Item</th><th>Qty</th><th>Harga</th><th>Waktu Input</th></tr>
        </thead>
        <tbody>
          {riwayat.map((r) => (
            <tr key={r.id}>
              <td>{r.kategori}</td>
              <td>{r.nama_item}</td>
              <td>{r.quantity}</td>
              <td>{r.harga_pengambilan}</td>
              <td>{new Date(r.input_at).toLocaleString('id-ID')}</td>
            </tr>
          ))}
          {riwayat.length === 0 && (
            <tr><td colSpan={5} style={{ textAlign: 'center', color: '#888' }}>Belum ada item</td></tr>
          )}
        </tbody>
      </table>

      <h3>Tambah item baru (gaya kasir — Enter untuk simpan)</h3>
      <form onSubmit={handleSubmitItem} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <select value={kategori} onChange={(e) => setKategori(e.target.value)}>
          {KATEGORI_OPTIONS.map((k) => (
            <option key={k.value} value={k.value}>{k.label}</option>
          ))}
        </select>
        <input
          placeholder="Nama item"
          value={namaItem}
          onChange={(e) => setNamaItem(e.target.value)}
        />
        <input
          placeholder="Qty"
          type="number"
          value={qty}
          onChange={(e) => setQty(e.target.value)}
        />
        <button type="submit" disabled={loading || !noWo}>Simpan</button>
      </form>
    </div>
  );
}
