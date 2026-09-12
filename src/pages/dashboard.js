import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function DashboardPage() {
  const [rows, setRows] = useState([]);
  const [filterGrup, setFilterGrup] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState('');

  async function handleSyncAll() {
    setSyncing(true);
    setSyncMsg('');
    try {
      const resp = await fetch('/api/sync-cr');
      const json = await resp.json();
      setSyncMsg(resp.ok ? `Berhasil sinkron ${json.synced} WO dari CR.` : (json.error || 'Gagal sinkron.'));
    } catch (e) {
      setSyncMsg('Gagal sinkron: ' + e.message);
    }
    setSyncing(false);
  }

  async function loadData() {
    let query = supabase.from('v_rekap_by_wo').select('*').order('no_wo', { ascending: false });
    if (filterGrup) query = query.eq('grup', filterGrup);
    const { data } = await query;
    setRows(data || []);
  }

  useEffect(() => {
    loadData();

    // Realtime: setiap ada insert baru di tabel pemakaian, reload rekap
    const channel = supabase
      .channel('rekap-dashboard')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'pemakaian' }, loadData)
      .subscribe();
    return () => supabase.removeChannel(channel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterGrup]);

  return (
    <div style={{ maxWidth: 960, margin: '0 auto', padding: 24, fontFamily: 'sans-serif' }}>
      <h1>Dashboard — %bahan/opl per WO/Grup</h1>

      <div style={{ marginBottom: 16 }}>
        <label>Filter Grup: </label>
        <select value={filterGrup} onChange={(e) => setFilterGrup(e.target.value)}>
          <option value="">Semua</option>
          <option value="A">A</option>
          <option value="B">B</option>
        </select>
        <button onClick={handleSyncAll} disabled={syncing} style={{ marginLeft: 12 }}>
          {syncing ? 'Menyinkron...' : 'Sync CR Sekarang'}
        </button>
        {syncMsg && <span style={{ marginLeft: 8, fontSize: 13, color: '#555' }}>{syncMsg}</span>}
      </div>

      <table width="100%" border="1" cellPadding="6" style={{ borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th>No WO</th><th>No Pol</th><th>Grup</th>
            <th>Total Harga Pengambilan</th><th>Jasa CR</th>
            <th>Opl-Bahan</th><th>%Bahan/Opl</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.no_wo}>
              <td>{r.no_wo}</td>
              <td>{r.no_pol}</td>
              <td>{r.grup}</td>
              <td>{Number(r.total_harga_pengambilan).toLocaleString('id-ID')}</td>
              <td>{Number(r.jasa_cr).toLocaleString('id-ID')}</td>
              <td>{Number(r.opl_bahan).toLocaleString('id-ID')}</td>
              <td>
                {r.rasio_bahan_opl != null
                  ? (r.rasio_bahan_opl * 100).toFixed(1) + '%'
                  : 'wo belum cr'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
