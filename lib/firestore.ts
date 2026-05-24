import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  Timestamp,
  runTransaction,
  writeBatch,
  collectionGroup,
} from 'firebase/firestore';
import { db } from './firebase';
import type { Restaurant, MenuItem, Category, QRCode, Review, Like } from '@/types';

// ─── QR Codes ────────────────────────────────────────────────────────────────

export async function getQRCode(slug: string): Promise<QRCode | null> {
  const ref = doc(db, 'qr_codes', slug);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return { slug: snap.id, ...snap.data() } as QRCode;
}

export async function getUnboundQRCount(): Promise<number> {
  const q = query(collection(db, 'qr_codes'), where('status', '==', 'unbound'));
  const snap = await getDocs(q);
  return snap.size;
}

export async function getNextUnboundQR(): Promise<QRCode | null> {
  const q = query(
    collection(db, 'qr_codes'),
    where('status', '==', 'unbound'),
    orderBy('created_at', 'asc'),
    limit(1)
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { slug: d.id, ...d.data() } as QRCode;
}

// ─── Restaurants ─────────────────────────────────────────────────────────────

export async function getRestaurantByUid(uid: string): Promise<Restaurant | null> {
  const q = query(collection(db, 'restaurants'), where('uid', '==', uid), limit(1));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { id: d.id, ...d.data() } as Restaurant;
}

export async function getRestaurantBySlug(slug: string): Promise<Restaurant | null> {
  const q = query(collection(db, 'restaurants'), where('qr_slug', '==', slug), limit(1));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { id: d.id, ...d.data() } as Restaurant;
}

export async function getRestaurant(id: string): Promise<Restaurant | null> {
  const ref = doc(db, 'restaurants', id);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as Restaurant;
}

export async function getAllRestaurants(): Promise<Restaurant[]> {
  const q = query(collection(db, 'restaurants'), orderBy('created_at', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Restaurant);
}

export async function updateRestaurant(id: string, data: Partial<Restaurant>): Promise<void> {
  const ref = doc(db, 'restaurants', id);
  await updateDoc(ref, data as Record<string, unknown>);
}

// ─── Categories ───────────────────────────────────────────────────────────────

export async function getCategories(restaurantId: string): Promise<Category[]> {
  const q = query(
    collection(db, 'restaurants', restaurantId, 'categories'),
    orderBy('display_order', 'asc')
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Category);
}

export async function addCategory(restaurantId: string, name: string, displayOrder: number): Promise<string> {
  const ref = await addDoc(collection(db, 'restaurants', restaurantId, 'categories'), {
    name,
    display_order: displayOrder,
  });
  return ref.id;
}

export async function updateCategory(restaurantId: string, categoryId: string, data: Partial<Category>): Promise<void> {
  const ref = doc(db, 'restaurants', restaurantId, 'categories', categoryId);
  await updateDoc(ref, data as Record<string, unknown>);
}

export async function deleteCategory(restaurantId: string, categoryId: string): Promise<void> {
  const ref = doc(db, 'restaurants', restaurantId, 'categories', categoryId);
  await deleteDoc(ref);
}

// ─── Menu Items ───────────────────────────────────────────────────────────────

export async function getMenuItems(restaurantId: string): Promise<MenuItem[]> {
  const q = query(
    collection(db, 'restaurants', restaurantId, 'menu_items'),
    orderBy('display_order', 'asc')
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as MenuItem);
}

export async function addMenuItem(restaurantId: string, data: Omit<MenuItem, 'id'>): Promise<string> {
  const ref = await addDoc(
    collection(db, 'restaurants', restaurantId, 'menu_items'),
    {
      ...data,
      created_at: Timestamp.now(),
    }
  );
  return ref.id;
}

export async function updateMenuItem(restaurantId: string, itemId: string, data: Partial<MenuItem>): Promise<void> {
  const ref = doc(db, 'restaurants', restaurantId, 'menu_items', itemId);
  await updateDoc(ref, data as Record<string, unknown>);
}

export async function deleteMenuItem(restaurantId: string, itemId: string): Promise<void> {
  const ref = doc(db, 'restaurants', restaurantId, 'menu_items', itemId);
  await deleteDoc(ref);
}

export async function bulkAddMenuItems(restaurantId: string, items: Omit<MenuItem, 'id'>[]): Promise<void> {
  const batch = writeBatch(db);
  items.forEach((item, i) => {
    const ref = doc(collection(db, 'restaurants', restaurantId, 'menu_items'));
    batch.set(ref, { ...item, created_at: Timestamp.now() });
  });
  await batch.commit();
}

// ─── Likes ────────────────────────────────────────────────────────────────────

export async function getLike(restaurantId: string, itemId: string, visitorToken: string): Promise<Like | null> {
  const ref = doc(db, 'restaurants', restaurantId, 'menu_items', itemId, 'likes', visitorToken);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return snap.data() as Like;
}

export async function toggleLike(
  restaurantId: string,
  itemId: string,
  visitorToken: string
): Promise<boolean> {
  const itemRef = doc(db, 'restaurants', restaurantId, 'menu_items', itemId);
  const likeRef = doc(db, 'restaurants', restaurantId, 'menu_items', itemId, 'likes', visitorToken);

  let liked = false;
  await runTransaction(db, async (transaction) => {
    const likeSnap = await transaction.get(likeRef);
    const itemSnap = await transaction.get(itemRef);
    if (!itemSnap.exists()) return;

    const currentCount = itemSnap.data().like_count || 0;
    if (likeSnap.exists()) {
      // Unlike
      transaction.delete(likeRef);
      transaction.update(itemRef, { like_count: Math.max(0, currentCount - 1) });
      liked = false;
    } else {
      // Like
      transaction.set(likeRef, { visitor_token: visitorToken, liked_at: Timestamp.now() });
      transaction.update(itemRef, { like_count: currentCount + 1 });
      liked = true;
    }
  });
  return liked;
}

// ─── Reviews ──────────────────────────────────────────────────────────────────

export async function getReviews(restaurantId: string, itemId: string): Promise<Review[]> {
  const q = query(
    collection(db, 'restaurants', restaurantId, 'menu_items', itemId, 'reviews'),
    orderBy('created_at', 'desc')
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Review);
}

export async function hasReviewed(
  restaurantId: string,
  itemId: string,
  visitorToken: string
): Promise<boolean> {
  const q = query(
    collection(db, 'restaurants', restaurantId, 'menu_items', itemId, 'reviews'),
    where('visitor_token', '==', visitorToken),
    limit(1)
  );
  const snap = await getDocs(q);
  return !snap.empty;
}

export async function addReview(
  restaurantId: string,
  itemId: string,
  visitorToken: string,
  rating: number,
  text: string
): Promise<void> {
  const itemRef = doc(db, 'restaurants', restaurantId, 'menu_items', itemId);
  const reviewsRef = collection(db, 'restaurants', restaurantId, 'menu_items', itemId, 'reviews');

  await runTransaction(db, async (transaction) => {
    const itemSnap = await transaction.get(itemRef);
    if (!itemSnap.exists()) return;

    const data = itemSnap.data();
    const currentRating = data.avg_rating || 0;
    const currentCount = data.review_count || 0;
    const newCount = currentCount + 1;
    const newAvg = (currentRating * currentCount + rating) / newCount;

    const reviewRef = doc(reviewsRef);
    transaction.set(reviewRef, {
      visitor_token: visitorToken,
      rating,
      text,
      created_at: Timestamp.now(),
    });
    transaction.update(itemRef, {
      avg_rating: Math.round(newAvg * 10) / 10,
      review_count: newCount,
    });
  });
}

// ─── AI Import Counter ────────────────────────────────────────────────────────

export async function getAIImportCount(restaurantId: string): Promise<number> {
  const now = new Date();
  const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const ref = doc(db, 'restaurants', restaurantId, 'ai_imports', monthKey);
  const snap = await getDoc(ref);
  if (!snap.exists()) return 0;
  return snap.data().count || 0;
}

export async function incrementAIImportCount(restaurantId: string): Promise<void> {
  const now = new Date();
  const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const ref = doc(db, 'restaurants', restaurantId, 'ai_imports', monthKey);
  const snap = await getDoc(ref);
  if (snap.exists()) {
    await updateDoc(ref, { count: (snap.data().count || 0) + 1 });
  } else {
    await setDoc(ref, { count: 1 });
  }
}
