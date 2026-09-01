/**
 * Authoritative shop price list.
 *
 * The order total MUST be computed on the server from these values — never
 * trusted from the request body. The client `shop/page.js` renders the same
 * catalogue for display, but the numbers that decide what a user is charged /
 * recorded as owing live here, server-side, where the client cannot alter them.
 *
 * Keyed by product id → unit price (USD). Keep in sync with the PRODUCTS array
 * in src/app/shop/page.js (source of truth for pricing is THIS file).
 */
export const PRODUCT_PRICES = {
  1: 89.99,  2: 49.99,  3: 119.99, 4: 39.99,  5: 44.99,  6: 64.99,
  7: 29.99,  8: 24.99,  9: 18.99,  10: 22.99, 11: 79.99, 12: 69.99,
  13: 34.99, 14: 29.99, 15: 19.99, 16: 44.99, 17: 32.99, 18: 37.99,
};

/**
 * Recompute an order total from server-side prices.
 * Returns { ok, total, error }. Rejects unknown products or bad quantities so a
 * crafted cart can never produce a bogus (e.g. zero) charge.
 *
 * @param {Array<{id:number|string, qty:number}>} items
 */
export function computeOrderTotal(items) {
  if (!Array.isArray(items) || items.length === 0) {
    return { ok: false, error: 'Order must have at least one item' };
  }
  let total = 0;
  for (const item of items) {
    const price = PRODUCT_PRICES[item?.id];
    const qty = Number(item?.qty);
    if (price == null) {
      return { ok: false, error: `Unknown product: ${item?.id}` };
    }
    if (!Number.isInteger(qty) || qty < 1 || qty > 99) {
      return { ok: false, error: 'Invalid quantity' };
    }
    total += price * qty;
  }
  // Round to 2 decimals to avoid floating-point drift.
  return { ok: true, total: Math.round(total * 100) / 100 };
}
