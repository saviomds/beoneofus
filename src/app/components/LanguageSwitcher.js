"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Check, ChevronDown, Languages } from "lucide-react";
import { useLanguage } from "../../lib/i18n";

/* Supported platform languages. Extensible: add an entry (and a matching
   src/lib/i18n/<code>.js dictionary) and it appears here automatically. */
export const LANGUAGES = [
  { code: "en", label: "English",  native: "English",  flag: "🇬🇧" },
  { code: "fr", label: "French",   native: "Français", flag: "🇫🇷" },
];

/**
 * Professional, accessible language selector that drives the platform-wide
 * LanguageProvider. Renders a compact trigger (flag + native name) and a
 * portaled, animated dropdown so it is never clipped by header overflow.
 */
export default function LanguageSwitcher({ compact = false }) {
  const { lang, setLang } = useLanguage();
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, right: 0 });
  const btnRef = useRef(null);
  const menuRef = useRef(null);

  const current = LANGUAGES.find((l) => l.code === lang) || LANGUAGES[0];

  // Position the portaled menu under the trigger, right-aligned.
  const place = () => {
    const el = btnRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setCoords({ top: r.bottom + 8, right: Math.max(8, window.innerWidth - r.right) });
  };

  useEffect(() => {
    if (!open) return;
    place();
    const onDoc = (e) => {
      if (btnRef.current?.contains(e.target) || menuRef.current?.contains(e.target)) return;
      setOpen(false);
    };
    const onKey = (e) => { if (e.key === "Escape") setOpen(false); };
    const onScroll = () => place();
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", onScroll);
    window.addEventListener("scroll", onScroll, true);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onScroll);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [open]);

  const choose = (code) => {
    if (code !== lang) setLang(code);
    setOpen(false);
  };

  return (
    <>
      <button
        ref={btnRef}
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Change language"
        className={`flex items-center gap-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-blue-600 dark:hover:text-blue-400 transition-all ${
          compact ? "px-2 py-2" : "px-2.5 py-2"
        }`}
        title="Language"
      >
        <span className="text-[15px] leading-none" aria-hidden>{current.flag}</span>
        {!compact && (
          <span className="text-[11px] font-black uppercase tracking-wider">{current.code}</span>
        )}
        <ChevronDown size={13} className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>

      {typeof document !== "undefined" && createPortal(
        <AnimatePresence>
          {open && (
            <motion.div
              ref={menuRef}
              role="menu"
              aria-label="Select language"
              initial={{ opacity: 0, y: -6, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.97 }}
              transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
              style={{ position: "fixed", top: coords.top, right: coords.right, zIndex: 9999 }}
              className="w-60 origin-top-right rounded-2xl border border-gray-200 dark:border-white/10 bg-white/95 dark:bg-gray-950/95 backdrop-blur-xl shadow-2xl overflow-hidden"
            >
              <div className="flex items-center gap-2 px-4 pt-3.5 pb-2.5 border-b border-gray-100 dark:border-white/[0.06]">
                <span className="w-6 h-6 rounded-lg bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <Languages size={13} />
                </span>
                <div className="min-w-0">
                  <p className="text-[12px] font-black text-gray-900 dark:text-white leading-none">Language</p>
                  <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">Applies across BeOneOfUs</p>
                </div>
              </div>

              <div className="p-1.5">
                {LANGUAGES.map((l) => {
                  const active = l.code === lang;
                  return (
                    <button
                      key={l.code}
                      role="menuitemradio"
                      aria-checked={active}
                      onClick={() => choose(l.code)}
                      className={`w-full flex items-center gap-3 px-2.5 py-2 rounded-xl text-left transition-colors ${
                        active
                          ? "bg-blue-50 dark:bg-blue-500/10"
                          : "hover:bg-gray-50 dark:hover:bg-white/[0.04]"
                      }`}
                    >
                      <span className="text-xl leading-none shrink-0" aria-hidden>{l.flag}</span>
                      <span className="min-w-0 flex-1">
                        <span className={`block text-[13px] font-bold truncate ${active ? "text-blue-700 dark:text-blue-300" : "text-gray-900 dark:text-gray-100"}`}>
                          {l.native}
                        </span>
                        <span className="block text-[10px] text-gray-400 dark:text-gray-500 truncate">{l.label}</span>
                      </span>
                      {active && <Check size={15} className="text-blue-600 dark:text-blue-400 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  );
}
