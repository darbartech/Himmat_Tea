import { NextResponse } from "next/server";
import { getExchangeRates } from "@/lib/exchange-rates";

/**
 * Public, cached exchange-rate endpoint. All caching / upstream-call
 * dedupe logic lives in `src/lib/exchange-rates.ts` (shared with
 * /api/orders, which snapshots the authoritative rate onto each order at
 * creation time) so this route never triggers a second, independent
 * upstream request.
 */
export async function GET() {
  const result = await getExchangeRates();
  return NextResponse.json({
    success: true,
    rates: result.rates,
    cached: result.cached,
    ...(result.fallback ? { fallback: true } : {}),
  });
}
