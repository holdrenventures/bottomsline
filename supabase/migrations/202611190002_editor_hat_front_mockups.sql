-- Hats are separate products, but use the same saved front-placement flow.
begin;
alter table public.designs drop constraint if exists designs_garment_check;
alter table public.designs add constraint designs_garment_check
  check (garment in ('tee', 'tank', 'crewneck', 'hoodie', 'tultex320', 'tultex340', 'hat'));
alter table public.design_assignments drop constraint if exists design_assignments_garment_check;
alter table public.design_assignments add constraint design_assignments_garment_check
  check (garment in ('tee', 'tultex320', 'tultex340', 'hat'));
commit;
