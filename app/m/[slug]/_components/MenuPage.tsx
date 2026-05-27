'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Image from 'next/image';
import { Heart, MapPin, Star, MessageSquare, Search, Flame, X, ChevronDown } from 'lucide-react';
import { getVisitorToken, formatPrice, getCategoryIcon } from '@/lib/utils';
import { ReviewSheet } from './ReviewSheet';
import type { Restaurant, MenuItem, Category } from '@/types';

interface Props {
  restaurant: Restaurant;
  categories: Category[];
  initialItems: MenuItem[];
}

export function MenuPage({ restaurant, categories, initialItems }: Props) {
  const [items, setItems] = useState<MenuItem[]>(initialItems);
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const [activeCategory, setActiveCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [reviewItem, setReviewItem] = useState<MenuItem | null>(null);
  const [visitorToken, setVisitorToken] = useState('');
  const [likingIds, setLikingIds] = useState<Set<string>>(new Set());
  // Item detail modal
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    setVisitorToken(getVisitorToken());
  }, []);

  useEffect(() => {
    if (!visitorToken || items.length === 0) return;
    const checkLikes = async () => {
      const liked = new Set<string>();
      await Promise.all(
        items.map(async (item) => {
          const res = await fetch(`/api/public/like?restaurantId=${restaurant.id}&itemId=${item.id}&visitorToken=${visitorToken}`);
          const data = await res.json();
          if (data.liked) liked.add(item.id);
        })
      );
      setLikedIds(liked);
    };
    checkLikes();
  }, [visitorToken, restaurant.id]);

  const handleLike = useCallback(async (item: MenuItem, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!visitorToken || likingIds.has(item.id)) return;
    setLikingIds((prev) => new Set([...prev, item.id]));
    const wasLiked = likedIds.has(item.id);
    setLikedIds((prev) => {
      const next = new Set(prev);
      wasLiked ? next.delete(item.id) : next.add(item.id);
      return next;
    });
    setItems((prev) =>
      prev.map((i) =>
        i.id === item.id
          ? { ...i, like_count: Math.max(0, i.like_count + (wasLiked ? -1 : 1)) }
          : i
      )
    );
    // If the modal is open for this item, keep it updated
    setSelectedItem((prev) =>
      prev?.id === item.id
        ? { ...prev, like_count: Math.max(0, prev.like_count + (wasLiked ? -1 : 1)) }
        : prev
    );
    try {
      const res = await fetch('/api/public/like', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ restaurantId: restaurant.id, itemId: item.id, visitorToken }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
    } catch {
      setLikedIds((prev) => {
        const next = new Set(prev);
        wasLiked ? next.add(item.id) : next.delete(item.id);
        return next;
      });
      setItems((prev) =>
        prev.map((i) =>
          i.id === item.id
            ? { ...i, like_count: Math.max(0, i.like_count + (wasLiked ? 1 : -1)) }
            : i
        )
      );
    } finally {
      setLikingIds((prev) => {
        const next = new Set(prev);
        next.delete(item.id);
        return next;
      });
    }
  }, [visitorToken, likedIds, likingIds, restaurant.id]);

  const mostLoved = useMemo(() =>
    [...items].sort((a, b) => (b.like_count || 0) - (a.like_count || 0))[0],
    [items]
  );

  const categoryNames = useMemo(() => {
    const fromCats = categories.map((c) => c.name);
    const fromItems = [...new Set(items.map((i) => i.category))];
    return [...new Set([...fromCats, ...fromItems])];
  }, [categories, items]);

  const filteredItems = useMemo(() =>
    items.filter((item) => {
      const matchesCat = activeCategory === 'All' || item.category === activeCategory;
      const matchesSearch =
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description?.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCat && matchesSearch;
    }),
    [items, activeCategory, searchQuery]
  );

  function handleReviewSubmit(updatedItem: Partial<MenuItem> & { id: string }) {
    setItems((prev) =>
      prev.map((i) => (i.id === updatedItem.id ? { ...i, ...updatedItem } : i))
    );
    setSelectedItem((prev) =>
      prev?.id === updatedItem.id ? { ...prev, ...updatedItem } : prev
    );
    setReviewItem(null);
  }

  function openItemModal(item: MenuItem) {
    setSelectedItem(item);
    setModalVisible(true);
    document.body.style.overflow = 'hidden';
  }

  function closeItemModal() {
    setModalVisible(false);
    setTimeout(() => {
      setSelectedItem(null);
      document.body.style.overflow = '';
    }, 320);
  }

  // Get the latest data for the modal item from items array
  const modalItem = selectedItem
    ? (items.find((i) => i.id === selectedItem.id) ?? selectedItem)
    : null;

  return (
    <div className="menu-theme animate-fade-in">

      {/* ── Hero Header ─────────────────────────────────────── */}
      <div style={{ background: 'linear-gradient(160deg, #fff8f0 0%, #fdfaf5 100%)' }}>
        <div className="mf-hero-top" style={{ paddingBottom: 28, paddingLeft: 20, paddingRight: 20, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '14px' }}>

          {/* Logo ring */}
          <div style={{
            width: 96, height: 96, borderRadius: '50%',
            overflow: 'hidden', border: '3px solid #ece7dc',
            boxShadow: '0 4px 24px rgba(28,22,17,0.10)',
            background: '#f7f3ec',
            flexShrink: 0,
          }}>
            {restaurant.logo_url ? (
              <Image src={restaurant.logo_url} alt={restaurant.name} width={96} height={96} style={{ width: '100%', height: '100%', objectFit: 'cover' }} unoptimized />
            ) : (
              <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 38 }}>🍽️</div>
            )}
          </div>

          <div>
            <h1 style={{ fontSize: '2rem', fontWeight: 700, color: '#1c1611', marginBottom: 4, lineHeight: 1.1 }}>
              {restaurant.name}
            </h1>
            {restaurant.location && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, color: '#9c8e7a', fontSize: '0.85rem' }}>
                <MapPin size={13} />
                <span>{restaurant.location}</span>
              </div>
            )}
          </div>

          {/* Decorative divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', maxWidth: 220 }}>
            <div style={{ flex: 1, height: 1, background: 'linear-gradient(90deg, transparent, #d4a853)' }} />
            <span style={{ fontSize: 16 }}>✦</span>
            <div style={{ flex: 1, height: 1, background: 'linear-gradient(90deg, #d4a853, transparent)' }} />
          </div>
        </div>
      </div>

      {/* ── Most Loved Banner ───────────────────────────────── */}
      {mostLoved && mostLoved.like_count > 0 && (
        <div style={{ padding: '0 16px 16px' }}>
          <div
            style={{
              background: 'linear-gradient(135deg, #fff8f0 0%, #fff3e8 100%)',
              border: '1px solid #f5d0b8',
              borderRadius: 16,
              padding: '14px 16px',
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
              cursor: 'pointer',
            }}
            onClick={() => openItemModal(mostLoved)}
          >
            <div className="mf-hot-badge" style={{ alignSelf: 'flex-start' }}>
              <Flame size={11} /> Most Loved
            </div>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <div style={{ width: 72, height: 72, borderRadius: 12, overflow: 'hidden', background: '#f7f3ec', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {mostLoved.image_url
                  ? <Image src={mostLoved.image_url} alt={mostLoved.name} width={72} height={72} style={{ width: '100%', height: '100%', objectFit: 'cover' }} unoptimized />
                  : <span style={{ fontSize: 28 }}>{getCategoryIcon(mostLoved.category)}</span>
                }
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <h3 style={{ fontWeight: 700, fontSize: '1.05rem', color: '#1c1611', marginBottom: 2, fontFamily: 'var(--mf-heading-font)' }}>{mostLoved.name}</h3>
                <p style={{ fontSize: '0.78rem', color: '#9c8e7a', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', lineHeight: 1.4 }}>{mostLoved.description}</p>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 }}>
                  <span style={{ fontWeight: 700, fontSize: '1rem', color: '#c8622a' }}>{formatPrice(mostLoved.price)}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#fff0f0', border: '1px solid #fcc', borderRadius: 999, padding: '3px 10px' }}>
                    <Heart size={12} style={{ fill: '#e74c3c', color: '#e74c3c' }} />
                    <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#e74c3c' }}>{mostLoved.like_count}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Search ──────────────────────────────────────────── */}
      <div style={{ padding: '0 16px 12px', position: 'relative' }}>
        <Search size={16} style={{ position: 'absolute', left: 29, top: '50%', transform: 'translateY(-50%)', color: '#9c8e7a', pointerEvents: 'none' }} />
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
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 2 }} className="scrollbar-hide">
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
      <div style={{ padding: '16px 16px 100px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {filteredItems.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '64px 0' }}>
            <p style={{ fontSize: 40, marginBottom: 12 }}>🔍</p>
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
                <div style={{ display: 'flex', gap: 12, padding: '14px 14px' }}>
                  {/* Image */}
                  <div style={{ position: 'relative', width: 88, height: 88, borderRadius: 12, overflow: 'hidden', background: '#f7f3ec', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {item.image_url ? (
                      <Image src={item.image_url} alt={item.name} fill className="object-cover" sizes="88px" unoptimized />
                    ) : (
                      <span style={{ fontSize: 34 }}>{getCategoryIcon(item.category)}</span>
                    )}
                    {!item.is_available && (
                      <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.72)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#9c8e7a', textAlign: 'center', padding: '0 4px', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Unavailable</span>
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                      <h3 style={{ fontWeight: 600, fontSize: '0.97rem', color: '#1c1611', lineHeight: 1.25, fontFamily: 'var(--mf-heading-font)' }}>{item.name}</h3>
                      <span style={{ fontWeight: 700, fontSize: '0.97rem', color: '#c8622a', flexShrink: 0 }}>{formatPrice(item.price)}</span>
                    </div>

                    <p style={{ fontSize: '0.78rem', color: '#9c8e7a', marginTop: 3, lineHeight: 1.45, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                      {item.description}
                    </p>

                    {/* Rating */}
                    {item.review_count > 0 && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 6 }}>
                        <Star size={12} style={{ fill: '#d4a853', color: '#d4a853' }} />
                        <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#d4a853' }}>{item.avg_rating?.toFixed(1)}</span>
                        <span style={{ fontSize: '0.75rem', color: '#9c8e7a' }}>({item.review_count})</span>
                      </div>
                    )}

                    {/* Actions */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
                      <button
                        className="mf-review-btn"
                        onClick={(e) => { e.stopPropagation(); setReviewItem(item); }}
                      >
                        <MessageSquare size={11} />
                        Review
                      </button>
                      <button
                        className={`mf-like${isLiked ? ' liked' : ''}`}
                        onClick={(e) => handleLike(item, e)}
                        disabled={!visitorToken || likingIds.has(item.id)}
                      >
                        <Heart
                          size={13}
                          style={{
                            fill: isLiked ? '#e74c3c' : 'none',
                            transition: 'all 0.18s',
                            animation: likingIds.has(item.id) ? 'pulse 0.6s infinite' : undefined,
                          }}
                        />
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
      <div className="mf-footer-safe" style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        textAlign: 'center', paddingTop: 10, paddingLeft: 16, paddingRight: 16,
        fontSize: '0.75rem', color: '#9c8e7a',
        background: 'rgba(253,250,245,0.92)',
        backdropFilter: 'blur(12px)',
        borderTop: '1px solid #ece7dc',
      }}>
        Powered by{' '}
        <a href="/" style={{ color: '#c8622a', fontWeight: 600, textDecoration: 'none' }}>MenuQR</a>
      </div>

      {/* ── Review Sheet ─────────────────────────────────────── */}
      {reviewItem && (
        <ReviewSheet
          item={reviewItem}
          restaurantId={restaurant.id}
          visitorToken={visitorToken}
          onClose={() => setReviewItem(null)}
          onReviewSubmit={handleReviewSubmit}
        />
      )}

      {/* ── Item Detail Modal ─────────────────────────────────── */}
      {(selectedItem || modalItem) && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 200,
            display: 'flex', alignItems: 'flex-end',
          }}
        >
          {/* Backdrop */}
          <div
            style={{
              position: 'absolute', inset: 0,
              background: 'rgba(20,15,10,0.55)',
              backdropFilter: 'blur(3px)',
              opacity: modalVisible ? 1 : 0,
              transition: 'opacity 0.3s ease',
            }}
            onClick={closeItemModal}
          />

          {/* Sheet */}
          <div
            style={{
              position: 'relative', width: '100%',
              maxHeight: '90vh',
              background: '#fdfaf5',
              borderRadius: '24px 24px 0 0',
              overflow: 'hidden',
              display: 'flex', flexDirection: 'column',
              transform: modalVisible ? 'translateY(0)' : 'translateY(100%)',
              transition: 'transform 0.32s cubic-bezier(0.32, 0.72, 0, 1)',
            }}
          >
            {modalItem && (() => {
              const isLiked = likedIds.has(modalItem.id);
              const isLiking = likingIds.has(modalItem.id);
              return (
                <>
                  {/* Image hero */}
                  <div style={{
                    position: 'relative',
                    width: '100%',
                    height: modalItem.image_url ? 260 : 140,
                    background: 'linear-gradient(135deg, #f7f3ec 0%, #fff3e4 100%)',
                    flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    overflow: 'hidden',
                  }}>
                    {modalItem.image_url ? (
                      <Image
                        src={modalItem.image_url}
                        alt={modalItem.name}
                        fill
                        style={{ objectFit: 'cover' }}
                        sizes="100vw"
                        unoptimized
                      />
                    ) : (
                      <span style={{ fontSize: 72 }}>{getCategoryIcon(modalItem.category)}</span>
                    )}
                    {/* Gradient overlay at bottom for readability */}
                    {modalItem.image_url && (
                      <div style={{
                        position: 'absolute', bottom: 0, left: 0, right: 0, height: 80,
                        background: 'linear-gradient(transparent, #fdfaf5)',
                      }} />
                    )}
                    {/* Close button */}
                    <button
                      onClick={closeItemModal}
                      style={{
                        position: 'absolute', top: 14, right: 14,
                        width: 36, height: 36, borderRadius: '50%',
                        background: 'rgba(28,22,17,0.55)',
                        backdropFilter: 'blur(8px)',
                        border: 'none', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: '#fff',
                      }}
                    >
                      <X size={18} />
                    </button>
                    {/* Drag handle */}
                    <div style={{
                      position: 'absolute', top: 10, left: '50%', transform: 'translateX(-50%)',
                      width: 36, height: 4, borderRadius: 2,
                      background: 'rgba(255,255,255,0.6)',
                    }} />
                  </div>

                  {/* Content */}
                  <div style={{ overflowY: 'auto', padding: '20px 20px 32px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {/* Name + price */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                      <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#1c1611', lineHeight: 1.2, fontFamily: 'var(--mf-heading-font)', flex: 1 }}>
                        {modalItem.name}
                      </h2>
                      <span style={{ fontSize: '1.4rem', fontWeight: 800, color: '#c8622a', flexShrink: 0 }}>
                        {formatPrice(modalItem.price)}
                      </span>
                    </div>

                    {/* Category badge */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 4,
                        background: '#fff3e4', border: '1px solid #f5d0a0',
                        borderRadius: 999, padding: '4px 12px',
                        fontSize: '0.78rem', fontWeight: 600, color: '#b07040',
                      }}>
                        {getCategoryIcon(modalItem.category)} {modalItem.category}
                      </span>
                      {!modalItem.is_available && (
                        <span style={{
                          display: 'inline-flex', alignItems: 'center',
                          background: '#fff0f0', border: '1px solid #fcc',
                          borderRadius: 999, padding: '4px 12px',
                          fontSize: '0.78rem', fontWeight: 600, color: '#c0392b',
                        }}>
                          Unavailable
                        </span>
                      )}
                    </div>

                    {/* Description */}
                    {modalItem.description && (
                      <p style={{ fontSize: '0.9rem', color: '#6b5e4e', lineHeight: 1.65 }}>
                        {modalItem.description}
                      </p>
                    )}

                    {/* Divider */}
                    <div style={{ height: 1, background: 'linear-gradient(90deg, transparent, #e8e0d4, transparent)' }} />

                    {/* Stats row */}
                    <div style={{ display: 'flex', gap: 16 }}>
                      {modalItem.review_count > 0 && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <div style={{ display: 'flex', gap: 2 }}>
                            {[1,2,3,4,5].map((s) => (
                              <Star
                                key={s}
                                size={14}
                                style={{
                                  fill: s <= Math.round(modalItem.avg_rating || 0) ? '#d4a853' : 'none',
                                  color: s <= Math.round(modalItem.avg_rating || 0) ? '#d4a853' : '#ccc',
                                }}
                              />
                            ))}
                          </div>
                          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#d4a853' }}>
                            {modalItem.avg_rating?.toFixed(1)}
                          </span>
                          <span style={{ fontSize: '0.8rem', color: '#9c8e7a' }}>
                            ({modalItem.review_count} review{modalItem.review_count !== 1 ? 's' : ''})
                          </span>
                        </div>
                      )}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginLeft: 'auto' }}>
                        <Heart size={14} style={{ fill: '#e74c3c', color: '#e74c3c' }} />
                        <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#e74c3c' }}>
                          {modalItem.like_count} {modalItem.like_count === 1 ? 'like' : 'likes'}
                        </span>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                      <button
                        onClick={() => { closeItemModal(); setTimeout(() => setReviewItem(modalItem), 340); }}
                        style={{
                          flex: 1, height: 46, borderRadius: 14,
                          background: '#fff3e4', border: '1.5px solid #f5d0a0',
                          color: '#c8622a', fontWeight: 600, fontSize: '0.92rem',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                          cursor: 'pointer',
                        }}
                      >
                        <MessageSquare size={15} />
                        Write a Review
                      </button>
                      <button
                        onClick={(e) => handleLike(modalItem, e)}
                        disabled={!visitorToken || isLiking}
                        style={{
                          flex: 1, height: 46, borderRadius: 14,
                          background: isLiked ? '#fff0f0' : '#fff',
                          border: `1.5px solid ${isLiked ? '#f5c6c6' : '#e8e0d4'}`,
                          color: isLiked ? '#e74c3c' : '#9c8e7a',
                          fontWeight: 600, fontSize: '0.92rem',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                          cursor: visitorToken ? 'pointer' : 'not-allowed',
                          transition: 'all 0.18s',
                          opacity: isLiking ? 0.7 : 1,
                        }}
                      >
                        <Heart
                          size={15}
                          style={{
                            fill: isLiked ? '#e74c3c' : 'none',
                            color: isLiked ? '#e74c3c' : '#9c8e7a',
                            transition: 'all 0.18s',
                          }}
                        />
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
