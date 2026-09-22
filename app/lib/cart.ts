export type CartItem = {
  productId: string;
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
    return stored ? JSON.parse(stored) as CartItem[] : [];
  } catch {
    return [];
  }
}

export function addCartItem(nextItem: CartItem) {
  const cart = readCart();
  // Same product + size + exact colorway folds into one line. A tee and tank
  // remain distinct even when they share the same color name.
  const existing = cart.find((item) =>
    item.productId === nextItem.productId
    && item.size === nextItem.size
    && (item.colorId ?? null) === (nextItem.colorId ?? null)
    && (item.style ?? null) === (nextItem.style ?? null)
  );
  if (existing) existing.quantity += nextItem.quantity;
  else cart.push(nextItem);
  window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
  window.dispatchEvent(new Event(CART_UPDATED_EVENT));
  return cart;
}

export function getCartQuantity(cart = readCart()) {
  return cart.reduce((total, item) => total + item.quantity, 0);
}
