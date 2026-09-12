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
  const [showManualWo, setShowManualWo] = useState(false);
  const [manualWo, setManualWo] = useState({ no_pol: '', tipe_kendaraan: '', warna: '', grup: '' });
  const [masterItems, setMasterItems] = useState([]);
  const [hargaPreview, setHargaPreview] = useState(null);

  // Ambil seluruh daftar item+harga sekali saat halaman dibuka (untuk datalist pencarian)
  useEffect(() => {
    supabase
      .from('master_item')
      .select('nama_item, kode_item, satuan, harga_satuan')
      .eq('aktif', true)
      .order('nama_item')
      .then(({ data }) => setMasterItems(data || []));
  }, []);

  function handleNamaItemChange(val) {
    setNamaItem(val);
    const found = masterItems.find((m) => m.nama_item.toLowerCase() === val.toLowerCase());
    setHargaPreview(found || null);
  }

  // Ambil / arsipkan data WO dari master saat No WO diketik lalu di-blur/enter
  async function handleCariWo() {
    setErrMsg('');
    setShowManualWo(false);
    if (!noWo) return;

    // 1) cek apakah wo_master sudah ada (arsip lokal)
    let { data: existing } = await supabase
      .from('wo_master')
      .select('*')
      .eq('no_wo', noWo)
      .maybeSingle();

    if (!existing) {
      // 2) belum ada di arsip -> coba tarik langsung dari sheet CR (live)
      setErrMsg(`Mencari No WO ${noWo} di CR...`);
      try {
        const resp = await fetch(`/api/sync-cr?no_wo=${encodeURIComponent(noWo)}`);
        const json = await resp.json();
        if (resp.ok && json.rows && json.rows.length > 0) {
          existing = json.rows[0];
          setErrMsg('');
        } else {
          setErrMsg(json.message || json.error || `No WO ${noWo} belum ada di CR. Isi data kendaraan singkat di bawah.`);
          setShowManualWo(true);
        }
      } catch (e) {
        setErrMsg(`Gagal menghubungi CR (${e.message}). Isi data kendaraan singkat di bawah.`);
        setShowManualWo(true);
      }
    }
    setWoInfo(existing);

    // 3) ambil riwayat item yang sudah diinput untuk WO ini
    const { data: hist } = await supabase
      .from('pemakaian')
      .select('*')
      .eq('no_wo', noWo)
      .order('input_at', { ascending: true });
    setRiwayat(hist || []);
  }

  async function handleSimpanWoManual() {
    const periode = new Date().toISOString().slice(0, 7); // 'YYYY-MM'
    const { data, error } = await supabase
      .from('wo_master')
      .insert({ no_wo: noWo, ...manualWo, periode_snapshot: periode })
      .select()
      .maybeSingle();
    if (!error) {
      setWoInfo(data);
      setShowManualWo(false);
      setErrMsg('');
    } else {
      setErrMsg('Gagal simpan data WO: ' + error.message);
    }
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

    // Ambil harga dari master_item (list gabungan, tidak difilter per kategori/brand)
    const { data: master } = await supabase
      .from('master_item')
      .select('harga_satuan')
      .ilike('nama_item', namaItem)
      .maybeSingle();

    const harga = master?.harga_satuan ?? hargaPreview?.harga_satuan ?? 0;

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
      setHargaPreview(null);
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

      {showManualWo && (
        <div style={{ border: '1px dashed #999', padding: 12, marginBottom: 16 }}>
          <b>Isi data kendaraan (sementara manual, sebelum sinkron CR otomatis dibuat):</b>
          <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
            <input placeholder="No Pol" value={manualWo.no_pol}
              onChange={(e) => setManualWo({ ...manualWo, no_pol: e.target.value })} />
            <input placeholder="Tipe Kendaraan" value={manualWo.tipe_kendaraan}
              onChange={(e) => setManualWo({ ...manualWo, tipe_kendaraan: e.target.value })} />
            <input placeholder="Warna" value={manualWo.warna}
              onChange={(e) => setManualWo({ ...manualWo, warna: e.target.value })} />
            <select value={manualWo.grup} onChange={(e) => setManualWo({ ...manualWo, grup: e.target.value })}>
              <option value="">Grup</option>
              <option value="A">A</option>
              <option value="B">B</option>
            </select>
            <button onClick={handleSimpanWoManual}>Simpan & Lanjut</button>
          </div>
        </div>
      )}

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
          placeholder="Cari nama item... (contoh: CLEAR HS Q, CA010, AMPLAS P320)"
          value={namaItem}
          onChange={(e) => handleNamaItemChange(e.target.value)}
          list="daftar-item"
          style={{ minWidth: 260 }}
        />
        <datalist id="daftar-item">
          {masterItems.map((m) => (
            <option key={m.nama_item} value={m.nama_item} />
          ))}
        </datalist>
        {hargaPreview && (
          <span style={{ fontSize: 13, color: '#0a7d2c' }}>
            Rp{Number(hargaPreview.harga_satuan).toLocaleString('id-ID')}/{hargaPreview.satuan}
          </span>
        )}
        <input
          placeholder="Qty"
          type="number"
          value={qty}
          onChange={(e) => setQty(e.target.value)}
        />
        <button type="submit" disabled={loading || !noWo}>Simpan</button>
      </form>
      <p style={{ fontSize: 12, color: '#888' }}>
        Total item tersedia di database: {masterItems.length}
      </p>
    </div>
  );
}
