'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, UtensilsCrossed, Settings, Tag, LogOut } from 'lucide-react';
import { deleteSession } from '@/app/actions/auth';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useRouter } from 'next/navigation';

const navItems = [
  { label: 'Home',       href: '/dashboard/home',       icon: Home },
  { label: 'Menu',       href: '/dashboard/menu',       icon: UtensilsCrossed },
  { label: 'Categories', href: '/dashboard/categories', icon: Tag },
  { label: 'Setup',      href: '/dashboard/setup',      icon: Settings },
];

interface DashboardLayoutProps {
  children: React.ReactNode;
  restaurantName?: string;
}

export function DashboardLayout({ children, restaurantName }: DashboardLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await signOut(auth);
    await deleteSession();
    router.push('/dashboard/login');
  }

  return (
    <div className="db-theme" style={{ display: 'flex', minHeight: '100vh' }}>
      {/* Sidebar */}
      <aside className="db-sidebar" style={{ width: 232, flexShrink: 0, display: 'flex', flexDirection: 'column' }}>
        {/* Logo */}
        <div style={{ padding: '20px 16px 16px', borderBottom: '1px solid var(--db-border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: 'var(--db-accent)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 3px 10px rgba(200,98,42,0.28)',
              flexShrink: 0,
            }}>
              <span style={{ fontSize: 18 }}>🍽️</span>
            </div>
            <div style={{ minWidth: 0 }}>
              <span style={{ fontWeight: 700, color: 'var(--db-text)', fontSize: '0.95rem', fontFamily: 'var(--db-font-heading)' }}>MenuQR</span>
              {restaurantName && (
                <p style={{ fontSize: '0.72rem', color: 'var(--db-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 140 }}>{restaurantName}</p>
              )}
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '12px 10px', display: 'flex', flexDirection: 'column', gap: 3 }}>
          {navItems.map(({ label, href, icon: Icon }) => {
            const active = pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`db-nav-link${active ? ' active' : ''}`}
              >
                <Icon size={17} />
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Logout */}
        <div style={{ padding: '10px', borderTop: '1px solid var(--db-border)' }}>
          <button
            onClick={handleLogout}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '9px 14px', borderRadius: 12, width: '100%',
              fontSize: '0.9rem', fontWeight: 500, color: 'var(--db-text-muted)',
              background: 'none', border: 'none', cursor: 'pointer',
              transition: 'all 0.16s', fontFamily: 'var(--db-font-body)',
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = '#fff0f0'; (e.currentTarget as HTMLElement).style.color = '#dc2626'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'none'; (e.currentTarget as HTMLElement).style.color = 'var(--db-text-muted)'; }}
          >
            <LogOut size={17} />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main */}
      <main style={{ flex: 1, overflowY: 'auto', background: 'var(--db-bg)' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto', padding: '28px 28px' }}>
          {children}
        </div>
      </main>
    </div>
  );
}
