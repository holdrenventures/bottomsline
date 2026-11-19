-- Each storefront product keeps its own editable front artwork placements.
-- Finished mockup images remain in R2; this table stores their source and controls.
begin;

alter table public.designs drop constraint if exists designs_garment_check;
alter table public.designs add constraint designs_garment_check
  check (garment in ('tee', 'tank', 'crewneck', 'hoodie', 'tultex320', 'tultex340'));

create table if not exists public.design_assignments (
  product_id uuid not null references public.products(id) on delete cascade,
  garment text not null check (garment in ('tee', 'tultex320', 'tultex340')),
  slug text not null check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  artwork_url text not null,
  placements jsonb not null,
  colors text[] not null default '{}',
  updated_at timestamptz not null default now(),
  primary key (product_id, garment)
);

alter table public.design_assignments enable row level security;
revoke all privileges on table public.design_assignments from public, anon, authenticated;
grant select, insert, update, delete on table public.design_assignments to service_role;

comment on table public.design_assignments is
  'Private per-product front artwork source and per-color placement controls for the Design Adjuster.';
commit;
