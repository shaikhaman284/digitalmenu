'use client';

import { use, useState, useEffect } from 'react';
import { doc, getDoc, updateDoc, collection, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import { Badge, ActiveBadge, ExpiredBadge, DisabledBadge } from '@/components/ui/Badge';
import { ToastProvider, useToast } from '@/components/ui/Toast';
import { formatDate, daysRemaining } from '@/lib/utils';
import type { Restaurant, MenuItem } from '@/types';
import { ArrowLeft, Save, ToggleLeft, ToggleRight } from 'lucide-react';
import Link from 'next/link';

function RestaurantDetailContent({ id }: { id: string }) {
  const { success, error: toastError } = useToast();
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ plan: 'monthly', planExpiry: '', is_active: true });

  useEffect(() => {
    async function load() {
      const restSnap = await getDoc(doc(db, 'restaurants', id));
      if (!restSnap.exists()) { setLoading(false); return; }
      const r = { id: restSnap.id, ...restSnap.data() } as Restaurant;
      setRestaurant(r);

      const expiryDate = r.plan_expires_at?.toDate();
      setForm({
        plan: r.plan,
        planExpiry: expiryDate ? expiryDate.toISOString().split('T')[0] : '',
        is_active: r.is_active,
      });

      const itemsSnap = await getDocs(collection(db, 'restaurants', id, 'menu_items'));
      setMenuItems(itemsSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as MenuItem));
      setLoading(false);
    }
    load();
  }, [id]);

  async function handleSave() {
    if (!restaurant) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, 'restaurants', id), {
        plan: form.plan,
        plan_expires_at: Timestamp.fromDate(new Date(form.planExpiry)),
        is_active: form.is_active,
      });
      success('Restaurant updated!');
    } catch {
      toastError('Failed to save changes');
    } finally {
      setSaving(false);
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
  const totalReviews = menuItems.reduce((sum, i) => sum + (i.review_count || 0), 0);
  const days = daysRemaining(restaurant.plan_expires_at);

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
            { label: 'Total Reviews', value: totalReviews, color: 'text-amber-400' },
          ].map(({ label, value, color }) => (
            <div key={label} className="glass rounded-xl p-4">
              <p className="text-xs text-purple-400 font-medium mb-1">{label}</p>
              <p className={`text-3xl font-bold ${color}`}>{value}</p>
            </div>
          ))}
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
