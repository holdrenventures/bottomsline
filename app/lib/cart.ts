export type CartItem = {
  productId: string;
  slug: string;
  name: string;
  unitPrice: number;
  size: string;
  quantity: number;
  stripeProductId: string | null;
  stripePriceId: string | null;
  // Optional colorway. Size is the SKU dimension; color is captured so
  // order_items.sku (free text) can encode the combined selection at checkout.
  color?: string | null;
  colorId?: string | null;
  colorMockup?: string | null;
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
  // Same product + size + color folds into one line; different color is a
  // different line even at the same size.
  const existing = cart.find((item) =>
    item.productId === nextItem.productId
    && item.size === nextItem.size
    && (item.color ?? null) === (nextItem.color ?? null)
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
