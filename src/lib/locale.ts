export const LANGUAGE_BY_COUNTRY: Record<string, string> = {
  NP: "ne",
  IN: "hi",
  JP: "ja",
  CN: "zh",
};

export function languageForCountry(countryCode?: string | null): string {
  if (!countryCode) return "en";
  return LANGUAGE_BY_COUNTRY[countryCode.toUpperCase()] ?? "en";
}
