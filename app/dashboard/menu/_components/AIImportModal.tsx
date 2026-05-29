'use client';

import { useState, useRef } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { resizeImage } from '@/lib/utils';
import type { Category, MenuItemDraft, PricingTiers } from '@/types';
import { Upload, Wand2, Plus, Trash2, CheckCircle } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  restaurantId: string;
  categories: Category[];
}

type Step = 1 | 2 | 3 | 4;
const MAX_IMPORTS_PER_MONTH = 5;

const stepLabels = ['Upload Photos', 'Extracting…', 'Review & Edit', 'Done!'];

/** Compute base price from pricing tiers */
function basePriceFromTiers(pricing?: PricingTiers): number {
  if (!pricing) return 0;
  return pricing.full ?? pricing.half ?? pricing.qtr ?? pricing.piece ?? 0;
}

/** Render compact pricing label for a draft item */
function pricingLabel(item: MenuItemDraft): string {
  const p = item.pricing;
  if (!p || (!p.full && !p.half && !p.qtr && !p.piece)) return item.price > 0 ? `₹${item.price}` : '—';
  const parts: string[] = [];
  if (p.full !== undefined) parts.push(`F:${p.full}`);
  if (p.half !== undefined) parts.push(`H:${p.half}`);
  if (p.qtr !== undefined) parts.push(`Q:${p.qtr}`);
  if (p.piece !== undefined) parts.push(`${p.piece}/pc`);
  return parts.join(' · ') || '—';
}

export function AIImportModal({ isOpen, onClose, onSuccess, restaurantId, categories }: Props) {
  const { success, error: toastError, info } = useToast();
  const [step, setStep] = useState<Step>(1);
  const [photos, setPhotos] = useState<File[]>([]);
  const [extracting, setExtracting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [items, setItems] = useState<MenuItemDraft[]>([]);
  const [importCount, setImportCount] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Which item row is being expanded for pricing edit
  const [expandedRow, setExpandedRow] = useState<number | null>(null);

  function handleClose() { setStep(1); setPhotos([]); setItems([]); setExpandedRow(null); onClose(); }

  async function handleExtract() {
    if (photos.length === 0) { toastError('Please upload at least one photo'); return; }
    const countRes = await fetch(`/api/dashboard/ai-import-count?restaurantId=${restaurantId}`);
    const countData = await countRes.json();
    const count = countData.count ?? 0;
    setImportCount(count);
    if (count >= MAX_IMPORTS_PER_MONTH) { toastError(`Monthly limit reached (${MAX_IMPORTS_PER_MONTH} imports/month)`); return; }

    setExtracting(true);
    try {
      const allItems: MenuItemDraft[] = [];
      for (const photo of photos) {
        info(`Extracting from ${photo.name}...`);
        const base64 = await resizeImage(photo, 1024);
        const res = await fetch('/api/extract-menu', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: base64 }),
        });
        if (!res.ok) throw new Error((await res.json()).error || 'Extraction failed');
        const data = await res.json();
        allItems.push(...(data.items || []));
      }

      const seen = new Set<string>();
      const deduped = allItems.filter((item) => {
        const key = item.name.toLowerCase().trim();
        if (seen.has(key)) return false;
        seen.add(key); return true;
      });

      const withDescriptions = await Promise.all(
        deduped.map(async (item) => {
          if (!item.description.trim()) {
            const res = await fetch('/api/generate-description', {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ name: item.name, category: item.category }),
            });
            const data = await res.json();
            return { ...item, description: data.description || '' };
          }
          return item;
        })
      );

      await fetch('/api/dashboard/ai-import-count', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ restaurantId }),
      });
      setImportCount(count + 1);
      setItems(withDescriptions);
      setStep(3);
      success(`Extracted ${withDescriptions.length} items!`);
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Failed to extract menu');
    } finally {
      setExtracting(false);
    }
  }

  function updateItem(index: number, field: keyof MenuItemDraft, value: string | number) {
    setItems((prev) => { const updated = [...prev]; updated[index] = { ...updated[index], [field]: value }; return updated; });
  }

  function updatePricingField(index: number, tier: keyof PricingTiers, value: string) {
    setItems((prev) => {
      const updated = [...prev];
      const currentPricing = updated[index].pricing ?? {};
      const numVal = parseFloat(value);
      const newPricing: PricingTiers = { ...currentPricing };
      if (!value || isNaN(numVal)) {
        delete newPricing[tier];
      } else {
        newPricing[tier] = numVal;
      }
      const basePrice = basePriceFromTiers(newPricing);
      updated[index] = { ...updated[index], pricing: newPricing, price: basePrice };
      return updated;
    });
  }

  function removeItem(index: number) { setItems((prev) => prev.filter((_, i) => i !== index)); }
  function addEmptyRow() {
    setItems((prev) => [...prev, { name: '', category: categories[0]?.name || 'General', price: 0, pricing: { full: 0 }, description: '' }]);
  }

  async function handleSaveAll() {
    const validItems = items.filter((i) => i.name.trim() && i.price >= 0);
    if (validItems.length === 0) { toastError('No valid items to save'); return; }
    setSaving(true);
    try {
      await Promise.all(validItems.map((item, index) =>
        fetch('/api/dashboard/menu', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'add',
            data: {
              name: item.name.trim(),
              category: item.category || 'General',
              price: Number(item.price),
              pricing: item.pricing ?? { full: Number(item.price) },
              description: item.description,
              image_url: null,
              is_available: true,
              like_count: 0,
              avg_rating: 0,
              review_count: 0,
              display_order: Date.now() + index,
            },
          }),
        })
      ));

      const existingCatNames = new Set(categories.map((c) => c.name.toLowerCase()));
      const newCatNames = [...new Set(validItems.map((i) => i.category || 'General'))].filter((name) => name && !existingCatNames.has(name.toLowerCase()));
      if (newCatNames.length > 0) {
        await Promise.all(newCatNames.map((name) =>
          fetch('/api/dashboard/categories', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'add', name }) })
        ));
      }

      setStep(4);
      success(`${validItems.length} items saved${newCatNames.length > 0 ? ` + ${newCatNames.length} new categories created` : ''}!`);
    } catch { toastError('Failed to save items'); }
    finally { setSaving(false); }
  }

  const remainingImports = MAX_IMPORTS_PER_MONTH - importCount;

  const cellStyle: React.CSSProperties = { padding: '6px 8px', verticalAlign: 'top' };
  const inlineInputStyle: React.CSSProperties = {
    width: '100%',
    background: 'transparent',
    color: 'var(--db-text)',
    border: 'none',
    borderBottom: '1.5px solid var(--db-border)',
    outline: 'none',
    padding: '3px 0',
    fontSize: '0.82rem',
  };
  const priceTierInputStyle: React.CSSProperties = {
    ...inlineInputStyle,
    width: 54,
    textAlign: 'right',
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="AI Import from Photo" size="xl">

      {/* Step indicator */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20, paddingBottom: 20, borderBottom: '1px solid var(--db-border)' }}>
        {[1, 2, 3, 4].map((s) => (
          <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: 26, height: 26, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '0.75rem', fontWeight: 700,
              background: step === s ? 'var(--db-accent)' : step > s ? '#f0fdf4' : 'var(--db-surface-2)',
              color: step === s ? '#fff' : step > s ? '#16a34a' : 'var(--db-text-muted)',
              border: step > s ? '1px solid #bbf7d0' : step === s ? 'none' : '1px solid var(--db-border)',
            }}>
              {step > s ? '✓' : s}
            </div>
            {s < 4 && <div style={{ width: 24, height: 1, background: step > s ? '#bbf7d0' : 'var(--db-border)' }} />}
          </div>
        ))}
        <p style={{ marginLeft: 8, fontSize: '0.8rem', color: 'var(--db-text-muted)', fontWeight: 500 }}>
          {stepLabels[step - 1]}
        </p>
      </div>

      {/* Step 1: Upload */}
      {step === 1 && (
        <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ fontSize: '0.875rem', color: 'var(--db-text-2)' }}>
            Upload photos of your existing menu (up to 5). Our AI will extract all items and their pricing tiers (Full/Half/Qtr) automatically.
            <span style={{ display: 'block', marginTop: 4, fontSize: '0.8rem', color: 'var(--db-text-muted)' }}>
              Imports remaining this month: <strong style={{ color: remainingImports <= 0 ? 'var(--db-red)' : 'var(--db-green)' }}>{remainingImports <= 0 ? '0 (limit reached)' : remainingImports}</strong>
            </span>
          </div>

          <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" multiple style={{ display: 'none' }}
            onChange={(e) => setPhotos(Array.from(e.target.files || []).slice(0, 5))} />

          {/* Drop zone */}
          <div
            onClick={() => fileInputRef.current?.click()}
            style={{
              border: '2px dashed var(--db-border-2)', borderRadius: 14, padding: '32px 20px', textAlign: 'center',
              cursor: 'pointer', transition: 'border-color 0.18s, background 0.18s',
              background: photos.length > 0 ? 'var(--db-accent-light)' : 'var(--db-surface-2)',
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--db-accent)'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--db-border-2)'; }}
          >
            <Upload size={30} style={{ color: 'var(--db-accent)', margin: '0 auto 10px' }} />
            <p style={{ fontWeight: 600, color: 'var(--db-text)', marginBottom: 4 }}>Click to upload menu photos</p>
            <p style={{ fontSize: '0.82rem', color: 'var(--db-text-muted)' }}>JPG, PNG, WebP · Up to 5 photos</p>
          </div>

          {photos.length > 0 && (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {photos.map((p, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: 8, background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
                  <span style={{ color: '#16a34a', fontSize: '0.8rem' }}>✓</span>
                  <span style={{ fontSize: '0.82rem', color: 'var(--db-text-2)', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
                </div>
              ))}
            </div>
          )}

          <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
            <Button variant="ghost" fullWidth onClick={handleClose}>Cancel</Button>
            <Button fullWidth leftIcon={<Wand2 size={15} />}
              disabled={photos.length === 0 || remainingImports <= 0}
              onClick={handleExtract} loading={extracting}>
              Extract Menu
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Review & Edit */}
      {step === 3 && (
        <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <p style={{ fontSize: '0.875rem', color: 'var(--db-text-2)' }}>
              <strong style={{ color: 'var(--db-accent)' }}>{items.length}</strong> items extracted — review and edit before saving
            </p>
            <Button variant="outline" size="sm" leftIcon={<Plus size={13} />} onClick={addEmptyRow}>Add Row</Button>
          </div>

          {/* Pricing legend */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', fontSize: '0.75rem', color: 'var(--db-text-muted)' }}>
            <span style={{ fontWeight: 600 }}>Price columns:</span>
            <span>Full = full plate</span>
            <span>·</span>
            <span>Half = half plate</span>
            <span>·</span>
            <span>Qtr = quarter plate</span>
            <span>·</span>
            <span>Pc = per piece</span>
            <span style={{ color: 'var(--db-text-muted)', fontStyle: 'italic' }}>(leave blank if not applicable)</span>
          </div>

          {/* Table */}
          <div style={{ overflowX: 'auto', maxHeight: 380, overflowY: 'auto', borderRadius: 12, border: '1px solid var(--db-border)' }}>
            <table style={{ width: '100%', fontSize: '0.82rem', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--db-surface-2)', position: 'sticky', top: 0, zIndex: 1 }}>
                  {['Name', 'Category', 'Full ₹', 'Half ₹', 'Qtr ₹', 'Pc ₹', 'Description', ''].map((h) => (
                    <th key={h} style={{ textAlign: h === 'Full ₹' || h === 'Half ₹' || h === 'Qtr ₹' || h === 'Pc ₹' ? 'right' : 'left', padding: '8px 8px', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--db-text-muted)', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map((item, i) => (
                  <tr key={i} style={{ borderTop: '1px solid var(--db-border)' }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--db-surface-2)'; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = ''; }}>
                    <td style={cellStyle}>
                      <input value={item.name} onChange={(e) => updateItem(i, 'name', e.target.value)}
                        style={{ ...inlineInputStyle, minWidth: 100 }}
                        onFocus={(e) => (e.target.style.borderBottomColor = 'var(--db-accent)')}
                        onBlur={(e) => (e.target.style.borderBottomColor = 'var(--db-border)')} />
                    </td>
                    <td style={cellStyle}>
                      <input value={item.category} onChange={(e) => updateItem(i, 'category', e.target.value)}
                        style={{ ...inlineInputStyle, minWidth: 80 }}
                        onFocus={(e) => (e.target.style.borderBottomColor = 'var(--db-accent)')}
                        onBlur={(e) => (e.target.style.borderBottomColor = 'var(--db-border)')} />
                    </td>
                    {/* Full */}
                    <td style={{ ...cellStyle, textAlign: 'right' }}>
                      <input type="number" min="0"
                        value={item.pricing?.full !== undefined ? item.pricing.full : (item.price > 0 && !item.pricing?.half && !item.pricing?.qtr && !item.pricing?.piece ? item.price : '')}
                        onChange={(e) => updatePricingField(i, 'full', e.target.value)}
                        placeholder="—"
                        style={priceTierInputStyle}
                        onFocus={(e) => (e.target.style.borderBottomColor = 'var(--db-accent)')}
                        onBlur={(e) => (e.target.style.borderBottomColor = 'var(--db-border)')} />
                    </td>
                    {/* Half */}
                    <td style={{ ...cellStyle, textAlign: 'right' }}>
                      <input type="number" min="0"
                        value={item.pricing?.half !== undefined ? item.pricing.half : ''}
                        onChange={(e) => updatePricingField(i, 'half', e.target.value)}
                        placeholder="—"
                        style={priceTierInputStyle}
                        onFocus={(e) => (e.target.style.borderBottomColor = 'var(--db-accent)')}
                        onBlur={(e) => (e.target.style.borderBottomColor = 'var(--db-border)')} />
                    </td>
                    {/* Qtr */}
                    <td style={{ ...cellStyle, textAlign: 'right' }}>
                      <input type="number" min="0"
                        value={item.pricing?.qtr !== undefined ? item.pricing.qtr : ''}
                        onChange={(e) => updatePricingField(i, 'qtr', e.target.value)}
                        placeholder="—"
                        style={priceTierInputStyle}
                        onFocus={(e) => (e.target.style.borderBottomColor = 'var(--db-accent)')}
                        onBlur={(e) => (e.target.style.borderBottomColor = 'var(--db-border)')} />
                    </td>
                    {/* Per Piece */}
                    <td style={{ ...cellStyle, textAlign: 'right' }}>
                      <input type="number" min="0"
                        value={item.pricing?.piece !== undefined ? item.pricing.piece : ''}
                        onChange={(e) => updatePricingField(i, 'piece', e.target.value)}
                        placeholder="—"
                        style={priceTierInputStyle}
                        onFocus={(e) => (e.target.style.borderBottomColor = 'var(--db-accent)')}
                        onBlur={(e) => (e.target.style.borderBottomColor = 'var(--db-border)')} />
                    </td>
                    <td style={cellStyle}>
                      <input value={item.description} onChange={(e) => updateItem(i, 'description', e.target.value)}
                        style={{ ...inlineInputStyle, minWidth: 160 }}
                        onFocus={(e) => (e.target.style.borderBottomColor = 'var(--db-accent)')}
                        onBlur={(e) => (e.target.style.borderBottomColor = 'var(--db-border)')} />
                    </td>
                    <td style={cellStyle}>
                      <button onClick={() => removeItem(i)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', lineHeight: 0, color: 'var(--db-text-muted)', transition: 'color 0.15s' }}
                        onMouseEnter={(e) => (e.currentTarget as HTMLElement).style.color = 'var(--db-red)'}
                        onMouseLeave={(e) => (e.currentTarget as HTMLElement).style.color = 'var(--db-text-muted)'}>
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <Button variant="ghost" fullWidth onClick={() => setStep(1)}>Back</Button>
            <Button fullWidth loading={saving} onClick={handleSaveAll}>Save {items.length} Items to Menu</Button>
          </div>
        </div>
      )}

      {/* Step 4: Done */}
      {step === 4 && (
        <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, padding: '24px 0' }}>
          <div style={{ width: 76, height: 76, borderRadius: '50%', background: '#f0fdf4', border: '2px solid #bbf7d0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CheckCircle size={38} style={{ color: '#16a34a' }} />
          </div>
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontWeight: 700, fontSize: '1.2rem', color: 'var(--db-text)', marginBottom: 6, fontFamily: 'var(--db-font-heading)' }}>Menu Imported!</p>
            <p style={{ fontSize: '0.875rem', color: 'var(--db-text-muted)' }}>All items have been added to your menu</p>
          </div>
          <Button fullWidth onClick={() => { handleClose(); onSuccess(); }}>View Menu</Button>
        </div>
      )}
    </Modal>
  );
}
