'use client';

import { useState, useEffect, useRef } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { ToastProvider, useToast } from '@/components/ui/Toast';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { StarRating } from '@/components/ui/StarRating';
import { formatPrice, getCategoryIcon } from '@/lib/utils';
import { Plus, Camera, Heart, ToggleLeft, ToggleRight, Pencil, Trash2, Search, Check } from 'lucide-react';
import { AddItemModal } from './_components/AddItemModal';
import { AIImportModal } from './_components/AIImportModal';
import Image from 'next/image';

interface PricingTiers {
  full?: number;
  half?: number;
  qtr?: number;
  piece?: number;
}

interface MenuItem {
  id: string; name: string; category: string; price: number;
  pricing?: PricingTiers;
  description: string; image_url: string | null; is_available: boolean;
  like_count: number; avg_rating: number; review_count: number; display_order: number;
}

/** Render compact pricing display for the dashboard card */
function PriceDisplay({ item }: { item: MenuItem }) {
  const p = item.pricing;
  if (!p || (!p.full && !p.half && !p.qtr && !p.piece)) {
    return <p style={{ fontWeight: 700, color: 'var(--db-text)', flexShrink: 0, fontSize: '0.97rem' }}>{formatPrice(item.price)}</p>;
  }
  const tiers: { label: string; value: number }[] = [];
  if (p.full !== undefined) tiers.push({ label: 'Full', value: p.full });
  if (p.half !== undefined) tiers.push({ label: 'Half', value: p.half });
  if (p.qtr !== undefined) tiers.push({ label: 'Qtr', value: p.qtr });
  if (p.piece !== undefined) tiers.push({ label: 'Pc', value: p.piece });
  if (tiers.length === 1) {
    const suffix = p.piece !== undefined ? '/pc' : '';
    return <p style={{ fontWeight: 700, color: 'var(--db-text)', flexShrink: 0, fontSize: '0.97rem' }}>{formatPrice(tiers[0].value)}{suffix}</p>;
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'flex-end', flexShrink: 0 }}>
      {tiers.map((t) => (
        <span key={t.label} style={{ fontSize: '0.75rem', color: 'var(--db-text)', fontWeight: 600, whiteSpace: 'nowrap' }}>
          <span style={{ color: 'var(--db-text-muted)', fontWeight: 400, fontSize: '0.7rem' }}>{t.label} </span>
          {formatPrice(t.value)}
        </span>
      ))}
    </div>
  );
}

interface Category { id: string; name: string; display_order: number; }

function MenuContent() {
  const { success, error: toastError } = useToast();
  const [restaurantId, setRestaurantId] = useState('');
  const [items, setItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAIModal, setShowAIModal] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const selectAllRef = useRef<HTMLInputElement>(null);

  async function loadData() {
    try {
      const res = await fetch('/api/dashboard/menu');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setRestaurantId(data.restaurantId);
      setItems(data.items);
      setCategories(data.categories);
    } catch (err: unknown) {
      toastError(err instanceof Error ? err.message : 'Failed to load menu');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadData(); }, []);
  useEffect(() => { setSelectedIds(new Set()); }, [activeCategory, searchQuery]);

  const categoryNames = [...new Set(items.map((i) => i.category))];
  const filteredItems = items.filter((item) => {
    const matchesCat = activeCategory === 'All' || item.category === activeCategory;
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  useEffect(() => {
    if (!selectAllRef.current) return;
    const anySelected = filteredItems.some((i) => selectedIds.has(i.id));
    const allSelected = filteredItems.length > 0 && filteredItems.every((i) => selectedIds.has(i.id));
    selectAllRef.current.indeterminate = anySelected && !allSelected;
    selectAllRef.current.checked = allSelected;
  }, [selectedIds, filteredItems]);

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    const allSelected = filteredItems.length > 0 && filteredItems.every((i) => selectedIds.has(i.id));
    if (allSelected) {
      setSelectedIds((prev) => { const next = new Set(prev); filteredItems.forEach((i) => next.delete(i.id)); return next; });
    } else {
      setSelectedIds((prev) => { const next = new Set(prev); filteredItems.forEach((i) => next.add(i.id)); return next; });
    }
  }

  async function handleToggle(item: MenuItem) {
    setItems((prev) => prev.map((i) => i.id === item.id ? { ...i, is_available: !i.is_available } : i));
    try {
      await fetch('/api/dashboard/menu', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'toggle', itemId: item.id, data: { is_available: !item.is_available } }),
      });
    } catch {
      setItems((prev) => prev.map((i) => i.id === item.id ? { ...i, is_available: item.is_available } : i));
      toastError('Failed to toggle availability');
    }
  }

  async function handleDelete(itemId: string) {
    if (!confirm('Delete this item?')) return;
    setItems((prev) => prev.filter((i) => i.id !== itemId));
    try {
      await fetch('/api/dashboard/menu', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', itemId }),
      });
      success('Item deleted');
    } catch {
      toastError('Failed to delete item');
      loadData();
    }
  }

  async function handleBulkDelete() {
    const ids = [...selectedIds];
    if (ids.length === 0) return;
    if (!confirm(`Delete ${ids.length} selected item${ids.length > 1 ? 's' : ''}? This cannot be undone.`)) return;
    setBulkDeleting(true);
    setItems((prev) => prev.filter((i) => !selectedIds.has(i.id)));
    setSelectedIds(new Set());
    try {
      const res = await fetch('/api/dashboard/menu', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'bulk_delete', itemIds: ids }),
      });
      if (!res.ok) throw new Error();
      success(`${ids.length} item${ids.length > 1 ? 's' : ''} deleted`);
    } catch {
      toastError('Failed to delete items');
      loadData();
    } finally {
      setBulkDeleting(false);
    }
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 256 }}>
          <div style={{ width: 32, height: 32, border: '3px solid var(--db-border)', borderTopColor: 'var(--db-accent)', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </DashboardLayout>
    );
  }

  const allInViewSelected = filteredItems.length > 0 && filteredItems.every((i) => selectedIds.has(i.id));

  return (
    <DashboardLayout>
      <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 20, paddingBottom: 96 }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ fontSize: '1.7rem', fontWeight: 700, color: 'var(--db-text)', marginBottom: 2 }}>Menu</h1>
            <p style={{ fontSize: '0.85rem', color: 'var(--db-text-muted)' }}>{items.length} items across {categoryNames.length} categories</p>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <Button variant="outline" leftIcon={<Camera size={15} />} onClick={() => setShowAIModal(true)}>Import from Photo</Button>
            <Button leftIcon={<Plus size={15} />} onClick={() => { setEditingItem(null); setShowAddModal(true); }}>Add Item</Button>
          </div>
        </div>

        {/* Search */}
        <div style={{ position: 'relative' }}>
          <Search size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--db-text-muted)', pointerEvents: 'none' }} />
          <input
            type="search"
            placeholder="Search menu items…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="db-search"
          />
        </div>

        {/* Category tabs */}
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 2 }}>
          {['All', ...categoryNames].map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`db-tab${activeCategory === cat ? ' active' : ''}`}
            >
              {cat === 'All' ? '🍽️ All' : `${getCategoryIcon(cat)} ${cat}`}
              {cat !== 'All' && (
                <span style={{ marginLeft: 4, fontSize: '0.75rem', opacity: 0.7 }}>
                  ({items.filter((i) => i.category === cat).length})
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Items */}
        {filteredItems.length === 0 ? (
          <div className="db-card" style={{ padding: '48px 24px', textAlign: 'center' }}>
            <p style={{ fontSize: 48, marginBottom: 12 }}>🍽️</p>
            <p style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--db-text)', marginBottom: 6 }}>No items yet</p>
            <p style={{ fontSize: '0.875rem', color: 'var(--db-text-muted)', marginBottom: 20 }}>Add your first menu item or import from a photo using AI</p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <Button variant="outline" leftIcon={<Camera size={15} />} onClick={() => setShowAIModal(true)}>Import from Photo</Button>
              <Button leftIcon={<Plus size={15} />} onClick={() => setShowAddModal(true)}>Add Manually</Button>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {/* Select all row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 4px' }}>
              <div
                onClick={toggleSelectAll}
                className={`db-checkbox${allInViewSelected ? ' checked' : selectedIds.size > 0 ? ' indeterminate' : ''}`}
                style={selectedIds.size > 0 && !allInViewSelected ? { background: 'rgba(200,98,42,0.2)', borderColor: 'var(--db-accent)' } : {}}
              >
                {(allInViewSelected || selectedIds.size > 0) && <Check size={11} style={{ color: allInViewSelected ? '#fff' : 'var(--db-accent)' }} />}
              </div>
              <input ref={selectAllRef} type="checkbox" className="sr-only" onChange={toggleSelectAll} />
              <span style={{ fontSize: '0.85rem', color: 'var(--db-text-muted)', cursor: 'pointer' }} onClick={toggleSelectAll}>
                {allInViewSelected ? 'Deselect all' : 'Select all'} ({filteredItems.length})
              </span>
            </div>

            {filteredItems.map((item) => {
              const isSelected = selectedIds.has(item.id);
              return (
                <div
                  key={item.id}
                  className="db-card db-card-hover"
                  style={{
                    padding: '14px 16px',
                    display: 'flex',
                    gap: 14,
                    opacity: item.is_available ? 1 : 0.65,
                    outline: isSelected ? '2px solid var(--db-accent)' : 'none',
                    outlineOffset: 1,
                  }}
                >
                  {/* Checkbox */}
                  <div style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                    <div
                      onClick={() => toggleSelect(item.id)}
                      className={`db-checkbox${isSelected ? ' checked' : ''}`}
                    >
                      {isSelected && <Check size={11} style={{ color: '#fff' }} />}
                    </div>
                  </div>

                  {/* Image */}
                  <div style={{ width: 64, height: 64, borderRadius: 12, overflow: 'hidden', background: 'var(--db-surface-2)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {item.image_url
                      ? <Image src={item.image_url} alt={item.name} width={64} height={64} style={{ width: '100%', height: '100%', objectFit: 'cover' }} unoptimized />
                      : <span style={{ fontSize: 26 }}>{getCategoryIcon(item.category)}</span>
                    }
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                      <div style={{ minWidth: 0 }}>
                        <p style={{ fontWeight: 600, color: 'var(--db-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: 'var(--db-font-heading)', fontSize: '0.97rem' }}>{item.name}</p>
                        <p style={{ fontSize: '0.75rem', color: 'var(--db-accent)', marginBottom: 2 }}>{item.category}</p>
                        <p style={{ fontSize: '0.78rem', color: 'var(--db-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.description}</p>
                      </div>
                      <PriceDisplay item={item} />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 8, flexWrap: 'wrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.78rem', color: '#dc2626' }}>
                        <Heart size={12} style={{ fill: '#dc2626' }} /> {item.like_count}
                      </div>
                      {item.review_count > 0 && <StarRating value={item.avg_rating} readonly size="sm" showCount count={item.review_count} />}
                      {!item.is_available && <Badge variant="muted">Unavailable</Badge>}
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0, alignItems: 'center', justifyContent: 'center' }}>
                    <button
                      onClick={() => handleToggle(item)}
                      title={item.is_available ? 'Mark unavailable' : 'Mark available'}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', lineHeight: 0, padding: 4 }}
                    >
                      {item.is_available
                        ? <ToggleRight size={22} style={{ color: 'var(--db-green)' }} />
                        : <ToggleLeft  size={22} style={{ color: 'var(--db-text-muted)' }} />
                      }
                    </button>
                    <button
                      onClick={() => { setEditingItem(item); setShowAddModal(true); }}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', lineHeight: 0, padding: 4, color: 'var(--db-text-muted)', transition: 'color 0.15s' }}
                      onMouseEnter={(e) => (e.currentTarget as HTMLElement).style.color = 'var(--db-accent)'}
                      onMouseLeave={(e) => (e.currentTarget as HTMLElement).style.color = 'var(--db-text-muted)'}
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', lineHeight: 0, padding: 4, color: 'var(--db-text-muted)', transition: 'color 0.15s' }}
                      onMouseEnter={(e) => (e.currentTarget as HTMLElement).style.color = 'var(--db-red)'}
                      onMouseLeave={(e) => (e.currentTarget as HTMLElement).style.color = 'var(--db-text-muted)'}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Bulk delete bar */}
      {selectedIds.size > 0 && (
        <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', zIndex: 50 }} className="animate-fade-in">
          <div className="db-card" style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '12px 20px', borderRadius: 16, boxShadow: '0 8px 32px rgba(28,22,17,0.14)' }}>
            <span style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--db-text)' }}>
              <span style={{ color: 'var(--db-accent)', fontWeight: 700 }}>{selectedIds.size}</span> item{selectedIds.size > 1 ? 's' : ''} selected
            </span>
            <button
              onClick={() => setSelectedIds(new Set())}
              style={{ fontSize: '0.8rem', color: 'var(--db-text-muted)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: 2 }}
            >
              Clear
            </button>
            <Button variant="danger" size="sm" leftIcon={<Trash2 size={14} />} loading={bulkDeleting} onClick={handleBulkDelete}>
              Delete {selectedIds.size} item{selectedIds.size > 1 ? 's' : ''}
            </Button>
          </div>
        </div>
      )}

      {restaurantId && (
        <>
          <AddItemModal
            isOpen={showAddModal}
            onClose={() => { setShowAddModal(false); setEditingItem(null); }}
            onSuccess={() => { setShowAddModal(false); setEditingItem(null); loadData(); }}
            restaurantId={restaurantId}
            categories={categories}
            editItem={editingItem}
          />
          <AIImportModal
            isOpen={showAIModal}
            onClose={() => setShowAIModal(false)}
            onSuccess={() => { setShowAIModal(false); loadData(); }}
            restaurantId={restaurantId}
            categories={categories}
          />
        </>
      )}
    </DashboardLayout>
  );
}

export default function MenuPage() {
  return <ToastProvider><MenuContent /></ToastProvider>;
}
