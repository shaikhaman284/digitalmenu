import { NextRequest, NextResponse } from 'next/server';
import { getGroqClient } from '@/lib/groq';
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
  return pricing.full ?? pricing.half ?? pricing.qtr ?? pricing.piece ?? 0;
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
function extractJsonArray(raw: string): MenuItemExtracted[] {
  // 1. Strip markdown fences
  let text = raw
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
  const description = String(item.description || '').trim();

  // Normalize pricing — handle both new `pricing` object and old `price` field
  let pricing: PricingTiers = {};

  if (item.pricing && typeof item.pricing === 'object') {
    const p = item.pricing as Record<string, unknown>;
    const num = (v: unknown) => typeof v === 'number' ? v : (typeof v === 'string' ? parseFloat(v) : NaN);
    if (!isNaN(num(p.full))  && num(p.full)  > 0) pricing.full  = num(p.full);
    if (!isNaN(num(p.half))  && num(p.half)  > 0) pricing.half  = num(p.half);
    if (!isNaN(num(p.qtr))   && num(p.qtr)   > 0) pricing.qtr   = num(p.qtr);
    if (!isNaN(num(p.piece)) && num(p.piece) > 0) pricing.piece = num(p.piece);
  }

  // Fallback: AI returned old-style single `price` field and no `pricing`
  if (Object.keys(pricing).length === 0) {
    const raw = item as unknown as Record<string, unknown>;
    const singlePrice = typeof raw.price === 'number'
      ? raw.price
      : parseFloat(String(raw.price ?? '0')) || 0;
    if (singlePrice > 0) pricing = { full: singlePrice };
  }

  const price = basePriceFromTiers(pricing);
  return { name, category, price, pricing, description };
}

async function extractWithGroq(imageBase64: string, strict = false): Promise<MenuItemExtracted[]> {
  const groq = getGroqClient();

  const prompt = strict
    ? `You are a precise menu data extractor for Indian restaurant menus.

OUTPUT FORMAT: Return ONLY a raw JSON array — no markdown, no explanation, no code fences.
Start your response with [ and end with ].

Each element must be a JSON object with exactly these keys:
  "name"        – string: the dish name as written
  "category"    – string: the section heading this item belongs to (e.g. "Non Veg Starters", "Breads", "Rice", "Pure Veg", "Raita", "Roomali Rolls", etc.)
  "pricing"     – object: include ONLY the price tier keys that are present for this item:
                    "full"  (number) – price for a full plate/serving
                    "half"  (number) – price for a half plate
                    "qtr"   (number) – price for a quarter plate
                    "piece" (number) – price per individual piece
  "description" – string: empty string "" if not shown in the menu

STEP 1 — Read column headers:
  Look at the column headers printed above each price column (e.g. FULL, HALF, QTR.).
  Map each price number to the column header directly above it.
  Use "full", "half", "qtr", or "piece" accordingly.

STEP 2 — Single unlabeled price rule:
  If an item has only ONE price and NO column header above it, choose the key based on the item's category:
  • Use "piece" for: Breads, Roti, Naan, Parantha, Raita, individual bread/condiment items
  • Use "full"  for: everything else (starters, curries, rice, rolls, biryani, etc.)

STEP 3 — Never invent prices. Only extract numbers actually printed in the image.

Examples:
[{"name":"Butter Chicken","category":"Non Veg Starters","pricing":{"full":500,"half":300,"qtr":200},"description":""},
 {"name":"Tandoori Roti","category":"Breads","pricing":{"piece":15},"description":""},
 {"name":"Butter Naan","category":"Breads","pricing":{"piece":40},"description":""},
 {"name":"Boondi Raita","category":"Raita","pricing":{"piece":100},"description":""},
 {"name":"Chicken Biryani","category":"Rice","pricing":{"full":200},"description":""}]

Now extract ALL items from the image:`
    : `You are extracting items from an Indian restaurant menu image.
Return ONLY a JSON array (start with [, end with ]). No markdown, no explanation.

Each object: { "name": string, "category": string, "pricing": object, "description": string }

For "pricing", use these rules:
1. Read the column headers in the image (FULL / HALF / QTR / PIECE) and map prices to those exact keys: "full", "half", "qtr", "piece".
2. If an item has a single price with NO column header:
   - Use "piece" for breads, roti, naan, parantha, raita, and similar individual items.
   - Use "full" for all other items (starters, curries, rice, biryani, rolls, etc.).
3. Only include the tiers that are actually printed for each item. Never guess or add extra tiers.`;

  const response = await groq.chat.completions.create({
    model: 'meta-llama/llama-4-scout-17b-16e-instruct',
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: prompt },
          { type: 'image_url', image_url: { url: imageBase64 } },
        ],
      },
    ],
    max_tokens: 8192,
    temperature: 0.0, // deterministic for parsing reliability
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
  try {
    const body = await request.json();
    const { image } = body as { image: string };

    if (!image || !image.startsWith('data:')) {
      return NextResponse.json(
        { error: 'Invalid image: must be a base64 data URI' },
        { status: 400 }
      );
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
