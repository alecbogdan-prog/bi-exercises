# Enterprise (team) plans: what to do when a company writes

Companies click **Contact us** on the Pricing page, which emails `support@powerbiexercise.com` (read it in the
Resend inbox). Price list: **$144 per seat per year** (`team_seat_yearly`), billed by invoice, discounts optional.

## 1. Agree the details by email
Company legal name, VAT ID (if EU business), manager's email (they get a seat and the dashboard), number of seats,
any discount, payment terms (default 30 days).

## 2. Create the team and send the invoice (one command)
```bash
npm run team:live -- create --company "Acme SRL" --owner manager@acme.com --seats 10 --vat RO12345678 --discount 10 --days 30
```
This creates the Stripe customer and a yearly subscription for 10 seats billed by invoice, emails the invoice
(with a pay-online link) to the manager, creates the team, and makes the manager its owner. The manager gets an
invite email if they have no account yet. Pro access starts right away.

You can also ask Claude to run it: "add a team for Acme SRL, 10 seats, manager manager@acme.com, 10% off".

## 3. The manager does the rest at powerbiexercise.com/team
Invites colleagues by email (up to the seats), removes people, sees each person's progress (exercises solved,
points, streak, best PL-300 score, last active) and opens invoices.

## Later changes
| Need | Command |
|---|---|
| More (or fewer) seats | `npm run team:live -- seats --team manager@acme.com --seats 15` (Stripe invoices the prorated difference) |
| Add a person yourself | `npm run team:live -- add --team manager@acme.com --email person@acme.com` |
| Remove a person | `npm run team:live -- remove --team manager@acme.com --email person@acme.com` |
| Stop renewal | `npm run team:live -- cancel --team manager@acme.com` (access until the end of the paid year) |
| See all teams | `npm run team:live -- list` |

Use `npm run team -- …` (without `:live`) to try things on the Stripe sandbox first.

## How it works
- Tables `teams` and `team_members` in Supabase (`supabase/schema.sql`); members get Pro while the team's
  subscription is `active` (or `past_due` while an invoice is chased). Unpaid or cancelled → access ends.
- The Stripe webhook keeps seats, status and dates in sync (`api/stripe-webhook.ts`, `metadata.kind = team`).
- `api/team-invite.ts` lets the manager invite within their seats; `src/pages/TeamPage.tsx` is the dashboard.
- Invoices are not under Managed Payments: ask your accountant how to handle VAT on B2B invoices
  (EU reverse charge with the customer's VAT ID, Romanian VAT for Romanian companies).
