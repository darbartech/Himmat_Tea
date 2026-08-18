// Single source of truth for weight-based price multipliers.
//
// IMPORTANT: This constant is imported by BOTH the client
// (src/app/pages/ProductDetail.tsx, for the price the customer sees and
// confirms at checkout) and the server (src/app/api/orders/route.ts, for the
// price that is actually charged). Previously these lived as two separate
// hardcoded copies, and the server-side copy didn't exist at all — the API
// always charged the flat, weight-blind `Product.price`. That meant 100g
// orders were silently undercharged and, more seriously, 25g orders were
// charged MORE than the price the customer saw and confirmed during
// checkout. Keep this the one place either side reads from.
//
// NOTE: this is deliberately a flat multiplier applied to every product's
// base price (the "minimal fix" option) rather than true per-product
// weight-variant pricing. If different products should have different
// weight economics, replace this with a real `ProductVariant`-backed lookup
// keyed by (productId, weight) instead of a global constant.
export const WEIGHT_MULTIPLIERS: Record<string, number> = {
  "25g": 0.5,
  "50g": 1.0,
  "100g": 1.85,
};

export const DEFAULT_WEIGHT = "50g";

export const VALID_WEIGHTS = Object.keys(WEIGHT_MULTIPLIERS);

/**
 * Resolve the multiplier for a given weight string. Falls back to the
 * default (50g / 1.0) multiplier for missing or unrecognized values instead
 * of throwing, so legacy orders/items without a weight still price
 * correctly at the flat base price.
 */
export function getWeightMultiplier(weight: string | null | undefined): number {
  if (!weight) return WEIGHT_MULTIPLIERS[DEFAULT_WEIGHT];
  return WEIGHT_MULTIPLIERS[weight] ?? WEIGHT_MULTIPLIERS[DEFAULT_WEIGHT];
}

/**
 * Compute the weight-adjusted price for a base product price, rounded the
 * same way the client rounds it for display (nearest whole currency unit).
 */
export function getWeightAdjustedPrice(basePrice: number, weight: string | null | undefined): number {
  return Math.round(basePrice * getWeightMultiplier(weight));
}
