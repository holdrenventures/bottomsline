-- Draft rows for the two personalized area-code trucker hats.
--
-- DO NOT RUN until supabase/migrations/202611260001_order_item_area_code.sql
-- has been applied. Products are inserted with active = false. Variants and
-- colorways are sellable, so publishing later is one update:
--
--   update public.products
--   set active = true
--   where slug in (
--     'your-area-code-rainbow-trucker-hat',
--     'your-area-code-trans-pride-trucker-hat'
--   );
--
-- Do that only after the Worker from this change is deployed. An older Worker
-- will sell the hat without asking for, or storing, the area code.
--
-- Do not rename these slugs. The storefront treats the slug as the switch
-- that requires a 3-digit area code.
--
-- Style is Hat, so /shop/hats picks them up in application code. Pride is the
-- only Supabase collection link. Hats is not a collections row.
--
-- Photos are the fixed 615 hats. The product page says the numerals in the
-- photo are a sample and the printed code is what the customer enters.
-- Rainbow reuses https://images.bottomslineclothing.com/hats/615-pride-trucker-hat/
-- Trans reuses https://images.bottomslineclothing.com/hats/615-trans-pride-trucker-hat/
-- There is no black-white back photo for the trans hat, so it is not in the gallery.
-- Price is 3500 cents ($35). Stripe price ids stay null; checkout uses price_data.

begin;

do $$
begin
  if exists (
    select 1 from public.products
    where slug in (
      'your-area-code-rainbow-trucker-hat',
      'your-area-code-trans-pride-trucker-hat'
    )
  ) then
    raise exception 'Area-code hat products already exist. Refusing to insert duplicates.';
  end if;
end $$;

with inserted as (
  insert into public.products (
    name, slug, editorial_descriptor, description, product_annotation,
    material, fit_notes, care_instructions,
    base_price_cents, currency, catalog_image, gallery_images,
    active, featured, new_drop
  ) values
  (
    'Your Area Code Rainbow Trucker Hat',
    'your-area-code-rainbow-trucker-hat',
    'Bring Your Own Digits',
    'Your three digits, in the same rainbow block numerals as the 615 Pride hat. Enter the area code before it goes in the bag. Yupoong 6606 trucker, one size, mesh back.',
    'The photo shows 615 as a sample. Your area code goes here.',
    'Yupoong 6606 — polyester/foam front, mesh back.',
    'Yupoong 6606 retro trucker. One size, adjustable snapback.',
    'Spot clean only. Do not machine wash, bleach, or tumble dry. Air dry if needed.',
    3500,
    'usd',
    'https://images.bottomslineclothing.com/hats/615-pride-trucker-hat/heather-black.webp',
    '[
      {"url":"https://images.bottomslineclothing.com/hats/615-pride-trucker-hat/navy-white-right-front.webp","alt":"Your Area Code Rainbow Trucker Hat, sample numerals. Your area code is printed instead. Navy/ White, right-front view."},
      {"url":"https://images.bottomslineclothing.com/hats/615-pride-trucker-hat/navy-white-back.webp","alt":"Your Area Code Rainbow Trucker Hat, sample numerals. Your area code is printed instead. Navy/ White, back view."},
      {"url":"https://images.bottomslineclothing.com/hats/615-pride-trucker-hat/navy-white-right.webp","alt":"Your Area Code Rainbow Trucker Hat, sample numerals. Your area code is printed instead. Navy/ White, side view."},
      {"url":"https://images.bottomslineclothing.com/hats/615-pride-trucker-hat/black-white-right-front.webp","alt":"Your Area Code Rainbow Trucker Hat, sample numerals. Your area code is printed instead. Black/ White, right-front view."},
      {"url":"https://images.bottomslineclothing.com/hats/615-pride-trucker-hat/heather-black-right-front.webp","alt":"Your Area Code Rainbow Trucker Hat, sample numerals. Your area code is printed instead. Heather/ Black, right-front view."},
      {"url":"https://images.bottomslineclothing.com/hats/615-pride-trucker-hat/red-right-front.webp","alt":"Your Area Code Rainbow Trucker Hat, sample numerals. Your area code is printed instead. Red, right-front view."},
      {"url":"https://images.bottomslineclothing.com/hats/615-pride-trucker-hat/pink-right-front.webp","alt":"Your Area Code Rainbow Trucker Hat, sample numerals. Your area code is printed instead. Pink, right-front view."},
      {"url":"https://images.bottomslineclothing.com/hats/615-pride-trucker-hat/heather-black-back.webp","alt":"Your Area Code Rainbow Trucker Hat, sample numerals. Your area code is printed instead. Heather/ Black, back view."}
    ]'::jsonb,
    false, false, false
  ),
  (
    'Your Area Code Trans Pride Trucker Hat',
    'your-area-code-trans-pride-trucker-hat',
    'Trans Pride, Your Digits',
    'Your three digits in trans pride stripes — light blue, pink, and white — same block numerals as the 615 Trans Pride hat. Enter the area code before it goes in the bag. Yupoong 6606 trucker, one size, mesh back.',
    'The photo shows 615 as a sample. Your area code goes here.',
    'Yupoong 6606 — polyester/foam front, mesh back.',
    'Yupoong 6606 retro trucker. One size, adjustable snapback.',
    'Spot clean only. Do not machine wash, bleach, or tumble dry. Air dry if needed.',
    3500,
    'usd',
    'https://images.bottomslineclothing.com/hats/615-trans-pride-trucker-hat/navy-white.webp',
    '[
      {"url":"https://images.bottomslineclothing.com/hats/615-trans-pride-trucker-hat/navy-white-back.webp","alt":"Your Area Code Trans Pride Trucker Hat, sample numerals. Your area code is printed instead. Navy/ White, back view."},
      {"url":"https://images.bottomslineclothing.com/hats/615-trans-pride-trucker-hat/heather-black-back.webp","alt":"Your Area Code Trans Pride Trucker Hat, sample numerals. Your area code is printed instead. Heather/ Black, back view."},
      {"url":"https://images.bottomslineclothing.com/hats/615-trans-pride-trucker-hat/red-back.webp","alt":"Your Area Code Trans Pride Trucker Hat, sample numerals. Your area code is printed instead. Red, back view."},
      {"url":"https://images.bottomslineclothing.com/hats/615-trans-pride-trucker-hat/pink-back.webp","alt":"Your Area Code Trans Pride Trucker Hat, sample numerals. Your area code is printed instead. Pink, back view."}
    ]'::jsonb,
    false, false, false
  )
  returning id, slug
), variants as (
  insert into public.product_variants (
    product_id, style, garment, size, sku, active, inventory_quantity, price_cents
  )
  select
    id,
    'Hat',
    'yupoong6606',
    'One Size',
    case slug
      when 'your-area-code-rainbow-trucker-hat' then 'YOUR-AREA-CODE-RAINBOW-HAT-YUPOONG6606-ONESIZE'
      else 'YOUR-AREA-CODE-TRANS-HAT-YUPOONG6606-ONESIZE'
    end,
    true,
    null,
    3500
  from inserted
  returning product_id
), colors as (
  insert into public.product_colors (
    product_id, color, style, garment, mockup_url, sort_order, active
  )
  select
    inserted.id,
    colorway.color,
    'Hat',
    'yupoong6606',
    'https://images.bottomslineclothing.com/hats/'
      || case inserted.slug
        when 'your-area-code-rainbow-trucker-hat' then '615-pride-trucker-hat'
        else '615-trans-pride-trucker-hat'
      end
      || '/' || colorway.file || '.webp',
    colorway.sort_order,
    true
  from inserted
  cross join (
    values
      ('Black/ White', 'black-white', 0),
      ('Navy/ White', 'navy-white', 1),
      ('Heather/ Black', 'heather-black', 2),
      ('Red', 'red', 3),
      ('Pink', 'pink', 4)
  ) as colorway(color, file, sort_order)
  returning product_id
)
insert into public.product_collections (product_id, collection_id, sort_order)
select inserted.id, collections.id, 0
from inserted
join public.collections on collections.slug = 'pride'
where exists (select 1 from variants)
  and exists (select 1 from colors);

commit;
