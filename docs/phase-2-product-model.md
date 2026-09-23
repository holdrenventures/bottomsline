# Bottom's Line Phase 2 product model

## Approved lean model

- **Product**: the design/listing and shared editorial content.
- **Sellable variant**: product + style + size, with a unique SKU, price,
  optional inventory quantity, and Stripe references.
- **Colorway**: product + style + color, with the garment/blank and product
  mockup. A colorway does not require its own Stripe price.
- **Cart/order selection**: variant ID + colorway ID, with readable style,
  color, garment, size and SKU snapshots retained on the order.

## Why this is the V1 model

Tee and Tank can have different prices. Sizes may also have different prices
when needed. Colors can share the style price, avoiding hundreds of redundant
Stripe Prices. Inventory is optional: `NULL` means made to order or otherwise
untracked; zero means unavailable.

## Product Desk workflow

For each product:

1. Enter the shared product information and base display price.
2. Add each visible colorway with Style, Color, Garment and Cloudinary mockup.
3. Add sellable variants for every offered Style + Size combination.
4. Give every variant a unique SKU and correct price in cents.
5. Leave Inventory blank for made-to-order products, or enter a quantity when
   stock should be enforced.
6. Mark the variant Sellable when it should appear as an available option.
7. Add the Stripe Product and Price references in Phase 4. Checkout will not
   accept a variant until those references exist.
8. Mark the product Active only when its public content and options are ready.

Example:

| Style | Size | SKU | Price | Inventory | Stripe price |
| --- | --- | --- | ---: | --- | --- |
| Tee | M | `SLB-TEE-M` | 2600 | blank/untracked | shared $26 Tee price |
| Tee | L | `SLB-TEE-L` | 2600 | blank/untracked | shared $26 Tee price |
| Tank | M | `SLB-TANK-M` | 2800 | blank/untracked | shared $28 Tank price |
| Tank | L | `SLB-TANK-L` | 2800 | blank/untracked | shared $28 Tank price |

Colorways such as Black Tee, Red Tee, Black Tank, and White Tank attach the
chosen mockup and garment to one of those style/size selections.

## Deployment dependency

Apply `supabase/migrations/202609230001_saleable_variants.sql` to Supabase
before deploying the corresponding application code. The application begins
selecting the new variant columns immediately after deployment.
