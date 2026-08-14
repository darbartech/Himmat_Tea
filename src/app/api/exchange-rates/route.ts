import { NextResponse } from "next/server";

const FALLBACK_RATES: Record<string, number> = {
  NPR: 1,
  INR: 1,
  USD: 0.012,
  GBP: 0.0093,
  AUD: 0.018,
  CAD: 0.017,
  JPY: 1.72,
  CNY: 0.087,
  EUR: 0.011,
  AED: 0.044,
  SGD: 0.016,
};

let cache: { data: Record<string, number>; fetchedAt: number } | null = null;
const TTL = 1000 * 60 * 60 * 6;

export async function GET() {
  if (cache && Date.now() - cache.fetchedAt < TTL) {
    return NextResponse.json({ success: true, rates: cache.data, cached: true });
  }

  try {
    const res = await fetch("https://open.er-api.com/v6/latest/NPR", {
      next: { revalidate: 60 * 60 * 6 },
    });
    const json = await res.json();

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
