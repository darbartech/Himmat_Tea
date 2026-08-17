"use client";
import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import en from '../locales/en.json';
import { languageForCountry } from '../lib/locale';

type Translations = Record<string, string>;

interface TranslationCtx {
  t: (key: string, params?: Record<string, string | number>) => string;
  lang: string;
  setLang: (lang: string) => void;
  isLoading: boolean;
}

const TRANSLATION_VERSION = 'v7';

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
    const allEnglishKeys = Object.keys(en);
    return allEnglishKeys.every(key => data[key] !== undefined);
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

  const t = useCallback(
    (key: string, params?: Record<string, string | number>) => {
      let text = translations[key] ?? en[key as keyof typeof en] ?? key;
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
