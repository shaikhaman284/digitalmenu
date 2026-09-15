'use client';

import { useState, useEffect, useRef } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Input, Textarea, Select } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { normalizePricingKey, tierDisplayName } from '@/lib/utils';
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

type PricingMode = 'single' | 'full_half' | 'full_half_qtr' | 'piece' | 'custom';

const PRICING_MODES: { value: PricingMode; label: string }[] = [
  { value: 'single',        label: 'Single Price' },
  { value: 'full_half',     label: 'Full / Half' },
  { value: 'full_half_qtr', label: 'Full / Half / Qtr' },
  { value: 'piece',         label: 'Per Piece' },
  { value: 'custom',        label: 'Custom Sizes' },
];

/** Quick-fill presets for the Custom Sizes mode */
const SIZE_PRESETS: Array<{ label: string; tiers: Array<{ label: string; price: string }> }> = [
  { label: 'S / M / L',             tiers: [{ label: 'small',  price: '' }, { label: 'medium', price: '' }, { label: 'large',  price: '' }] },
  { label: 'Sm / Reg / Lg',         tiers: [{ label: 'small',  price: '' }, { label: 'regular', price: '' }, { label: 'large', price: '' }] },
  { label: '7" / 9"',               tiers: [{ label: '7inch',  price: '' }, { label: '9inch',   price: '' }] },
  { label: '7" / 9" / 12"',         tiers: [{ label: '7inch',  price: '' }, { label: '9inch',   price: '' }, { label: '12inch', price: '' }] },
  { label: '6" / 8" / 10" / 12"',   tiers: [{ label: '6inch',  price: '' }, { label: '8inch',   price: '' }, { label: '10inch', price: '' }, { label: '12inch', price: '' }] },
];

/** Detect the pricing mode from an existing item's pricing data */
function detectPricingMode(item: MenuItem): PricingMode {
  const p = item.pricing;
  if (!p) return 'single';
  
  // Find if there are any keys that are not standard
  const standardKeys = ['full', 'half', 'qtr', 'piece'];
  const hasCustomKeys = Object.keys(p).some(key => !standardKeys.includes(key));
  if (hasCustomKeys) return 'custom';

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
  customTiers: Array<{ label: string; price: string }>
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
    case 'custom':
      customTiers.forEach(({ label, price }) => {
        // Normalise labels so typed abbreviations (7", med, lg) are canonicalised before saving
        const canonical = normalizePricingKey(label.trim());
        const numPrice = parseFloat(price);
        if (canonical && !isNaN(numPrice) && numPrice > 0) {
          pricing[canonical] = numPrice;
        }
      });
      break;
  }
  const price = pricing.full ?? pricing.half ?? pricing.qtr ?? pricing.piece ?? Object.values(pricing).find(v => typeof v === 'number' && v > 0) ?? 0;
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
  const [customTiers, setCustomTiers] = useState<Array<{ label: string; price: string }>>([]);
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
      
      const tiersList: Array<{ label: string; price: string }> = [];
      if (mode === 'custom' && p) {
        Object.entries(p).forEach(([key, val]) => {
          if (typeof val === 'number') {
            tiersList.push({ label: key, price: String(val) });
          }
        });
      }
      setCustomTiers(tiersList);

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
      setCustomTiers([]);
      setImagePreview('');
      setImageFile(null);
    }
  }, [editItem, isOpen, categories]);

  async function generateDescription() {
    if (!form.name || (!form.category && !newCategory)) { toastError('Enter name and category first'); return; }
    setGeneratingDesc(true);
    try {
      const categoryValue = form.isNewCategory ? newCategory : form.category;
      console.log('[AddItemModal] Calling generate-description with:', { name: form.name, category: categoryValue });
      
      const res = await fetch('/api/generate-description', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: form.name, category: categoryValue }),
      });
      
      console.log('[AddItemModal] Response status:', res.status);
      const data = await res.json();
      console.log('[AddItemModal] Response data:', data);
      
      if (!res.ok) {
        toastError(data.error || 'Failed to generate description');
        return;
      }
      
      if (data.description) { 
        setForm((f) => ({ ...f, description: data.description })); 
        success('Description generated!'); 
      } else {
        toastError('No description returned from AI');
      }
    } catch (err) { 
      console.error('[AddItemModal] Error:', err);
      toastError('Failed to generate description'); 
    }
    finally { setGeneratingDesc(false); }
  }

  async function uploadImage(itemId: string): Promise<string | null> {
    if (!imageFile) return editItem?.image_url || null;

    // Compress the image client-side (max 1200 px, JPEG 85%) before sending
    // through /api/upload-image. This keeps the payload well under Vercel's
    // 4.5 MB body limit — the same approach used by the working logo upload,
    // just with a resize step added for potentially large camera photos.
    let uploadFile: File = imageFile;
    try {
      const compressed = await new Promise<Blob>((resolve, reject) => {
        const img = new window.Image();
        const objectUrl = URL.createObjectURL(imageFile);
        img.onload = () => {
          URL.revokeObjectURL(objectUrl);
          const MAX = 1200;
          let { width, height } = img;
          if (width > height) {
            if (width > MAX) { height = Math.round((height * MAX) / width); width = MAX; }
          } else {
            if (height > MAX) { width = Math.round((width * MAX) / height); height = MAX; }
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          canvas.getContext('2d')!.drawImage(img, 0, 0, width, height);
          canvas.toBlob(
            (b) => (b ? resolve(b) : reject(new Error('toBlob failed'))),
            'image/jpeg',
            0.85,
          );
        };
        img.onerror = reject;
        img.src = objectUrl;
      });
      uploadFile = new File([compressed], 'image.jpg', { type: 'image/jpeg' });
    } catch {
      // If compression fails for any reason, fall back to the original file
      uploadFile = imageFile;
    }

    // Send to the same /api/upload-image endpoint that the logo upload uses
    const fd = new FormData();
    fd.append('file', uploadFile);
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

      const { pricing, price } = buildPricing(pricingMode, form.priceSingle, form.priceFull, form.priceHalf, form.priceQtr, form.pricePiece, customTiers);

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
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <label className="db-label" style={{ marginBottom: 0 }}>Category <span style={{ color: 'var(--db-accent)' }}>*</span></label>
            {/* Quick shortcut: set to Add-ons category + Per Piece pricing */}
            <button
              type="button"
              onClick={() => {
                // Check if an "Add-ons" category already exists (case-insensitive)
                const existing = categories.find((c) => c.name.toLowerCase() === 'add-ons');
                if (existing) {
                  setForm((f) => ({ ...f, category: existing.name, isNewCategory: false }));
                } else {
                  setNewCategory('Add-ons');
                  setForm((f) => ({ ...f, isNewCategory: true, category: '' }));
                }
                setPricingMode('piece');
              }}
              style={{
                fontSize: '0.72rem', fontWeight: 600, padding: '2px 10px', borderRadius: 999,
                border: '1px solid var(--db-border)', background: 'var(--db-surface-2)',
                color: 'var(--db-text-muted)', cursor: 'pointer', transition: 'all 0.15s',
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--db-accent)'; (e.currentTarget as HTMLElement).style.color = 'var(--db-accent)'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--db-border)'; (e.currentTarget as HTMLElement).style.color = 'var(--db-text-muted)'; }}
            >
              + Add-on item
            </button>
          </div>
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
            <div>
              <Input label="Price / Piece (₹)" type="number" min="0" step="0.5"
                value={form.pricePiece} onChange={(e) => setForm({ ...form, pricePiece: e.target.value })}
                placeholder="e.g. 15" required />
              <p style={{ fontSize: '0.75rem', color: 'var(--db-text-muted)', marginTop: 4 }}>
                Use for breads, rotis, naans, and add-on extras (sauces, toppings, etc.)
              </p>
            </div>
          )}

          {pricingMode === 'custom' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

              {/* Quick-fill size presets */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--db-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Quick Presets</span>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {SIZE_PRESETS.map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => setCustomTiers(preset.tiers.map(t => ({ ...t })))}
                      style={{
                        padding: '4px 12px',
                        borderRadius: 999,
                        fontSize: '0.78rem',
                        fontWeight: 500,
                        border: '1.5px solid var(--db-border)',
                        background: 'var(--db-surface-2)',
                        color: 'var(--db-text-2)',
                        cursor: 'pointer',
                        transition: 'all 0.15s',
                      }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLElement).style.borderColor = 'var(--db-accent)';
                        (e.currentTarget as HTMLElement).style.color = 'var(--db-accent)';
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLElement).style.borderColor = 'var(--db-border)';
                        (e.currentTarget as HTMLElement).style.color = 'var(--db-text-2)';
                      }}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom tier rows */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--db-text)' }}>Custom Tiers</span>
                <Button type="button" variant="outline" size="sm" onClick={() => setCustomTiers([...customTiers, { label: '', price: '' }])}>
                  + Add Size
                </Button>
              </div>

              {customTiers.length === 0 ? (
                <p style={{ fontSize: '0.8rem', color: 'var(--db-text-muted)', fontStyle: 'italic', margin: '4px 0 12px' }}>
                  Pick a preset above or click "+ Add Size" to configure.
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 12 }}>
                  {customTiers.map((tier, index) => (
                    <div key={index} style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                      <div style={{ flex: 2 }}>
                        <Input
                          placeholder={`e.g. ${tierDisplayName(tier.label || 'small')}`}
                          value={tier.label}
                          onChange={(e) => {
                            const updated = [...customTiers];
                            updated[index].label = e.target.value;
                            setCustomTiers(updated);
                          }}
                          required
                        />
                      </div>
                      <div style={{ flex: 1.5 }}>
                        <Input
                          type="number"
                          min="0"
                          step="0.5"
                          placeholder="Price (₹)"
                          value={tier.price}
                          onChange={(e) => {
                            const updated = [...customTiers];
                            updated[index].price = e.target.value;
                            setCustomTiers(updated);
                          }}
                          required
                        />
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setCustomTiers(customTiers.filter((_, i) => i !== index))}
                        style={{ color: 'var(--db-red)', padding: '6px 8px', marginTop: 12 }}
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
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
