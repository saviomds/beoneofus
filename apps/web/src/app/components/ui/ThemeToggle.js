'use client';

// Consolidated theme toggle (was reimplemented in Header, console pages, quick-start…).
import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { Sun, Moon } from 'lucide-react';
import { cn } from './cn';

export function ThemeToggle({ className = '', size = 15 }) {
  const { theme, setTheme, systemTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    // Mount flag gates the hydration-sensitive icon; must flip post-mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  const resolved = theme === 'system' ? systemTheme : theme;
  const isDark = resolved === 'dark';

  return (
    <button
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
      title="Toggle theme"
      className={cn(
        'inline-flex items-center justify-center w-9 h-9 rounded-v2-field border border-v2-hairline-2 bg-v2-surface text-v2-ink-muted hover:bg-v2-surface-2 hover:text-v2-ink transition-colors',
        className,
      )}
    >
      {mounted ? (isDark ? <Sun size={size} /> : <Moon size={size} />) : <span style={{ width: size, height: size }} />}
    </button>
  );
}

export default ThemeToggle;
