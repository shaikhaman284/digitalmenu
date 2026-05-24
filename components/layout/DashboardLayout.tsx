'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, UtensilsCrossed, Settings, Tag, LogOut, Menu, X } from 'lucide-react';
import { deleteSession } from '@/app/actions/auth';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

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
  const [sidebarOpen, setSidebarOpen] = useState(false);

  async function handleLogout() {
    await signOut(auth);
    await deleteSession();
    router.push('/dashboard/login');
  }

  const NavLinks = ({ onClick }: { onClick?: () => void }) => (
    <>
      {navItems.map(({ label, href, icon: Icon }) => {
        const active = pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            onClick={onClick}
            className={`db-nav-link${active ? ' active' : ''}`}
          >
            <Icon size={17} />
            {label}
          </Link>
        );
      })}
    </>
  );

  return (
    <div className="db-theme db-layout">

      {/* ── Mobile overlay ─────────────────────────────────────────────── */}
      {sidebarOpen && (
        <div
          className="db-sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Sidebar ────────────────────────────────────────────────────── */}
      <aside className={`db-sidebar db-sidebar-drawer${sidebarOpen ? ' open' : ''}`}>
        {/* Logo */}
        <div style={{ padding: '20px 16px 16px', borderBottom: '1px solid var(--db-border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
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
                  <p style={{ fontSize: '0.72rem', color: 'var(--db-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 130 }}>{restaurantName}</p>
                )}
              </div>
            </div>
            {/* Close — mobile only */}
            <button
              className="db-sidebar-close"
              onClick={() => setSidebarOpen(false)}
              aria-label="Close menu"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '12px 10px', display: 'flex', flexDirection: 'column', gap: 3 }}>
          <NavLinks onClick={() => setSidebarOpen(false)} />
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

      {/* ── Right side (mobile header + main) ─────────────────────────── */}
      <div className="db-main-col">
        {/* Mobile top bar */}
        <header className="db-mobile-header">
          <button
            className="db-hamburger"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open menu"
          >
            <Menu size={22} />
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: 28, height: 28, borderRadius: 8, background: 'var(--db-accent)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <span style={{ fontSize: 14 }}>🍽️</span>
            </div>
            <span style={{ fontWeight: 700, color: 'var(--db-text)', fontSize: '0.9rem' }}>
              {restaurantName || 'MenuQR'}
            </span>
          </div>
        </header>

        {/* Main content */}
        <main style={{ flex: 1, overflowY: 'auto', background: 'var(--db-bg)' }}>
          <div style={{ maxWidth: 1000, margin: '0 auto', padding: '24px 16px' }}>
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
