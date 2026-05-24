'use client';

import { useState, useEffect, useCallback } from 'react';
import { X, ChevronDown } from 'lucide-react';
import { StarRating } from '@/components/ui/StarRating';
import { formatDate } from '@/lib/utils';
import type { MenuItem } from '@/types';

interface Review {
  id: string;
  rating: number;
  text: string;
  created_at: string | null;
}

interface Props {
  item: MenuItem;
  restaurantId: string;
  visitorToken: string;
  onClose: () => void;
  onReviewSubmit: (updatedItem: Partial<MenuItem> & { id: string }) => void;
}

export function ReviewSheet({ item, restaurantId, visitorToken, onClose, onReviewSubmit }: Props) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [alreadyReviewed, setAlreadyReviewed] = useState(false);
  const [rating, setRating] = useState(0);
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isVisible, setIsVisible] = useState(false);
  const [submitError, setSubmitError] = useState('');

  useEffect(() => {
    requestAnimationFrame(() => setIsVisible(true));

    async function load() {
      const res = await fetch(
        `/api/public/review?restaurantId=${restaurantId}&itemId=${item.id}&visitorToken=${visitorToken}`
      );
      const data = await res.json();
      setReviews(data.reviews || []);
      setAlreadyReviewed(data.hasReviewed || false);
      setLoading(false);
    }
    load();
  }, [restaurantId, item.id, visitorToken]);

  const handleClose = useCallback(() => {
    setIsVisible(false);
    setTimeout(onClose, 300);
  }, [onClose]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (rating === 0) return;
    setSubmitting(true);
    setSubmitError('');

    try {
      const res = await fetch('/api/public/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ restaurantId, itemId: item.id, visitorToken, rating, text: text.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit');

      onReviewSubmit({ id: item.id, avg_rating: data.avg_rating, review_count: data.review_count });
      setAlreadyReviewed(true);

      const reviewRes = await fetch(`/api/public/review?restaurantId=${restaurantId}&itemId=${item.id}&visitorToken=${visitorToken}`);
      const reviewData = await reviewRes.json();
      setReviews(reviewData.reviews || []);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to submit review');
    } finally {
      setSubmitting(false);
    }
  }

  const displayedReviews = showAll ? reviews : reviews.slice(0, 5);

  return (
    <div className="menu-theme">
      {/* Backdrop */}
      <div
        style={{
          position: 'fixed', inset: 0, zIndex: 40,
          background: 'rgba(28,22,17,0.45)',
          backdropFilter: 'blur(4px)',
          transition: 'opacity 0.3s',
          opacity: isVisible ? 1 : 0,
        }}
        onClick={handleClose}
      />

      {/* Sheet */}
      <div
        style={{
          position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50,
          transition: 'transform 0.3s cubic-bezier(0.32,0.72,0,1)',
          transform: isVisible ? 'translateY(0)' : 'translateY(100%)',
        }}
      >
        <div className="mf-sheet">
          {/* Drag handle */}
          <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 8px' }}>
            <div style={{ width: 40, height: 4, borderRadius: 99, background: '#ece7dc' }} />
          </div>

          {/* Item header */}
          <div style={{
            display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
            padding: '0 18px 14px', borderBottom: '1px solid #ece7dc',
          }}>
            <div>
              <h2 style={{ fontWeight: 700, fontSize: '1.1rem', color: '#1c1611', fontFamily: 'var(--mf-heading-font)' }}>
                {item.name}
              </h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                <StarRating value={item.avg_rating} readonly size="sm" />
                <span style={{ fontSize: '0.78rem', color: '#9c8e7a' }}>
                  {item.avg_rating > 0 ? `${item.avg_rating?.toFixed(1)} · ` : ''}
                  {item.review_count} review{item.review_count !== 1 ? 's' : ''}
                </span>
              </div>
            </div>
            <button
              onClick={handleClose}
              style={{ padding: 8, color: '#9c8e7a', background: '#f7f3ec', borderRadius: 999, border: 'none', cursor: 'pointer', lineHeight: 0 }}
            >
              <X size={18} />
            </button>
          </div>

          {/* Review form */}
          {!alreadyReviewed && visitorToken && (
            <form onSubmit={handleSubmit} style={{ padding: '16px 18px', borderBottom: '1px solid #ece7dc' }}>
              <p style={{ fontWeight: 600, fontSize: '0.9rem', color: '#1c1611', marginBottom: 10 }}>Rate this dish</p>
              <div style={{ marginBottom: 10 }}>
                <StarRating value={rating} onChange={setRating} size="lg" />
              </div>
              <textarea
                className="mf-textarea"
                value={text}
                onChange={(e) => setText(e.target.value.slice(0, 120))}
                placeholder="Share your experience (optional)"
                rows={2}
              />
              {submitError && (
                <p style={{ fontSize: '0.78rem', color: '#e74c3c', marginTop: 4 }}>{submitError}</p>
              )}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
                <span style={{ fontSize: '0.75rem', color: '#9c8e7a' }}>{text.length}/120</span>
                <button
                  type="submit"
                  disabled={rating === 0 || submitting}
                  className="mf-submit-btn"
                >
                  {submitting ? 'Submitting…' : 'Submit Review'}
                </button>
              </div>
            </form>
          )}

          {alreadyReviewed && (
            <div style={{ padding: '12px 18px', borderBottom: '1px solid #ece7dc' }}>
              <p style={{ fontSize: '0.85rem', color: '#5a7a4e', display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 18, height: 18, background: '#5a7a4e', borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 11, flexShrink: 0 }}>✓</span>
                You've already reviewed this item
              </p>
            </div>
          )}

          {/* Reviews list */}
          <div style={{ padding: '14px 18px' }}>
            {loading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '24px 0' }}>
                <div style={{ width: 24, height: 24, border: '2px solid #ece7dc', borderTopColor: '#c8622a', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
              </div>
            ) : reviews.length === 0 ? (
              <p style={{ textAlign: 'center', color: '#9c8e7a', fontSize: '0.875rem', padding: '16px 0' }}>
                No reviews yet — be the first! ✨
              </p>
            ) : (
              <>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {displayedReviews.map((review) => (
                    <div key={review.id} style={{ borderBottom: '1px solid #f0ebe2', paddingBottom: 14 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                        <StarRating value={review.rating} readonly size="sm" />
                        <span style={{ fontSize: '0.72rem', color: '#9c8e7a' }}>{formatDate(review.created_at)}</span>
                      </div>
                      {review.text && (
                        <p style={{ fontSize: '0.85rem', color: '#4a4035', lineHeight: 1.5 }}>"{review.text}"</p>
                      )}
                    </div>
                  ))}
                </div>
                {reviews.length > 5 && !showAll && (
                  <button
                    onClick={() => setShowAll(true)}
                    style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.85rem', color: '#c8622a', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500, padding: 0 }}
                  >
                    View all {reviews.length} reviews <ChevronDown size={14} />
                  </button>
                )}
              </>
            )}
          </div>
          <div style={{ height: 24 }} />
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
