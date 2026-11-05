import { entitlementOf, json, siteUrl, stripe, userFrom } from './_lib.js';

/** POST /api/portal → { url } of the Stripe customer portal (invoices, card, cancel). */
export async function POST(req: Request): Promise<Response> {
  const user = await userFrom(req);
  if (!user) return json({ error: 'Please log in first.' }, 401);

  const customer = (await entitlementOf(user.id))?.stripe_customer_id;
  if (!customer) return json({ error: 'No purchases on this account yet.' }, 404);

  const session = await stripe().billingPortal.sessions.create({ customer, return_url: `${siteUrl(req)}/account` });
  return json({ url: session.url });
}
