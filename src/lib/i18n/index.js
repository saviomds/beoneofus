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

  const loadLanguage = useCallback(async (l) => {
    setIsLoading(true);
    try {
      const isEn = l === "en";
      // Optimization: Concurrent loading and explicit check to skip English fallback if already loading English
      const [targetModule, enModule] = await Promise.all([
        import(`./${l}.js`),
        !isEn ? import(`./en.js`) : Promise.resolve(null),
      ]);

      setTranslations((prev) => ({
        ...prev,
        [l]: targetModule.default,
        ...(enModule ? { en: enModule.default } : {}),
      }));
    } catch (error) {
      console.error(`Failed to load language "${l}":`, error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLanguage(lang);
  }, [lang, loadLanguage]);

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
