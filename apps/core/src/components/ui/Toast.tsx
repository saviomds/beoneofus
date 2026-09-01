import { createContext, useCallback, useContext, useState } from 'react'
import type { ReactNode } from 'react'

type ToastKind = 'info' | 'success' | 'error'
interface ToastItem {
  id: number
  message: string
  kind: ToastKind
}

const ToastContext = createContext<{ push: (message: string, kind?: ToastKind) => void } | null>(null)

let seq = 0

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])

  const push = useCallback((message: string, kind: ToastKind = 'info') => {
    const id = ++seq
    setItems((cur) => [...cur, { id, message, kind }])
    window.setTimeout(() => setItems((cur) => cur.filter((t) => t.id !== id)), 4200)
  }, [])

  return (
    <ToastContext.Provider value={{ push }}>
      {children}
      <div className="toast-wrap" aria-live="polite">
        {items.map((t) => (
          <div key={t.id} className={`toast ${t.kind}`}>
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}
