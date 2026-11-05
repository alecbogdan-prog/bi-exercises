// Google Analytics 4, loaded only after the visitor accepts analytics cookies (GDPR).
// Set VITE_GA_ID (e.g. G-XXXXXXX) to turn it on; without it there is no banner and nothing loads.

export const GA_ID = (import.meta.env.VITE_GA_ID as string | undefined)?.trim() || null;

export type Consent = 'granted' | 'denied';

const KEY = 'biex:consent';
const CHANGE = 'biex:consent-change';

type Gtag = (...args: unknown[]) => void;
declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: Gtag;
  }
}

export function getConsent(): Consent | null {
  try {
    const v = localStorage.getItem(KEY);
    return v === 'granted' || v === 'denied' ? v : null;
  } catch {
    return null;
  }
}

let loaded = false;

function loadGA(): void {
  if (loaded || !GA_ID) return;
  loaded = true;
  window.dataLayer = window.dataLayer ?? [];
  // gtag must push the `arguments` object itself, not an array copy.
  window.gtag = function gtag() {
    // eslint-disable-next-line prefer-rest-params
    window.dataLayer!.push(arguments);
  };
  window.gtag('js', new Date());
  // Page views are sent by trackPageView on every route change (this is a single-page app).
  window.gtag('config', GA_ID, { send_page_view: false });
  const s = document.createElement('script');
  s.async = true;
  s.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(GA_ID)}`;
  document.head.appendChild(s);
}

/** Remove the GA cookies (_ga, _ga_*) when the visitor withdraws consent. */
function clearGACookies(): void {
  const host = location.hostname;
  const domains = [host, `.${host}`, `.${host.split('.').slice(-2).join('.')}`];
  for (const c of document.cookie.split(';')) {
    const name = c.split('=')[0].trim();
    if (name === '_ga' || name.startsWith('_ga_')) {
      for (const d of domains) document.cookie = `${name}=; Max-Age=0; path=/; domain=${d}`;
      document.cookie = `${name}=; Max-Age=0; path=/`;
    }
  }
}

export function setConsent(c: Consent): void {
  try {
    localStorage.setItem(KEY, c);
  } catch {
    /* storage blocked: the choice lasts for this page view only */
  }
  if (c === 'granted') {
    loadGA();
    trackPageView(location.pathname + location.search);
  } else {
    clearGACookies();
    // GA may already be running from earlier in this visit; a reload stops it cleanly.
    if (loaded) location.reload();
  }
  window.dispatchEvent(new Event(CHANGE));
}

/** Ask again (footer "Cookie settings"): forget the choice and show the banner. */
export function reopenConsent(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new Event(CHANGE));
}

export function onConsentChange(cb: () => void): () => void {
  window.addEventListener(CHANGE, cb);
  return () => window.removeEventListener(CHANGE, cb);
}

export function trackPageView(path: string): void {
  if (!GA_ID || getConsent() !== 'granted') return;
  loadGA();
  window.gtag?.('event', 'page_view', { page_path: path, page_location: location.origin + path, page_title: document.title });
}

/** Optional custom events (e.g. 'begin_checkout'); no-ops without consent. */
export function trackEvent(name: string, params: Record<string, unknown> = {}): void {
  if (!GA_ID || getConsent() !== 'granted') return;
  window.gtag?.('event', name, params);
}

// Returning visitors who already accepted: start GA right away.
if (GA_ID && getConsent() === 'granted') loadGA();
