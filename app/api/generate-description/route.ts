import { NextRequest, NextResponse } from 'next/server';
import { getGroqClient } from '@/lib/groq';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, category } = body as { name: string; category: string };

    if (!name || !category) {
      return NextResponse.json(
        { error: 'name and category are required' },
        { status: 400 }
      );
    }

    const groq = getGroqClient();

    const response = await groq.chat.completions.create({
      model: 'qwen/qwen3.8-27b',
      messages: [
        {
          role: 'user',
          content: `Generate a single appetizing one-line description (max 15 words) for a menu item called '${name}' in the '${category}' category. Return only the description, nothing else.`,
        },
      ],
      max_completion_tokens: 100,
      temperature: 0.6,
     // include_reasoning: false, // Turn off reasoning/thinking, return only final answer
    });

    const description = (response.choices[0]?.message?.content || '').trim()
      .replace(/^["']|["']$/g, '') // strip surrounding quotes
      .split('.')[0] // take only first sentence
      .trim();

    return NextResponse.json({ description });
  } catch (error: unknown) {
    console.error('generate-description error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
