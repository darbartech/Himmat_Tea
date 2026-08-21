// ============================================================================
// Multi-country currency support.
//
// NPR is the ONLY currency ever stored as a price/accounting value anywhere
// in the database (Product.price, Order.total/tax/shippingCost/grandTotal,
// Coupon amounts, etc). Everything in this file is purely a *display /
// snapshot* concern: converting an NPR amount into another currency for
// showing to a visitor, or for recording what a customer saw at checkout.
//
// Do NOT add a per-currency price column anywhere — conversion always
// happens on the fly (client) or once at order-creation time (server),
// using the shared exchange-rate cache in `src/lib/exchange-rates.ts`.
// ============================================================================

export const BASE_CURRENCY = "NPR";

/** The 24 currencies the storefront can display prices in. */
export const SUPPORTED_CURRENCIES = [
  "NPR", "INR", "USD", "EUR", "GBP", "AUD", "CAD", "JPY", "CNY", "AED",
  "SGD", "NZD", "CHF", "KRW", "SAR", "QAR", "MYR", "THB", "IDR", "PHP",
  "ZAR", "TRY", "BRL", "MXN",
] as const;

export type CurrencyCode = (typeof SUPPORTED_CURRENCIES)[number];

export function isSupportedCurrency(value: unknown): value is CurrencyCode {
  return typeof value === "string" && (SUPPORTED_CURRENCIES as readonly string[]).includes(value);
}

/** Country (ISO 3166-1 alpha-2) -> default currency. Used for geo-detection. */
export const CURRENCY_BY_COUNTRY: Record<string, CurrencyCode> = {
  NP: "NPR",
  IN: "INR",
  US: "USD",
  GB: "GBP",
  AU: "AUD",
  CA: "CAD",
  JP: "JPY",
  CN: "CNY",
  // Eurozone
  DE: "EUR", FR: "EUR", ES: "EUR", IT: "EUR", NL: "EUR", IE: "EUR",
  PT: "EUR", AT: "EUR", BE: "EUR", FI: "EUR", GR: "EUR",
  AE: "AED",
  SG: "SGD",
  NZ: "NZD",
  CH: "CHF",
  KR: "KRW",
  SA: "SAR",
  QA: "QAR",
  MY: "MYR",
  TH: "THB",
  ID: "IDR",
  PH: "PHP",
  ZA: "ZAR",
  TR: "TRY",
  BR: "BRL",
  MX: "MXN",
};

/** Country selector shown in the UI — one representative country per supported currency. */
export const COUNTRY_LIST: { code: string; name: string; currency: CurrencyCode }[] = [
  { code: "NP", name: "Nepal", currency: "NPR" },
  { code: "IN", name: "India", currency: "INR" },
  { code: "US", name: "United States", currency: "USD" },
  { code: "GB", name: "United Kingdom", currency: "GBP" },
  { code: "DE", name: "Germany (EUR)", currency: "EUR" },
  { code: "AU", name: "Australia", currency: "AUD" },
  { code: "CA", name: "Canada", currency: "CAD" },
  { code: "JP", name: "Japan", currency: "JPY" },
  { code: "CN", name: "China", currency: "CNY" },
  { code: "AE", name: "United Arab Emirates", currency: "AED" },
  { code: "SG", name: "Singapore", currency: "SGD" },
  { code: "NZ", name: "New Zealand", currency: "NZD" },
  { code: "CH", name: "Switzerland", currency: "CHF" },
  { code: "KR", name: "South Korea", currency: "KRW" },
  { code: "SA", name: "Saudi Arabia", currency: "SAR" },
  { code: "QA", name: "Qatar", currency: "QAR" },
  { code: "MY", name: "Malaysia", currency: "MYR" },
  { code: "TH", name: "Thailand", currency: "THB" },
  { code: "ID", name: "Indonesia", currency: "IDR" },
  { code: "PH", name: "Philippines", currency: "PHP" },
  { code: "ZA", name: "South Africa", currency: "ZAR" },
  { code: "TR", name: "Turkey", currency: "TRY" },
  { code: "BR", name: "Brazil", currency: "BRL" },
  { code: "MX", name: "Mexico", currency: "MXN" },
];

/** Display name shown next to a currency code in pickers. */
export const CURRENCY_NAMES: Record<CurrencyCode, string> = {
  NPR: "Nepalese Rupee", INR: "Indian Rupee", USD: "US Dollar", EUR: "Euro",
  GBP: "British Pound", AUD: "Australian Dollar", CAD: "Canadian Dollar",
  JPY: "Japanese Yen", CNY: "Chinese Yuan", AED: "UAE Dirham",
  SGD: "Singapore Dollar", NZD: "New Zealand Dollar", CHF: "Swiss Franc",
  KRW: "South Korean Won", SAR: "Saudi Riyal", QAR: "Qatari Riyal",
  MYR: "Malaysian Ringgit", THB: "Thai Baht", IDR: "Indonesian Rupiah",
  PHP: "Philippine Peso", ZAR: "South African Rand", TRY: "Turkish Lira",
  BRL: "Brazilian Real", MXN: "Mexican Peso",
};

/**
 * Locale used purely for number-grouping style when formatting a currency
 * (comma vs period placement etc). Intl.NumberFormat derives the correct
 * symbol and, unless overridden below, the correct number of decimal
 * places straight from the ISO 4217 `currency` code itself.
 */
const CURRENCY_LOCALE: Record<CurrencyCode, string> = {
  NPR: "en-IN", INR: "en-IN", USD: "en-US", EUR: "en-IE", GBP: "en-GB",
  AUD: "en-AU", CAD: "en-CA", JPY: "ja-JP", CNY: "zh-CN", AED: "ar-AE",
  SGD: "en-SG", NZD: "en-NZ", CHF: "de-CH", KRW: "ko-KR", SAR: "ar-SA",
  QAR: "ar-QA", MYR: "ms-MY", THB: "th-TH", IDR: "id-ID", PHP: "en-PH",
  ZAR: "en-ZA", TRY: "tr-TR", BRL: "pt-BR", MXN: "es-MX",
};

/**
 * Deliberate deviations from the ISO 4217 default decimal precision.
 * NPR and INR are shown as whole units store-wide (product prices are
 * already whole-rupee integers) — everything else uses whatever decimal
 * rule Intl.NumberFormat derives for that currency (e.g. 0 for JPY/KRW,
 * 2 for USD/EUR/GBP...).
 */
const DECIMALS_OVERRIDE: Partial<Record<CurrencyCode, number>> = {
  NPR: 0,
  INR: 0,
};

export function currencyForCountry(countryCode?: string | null): CurrencyCode {
  if (!countryCode) return BASE_CURRENCY;
  return CURRENCY_BY_COUNTRY[countryCode.toUpperCase()] ?? "USD";
}

/**
 * Format a raw amount (already in `currency`) using Intl.NumberFormat so we
 * always get the correct symbol placement, grouping, and decimal rules for
 * that currency.
 */
export function formatCurrency(amount: number, currency: string): string {
  const code = isSupportedCurrency(currency) ? currency : BASE_CURRENCY;
  const locale = CURRENCY_LOCALE[code] ?? "en-US";
  const decimals = DECIMALS_OVERRIDE[code];

  const options: Intl.NumberFormatOptions = {
    style: "currency",
    currency: code,
    currencyDisplay: "symbol",
  };
  if (decimals !== undefined) {
    options.minimumFractionDigits = decimals;
    options.maximumFractionDigits = decimals;
  }

  try {
    return new Intl.NumberFormat(locale, options).format(amount);
  } catch {
    // Extremely defensive fallback — should not happen for any code in
    // SUPPORTED_CURRENCIES, all of which are valid ISO 4217 codes.
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);
  }
}

/** Round `amount` to the decimal precision `currency` is displayed with. */
export function roundForCurrency(amount: number, currency: string): number {
  const code = isSupportedCurrency(currency) ? currency : BASE_CURRENCY;
  const decimals = DECIMALS_OVERRIDE[code] ?? 2;
  const factor = 10 ** decimals;
  return Math.round(amount * factor) / factor;
}

/** Convert + format an NPR amount into `currency` at the given `rate`. */
export function formatConverted(priceInNPR: number, currency: string, rate: number): string {
  const converted = roundForCurrency(priceInNPR * rate, currency);
  return formatCurrency(converted, currency);
}

/**
 * Secondary price line, e.g. "USD 11.25 ≈ NPR 1,500" — returns null when the
 * display currency already *is* the base currency (nothing to compare to).
 */
export function formatSecondary(
  priceInNPR: number,
  currency: string,
  rate: number
): string | null {
  if (!isSupportedCurrency(currency) || currency === BASE_CURRENCY) return null;
  return `${formatConverted(priceInNPR, currency, rate)} ≈ ${formatCurrency(priceInNPR, BASE_CURRENCY)}`;
}
