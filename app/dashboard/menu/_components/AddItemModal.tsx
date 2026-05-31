'use client';

import { useState, useEffect, useRef } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Input, Textarea, Select } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import type { MenuItem, Category, PricingTiers } from '@/types';
import { Upload, Wand2 } from 'lucide-react';
import Image from 'next/image';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  restaurantId: string;
  categories: Category[];
  editItem?: MenuItem | null;
}

type PricingMode = 'single' | 'full_half' | 'full_half_qtr' | 'piece';

const PRICING_MODES: { value: PricingMode; label: string }[] = [
  { value: 'single', label: 'Single Price' },
  { value: 'full_half', label: 'Full / Half' },
  { value: 'full_half_qtr', label: 'Full / Half / Qtr' },
  { value: 'piece', label: 'Per Piece' },
];

/** Detect the pricing mode from an existing item's pricing data */
function detectPricingMode(item: MenuItem): PricingMode {
  const p = item.pricing;
  if (!p) return 'single';
  if (p.piece !== undefined && p.full === undefined && p.half === undefined) return 'piece';
  if (p.qtr !== undefined) return 'full_half_qtr';
  if (p.half !== undefined) return 'full_half';
  return 'single';
}

/** Build the PricingTiers object and compute the base price from form state */
function buildPricing(
  mode: PricingMode,
  single: string,
  full: string,
  half: string,
  qtr: string,
  piece: string,
): { pricing: PricingTiers; price: number } {
  let pricing: PricingTiers = {};
  switch (mode) {
    case 'single':
      pricing = { full: parseFloat(single) || 0 };
      break;
    case 'full_half':
      pricing = { full: parseFloat(full) || 0, half: parseFloat(half) || 0 };
      break;
    case 'full_half_qtr':
      pricing = { full: parseFloat(full) || 0, half: parseFloat(half) || 0, qtr: parseFloat(qtr) || 0 };
      break;
    case 'piece':
      pricing = { piece: parseFloat(piece) || 0 };
      break;
  }
  const price = pricing.full ?? pricing.half ?? pricing.qtr ?? pricing.piece ?? 0;
  return { pricing, price };
}

export function AddItemModal({ isOpen, onClose, onSuccess, restaurantId, categories, editItem }: Props) {
  const { success, error: toastError } = useToast();
  const [saving, setSaving] = useState(false);
  const [generatingDesc, setGeneratingDesc] = useState(false);
  const [newCategory, setNewCategory] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [pricingMode, setPricingMode] = useState<PricingMode>('single');
  const [form, setForm] = useState({
    name: '',
    category: categories[0]?.name || '',
    // single price
    priceSingle: '',
    // multi-tier prices
    priceFull: '',
    priceHalf: '',
    priceQtr: '',
    pricePiece: '',
    description: '',
    isNewCategory: false,
  });

  useEffect(() => {
    if (editItem) {
      const mode = detectPricingMode(editItem);
      const p = editItem.pricing;
      setForm({
        name: editItem.name,
        category: editItem.category,
        priceSingle: mode === 'single' ? String(editItem.price) : '',
        priceFull: p?.full !== undefined ? String(p.full) : mode === 'single' ? String(editItem.price) : '',
        priceHalf: p?.half !== undefined ? String(p.half) : '',
        priceQtr: p?.qtr !== undefined ? String(p.qtr) : '',
        pricePiece: p?.piece !== undefined ? String(p.piece) : '',
        description: editItem.description,
        isNewCategory: false,
      });
      setPricingMode(mode);
      setImagePreview(editItem.image_url || '');
    } else {
      setForm({ name: '', category: categories[0]?.name || '', priceSingle: '', priceFull: '', priceHalf: '', priceQtr: '', pricePiece: '', description: '', isNewCategory: false });
      setPricingMode('single');
      setImagePreview('');
      setImageFile(null);
    }
  }, [editItem, isOpen, categories]);

  async function generateDescription() {
    if (!form.name || (!form.category && !newCategory)) { toastError('Enter name and category first'); return; }
    setGeneratingDesc(true);
    try {
      const res = await fetch('/api/generate-description', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: form.name, category: form.isNewCategory ? newCategory : form.category }),
      });
      const data = await res.json();
      if (data.description) { setForm((f) => ({ ...f, description: data.description })); success('Description generated!'); }
    } catch { toastError('Failed to generate description'); }
    finally { setGeneratingDesc(false); }
  }

  async function uploadImage(itemId: string): Promise<string | null> {
    if (!imageFile) return editItem?.image_url || null;
    const fd = new FormData();
    fd.append('file', imageFile);
    fd.append('path', `restaurants/${restaurantId}/menu/${itemId}`);
    const res = await fetch('/api/upload-image', { method: 'POST', body: fd });
    if (!res.ok) throw new Error('Image upload failed');
    const { url } = await res.json();
    return url;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      let description = form.description;
      const categoryName = form.isNewCategory ? newCategory.trim() : form.category;

      if (!description.trim()) {
        const res = await fetch('/api/generate-description', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: form.name, category: categoryName }),
        });
        const data = await res.json();
        description = data.description || '';
      }

      const { pricing, price } = buildPricing(pricingMode, form.priceSingle, form.priceFull, form.priceHalf, form.priceQtr, form.pricePiece);

      if (editItem) {
        const imageUrl = await uploadImage(editItem.id);
        await fetch('/api/dashboard/menu', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'update', itemId: editItem.id, data: { name: form.name.trim(), category: categoryName, price, pricing, description, image_url: imageUrl } }),
        });
        success('Item updated!');
      } else {
        const createRes = await fetch('/api/dashboard/menu', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'add', data: { name: form.name.trim(), category: categoryName, price, pricing, description, image_url: null, is_available: true, like_count: 0, avg_rating: 0, review_count: 0 } }),
        });
        if (!createRes.ok) throw new Error((await createRes.json()).error);
        const { id: newId } = await createRes.json();

        if (imageFile) {
          const imageUrl = await uploadImage(newId);
          await fetch('/api/dashboard/menu', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'update', itemId: newId, data: { image_url: imageUrl } }),
          });
        }

        if (form.isNewCategory && newCategory.trim()) {
          await fetch('/api/dashboard/categories', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'add', name: newCategory.trim() }),
          });
        }
        success('Item added!');
      }
      onSuccess();
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Failed to save item');
    } finally {
      setSaving(false);
    }
  }

  const inputStyle = { flex: 1 };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={editItem ? 'Edit Menu Item' : 'Add Menu Item'} size="lg">
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

        <Input label="Item Name" value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="e.g. Chicken Biryani" required />

        {/* Category */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          <label className="db-label">Category <span style={{ color: 'var(--db-accent)' }}>*</span></label>
          {!form.isNewCategory ? (
            <Select value={form.category}
              onChange={(e) => {
                if (e.target.value === '__new__') setForm({ ...form, isNewCategory: true, category: '' });
                else setForm({ ...form, category: e.target.value });
              }}>
              {categories.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
              <option value="__new__">+ Add new category</option>
            </Select>
          ) : (
            <div style={{ display: 'flex', gap: 8 }}>
              <Input value={newCategory} onChange={(e) => setNewCategory(e.target.value)}
                placeholder="New category name" required />
              <Button type="button" variant="ghost" size="sm"
                onClick={() => setForm({ ...form, isNewCategory: false, category: categories[0]?.name || '' })}>
                Cancel
              </Button>
            </div>
          )}
        </div>

        {/* Pricing Mode */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <label className="db-label">Pricing Type <span style={{ color: 'var(--db-accent)' }}>*</span></label>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {PRICING_MODES.map((m) => (
              <button
                key={m.value}
                type="button"
                onClick={() => setPricingMode(m.value)}
                style={{
                  padding: '5px 14px',
                  borderRadius: 999,
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  border: `1.5px solid ${pricingMode === m.value ? 'var(--db-accent)' : 'var(--db-border)'}`,
                  background: pricingMode === m.value ? 'var(--db-accent)' : 'transparent',
                  color: pricingMode === m.value ? '#fff' : 'var(--db-text-muted)',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                {m.label}
              </button>
            ))}
          </div>

          {/* Price inputs based on mode */}
          {pricingMode === 'single' && (
            <Input label="Price (₹)" type="number" min="0" step="0.5"
              value={form.priceSingle} onChange={(e) => setForm({ ...form, priceSingle: e.target.value })}
              placeholder="e.g. 299" required />
          )}

          {pricingMode === 'full_half' && (
            <div style={{ display: 'flex', gap: 10 }}>
              <div style={inputStyle}>
                <Input label="Full (₹)" type="number" min="0" step="0.5"
                  value={form.priceFull} onChange={(e) => setForm({ ...form, priceFull: e.target.value })}
                  placeholder="e.g. 300" required />
              </div>
              <div style={inputStyle}>
                <Input label="Half (₹)" type="number" min="0" step="0.5"
                  value={form.priceHalf} onChange={(e) => setForm({ ...form, priceHalf: e.target.value })}
                  placeholder="e.g. 160" required />
              </div>
            </div>
          )}

          {pricingMode === 'full_half_qtr' && (
            <div style={{ display: 'flex', gap: 10 }}>
              <div style={inputStyle}>
                <Input label="Full (₹)" type="number" min="0" step="0.5"
                  value={form.priceFull} onChange={(e) => setForm({ ...form, priceFull: e.target.value })}
                  placeholder="e.g. 300" required />
              </div>
              <div style={inputStyle}>
                <Input label="Half (₹)" type="number" min="0" step="0.5"
                  value={form.priceHalf} onChange={(e) => setForm({ ...form, priceHalf: e.target.value })}
                  placeholder="e.g. 160" required />
              </div>
              <div style={inputStyle}>
                <Input label="Qtr (₹)" type="number" min="0" step="0.5"
                  value={form.priceQtr} onChange={(e) => setForm({ ...form, priceQtr: e.target.value })}
                  placeholder="e.g. 100" required />
              </div>
            </div>
          )}

          {pricingMode === 'piece' && (
            <Input label="Price / Piece (₹)" type="number" min="0" step="0.5"
              value={form.pricePiece} onChange={(e) => setForm({ ...form, pricePiece: e.target.value })}
              placeholder="e.g. 15" required />
          )}
        </div>

        {/* Description */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <label className="db-label" style={{ marginBottom: 0 }}>Description</label>
            <Button type="button" variant="ghost" size="sm" loading={generatingDesc}
              leftIcon={<Wand2 size={12} />} onClick={generateDescription}>
              AI Generate
            </Button>
          </div>
          <Textarea value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Leave empty to auto-generate with AI" rows={2}
            hint="AI will generate if left empty" />
        </div>

        {/* Image Upload */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label className="db-label">Image (optional)</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {imagePreview && (
              <div style={{ width: 64, height: 64, borderRadius: 12, overflow: 'hidden', border: '1px solid var(--db-border)', flexShrink: 0 }}>
                <Image src={imagePreview} alt="Preview" width={64} height={64} style={{ width: '100%', height: '100%', objectFit: 'cover' }} unoptimized />
              </div>
            )}
            <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) { setImageFile(f); setImagePreview(URL.createObjectURL(f)); }
              }} />
            <Button type="button" variant="outline" size="sm" leftIcon={<Upload size={13} />}
              onClick={() => fileInputRef.current?.click()}>
              {imagePreview ? 'Change Image' : 'Upload Image'}
            </Button>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
          <Button type="button" variant="ghost" fullWidth onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={saving} fullWidth>{editItem ? 'Update' : 'Add Item'}</Button>
        </div>
      </form>
    </Modal>
  );
}
