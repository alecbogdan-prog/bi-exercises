import type Stripe from 'stripe';
import { OFFERS, entitlementOf, isLive, json, siteUrl, stripe, userFrom } from './_lib.js';
import type { OfferId } from './_lib.js';

/** POST /api/checkout { offer: 'pro-year' | 'pro-month' | 'pl300' } → { url } of a Stripe Checkout page. */
export async function POST(req: Request): Promise<Response> {
  const user = await userFrom(req);
  if (!user) return json({ error: 'Please log in first.' }, 401);

  const { offer } = (await req.json().catch(() => ({}))) as { offer?: string };
  if (!offer || !(offer in OFFERS)) return json({ error: 'Unknown plan.' }, 400);
  const def = OFFERS[offer as OfferId];

  const current = await entitlementOf(user.id);
  if (isLive(current) && current!.plan === 'pro') return json({ error: 'You already have Pro.', manage: true }, 409);

  const prices = await stripe().prices.list({ lookup_keys: [def.lookupKey], active: true, limit: 1 });
  const price = prices.data[0];
  if (!price) return json({ error: `Price "${def.lookupKey}" is not set up in Stripe.` }, 500);

  const site = siteUrl(req);
  const metadata = { user_id: user.id, plan: def.plan };
  const params: Stripe.Checkout.SessionCreateParams = {
    mode: def.mode,
    line_items: [{ price: price.id, quantity: 1 }],
    client_reference_id: user.id,
    metadata,
    allow_promotion_codes: true,
    success_url: `${site}/account?checkout=success`,
    cancel_url: `${site}/pricing`,
    ...(current?.stripe_customer_id ? { customer: current.stripe_customer_id } : { customer_email: user.email }),
    ...(def.mode === 'subscription' ? { subscription_data: { metadata } } : { payment_intent_data: { metadata }, ...(current?.stripe_customer_id ? {} : { customer_creation: 'always' as const }) }),
  };

  const session = await stripe().checkout.sessions.create(params);
  return json({ url: session.url });
}
