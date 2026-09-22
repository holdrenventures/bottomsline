-- Follow-on to 202609210001_v1_storefront.sql.
-- Records the additions applied to the live Supabase project during the
-- Airtable → Supabase catalog load: a companion `product_colors` table that
-- holds per-colorway display data (color, style, garment, mockup URL). The
-- storefront's `product_variants` remains size-only per `unique (product_id, size)`.
--
-- Applied in the SQL editor via the numbered scripts:
--   001_schema_changes.sql  (drops the placeholder color/style/mockup_url
--                           columns from product_variants; creates product_colors)
--   002_collections_products.sql  (5 collections, 33 products, 44 links)
--   003_product_variants.sql      (197 size variants)
--   004_product_colors.sql        (251 colorways with Cloudinary mockup URLs)
--
-- Idempotent. Safe to re-run: adds only what's missing.

begin;

-- The first migration draft added these three columns to product_variants
-- before we realized variants are size-only. Drop only if present.
alter table public.product_variants drop column if exists color;
alter table public.product_variants drop column if exists style;
alter table public.product_variants drop column if exists mockup_url;

create table if not exists public.product_colors (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  color text not null check (btrim(color) <> ''),
  style text,                                       -- e.g. Tee, Tank
  garment text,                                     -- e.g. tultex202, tultex105
  mockup_url text,                                  -- Cloudinary URL, kept as-is
  sort_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (product_id, color, style)
);

create index if not exists product_colors_product_idx
  on public.product_colors(product_id, sort_order);

do $$
begin
  if not exists (
    select 1 from pg_trigger where tgname = 'product_colors_updated_at'
  ) then
    create trigger product_colors_updated_at before update on public.product_colors
      for each row execute function public.store_set_updated_at();
  end if;
end $$;

-- Consistent with the rest of the storefront: all access is via the Worker.
alter table public.product_colors enable row level security;
revoke all privileges on table public.product_colors from public, anon, authenticated;
grant select, insert, update, delete on table public.product_colors to service_role;

comment on table public.product_colors is
  'Colorway display data (mockups + labels). Size is the SKU dimension and stays on product_variants.';

commit;
