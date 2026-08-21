"use client";
import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import en from '../locales/en.json';
import { languageForCountry } from '../lib/locale';

type Translations = Record<string, any>;

interface TranslationCtx {
  t: (key: string, params?: Record<string, string | number>) => string;
  lang: string;
  setLang: (lang: string) => void;
  isLoading: boolean;
}

function getNested(obj: any, path: string): string | undefined {
  if (obj == null) return undefined;
  if (obj[path] !== undefined && typeof obj[path] === 'string') return obj[path];
  const parts = path.split('.');
  let cur: any = obj;
  for (const part of parts) {
    if (cur == null) return undefined;
    cur = cur[part];
  }
  return typeof cur === 'string' ? cur : undefined;
}

const TRANSLATION_VERSION = 'v9';

const TranslationContext = createContext<TranslationCtx>({
  t: (k) => k,
  lang: 'en',
  setLang: () => {},
  isLoading: false,
});

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const prefix = `${encodeURIComponent(name)}=`;
  const parts = document.cookie.split(";");
  for (const part of parts) {
    const trimmed = part.trim();
    if (trimmed.startsWith(prefix)) {
      return decodeURIComponent(trimmed.substring(prefix.length));
    }
  }
  return null;
}

export const TranslationProvider = ({ children }: { children: ReactNode }) => {
  const [lang, setLangState] = useState('en');
  const [translations, setTranslations] = useState<Translations>(en);
  const [isLoading, setIsLoading] = useState(false);

  const isValidCache = (data: Translations): boolean => {
    const sampleKeys = [
      'a11y.close',
      'dashboard.nav.dashboard',
      'notifications.admin.productAdded',
      'careersAdmin.heading',
      'checkout.coupon.enterCodeRequired',
    ];
    return sampleKeys.every(key => getNested(data, key) !== undefined);
  };

  const setLang = useCallback(async (newLang: string) => {
    setLangState(newLang);

    if (newLang === 'en') {
      setTranslations(en);
      return;
    }

    setIsLoading(true);
    try {
      let cachedVersion: string | null = null;
      let cachedData: string | null = null;
      if (typeof window !== 'undefined') {
        cachedVersion = localStorage.getItem(`tr_${newLang}_version`);
        cachedData = localStorage.getItem(`tr_${newLang}`);
      }
      if (cachedVersion === TRANSLATION_VERSION && cachedData) {
        const parsedData = JSON.parse(cachedData);
        if (isValidCache(parsedData)) {
          setTranslations(parsedData);
          return;
        }
      }

      const localeModule = await import(`../locales/${newLang}.json`);
      const localeData = localeModule.default;
      if (typeof window !== 'undefined') {
        localStorage.setItem(`tr_${newLang}`, JSON.stringify(localeData));
        localStorage.setItem(`tr_${newLang}_version`, TRANSLATION_VERSION);
      }
      setTranslations(localeData);
    } catch (err) {
      console.error('Failed to load translations, falling back to English', err);
      setTranslations(en);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const manualChoice = localStorage.getItem("himmat_lang");
    if (manualChoice) {
      setLang(manualChoice);
      return;
    }
    const country = readCookie("himmat_country");
    setLang(languageForCountry(country));
  }, [setLang]);

  // If the visitor manually changes their country elsewhere (the
  // country/currency picker in Navigation, backed by CurrencyContext), keep
  // the suggested language in sync with it — but only when they haven't
  // manually picked a language of their own, since language and country are
  // meant to be independently overridable.
  useEffect(() => {
    function handleCountryChange(e: Event) {
      if (localStorage.getItem("himmat_lang")) return;
      const detail = (e as CustomEvent<{ country?: string }>).detail;
      setLang(languageForCountry(detail?.country));
    }
    window.addEventListener("himmat:countrychange", handleCountryChange);
    return () => window.removeEventListener("himmat:countrychange", handleCountryChange);
  }, [setLang]);

  const t = useCallback(
    (key: string, params?: Record<string, string | number>) => {
      let text = getNested(translations, key) ?? getNested(en, key) ?? key;
      if (params) {
        Object.entries(params).forEach(([paramKey, paramValue]) => {
          const regex = new RegExp(`{${paramKey}}`, 'g');
          text = text.replace(regex, String(paramValue));
        });
      }
      return text;
    },
    [translations]
  );

  return (
    <TranslationContext.Provider value={{ t, lang, setLang, isLoading }}>
      {isLoading && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            height: 3,
            background: '#2d5a3d',
            zIndex: 9999,
            animation: 'shimmer 1.2s ease-in-out infinite',
          }}
        />
      )}
      {children}
    </TranslationContext.Provider>
  );
}

export const useTranslation = () => useContext(TranslationContext);
