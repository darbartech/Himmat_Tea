import { NextResponse } from "next/server";

/**
 * IMPORTANT DEPLOYMENT NOTE (Caching):
 *
 * The `cache` variable below is a MODULE-LEVEL variable per Node.js process.
 * On horizontally-scaled / serverless deployments (multiple instances, Vercel
 * Lambdas, etc.) this cache is NOT shared between instances — each instance
 * will make its own upstream fetch, and different users MAY see different
 * rates simultaneously until every instance has independently populated its
 * cache. Consider a shared KV store (Vercel KV, Upstash Redis, Cloudflare
 * Workers KV, etc.) if rate consistency across users is a hard requirement.
 *
 * Next.js's built-in `fetch` revalidation also co-exists at the platform /
 * CDN layer independently of this local in-memory TTL.
 */

const FALLBACK_RATES: Record<string, number> = {
  NPR: 1,
  INR: 0.625,
  USD: 0.0075,
  GBP: 0.0058,
  AUD: 0.0113,
  CAD: 0.0106,
  JPY: 1.075,
  CNY: 0.054,
  EUR: 0.0069,
  AED: 0.0275,
  SGD: 0.010,
};

let cache: { data: Record<string, number>; fetchedAt: number } | null = null;
const TTL = 1000 * 60 * 60 * 6;
const FETCH_TIMEOUT_MS = 8_000;

export async function GET() {
  if (cache && Date.now() - cache.fetchedAt < TTL) {
    return NextResponse.json({ success: true, rates: cache.data, cached: true });
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    let json: any;
    try {
      const res = await fetch("https://open.er-api.com/v6/latest/NPR", {
        next: { revalidate: 60 * 60 * 6 },
        signal: controller.signal,
      });
      json = await res.json();
    } finally {
      clearTimeout(timeout);
    }

    if (json.result !== "success" || !json.rates || typeof json.rates !== "object") {
      const fallback = cache?.data ?? FALLBACK_RATES;
      return NextResponse.json({ success: true, rates: fallback, cached: true, fallback: true }, { status: 200 });
    }

    cache = { data: json.rates, fetchedAt: Date.now() };
    return NextResponse.json({ success: true, rates: json.rates, cached: false });
  } catch (err) {
    const fallback = cache?.data ?? FALLBACK_RATES;
    return NextResponse.json({ success: true, rates: fallback, cached: true, fallback: true }, { status: 200 });
  }
}
