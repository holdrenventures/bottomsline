-- Area-code personalization for made-to-order trucker hats.
--
-- Nullable on purpose. Tees, tanks, and the fixed 615 hats leave it null and
-- keep the checkout path they already have. Apply this in the Supabase SQL
-- editor BEFORE deploying the Worker that selects the column, and before
-- inserting the two draft hat products.
--
-- The column is text, not an integer, so a leading zero survives.

begin;

alter table public.checkout_attempt_items
  add column if not exists area_code text;

alter table public.order_items
  add column if not exists area_code text;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'checkout_attempt_items_area_code_check'
      and conrelid = 'public.checkout_attempt_items'::regclass
  ) then
    alter table public.checkout_attempt_items
      add constraint checkout_attempt_items_area_code_check
      check (area_code is null or area_code ~ '^[0-9]{3}$');
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'order_items_area_code_check'
      and conrelid = 'public.order_items'::regclass
  ) then
    alter table public.order_items
      add constraint order_items_area_code_check
      check (area_code is null or area_code ~ '^[0-9]{3}$');
  end if;
end $$;

comment on column public.checkout_attempt_items.area_code is
  'Customer-entered 3-digit area code for a personalized hat. Null for every other product.';
comment on column public.order_items.area_code is
  'Immutable checkout snapshot of the area code to print. Null when the product is not personalized.';

-- Same function as 202609230001_saleable_variants.sql, plus area_code on the
-- order-item insert. Signature is unchanged, so existing grants stay put.
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
      unit_price_cents, stripe_price_id, area_code
    )
    select v_order_id, i.stripe_line_item_id, i.product_id, i.variant_id,
      i.colorway_id, i.product_name, i.style, i.color, i.garment, i.size,
      i.sku, i.quantity, i.unit_price_cents, i.stripe_price_id, i.area_code
    from jsonb_to_recordset(p_items) as i(
      stripe_line_item_id text, product_id uuid, variant_id uuid,
      colorway_id uuid, product_name text, style text, color text,
      garment text, size text, sku text, quantity integer,
      unit_price_cents integer, stripe_price_id text, area_code text
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

commit;
