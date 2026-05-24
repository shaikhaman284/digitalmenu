'use client';

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { ToastProvider } from '@/components/ui/Toast';
import { StarRating } from '@/components/ui/StarRating';
import { Heart, Star, UtensilsCrossed, MessageSquare, Clock } from 'lucide-react';

function formatDate(iso: string | null) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatPrice(price: number) {
  return `₹${price.toLocaleString('en-IN')}`;
}

function daysRemaining(iso: string | null) {
  if (!iso) return 0;
  return Math.ceil((new Date(iso).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

interface MenuItem {
  id: string; name: string; category: string; price: number;
  like_count: number; avg_rating: number; review_count: number; image_url: string | null;
}

interface Review {
  id: string; itemId: string; itemName: string; rating: number; text: string; created_at: string | null;
}

interface Restaurant {
  id: string; name: string; phone: string; location: string; logo_url: string;
  qr_slug: string; plan: string; is_active: boolean; plan_expires_at: string | null;
}

export default function DashboardHomePage() {
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/dashboard/home')
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setRestaurant(data.restaurant);
        setMenuItems(data.menuItems);
        setReviews(data.reviews);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="db-theme" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--db-bg)' }}>
        <div style={{ width: 36, height: 36, border: '3px solid var(--db-border)', borderTopColor: 'var(--db-accent)', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (error || !restaurant) {
    return (
      <DashboardLayout>
        <div className="db-card" style={{ padding: 24, textAlign: 'center' }}>
          <p style={{ color: 'var(--db-red)' }}>{error || 'Restaurant not found'}</p>
        </div>
      </DashboardLayout>
    );
  }

  const totalLikes = menuItems.reduce((s, i) => s + i.like_count, 0);
  const totalReviews = menuItems.reduce((s, i) => s + i.review_count, 0);
  const topLiked = [...menuItems].sort((a, b) => b.like_count - a.like_count).slice(0, 3);
  const topRated = [...menuItems].filter((i) => i.review_count > 0).sort((a, b) => b.avg_rating - a.avg_rating).slice(0, 3);
  const days = daysRemaining(restaurant.plan_expires_at);

  return (
    <ToastProvider>
      <DashboardLayout restaurantName={restaurant.name}>
        <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

          {/* Welcome */}
          <div>
            <h1 style={{ fontSize: '1.7rem', fontWeight: 700, color: 'var(--db-text)', marginBottom: 4 }}>
              Welcome back, {restaurant.name}! 👋
            </h1>
            <p style={{ fontSize: '0.875rem', color: 'var(--db-text-muted)' }}>Here's what's happening with your menu today</p>
          </div>

          {/* Plan status */}
          <div className="db-card" style={{ padding: '18px 20px', borderLeft: `4px solid ${days <= 7 ? '#d97706' : 'var(--db-green)'}` }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
              <div>
                <p style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--db-text-muted)', marginBottom: 4 }}>Plan Status</p>
                <p style={{ fontWeight: 600, color: 'var(--db-text)', textTransform: 'capitalize' }}>{restaurant.plan} Plan</p>
                <p style={{ fontSize: '0.82rem', color: 'var(--db-text-muted)', marginTop: 2 }}>Expires: {formatDate(restaurant.plan_expires_at)}</p>
              </div>
              <div style={{ textAlign: 'right' }}>
                {days > 0
                  ? <span className={`db-badge ${days <= 7 ? 'db-badge-warning' : 'db-badge-success'}`}>{days} days remaining</span>
                  : <span className="db-badge db-badge-danger">Expired</span>
                }
                {days <= 7 && days > 0 && (
                  <p style={{ fontSize: '0.75rem', color: '#d97706', marginTop: 6 }}>⚠️ Renew soon to keep your menu live</p>
                )}
              </div>
            </div>
          </div>

          {/* Quick stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
            {[
              { label: 'Menu Items',    value: menuItems.length, icon: UtensilsCrossed, color: '#c8622a', bg: '#fff3ec' },
              { label: 'Total Likes',   value: totalLikes,       icon: Heart,           color: '#dc2626', bg: '#fff0f0' },
              { label: 'Total Reviews', value: totalReviews,     icon: MessageSquare,   color: '#d97706', bg: '#fffbeb' },
            ].map(({ label, value, icon: Icon, color, bg }) => (
              <div key={label} className="db-stat">
                <div style={{ width: 40, height: 40, borderRadius: 12, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px' }}>
                  <Icon size={20} style={{ color }} />
                </div>
                <p style={{ fontSize: '1.7rem', fontWeight: 700, color: 'var(--db-text)', lineHeight: 1 }}>{value}</p>
                <p style={{ fontSize: '0.78rem', color: 'var(--db-text-muted)', marginTop: 4 }}>{label}</p>
              </div>
            ))}
          </div>

          {/* Top lists */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            {/* Most liked */}
            <div className="db-card" style={{ padding: 20 }}>
              <h2 style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--db-text-muted)', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Heart size={13} style={{ color: '#dc2626' }} /> Most Liked
              </h2>
              {topLiked.length === 0
                ? <p style={{ fontSize: '0.875rem', color: 'var(--db-text-muted)' }}>No items yet</p>
                : topLiked.map((item, i) => (
                  <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--db-border)' }} className="last:border-0">
                    <span style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--db-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.72rem', fontWeight: 700, color: '#fff', flexShrink: 0 }}>{i + 1}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--db-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</p>
                      <p style={{ fontSize: '0.75rem', color: 'var(--db-text-muted)' }}>{formatPrice(item.price)}</p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#dc2626', flexShrink: 0 }}>
                      <Heart size={13} style={{ fill: '#dc2626' }} />
                      <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>{item.like_count}</span>
                    </div>
                  </div>
                ))}
            </div>

            {/* Top rated */}
            <div className="db-card" style={{ padding: 20 }}>
              <h2 style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--db-text-muted)', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Star size={13} style={{ color: 'var(--db-gold)' }} /> Highest Rated
              </h2>
              {topRated.length === 0
                ? <p style={{ fontSize: '0.875rem', color: 'var(--db-text-muted)' }}>No reviews yet</p>
                : topRated.map((item, i) => (
                  <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--db-border)' }} className="last:border-0">
                    <span style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--db-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.72rem', fontWeight: 700, color: '#fff', flexShrink: 0 }}>{i + 1}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--db-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</p>
                      <StarRating value={item.avg_rating} readonly size="sm" />
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <span style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--db-gold)' }}>{item.avg_rating.toFixed(1)}</span>
                      <p style={{ fontSize: '0.72rem', color: 'var(--db-text-muted)' }}>{item.review_count} reviews</p>
                    </div>
                  </div>
                ))}
            </div>
          </div>

          {/* Recent Reviews */}
          <div className="db-card" style={{ overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--db-border)' }}>
              <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--db-text)' }}>Recent Reviews</h2>
            </div>
            {reviews.length === 0 ? (
              <div style={{ padding: '32px 20px', textAlign: 'center', color: 'var(--db-text-muted)', fontSize: '0.875rem' }}>
                No reviews yet. Share your QR code to get feedback!
              </div>
            ) : (
              <div>
                {reviews.map((review) => (
                  <div key={review.id} style={{ padding: '14px 20px', borderBottom: '1px solid var(--db-border)' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--db-accent)', marginBottom: 4 }}>{review.itemName}</p>
                        <StarRating value={review.rating} readonly size="sm" />
                        {review.text && (
                          <p style={{ fontSize: '0.875rem', color: 'var(--db-text-2)', marginTop: 6, lineHeight: 1.5 }}>"{review.text}"</p>
                        )}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--db-text-muted)', fontSize: '0.75rem', flexShrink: 0 }}>
                        <Clock size={11} />
                        {formatDate(review.created_at)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </DashboardLayout>
    </ToastProvider>
  );
}
