import { useSyncExternalStore } from 'react'

export type ThemeChoice = 'system' | 'light' | 'dark'

const KEY = 'beoneofus.theme'
const EVENT = 'bou:theme'

function read(): ThemeChoice {
  try {
    const v = window.localStorage.getItem(KEY)
    return v === 'light' || v === 'dark' ? v : 'system'
  } catch {
    return 'system'
  }
}

export function applyTheme(choice: ThemeChoice): void {
  try {
    if (choice === 'system') {
      document.documentElement.removeAttribute('data-theme')
      window.localStorage.removeItem(KEY)
    } else {
      document.documentElement.setAttribute('data-theme', choice)
      window.localStorage.setItem(KEY, choice)
    }
    window.dispatchEvent(new CustomEvent(EVENT))
  } catch {
    /* ignore */
  }
}

/** Effective (resolved) theme, following the system setting when 'system'. */
export function resolvedTheme(choice: ThemeChoice): 'light' | 'dark' {
  if (choice !== 'system') return choice
  try {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  } catch {
    return 'light'
  }
}

/** Cycle order for the topbar toggle: light → dark → system → light. */
export function nextTheme(choice: ThemeChoice): ThemeChoice {
  return choice === 'light' ? 'dark' : choice === 'dark' ? 'system' : 'light'
}

export function initTheme(): void {
  const choice = read()
  if (choice === 'light' || choice === 'dark') {
    document.documentElement.setAttribute('data-theme', choice)
  }
}

function subscribe(cb: () => void) {
  window.addEventListener(EVENT, cb)
  window.addEventListener('storage', cb)
  const mq = window.matchMedia('(prefers-color-scheme: dark)')
  mq.addEventListener('change', cb)
  return () => {
    window.removeEventListener(EVENT, cb)
    window.removeEventListener('storage', cb)
    mq.removeEventListener('change', cb)
  }
}

export function useTheme(): {
  choice: ThemeChoice
  resolved: 'light' | 'dark'
  setTheme: (c: ThemeChoice) => void
  toggle: () => void
} {
  const choice = useSyncExternalStore(subscribe, read, () => 'system' as ThemeChoice)
  return {
    choice,
    resolved: resolvedTheme(choice),
    setTheme: applyTheme,
    toggle: () => applyTheme(nextTheme(choice)),
  }
}
