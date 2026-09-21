# Bottom's Line Supabase schema

`migrations/202609210001_v1_storefront.sql` is the exact V1 storefront migration
successfully applied to the project's Supabase database on 2026-09-21.

The browser does not connect to Supabase. Catalog reads and future order writes
run through server code deployed in the Cloudflare Worker. Store
`SUPABASE_SECRET_KEY` as an encrypted Cloudflare secret; never commit it or use a
`NEXT_PUBLIC_` variable.

The storefront continues to use local mock data when Supabase variables are not
present or the live catalog contains no active products. This keeps development
and visual review independent of backend setup.
