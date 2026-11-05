import { accessToken } from './account';

export type OfferId = 'pro-year' | 'pro-month' | 'pl300';

export class BillingError extends Error {
  readonly status: number;
  readonly manage: boolean;
  constructor(message: string, status: number, manage = false) {
    super(message);
    this.status = status;
    this.manage = manage;
  }
}

async function post(path: string, body: unknown): Promise<string> {
  const token = await accessToken();
  if (!token) throw new BillingError('Please log in first.', 401);
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string; manage?: boolean };
  if (!res.ok || !data.url) throw new BillingError(data.error ?? 'Something went wrong. Please try again.', res.status, data.manage);
  return data.url;
}

/** Send the visitor to Stripe Checkout for this offer. */
export async function startCheckout(offer: OfferId): Promise<void> {
  window.location.assign(await post('/api/checkout', { offer }));
}

/** Send the visitor to the Stripe customer portal (invoices, card, cancel). */
export async function openPortal(): Promise<void> {
  window.location.assign(await post('/api/portal', {}));
}
