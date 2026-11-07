-- Reverse supabase/migrations/202611070001_r2_catalog_images.sql.
-- Restores catalog_image and mockup_url from the backup columns filled by
-- that migration. Does not delete the backup columns or any R2 object.
-- NOT APPLIED. Run only if the R2 cutover needs to be undone.

begin;

update public.products
set catalog_image = catalog_image_cloudinary
where catalog_image_cloudinary is not null
  and catalog_image is distinct from catalog_image_cloudinary;

update public.product_colors
set mockup_url = mockup_url_cloudinary
where mockup_url_cloudinary is not null
  and mockup_url is distinct from mockup_url_cloudinary;

commit;
