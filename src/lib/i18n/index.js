"use client";

import { createContext, useContext, useState, useEffect, useCallback } from "react";

const LanguageContext = createContext({
  lang: "en",
  setLang: () => {},
  t: (key, params) => key,
  fd: (date, options) => date.toString(),
  fc: (amount, currency, options) => amount.toString(),
  isLoading: true,
});

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState("en");
  const [translations, setTranslations] = useState({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem("beoneofus_lang");
    if (stored === "fr" || stored === "en") {
      setLangState(stored);
      document.documentElement.lang = stored;
    } else {
      const browser = navigator.language?.split("-")[0];
      if (browser === "fr" || browser === "en") {
        setLangState(browser);
        document.documentElement.lang = browser;
      }
    }
  }, []);

  const loadTranslations = useCallback(async (l) => {
    if (translations[l]) return;
    setIsLoading(true);
    try {
      // Dynamically import the language file
      const module = await import(`./${l}.js`);
      setTranslations((prev) => ({ ...prev, [l]: module.default }));
    } catch (error) {
      console.error(`Failed to load translations for ${l}:`, error);
    } finally {
      setIsLoading(false);
    }
  }, [translations]);

  useEffect(() => {
    loadTranslations(lang);
  }, [lang, loadTranslations]);

  const setLang = useCallback((l) => {
    setLangState(l);
    localStorage.setItem("beoneofus_lang", l);
    document.documentElement.lang = l;
  }, []);

  const fd = useCallback((date, options = {}) => {
    try {
      return new Intl.DateTimeFormat(lang, options).format(new Date(date));
    } catch (e) {
      return date.toString();
    }
  }, [lang]);

  const fc = useCallback((amount, currency = "USD", options = {}) => {
    return new Intl.NumberFormat(lang, { style: "currency", currency, ...options }).format(amount);
  }, [lang]);

  const t = useCallback((key, params = {}) => {
    const isPlural = params.count !== undefined && params.count !== 1;
    const searchKey = isPlural ? `${key}_plural` : key;
    const keys = searchKey.split(".");

    const getTranslation = (locale) => {
      let val = translations[locale];
      if (!val) return null;
      for (const k of keys) {
        if (val == null || typeof val !== "object") return null;
        val = val[k];
      }
      
      if (typeof val !== "string") return null;

      // Replace {{variable}} with values from params
      return val.replace(/\{\{(\w+)\}\}/g, (_, k) => params[k] ?? _);
    };

    const result = getTranslation(lang) || getTranslation("en");
    return result || key;
  }, [lang, translations]);

  return (
    <LanguageContext.Provider value={{ lang, setLang, t, fd, fc, isLoading }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
