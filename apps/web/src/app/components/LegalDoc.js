"use client";

import { useEffect, useRef, useState } from "react";
import { ListTree, Printer, ArrowUp, ChevronDown } from "lucide-react";

/**
 * Shared chrome for the legal pages (Privacy Policy, Terms of Service):
 * a sticky, scroll-spied table of contents on desktop, a collapsible jump
 * menu on mobile, a print button, and a back-to-top affordance. The actual
 * legal text is passed in as `children` and rendered by the server — this
 * component only adds interactivity around it.
 */
export default function LegalDoc({ sections, children }) {
  const [activeId, setActiveId] = useState(sections[0]?.id);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [mobileTocOpen, setMobileTocOpen] = useState(false);
  const observerRef = useRef(null);

  useEffect(() => {
    const headings = sections
      .map((s) => document.getElementById(s.id))
      .filter(Boolean);
    if (!headings.length) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting);
        if (visible.length > 0) {
          const topMost = visible.sort(
            (a, b) => a.boundingClientRect.top - b.boundingClientRect.top
          )[0];
          setActiveId(topMost.target.id);
        }
      },
      { rootMargin: "-15% 0px -70% 0px", threshold: 0 }
    );
    headings.forEach((h) => observerRef.current.observe(h));

    const onScroll = () => setShowBackToTop(window.scrollY > 600);
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      observerRef.current?.disconnect();
      window.removeEventListener("scroll", onScroll);
    };
  }, [sections]);

  function jumpTo(id) {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
    setMobileTocOpen(false);
  }

  return (
    <div className="lg:grid lg:grid-cols-[240px_1fr] lg:gap-12">
      {/* Desktop sidebar TOC */}
      <nav
        aria-label="Table of contents"
        className="hidden lg:block sticky top-20 self-start max-h-[calc(100vh-6rem)] overflow-y-auto pr-2"
      >
        <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-3">
          <ListTree className="w-3.5 h-3.5" /> On this page
        </p>
        <ul className="space-y-0.5 border-l border-gray-100 dark:border-gray-800">
          {sections.map((s) => (
            <li key={s.id}>
              <a
                href={`#${s.id}`}
                onClick={(e) => {
                  e.preventDefault();
                  jumpTo(s.id);
                }}
                className={`block -ml-px pl-3 py-1 text-[13px] border-l-2 transition-colors ${
                  activeId === s.id
                    ? "border-blue-600 text-blue-600 dark:text-blue-400 font-semibold"
                    : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:border-gray-300 dark:hover:border-gray-600"
                }`}
              >
                {s.label}
              </a>
            </li>
          ))}
        </ul>
        <button
          type="button"
          onClick={() => window.print()}
          className="mt-6 flex items-center gap-1.5 text-[13px] font-semibold text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
        >
          <Printer className="w-3.5 h-3.5" /> Print / Save PDF
        </button>
      </nav>

      {/* Mobile jump menu */}
      <div className="lg:hidden mb-8 print:hidden">
        <button
          type="button"
          onClick={() => setMobileTocOpen((v) => !v)}
          className="w-full flex items-center justify-between gap-2 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 px-4 py-3 text-sm font-semibold text-gray-700 dark:text-gray-200"
          aria-expanded={mobileTocOpen}
        >
          <span className="flex items-center gap-2">
            <ListTree className="w-4 h-4" /> Jump to section
          </span>
          <ChevronDown className={`w-4 h-4 transition-transform ${mobileTocOpen ? "rotate-180" : ""}`} />
        </button>
        {mobileTocOpen && (
          <ul className="mt-2 rounded-xl border border-gray-200 dark:border-gray-800 divide-y divide-gray-100 dark:divide-gray-800 overflow-hidden">
            {sections.map((s) => (
              <li key={s.id}>
                <a
                  href={`#${s.id}`}
                  onClick={(e) => {
                    e.preventDefault();
                    jumpTo(s.id);
                  }}
                  className="block px-4 py-2.5 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-900"
                >
                  {s.label}
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="min-w-0">{children}</div>

      {showBackToTop && (
        <button
          type="button"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          aria-label="Back to top"
          className="print:hidden fixed bottom-6 right-6 z-20 w-10 h-10 rounded-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 shadow-lg flex items-center justify-center hover:opacity-90 transition-opacity"
        >
          <ArrowUp className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
