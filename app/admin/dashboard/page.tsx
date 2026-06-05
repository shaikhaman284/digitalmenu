'use client';

import { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Button } from '@/components/ui/Button';
import { Badge, ActiveBadge, ExpiredBadge, DisabledBadge } from '@/components/ui/Badge';
import { ToastProvider } from '@/components/ui/Toast';
import { CreateRestaurantModal } from './_components/CreateRestaurantModal';
import { GenerateQRBatchModal } from './_components/GenerateQRBatchModal';
import {
  Store, QrCode, Users, TrendingUp, Plus, Layers, ExternalLink,
} from 'lucide-react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

interface RestaurantRow {
  id: string;
  name: string;
  phone: string;
  plan: string;
  qr_slug: string;
  is_active: boolean;
  plan_expires_at: string | null;
  ai_import_limit: number;
  ai_imports_this_month: number;
}

interface Stats {
  total: number;
  active: number;
  expired: number;
  unboundQRs: number;
}

function formatDate(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function RestaurantStatus({ row }: { row: RestaurantRow }) {
  if (!row.is_active) return <DisabledBadge />;
  if (row.plan_expires_at && new Date(row.plan_expires_at) < new Date()) return <ExpiredBadge />;
  return <ActiveBadge />;
}

export default function AdminDashboardPage() {
  const [restaurants, setRestaurants] = useState<RestaurantRow[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, active: 0, expired: 0, unboundQRs: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);

  async function loadData() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/data');
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to load data');
      }
      const data = await res.json();
      setRestaurants(data.restaurants);
      setStats(data.stats);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const statCards = [
    { label: 'Total Restaurants', value: stats.total, icon: Store, color: 'text-purple-400' },
    { label: 'Active', value: stats.active, icon: TrendingUp, color: 'text-emerald-400' },
    { label: 'Expired', value: stats.expired, icon: Users, color: 'text-red-400' },
    { label: 'Unbound QRs', value: stats.unboundQRs, icon: QrCode, color: 'text-amber-400' },
  ];

  return (
    <div className="admin-theme">
    <ToastProvider>
      <AdminLayout>
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Admin Dashboard</h1>
            <p className="text-purple-400 text-sm mt-0.5">Manage restaurants and QR codes</p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" leftIcon={<Layers size={16} />} onClick={() => setShowQRModal(true)}>
              Generate QR Batch
            </Button>
            <Button leftIcon={<Plus size={16} />} onClick={() => setShowCreateModal(true)}>
              Create Restaurant
            </Button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-900/20 border border-red-500/30 text-sm text-red-400">
            {error}
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {statCards.map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="glass rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Icon size={18} className={color} />
                <span className="text-xs text-purple-400 font-medium">{label}</span>
              </div>
              <p className="text-3xl font-bold text-white">
                {loading ? <span className="skeleton w-12 h-7 inline-block rounded" /> : value}
              </p>
            </div>
          ))}
        </div>

        {/* Restaurants Table */}
        <div className="glass rounded-2xl overflow-hidden">
          <div className="p-5 border-b border-purple-900/30">
            <h2 className="text-lg font-semibold text-white">Restaurants</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-purple-900/20">
                  {['Name', 'Phone', 'Plan', 'Expires', 'AI Imports', 'QR Slug', 'Status', ''].map((h) => (
                    <th key={h} className="text-left px-5 py-3 text-xs font-medium text-purple-400 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <tr key={i} className="border-b border-purple-900/10">
                      {Array.from({ length: 7 }).map((_, j) => (
                        <td key={j} className="px-5 py-4">
                          <div className="skeleton h-4 w-24 rounded" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : restaurants.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-10 text-center text-purple-500">
                      No restaurants yet. Create your first one!
                    </td>
                  </tr>
                ) : (
                  restaurants.map((r) => (
                    <tr key={r.id} className="border-b border-purple-900/10 hover:bg-white/[0.02] transition-colors">
                      <td className="px-5 py-4 text-sm font-medium text-white">{r.name}</td>
                      <td className="px-5 py-4 text-sm text-purple-300">{r.phone}</td>
                      <td className="px-5 py-4 text-sm text-purple-300 capitalize">{r.plan}</td>
                      <td className="px-5 py-4 text-sm text-purple-300">{formatDate(r.plan_expires_at)}</td>
                      <td className="px-5 py-4">
                        {(() => {
                          const pct = r.ai_imports_this_month / r.ai_import_limit;
                          const color = pct >= 1 ? 'text-red-400 bg-red-900/20 border-red-500/30'
                            : pct >= 0.8 ? 'text-amber-400 bg-amber-900/20 border-amber-500/30'
                            : 'text-emerald-400 bg-emerald-900/20 border-emerald-500/30';
                          return (
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-lg border ${color}`}>
                              {r.ai_imports_this_month} / {r.ai_import_limit}
                            </span>
                          );
                        })()}
                      </td>
                      <td className="px-5 py-4">
                        <code className="text-xs bg-purple-900/30 text-purple-300 px-2 py-1 rounded-lg">{r.qr_slug || '—'}</code>
                      </td>
                      <td className="px-5 py-4"><RestaurantStatus row={r} /></td>
                      <td className="px-5 py-4">
                        <Link href={`/admin/restaurants/${r.id}`}>
                          <Button variant="ghost" size="sm" rightIcon={<ExternalLink size={14} />}>View</Button>
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <CreateRestaurantModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => { setShowCreateModal(false); loadData(); }}
        />
        <GenerateQRBatchModal
          isOpen={showQRModal}
          onClose={() => setShowQRModal(false)}
          onSuccess={() => { setShowQRModal(false); loadData(); }}
        />
      </AdminLayout>
    </ToastProvider>
    </div>
  );
}
