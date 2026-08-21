import { BASE_CURRENCY } from "@/lib/currency";

/**
 * IMPORTANT DEPLOYMENT NOTE (Caching):
 *
 * `cache` / `inflight` below are MODULE-LEVEL variables per Node.js
 * process. On horizontally-scaled / serverless deployments (multiple
 * instances, Vercel Lambdas, etc.) this cache is NOT shared between
 * instances — each instance makes its own upstream fetch the first time,
 * and different users MAY see very slightly different rates until every
 * instance has independently populated its cache. Consider a shared KV
 * store (Vercel KV, Upstash Redis, Cloudflare Workers KV, etc.) if exact
 * rate consistency across every instance is a hard requirement.
 */

export const FALLBACK_RATES: Record<string, number> = {
  NPR: 1,
  INR: 0.625,
  USD: 0.0075,
  EUR: 0.0069,
  GBP: 0.0058,
  AUD: 0.0113,
  CAD: 0.0106,
  JPY: 1.075,
  CNY: 0.054,
  AED: 0.0275,
  SGD: 0.0101,
  NZD: 0.0122,
  CHF: 0.0066,
  KRW: 9.85,
  SAR: 0.0281,
  QAR: 0.0273,
  MYR: 0.0332,
  THB: 0.257,
  IDR: 118.5,
  PHP: 0.421,
  ZAR: 0.135,
  TRY: 0.257,
  BRL: 0.0413,
  MXN: 0.1385,
};

export interface RatesResult {
  rates: Record<string, number>;
  cached: boolean;
  fallback?: boolean;
  fetchedAt: number;
}

let cache: { data: Record<string, number>; fetchedAt: number } | null = null;
let inflight: Promise<RatesResult> | null = null;

const TTL = 1000 * 60 * 60 * 6; // 6 hours
const FETCH_TIMEOUT_MS = 8_000;
const UPSTREAM_URL = `https://open.er-api.com/v6/latest/${BASE_CURRENCY}`;

async function fetchFromUpstream(): Promise<RatesResult> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    let json: any;
    try {
      const res = await fetch(UPSTREAM_URL, {
        next: { revalidate: 60 * 60 * 6 },
        signal: controller.signal,
      });
      json = await res.json();
    } finally {
      clearTimeout(timeout);
    }

    if (json.result !== "success" || !json.rates || typeof json.rates !== "object") {
      const fallback = cache?.data ?? FALLBACK_RATES;
      return { rates: fallback, cached: true, fallback: true, fetchedAt: cache?.fetchedAt ?? Date.now() };
    }

    cache = { data: json.rates, fetchedAt: Date.now() };
    return { rates: json.rates, cached: false, fetchedAt: cache.fetchedAt };
  } catch {
    const fallback = cache?.data ?? FALLBACK_RATES;
    return { rates: fallback, cached: true, fallback: true, fetchedAt: cache?.fetchedAt ?? Date.now() };
  }
}

/**
 * Returns the current NPR-based exchange rates, reusing an in-memory cache
 * (TTL 6h) whenever possible. If multiple callers (e.g. a page load's
 * /api/exchange-rates request racing an in-progress checkout's /api/orders
 * request) ask for rates at the same moment while the cache is cold, they
 * share a single in-flight upstream request instead of firing two.
 */
export async function getExchangeRates(): Promise<RatesResult> {
  if (cache && Date.now() - cache.fetchedAt < TTL) {
    return { rates: cache.data, cached: true, fetchedAt: cache.fetchedAt };
  }

  if (inflight) {
    return inflight;
  }

  inflight = fetchFromUpstream().finally(() => {
    inflight = null;
  });

  return inflight;
}

/**
 * Resolve the authoritative NPR -> `currency` rate for server-side use
 * (e.g. snapshotting an order). Never trusts a client-supplied rate for
 * the number actually stored — always re-derives it from the same cached
 * source the storefront itself reads from, falling back to the static
 * fallback table (and ultimately 1 / BASE_CURRENCY) if a currency is
 * somehow missing from the upstream response.
 */
export async function resolveRate(currency: string): Promise<number> {
  if (currency === BASE_CURRENCY) return 1;
  const { rates } = await getExchangeRates();
  const rate = rates[currency] ?? FALLBACK_RATES[currency];
  return typeof rate === "number" && rate > 0 ? rate : 1;
}
