'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Store,
  QrCode,
  LogOut,
  Zap,
} from 'lucide-react';
import { deleteSession } from '@/app/actions/auth';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useRouter } from 'next/navigation';

const navItems = [
  { label: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
];

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await signOut(auth);
    await deleteSession();
    router.push('/admin/login');
  }

  return (
    <div className="admin-theme min-h-screen flex bg-[#0f0a1e]">
      {/* Sidebar */}
      <aside className="w-60 shrink-0 flex flex-col border-r border-purple-900/30 glass">
        {/* Logo */}
        <div className="p-5 border-b border-purple-900/30">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl gradient-brand flex items-center justify-center glow-brand">
              <Zap size={16} className="text-white" />
            </div>
            <div>
              <span className="font-bold text-white text-sm">MenuQR</span>
              <p className="text-[10px] text-purple-400 uppercase tracking-widest">Admin</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 flex flex-col gap-1">
          {navItems.map(({ label, href, icon: Icon }) => {
            const active = pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
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

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto p-6">{children}</div>
      </main>
    </div>
  );
}
