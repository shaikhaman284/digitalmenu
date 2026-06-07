'use client';

import { use, useState, useEffect } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { ToastProvider, useToast } from '@/components/ui/Toast';
import { formatDate, daysRemaining } from '@/lib/utils';
import { ArrowLeft, Save, ToggleLeft, ToggleRight, Camera, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface MenuItem {
  id: string;
  name: string;
  category: string;
  price: number;
  is_available: boolean;
  like_count: number;
}

interface RestaurantDetail {
  id: string;
  uid: string;
  name: string;
  phone: string;
  location: string;
  plan: string;
  qr_slug: string;
  is_active: boolean;
  plan_expires_at: string | null;
  ai_import_limit: number;
  ai_imports_this_month: number;
}

function RestaurantDetailContent({ id }: { id: string }) {
  const { success, error: toastError } = useToast();
  const [restaurant, setRestaurant] = useState<RestaurantDetail | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const router = useRouter();
  const [form, setForm] = useState({
    plan: 'monthly',
    planExpiry: '',
    is_active: true,
    ai_import_limit: 5,
  });

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/admin/restaurant/${id}`);
        if (!res.ok) throw new Error('Failed to load');
        const data = await res.json();
        const r = data.restaurant as RestaurantDetail;
        setRestaurant(r);
        setMenuItems(data.menuItems || []);
        setForm({
          plan: r.plan,
          planExpiry: r.plan_expires_at ? new Date(r.plan_expires_at).toISOString().split('T')[0] : '',
          is_active: r.is_active,
          ai_import_limit: r.ai_import_limit ?? 5,
        });
      } catch {
        toastError('Failed to load restaurant data');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  async function handleSave() {
    if (!restaurant) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/restaurant/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan: form.plan,
          plan_expires_at: form.planExpiry,
          is_active: form.is_active,
          ai_import_limit: form.ai_import_limit,
        }),
      });
      if (!res.ok) throw new Error('Failed to save');
      setRestaurant((prev) => prev ? { ...prev, ai_import_limit: form.ai_import_limit } : prev);
      success('Restaurant updated!');
    } catch {
      toastError('Failed to save changes');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!restaurant) return;
    if (!confirm(`Are you sure you want to permanently delete "${restaurant.name}"? This will delete ALL menu items, categories, and data. This cannot be undone.`)) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/restaurant/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed to delete');
      success(`"${restaurant.name}" has been deleted.`);
      router.push('/admin/dashboard');
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Failed to delete restaurant');
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-purple-400/30 border-t-purple-400 rounded-full animate-spin" />
      </div>
    );
  }

  if (!restaurant) {
    return <div className="text-purple-400">Restaurant not found.</div>;
  }

  const totalLikes = menuItems.reduce((sum, i) => sum + (i.like_count || 0), 0);
  const days = daysRemaining(restaurant.plan_expires_at ? new Date(restaurant.plan_expires_at) : new Date());
  const aiPct = restaurant.ai_imports_this_month / (restaurant.ai_import_limit || 1);
  const aiColor = aiPct >= 1 ? 'text-red-400' : aiPct >= 0.8 ? 'text-amber-400' : 'text-emerald-400';

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/admin/dashboard">
          <Button variant="ghost" size="sm" leftIcon={<ArrowLeft size={16} />}>Back</Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white">{restaurant.name}</h1>
          <p className="text-purple-400 text-sm">{restaurant.phone} · {restaurant.location || 'No location set'}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Stats */}
        <div className="lg:col-span-1 flex flex-col gap-4">
          {[
            { label: 'Menu Items', value: menuItems.length, color: 'text-purple-400' },
            { label: 'Total Likes', value: totalLikes, color: 'text-pink-400' },
          ].map(({ label, value, color }) => (
            <div key={label} className="glass rounded-xl p-4">
              <p className="text-xs text-purple-400 font-medium mb-1">{label}</p>
              <p className={`text-3xl font-bold ${color}`}>{value}</p>
            </div>
          ))}

          {/* AI Import Stat Card */}
          <div className="glass rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Camera size={14} className="text-purple-400" />
              <p className="text-xs text-purple-400 font-medium">AI Imports This Month</p>
            </div>
            <p className={`text-3xl font-bold ${aiColor}`}>
              {restaurant.ai_imports_this_month}
              <span className="text-base font-normal text-purple-500"> / {restaurant.ai_import_limit}</span>
            </p>
            {/* Progress bar */}
            <div className="mt-2 h-1.5 rounded-full bg-purple-900/40 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${aiPct >= 1 ? 'bg-red-500' : aiPct >= 0.8 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                style={{ width: `${Math.min(aiPct * 100, 100)}%` }}
              />
            </div>
            {aiPct >= 1 && (
              <p className="text-xs text-red-400 mt-1.5 font-medium">Monthly limit reached</p>
            )}
          </div>
        </div>

        {/* Edit Form */}
        <div className="lg:col-span-2 glass rounded-2xl p-6 flex flex-col gap-4">
          <h2 className="text-lg font-semibold text-white">Edit Restaurant</h2>

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Plan"
              value={form.plan}
              onChange={(e) => setForm({ ...form, plan: e.target.value })}
            >
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
            </Select>
            <Input
              label="Plan Expiry"
              type="date"
              value={form.planExpiry}
              onChange={(e) => setForm({ ...form, planExpiry: e.target.value })}
            />
          </div>

          {/* AI Import Limit */}
          <div className="p-4 rounded-xl glass-light">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-sm font-medium text-white flex items-center gap-2">
                  <Camera size={15} className="text-purple-400" />
                  AI Import Limit (per month)
                </p>
                <p className="text-xs text-purple-400 mt-0.5">
                  How many photo menu imports this restaurant gets per month
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setForm((f) => ({ ...f, ai_import_limit: Math.max(0, f.ai_import_limit - 1) }))}
                className="w-8 h-8 rounded-lg bg-purple-900/40 border border-purple-700/40 text-white font-bold hover:bg-purple-800/40 transition-colors flex items-center justify-center text-lg"
              >−</button>
              <input
                type="number"
                min={0}
                max={100}
                value={form.ai_import_limit}
                onChange={(e) => setForm((f) => ({ ...f, ai_import_limit: Math.max(0, parseInt(e.target.value) || 0) }))}
                className="w-16 text-center bg-purple-900/20 border border-purple-700/30 rounded-lg px-2 py-1.5 text-white text-sm font-semibold focus:outline-none focus:border-purple-500"
              />
              <button
                onClick={() => setForm((f) => ({ ...f, ai_import_limit: f.ai_import_limit + 1 }))}
                className="w-8 h-8 rounded-lg bg-purple-900/40 border border-purple-700/40 text-white font-bold hover:bg-purple-800/40 transition-colors flex items-center justify-center text-lg"
              >+</button>
              <span className="text-xs text-purple-400 ml-2">
                Currently used: <strong className={aiColor}>{restaurant.ai_imports_this_month}</strong>
              </span>
            </div>
          </div>

          <div className="p-4 rounded-xl glass-light">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-white">Active Status</p>
                <p className="text-xs text-purple-400 mt-0.5">
                  {form.is_active ? 'Restaurant is live and accessible' : 'Restaurant is disabled'}
                </p>
              </div>
              <button
                onClick={() => setForm({ ...form, is_active: !form.is_active })}
                className="text-purple-400 hover:text-white transition-colors"
              >
                {form.is_active
                  ? <ToggleRight size={36} className="text-emerald-400" />
                  : <ToggleLeft size={36} className="text-purple-600" />
                }
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3 p-4 rounded-xl bg-purple-900/20 border border-purple-700/30">
            <div className="flex-1">
              <p className="text-xs text-purple-400">Plan expires</p>
              <p className="text-sm font-medium text-white">{formatDate(restaurant.plan_expires_at)}</p>
            </div>
            {days > 0
              ? <Badge variant={days <= 7 ? 'warning' : 'success'}>{days} days left</Badge>
              : <Badge variant="danger">Expired {Math.abs(days)} days ago</Badge>
            }
          </div>

          <div className="flex gap-3">
            <p className="text-sm text-purple-400 self-center">
              QR: <code className="text-purple-300 bg-purple-900/30 px-2 py-0.5 rounded-lg">{restaurant.qr_slug || 'Not assigned'}</code>
            </p>
            <div className="ml-auto">
              <Button onClick={handleSave} loading={saving} leftIcon={<Save size={16} />}>
                Save Changes
              </Button>
            </div>
          </div>

          {/* Danger Zone */}
          <div className="mt-2 p-4 rounded-xl border border-red-500/30 bg-red-900/10">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-red-400">Delete Restaurant</p>
                <p className="text-xs text-red-400/70 mt-0.5">Permanently removes this restaurant and all its data. Cannot be undone.</p>
              </div>
              <Button
                variant="danger"
                size="sm"
                leftIcon={<Trash2 size={14} />}
                loading={deleting}
                onClick={handleDelete}
              >
                Delete
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function RestaurantDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <div className="admin-theme">
    <ToastProvider>
      <AdminLayout>
        <RestaurantDetailContent id={id} />
      </AdminLayout>
    </ToastProvider>
    </div>
  );
}
