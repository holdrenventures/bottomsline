-- Newsletter signups, each with a single-use 10%-off welcome code.
--
-- The Worker emails the code via Resend (never returns it to the browser), the
-- checkout route validates it, and the Stripe webhook marks it redeemed once
-- payment succeeds.

begin;

create table public.email_signups (
  id uuid primary key default gen_random_uuid(),
  email text not null unique check (email = lower(btrim(email)) and email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  discount_code text not null unique check (discount_code ~ '^[A-Z0-9-]{4,32}$'),
  source text,
  code_sent_at timestamptz,
  redeemed_at timestamptz,
  redeemed_checkout_session_id text check (redeemed_checkout_session_id ~ '^cs_'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger email_signups_updated_at before update on public.email_signups
  for each row execute function public.store_set_updated_at();

alter table public.email_signups enable row level security;

revoke all privileges on table public.email_signups from public, anon, authenticated;
grant select, insert, update, delete on table public.email_signups to service_role;

comment on table public.email_signups is
  'Private Worker-owned email list with single-use welcome discount codes.';

commit;
