-- Extend the Design Adjuster from tees/tanks to the SS3000 crewneck and
-- SS4500 pullover hoodie. Product variants and colorways already accept free-
-- form style and garment identifiers; only the designs table was constrained.

begin;

alter table public.designs
  drop constraint if exists designs_garment_check;

alter table public.designs
  add constraint designs_garment_check
  check (garment in ('tee', 'tank', 'crewneck', 'hoodie'));

-- The same artwork needs a different placement on each blank. Preserve every
-- placement instead of letting the last garment overwrite the others.
alter table public.designs
  drop constraint if exists designs_pkey;

alter table public.designs
  add constraint designs_pkey primary key (slug, garment);

comment on column public.designs.garment is
  'Design Adjuster blank: tee, tank, crewneck (SS3000), or hoodie (SS4500).';

commit;
