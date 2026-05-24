'use client';

import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Input, Select } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { CheckCircle, QrCode } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function CreateRestaurantModal({ isOpen, onClose, onSuccess }: Props) {
  const { success, error: toastError } = useToast();
  const [loading, setLoading] = useState(false);
  const [assignedSlug, setAssignedSlug] = useState<string | null>(null);
  const [createdName, setCreatedName] = useState('');
  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    password: '',
    plan: 'monthly',
    planExpiry: '',
  });

  function resetForm() {
    setForm({ name: '', phone: '', email: '', password: '', plan: 'monthly', planExpiry: '' });
    setAssignedSlug(null);
    setCreatedName('');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.planExpiry) { toastError('Plan expiry date is required'); return; }
    setLoading(true);

    try {
      const res = await fetch('/api/create-restaurant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          phone: form.phone,
          email: form.email,
          password: form.password,
          plan: form.plan,
          planExpiry: form.planExpiry,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create restaurant');

      setCreatedName(form.name);
      setAssignedSlug(data.slug);
      success(`Restaurant "${form.name}" created!`);
    } catch (err: unknown) {
      toastError(err instanceof Error ? err.message : 'Failed to create restaurant');
    } finally {
      setLoading(false);
    }
  }

  function handleClose() {
    resetForm();
    onClose();
  }

  // Success state
  if (assignedSlug !== null || (createdName && assignedSlug === null)) {
    return (
      <Modal isOpen={isOpen} onClose={handleClose} title="Restaurant Created" size="sm">
        <div className="flex flex-col items-center gap-4 py-4">
          <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center">
            <CheckCircle size={32} className="text-emerald-400" />
          </div>
          <div className="text-center">
            <p className="text-white font-semibold text-lg">{createdName}</p>
            <p className="text-purple-400 text-sm mt-1">Restaurant created successfully!</p>
          </div>
          <div className="w-full p-4 rounded-xl bg-purple-900/20 border border-purple-700/30 text-center">
            <p className="text-xs text-purple-400 mb-1 flex items-center justify-center gap-1">
              <QrCode size={12} /> Assigned QR Slug
            </p>
            <code className="text-xl font-bold text-white">
              {assignedSlug || 'None available — generate a QR batch first'}
            </code>
          </div>
          <Button fullWidth onClick={() => { handleClose(); onSuccess(); }}>Done</Button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Create Restaurant" size="lg">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input
          label="Restaurant Name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="e.g. The Spice Garden"
          required
        />
        <Input
          label="Phone"
          type="tel"
          value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
          placeholder="+91 98765 43210"
          required
        />
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Login Email"
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder="owner@restaurant.com"
            required
          />
          <Input
            label="Password"
            type="password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            placeholder="Min 6 characters"
            required
            minLength={6}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Select
            label="Plan"
            value={form.plan}
            onChange={(e) => setForm({ ...form, plan: e.target.value })}
            required
          >
            <option value="monthly">Monthly</option>
            <option value="yearly">Yearly</option>
          </Select>
          <Input
            label="Plan Expiry Date"
            type="date"
            value={form.planExpiry}
            onChange={(e) => setForm({ ...form, planExpiry: e.target.value })}
            required
          />
        </div>

        <div className="flex gap-3 mt-2">
          <Button type="button" variant="ghost" fullWidth onClick={handleClose}>Cancel</Button>
          <Button type="submit" loading={loading} fullWidth>Create Restaurant</Button>
        </div>
      </form>
    </Modal>
  );
}
