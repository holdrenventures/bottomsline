-- Phase 2 commerce model.
--
-- A sellable variant is product + style + size. Colorways remain separate
-- visual/garment choices and are captured on the order item. This avoids
-- creating a Stripe Price for every color while still allowing Tee and Tank
-- to have different prices. Inventory stays optional: NULL means made to
-- order/untracked.

begin;

alter table public.product_variants
  add column if not exists style text not null default 'Tee'
    check (btrim(style) <> ''),
  add column if not exists garment text;

alter table public.product_variants
  drop constraint if exists product_variants_product_id_size_key;

-- Catalog availability is independent from payment-provider setup. Checkout
-- will reject variants without Stripe references until Phase 4 is configured.
alter table public.product_variants
  drop constraint if exists product_variants_check;

alter table public.product_variants
  add constraint product_variants_product_style_size_key
    unique (product_id, style, size);

-- A Stripe Price represents a price point, not an inventory SKU. The same
-- Tee price may be reused for XS-3XL; SKU and variant id retain the selection.
alter table public.product_variants
  drop constraint if exists product_variants_stripe_price_id_key;

create index if not exists product_variants_stripe_price_idx
  on public.product_variants(stripe_price_id)
  where stripe_price_id is not null;

alter table public.product_colors
  add constraint product_colors_product_id_id_key unique (product_id, id);

alter table public.order_items
  add column if not exists style text not null default 'Tee'
    check (btrim(style) <> ''),
  add column if not exists color text,
  add column if not exists garment text,
  add column if not exists colorway_id uuid;

alter table public.order_items
  add constraint order_items_product_colorway_fkey
    foreign key (product_id, colorway_id)
    references public.product_colors(product_id, id) on delete restrict;

create index if not exists order_items_colorway_idx
  on public.order_items(product_id, colorway_id)
  where colorway_id is not null;

create or replace function public.record_paid_checkout(
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
      order_id, stripe_line_item_id, product_id, variant_id, colorway_id,
      product_name, style, color, garment, size, sku, quantity,
      unit_price_cents, stripe_price_id
    )
    select v_order_id, i.stripe_line_item_id, i.product_id, i.variant_id,
      i.colorway_id, i.product_name, i.style, i.color, i.garment, i.size,
      i.sku, i.quantity, i.unit_price_cents, i.stripe_price_id
    from jsonb_to_recordset(p_items) as i(
      stripe_line_item_id text, product_id uuid, variant_id uuid,
      colorway_id uuid, product_name text, style text, color text,
      garment text, size text, sku text, quantity integer,
      unit_price_cents integer, stripe_price_id text
    );
  else
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

comment on column public.product_variants.style is
  'Sellable garment style, such as Tee or Tank. Variant uniqueness is product + style + size.';
comment on column public.product_variants.garment is
  'Optional blank/garment identifier used for fulfillment.';
comment on column public.order_items.colorway_id is
  'Selected colorway reference; readable style/color/garment fields are immutable checkout snapshots.';

commit;
