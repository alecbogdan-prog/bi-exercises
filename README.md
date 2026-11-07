# Power BI Exercises

Interactive Power BI / DAX exercises that run entirely in the browser, with instant answer checking.

## Run

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # engine + checker tests (vitest)
npm run build    # production build in dist/ (deploy to Vercel; vercel.json handles SPA routes)
```

## How it works

- `src/engine/` is a small in-memory BI engine:
  - `parser.ts`: DAX tokenizer and parser (subset of DAX).
  - `engine.ts`: evaluator with filter context, row context, context transition, relationships,
    CALCULATE semantics (filter override, ALL/REMOVEFILTERS, KEEPFILTERS), iterators and time intelligence.
  - `visual.ts`: turns a visual definition (wells + filters) into a result grid.
  - `dataset.ts`: deterministic fictional sales model (Sales, Product, Customer, Date).
- `src/exercises/`: exercise definitions (`exercises.ts`) and the automatic checker (`checker.ts`).
  Report exercises compare the learner's visual output with the target; DAX exercises evaluate the
  learner's measure in several filter contexts and compare with the reference solution.
- `src/components/Workspace.tsx`: report editor (fields pane, visualizations pane, filters, formula bar, data view).

## Accounts and payments

Accounts use Supabase (passwordless email link or Google). Payments use Stripe Checkout, and the Stripe webhook records
who has access in the `entitlements` table. Without the env vars below the site still builds and runs: accounts stay off
and the paid buttons show "Coming soon".

- `api/checkout.ts`: creates a Checkout page for `pro-year`, `pro-month` or `pl300`.
- `api/stripe-webhook.ts`: listens for `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted` and `charge.refunded` (a fully refunded PL-300 purchase takes its days back; to refund Pro, cancel the subscription immediately with a refund).
- `api/portal.ts`: opens the Stripe customer portal (invoices, card, cancel).
- `src/lib/account.ts`: the signed-in user and their plan; `hasPro()` / `hasPl300()` in `src/lib/access.ts` read it.

Setup:

1. Create a Supabase project. Run `supabase/schema.sql` in its SQL Editor. Under Authentication → URL Configuration, set the
   Site URL and add `http://localhost:5173/**` and your production URL to the redirect URLs. For Google sign-in, enable the Google provider.
2. Copy `.env.example` to `.env.local` and fill in the Supabase and Stripe test keys.
3. Run `scripts/stripe-setup.sh` to create the products and prices (lookup keys `pro_yearly`, `pro_monthly`, `pl300_prep`).
   In the Stripe dashboard, save the customer portal settings once (Settings → Billing → Customer portal).
4. Local webhooks: `stripe listen --forward-to localhost:5173/api/stripe-webhook`, and put the `whsec_...` it prints in `.env.local`.
5. Production: add the same env vars in Vercel, and create a webhook endpoint at `https://<your-domain>/api/stripe-webhook` with the four events above.

Test card: `4242 4242 4242 4242`, any future date, any CVC.

## Adding an exercise

Add an object to `EXERCISES` in `src/exercises/exercises.ts` with a starter visual, a solution and a
check. `src/exercises/checker.test.ts` automatically verifies that every solution passes and every starter fails.

Not affiliated with Microsoft. Sample data is fictional.
