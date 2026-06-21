'use client';

import { useState, useRef, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { resizeImage, tierDisplayName } from '@/lib/utils';
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

const stepLabels = ['Upload Photos', 'Extracting…', 'Review & Edit', 'Done!'];

/** Compute base price from pricing tiers */
function basePriceFromTiers(pricing?: PricingTiers): number {
  if (!pricing) return 0;
  const std = pricing.full ?? pricing.half ?? pricing.qtr ?? pricing.piece;
  if (std !== undefined) return std;
  const values = Object.values(pricing).filter((v): v is number => typeof v === 'number' && v > 0);
  return values[0] ?? 0;
}

/** Render compact pricing label for a draft item */
function pricingLabel(item: MenuItemDraft): string {
  const p = item.pricing;
  if (!p) return item.price > 0 ? `₹${item.price}` : '—';
  
  const parts: string[] = [];
  if (p.full !== undefined) parts.push(`F:${p.full}`);
  if (p.half !== undefined) parts.push(`H:${p.half}`);
  if (p.qtr !== undefined) parts.push(`Q:${p.qtr}`);
  if (p.piece !== undefined) parts.push(`${p.piece}/pc`);

  // Custom tiers
  const stdKeys = ['full', 'half', 'qtr', 'piece'];
  Object.entries(p).forEach(([key, val]) => {
    if (!stdKeys.includes(key) && typeof val === 'number') {
      const label = key.charAt(0).toUpperCase() + key.slice(1);
      parts.push(`${label}:${val}`);
    }
  });

  return parts.join(' · ') || (item.price > 0 ? `₹${item.price}` : '—');
}

export function AIImportModal({ isOpen, onClose, onSuccess, restaurantId, categories }: Props) {
  const { success, error: toastError } = useToast();
  const [step, setStep] = useState<Step>(1);
  const [photos, setPhotos] = useState<File[]>([]);
  const [extracting, setExtracting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [items, setItems] = useState<MenuItemDraft[]>([]);
  const [importCount, setImportCount] = useState(0);
  const [importLimit, setImportLimit] = useState(5);
  const [countLoading, setCountLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Which item row is being expanded for pricing edit
  const [expandedRow, setExpandedRow] = useState<number | null>(null);

  function handleClose() { setStep(1); setPhotos([]); setItems([]); setExpandedRow(null); onClose(); }

  // Fetch the real import count as soon as the modal opens
  useEffect(() => {
    if (!isOpen || !restaurantId) return;
    setCountLoading(true);
    fetch(`/api/dashboard/ai-import-count?restaurantId=${restaurantId}`)
      .then((r) => r.json())
      .then((d) => {
        setImportCount(d.count ?? 0);
        setImportLimit(d.limit ?? 5);
      })
      .catch(() => { /* leave defaults */ })
      .finally(() => setCountLoading(false));
  }, [isOpen, restaurantId]);

  async function handleExtract() {
    if (photos.length === 0) { toastError('Please upload at least one photo'); return; }
    // Re-check the latest count from the server before proceeding
    const countRes = await fetch(`/api/dashboard/ai-import-count?restaurantId=${restaurantId}`);
    const countData = await countRes.json();
    const count = countData.count ?? 0;
    const limit = countData.limit ?? importLimit;
    setImportCount(count);
    setImportLimit(limit);
    if (count >= limit) { toastError(`Monthly limit reached (${limit} imports/month)`); return; }

    setExtracting(true);
    try {
      const allItems: MenuItemDraft[] = [];
      for (const photo of photos) {
        const base64 = await resizeImage(photo, 1024);
        const res = await fetch('/api/extract-menu', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: base64, restaurantId }),
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

      // Descriptions are written by the vision model in the same extraction pass.
      // No secondary API loop needed.
      await fetch('/api/dashboard/ai-import-count', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ restaurantId }),
      });
      setImportCount(count + 1);
      setImportLimit(limit);
      setItems(deduped);
      setStep(3);
      success(`Extracted ${deduped.length} items!`);
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Failed to extract menu');
    } finally {
      setExtracting(false);
    }
  }

  function updateItem(index: number, field: keyof MenuItemDraft, value: string | number) {
    setItems((prev) => { const updated = [...prev]; updated[index] = { ...updated[index], [field]: value }; return updated; });
  }

  function updatePricingField(index: number, tier: string, value: string) {
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
      // Build a lookup map: lowercase name → canonical name already in Firestore
      // This ensures the category string on each item EXACTLY matches the Firestore
      // category document name so the === comparison in the categories API finds them.
      const existingCatMap = new Map(categories.map((c) => [c.name.toLowerCase().trim(), c.name]));

      // Normalise each item's category to the existing canonical name if one exists
      const normalizedItems = validItems.map((item) => {
        const raw = (item.category || 'General').trim();
        const canonical = existingCatMap.get(raw.toLowerCase()) ?? raw;
        return { ...item, category: canonical };
      });

      await Promise.all(normalizedItems.map((item, index) =>
        fetch('/api/dashboard/menu', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'add',
            data: {
              name: item.name.trim(),
              category: item.category,
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

      // Only create categories whose canonical name doesn't already exist in Firestore
      const usedCatNames = [...new Set(normalizedItems.map((i) => i.category))];
      const newCatNames = usedCatNames.filter((name) => name && !existingCatMap.has(name.toLowerCase().trim()));
      if (newCatNames.length > 0) {
        await Promise.all(newCatNames.map((name) =>
          fetch('/api/dashboard/categories', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'add', name }) })
        ));
      }

      setStep(4);
      success(`${normalizedItems.length} items saved${newCatNames.length > 0 ? ` + ${newCatNames.length} new categories created` : ''}!`);
    } catch { toastError('Failed to save items'); }
    finally { setSaving(false); }
  }


  const remainingImports = importLimit - importCount;

  // Compute the precise set of pricing columns to show.
  // Rules:
  //  1. A standard key (full/half/qtr/piece) is shown ONLY if at least one item has a non-zero value for it.
  //  2. 'full' is ALWAYS included as a fallback (manually-added rows need somewhere to enter a single price).
  //  3. All custom size keys (small/medium/large/7inch/...) used by any item are included.
  //  4. This avoids showing empty Half/Qtr columns when the menu is pizza-only.
  const usedKeys = new Set<string>();
  items.forEach((item) => {
    if (item.pricing) {
      Object.entries(item.pricing).forEach(([k, v]) => {
        if (typeof v === 'number' && v > 0) usedKeys.add(k);
      });
    }
  });

  const defaultKeys = ['full', 'half', 'qtr', 'piece'];
  const displayPricingKeys = [
    // Always include 'full' — single-price items (sandwiches, curries without tiers) land here
    'full',
    // Other standard keys only if at least one item actually uses them
    ...['half', 'qtr', 'piece'].filter((k) => usedKeys.has(k)),
    // Custom size keys (small / medium / large / 7inch / ...)
    ...Array.from(usedKeys).filter((k) => !defaultKeys.includes(k)),
  ];

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
            Upload photos of your existing menu (up to 5). Our AI will extract items, pricing tiers (Full/Half/Qtr), pizza sizes (S/M/L, 7"/9"), per-piece prices (breads/rotis), and add-on sections.
            <span style={{ display: 'block', marginTop: 4, fontSize: '0.8rem', color: 'var(--db-text-muted)' }}>
              Imports remaining this month:{' '}
              {countLoading
                ? <span style={{ display: 'inline-block', width: 48, height: 14, borderRadius: 4, background: 'var(--db-border)', verticalAlign: 'middle', animation: 'pulse 1.2s ease-in-out infinite' }} />
                : <strong style={{ color: remainingImports <= 0 ? 'var(--db-red)' : 'var(--db-green)' }}>{remainingImports <= 0 ? `0 / ${importLimit} (limit reached)` : `${remainingImports} / ${importLimit}`}</strong>
              }
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
              disabled={photos.length === 0 || remainingImports <= 0 || countLoading}
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
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', fontSize: '0.75rem', color: 'var(--db-text-muted)', alignItems: 'center' }}>
            <span style={{ fontWeight: 600 }}>Price columns:</span>
            {displayPricingKeys.map((key, idx) => {
              const LONG: Record<string, string> = {
                full: 'single / full plate', half: 'half plate', qtr: 'quarter', piece: 'per piece / add-on',
                small: 'Small size', medium: 'Medium size', large: 'Large size', xlarge: 'XL size',
                regular: 'Regular size', family: 'Family size',
              };
              const inchM = key.match(/^(\d+)inch$/);
              const desc = inchM ? `${inchM[1]}" pizza` : (LONG[key] ?? key);
              return (
                <span key={key} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  {idx > 0 && <span style={{ color: 'var(--db-border-2)' }}>·</span>}
                  <span style={{ fontWeight: 600, color: 'var(--db-accent)' }}>{tierDisplayName(key)}</span>
                  <span>= {desc}</span>
                </span>
              );
            })}
            <span style={{ fontStyle: 'italic', marginLeft: 4 }}>— auto-filled from image; edit if wrong</span>
          </div>

          {/* Table */}
          <div style={{ overflowX: 'auto', maxHeight: 380, overflowY: 'auto', borderRadius: 12, border: '1px solid var(--db-border)' }}>
            <table style={{ width: '100%', fontSize: '0.82rem', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--db-surface-2)', position: 'sticky', top: 0, zIndex: 1 }}>
                  <th style={{ textAlign: 'left', padding: '8px 8px', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--db-text-muted)', whiteSpace: 'nowrap' }}>Name</th>
                  <th style={{ textAlign: 'left', padding: '8px 8px', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--db-text-muted)', whiteSpace: 'nowrap' }}>Category</th>
                  {displayPricingKeys.map((key) => {
                    return (
                      <th key={key} style={{ textAlign: 'right', padding: '8px 8px', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--db-text-muted)', whiteSpace: 'nowrap' }}>
                        {tierDisplayName(key)} ₹
                      </th>
                    );
                  })}
                  <th style={{ textAlign: 'left', padding: '8px 8px', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--db-text-muted)', whiteSpace: 'nowrap' }}>Description</th>
                  <th style={{ textAlign: 'left', padding: '8px 8px', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--db-text-muted)', whiteSpace: 'nowrap' }}></th>
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
                    {displayPricingKeys.map((key) => {
                      let valStr = '';
                      if (item.pricing?.[key] !== undefined) {
                        valStr = String(item.pricing[key]);
                      } else if (key === 'full' && item.price > 0 && !item.pricing?.half && !item.pricing?.qtr && !item.pricing?.piece) {
                        const customKeysExist = Object.keys(item.pricing || {}).some(k => !defaultKeys.includes(k));
                        if (!customKeysExist) {
                          valStr = String(item.price);
                        }
                      }
                      return (
                        <td key={key} style={{ ...cellStyle, textAlign: 'right' }}>
                          <input type="number" min="0" step="0.5"
                            value={valStr}
                            onChange={(e) => updatePricingField(i, key, e.target.value)}
                            placeholder="—"
                            style={priceTierInputStyle}
                            onFocus={(e) => (e.target.style.borderBottomColor = 'var(--db-accent)')}
                            onBlur={(e) => (e.target.style.borderBottomColor = 'var(--db-border)')} />
                        </td>
                      );
                    })}
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
