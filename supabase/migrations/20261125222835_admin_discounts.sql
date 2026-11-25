-- Admin-managed coupon codes. Only the Worker service role can reach these
-- tables; the public storefront resolves submitted codes through its API.
begin;

create table public.discounts (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[A-Z0-9]+(-[A-Z0-9]+)*$' and char_length(code) between 4 and 32),
  name text not null check (char_length(btrim(name)) between 2 and 100),
  kind text not null check (kind in ('percent', 'fixed')),
  value integer not null check (value > 0 and (kind <> 'percent' or value <= 100)),
  active boolean not null default false,
  combinable boolean not null default false,
  used_count integer not null default 0 check (used_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger discounts_updated_at before update on public.discounts
  for each row execute function public.store_set_updated_at();

create table public.discount_redemptions (
  id uuid primary key default gen_random_uuid(),
  discount_id uuid not null references public.discounts(id) on delete restrict,
  stripe_checkout_session_id text not null check (stripe_checkout_session_id ~ '^cs_'),
  created_at timestamptz not null default now(),
  unique (discount_id, stripe_checkout_session_id)
);

create index discount_redemptions_discount_id_idx on public.discount_redemptions(discount_id);

create function public.increment_discount_uses() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  update public.discounts set used_count = used_count + 1 where id = new.discount_id;
  return new;
end;
$$;

create trigger discount_redemptions_count after insert on public.discount_redemptions
  for each row execute function public.increment_discount_uses();

alter table public.discounts enable row level security;
alter table public.discount_redemptions enable row level security;
revoke all on public.discounts, public.discount_redemptions from public, anon, authenticated;
grant select, insert, update on public.discounts, public.discount_redemptions to service_role;
revoke all on function public.increment_discount_uses() from public, anon, authenticated;
grant execute on function public.increment_discount_uses() to service_role;

-- Preserve the two existing codes. Their counters begin when this migration
-- ships because historical orders did not store which code was applied.
insert into public.discounts (code, name, kind, value, active, combinable)
values
  ('WOAKS10', 'WOaks10 · 10% off', 'percent', 10, true, false),
  ('ENB15', 'ENB15 · 15% off', 'percent', 15, true, false);

comment on table public.discounts is 'Private, admin-managed checkout coupon codes.';
comment on column public.discounts.used_count is 'Paid checkout sessions counted since this table was introduced.';

commit;
