-- Manual Printful draft creation from the private Orders Desk.
begin;

create table public.printful_variant_mappings (
  variant_id uuid not null references public.product_variants(id) on delete restrict,
  colorway_id uuid not null references public.product_colors(id) on delete restrict,
  printful_sync_variant_id bigint not null check (printful_sync_variant_id > 0),
  printful_sync_product_id bigint not null check (printful_sync_product_id > 0),
  printful_name text not null,
  verified_at timestamptz not null default now(),
  primary key (variant_id, colorway_id)
);

alter table public.printful_variant_mappings enable row level security;
revoke all on public.printful_variant_mappings from public, anon, authenticated;
grant select, insert, update, delete on public.printful_variant_mappings to service_role;

alter table public.orders
  add column printful_draft_id bigint unique,
  add column printful_draft_state text not null default 'idle'
    check (printful_draft_state in ('idle', 'creating', 'needs_review', 'draft')),
  add column printful_draft_created_at timestamptz;

comment on column public.orders.printful_draft_state is
  'Only an explicit Orders Desk action can create a Printful draft. needs_review means the remote result is uncertain and must be reconciled before retrying.';

commit;
