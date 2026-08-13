import { NextResponse } from "next/server";

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

    if (json.result !== "success") {
      return NextResponse.json(
        { success: false, rates: cache?.data ?? {} },
        { status: 502 }
      );
    }

    cache = { data: json.rates, fetchedAt: Date.now() };
    return NextResponse.json({ success: true, rates: json.rates, cached: false });
  } catch (err) {
    return NextResponse.json(
      { success: false, rates: cache?.data ?? {} },
      { status: 502 }
    );
  }
}
