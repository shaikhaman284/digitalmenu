'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Image from 'next/image';
import { Heart, MapPin, Star, MessageSquare, Search, Flame, X, ChevronDown } from 'lucide-react';
import { getVisitorToken, getCategoryIcon } from '@/lib/utils';
import { ReviewSheet } from './ReviewSheet';
import type { Restaurant, MenuItem, Category, PricingTiers } from '@/types';

interface Props {
  restaurant: Restaurant;
  categories: Category[];
  initialItems: MenuItem[];
}

// ─── Pricing helpers ──────────────────────────────────────────────────────────

/** Render pricing tiers as compact stacked badges — never overflows card */
function PriceBadges({ item }: { item: MenuItem }) {
  const p = item.pricing;
  const priceColor = '#c8622a';
  const labelColor = '#9c8e7a';

  if (!p || (!p.full && !p.half && !p.qtr && !p.piece)) {
    return <span style={{ fontWeight: 700, fontSize: '0.9rem', color: priceColor, whiteSpace: 'nowrap' }}>₹{item.price}</span>;
  }

  const tiers: { label: string; value: number }[] = [];
  if (p.full  !== undefined) tiers.push({ label: 'Full',  value: p.full });
  if (p.half  !== undefined) tiers.push({ label: 'Half',  value: p.half });
  if (p.qtr   !== undefined) tiers.push({ label: 'Qtr',   value: p.qtr });
  if (p.piece !== undefined) tiers.push({ label: '/pc',   value: p.piece });

  if (tiers.length === 1) {
    const suffix = p.piece !== undefined ? '/pc' : '';
    return <span style={{ fontWeight: 700, fontSize: '0.9rem', color: priceColor, whiteSpace: 'nowrap' }}>₹{tiers[0].value}{suffix}</span>;
  }

  // Stack tiers vertically — no horizontal overflow
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 1, alignItems: 'flex-end' }}>
      {tiers.map((t) => (
        <span key={t.label} style={{ display: 'inline-flex', alignItems: 'baseline', gap: 3, lineHeight: 1.3 }}>
          <span style={{ fontSize: '0.65rem', color: labelColor, fontWeight: 500, letterSpacing: '0.02em' }}>{t.label}</span>
          <span style={{ fontSize: '0.82rem', fontWeight: 700, color: priceColor, whiteSpace: 'nowrap' }}>₹{t.value}</span>
        </span>
      ))}
    </div>
  );
}

/** Full pricing grid for the item detail modal */
function PricingTable({ item }: { item: MenuItem }) {
  const p = item.pricing;
  if (!p || (!p.full && !p.half && !p.qtr && !p.piece)) {
    return (
      <div style={{ display: 'inline-flex', alignItems: 'center', background: '#fff8f0', border: '1.5px solid #f5d0a0', borderRadius: 12, padding: '8px 20px' }}>
        <span style={{ fontSize: '1.6rem', fontWeight: 800, color: '#c8622a' }}>₹{item.price}</span>
      </div>
    );
  }
  const tiers: { label: string; value: number }[] = [];
  if (p.full  !== undefined) tiers.push({ label: 'Full',      value: p.full });
  if (p.half  !== undefined) tiers.push({ label: 'Half',      value: p.half });
  if (p.qtr   !== undefined) tiers.push({ label: 'Qtr',       value: p.qtr });
  if (p.piece !== undefined) tiers.push({ label: 'Per Piece', value: p.piece });

  if (tiers.length === 1) {
    const suffix = p.piece !== undefined ? '/pc' : '';
    return (
      <div style={{ display: 'inline-flex', alignItems: 'center', background: '#fff8f0', border: '1.5px solid #f5d0a0', borderRadius: 12, padding: '8px 20px' }}>
        <span style={{ fontSize: '1.6rem', fontWeight: 800, color: '#c8622a' }}>₹{tiers[0].value}{suffix}</span>
      </div>
    );
  }
  return (
    <div style={{ display: 'flex', width: '100%', border: '1.5px solid #ece7dc', borderRadius: 14, overflow: 'hidden' }}>
      {tiers.map((t, idx) => (
        <div key={t.label} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '10px 4px', background: idx % 2 === 0 ? '#fff8f0' : '#fdfaf5', borderRight: idx < tiers.length - 1 ? '1px solid #ece7dc' : 'none' }}>
          <span style={{ fontSize: '0.68rem', fontWeight: 600, color: '#9c8e7a', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>{t.label}</span>
          <span style={{ fontSize: '1.1rem', fontWeight: 800, color: '#c8622a' }}>₹{t.value}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function MenuPage({ restaurant, categories, initialItems }: Props) {
  const [items, setItems] = useState<MenuItem[]>(initialItems);
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const [activeCategory, setActiveCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [reviewItem, setReviewItem] = useState<MenuItem | null>(null);
  const [visitorToken, setVisitorToken] = useState('');
  const [likingIds, setLikingIds] = useState<Set<string>>(new Set());
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => { setVisitorToken(getVisitorToken()); }, []);

  useEffect(() => {
    if (!visitorToken || items.length === 0) return;
    const itemIds = items.map((i) => i.id).join(',');
    fetch(`/api/public/like?restaurantId=${restaurant.id}&itemIds=${itemIds}&visitorToken=${visitorToken}`)
      .then((r) => r.json())
      .then((data: { liked: Record<string, boolean> }) => {
        const liked = new Set<string>(Object.entries(data.liked ?? {}).filter(([, v]) => v).map(([k]) => k));
        setLikedIds(liked);
      }).catch(() => {});
  }, [visitorToken, restaurant.id]);

  const handleLike = useCallback(async (item: MenuItem, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!visitorToken || likingIds.has(item.id)) return;
    setLikingIds((prev) => new Set([...prev, item.id]));
    const wasLiked = likedIds.has(item.id);
    setLikedIds((prev) => { const n = new Set(prev); wasLiked ? n.delete(item.id) : n.add(item.id); return n; });
    setItems((prev) => prev.map((i) => i.id === item.id ? { ...i, like_count: Math.max(0, i.like_count + (wasLiked ? -1 : 1)) } : i));
    setSelectedItem((prev) => prev?.id === item.id ? { ...prev, like_count: Math.max(0, prev.like_count + (wasLiked ? -1 : 1)) } : prev);
    try {
      const res = await fetch('/api/public/like', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ restaurantId: restaurant.id, itemId: item.id, visitorToken }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
    } catch {
      setLikedIds((prev) => { const n = new Set(prev); wasLiked ? n.add(item.id) : n.delete(item.id); return n; });
      setItems((prev) => prev.map((i) => i.id === item.id ? { ...i, like_count: Math.max(0, i.like_count + (wasLiked ? 1 : -1)) } : i));
    } finally {
      setLikingIds((prev) => { const n = new Set(prev); n.delete(item.id); return n; });
    }
  }, [visitorToken, likedIds, likingIds, restaurant.id]);

  const mostLoved = useMemo(() => [...items].sort((a, b) => (b.like_count || 0) - (a.like_count || 0))[0], [items]);

  const categoryNames = useMemo(() => {
    // Firestore categories are canonical — use their exact names.
    // Items may have category strings that differ only in casing; deduplicate
    // case-insensitively so no tab appears twice in the filter bar.
    const seen = new Map<string, string>(); // lowercase → canonical
    for (const c of categories) seen.set(c.name.toLowerCase().trim(), c.name);
    for (const i of items) {
      const lower = i.category.toLowerCase().trim();
      if (!seen.has(lower)) seen.set(lower, i.category);
    }
    return [...seen.values()];
  }, [categories, items]);

  const filteredItems = useMemo(() =>
    items.filter((item) => {
      const matchesCat = activeCategory === 'All' || item.category.toLowerCase().trim() === activeCategory.toLowerCase().trim();
      const q = searchQuery.toLowerCase();
      const matchesSearch = !q || item.name.toLowerCase().includes(q) || (item.description ?? '').toLowerCase().includes(q);
      return matchesCat && matchesSearch;
    }),
    [items, activeCategory, searchQuery]
  );

  function handleReviewSubmit(updatedItem: Partial<MenuItem> & { id: string }) {
    setItems((prev) => prev.map((i) => (i.id === updatedItem.id ? { ...i, ...updatedItem } : i)));
    setSelectedItem((prev) => prev?.id === updatedItem.id ? { ...prev, ...updatedItem } : prev);
    setReviewItem(null);
  }

  function openItemModal(item: MenuItem) {
    setSelectedItem(item);
    setModalVisible(true);
    document.body.style.overflow = 'hidden';
  }

  function closeItemModal() {
    setModalVisible(false);
    setTimeout(() => { setSelectedItem(null); document.body.style.overflow = ''; }, 320);
  }

  const modalItem = selectedItem ? (items.find((i) => i.id === selectedItem.id) ?? selectedItem) : null;

  return (
    <div className="menu-theme animate-fade-in">

      {/* ── Hero Banner ─────────────────────────────────────── */}
      <div className="mf-hero-banner">
        {/* Full-width restaurant image / gradient backdrop */}
        <div className="mf-hero-img-wrap">
          {restaurant.logo_url ? (
            <Image
              src={restaurant.logo_url}
              alt={restaurant.name}
              fill
              style={{ objectFit: 'cover', objectPosition: 'center' }}
              priority
            />
          ) : (
            <div className="mf-hero-fallback">🍽️</div>
          )}
          {/* Gradient overlay so text is readable */}
          <div className="mf-hero-overlay" />
        </div>

        {/* Text content sits on top */}
        <div className="mf-hero-content">
          <h1 className="mf-hero-name">{restaurant.name}</h1>
          {restaurant.location && (
            <div className="mf-hero-location">
              <MapPin size={13} />
              <span>{restaurant.location}</span>
            </div>
          )}
          {/* Decorative rule */}
          <div className="mf-hero-rule">
            <div className="mf-hero-rule-line" />
            <span>✦</span>
            <div className="mf-hero-rule-line" />
          </div>
        </div>
      </div>

      {/* ── Most Loved Banner ───────────────────────────────── */}
      {mostLoved && mostLoved.like_count > 0 && (
        <div style={{ padding: '12px 14px 0' }}>
          <div className="mf-hot-card" onClick={() => openItemModal(mostLoved)}>
            <div className="mf-hot-badge"><Flame size={11} /> Most Loved</div>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <div className="mf-hot-img">
                {mostLoved.image_url
                  ? <Image src={mostLoved.image_url} alt={mostLoved.name} width={72} height={72} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <span style={{ fontSize: 28 }}>{getCategoryIcon(mostLoved.category)}</span>}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <h3 style={{ fontWeight: 700, fontSize: '1rem', color: '#1c1611', marginBottom: 2, fontFamily: 'var(--mf-heading-font)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{mostLoved.name}</h3>
                <p style={{ fontSize: '0.77rem', color: '#9c8e7a', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', lineHeight: 1.4, marginBottom: 6 }}>{mostLoved.description}</p>
                <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 8 }}>
                  <PriceBadges item={mostLoved} />
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#fff0f0', border: '1px solid #fcc', borderRadius: 999, padding: '3px 10px', flexShrink: 0 }}>
                    <Heart size={11} style={{ fill: '#e74c3c', color: '#e74c3c' }} />
                    <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#e74c3c' }}>{mostLoved.like_count}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Search ──────────────────────────────────────────── */}
      <div style={{ padding: '12px 14px 0', position: 'relative' }}>
        <Search size={15} style={{ position: 'absolute', left: 27, top: '50%', transform: 'translateY(-50%)', color: '#9c8e7a', pointerEvents: 'none' }} />
        <input
          type="search"
          className="mf-search"
          placeholder="Search dishes..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* ── Category Tabs ────────────────────────────────────── */}
      <div className="mf-sticky-nav">
        <div style={{ display: 'flex', gap: 7, overflowX: 'auto', paddingBottom: 2 }} className="scrollbar-hide">
          {['All', ...categoryNames].map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`mf-pill${activeCategory === cat ? ' active' : ''}`}
            >
              {cat === 'All' ? 'All' : `${getCategoryIcon(cat)} ${cat}`}
            </button>
          ))}
        </div>
      </div>

      {/* ── Menu Items ──────────────────────────────────────── */}
      <div style={{ padding: '12px 14px 100px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {filteredItems.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '56px 0' }}>
            <p style={{ fontSize: 36, marginBottom: 10 }}>🔍</p>
            <p style={{ color: '#9c8e7a', fontSize: '0.95rem' }}>No items found</p>
          </div>
        ) : (
          filteredItems.map((item) => {
            const isLiked = likedIds.has(item.id);
            return (
              <div
                key={item.id}
                className="mf-card"
                style={{ opacity: item.is_available ? 1 : 0.6, cursor: 'pointer' }}
                onClick={() => openItemModal(item)}
              >
                <div className="mf-item-row">
                  {/* Image — taller for better food showcase */}
                  <div className="mf-item-img">
                    {item.image_url ? (
                      <Image src={item.image_url} alt={item.name} fill className="object-cover" sizes="100px" />
                    ) : (
                      <span style={{ fontSize: 36 }}>{getCategoryIcon(item.category)}</span>
                    )}
                    {!item.is_available && (
                      <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ fontSize: '0.62rem', fontWeight: 700, color: '#9c8e7a', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Unavailable</span>
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="mf-item-body">
                    {/* Top row: name + price */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, marginBottom: 3 }}>
                      <h3 className="mf-item-name">{item.name}</h3>
                      {/* Price: fixed-width column so it never pushes name */}
                      <div style={{ flexShrink: 0, textAlign: 'right' }}>
                        <PriceBadges item={item} />
                      </div>
                    </div>

                    <p className="mf-item-desc">{item.description}</p>

                    {/* Rating */}
                    {item.review_count > 0 && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 5 }}>
                        <Star size={11} style={{ fill: '#d4a853', color: '#d4a853' }} />
                        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#d4a853' }}>{item.avg_rating?.toFixed(1)}</span>
                        <span style={{ fontSize: '0.72rem', color: '#9c8e7a' }}>({item.review_count})</span>
                      </div>
                    )}

                    {/* Actions */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 8 }}>
                      <button className="mf-review-btn" onClick={(e) => { e.stopPropagation(); setReviewItem(item); }}>
                        <MessageSquare size={11} /> Review
                      </button>
                      <button
                        className={`mf-like${isLiked ? ' liked' : ''}`}
                        onClick={(e) => handleLike(item, e)}
                        disabled={!visitorToken || likingIds.has(item.id)}
                      >
                        <Heart size={12} style={{ fill: isLiked ? '#e74c3c' : 'none', transition: 'all 0.18s' }} />
                        {item.like_count}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ── Footer ──────────────────────────────────────────── */}
      <div className="mf-footer-safe" style={{ position: 'fixed', bottom: 0, left: 0, right: 0, textAlign: 'center', paddingTop: 10, paddingLeft: 16, paddingRight: 16, fontSize: '0.75rem', color: '#9c8e7a', background: 'rgba(253,250,245,0.92)', backdropFilter: 'blur(12px)', borderTop: '1px solid #ece7dc' }}>
        Powered by <a href="/" style={{ color: '#c8622a', fontWeight: 600, textDecoration: 'none' }}>MenuQR</a>
      </div>

      {/* ── Review Sheet ─────────────────────────────────────── */}
      {reviewItem && (
        <ReviewSheet item={reviewItem} restaurantId={restaurant.id} visitorToken={visitorToken} onClose={() => setReviewItem(null)} onReviewSubmit={handleReviewSubmit} />
      )}

      {/* ── Item Detail Modal ─────────────────────────────────── */}
      {(selectedItem || modalItem) && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'flex-end' }}>
          {/* Backdrop */}
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(20,15,10,0.55)', backdropFilter: 'blur(3px)', opacity: modalVisible ? 1 : 0, transition: 'opacity 0.3s ease' }} onClick={closeItemModal} />

          {/* Sheet */}
          <div style={{ position: 'relative', width: '100%', maxHeight: '90vh', background: '#fdfaf5', borderRadius: '24px 24px 0 0', overflow: 'hidden', display: 'flex', flexDirection: 'column', transform: modalVisible ? 'translateY(0)' : 'translateY(100%)', transition: 'transform 0.32s cubic-bezier(0.32, 0.72, 0, 1)' }}>
            {modalItem && (() => {
              const isLiked = likedIds.has(modalItem.id);
              const isLiking = likingIds.has(modalItem.id);
              return (
                <>
                  {/* Image hero */}
                  <div style={{ position: 'relative', width: '100%', height: modalItem.image_url ? 260 : 120, background: '#f7f3ec', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                    {modalItem.image_url
                      ? <Image src={modalItem.image_url} alt={modalItem.name} fill style={{ objectFit: 'cover' }} sizes="100vw" priority />
                      : <span style={{ fontSize: 72 }}>{getCategoryIcon(modalItem.category)}</span>}
                    <button onClick={closeItemModal} style={{ position: 'absolute', top: 14, right: 14, width: 36, height: 36, borderRadius: '50%', background: 'rgba(28,22,17,0.55)', backdropFilter: 'blur(8px)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                      <X size={18} />
                    </button>
                    <div style={{ position: 'absolute', top: 10, left: '50%', transform: 'translateX(-50%)', width: 36, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.6)' }} />
                  </div>

                  {/* Content */}
                  <div style={{ overflowY: 'auto', padding: '18px 18px 32px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <h2 style={{ fontSize: '1.35rem', fontWeight: 700, color: '#1c1611', lineHeight: 1.2, fontFamily: 'var(--mf-heading-font)' }}>{modalItem.name}</h2>

                    {/* Pricing table — full width */}
                    <PricingTable item={modalItem} />

                    {/* Category + availability */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: '#fff3e4', border: '1px solid #f5d0a0', borderRadius: 999, padding: '4px 12px', fontSize: '0.78rem', fontWeight: 600, color: '#b07040' }}>
                        {getCategoryIcon(modalItem.category)} {modalItem.category}
                      </span>
                      {!modalItem.is_available && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', background: '#fff0f0', border: '1px solid #fcc', borderRadius: 999, padding: '4px 12px', fontSize: '0.78rem', fontWeight: 600, color: '#c0392b' }}>Unavailable</span>
                      )}
                    </div>

                    {modalItem.description && <p style={{ fontSize: '0.9rem', color: '#6b5e4e', lineHeight: 1.65 }}>{modalItem.description}</p>}

                    <div style={{ height: 1, background: 'linear-gradient(90deg, transparent, #e8e0d4, transparent)' }} />

                    {/* Stats */}
                    <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
                      {modalItem.review_count > 0 && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                          <div style={{ display: 'flex', gap: 2 }}>
                            {[1,2,3,4,5].map((s) => <Star key={s} size={13} style={{ fill: s <= Math.round(modalItem.avg_rating || 0) ? '#d4a853' : 'none', color: s <= Math.round(modalItem.avg_rating || 0) ? '#d4a853' : '#ccc' }} />)}
                          </div>
                          <span style={{ fontSize: '0.83rem', fontWeight: 600, color: '#d4a853' }}>{modalItem.avg_rating?.toFixed(1)}</span>
                          <span style={{ fontSize: '0.78rem', color: '#9c8e7a' }}>({modalItem.review_count})</span>
                        </div>
                      )}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginLeft: 'auto' }}>
                        <Heart size={13} style={{ fill: '#e74c3c', color: '#e74c3c' }} />
                        <span style={{ fontSize: '0.83rem', fontWeight: 600, color: '#e74c3c' }}>{modalItem.like_count} {modalItem.like_count === 1 ? 'like' : 'likes'}</span>
                      </div>
                    </div>

                    {/* Buttons */}
                    <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                      <button onClick={() => { closeItemModal(); setTimeout(() => setReviewItem(modalItem), 340); }} style={{ flex: 1, height: 46, borderRadius: 14, background: '#fff3e4', border: '1.5px solid #f5d0a0', color: '#c8622a', fontWeight: 600, fontSize: '0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, cursor: 'pointer' }}>
                        <MessageSquare size={15} /> Write a Review
                      </button>
                      <button onClick={(e) => handleLike(modalItem, e)} disabled={!visitorToken || isLiking} style={{ flex: 1, height: 46, borderRadius: 14, background: isLiked ? '#fff0f0' : '#fff', border: `1.5px solid ${isLiked ? '#f5c6c6' : '#e8e0d4'}`, color: isLiked ? '#e74c3c' : '#9c8e7a', fontWeight: 600, fontSize: '0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, cursor: visitorToken ? 'pointer' : 'not-allowed', transition: 'all 0.18s', opacity: isLiking ? 0.7 : 1 }}>
                        <Heart size={15} style={{ fill: isLiked ? '#e74c3c' : 'none', color: isLiked ? '#e74c3c' : '#9c8e7a', transition: 'all 0.18s' }} />
                        {isLiked ? 'Liked' : 'Like'}
                      </button>
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
