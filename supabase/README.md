# Bottom's Line Supabase schema

The storefront reads Supabase from server code deployed as a Cloudflare Worker.
The browser never connects. Store `SUPABASE_SECRET_KEY` as an encrypted
Cloudflare secret; never commit it or expose it through `NEXT_PUBLIC_*`.

Migrations applied to production, in order:

1. `202609210001_v1_storefront.sql` — V1 storefront schema
   (products, product_variants, collections, product_collections, orders,
   order_items, stripe_events; RLS on, Worker-only access; the
   `record_paid_checkout` RPC for atomic Stripe writes).
2. `202609210002_product_colors.sql` — adds the `product_colors` companion table
   used by the catalog load. Color, style, garment and the Cloudinary
   `mockup_url` live on `product_colors`. It also drops three placeholder
   columns an early draft added to `product_variants`.
3. `202609230001_saleable_variants.sql` — defines a sellable variant as
   product + style + size, adds optional garment fulfillment data, permits one
   Stripe Price to be reused across sizes, and snapshots the selected style,
   color, garment and colorway on paid order items.
4. `202609230002_product_details.sql` — adds optional, editable product-page
   annotation, material, fit, care, shipping and size-guide fields. Empty
   fields are intentionally omitted from public product pages.

5. `202609240001_checkout_attempts.sql` — adds the private server-owned cart
   snapshot used to reconcile shared Stripe Prices with exact size/color
   selections. Applied to production on 2026-09-24 before enabling Checkout.

Catalog data was loaded on 2026-09-21 from the Airtable workbook via a set of
one-shot SQL scripts run in the Supabase SQL editor
(`002_collections_products.sql` → 5 collections, 33 products, 44 links;
`003_product_variants.sql` → 197 size variants;
`004_product_colors.sql` → 251 colorways). Those load scripts are not tracked
here — they were single-use inserts, not schema. Re-loading is done by
re-running them against a truncated table set, not by touching migrations.

Products were initially loaded as drafts (`active = false`). The Worker's
public catalog reader filters on `active = true`, so drafts remain available
in the authenticated Product Desk without appearing on the homepage, shop, or
public product routes. Flip individual rows to `active = true` only when they
are ready to be public.

The storefront still falls back to `app/data/products.ts` mock data when
Supabase env vars are absent, so local previews work with no backend.
