"use client";

import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { BASE_CURRENCY, currencyForCountry, formatConverted } from "@/lib/currency";

interface CurrencyContextType {
  currency: string;
  setCurrency: (c: string) => void;
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
    const stored = localStorage.getItem("himmat_currency");
    const country = readCookie("himmat_country");
    const detected = stored ?? currencyForCountry(country);
    setCurrencyState(detected);

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
    if (!rate) return formatConverted(priceInNPR, BASE_CURRENCY, 1);
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
