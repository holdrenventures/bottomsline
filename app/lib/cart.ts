export type CartItem = {
  productId: string;
  variantId: string | null;
  sku: string | null;
  slug: string;
  name: string;
  unitPrice: number;
  size: string;
  quantity: number;
  stripeProductId: string | null;
  stripePriceId: string | null;
  // Optional garment/colorway selection. colorId is the stable choice ID;
  // the readable fields are retained for the future bag and order snapshot.
  color?: string | null;
  colorId?: string | null;
  colorMockup?: string | null;
  style?: string | null;
  garment?: string | null;
};

export const CART_STORAGE_KEY = 'bottoms-line-cart-v1';
export const CART_UPDATED_EVENT = 'bottoms-line-bag-updated';

export function readCart(): CartItem[] {
  try {
    const stored = window.localStorage.getItem(CART_STORAGE_KEY);
    if (!stored) return [];
    const parsed = JSON.parse(stored) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is CartItem => Boolean(
      item
      && typeof item === 'object'
      && typeof (item as CartItem).productId === 'string'
      && typeof (item as CartItem).slug === 'string'
      && typeof (item as CartItem).name === 'string'
      && typeof (item as CartItem).size === 'string'
      && Number.isFinite((item as CartItem).unitPrice)
      && Number.isInteger((item as CartItem).quantity)
      && (item as CartItem).quantity > 0,
    ));
  } catch {
    return [];
  }
}

export function writeCart(cart: CartItem[]) {
  window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
  window.dispatchEvent(new Event(CART_UPDATED_EVENT));
  return cart;
}

export function addCartItem(nextItem: CartItem) {
  const cart = readCart();
  // Same product + size + exact colorway folds into one line. A tee and tank
  // remain distinct even when they share the same color name.
  const existing = cart.find((item) =>
    item.productId === nextItem.productId
    && (item.variantId ?? null) === (nextItem.variantId ?? null)
    && item.size === nextItem.size
    && (item.colorId ?? null) === (nextItem.colorId ?? null)
    && (item.style ?? null) === (nextItem.style ?? null)
  );
  if (existing) existing.quantity += nextItem.quantity;
  else cart.push(nextItem);
  return writeCart(cart);
}

export function updateCartItem(index: number, quantity: number) {
  const cart = readCart();
  if (!cart[index]) return cart;
  cart[index].quantity = Math.max(1, Math.min(9, Math.floor(quantity)));
  return writeCart(cart);
}

export function removeCartItem(index: number) {
  const cart = readCart();
  if (!cart[index]) return cart;
  cart.splice(index, 1);
  return writeCart(cart);
}

export function clearCart() {
  return writeCart([]);
}

export function getCartQuantity(cart = readCart()) {
  return cart.reduce((total, item) => total + item.quantity, 0);
}
