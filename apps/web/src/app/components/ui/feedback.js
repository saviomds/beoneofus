'use client';

// ── BeOneOfUs 2.0 UI kit — feedback (toast / skeleton / empty / error) ─────

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle2, AlertTriangle, Info, XCircle, X } from 'lucide-react';
import { cn } from './cn';

/* ── Toast ───────────────────────────────────────────────────────────────── */
const ToastCtx = createContext(null);

const TOAST_META = {
  success: { icon: CheckCircle2, accent: 'text-v2-positive', bar: 'bg-v2-positive' },
  error: { icon: XCircle, accent: 'text-v2-critical', bar: 'bg-v2-critical' },
  warning: { icon: AlertTriangle, accent: 'text-v2-caution', bar: 'bg-v2-caution' },
  info: { icon: Info, accent: 'text-v2-info', bar: 'bg-v2-info' },
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const idRef = useRef(0);

  const dismiss = useCallback((id) => setToasts((t) => t.filter((x) => x.id !== id)), []);

  const toast = useCallback((msg, opts = {}) => {
    const id = ++idRef.current;
    const entry = {
      id,
      message: typeof msg === 'string' ? msg : msg?.message || '',
      title: msg?.title || opts.title,
      type: msg?.type || opts.type || 'info',
      duration: msg?.duration ?? opts.duration ?? 4000,
    };
    setToasts((t) => [...t, entry]);
    if (entry.duration > 0) setTimeout(() => dismiss(id), entry.duration);
    return id;
  }, [dismiss]);

  const api = {
    toast,
    success: (m, o) => toast(m, { ...o, type: 'success' }),
    error: (m, o) => toast(m, { ...o, type: 'error' }),
    warning: (m, o) => toast(m, { ...o, type: 'warning' }),
    info: (m, o) => toast(m, { ...o, type: 'info' }),
    dismiss,
  };

  return (
    <ToastCtx.Provider value={api}>
      {children}
      {typeof document !== 'undefined' && createPortal(
        <div className="fixed z-[400] bottom-4 right-4 left-4 sm:left-auto flex flex-col gap-2 items-center sm:items-end pointer-events-none">
          {toasts.map((t) => {
            const M = TOAST_META[t.type] || TOAST_META.info;
            const Icon = M.icon;
            return (
              <div
                key={t.id}
                role="status"
                className="pointer-events-auto relative w-full sm:w-80 overflow-hidden rounded-v2-card border border-v2-hairline bg-v2-surface shadow-v2-raised animate-in slide-in-from-bottom-4 fade-in"
              >
                <span className={cn('absolute left-0 top-0 bottom-0 w-0.5', M.bar)} />
                <div className="flex items-start gap-2.5 pl-4 pr-3 py-3">
                  <Icon size={16} className={cn('mt-0.5 shrink-0', M.accent)} />
                  <div className="min-w-0 flex-1">
                    {t.title && <p className="text-[13px] font-semibold text-v2-ink">{t.title}</p>}
                    {t.message && <p className="text-[13px] text-v2-ink-muted leading-snug">{t.message}</p>}
                  </div>
                  <button onClick={() => dismiss(t.id)} aria-label="Dismiss" className="shrink-0 -mr-1 p-1 rounded text-v2-ink-faint hover:text-v2-ink">
                    <X size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>,
        document.body,
      )}
    </ToastCtx.Provider>
  );
}

// Safe to call outside a provider — returns a console-logging fallback so a
// redesigned component never crashes if its subtree isn't wrapped yet.
export function useToast() {
  const ctx = useContext(ToastCtx);
  if (ctx) return ctx;
  const noop = (m) => { if (typeof m === 'string') console.info('[toast]', m); };
  return { toast: noop, success: noop, error: noop, warning: noop, info: noop, dismiss: () => {} };
}

/* ── Skeleton ────────────────────────────────────────────────────────────── */
export function Skeleton({ className = '', ...props }) {
  return <div className={cn('animate-pulse rounded-md bg-v2-surface-3', className)} {...props} />;
}

export function SkeletonText({ lines = 3, className = '' }) {
  return (
    <div className={cn('space-y-2', className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className={cn('h-3', i === lines - 1 ? 'w-2/3' : 'w-full')} />
      ))}
    </div>
  );
}

export function CardSkeleton({ className = '' }) {
  return (
    <div className={cn('rounded-v2-card border border-v2-hairline bg-v2-surface p-4 space-y-3', className)}>
      <div className="flex items-center gap-3">
        <Skeleton className="w-10 h-10 rounded-full" />
        <div className="space-y-2 flex-1">
          <Skeleton className="h-3 w-32" />
          <Skeleton className="h-2.5 w-20" />
        </div>
      </div>
      <SkeletonText lines={2} />
    </div>
  );
}

export function TableSkeleton({ rows = 6, cols = 4, className = '' }) {
  return (
    <div className={cn('rounded-v2-card border border-v2-hairline overflow-hidden', className)}>
      <div className="flex gap-4 px-4 py-2.5 border-b border-v2-hairline bg-v2-surface-2">
        {Array.from({ length: cols }).map((_, i) => <Skeleton key={i} className="h-2.5 flex-1" />)}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex gap-4 px-4 py-3.5 border-b border-v2-hairline last:border-0">
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton key={c} className={cn('h-3', c === 0 ? 'flex-[1.5]' : 'flex-1')} />
          ))}
        </div>
      ))}
    </div>
  );
}

/* ── EmptyState ──────────────────────────────────────────────────────────── */
export function EmptyState({ icon: Icon, title, description, action, className = '' }) {
  return (
    <div className={cn('flex flex-col items-center justify-center text-center px-6 py-14', className)}>
      {Icon && (
        <div className="w-11 h-11 rounded-v2-card bg-v2-surface-2 border border-v2-hairline flex items-center justify-center text-v2-ink-faint mb-3">
          <Icon size={20} />
        </div>
      )}
      {title && <h3 className="text-sm font-semibold text-v2-ink">{title}</h3>}
      {description && <p className="text-[13px] text-v2-ink-faint mt-1 max-w-sm">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

/* ── ErrorState ──────────────────────────────────────────────────────────── */
export function ErrorState({ title = 'Something went wrong', description, onRetry, className = '' }) {
  return (
    <div className={cn('flex flex-col items-center justify-center text-center px-6 py-14', className)}>
      <div className="w-11 h-11 rounded-v2-card bg-v2-critical-soft flex items-center justify-center text-v2-critical mb-3">
        <AlertTriangle size={20} />
      </div>
      <h3 className="text-sm font-semibold text-v2-ink">{title}</h3>
      {description && <p className="text-[13px] text-v2-ink-faint mt-1 max-w-sm">{description}</p>}
      {onRetry && (
        <button onClick={onRetry} className="mt-4 h-9 px-4 rounded-v2-field border border-v2-hairline-2 bg-v2-surface text-sm font-medium text-v2-ink hover:bg-v2-surface-2 transition-colors">
          Try again
        </button>
      )}
    </div>
  );
}

/* ── LoadingState ────────────────────────────────────────────────────────── */
export function LoadingState({ label = 'Loading…', className = '' }) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-3 px-6 py-14 text-v2-ink-faint', className)}>
      <span className="w-6 h-6 rounded-full border-2 border-v2-hairline-2 border-t-brand-500 animate-spin" />
      <p className="text-[13px]">{label}</p>
    </div>
  );
}
