import type Stripe from 'stripe';
import { PL300_DAYS, admin, entitlementOf, isLive, json, stripe } from './_lib.js';
import type { EntitlementRow } from './_lib.js';

/**
 * POST /api/stripe-webhook: Stripe tells us about payments here, and we record who has access.
 * Events to enable on the endpoint: checkout.session.completed, customer.subscription.updated, customer.subscription.deleted.
 */
export async function POST(req: Request): Promise<Response> {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const signature = req.headers.get('stripe-signature');
  if (!secret || !signature) return json({ error: 'Missing signature.' }, 400);

  let event: Stripe.Event;
  try {
    event = await stripe().webhooks.constructEventAsync(await req.text(), signature, secret);
  } catch {
    return json({ error: 'Invalid signature.' }, 400);
  }

  switch (event.type) {
    case 'checkout.session.completed':
      await onCheckout(event.data.object);
      break;
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted': {
      const sub = event.data.object;
      const userId = sub.metadata.user_id;
      if (userId) await saveSubscription(userId, sub);
      break;
    }
  }
  return json({ received: true });
}

const idOf = (v: string | { id: string } | null | undefined): string | null => (v ? (typeof v === 'string' ? v : v.id) : null);

async function upsert(row: Omit<EntitlementRow, 'cancel_at_period_end'> & { cancel_at_period_end?: boolean }): Promise<void> {
  const { error } = await admin()
    .from('entitlements')
    .upsert({ cancel_at_period_end: false, ...row, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
  if (error) throw error;
}

async function onCheckout(session: Stripe.Checkout.Session): Promise<void> {
  const userId = session.client_reference_id ?? session.metadata?.user_id;
  if (!userId) return;

  if (session.mode === 'subscription') {
    const subId = idOf(session.subscription);
    if (subId) await saveSubscription(userId, await stripe().subscriptions.retrieve(subId));
    return;
  }

  if (session.mode === 'payment' && session.payment_status === 'paid') {
    const current = await entitlementOf(userId);
    // A live Pro already covers the PL-300 tests; keep it rather than downgrading.
    if (isLive(current) && current!.plan === 'pro') return;
    // Buying again while a PL-300 pass is still running extends it from its current end.
    const start = isLive(current) && current!.current_period_end ? new Date(current!.current_period_end).getTime() : Date.now();
    await upsert({
      user_id: userId,
      plan: 'pl300',
      status: 'paid',
      current_period_end: new Date(start + PL300_DAYS * 86_400_000).toISOString(),
      stripe_customer_id: idOf(session.customer) ?? current?.stripe_customer_id ?? null,
      stripe_subscription_id: null,
    });
  }
}

async function saveSubscription(userId: string, sub: Stripe.Subscription): Promise<void> {
  const current = await entitlementOf(userId);
  // Ignore events for an older subscription once the user has moved to a different one.
  if (current?.stripe_subscription_id && current.stripe_subscription_id !== sub.id && isLive(current)) return;
  // Newer Stripe API versions keep the billing period on the subscription item.
  const end = sub.items.data[0]?.current_period_end;
  await upsert({
    user_id: userId,
    plan: 'pro',
    status: sub.status,
    current_period_end: end ? new Date(end * 1000).toISOString() : null,
    cancel_at_period_end: sub.cancel_at_period_end,
    stripe_customer_id: idOf(sub.customer),
    stripe_subscription_id: sub.id,
  });
}
