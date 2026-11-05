# Services used by Power BI Exercises

Where each part of the site lives and what it is for. No passwords or keys here: those live in
`.env.local` / `.env.production.local` on the Mac (not in git) and in Vercel → Settings → Environment Variables.

| What | Service | Account / name | Used for |
|---|---|---|---|
| Domain | **Namecheap** | `powerbiexercise.com`, bought Nov 5 2026, auto-renew on, free Domain Privacy | Owning the domain. Nameservers point to Vercel (`ns1/ns2.vercel-dns.com`). |
| DNS | **Vercel DNS** | zone `powerbiexercise.com` | All DNS records: site, Resend (DKIM `resend._domainkey`, SPF/MX on `send`, CNAME `rsend`, MX on root for receiving), DMARC. |
| Hosting | **Vercel** | team *time-boxings-projects*, project `bi-exercises` | Builds and serves the site from GitHub `main`; runs `api/*` (checkout, webhook, portal). Live at `https://powerbiexercise.com` (`www.` → 308 to apex; `bi-exercises.vercel.app` still works). |
| Code | **GitHub** | `alecbogdan-prog/bi-exercises` | Source code. Push to `main` = production deploy. |
| Accounts & database | **Supabase** | org *alecbogdan-prog's Org*, project **Site Power BI** (`jbyffsxaffygxzfgybqp`) | Sign-in (email link + Google), `entitlements` table (who has Pro / PL-300), `progress` table (progress synced across devices). Branded email templates in `supabase/email-templates/`. Auth → URL Configuration: Site URL `https://powerbiexercise.com`; SMTP → Resend. |
| Payments | **Stripe** | organization *Bogdan Alec* → account **Power BI Exercises** (`acct_1UYR7PPZNKEvWGUf`), **LIVE** since Nov 5 2026. Old test sandbox: TimeBox → *Power BI Exercices* (local dev only). | Checkout with **Managed Payments** (Stripe is merchant of record: VAT/tax, fraud, disputes; +3.5%). Pro $79/yr (`pro_yearly`), Pro $12.99/mo (`pro_monthly`), PL-300 Prep $49 (`pl300_prep`), tax code `txcd_20060058`. Customer portal (invoices, card, cancel at period end, switch yearly/monthly). Webhook → `https://powerbiexercise.com/api/stripe-webhook`. Restricted key "powerbiexercise.com website". Statement descriptor `POWERBIEXERCISE`. |
| Email sending | **Resend** | domain `powerbiexercise.com` (EU region) | Sign-in emails from `noreply@powerbiexercise.com` via SMTP (Supabase), API key "Supabase SMTP". |
| Email receiving | **Resend** (inbox) | inbox *Power BI Exercises support*, `support@powerbiexercise.com` | Incoming support mail, read and answer in the Resend dashboard (no Gmail forwarding yet). |
| Google sign-in | **Google Cloud** | project **Site Power BI**, OAuth client "Web client 1" | "Continue with Google". Audience **In production** (published Nov 5 2026). Branding: home/privacy/terms links on powerbiexercise.com. |
| Analytics | **Google Analytics 4** | property *Power BI Exercises*, stream ID `16279005739`, Measurement ID `G-1PQHNQ4S2R` | Visits and page views, loaded only after cookie consent (`VITE_GA_ID`). Enhanced measurement off (we send page views ourselves). |
| Search | **Google Search Console** | Domain property `powerbiexercise.com` (DNS TXT verified) | Indexing; sitemap `https://powerbiexercise.com/sitemap.xml` submitted (234 pages). |
| SEO audit | **Ahrefs Webmaster Tools** (free) | project *Powerbiexercise*, imported from Search Console; weekly Site Audit | Health score 100 after the static-content fix (Nov 5 2026). IndexNow key `4148006c6e091ad1a7b3c8adc37781b8` (public file `/4148006c6e091ad1a7b3c8adc37781b8.txt`) for Bing/Yandex. |
| Logo | **Google Flow** | project "Nov 05 - 11:20" | Treemap logo concepts; redrawn as SVG in `src/components/icons.tsx` + `public/favicon.svg`. |

## Still test-mode / to do before launch

- Stripe: do one real purchase with your own card and refund it, to confirm the full live flow.
- Ask an accountant how Managed Payments payouts should be booked (Stripe is the seller of record).
- Optional: forward `support@` to Gmail (needs a small inbound-email function + a Resend API key).
