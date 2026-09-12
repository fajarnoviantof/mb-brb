import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function DetailPage() {
  const [noWo, setNoWo] = useState('');
  const [woInfo, setWoInfo] = useState(null);
  const [items, setItems] = useState([]);

  async function handleCari() {
    if (!noWo) return;

    const { data: wo } = await supabase.from('wo_master').select('*').eq('no_wo', noWo).maybeSingle();
    setWoInfo(wo);

    const { data: detail } = await supabase
      .from('v_detail_pemakaian')
      .select('*')
      .eq('no_wo', noWo);
    setItems(detail || []);
  }

  const totalPerKategori = items.reduce((acc, it) => {
    acc[it.kategori] = (acc[it.kategori] || 0) + Number(it.harga_pengambilan);
    return acc;
  }, {});

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: 24, fontFamily: 'sans-serif' }}>
      <h1>Data Pemakaian — Rincian per No WO</h1>

      <div style={{ marginBottom: 16 }}>
        <input
          value={noWo}
          onChange={(e) => setNoWo(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleCari()}
          placeholder="Masukkan No WO"
        />
        <button onClick={handleCari}>Cari</button>
      </div>

      {woInfo && (
        <div style={{ background: '#f5f5f5', padding: 12, marginBottom: 16 }}>
          <b>{woInfo.no_pol}</b> — {woInfo.tipe_kendaraan} ({woInfo.warna}) — Grup {woInfo.grup} — Jasa Rp{Number(woInfo.jasa_light_medium || 0).toLocaleString('id-ID')}
        </div>
      )}

      <h3>Ringkasan per kategori</h3>
      <ul>
        {Object.entries(totalPerKategori).map(([kat, total]) => (
          <li key={kat}>{kat}: Rp{total.toLocaleString('id-ID')}</li>
        ))}
      </ul>

      <h3>Rincian item</h3>
      <table width="100%" border="1" cellPadding="6" style={{ borderCollapse: 'collapse' }}>
        <thead>
          <tr><th>Kategori</th><th>Item</th><th>Qty</th><th>Harga Satuan</th><th>Total</th><th>Waktu</th><th>Oleh</th></tr>
        </thead>
        <tbody>
          {items.map((it, i) => (
            <tr key={i}>
              <td>{it.kategori}</td>
              <td>{it.nama_item}</td>
              <td>{it.quantity}</td>
              <td>{Number(it.harga_satuan_saat_input).toLocaleString('id-ID')}</td>
              <td>{Number(it.harga_pengambilan).toLocaleString('id-ID')}</td>
              <td>{new Date(it.input_at).toLocaleString('id-ID')}</td>
              <td>{it.diinput_oleh || '-'}</td>
            </tr>
          ))}
          {items.length === 0 && (
            <tr><td colSpan={7} style={{ textAlign: 'center', color: '#888' }}>Cari No WO untuk melihat rincian</td></tr>
          )}
        </tbody>
      </table>

      {/* TODO: tombol export PDF - menyusul setelah rule perhitungan output final dikonfirmasi */}
    </div>
  );
}
