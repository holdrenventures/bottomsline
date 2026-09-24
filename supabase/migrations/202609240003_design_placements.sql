-- Stores one Cloudinary overlay placement per garment design.
-- The protected Worker endpoint uses this record to reproduce the design
-- across garment colors without storing a separate mockup asset per color.

begin;

create table if not exists public.designs (
  slug text primary key check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  garment text not null check (garment in ('tee', 'tank')),
  placement jsonb not null,
  colors text[] not null default '{}',
  updated_at timestamptz not null default now()
);

alter table public.designs enable row level security;
revoke all privileges on table public.designs from public, anon, authenticated;
grant select, insert, update, delete on table public.designs to service_role;

comment on table public.designs is
  'Cloudinary overlay placement and selected garment colors, managed through the protected Design Adjuster.';

commit;
