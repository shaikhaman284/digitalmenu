import { getAdminDb } from '@/lib/firebase-admin';
import { notFound } from 'next/navigation';
import { MenuPage } from './_components/MenuPage';
import type { Metadata } from 'next';
import type { QRCode, Restaurant, MenuItem, Category } from '@/types';
import { Timestamp } from 'firebase-admin/firestore';

export const revalidate = 300; // ISR: rebuild every 5 minutes
export const dynamic = 'force-dynamic'; // Always SSR, never statically at build time

interface PageProps {
  params: Promise<{ slug: string }>;
}

async function getMenuData(slug: string) {
  const adminDb = getAdminDb();

  const qrSnap = await adminDb.collection('qr_codes').doc(slug).get();
  if (!qrSnap.exists) return null;

  const qrData = qrSnap.data() as QRCode;
  if (qrData.status === 'unbound' || !qrData.restaurant_id) return null;

  const restSnap = await adminDb.collection('restaurants').doc(qrData.restaurant_id).get();
  if (!restSnap.exists) return null;

  const restaurant = { id: restSnap.id, ...restSnap.data() } as Restaurant;

  const [catSnap, itemsSnap] = await Promise.all([
    adminDb
      .collection('restaurants')
      .doc(restaurant.id)
      .collection('categories')
      .orderBy('display_order', 'asc')
      .get(),
    adminDb
      .collection('restaurants')
      .doc(restaurant.id)
      .collection('menu_items')
      .orderBy('display_order', 'asc')
      .get(),
  ]);

  const categories = catSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as Category);
  const menuItems = itemsSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as MenuItem);

  return { restaurant, categories, menuItems };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const data = await getMenuData(slug);
  if (!data) return { title: 'Menu Not Found | MenuQR' };
  return {
    title: `${data.restaurant.name} Menu | MenuQR`,
    description: `View the digital menu for ${data.restaurant.name}. Scan, browse, and order with ease.`,
  };
}

// Helper to convert Firestore Admin Timestamp to a plain serializable object
function serializeData(data: unknown): unknown {
  if (data === null || data === undefined) return data;
  if (data instanceof Timestamp) {
    return { _seconds: data.seconds, _nanoseconds: data.nanoseconds, _isTimestamp: true };
  }
  if (Array.isArray(data)) return data.map(serializeData);
  if (typeof data === 'object') {
    return Object.fromEntries(
      Object.entries(data as Record<string, unknown>).map(([k, v]) => [k, serializeData(v)])
    );
  }
  return data;
}

export default async function MenuSlugPage({ params }: PageProps) {
  const { slug } = await params;
  const data = await getMenuData(slug);

  if (!data) return notFound();

  const { restaurant, categories, menuItems } = data;

  // Check if expired or inactive
  const now = new Date();
  const expiresAt = restaurant.plan_expires_at;
  let isExpired = false;
  if (expiresAt && typeof (expiresAt as unknown as Timestamp).toDate === 'function') {
    isExpired = (expiresAt as unknown as Timestamp).toDate() < now;
  }

  if (isExpired || !restaurant.is_active) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-950 to-slate-900 flex items-center justify-center p-6">
        <div className="max-w-sm w-full text-center space-y-6">
          {restaurant.logo_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={restaurant.logo_url}
              alt={restaurant.name}
              className="w-24 h-24 rounded-full mx-auto object-cover border-4 border-purple-700/40"
            />
          )}
          <div>
            <h1 className="text-2xl font-bold text-white">{restaurant.name}</h1>
            <div className="mt-4 p-4 rounded-2xl bg-white/5 border border-white/10">
              <p className="text-gray-300 leading-relaxed">
                This digital menu is temporarily unavailable. Please ask the staff for assistance.
              </p>
            </div>
          </div>
          <p className="text-xs text-purple-500">Powered by <span className="text-purple-400 font-semibold">MenuQR</span></p>
        </div>
      </div>
    );
  }

  // Serialize to plain objects for client component props
  const serializedRestaurant = serializeData(restaurant) as Restaurant;
  const serializedCategories = serializeData(categories) as Category[];
  const serializedItems = serializeData(menuItems) as MenuItem[];

  return (
    <MenuPage
      restaurant={serializedRestaurant}
      categories={serializedCategories}
      initialItems={serializedItems}
    />
  );
}
