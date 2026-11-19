// The catalog's sellable option is identified by style and size, regardless of blank.
export const variantKey = ({ style, size }) => [style, size].map((part) => String(part || '').trim().toLowerCase()).join('|');

export function uniqueVariantWrites(incoming, saved) {
  const savedByKey = new Map(saved.map((variant) => [variantKey(variant), variant.id]));
  const seen = new Set();
  return incoming.filter((variant) => {
    const key = variantKey(variant);
    if (seen.has(key) || (savedByKey.has(key) && savedByKey.get(key) !== variant.id)) return false;
    seen.add(key);
    return true;
  });
}
