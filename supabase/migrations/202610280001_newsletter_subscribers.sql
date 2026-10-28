begin;

create table if not exists public.newsletter_subscribers (
  email text primary key,
  source text not null default 'homepage',
  consented_at timestamptz not null default now(),
  constraint newsletter_subscribers_email_length check (length(email) <= 254)
);

alter table public.newsletter_subscribers enable row level security;

commit;
