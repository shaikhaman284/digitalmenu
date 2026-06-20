import { v4 as uuidv4 } from 'uuid';

/**
 * Format a Date or Firestore Timestamp to DD MMM YYYY
 */
export function formatDate(date: Date | { toDate: () => Date } | string | null | undefined): string {
  if (!date) return '—';
  let d: Date;
  if (typeof date === 'string') {
    d = new Date(date);
  } else if (typeof (date as { toDate?: () => Date }).toDate === 'function') {
    d = (date as { toDate: () => Date }).toDate();
  } else {
    d = date as Date;
  }
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

/**
 * Format a number as Indian Rupees
 */
export function formatPrice(price: number): string {
  return `₹${price.toFixed(0)}`;
}

/**
 * Get days remaining from now to a future date
 */
export function daysRemaining(date: Date | { toDate: () => Date }): number {
  const d = typeof (date as { toDate?: () => Date }).toDate === 'function'
    ? (date as { toDate: () => Date }).toDate()
    : (date as Date);
  const diff = d.getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

/**
 * Generate a padded QR slug, e.g. MQ-0001
 */
export function generateSlug(num: number): string {
  return `MQ-${String(num).padStart(4, '0')}`;
}

/**
 * Get or create a visitor token from localStorage
 */
export function getVisitorToken(): string {
  if (typeof window === 'undefined') return '';
  let token = localStorage.getItem('mq_visitor_token');
  if (!token) {
    token = uuidv4();
    localStorage.setItem('mq_visitor_token', token);
  }
  return token;
}

/**
 * Truncate text to a given length with ellipsis
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + '...';
}

/**
 * Convert a File to a base64 data URI string
 */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Resize an image file to a max dimension (client-side) to stay under Groq's 4MB limit
 */
export function resizeImage(file: File, maxDimension: number = 1024): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement('canvas');
      let { width, height } = img;
      if (width > height) {
        if (width > maxDimension) { height = (height * maxDimension) / width; width = maxDimension; }
      } else {
        if (height > maxDimension) { width = (width * maxDimension) / height; height = maxDimension; }
      }
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', 0.85));
    };
    img.onerror = reject;
    img.src = url;
  });
}

/**
 * Check if a plan is expired
 */
export function isPlanExpired(expiresAt: Date | { toDate: () => Date }): boolean {
  const d = typeof (expiresAt as { toDate?: () => Date }).toDate === 'function'
    ? (expiresAt as { toDate: () => Date }).toDate()
    : (expiresAt as Date);
  return d.getTime() < Date.now();
}

/**
 * Get category icon emoji for placeholder images
 */
export function getCategoryIcon(category: string): string {
  const lower = category.toLowerCase();
  if (lower.includes('biryani') || lower.includes('rice')) return '🍚';
  if (lower.includes('chicken') || lower.includes('poultry')) return '🍗';
  if (lower.includes('mutton') || lower.includes('lamb') || lower.includes('beef')) return '🥩';
  if (lower.includes('fish') || lower.includes('seafood') || lower.includes('prawn')) return '🐟';
  if (lower.includes('pizza')) return '🍕';
  if (lower.includes('burger')) return '🍔';
  if (lower.includes('pasta') || lower.includes('noodle')) return '🍝';
  if (lower.includes('soup')) return '🍲';
  if (lower.includes('salad')) return '🥗';
  if (lower.includes('dessert') || lower.includes('sweet') || lower.includes('cake')) return '🍰';
  if (lower.includes('drink') || lower.includes('beverage') || lower.includes('juice') || lower.includes('coffee') || lower.includes('tea')) return '☕';
  if (lower.includes('bread') || lower.includes('roti') || lower.includes('naan')) return '🫓';
  if (lower.includes('veg')) return '🥦';
  if (lower.includes('starter') || lower.includes('appetizer')) return '🍢';
  return '🍽️';
}

/**
 * Canonicalise a raw pricing key coming from the AI or typed by the user.
 *
 * Handles:
 *  - Abbreviations:  sm→small, med→medium, lg→large, xl→xlarge, reg→regular
 *  - Single letters: s→small, m→medium, l→large
 *  - Inch notation:  7"→7inch, 9 inch→9inch, 6in→6inch, 12"→12inch
 *
 * Keys that are already canonical (full/half/qtr/piece/small/…) pass through unchanged.
 */
export function normalizePricingKey(raw: string): string {
  const k = raw.trim().toLowerCase();

  // Inch notation — matches: 6", 7 inch, 8in, 9inch, 10 inches, 12"
  const inchMatch = k.match(/^(\d+)\s*(?:inch(?:es)?|in|")$/);
  if (inchMatch) return `${inchMatch[1]}inch`;

  const ALIASES: Record<string, string> = {
    // Single-letter shortcuts (must stay after inch check to avoid 'in' collision)
    s: 'small', sm: 'small',
    m: 'medium', med: 'medium',
    l: 'large', lg: 'large',
    xl: 'xlarge', xxl: 'xxlarge',
    reg: 'regular', r: 'regular',
    fam: 'family',
  };
  return ALIASES[k] ?? k;
}

/**
 * Human-readable display name for a pricing tier key.
 *
 * Examples:  full→Full  half→Half  7inch→7"  small→Small  xlarge→XL
 */
export function tierDisplayName(key: string): string {
  const NAMED: Record<string, string> = {
    full: 'Full', half: 'Half', qtr: 'Qtr', piece: 'Per Piece',
    small: 'Small', medium: 'Medium', large: 'Large',
    xlarge: 'XL', xxlarge: 'XXL',
    regular: 'Regular', family: 'Family',
  };
  if (NAMED[key]) return NAMED[key];
  // inch keys: 7inch → 7"
  const inchMatch = key.match(/^(\d+)inch$/);
  if (inchMatch) return `${inchMatch[1]}"`;
  // fallback: capitalise first letter
  return key.charAt(0).toUpperCase() + key.slice(1);
}
