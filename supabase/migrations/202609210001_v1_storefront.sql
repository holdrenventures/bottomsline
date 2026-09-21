-- V1 storefront: Supabase behind a Cloudflare Worker.
-- Run ONCE in the Supabase SQL Editor against a project without these tables.
-- Intentionally fails on existing objects instead of silently accepting schema drift.
-- No seed data, customer accounts, or browser database access.
-- All money uses integer minor units (cents for USD). Default currency: USD.

begin;

create table public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null check (btrim(name) <> ''),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  editorial_descriptor text,
  description text,
  base_price_cents integer not null check (base_price_cents >= 0),
  currency text not null default 'usd' check (currency ~ '^[a-z]{3}$'),
  catalog_image text, -- Cloudinary URL; no image upload/storage migration needed.
  active boolean not null default false,
  featured boolean not null default false,
  new_drop boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete restrict,
  size text not null check (btrim(size) <> ''), -- e.g. S, M, L, One Size
  sku text not null unique check (btrim(sku) <> ''),
  active boolean not null default false,
  inventory_quantity integer check (inventory_quantity >= 0), -- NULL = untracked
  stripe_product_id text check (stripe_product_id ~ '^prod_'),
  stripe_price_id text unique check (stripe_price_id ~ '^price_'),
  price_cents integer not null check (price_cents >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (product_id, size),
  unique (product_id, id), -- Supports the order-item product/variant consistency FK.
  check (not active or (stripe_product_id is not null and stripe_price_id is not null))
);

create table public.collections (
  id uuid primary key default gen_random_uuid(),
  name text not null check (btrim(name) <> ''),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  description text,
  sort_order integer not null default 0,
  active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.product_collections (
  product_id uuid not null references public.products(id) on delete cascade,
  collection_id uuid not null references public.collections(id) on delete cascade,
  sort_order integer not null default 0,
  primary key (product_id, collection_id)
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  stripe_checkout_session_id text not null unique
    check (stripe_checkout_session_id ~ '^cs_'),
  stripe_payment_intent_id text unique check (stripe_payment_intent_id ~ '^pi_'),
  customer_email text,
  customer_name text,
  shipping_address jsonb check (jsonb_typeof(shipping_address) = 'object'),
  payment_status text not null default 'unpaid'
    check (payment_status in ('unpaid', 'paid', 'no_payment_required')),
  fulfillment_status text not null default 'unfulfilled'
    check (fulfillment_status in ('unfulfilled', 'processing', 'shipped', 'delivered', 'cancelled')),
  currency text not null check (currency ~ '^[a-z]{3}$'),
  subtotal_cents bigint not null check (subtotal_cents >= 0),
  discount_cents bigint not null default 0 check (discount_cents >= 0),
  shipping_cents bigint not null default 0 check (shipping_cents >= 0),
  tax_cents bigint not null default 0 check (tax_cents >= 0),
  total_cents bigint not null check (total_cents >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
  -- Amounts come from Stripe, including its discount/tax treatment.
  -- Do not recompute total as subtotal + tax: prices may include tax.
);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete restrict,
  stripe_line_item_id text not null check (stripe_line_item_id ~ '^li_'),
  product_id uuid not null references public.products(id) on delete restrict,
  variant_id uuid not null,
  product_name text not null check (btrim(product_name) <> ''), -- snapshot
  size text not null check (btrim(size) <> ''), -- snapshot
  sku text not null check (btrim(sku) <> ''), -- snapshot
  quantity integer not null check (quantity > 0),
  unit_price_cents integer not null check (unit_price_cents >= 0), -- snapshot
  stripe_price_id text not null check (stripe_price_id ~ '^price_'), -- snapshot
  created_at timestamptz not null default now(),
  unique (order_id, stripe_line_item_id),
  foreign key (product_id, variant_id)
    references public.product_variants(product_id, id) on delete restrict
);

create table public.stripe_events (
  id text primary key check (id ~ '^evt_'),
  event_type text not null,
  stripe_created_at timestamptz not null,
  order_id uuid not null references public.orders(id) on delete restrict,
  processed_at timestamptz not null default now()
  -- Only successfully processed events are stored; no raw payload/extra PII.
);

create index products_active_catalog_idx on public.products(created_at desc) where active;
create index product_collections_collection_idx
  on public.product_collections(collection_id, sort_order, product_id);
create index orders_created_at_idx on public.orders(created_at desc);
create index orders_fulfillment_idx on public.orders(fulfillment_status, created_at);
create index order_items_variant_idx on public.order_items(product_id, variant_id);
create index stripe_events_order_idx on public.stripe_events(order_id);
-- Existing unique indexes cover product_variants.product_id and order_items.order_id.

create function public.store_set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger products_updated_at before update on public.products
  for each row execute function public.store_set_updated_at();
create trigger product_variants_updated_at before update on public.product_variants
  for each row execute function public.store_set_updated_at();
create trigger collections_updated_at before update on public.collections
  for each row execute function public.store_set_updated_at();
create trigger orders_updated_at before update on public.orders
  for each row execute function public.store_set_updated_at();

-- All storefront access goes through the Worker. Deliberately create NO anon
-- or authenticated policies, including catalog SELECT policies.
alter table public.products enable row level security;
alter table public.product_variants enable row level security;
alter table public.collections enable row level security;
alter table public.product_collections enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.stripe_events enable row level security;

revoke all privileges on table
  public.products, public.product_variants, public.collections,
  public.product_collections, public.orders, public.order_items, public.stripe_events
from public, anon, authenticated;

grant usage on schema public to service_role;
grant select, insert, update, delete on table
  public.products, public.product_variants, public.collections,
  public.product_collections, public.orders, public.order_items, public.stripe_events
to service_role;

revoke all on function public.store_set_updated_at() from public, anon, authenticated;
grant execute on function public.store_set_updated_at() to service_role;

-- Atomic, retry-safe creation of a PAYMENT-CONFIRMED order and its snapshots.
-- Invoke via supabase.rpc('record_paid_checkout', {...}) from the Worker ONLY.
-- This function does not verify Stripe signatures. The Worker must do that first,
-- retrieve the authoritative Checkout Session and ALL paginated line items,
-- and supply trusted checkout-time product/variant/snapshot mappings.
-- It handles checkout.session.completed (if paid/no_payment_required) and
-- checkout.session.async_payment_succeeded. It does not process refunds,
-- disputes, unpaid sessions, failed payments, or inventory reservations.
-- All inserts roll back on ANY failure, including event insertion failure.
create function public.record_paid_checkout(
  p_event_id text,
  p_event_type text,
  p_event_created_at timestamptz,
  p_order jsonb,
  p_items jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_order_id uuid;
  v_existing_session text;
  v_existing_status text;
  v_inserted boolean;
begin
  if p_event_id is null or p_event_id !~ '^evt_'
     or p_event_created_at is null then
    raise exception 'A valid Stripe event ID and timestamp are required';
  end if;

  if p_event_type is null or p_event_type not in (
    'checkout.session.completed', 'checkout.session.async_payment_succeeded'
  ) then
    raise exception 'Unsupported event type for record_paid_checkout';
  end if;

  if jsonb_typeof(p_order) is distinct from 'object' then
    raise exception 'p_order must be an object';
  end if;
  if coalesce(p_order ->> 'payment_status', '') not in ('paid', 'no_payment_required') then
    raise exception 'Only payment-confirmed Checkout Sessions can create orders';
  end if;
  if jsonb_typeof(p_items) is distinct from 'array' then
    raise exception 'p_items must be an array';
  end if;
  if jsonb_array_length(p_items) = 0 then
    raise exception 'At least one order item is required';
  end if;

  -- Serializes retries of the same event. Lock collisions only delay processing.
  perform pg_advisory_xact_lock(hashtextextended(p_event_id, 0));
  select e.order_id, o.stripe_checkout_session_id
    into v_order_id, v_existing_session
    from public.stripe_events e
    join public.orders o on o.id = e.order_id
    where e.id = p_event_id;
  if found then
    if v_existing_session is distinct from p_order ->> 'stripe_checkout_session_id' then
      raise exception 'Event was already recorded for another Checkout Session';
    end if;
    return v_order_id;
  end if;

  insert into public.orders (
    stripe_checkout_session_id, stripe_payment_intent_id,
    customer_email, customer_name, shipping_address, payment_status, currency,
    subtotal_cents, discount_cents, shipping_cents, tax_cents, total_cents
  ) values (
    p_order ->> 'stripe_checkout_session_id',
    p_order ->> 'stripe_payment_intent_id',
    p_order ->> 'customer_email',
    p_order ->> 'customer_name',
    nullif(p_order -> 'shipping_address', 'null'::jsonb),
    p_order ->> 'payment_status',
    p_order ->> 'currency',
    (p_order ->> 'subtotal_cents')::bigint,
    coalesce((p_order ->> 'discount_cents')::bigint, 0),
    coalesce((p_order ->> 'shipping_cents')::bigint, 0),
    coalesce((p_order ->> 'tax_cents')::bigint, 0),
    (p_order ->> 'total_cents')::bigint
  ) on conflict (stripe_checkout_session_id) do nothing
  returning id into v_order_id;
  v_inserted := found;

  if v_inserted then
    insert into public.order_items (
      order_id, stripe_line_item_id, product_id, variant_id,
      product_name, size, sku, quantity, unit_price_cents, stripe_price_id
    )
    select v_order_id, i.stripe_line_item_id, i.product_id, i.variant_id,
      i.product_name, i.size, i.sku, i.quantity, i.unit_price_cents, i.stripe_price_id
    from jsonb_to_recordset(p_items) as i(
      stripe_line_item_id text, product_id uuid, variant_id uuid,
      product_name text, size text, sku text, quantity integer,
      unit_price_cents integer, stripe_price_id text
    );
  else
    -- Another event for the same session must not overwrite purchase snapshots
    -- or reset fulfillment. The unique session constraint also handles concurrency.
    select id, payment_status into v_order_id, v_existing_status
      from public.orders
      where stripe_checkout_session_id = p_order ->> 'stripe_checkout_session_id'
      for update;
    if v_order_id is null or v_existing_status not in ('paid', 'no_payment_required') then
      raise exception 'Existing order is not a payment-confirmed order';
    end if;
    if not exists (select 1 from public.order_items where order_id = v_order_id) then
      raise exception 'Existing order has no items; investigate before acknowledging event';
    end if;
  end if;

  insert into public.stripe_events(id, event_type, stripe_created_at, order_id)
    values (p_event_id, p_event_type, p_event_created_at, v_order_id);
  return v_order_id;
end;
$$;

revoke all on function public.record_paid_checkout(text, text, timestamptz, jsonb, jsonb)
  from public, anon, authenticated;
grant execute on function public.record_paid_checkout(text, text, timestamptz, jsonb, jsonb)
  to service_role;

comment on table public.orders is
  'Private order/customer data. Worker access only; never return through public catalog APIs.';
comment on table public.order_items is
  'Purchase snapshots. Archive catalog rows instead of deleting referenced products or variants.';
comment on column public.product_variants.inventory_quantity is
  'NULL means untracked. This schema does not reserve or decrement inventory.';
comment on function public.record_paid_checkout(text, text, timestamptz, jsonb, jsonb) is
  'Worker-only atomic payment-confirmed order creation. Verify Stripe signature before calling.';

commit;

