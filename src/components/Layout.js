import Link from 'next/link';
import { useRouter } from 'next/router';

const MENU = [
  { href: '/', label: 'Beranda' },
  { href: '/input', label: 'Input' },
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/detail', label: 'Data Pemakaian' },
];

export default function Layout({ children }) {
  const router = useRouter();

  return (
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: 'sans-serif' }}>
      <aside style={{
        width: 200, background: '#111', color: '#fff', padding: '20px 0',
        position: 'sticky', top: 0, height: '100vh', flexShrink: 0,
      }}>
        <div style={{ padding: '0 20px 20px', fontWeight: 700, fontSize: 15, borderBottom: '1px solid #333', marginBottom: 12 }}>
          Pemakaian Cat
        </div>
        {MENU.map((m) => {
          const active = router.pathname === m.href;
          return (
            <Link
              key={m.href}
              href={m.href}
              style={{
                display: 'block',
                padding: '10px 20px',
                color: active ? '#fff' : '#aaa',
                background: active ? '#333' : 'transparent',
                textDecoration: 'none',
                fontSize: 14,
              }}
            >
              {m.label}
            </Link>
          );
        })}
      </aside>
      <main style={{ flex: 1, minWidth: 0 }}>{children}</main>
    </div>
  );
}
