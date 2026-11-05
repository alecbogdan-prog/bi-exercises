# Services used by Power BI Exercises

Where each part of the site lives and what it is for. No passwords or keys here: those live in
`.env.local` / `.env.production.local` on the Mac (not in git) and in Vercel → Settings → Environment Variables.

| What | Service | Account / name | Used for |
|---|---|---|---|
| Domain | **Namecheap** | `powerbiexercise.com`, bought Nov 5 2026, auto-renew on, free Domain Privacy | Owning the domain. Nameservers point to Vercel (`ns1/ns2.vercel-dns.com`). |
| DNS | **Vercel DNS** | zone `powerbiexercise.com` | All DNS records: site, Resend (DKIM `resend._domainkey`, SPF/MX on `send`, CNAME `rsend`, MX on root for receiving), DMARC. |
| Hosting | **Vercel** | team *time-boxings-projects*, project `bi-exercises` | Builds and serves the site from GitHub `main`; runs `api/*` (checkout, webhook, portal). Live at `https://powerbiexercise.com` (`www.` → 308 to apex; `bi-exercises.vercel.app` still works). |
| Code | **GitHub** | `alecbogdan-prog/bi-exercises` | Source code. Push to `main` = production deploy. |
| Accounts & database | **Supabase** | org *alecbogdan-prog's Org*, project **Site Power BI** (`jbyffsxaffygxzfgybqp`) | Sign-in (email link + Google), `entitlements` table (who has Pro / PL-300). Auth → URL Configuration: Site URL `https://powerbiexercise.com`; SMTP → Resend. |
| Payments | **Stripe** | account *TimeBox* → sandbox **Power BI Exercices** (test mode only so far) | Checkout for Pro $79/yr (`pro_yearly`), Pro $12.99/mo (`pro_monthly`), PL-300 Prep $49 (`pl300_prep`); customer portal; webhook → `https://powerbiexercise.com/api/stripe-webhook`. |
| Email sending | **Resend** | domain `powerbiexercise.com` (EU region) | Sign-in emails from `noreply@powerbiexercise.com` via SMTP (Supabase), API key "Supabase SMTP". |
| Email receiving | **Resend** (inbox) | `support@powerbiexercise.com` | Incoming support mail (forwarding to Gmail still to set up). |
| Google sign-in | **Google Cloud** | project **Site Power BI**, OAuth client "Web client 1" | "Continue with Google". Audience is still *Testing* (only test users) until **Publish app**. |
| Analytics | **Google Analytics 4** | property *Power BI Exercises*, stream ID `16279005739`, Measurement ID `G-1PQHNQ4S2R` | Visits and page views, loaded only after cookie consent (`VITE_GA_ID`). Enhanced measurement off (we send page views ourselves). |
| Logo | **Google Flow** | project "Nov 05 - 11:20" | Treemap logo concepts; redrawn as SVG in `src/components/icons.tsx` + `public/favicon.svg`. |

## Still test-mode / to do before launch

- Stripe: switch to live keys (`scripts/stripe-setup.sh --live`, live webhook, rerun `scripts/vercel-env.sh`).
- Google Cloud: Audience → **Publish app**.
- Resend inbox: forward `support@` to Gmail.
- Supabase: customise the sign-in email templates (currently the default "Confirm your email address").
