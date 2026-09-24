# Bottom's Line storefront

Custom Vinext storefront deployed as a Cloudflare Worker, with Supabase as the
private catalog/order database and Stripe-hosted Checkout for payments.

## Local development

```bash
pnpm install
pnpm dev
```

The local mock catalog is used when Supabase credentials are absent. To test
live catalog data locally, copy `.dev.vars.example` to `.dev.vars` and insert a
Supabase secret key. `.dev.vars` is ignored by Git.

## Production build

```bash
pnpm build
pnpm deploy:built
```

For Cloudflare Workers Builds connected to GitHub:

- Production branch: `main`
- Build command: `pnpm build`
- Deploy command: `pnpm deploy:built`
- Non-production branch deploy command: `pnpm exec wrangler versions upload --config dist/server/wrangler.json`

The Worker requires the encrypted runtime secret `SUPABASE_SECRET_KEY`.
`SUPABASE_URL` is non-secret configuration defined in `wrangler.jsonc`.

Never commit Supabase or Stripe secret keys. Add them through Cloudflare's
Variables and Secrets settings.

## Stripe Checkout

The browser submits only product, variant, colorway, and quantity identifiers
to `POST /api/checkout`. The Worker reloads active catalog rows from Supabase,
verifies the saved Stripe Prices, snapshots the validated selection, and then
creates a hosted Checkout Session. Browser names, prices, and Stripe IDs are
not trusted.

Before testing Checkout:

1. Apply `supabase/migrations/202609240001_checkout_attempts.sql` in the
   Supabase SQL editor.
2. Create a Stripe sandbox restricted key with only the permissions needed to
   read Products/Prices and create/read Checkout Sessions. Save it locally as
   `STRIPE_RESTRICTED_KEY`; never paste it into source or chat.
3. Create a Stripe webhook endpoint for `/api/stripe-webhook` and subscribe to
   `checkout.session.completed`, `checkout.session.async_payment_succeeded`,
   `checkout.session.async_payment_failed`, and `checkout.session.expired`.
   Save its `whsec_…` value as `STRIPE_WEBHOOK_SECRET`.
4. Set `SITE_URL=http://localhost:3000` locally and the canonical HTTPS site URL
   in production.
5. Create a second sandbox restricted key with Products and Prices write
   access only. Save it as `STRIPE_CATALOG_KEY`.
6. In Product Desk, save a product and use **Sync Stripe**. The server creates
   or updates Stripe payment objects from the saved Supabase variants and
   writes the resulting IDs back to Supabase.
7. Test with Stripe sandbox data before creating separate live-mode keys.

For Cloudflare production, add both Stripe values as encrypted Worker secrets.
Use a separate restricted key and webhook secret for sandbox and live mode.
Stripe Tax is deliberately not enabled until the business's registrations and
tax settings have been confirmed. Order creation and fulfillment are driven by
the signed webhook, never by the success page.

## Internal Product Desk

The private catalog editor lives at `/admin`. It can create and edit product
records, collection assignments, size variants, colorways, and Cloudinary image
URLs. Timestamps remain read-only and are maintained by Supabase.

The browser never receives `SUPABASE_SECRET_KEY`. Admin requests go through
`/api/admin/catalog` and require a separate `ADMIN_TOKEN`. Store that token as
an encrypted Cloudflare Worker secret alongside the Supabase key. Generate a
long random value locally, then add it in Cloudflare:

```bash
openssl rand -hex 32
pnpm exec wrangler secret put ADMIN_TOKEN
```

For local Product Desk access, add the same `ADMIN_TOKEN` and the Supabase key
to an ignored `.dev.vars` file. The Product Desk intentionally has no link in
the public navigation. For another security layer in production, protect
`/admin*` and `/api/admin*` with Cloudflare Access.

Supabase remains the catalog source of truth. Product Desk sends a saved
product to `/api/admin/stripe-sync`, which mirrors its name and variant price
groups into Stripe. Stripe Prices are immutable, so changing a Supabase price
creates a replacement Stripe Price and updates the variant references. The
browser never receives either Stripe restricted key.
