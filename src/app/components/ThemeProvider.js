// src/app/components/ThemeProvider.js
"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";

// next-themes renders an inline <script> to prevent theme flicker.
// React 19 warns about script tags inside components.
// The warning is a false positive — the script runs correctly during SSR.
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  const originalError = console.error;
  console.error = (...args) => {
    if (typeof args[0] === 'string' && args[0].includes('Encountered a script tag while rendering React component')) {
      return;
    }
    originalError.apply(console, args);
  };
}

export function ThemeProvider({ children, ...props }) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}
