"use client";

import Link from "next/link";
import { useTheme } from "next-themes";
import { Sun, Moon } from "lucide-react";
import Button from "./ui/Button";

const NAV = [
  ["Marketplace", "/market"],
  ["Opportunities", "/opportunities"],
  ["Community", "/community"],
  ["Pricing", "/dash/premium"],
];

// Shared sticky top bar for the marketplace routes: brand, nav, theme toggle.
export default function MarketTopBar() {
  const { setTheme, resolvedTheme } = useTheme();
  const toggle = () => setTheme(resolvedTheme === "dark" ? "light" : "dark");

  return (
    <header className="sticky top-0 z-40 border-b border-mkt-border/70 bg-mkt-bg/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-5 py-3">
        <Link href="/dash" className="flex items-center gap-2 rounded-lg mkt-focus" aria-label="Back to BeOneOfUs">
          <span className="grid h-8 w-8 place-items-center rounded-xl bg-gradient-to-br from-mkt-primary to-mkt-secondary text-sm font-black text-white">B</span>
          <span className="text-[15px] font-black text-mkt-text">BeOneOfUs <span className="font-medium text-mkt-muted">Market</span></span>
        </Link>
        <nav className="hidden items-center gap-1 md:flex">
          {NAV.map(([label, href]) => (
            <Link key={label} href={href} className="rounded-lg px-3 py-1.5 text-[13px] font-medium text-mkt-muted transition hover:bg-mkt-bg-2 hover:text-mkt-text mkt-focus">{label}</Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggle}
            aria-label="Toggle light or dark mode"
            className="grid h-9 w-9 place-items-center rounded-xl border border-mkt-border bg-mkt-card text-mkt-muted transition hover:text-mkt-text mkt-focus"
          >
            <Moon size={16} className="dark:hidden" />
            <Sun size={16} className="hidden dark:block" />
          </button>
          <Link href="/dash" className="hidden sm:block">
            <Button size="sm" variant="secondary">Open app</Button>
          </Link>
        </div>
      </div>
    </header>
  );
}
