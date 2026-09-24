-- Lean fulfillment fields for the private Orders Desk.
-- Product/payment snapshots remain immutable; only operational status changes.

begin;

alter table public.orders
  add column if not exists carrier text,
  add column if not exists tracking_number text,
  add column if not exists tracking_url text,
  add column if not exists fulfilled_at timestamptz;

comment on column public.orders.carrier is
  'Optional shipping carrier entered by the private Orders Desk.';
comment on column public.orders.tracking_number is
  'Optional shipment tracking number entered by the private Orders Desk.';
comment on column public.orders.tracking_url is
  'Optional customer-facing shipment tracking URL.';
comment on column public.orders.fulfilled_at is
  'First time the order moved to shipped or delivered; cleared if fulfillment is reversed.';

commit;
