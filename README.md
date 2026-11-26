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
to `POST /api/checkout`. Personalized area-code hats also submit `areaCode`
(exactly three digits). The Worker reloads active catalog rows from Supabase,
checks the code against the product slug, snapshots the validated selection,
and sends the authoritative amounts to a hosted Checkout Session as inline
price data. The area code is copied onto the Stripe line description and
metadata, then onto the order line. Browser names and prices are not trusted.
Other products omit the field and check out as before.

Apply `supabase/migrations/202611260001_order_item_area_code.sql` before
deploying the Worker that reads `area_code`. The two hat rows in
`scripts/insert-area-code-hats.sql` stay `active = false` until that migration
is in place and the listings are ready.

For local pickup, the bag also submits a Davidson County street address. The
Worker checks the Census geocoder's county result (Tennessee 47, Davidson 037)
and matching ZIP before creating a pickup Checkout Session. Pickup costs $0;
Stripe Checkout requires a phone number and email. The session records the
eligibility address for the order receipt and Orders Desk. Pickup is scheduled
after payment in 37207; the exact location is shared when arranging it. If the
geocoder cannot confirm the address, the customer can choose shipping.

Before testing Checkout:

1. Apply `supabase/migrations/202609240001_checkout_attempts.sql` in the
   Supabase SQL editor.
2. Create a Stripe sandbox restricted key with only the permissions needed to
   create/read/expire Checkout Sessions. Save it locally as
   `STRIPE_RESTRICTED_KEY`; never paste it into source or chat.
3. Create a Stripe webhook endpoint for `/api/stripe-webhook` and subscribe to
   `checkout.session.completed`, `checkout.session.async_payment_succeeded`,
   `checkout.session.async_payment_failed`, and `checkout.session.expired`.
   Save its `whsec_…` value as `STRIPE_WEBHOOK_SECRET`.
4. Set `SITE_URL=http://localhost:3000` locally and the canonical HTTPS site URL
   in production.
5. Test with Stripe sandbox data before creating separate live-mode keys.

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

On iPhone, open `/admin/orders` in Safari, enter the admin token, then choose
Share → Add to Home Screen. The shortcut opens Orders; its navigation also
reaches Products, Designs, and Discounts. A new browser session may ask for the token again.

`/admin/discounts` uses the same admin token to create percentage or fixed-dollar
codes, turn them on or off, and choose whether they combine with other eligible
codes and the scheduled 3-tee offer. The usage count increases once a checkout
is paid; historical WOAKS10 and ENB15 uses were not attributed to codes in the
old order records, so their counters start with this feature. Disabled codes
keep their history. Apply `20261125222835_admin_discounts.sql` before deploying
the corresponding Worker build.

Supabase is the only catalog and pricing source of truth. At checkout, the
Worker reloads each saved variant and sends its trusted amount to Stripe as
inline Checkout price data. Product Desk does not maintain a second catalog in
Stripe, and the browser never supplies a trusted price or receives a Stripe
secret key.

## Internal Design Adjuster

The protected mockup composer lives at `/admin/designs`. It uploads one
transparent PNG to Cloudinary, records its placement on a Tultex 202 tee or
Tultex 105 tank, SS3000 crewneck, or SS4500 hoodie, and can update only that
garment style's colorway rows for a selected storefront product. Existing
order-linked colorway rows are preserved and deactivated instead of deleted.

Before first use:

1. Apply `supabase/migrations/202609240003_design_placements.sql` and
   `supabase/migrations/202610140002_design_garments.sql` in Supabase.
2. In Cloudinary, create an unsigned upload preset restricted to the `designs`
   folder (for example, `blc_designs`).
3. Store its name server-side as `CLOUDINARY_UPLOAD_PRESET` in Cloudflare:

```bash
pnpm exec wrangler secret put CLOUDINARY_UPLOAD_PRESET
```

The browser never receives the preset. Uploads and design saves pass through
admin-token-protected Worker routes. The adjuster assumes the Cloudinary blank
assets described in `app/lib/blc-colors.json` already exist. Only the straight-
on front images are used for composition; alternate product angles stay out of
the blank folders.
