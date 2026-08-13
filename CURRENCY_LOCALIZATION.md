# Country-Based Currency Conversion — Implementation Guide

**Goal:** Store all prices in NPR (Nepali Rupee) as the source of truth (as they already
are in `mock-data.ts` / the `Product.price` field). When a visitor loads the site from
another country, detect that country and display converted, formatted prices in the
local currency — without touching the underlying data.

Today prices are read straight off `product.price` and hardcoded with `Rs.` / `₹` in
~15 different files (`ProductCard.tsx`, `ProductsSection.tsx`, `Navigation.tsx`,
`Checkout.tsx`, `ProductDetail.tsx`, `Subscribe.tsx`, `OrderConfirmed.tsx`, etc). We
centralize that into one currency layer and swap the call sites.

---

## 1. Architecture

```
Request → middleware.ts (reads geo header, sets `himmat_country` cookie)
              ↓
CurrencyProvider (client context)
   - reads country cookie
   - maps country → currency code (NPR, INR, USD, ...)
   - fetches exchange rates from /api/exchange-rates (cached)
   - exposes: currency, rate, formatPrice(priceInNPR)
              ↓
Components call `const { formatPrice } = useCurrency()`
   formatPrice(product.price)  →  "$14.50" / "₹2,200" / "Rs. 1,850"
```

Everything downstream of NPR is presentation-only. Cart totals, checkout math, and the
database keep working in NPR; conversion happens only when rendering.

---

## 2. Country → currency mapping

`src/lib/currency.ts`

```ts
export const BASE_CURRENCY = "NPR";

export const CURRENCY_BY_COUNTRY: Record<string, string> = {
  NP: "NPR", IN: "INR", US: "USD", GB: "GBP", AU: "AUD",
  CA: "CAD", JP: "JPY", CN: "CNY", DE: "EUR", FR: "EUR",
  AE: "AED", SG: "SGD",
  // fallback handled below
};

export const CURRENCY_META: Record<string, { symbol: string; locale: string; decimals: number }> = {
  NPR: { symbol: "Rs.", locale: "ne-NP", decimals: 0 },
  INR: { symbol: "₹",   locale: "en-IN", decimals: 0 },
  USD: { symbol: "$",   locale: "en-US", decimals: 2 },
  GBP: { symbol: "£",   locale: "en-GB", decimals: 2 },
  EUR: { symbol: "€",   locale: "de-DE", decimals: 2 },
  AUD: { symbol: "A$",  locale: "en-AU", decimals: 2 },
  CAD: { symbol: "C$",  locale: "en-CA", decimals: 2 },
  JPY: { symbol: "¥",   locale: "ja-JP", decimals: 0 },
  CNY: { symbol: "¥",   locale: "zh-CN", decimals: 2 },
  AED: { symbol: "د.إ", locale: "ar-AE", decimals: 2 },
  SGD: { symbol: "S$",  locale: "en-SG", decimals: 2 },
};

export function currencyForCountry(countryCode?: string | null): string {
  if (!countryCode) return BASE_CURRENCY;
  return CURRENCY_BY_COUNTRY[countryCode.toUpperCase()] ?? "USD"; // default non-NP visitors to USD
}

export function formatConverted(
  priceInNPR: number,
  currency: string,
  rate: number // units of `currency` per 1 NPR
): string {
  const meta = CURRENCY_META[currency] ?? CURRENCY_META.USD;
  const converted = priceInNPR * rate;
  return `${meta.symbol} ${converted.toLocaleString(meta.locale, {
    minimumFractionDigits: meta.decimals,
    maximumFractionDigits: meta.decimals,
  })}`;
}
```

---

## 3. Detect the visitor's country (middleware)

Vercel (and most edge hosts) inject the visitor's country on every request. Extend the
existing `src/middleware.ts` to stamp a cookie once, so the client doesn't need a
separate geo-IP call:

```ts
// inside middleware(), before `return NextResponse.next()`
const res = NextResponse.next()

const existing = req.cookies.get('himmat_country')?.value
if (!existing) {
  // req.geo is available on Vercel; falls back to header some hosts set
  const country =
    (req as any).geo?.country ||
    req.headers.get('x-vercel-ip-country') ||
    'NP'
  res.cookies.set('himmat_country', country, {
    path: '/',
    maxAge: 60 * 60 * 24 * 30, // 30 days
  })
}

return res
```

Add `'/'` and the storefront routes to the middleware `matcher` so this runs on normal
page loads too (currently it only matches admin/account/api paths).

If not deployed on Vercel, swap the geo lookup for a lightweight IP-to-country API
(e.g. `ipapi.co/{ip}/country/`) called once inside this same middleware block.

---

## 4. Exchange rates API (cached)

`src/app/api/exchange-rates/route.ts`

```ts
import { NextResponse } from "next/server";

let cache: { data: Record<string, number>; fetchedAt: number } | null = null;
const TTL = 1000 * 60 * 60 * 6; // 6 hours

export async function GET() {
  if (cache && Date.now() - cache.fetchedAt < TTL) {
    return NextResponse.json({ success: true, rates: cache.data, cached: true });
  }

  // Free tier, no key needed: https://www.exchangerate-api.com/docs/free
  const res = await fetch("https://open.er-api.com/v6/latest/NPR");
  const json = await res.json();

  if (json.result !== "success") {
    return NextResponse.json({ success: false, rates: cache?.data ?? {} }, { status: 502 });
  }

  cache = { data: json.rates, fetchedAt: Date.now() };
  return NextResponse.json({ success: true, rates: json.rates, cached: false });
}
```

Swap `open.er-api.com` for whatever provider your team already has a key for; the shape
returned is `{ USD: 0.0075, INR: 0.625, ... }` — "1 NPR = X units of currency".

---

## 5. Currency context

`src/context/CurrencyContext.tsx`

```tsx
"use client";

import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { BASE_CURRENCY, currencyForCountry, formatConverted } from "@/lib/currency";

interface CurrencyContextType {
  currency: string;
  setCurrency: (c: string) => void; // manual override, e.g. a currency switcher in the footer
  formatPrice: (priceInNPR: number) => string;
  isLoading: boolean;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrencyState] = useState<string>(BASE_CURRENCY);
  const [rates, setRates] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // 1. manual preference wins if the user picked one before
    const stored = localStorage.getItem("himmat_currency");
    const country = readCookie("himmat_country");
    const detected = stored ?? currencyForCountry(country);
    setCurrencyState(detected);

    // 2. load rates once
    fetch("/api/exchange-rates")
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setRates(json.rates);
      })
      .finally(() => setIsLoading(false));
  }, []);

  const setCurrency = (c: string) => {
    setCurrencyState(c);
    localStorage.setItem("himmat_currency", c);
  };

  const formatPrice = (priceInNPR: number) => {
    if (currency === BASE_CURRENCY) {
      return formatConverted(priceInNPR, BASE_CURRENCY, 1);
    }
    const rate = rates[currency];
    if (!rate) return formatConverted(priceInNPR, BASE_CURRENCY, 1); // safe fallback while loading
    return formatConverted(priceInNPR, currency, rate);
  };

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency, formatPrice, isLoading }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const ctx = useContext(CurrencyContext);
  if (!ctx) throw new Error("useCurrency must be used within CurrencyProvider");
  return ctx;
}
```

Register it once, alongside the other providers (`AuthContext`, `CartContext`, etc. —
check `src/app/layout.tsx` or wherever those are composed):

```tsx
<CurrencyProvider>
  <CartProvider>{children}</CartProvider>
</CurrencyProvider>
```

---

## 6. Swap the call sites

Replace every hardcoded `Rs.{product.price.toLocaleString()}` / `₹{product.price...}`
with the shared formatter:

```tsx
// before (ProductCard.tsx, ProductsSection.tsx, Navigation.tsx, ProductDetail.tsx,
//         Wishlist.tsx, ProductsCatalog.tsx, CollectionDetail.tsx, Subscribe.tsx, ...)
Rs.{product.price.toLocaleString()}

// after
const { formatPrice } = useCurrency();
...
{formatPrice(product.price)}
```

For `Checkout.tsx` and `OrderConfirmed.tsx`, which currently read `currency` from admin
`Settings` (`liveSettings?.currency`) — keep that as the *store's* base currency label
for invoices/admin records (money actually charged is NPR), but use `formatPrice` only
for the on-screen customer-facing total if you want the checkout page itself to show a
converted estimate. Do not convert the amount actually sent to the payment/order APIs —
always charge and store in NPR to avoid rounding disputes; conversion is display-only.

---

## 7. Optional: manual currency switcher

Add a small dropdown (e.g. in `Navigation.tsx` footer/topbar) bound to
`setCurrency` from `useCurrency()`, listing `Object.keys(CURRENCY_META)`. This lets a
user override the auto-detected country currency, with the choice persisted in
`localStorage`.

---

## 8. Testing checklist

- [ ] Visiting from Nepal (or no geo data) shows `Rs.` with NPR figures unchanged.
- [ ] Simulate other countries by manually setting the `himmat_country` cookie in
      devtools and reloading — prices should convert and format per-locale.
- [ ] `/api/exchange-rates` returns cached data on repeat calls within 6h.
- [ ] Cart/checkout totals, coupons, and tax math still compute in NPR internally;
      only the rendered text changes.
- [ ] Manual currency switcher overrides geo-detection and persists across reloads.
