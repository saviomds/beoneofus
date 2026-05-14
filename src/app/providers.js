"use client";

import { ThemeProvider } from "next-themes";
import { LanguageProvider } from "../lib/i18n";

export function Providers({ children }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
      <LanguageProvider>
        {children}
      </LanguageProvider>
    </ThemeProvider>
  );
}