import type { EmailOtpType } from '@supabase/supabase-js';

/**
 * Reads the link in our sign-in emails: https://powerbiexercise.com/auth/confirm?token_hash=…&type=…&next=…
 * The emails point at our own domain (not the Supabase project URL); this page then verifies the token.
 */
export interface EmailLink {
  tokenHash: string;
  type: EmailOtpType;
  /** Where to go after signing in: always a path on this site. */
  next: string;
}

const TYPES: EmailOtpType[] = ['email', 'magiclink', 'signup', 'invite', 'recovery', 'email_change'];

/** A same-site path from `next`, which Supabase fills with the full redirect URL (possibly not URL-encoded). */
export function safeNextPath(raw: string | null | undefined, origin: string): string {
  if (!raw) return '/account';
  let value = raw;
  try {
    if (/^https?%3A/i.test(value) || value.startsWith('%2F')) value = decodeURIComponent(value);
  } catch {
    return '/account';
  }
  if (value.startsWith(origin)) value = value.slice(origin.length) || '/';
  return value.startsWith('/') && !value.startsWith('//') ? value : '/account';
}

/** Parses the query string. `next` is read as everything after "next=", because it is last and may contain its own "?" and "&". */
export function parseEmailLink(search: string, origin: string): EmailLink | null {
  const query = search.startsWith('?') ? search.slice(1) : search;
  const at = query.indexOf('next=');
  const head = at >= 0 ? query.slice(0, at) : query;
  const params = new URLSearchParams(head);
  const tokenHash = params.get('token_hash');
  const type = params.get('type') as EmailOtpType | null;
  if (!tokenHash || !type || !TYPES.includes(type)) return null;
  return { tokenHash, type, next: safeNextPath(at >= 0 ? query.slice(at + 'next='.length) : null, origin) };
}
