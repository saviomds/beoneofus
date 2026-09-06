// Tiny namespaced localStorage JSON store. This is the one place that talks to
// the browser's persistence — every mock service reads/writes through here, so
// swapping in a real API later means replacing this file's internals, not
// touching every service.

const NAMESPACE = 'boa_study_work_v1'

function key(name: string): string {
  return `${NAMESPACE}:${name}`
}

export function readJSON<T>(name: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback
  try {
    const raw = window.localStorage.getItem(key(name))
    if (!raw) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

export function writeJSON<T>(name: string, value: T): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(key(name), JSON.stringify(value))
  } catch {
    // storage full or unavailable (private browsing) — fail silently, in-memory
    // state in the React context still works for the current session.
  }
}

export function clearAll(): void {
  if (typeof window === 'undefined') return
  try {
    Object.keys(window.localStorage)
      .filter((k) => k.startsWith(`${NAMESPACE}:`))
      .forEach((k) => window.localStorage.removeItem(k))
  } catch {
    // ignore
  }
}

export function newId(prefix: string): string {
  const rand = typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID().slice(0, 8)
    : Math.random().toString(36).slice(2, 10)
  return `${prefix}-${rand}`
}
