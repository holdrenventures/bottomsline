// House price list. Every product uses the same price for the same garment and size.
// Returns null for garments without a set price (hats, custom) so callers can fall back.
export function standardPriceCents(style: string | null | undefined, size: string | null | undefined): number | null {
  const s = (size ?? '').trim().toUpperCase();
  switch ((style ?? '').trim().toLowerCase()) {
    case 'tee':
      return ({ '2XL': 2700, '3XL': 2900, '4XL': 3100, '5XL': 3300 } as Record<string, number>)[s] ?? 2500;
    case 'tank':
      return ({ '2XL': 2900, '3XL': 3100, '4XL': 3300 } as Record<string, number>)[s] ?? 2700;
    case 'sweatshirt':
      return 3700;
    case 'hoodie':
      return 4200;
    default:
      return null;
  }
}
