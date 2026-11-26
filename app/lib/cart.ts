import { isAreaCode } from './area-code.ts';

export type CartItem = {
  productId: string;
  variantId: string | null;
  sku: string | null;
  slug: string;
  name: string;
  unitPrice: number;
  size: string;
  quantity: number;
  // Optional garment/colorway selection. colorId is the stable choice ID;
  // the readable fields are retained for the future bag and order snapshot.
  color?: string | null;
  colorId?: string | null;
  colorMockup?: string | null;
  style?: string | null;
  garment?: string | null;
  // Three digits, only on personalized hats. Different codes are different lines.
  areaCode?: string | null;
};

export const CART_STORAGE_KEY = 'bottoms-line-cart-v1';
export const CART_UPDATED_EVENT = 'bottoms-line-bag-updated';

export function parseStoredCart(parsed: unknown): CartItem[] {
  if (!Array.isArray(parsed)) return [];
  return parsed.filter((item): item is CartItem => {
    if (!item || typeof item !== 'object') return false;
    const candidate = item as CartItem;
    const areaCode = candidate.areaCode;
    return typeof candidate.productId === 'string'
      && typeof candidate.slug === 'string'
      && typeof candidate.name === 'string'
      && typeof candidate.size === 'string'
      && Number.isFinite(candidate.unitPrice)
      && Number.isInteger(candidate.quantity)
      && candidate.quantity > 0
      && (areaCode == null || isAreaCode(areaCode));
  });
}

export function readCart(): CartItem[] {
  try {
    const stored = window.localStorage.getItem(CART_STORAGE_KEY);
    if (!stored) return [];
    return parseStoredCart(JSON.parse(stored) as unknown);
  } catch {
    return [];
  }
}

export function writeCart(cart: CartItem[]) {
  window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
  window.dispatchEvent(new Event(CART_UPDATED_EVENT));
  return cart;
}

export function cartLinesMatch(item: CartItem, nextItem: CartItem) {
  // Same product + size + colorway + area code folds into one line. A tee and
  // tank stay distinct when they share a color name. Two hats with different
  // area codes stay distinct even when every other field matches.
  return item.productId === nextItem.productId
    && (item.variantId ?? null) === (nextItem.variantId ?? null)
    && item.size === nextItem.size
    && (item.colorId ?? null) === (nextItem.colorId ?? null)
    && (item.style ?? null) === (nextItem.style ?? null)
    && (item.areaCode ?? null) === (nextItem.areaCode ?? null);
}

export function withCartItem(cart: CartItem[], nextItem: CartItem) {
  const existing = cart.find((item) => cartLinesMatch(item, nextItem));
  if (!existing) return [...cart, nextItem];
  return cart.map((item) => item === existing ? { ...item, quantity: item.quantity + nextItem.quantity } : item);
}

export function addCartItem(nextItem: CartItem) {
  return writeCart(withCartItem(readCart(), nextItem));
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
