'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  QrCode,
  LogOut,
  Zap,
  Menu,
  X,
} from 'lucide-react';
import { deleteSession } from '@/app/actions/auth';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

const navItems = [
  { label: 'Dashboard',     href: '/admin/dashboard',      icon: LayoutDashboard },
  { label: 'QR Management', href: '/admin/qr-management',  icon: QrCode },
];

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  async function handleLogout() {
    await signOut(auth);
    await deleteSession();
    router.push('/admin/login');
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
            className={`
              flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium
              transition-all duration-200
              ${active
                ? 'gradient-brand text-white shadow-lg shadow-purple-900/40'
                : 'text-purple-300 hover:bg-white/5 hover:text-white'
              }
            `}
          >
            <Icon size={18} />
            {label}
          </Link>
        );
      })}
    </>
  );

  return (
    <div className="admin-theme min-h-screen flex bg-[#0f0a1e]">

      {/* ── Mobile overlay ─────────────────────────────────────────────── */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Sidebar ────────────────────────────────────────────────────── */}
      <aside className={`
        fixed inset-y-0 left-0 z-40 w-60 flex flex-col border-r border-purple-900/30 glass
        transition-transform duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        md:relative md:translate-x-0 md:shrink-0
      `}>
        {/* Logo */}
        <div className="p-5 border-b border-purple-900/30 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl gradient-brand flex items-center justify-center glow-brand">
              <Zap size={16} className="text-white" />
            </div>
            <div>
              <span className="font-bold text-white text-sm">MenuQR</span>
              <p className="text-[10px] text-purple-400 uppercase tracking-widest">Admin</p>
            </div>
          </div>
          {/* Close button — mobile only */}
          <button
            className="md:hidden text-purple-400 hover:text-white transition-colors"
            onClick={() => setSidebarOpen(false)}
          >
            <X size={20} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 flex flex-col gap-1">
          <NavLinks onClick={() => setSidebarOpen(false)} />
        </nav>

        {/* Logout */}
        <div className="p-3 border-t border-purple-900/30">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-purple-400 hover:text-red-400 hover:bg-red-900/10 transition-all w-full"
          >
            <LogOut size={18} />
            Sign Out
          </button>
        </div>
      </aside>

      {/* ── Main ───────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile top bar */}
        <header className="md:hidden flex items-center gap-3 px-4 py-3 border-b border-purple-900/30 glass shrink-0">
          <button
            className="text-purple-300 hover:text-white transition-colors"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu size={22} />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg gradient-brand flex items-center justify-center">
              <Zap size={12} className="text-white" />
            </div>
            <span className="font-bold text-white text-sm">MenuQR Admin</span>
          </div>
        </header>

        <main className="flex-1 overflow-auto">
          <div className="max-w-7xl mx-auto p-4 md:p-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
