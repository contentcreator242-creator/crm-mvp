# Vercel environment variables (cheat sheet)

Add these in **Vercel → your project → Settings → Environment Variables**.  
Use the **same Key** and **same Value** as in your local `.env.local` (open that file on your computer — we never commit it).

For each row: **Name** = left side, **Value** = right side (no quotes needed in Vercel unless the value itself contains spaces).

---

## Required for the app to run at all

| Key | What to put (value) | Where you get it |
|-----|---------------------|------------------|
| `DATABASE_URL` | `postgresql://user:pass@host/db?sslmode=require` style URL | Your Postgres provider (Neon, Supabase, etc.) — **Database → Connection string** |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Starts with `pk_test_` or `pk_live_` | [Clerk Dashboard](https://dashboard.clerk.com) → your app → **API Keys** → Publishable key |
| `CLERK_SECRET_KEY` | Starts with `sk_test_` or `sk_live_` | Clerk → **API Keys** → Secret key |
| `NEXT_PUBLIC_APP_URL` | Your site URL, e.g. `https://your-project.vercel.app` | After first deploy, copy from Vercel **Domains** (no trailing slash) |

---

## Strongly recommended (production behavior)

| Key | What to put | Where you get it |
|-----|-------------|------------------|
| `PRISMA_USE_NEON` | `1` if using Neon, otherwise omit | Set `1` only when `DATABASE_URL` is Neon (matches app’s Neon adapter logic) |

---

## Email (sending mail from the app)

| Key | What to put | Where you get it |
|-----|-------------|------------------|
| `RESEND_API_KEY` | `re_...` | [Resend](https://resend.com) → API Keys |
| `RESEND_FROM` | e.g. `Acme <mail@yourdomain.com>` | Must use a **verified domain** in Resend |
| `EMAIL_REPLY_TO` | Your email, e.g. `you@company.com` | Any inbox you want as default reply-to (optional) |

---

## Optional: captcha on embed / lead forms

| Key | What to put | Where you get it |
|-----|-------------|------------------|
| `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` | Public site key | Google reCAPTCHA admin |
| `RECAPTCHA_SECRET_KEY` | Secret key | Same place |
| `NEXT_PUBLIC_RECAPTCHA_VERSION` | `v2` or `v3` | Match how you created the keys |
| `RECAPTCHA_MIN_SCORE`, `RECAPTCHA_EXPECTED_ACTION` | Only if using v3 | Optional tuning |
| `TURNSTILE_SECRET_KEY` | If using Cloudflare Turnstile instead | Cloudflare dashboard |

---

## Optional: rate limiting (Upstash)

| Key | What to put | Where you get it |
|-----|-------------|------------------|
| `UPSTASH_REDIS_REST_URL` | `https://...upstash.io` | [Upstash](https://upstash.com) Redis → REST API |
| `UPSTASH_REDIS_REST_TOKEN` | Token | Same |

---

## Optional: Stripe Billing (Lendex monthly subscription)

| Key | What to put | Where you get it |
|-----|-------------|------------------|
| `STRIPE_SECRET_KEY` | `sk_live_...` / `sk_test_...` | Stripe → **Developers → API keys** |
| `STRIPE_PRICE_ID` | `price_...` | Stripe → **Product catalog** → base **Lendex** plan (**£39**/month recurring) |
| `STRIPE_SEAT_PRICE_ID` | `price_...` | Separate recurring price (**£10**/month) used as subscription **quantity** = users beyond 3 |
| `STRIPE_WEBHOOK_SECRET` | `whsec_...` | Stripe → **Webhooks** → endpoint `https://<your-domain>/api/stripe/webhook` → **Signing secret** |

**Webhook events to send:** `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`.

Also set **`NEXT_PUBLIC_APP_URL`** so Checkout **success** / **cancel** URLs point at your deployment.

### Clerk webhooks (seat sync)

| Key | What to put |
|-----|-------------|
| `CLERK_WEBHOOK_SIGNING_SECRET` | Signing secret from Clerk → **Webhooks** → endpoint `https://<your-domain>/api/webhooks/clerk` |

Subscribe to **`organizationInvitation.accepted`**, **`organizationMembership.created`**, **`organizationMembership.deleted`** so Stripe seat quantity updates when invites are accepted or members are removed.

---

## Optional: Prisma / DB extras

| Key | What to put |
|-----|-------------|
| `DATABASE_POOL_MAX` | Small number (e.g. `5`) if your host limits connections |
| `SHADOW_DATABASE_URL` | Only if you run migrations that need a shadow DB — rarely needed on Vercel runtime |

---

## Clerk: production URLs

After deploy, in **Clerk Dashboard → your app → Domains**, add your Vercel URL (`https://....vercel.app`) so sign-in works in production.

---

## Quick path if you’re lost

1. Open **`.env.local`** on your Mac (same folder as `package.json`).
2. Vercel → **Settings → Environment Variables**.
3. For **each** line in `.env.local` (`NAME=value`), add **Name** = `NAME`, **Value** = everything after the first `=`.
4. Add **`NEXT_PUBLIC_APP_URL`** = your Vercel deployment URL (this one is often not in `.env.local` yet — set it after the first deploy).
5. Redeploy.

---

## Onboarding column (`onboarding_completed_at`)

After pulling the onboarding feature, apply the schema:

- **`npx prisma migrate deploy`** (production) or **`npx prisma migrate dev`** (local), **or**
- **`npx prisma db push`** — then see `scripts/backfill-onboarding-completed.sql` if existing orgs should skip the wizard (read the warning in that file first).
