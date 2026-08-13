export const BASE_CURRENCY = "NPR";

export const CURRENCY_BY_COUNTRY: Record<string, string> = {
  NP: "NPR", IN: "INR", US: "USD", GB: "GBP", AU: "AUD",
  CA: "CAD", JP: "JPY", CN: "CNY", DE: "EUR", FR: "EUR",
  AE: "AED", SG: "SGD",
};

export const CURRENCY_META: Record<string, { symbol: string; locale: string; decimals: number }> = {
  NPR: { symbol: "Rs.", locale: "en-IN", decimals: 0 },
  INR: { symbol: "₹",   locale: "en-IN", decimals: 0 },
  USD: { symbol: "$",   locale: "en-US", decimals: 2 },
  GBP: { symbol: "£",   locale: "en-GB", decimals: 2 },
  EUR: { symbol: "€",   locale: "en-GB", decimals: 2 },
  AUD: { symbol: "A$",  locale: "en-AU", decimals: 2 },
  CAD: { symbol: "C$",  locale: "en-CA", decimals: 2 },
  JPY: { symbol: "¥",   locale: "en-US", decimals: 0 },
  CNY: { symbol: "¥",   locale: "en-US", decimals: 2 },
  AED: { symbol: "د.إ", locale: "en-US", decimals: 2 },
  SGD: { symbol: "S$",  locale: "en-SG", decimals: 2 },
};

export function currencyForCountry(countryCode?: string | null): string {
  if (!countryCode) return BASE_CURRENCY;
  return CURRENCY_BY_COUNTRY[countryCode.toUpperCase()] ?? "USD";
}

export function formatConverted(
  priceInNPR: number,
  currency: string,
  rate: number
): string {
  const meta = CURRENCY_META[currency] ?? CURRENCY_META.USD;
  const converted = priceInNPR * rate;
  return `${meta.symbol} ${converted.toLocaleString(meta.locale, {
    minimumFractionDigits: meta.decimals,
    maximumFractionDigits: meta.decimals,
    numberingSystem: "latn",
  })}`;
}
