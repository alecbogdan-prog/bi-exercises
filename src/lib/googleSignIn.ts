// "Sign in with Google" through Google Identity Services, so the Google window shows powerbiexercise.com
// (not the Supabase project URL). Google returns an ID token in the page; Supabase checks it with signInWithIdToken.
import { supabase } from './supabase';

/** The public OAuth client ID ("Web client 1" in Google Cloud). Empty means: use the redirect flow instead. */
export const GOOGLE_CLIENT_ID = (import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined) ?? '';

interface CredentialResponse {
  credential: string;
}

interface GoogleId {
  initialize(config: { client_id: string; callback: (r: CredentialResponse) => void; nonce: string; use_fedcm_for_button?: boolean; ux_mode?: 'popup' }): void;
  renderButton(el: HTMLElement, options: Record<string, string | number>): void;
}

declare global {
  interface Window {
    google?: { accounts: { id: GoogleId } };
  }
}

let loading: Promise<GoogleId> | null = null;

/** Loads Google's script once. */
export function loadGoogle(): Promise<GoogleId> {
  if (window.google?.accounts?.id) return Promise.resolve(window.google.accounts.id);
  loading ??= new Promise<GoogleId>((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://accounts.google.com/gsi/client?hl=en';
    s.async = true;
    s.onload = () => (window.google?.accounts?.id ? resolve(window.google.accounts.id) : reject(new Error('Google sign-in did not load')));
    s.onerror = () => {
      loading = null;
      reject(new Error('Google sign-in could not load'));
    };
    document.head.appendChild(s);
  });
  return loading;
}

async function sha256Hex(text: string): Promise<string> {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Draws Google's button into `el`. A fresh nonce protects against replayed tokens:
 * Google gets its SHA-256 hash, Supabase gets the original and checks they match.
 */
export async function renderGoogleButton(el: HTMLElement, width: number, onError: (message: string) => void): Promise<void> {
  if (!supabase || !GOOGLE_CLIENT_ID) throw new Error('Google sign-in is not configured');
  const id = await loadGoogle();
  const nonce = btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(24))));
  id.initialize({
    client_id: GOOGLE_CLIENT_ID,
    nonce: await sha256Hex(nonce),
    use_fedcm_for_button: true,
    ux_mode: 'popup',
    callback: (r) => {
      void supabase!.auth.signInWithIdToken({ provider: 'google', token: r.credential, nonce }).then(({ error }) => {
        if (error) onError(error.message);
      });
    },
  });
  el.replaceChildren();
  id.renderButton(el, { type: 'standard', theme: 'outline', size: 'large', text: 'continue_with', shape: 'rectangular', logo_alignment: 'center', width, locale: 'en' });
}
