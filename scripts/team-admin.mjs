#!/usr/bin/env node
// Enterprise / team plans, sold by invoice. Run with:
//   npm run team -- <command> ...        (Stripe sandbox, for testing)
//   npm run team:live -- <command> ...   (live Stripe: real invoices)
//
// Commands
//   create --company "Acme SRL" --owner manager@acme.com --seats 10 [--vat RO12345678] [--discount 15] [--days 30] [--address "Street 1, City"]
//          Creates the Stripe customer, a yearly subscription for N seats (team_seat_yearly, $144/seat) billed by invoice,
//          emails the invoice, creates the team and makes the manager its owner (they get Pro and the /team dashboard).
//   seats  --team <owner email|team id> --seats 15    Changes seats; Stripe invoices the prorated difference.
//   add    --team <...> --email person@acme.com       Adds a member (counts against seats) and emails an invite.
//   remove --team <...> --email person@acme.com       Removes a member (their Pro access ends).
//   cancel --team <...>                               Cancels at the end of the paid year.
//   list                                              Lists all teams with seats, members and status.
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const SITE = (process.env.SITE_URL || 'https://powerbiexercise.com').replace(/\/$/, '');
const need = (name) => {
  if (!process.env[name]) throw new Error(`Missing ${name} (run through "npm run team" so the env files are loaded)`);
  return process.env[name];
};
const stripe = new Stripe(need('STRIPE_SECRET_KEY'));
const db = createClient(need('VITE_SUPABASE_URL').replace(/\/(rest\/v1\/?)?$/, ''), need('SUPABASE_SERVICE_ROLE_KEY'), { auth: { persistSession: false } });
const LIVE = need('STRIPE_SECRET_KEY').includes('_live_');

function args(argv) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith('--')) out[argv[i].slice(2)] = argv[i + 1]?.startsWith('--') || argv[i + 1] === undefined ? true : argv[++i];
    else out._.push(argv[i]);
  }
  return out;
}
const fail = (msg) => {
  console.error(`✗ ${msg}`);
  process.exit(1);
};
const ok = (msg) => console.log(`✓ ${msg}`);

async function findUserByEmail(email) {
  for (let page = 1; page < 50; page++) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    const u = data.users.find((x) => x.email?.toLowerCase() === email.toLowerCase());
    if (u) return u;
    if (data.users.length < 1000) return null;
  }
  return null;
}

/** The user for this email, creating them with an invite email if they have no account yet. */
async function ensureUser(email) {
  const existing = await findUserByEmail(email);
  if (existing) return { user: existing, invited: false };
  const { data, error } = await db.auth.admin.inviteUserByEmail(email, { redirectTo: `${SITE}/team` });
  if (error) throw error;
  return { user: data.user, invited: true };
}

async function teamFor(ref) {
  if (!ref) fail('Pass --team <owner email or team id>');
  let q = db.from('teams').select('*');
  if (/^[0-9a-f-]{36}$/i.test(ref)) q = q.eq('id', ref);
  else {
    const owner = await findUserByEmail(ref);
    if (!owner) fail(`No user with email ${ref}`);
    q = q.eq('owner_id', owner.id);
  }
  const { data, error } = await q.order('created_at', { ascending: false }).limit(1).maybeSingle();
  if (error) throw error;
  if (!data) fail(`No team found for ${ref}`);
  return data;
}

async function seatPrice() {
  const price = (await stripe.prices.list({ lookup_keys: ['team_seat_yearly'], active: true, limit: 1 })).data[0];
  if (!price) fail('Price team_seat_yearly is missing in this Stripe account (run scripts/stripe-setup.sh)');
  return price;
}

function fields(sub) {
  const item = sub.items.data[0];
  const periodEnd = item?.current_period_end;
  const end = sub.cancel_at && periodEnd ? Math.min(sub.cancel_at, periodEnd) : (sub.cancel_at ?? periodEnd);
  return { seats: item?.quantity ?? 1, status: sub.status, current_period_end: end ? new Date(end * 1000).toISOString() : null, cancel_at_period_end: sub.cancel_at_period_end || sub.cancel_at !== null };
}

async function create(a) {
  const company = a.company;
  const ownerEmail = String(a.owner || '').toLowerCase();
  const seats = Number(a.seats);
  if (!company || !ownerEmail || !Number.isInteger(seats) || seats < 1) fail('Usage: create --company "Acme SRL" --owner manager@acme.com --seats 10');
  const price = await seatPrice();

  const { user, invited } = await ensureUser(ownerEmail);
  const { data: owned } = await db.from('teams').select('id').eq('owner_id', user.id).in('status', ['active', 'trialing', 'past_due']).limit(1);
  if (owned?.length) fail(`${ownerEmail} already manages an active team (${owned[0].id})`);

  const customer = await stripe.customers.create({
    name: company,
    email: ownerEmail,
    ...(a.address ? { address: { line1: String(a.address) } } : {}),
    metadata: { kind: 'team', owner_user_id: user.id },
    ...(a.vat ? { tax_id_data: [{ type: 'eu_vat', value: String(a.vat).replace(/\s/g, '') }] } : {}),
  });

  let discounts;
  if (a.discount) {
    const coupon = await stripe.coupons.create({ percent_off: Number(a.discount), duration: 'forever', name: `${company} team discount` });
    discounts = [{ coupon: coupon.id }];
  }

  const sub = await stripe.subscriptions.create({
    customer: customer.id,
    items: [{ price: price.id, quantity: seats }],
    collection_method: 'send_invoice',
    days_until_due: Number(a.days || 30),
    metadata: { kind: 'team', owner_user_id: user.id, company },
    ...(discounts ? { discounts } : {}),
  });

  const { data: team, error } = await db
    .from('teams')
    .insert({ name: company, owner_id: user.id, stripe_customer_id: customer.id, stripe_subscription_id: sub.id, ...fields(sub) })
    .select()
    .single();
  if (error) throw error;
  const { error: mErr } = await db.from('team_members').insert({ team_id: team.id, email: ownerEmail, user_id: user.id, role: 'owner', joined_at: new Date().toISOString() });
  if (mErr) throw mErr;

  // Make sure the invoice goes out by email now (Stripe also emails finalized send_invoice invoices).
  const invoiceId = typeof sub.latest_invoice === 'string' ? sub.latest_invoice : sub.latest_invoice?.id;
  let invoice = invoiceId ? await stripe.invoices.retrieve(invoiceId) : null;
  if (invoice?.status === 'draft') invoice = await stripe.invoices.finalizeInvoice(invoice.id);
  if (invoice && invoice.status === 'open') invoice = await stripe.invoices.sendInvoice(invoice.id);

  ok(`Team "${company}" created (${team.id}) with ${seats} seats${a.discount ? `, ${a.discount}% off` : ''} ${LIVE ? '[LIVE]' : '[sandbox]'}`);
  ok(`Manager: ${ownerEmail}${invited ? ' (new account, invite email sent)' : ' (existing account)'}; they manage colleagues at ${SITE}/team`);
  if (invoice) ok(`Invoice ${invoice.number ?? invoice.id}: ${(invoice.amount_due / 100).toFixed(2)} ${invoice.currency.toUpperCase()}, due in ${a.days || 30} days, ${invoice.status}. Link: ${invoice.hosted_invoice_url}`);
}

async function setSeats(a) {
  const team = await teamFor(a.team);
  const seats = Number(a.seats);
  if (!Number.isInteger(seats) || seats < 1) fail('Pass --seats N');
  const { count } = await db.from('team_members').select('*', { count: 'exact', head: true }).eq('team_id', team.id);
  if (seats < (count ?? 0)) fail(`The team already has ${count} members; remove some first`);
  const sub = await stripe.subscriptions.retrieve(team.stripe_subscription_id);
  const updated = await stripe.subscriptions.update(sub.id, { items: [{ id: sub.items.data[0].id, quantity: seats }], proration_behavior: 'always_invoice' });
  await db.from('teams').update({ ...fields(updated), updated_at: new Date().toISOString() }).eq('id', team.id);
  ok(`"${team.name}" now has ${seats} seats (was ${team.seats}). Stripe invoices the prorated difference.`);
}

async function add(a) {
  const team = await teamFor(a.team);
  const email = String(a.email || '').toLowerCase();
  if (!email) fail('Pass --email');
  const { count } = await db.from('team_members').select('*', { count: 'exact', head: true }).eq('team_id', team.id);
  if ((count ?? 0) >= team.seats) fail(`All ${team.seats} seats are used; add seats first (seats --seats ${team.seats + 1})`);
  const { user, invited } = await ensureUser(email);
  const { error } = await db.from('team_members').insert({ team_id: team.id, email, user_id: user.id, role: 'member', joined_at: new Date().toISOString() });
  if (error) fail(error.message);
  ok(`${email} added to "${team.name}"${invited ? ' (invite email sent)' : ''}`);
}

async function remove(a) {
  const team = await teamFor(a.team);
  const email = String(a.email || '').toLowerCase();
  const { data, error } = await db.from('team_members').delete().eq('team_id', team.id).eq('email', email).neq('role', 'owner').select();
  if (error) throw error;
  if (!data.length) fail(`${email} is not a member of "${team.name}" (or is its manager)`);
  ok(`${email} removed from "${team.name}"`);
}

async function cancel(a) {
  const team = await teamFor(a.team);
  const sub = await stripe.subscriptions.update(team.stripe_subscription_id, { cancel_at_period_end: true });
  await db.from('teams').update({ ...fields(sub), updated_at: new Date().toISOString() }).eq('id', team.id);
  ok(`"${team.name}" cancels at the end of the paid year (${fields(sub).current_period_end?.slice(0, 10)})`);
}

async function list() {
  const { data: teams, error } = await db.from('teams').select('*').order('created_at');
  if (error) throw error;
  if (!teams.length) return console.log('No teams yet.');
  for (const t of teams) {
    const { data: m } = await db.from('team_members').select('email, role, user_id, joined_at').eq('team_id', t.id);
    const joined = m.filter((x) => x.user_id).length;
    console.log(`${t.name}  [${t.status}${t.cancel_at_period_end ? ', cancelling' : ''}]  seats ${m.length}/${t.seats} (${joined} joined)  until ${t.current_period_end?.slice(0, 10) ?? '-'}  id ${t.id}`);
    for (const x of m) console.log(`    ${x.role === 'owner' ? '★' : '·'} ${x.email}${x.user_id ? '' : '  (invited)'}`);
  }
}

const a = args(process.argv.slice(2));
const cmd = a._[0];
const commands = { create, seats: setSeats, add, remove, cancel, list };
if (!commands[cmd]) {
  console.log('Commands: create, seats, add, remove, cancel, list. See the top of scripts/team-admin.mjs.');
  process.exit(cmd ? 1 : 0);
}
console.log(LIVE ? '⚠ LIVE Stripe account' : 'Stripe sandbox (test)');
await commands[cmd](a).catch((e) => fail(e.message));
