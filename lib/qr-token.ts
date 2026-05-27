/**
 * QR Slug Token — HMAC-SHA256 based signing for menu URLs.
 *
 * Each QR code URL contains a short token: /m/MQ-0001?t=<token>
 * The token is derived as: HMAC-SHA256(QR_SLUG_SECRET, slug), truncated to 16 hex chars.
 * Without knowing the secret, an attacker cannot forge a valid token for an arbitrary slug.
 *
 * SERVER-SIDE ONLY — uses Node.js `crypto` module.
 */

import { createHmac } from 'crypto';

const SECRET = process.env.QR_SLUG_SECRET ?? 'fallback-insecure-dev-secret';

/** Generate a 16-char hex token for a given slug */
export function generateSlugToken(slug: string): string {
  return createHmac('sha256', SECRET).update(slug).digest('hex').slice(0, 16);
}

/** Verify that a token matches the expected token for a slug (constant-time safe via full comparison) */
export function verifySlugToken(slug: string, token: string | null | undefined): boolean {
  if (!token) return false;
  const expected = generateSlugToken(slug);
  // Constant-time comparison to prevent timing attacks
  if (expected.length !== token.length) return false;
  let mismatch = 0;
  for (let i = 0; i < expected.length; i++) {
    mismatch |= expected.charCodeAt(i) ^ token.charCodeAt(i);
  }
  return mismatch === 0;
}

/** Build the full signed menu URL for a given slug */
export function buildMenuUrl(baseUrl: string, slug: string): string {
  const token = generateSlugToken(slug);
  return `${baseUrl}/m/${slug}?t=${token}`;
}
