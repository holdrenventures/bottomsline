-- Optional product-page facts. Empty fields are omitted from the public page;
-- the storefront never publishes placeholder specifications.

begin;

alter table public.products
  add column if not exists product_annotation text,
  add column if not exists material text,
  add column if not exists fit_notes text,
  add column if not exists care_instructions text,
  add column if not exists shipping_note text,
  add column if not exists size_guide_url text
    check (size_guide_url is null or size_guide_url ~ '^https://');

comment on column public.products.product_annotation is
  'Short coral editorial annotation shown near the product visual.';
comment on column public.products.size_guide_url is
  'Optional HTTPS garment-specific size chart; omitted from the page when empty.';

commit;
