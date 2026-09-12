import Link from 'next/link';

export default function Home() {
  return (
    <div style={{ maxWidth: 480, margin: '80px auto', padding: 24, fontFamily: 'sans-serif', textAlign: 'center' }}>
      <h1>Dashboard Pemakaian Cat</h1>
      <p style={{ color: '#666', marginBottom: 32 }}>Sikkens / Kansai Monitoring</p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <Link href="/input" style={btnStyle}>Menu Input</Link>
        <Link href="/dashboard" style={btnStyle}>Menu Dashboard</Link>
        <Link href="/detail" style={btnStyle}>Data Pemakaian</Link>
      </div>
    </div>
  );
}

const btnStyle = {
  display: 'block',
  padding: '14px 20px',
  background: '#111',
  color: '#fff',
  borderRadius: 8,
  textDecoration: 'none',
  fontWeight: 600,
};
