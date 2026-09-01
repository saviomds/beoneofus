"use client";
import { useState, useEffect } from "react";
import { Quote, RefreshCw, Loader2, Heart, Copy, Check } from "lucide-react";
import { supabase } from "../../../supabaseClient";
import { Toast, useToast } from "./shared";

const QUOTE_TAGS = ["All", "Coding", "Motivation", "Entrepreneurship", "Innovation", "Learning"];

const QuoteTool = () => {
  const [activeTag, setActiveTag] = useState("All");
  const [featuredIdx, setFeaturedIdx] = useState(() => Math.floor(Math.random() * QUOTES.length));

  const filtered = activeTag === "All" ? QUOTES : QUOTES.filter(q => q.tag === activeTag);
  const featured = QUOTES[featuredIdx];

  const shuffle = () => {
    let next;
    do { next = Math.floor(Math.random() * QUOTES.length); } while (next === featuredIdx && QUOTES.length > 1);
    setFeaturedIdx(next);
  };

  return (
    <div className="p-5 space-y-5">
      {/* Featured quote */}
      <div className="relative overflow-hidden rounded-2xl border border-violet-200 dark:border-violet-500/20 bg-gradient-to-br from-violet-50 via-purple-50 to-indigo-50 dark:from-violet-500/10 dark:via-violet-500/5 dark:to-transparent p-6">
        <Quote size={36} className="text-violet-300 dark:text-violet-500/30 mb-3" />
        <p className="text-base font-bold text-gray-900 dark:text-white leading-relaxed">
          {featured.text}
        </p>
        <p className="text-sm text-violet-600 dark:text-violet-400 font-bold mt-3">— {featured.author}</p>
        <div className="flex items-center justify-between mt-4">
          <span className="text-[10px] font-black uppercase tracking-widest text-violet-400 dark:text-violet-500/60 px-2 py-0.5 bg-violet-100 dark:bg-violet-500/10 rounded-lg">
            {featured.tag}
          </span>
          <button
            onClick={shuffle}
            className="flex items-center gap-1.5 text-xs font-bold text-violet-500 hover:text-violet-700 dark:hover:text-violet-300 transition-colors"
          >
            <RefreshCw size={12} /> New Quote
          </button>
        </div>
        <div className="absolute -bottom-10 -right-10 w-32 h-32 rounded-full bg-violet-200/30 dark:bg-violet-500/5 blur-2xl" />
      </div>

      {/* Category filter */}
      <div className="flex gap-2 flex-wrap">
        {QUOTE_TAGS.map(tag => (
          <button
            key={tag}
            onClick={() => setActiveTag(tag)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
              activeTag === tag
                ? "bg-violet-600 text-white border-violet-600 shadow-sm shadow-violet-500/20"
                : "bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-violet-300 dark:hover:border-violet-500/40"
            }`}
          >
            {tag}
          </button>
        ))}
      </div>

      {/* Quote list */}
      <div className="grid gap-3">
        {filtered.map((q, i) => (
          <div
            key={i}
            className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 hover:border-violet-200 dark:hover:border-violet-500/20 transition-colors"
          >
            <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">&quot;{q.text}&quot;</p>
            <div className="flex items-center justify-between mt-2">
              <p className="text-xs font-bold text-gray-400 dark:text-gray-600">— {q.author}</p>
              <span className="text-[10px] font-black uppercase tracking-wide text-gray-400 dark:text-gray-700">{q.tag}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── Tool Registry ────────────────────────────────────────────────────────────


export default QuoteTool;
