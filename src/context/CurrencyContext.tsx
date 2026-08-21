"use client";

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo, ReactNode } from "react";
import {
  BASE_CURRENCY,
  CurrencyCode,
  currencyForCountry,
  formatConverted,
  formatCurrency,
  formatSecondary,
  isSupportedCurrency,
} from "@/lib/currency";

interface CurrencyContextType {
  /** Currently selected display currency (defaults to the geo-detected one). */
  currency: CurrencyCode;
  setCurrency: (c: string) => void;
  /** Visitor's country (ISO 3166-1 alpha-2). Drives the currency/language defaults. */
  country: string;
  setCountry: (c: string) => void;
  /** Format an NPR amount for display in the current currency. */
  formatPrice: (priceInNPR: number) => string;
  /** "USD 11.25 ≈ NPR 1,500" style secondary line, or null when currency === NPR. */
  formatSecondaryPrice: (priceInNPR: number) => string | null;
  /** NPR -> current-currency rate currently in use (1 when currency is NPR). */
  exchangeRate: number;
  /** Full NPR-based rate table as last fetched. */
  rates: Record<string, number>;
  isLoading: boolean;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

const CURRENCY_STORAGE_KEY = "himmat_currency";
const CURRENCY_MANUAL_KEY = "himmat_currency_manual";
const COUNTRY_COOKIE = "himmat_country";
const COUNTRY_MANUAL_KEY = "himmat_country_manual";
const RATES_CACHE_KEY = "himmat_rates_cache_v1";
const RATES_CACHE_TTL = 1000 * 60 * 60 * 6; // 6h, matches server cache TTL
export const COUNTRY_CHANGE_EVENT = "himmat:countrychange";

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

function writeCookie(name: string, value: string) {
  if (typeof document === "undefined") return;
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${60 * 60 * 24 * 30}`;
}

// Module-level promise so concurrent CurrencyProvider mounts (e.g. React
// StrictMode's deliberate double-invoke in dev) never fire two upstream
// requests — every caller in this tab shares one in-flight fetch.
let ratesInFlight: Promise<Record<string, number>> | null = null;

function fetchRatesDeduped(): Promise<Record<string, number>> {
  if (ratesInFlight) return ratesInFlight;

  ratesInFlight = fetch("/api/exchange-rates")
    .then(async (response) => {
      if (!response.ok) {
        throw new Error(`Exchange rate request failed with status ${response.status}`);
      }
      const json = await response.json();
      if (json?.success && json.rates) {
        try {
          sessionStorage.setItem(
            RATES_CACHE_KEY,
            JSON.stringify({ rates: json.rates, fetchedAt: Date.now() })
          );
        } catch {
          /* sessionStorage unavailable (private mode, etc) — non-fatal */
        }
        return json.rates as Record<string, number>;
      }
      throw new Error("Exchange rate response missing rates.");
    })
    .finally(() => {
      ratesInFlight = null;
    });

  return ratesInFlight;
}

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrencyState] = useState<CurrencyCode>(BASE_CURRENCY);
  const [country, setCountryState] = useState<string>("NP");
  const [rates, setRates] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const cookieCountry = readCookie(COUNTRY_COOKIE) || "NP";
    setCountryState(cookieCountry.toUpperCase());

    const storedCurrency = localStorage.getItem(CURRENCY_STORAGE_KEY);
    const detected = isSupportedCurrency(storedCurrency) ? storedCurrency : currencyForCountry(cookieCountry);
    setCurrencyState(detected);

    // Reuse a fresh cached rate table (this tab, this session) instead of
    // re-fetching on every soft mount.
    try {
      const cachedRaw = sessionStorage.getItem(RATES_CACHE_KEY);
      if (cachedRaw) {
        const cached = JSON.parse(cachedRaw) as { rates: Record<string, number>; fetchedAt: number };
        if (cached?.rates && Date.now() - cached.fetchedAt < RATES_CACHE_TTL) {
          setRates(cached.rates);
          setIsLoading(false);
          return;
        }
      }
    } catch {
      /* ignore malformed cache */
    }

    fetchRatesDeduped()
      .then((r) => setRates(r))
      .catch((error) => {
        console.warn("Exchange rate fetch failed, using default display rates.", error);
      })
      .finally(() => setIsLoading(false));
  }, []);

  const setCurrency = useCallback((c: string) => {
    if (!isSupportedCurrency(c)) return;
    setCurrencyState(c);
    localStorage.setItem(CURRENCY_STORAGE_KEY, c);
    localStorage.setItem(CURRENCY_MANUAL_KEY, "1");
  }, []);

  const setCountry = useCallback((c: string) => {
    const upper = c.toUpperCase();
    setCountryState(upper);
    writeCookie(COUNTRY_COOKIE, upper);
    localStorage.setItem(COUNTRY_MANUAL_KEY, "1");

    // Country is a manual, independent choice, but if the visitor has never
    // manually picked a currency of their own, re-derive it from the newly
    // chosen country so the two stay sensibly in sync by default.
    if (!localStorage.getItem(CURRENCY_MANUAL_KEY)) {
      const nextCurrency = currencyForCountry(upper);
      setCurrencyState(nextCurrency);
      localStorage.setItem(CURRENCY_STORAGE_KEY, nextCurrency);
    }

    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent(COUNTRY_CHANGE_EVENT, { detail: { country: upper } }));
    }
  }, []);

  const exchangeRate = currency === BASE_CURRENCY ? 1 : rates[currency] ?? 1;

  const formatPrice = useCallback(
    (priceInNPR: number) => {
      if (currency === BASE_CURRENCY) return formatCurrency(priceInNPR, BASE_CURRENCY);
      const rate = rates[currency];
      if (!rate) return formatCurrency(priceInNPR, BASE_CURRENCY);
      return formatConverted(priceInNPR, currency, rate);
    },
    [currency, rates]
  );

  const formatSecondaryPrice = useCallback(
    (priceInNPR: number) => {
      if (currency === BASE_CURRENCY) return null;
      const rate = rates[currency];
      if (!rate) return null;
      return formatSecondary(priceInNPR, currency, rate);
    },
    [currency, rates]
  );

  const value = useMemo<CurrencyContextType>(
    () => ({
      currency,
      setCurrency,
      country,
      setCountry,
      formatPrice,
      formatSecondaryPrice,
      exchangeRate,
      rates,
      isLoading,
    }),
    [currency, setCurrency, country, setCountry, formatPrice, formatSecondaryPrice, exchangeRate, rates, isLoading]
  );

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
}

export function useCurrency() {
  const ctx = useContext(CurrencyContext);
  if (!ctx) throw new Error("useCurrency must be used within CurrencyProvider");
  return ctx;
}
