import { NextRequest, NextResponse } from 'next/server';
import { getGroqClient } from '@/lib/groq';

export const runtime = 'nodejs';

interface MenuItemExtracted {
  name: string;
  category: string;
  price: number;
  description: string;
}

async function extractWithGroq(imageBase64: string, strict = false): Promise<MenuItemExtracted[]> {
  const groq = getGroqClient();

  const prompt = strict
    ? `You are a precise menu extractor. Extract ALL menu items visible in this image.
Return ONLY a valid JSON array. No markdown. No code blocks. No explanation. No text before or after.
Each object MUST have exactly these fields:
- "name": string (item name)
- "category": string (food category like Starters, Main Course, Beverages, Desserts, etc.)
- "price": number (price as a number only, no currency symbols)
- "description": string (brief description, or empty string "" if not visible)

Example output format: [{"name":"Paneer Tikka","category":"Starters","price":220,"description":"Marinated cottage cheese grilled to perfection"}]`
    : `Extract all menu items from this image. Return ONLY a JSON array, no markdown, no explanation. Each object must have: name (string), category (string), price (number, just the number), description (string, leave empty string if not visible)`;

  const response = await groq.chat.completions.create({
    model: 'meta-llama/llama-4-scout-17b-16e-instruct',
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: prompt,
          },
          {
            type: 'image_url',
            image_url: {
              url: imageBase64,
            },
          },
        ],
      },
    ],
    max_tokens: 4096,
    temperature: 0.1,
  });

  const content = response.choices[0]?.message?.content || '';

  // Strip any markdown code blocks if present
  const cleaned = content
    .replace(/```json\s*/gi, '')
    .replace(/```\s*/gi, '')
    .trim();

  // Find the JSON array in the response
  const startIdx = cleaned.indexOf('[');
  const endIdx = cleaned.lastIndexOf(']');
  if (startIdx === -1 || endIdx === -1) {
    throw new Error('No JSON array found in response');
  }

  const jsonStr = cleaned.slice(startIdx, endIdx + 1);
  const items = JSON.parse(jsonStr) as MenuItemExtracted[];

  // Validate and normalize
  return items.map((item) => ({
    name: String(item.name || '').trim(),
    category: String(item.category || 'General').trim(),
    price: typeof item.price === 'number' ? item.price : parseFloat(String(item.price)) || 0,
    description: String(item.description || '').trim(),
  })).filter((item) => item.name.length > 0);
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
      console.warn('First extraction attempt failed, retrying with strict prompt:', firstError);
      try {
        items = await extractWithGroq(image, true);
      } catch (secondError) {
        console.error('Second extraction attempt failed:', secondError);
        return NextResponse.json(
          { error: 'Failed to extract menu items from image' },
          { status: 422 }
        );
      }
    }

    return NextResponse.json({ items });
  } catch (error: unknown) {
    console.error('extract-menu error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
