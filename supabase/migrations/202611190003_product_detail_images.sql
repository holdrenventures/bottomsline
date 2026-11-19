alter table public.products add column if not exists gallery_images jsonb not null default '[]'::jsonb;
alter table public.products add constraint products_gallery_images_array check (jsonb_typeof(gallery_images) = 'array' and jsonb_array_length(gallery_images) <= 8);
comment on column public.products.gallery_images is 'Optional R2 detail photos and close-up images, each with url and alt text.';
