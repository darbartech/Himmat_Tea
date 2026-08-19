"use client";

import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { BRAND } from "@/config/brand";

export interface StoreSettings {
  storeName: string;
  storeEmail: string;
  storePhone: string;
  currency: string;
  taxRate: number;
  shippingFlatRate: number;
  gstNumber?: string | null;
}

interface SettingsContextType {
  settings: StoreSettings;
  isLoading: boolean;
}

const DEFAULT_SETTINGS: StoreSettings = {
  storeName: BRAND.companyName,
  storeEmail: BRAND.supportEmail,
  storePhone: BRAND.supportPhone,
  currency: "₹",
  taxRate: 18,
  shippingFlatRate: 0,
  gstNumber: null,
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<StoreSettings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    fetch("/api/settings")
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`Settings request failed with status ${response.status}`);
        }
        const json = await response.json();
        const data = json?.data ?? json;
        if (!cancelled && data) {
          setSettings({
            storeName: data.storeName || DEFAULT_SETTINGS.storeName,
            storeEmail: data.storeEmail || DEFAULT_SETTINGS.storeEmail,
            storePhone: data.storePhone || DEFAULT_SETTINGS.storePhone,
            currency: data.currency || DEFAULT_SETTINGS.currency,
            taxRate: typeof data.taxRate === "number" ? data.taxRate : DEFAULT_SETTINGS.taxRate,
            shippingFlatRate:
              typeof data.shippingFlatRate === "number" ? data.shippingFlatRate : DEFAULT_SETTINGS.shippingFlatRate,
            gstNumber: data.gstNumber ?? null,
          });
        }
      })
      .catch((error) => {
        console.warn("Failed to load store settings, using defaults.", error);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <SettingsContext.Provider value={{ settings, isLoading }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be used within SettingsProvider");
  return ctx;
}