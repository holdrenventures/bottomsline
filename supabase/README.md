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
   used by the catalog load. Size stays the SKU dimension on `product_variants`
   (via `unique (product_id, size)`); color, style, garment and the Cloudinary
   `mockup_url` live on `product_colors`. Also drops three placeholder columns
   an early draft added to `product_variants`.

Catalog data was loaded on 2026-09-21 from the Airtable workbook via a set of
one-shot SQL scripts run in the Supabase SQL editor
(`002_collections_products.sql` → 5 collections, 33 products, 44 links;
`003_product_variants.sql` → 197 size variants;
`004_product_colors.sql` → 251 colorways). Those load scripts are not tracked
here — they were single-use inserts, not schema. Re-loading is done by
re-running them against a truncated table set, not by touching migrations.

Products are loaded as drafts (`active = false`). The Worker's catalog reader
does not filter on `active`, so drafts are visible on the storefront while
copy is being finalized. Flip individual rows to `active = true` when they
are ready for sale.

The storefront still falls back to `app/data/products.ts` mock data when
Supabase env vars are absent, so local previews work with no backend.
