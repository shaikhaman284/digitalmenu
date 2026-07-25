import { NextRequest, NextResponse } from 'next/server';
import { getGroqClient } from '@/lib/groq';
import { getAdminAuth, getAdminDb } from '@/lib/firebase-admin';
import { cookies } from 'next/headers';
import { normalizePricingKey } from '@/lib/utils';
import type { PricingTiers } from '@/types';

export const runtime = 'nodejs';

interface MenuItemExtracted {
  name: string;
  category: string;
  price: number;
  pricing?: PricingTiers;
  description: string;
}

/**
 * Compute the base/display price from a PricingTiers object.
 * Returns the first defined tier value (full > half > qtr > piece).
 */
function basePriceFromTiers(pricing: PricingTiers): number {
  const std = pricing.full ?? pricing.half ?? pricing.qtr ?? pricing.piece;
  if (std !== undefined) return std;
  const values = Object.values(pricing).filter((v): v is number => typeof v === 'number' && v > 0);
  return values[0] ?? 0;
}

/**
 * Robustly extract a JSON array from a raw AI response string.
 * Handles:
 *  - Bare array:            [{"name": ...}, ...]
 *  - Wrapped object:        {"items": [...]}
 *  - Markdown code block:   ```json\n[...]\n```
 *  - Extra prose before/after the JSON
 *  - Nested bracket issues (uses depth counting)
 */
/**
 * Strip Qwen / other thinking-model <think>...</think> blocks.
 * Uses a greedy regex so nested or malformed tags are also removed.
 */
function stripThinkTags(text: string): string {
  return text.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
}

function extractJsonArray(raw: string): MenuItemExtracted[] {
  // 1. Strip <think>...</think> blocks (Qwen thinking model output)
  let text = stripThinkTags(raw);

  // 2. Strip markdown fences
  text = text
    .replace(/```json\s*/gi, '')
    .replace(/```\s*/gi, '')
    .trim();

  // 2. Try to find an array directly
  const arrStart = text.indexOf('[');
  if (arrStart !== -1) {
    // Use depth-counting to find the matching closing bracket
    let depth = 0;
    let arrEnd = -1;
    for (let i = arrStart; i < text.length; i++) {
      if (text[i] === '[') depth++;
      else if (text[i] === ']') {
        depth--;
        if (depth === 0) { arrEnd = i; break; }
      }
    }
    if (arrEnd !== -1) {
      try {
        const parsed = JSON.parse(text.slice(arrStart, arrEnd + 1));
        if (Array.isArray(parsed)) return parsed as MenuItemExtracted[];
      } catch {
        // fall through to object attempt
      }
    }
  }

  // 3. Try to find an object and extract an array property (e.g. {"items": [...]})
  const objStart = text.indexOf('{');
  if (objStart !== -1) {
    let depth = 0;
    let objEnd = -1;
    for (let i = objStart; i < text.length; i++) {
      if (text[i] === '{') depth++;
      else if (text[i] === '}') {
        depth--;
        if (depth === 0) { objEnd = i; break; }
      }
    }
    if (objEnd !== -1) {
      try {
        const obj = JSON.parse(text.slice(objStart, objEnd + 1)) as Record<string, unknown>;
        // Look for any array-valued key
        for (const val of Object.values(obj)) {
          if (Array.isArray(val) && val.length > 0) return val as MenuItemExtracted[];
        }
      } catch {
        // fall through
      }
    }
  }

  // 4. Log the raw response so we can debug future failures
  console.error('[extract-menu] Could not find JSON in response. Raw content (first 500 chars):', raw.slice(0, 500));
  throw new Error('No JSON array found in AI response');
}

/** Normalise a single raw extracted item into the canonical shape */
function normalizeItem(item: MenuItemExtracted): MenuItemExtracted | null {
  const name = String(item.name || '').trim();
  if (!name) return null;

  const category = String(item.category || 'General').trim();
  // Auto-fill if the model returned blank — use the name itself as a minimal description
  const description = String(item.description || '').trim() || `${name} — a delicious ${category.toLowerCase()} dish`;

  // Normalize pricing — handle both new `pricing` object and old `price` field
  let pricing: PricingTiers = {};

  if (item.pricing && typeof item.pricing === 'object') {
    const p = item.pricing as Record<string, unknown>;
    const num = (v: unknown) => typeof v === 'number' ? v : (typeof v === 'string' ? parseFloat(v) : NaN);
    for (const [key, val] of Object.entries(p)) {
      const n = num(val);
      if (!isNaN(n) && n > 0) {
        let canonical = normalizePricingKey(key);
        // Guard: if the AI returned a bare integer key (e.g. "7","10","12") AND
        // the price is a realistic food price (> 20 ₹), it almost certainly means
        // an inch-based pizza size. Convert to canonical form.
        if (/^\d+$/.test(canonical)) {
          const keyNum = parseInt(canonical, 10);
          if (keyNum >= 6 && keyNum <= 16 && n >= 20) {
            canonical = `${keyNum}inch`;
          }
        }
        // If two raw keys collapse to the same canonical, keep the higher price
        if (pricing[canonical] === undefined || n > (pricing[canonical] as number)) {
          pricing[canonical] = n;
        }
      }
    }
  }

  // Fallback: AI returned old-style single `price` field and no `pricing`
  if (Object.keys(pricing).length === 0) {
    const raw = item as unknown as Record<string, unknown>;
    const singlePrice = typeof raw.price === 'number'
      ? raw.price
      : parseFloat(String(raw.price ?? '0')) || 0;
    // For bread/add-on categories, default to piece pricing
    const catLower = category.toLowerCase();
    const isPiece = catLower.includes('bread') || catLower.includes('roti') ||
      catLower.includes('naan') || catLower.includes('paratha') ||
      catLower.includes('raita') || catLower.includes('add-on') || catLower.includes('extra');
    if (singlePrice > 0) pricing = isPiece ? { piece: singlePrice } : { full: singlePrice };
  }

  const price = basePriceFromTiers(pricing);
  return { name, category, price, pricing, description };
}

/**
 * Downscale a base64 data-URI image so its longest side is ≤ maxPx.
 * Qwen tiles images into a grid; each tile costs input tokens.
 * A 2048-px image → 4 tiles → 4× the token cost → 429 on first try.
 * Keeping the longest side ≤ 1024 px keeps it to a single tile.
 *
 * Uses the `sharp` package when available (Node.js server-side).
 * Falls back to returning the original image unchanged if sharp is absent.
 */
async function downscaleImage(dataUri: string, maxPx = 1024): Promise<string> {
  try {
    // Dynamically import sharp so the route still works if it isn't installed
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const sharp = (await import('sharp')).default;

    // Extract mime type and raw base64
    const match = dataUri.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);
    if (!match) return dataUri;
    const mimeType = match[1];
    const base64Data = match[2];
    const inputBuffer = Buffer.from(base64Data, 'base64');

    // Check actual dimensions first
    const meta = await sharp(inputBuffer).metadata();
    const { width = 0, height = 0 } = meta;

    if (width <= maxPx && height <= maxPx) {
      // Already within limits — return as-is
      return dataUri;
    }

    // Resize keeping aspect ratio; output as JPEG for consistent token cost
    const outputBuffer = await sharp(inputBuffer)
      .resize({ width: maxPx, height: maxPx, fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 85 })
      .toBuffer();

    const outBase64 = outputBuffer.toString('base64');
    console.log(
      `[extract-menu] Downscaled image from ${width}×${height} to ≤${maxPx}px ` +
      `(${Math.round(inputBuffer.length / 1024)}KB → ${Math.round(outputBuffer.length / 1024)}KB)`
    );
    return `data:image/jpeg;base64,${outBase64}`;
  } catch (err) {
    console.warn('[extract-menu] Image downscale skipped (sharp not available or error):', err);
    return dataUri;
  }
}

async function extractWithGroq(imageBase64: string, strict = false): Promise<MenuItemExtracted[]> {
  const groq = getGroqClient();

  // Pre-process: downscale to ≤ 1024px to avoid Qwen grid-tiling 429 errors
  const processedImage = await downscaleImage(imageBase64, 1024);

  // ─── FIRST ATTEMPT: focused, example-heavy prompt ────────────────────────
  const lenientPrompt = `You extract menu items from restaurant menu images.
Return ONLY a raw JSON array. Start with [, end with ]. No markdown, no code fences.

Each item must be a JSON object with ALL four fields — name, category, pricing, AND description:
{"name":"dish name","category":"section heading","pricing":{...},"description":"appetising one-liner, max 12 words"}

!! DESCRIPTION IS MANDATORY for every single item !!
  - If the menu photo shows a description → use it (shortened to one line).
  - If NO description is printed → INVENT one short appetising line based on the dish name.
  - NEVER return an empty "description" field. NEVER omit it.

PRICING KEY RULES — choose the right key for every price:
  "full"   → single plate / full-size price for curries, rice, sandwiches, soups, starters, etc.
  "half"   → half plate price (only if menu shows Half column)
  "qtr"    → quarter plate price (only if menu shows Quarter/Qtr column)
  "piece"  → per-piece price for: rotis, naans, parathas, kulchas, raitas, or any Add-on/Extra
  "small"  → small size (S / Sm / Small)
  "medium" → medium size (M / Med / Medium)
  "large"  → large size (L / Lg / Large)
  "xlarge" → extra-large size (XL)
  "7inch"  → 7-inch pizza/item  (written as 7", 7 inch, 7")
  "9inch"  → 9-inch pizza/item
  "10inch" → 10-inch pizza/item
  "12inch" → 12-inch pizza/item
  (add "inch" suffix for any inch-based size: 6inch, 8inch, 11inch, 14inch, etc.)

CRITICAL RULES:
  1. Column HEADERS (7", Small, Full) become KEYS. Price NUMBERS (₹149, ₹299) become VALUES.
     WRONG: {"full":7}   RIGHT: {"7inch":149}
  2. Breads/rotis/naans always use "piece". Never use "full" for bread items.
  3. Add-on / Extras sections: category="Add-ons", key="piece" for every item.
  4. Only include prices actually printed in the image. Never invent prices.
  5. If a pizza only has 2 of 3 size columns, only include those 2 sizes.
  6. Never leave "description" empty.

EXAMPLES (study carefully):
[
  {"name":"Butter Chicken","category":"Non Veg Gravy","pricing":{"full":320,"half":180,"qtr":120},"description":"Tender chicken in velvety tomato-butter gravy"},
  {"name":"Veg Fried Rice","category":"Rice","pricing":{"full":160,"half":100},"description":"Wok-tossed rice with crisp vegetables and soy"},
  {"name":"Veg Sandwich","category":"Sandwich","pricing":{"full":70},"description":"Classic veg sandwich with fresh vegetables"},
  {"name":"Coleslaw Sandwich","category":"Sandwich","pricing":{"full":80},"description":"Creamy coleslaw sandwich with capsicum and mayo"},
  {"name":"Tandoori Roti","category":"Breads","pricing":{"piece":15},"description":"Whole-wheat bread baked fresh in a clay oven"},
  {"name":"Butter Naan","category":"Breads","pricing":{"piece":25},"description":"Soft buttery naan from the clay oven"},
  {"name":"Margherita Pizza","category":"Pizza","pricing":{"7inch":150,"10inch":249,"12inch":349},"description":"Classic pizza with mozzarella and fresh basil"},
  {"name":"Chicken Pizza","category":"Pizza","pricing":{"small":199,"medium":299,"large":399},"description":"Loaded with juicy chicken chunks and peppers"},
  {"name":"Mango Shake","category":"Beverages","pricing":{"small":80,"large":120},"description":"Thick chilled mango shake with fresh pulp"},
  {"name":"Tandoori Mayonnaise","category":"Add-ons","pricing":{"piece":30},"description":"Smoky tandoori mayo add-on for any dish"},
  {"name":"Extra Cheese","category":"Add-ons","pricing":{"piece":30},"description":"Add extra melted cheese to any dish"}
]

Now extract ALL items visible in the image:`;

  // ─── RETRY PROMPT: same rules, even more explicit ─────────────────────────
  const strictPrompt = `You are a precise menu data extractor. The first extraction attempt failed.
Extract every item from the menu image.

Return ONLY a raw JSON array. Start with [. End with ]. No markdown.

Each element must have ALL four fields:
{"name":"...","category":"...","pricing":{...},"description":"appetising one-liner max 12 words"}

!! DESCRIPTION RULE — ABSOLUTE !!
  Every item MUST have a non-empty description.
  If the photo shows a description → include it (one line).
  If no description is printed → write one short appetising sentence based on the dish name.
  Returning an empty or missing description field is a CRITICAL ERROR.

HOW TO BUILD THE PRICING OBJECT:

For column-based menus (FULL | HALF | QTR columns or size columns):
  Read the column header → that header text becomes the JSON key.
  Read the price in that column for each row → that price becomes the JSON value.
  Header mapping:
    FULL or Full Plate  → "full"
    HALF or Half Plate  → "half"
    QTR or Quarter      → "qtr"
    SMALL / SM / S      → "small"
    MEDIUM / MED / M    → "medium"
    LARGE / LG / L      → "large"
    XL / XLARGE         → "xlarge"
    6" / 6 inch         → "6inch"
    7" / 7 inch         → "7inch"
    8" / 8 inch         → "8inch"
    9" / 9 inch         → "9inch"
    10" / 10 inch       → "10inch"
    12" / 12 inch       → "12inch"
  !! The PRICE NUMBER (₹149, ₹299) goes in the VALUE. Never put an inch size (7, 10, 12) as the value.

For single-price items (one price, no column header):
  → "piece" if the item is a bread (roti, naan, paratha, kulcha, puri), raita, or add-on
  → "full" for everything else (curry, sandwich, soup, rice, starter, etc.)

For Add-on / Extras sections:
  → category = "Add-ons"
  → key = "piece"
  → Extract every bullet point as its own separate item

ABSOLUTE RULES:
  A. NEVER invent prices. NEVER copy a price from one item to another.
  B. NEVER use a bare size number (7, 10, 12) as a price value.
  C. NEVER use abbreviations (sm, lg) as keys — always use the full canonical key.
  D. If an item doesn't have a price for a particular size column, omit that size key.
  E. Every item must have at least one price. Never return an empty pricing object.
  F. Never leave description empty. Write a short appetising one-liner if not printed.

EXAMPLES:
[
  {"name":"Butter Chicken","category":"Non Veg","pricing":{"full":320,"half":180,"qtr":120},"description":"Tender chicken in velvety tomato-butter gravy"},
  {"name":"Veg Sandwich","category":"Sandwich","pricing":{"full":70},"description":"Classic veg sandwich with fresh vegetables"},
  {"name":"Tandoori Roti","category":"Breads","pricing":{"piece":15},"description":"Freshly baked whole-wheat roti from the clay oven"},
  {"name":"Butter Naan","category":"Breads","pricing":{"piece":25},"description":"Soft golden naan brushed with butter"},
  {"name":"Margherita","category":"Pizza","pricing":{"7inch":150,"10inch":249,"12inch":349},"description":"Classic pizza with mozzarella and basil"},
  {"name":"Chicken Tikka Pizza","category":"Pizza","pricing":{"small":199,"medium":299,"large":399},"description":"Spicy chicken tikka on a crispy pizza base"},
  {"name":"Mango Shake","category":"Beverages","pricing":{"small":80,"large":120},"description":"Thick chilled mango shake"},
  {"name":"Extra Cheese","category":"Add-ons","pricing":{"piece":30},"description":"Melted cheese add-on for any dish"},
  {"name":"Schezwan Sauce","category":"Add-ons","pricing":{"piece":30},"description":"Fiery schezwan dipping sauce"}
]

Now extract ALL items from the image. Be precise. Do not skip any item.`;

  const prompt = strict ? strictPrompt : lenientPrompt;

  // ─── Qwen thinking-model fixes ──────────────────────────────────────────
  // 1. System message starts with /no_think → disables the <think> chain.
  // 2. max_completion_tokens (not max_tokens) → correct param for this API.
  // 3. NO response_format → Qwen returns 400 json_validate_failed with it
  //    because Groq validates before stripping <think> tags.
  // 4. We strip any remaining <think> blocks manually in extractJsonArray.
  const response = await groq.chat.completions.create({
    model: 'qwen/qwen3.6-27b',
    messages: [
      {
        role: 'system',
        content:
          '/no_think\n' +
          'You are a precise menu extraction assistant. ' +
          'Respond with ONLY valid JSON — no markdown, no explanations, no code fences.',
      },
      {
        role: 'user',
        content: [
          { type: 'text', text: prompt },
          { type: 'image_url', image_url: { url: processedImage } },
        ],
      },
    ],
    max_completion_tokens: 4096,
    temperature: 0.1, // slight warmth; 0.0 can cause repetition loops on some models
  });

  const content = response.choices[0]?.message?.content || '';
  console.log('[extract-menu] Raw model response (first 300 chars):', content.slice(0, 300));

  const rawItems = extractJsonArray(content);
  const normalized = rawItems.map(normalizeItem).filter((i): i is MenuItemExtracted => i !== null);

  if (normalized.length === 0) {
    throw new Error('AI returned 0 valid menu items');
  }

  return normalized;
}

export async function POST(request: NextRequest) {
  // ── Auth guard ────────────────────────────────────────────────────────
  let uid: string;
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('mq_session')?.value;
    if (!sessionCookie) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const decoded = await getAdminAuth().verifySessionCookie(sessionCookie, true);
    uid = decoded.uid;
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { image, restaurantId } = body as { image: string; restaurantId?: string };

    if (!image || !image.startsWith('data:')) {
      return NextResponse.json(
        { error: 'Invalid image: must be a base64 data URI' },
        { status: 400 }
      );
    }

    // ── Per-restaurant quota check ────────────────────────────────────────
    if (restaurantId) {
      const adminDb = getAdminDb();
      const now = new Date();
      const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

      const [countSnap, restSnap] = await Promise.all([
        adminDb.collection('restaurants').doc(restaurantId)
          .collection('ai_import_counts').doc(monthKey).get(),
        adminDb.collection('restaurants').doc(restaurantId).get(),
      ]);

      // Also verify the requesting user owns this restaurant
      const restData = restSnap.data() as Record<string, unknown> | undefined;
      if (restData && restData.uid !== uid) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }

      const currentCount = countSnap.exists ? (countSnap.data() as { count: number }).count : 0;
      const limit: number = restData ? ((restData.ai_import_limit as number) ?? 5) : 5;

      if (currentCount >= limit) {
        return NextResponse.json(
          { error: `Monthly limit reached (${limit} imports/month)` },
          { status: 429 }
        );
      }
    }


    let items: MenuItemExtracted[];

    try {
      items = await extractWithGroq(image, false);
    } catch (firstError) {
      console.warn('[extract-menu] First attempt failed, retrying with strict prompt:', firstError);
      try {
        items = await extractWithGroq(image, true);
      } catch (secondError) {
        console.error('[extract-menu] Second attempt also failed:', secondError);
        return NextResponse.json(
          { error: 'Failed to extract menu items from image. Please try a clearer photo.' },
          { status: 422 }
        );
      }
    }

    return NextResponse.json({ items });
  } catch (error: unknown) {
    console.error('[extract-menu] Unexpected error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
