import { Timestamp } from 'firebase/firestore';

export interface QRCode {
  slug: string; // document ID
  status: 'unbound' | 'bound';
  restaurant_id: string | null;
  batch: string;
  bound_at: Timestamp | null;
  created_at: Timestamp;
}

export interface Restaurant {
  id: string; // document ID
  uid: string; // Firebase Auth UID
  name: string;
  phone: string;
  location: string;
  logo_url: string;
  qr_slug: string;
  plan: 'monthly' | 'yearly';
  plan_expires_at: Timestamp;
  is_active: boolean;
  created_at: Timestamp;
}

export interface Category {
  id: string; // document ID
  name: string;
  display_order: number;
  itemCount?: number; // only present in API responses
}

/**
 * Pricing tiers for a menu item.
 * At least one tier must be set. If only `full` is set, it behaves like a single price.
 */
export interface PricingTiers {
  full?: number;   // Full plate / portion price
  half?: number;   // Half plate price
  qtr?: number;    // Quarter plate price
  piece?: number;  // Per-piece price
}

export interface MenuItem {
  id: string; // document ID
  name: string;
  description: string;
  price: number;          // base/display price (= first defined tier) — kept for backward compat
  pricing?: PricingTiers; // optional multi-tier pricing; if absent, `price` is used
  category: string;
  image_url: string | null;
  is_available: boolean;
  like_count: number;
  avg_rating: number;
  review_count: number;
  display_order: number;
  created_at?: Timestamp; // optional — not present in API responses
}

export interface Like {
  visitor_token: string; // document ID
  liked_at: Timestamp;
}

export interface Review {
  id: string; // document ID
  visitor_token: string;
  rating: number; // 1-5
  text: string; // max 120 chars
  created_at: Timestamp;
}

export interface MenuItemDraft {
  name: string;
  category: string;
  price: number;          // base price (first defined tier)
  pricing?: PricingTiers; // optional multi-tier pricing
  description: string;
}

export interface RestaurantStats {
  totalItems: number;
  totalLikes: number;
  totalReviews: number;
}

export interface AdminStats {
  totalRestaurants: number;
  activeRestaurants: number;
  expiredRestaurants: number;
  unboundQRs: number;
}
