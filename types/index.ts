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

export interface MenuItem {
  id: string; // document ID
  name: string;
  description: string;
  price: number;
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
  price: number;
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
