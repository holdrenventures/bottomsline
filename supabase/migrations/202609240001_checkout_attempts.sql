-- Server-owned bridge between a validated bag and Stripe Checkout.
--
-- Stripe Prices may be shared by several size/color selections. The attempt
-- snapshot preserves the exact product choices while Stripe remains the
-- authority for payment totals. Browser-supplied names, prices, and Price IDs
-- are never written here.

begin;

create table public.checkout_attempts (
  id uuid primary key default gen_random_uuid(),
  stripe_checkout_session_id text unique check (stripe_checkout_session_id ~ '^cs_'),
  status text not null default 'creating'
    check (status in ('creating', 'open', 'paid', 'failed', 'expired')),
  currency text not null check (currency ~ '^[a-z]{3}$'),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '24 hours'),
  updated_at timestamptz not null default now()
);

create table public.checkout_attempt_items (
  id uuid primary key default gen_random_uuid(),
  checkout_attempt_id uuid not null references public.checkout_attempts(id) on delete cascade,
  sort_order integer not null check (sort_order >= 0),
  product_id uuid not null references public.products(id) on delete restrict,
  variant_id uuid not null,
  colorway_id uuid,
  product_name text not null check (btrim(product_name) <> ''),
  style text not null check (btrim(style) <> ''),
  color text,
  garment text,
  size text not null check (btrim(size) <> ''),
  sku text not null check (btrim(sku) <> ''),
  quantity integer not null check (quantity between 1 and 9),
  unit_price_cents integer not null check (unit_price_cents >= 0),
  stripe_price_id text not null check (stripe_price_id ~ '^price_'),
  created_at timestamptz not null default now(),
  unique (checkout_attempt_id, sort_order),
  foreign key (product_id, variant_id)
    references public.product_variants(product_id, id) on delete restrict,
  foreign key (product_id, colorway_id)
    references public.product_colors(product_id, id) on delete restrict
);

create index checkout_attempts_status_created_idx
  on public.checkout_attempts(status, created_at);
create index checkout_attempt_items_attempt_idx
  on public.checkout_attempt_items(checkout_attempt_id, sort_order);

create trigger checkout_attempts_updated_at before update on public.checkout_attempts
  for each row execute function public.store_set_updated_at();

-- One Stripe line item can represent several catalog selections when those
-- variants intentionally reuse the same Stripe Price. The server validates
-- aggregate Price IDs, quantities, and amounts before recording snapshots.
alter table public.order_items
  drop constraint if exists order_items_order_id_stripe_line_item_id_key;

alter table public.checkout_attempts enable row level security;
alter table public.checkout_attempt_items enable row level security;

revoke all privileges on table
  public.checkout_attempts, public.checkout_attempt_items
from public, anon, authenticated;

grant select, insert, update, delete on table
  public.checkout_attempts, public.checkout_attempt_items
to service_role;

comment on table public.checkout_attempts is
  'Private Worker-owned bridge from an authoritative catalog selection to Stripe Checkout.';
comment on table public.checkout_attempt_items is
  'Immutable checkout-time catalog snapshots used to reconcile Stripe line items safely.';
comment on column public.order_items.stripe_line_item_id is
  'Stripe line item allocation. It may repeat when one shared Price line represents several catalog selections.';

commit;
