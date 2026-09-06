'use client';

// ── BeOneOfUs 2.0 UI kit — overlays (Modal / Drawer / Menu / Tooltip) ──────

import { useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from './cn';
import { Button } from './primitives';

/* Shared: lock scroll + close on ESC while an overlay is open. */
function useOverlay(open, onClose) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);
}

function useFocusTrap(open) {
  const ref = useRef(null);
  useEffect(() => {
    if (!open || !ref.current) return;
    const node = ref.current;
    const prevFocus = document.activeElement;
    const focusable = () =>
      [...node.querySelectorAll('a[href],button:not([disabled]),textarea,input,select,[tabindex]:not([tabindex="-1"])')]
        .filter((el) => el.offsetParent !== null);
    const first = focusable()[0];
    (first || node).focus?.();
    const onKey = (e) => {
      if (e.key !== 'Tab') return;
      const items = focusable();
      if (!items.length) return;
      const idx = items.indexOf(document.activeElement);
      if (e.shiftKey && (idx <= 0)) { e.preventDefault(); items[items.length - 1].focus(); }
      else if (!e.shiftKey && idx === items.length - 1) { e.preventDefault(); items[0].focus(); }
    };
    node.addEventListener('keydown', onKey);
    return () => {
      node.removeEventListener('keydown', onKey);
      prevFocus?.focus?.();
    };
  }, [open]);
  return ref;
}

/* ── Modal ───────────────────────────────────────────────────────────────── */
const MODAL_SIZES = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' };

export function Modal({ open, onClose, title, description, size = 'md', footer, className = '', children }) {
  useOverlay(open, onClose);
  const trapRef = useFocusTrap(open);
  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-start justify-center overflow-y-auto p-4 sm:p-6">
      <div className="fixed inset-0 bg-v2-ink/40 backdrop-blur-[2px] animate-in fade-in" onClick={onClose} aria-hidden />
      <div
        ref={trapRef}
        role="dialog"
        aria-modal="true"
        aria-label={title || undefined}
        tabIndex={-1}
        className={cn(
          'relative z-10 w-full mt-[6vh] mb-8 bg-v2-surface border border-v2-hairline rounded-v2-lg shadow-v2-overlay',
          'animate-in fade-in zoom-in-95 slide-in-from-bottom-2 outline-none',
          MODAL_SIZES[size] || MODAL_SIZES.md,
          className,
        )}
      >
        {(title || onClose) && (
          <div className="flex items-start justify-between gap-4 px-5 py-4 border-b border-v2-hairline">
            <div className="min-w-0">
              {title && <h2 className="text-base font-semibold text-v2-ink">{title}</h2>}
              {description && <p className="text-[13px] text-v2-ink-faint mt-1">{description}</p>}
            </div>
            {onClose && (
              <button
                onClick={onClose}
                aria-label="Close"
                className="shrink-0 -mr-1 -mt-1 p-1.5 rounded-v2-field text-v2-ink-faint hover:text-v2-ink hover:bg-v2-surface-2"
              >
                <X size={17} />
              </button>
            )}
          </div>
        )}
        <div className="px-5 py-4">{children}</div>
        {footer && (
          <div className="flex items-center justify-end gap-2 px-5 py-3.5 border-t border-v2-hairline bg-v2-surface-2/40 rounded-b-v2-lg">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}

/* ── ConfirmDialog ───────────────────────────────────────────────────────── */
export function ConfirmDialog({
  open, onClose, onConfirm, title = 'Are you sure?', message,
  confirmLabel = 'Confirm', cancelLabel = 'Cancel', destructive = false, loading = false,
}) {
  return (
    <Modal
      open={open}
      onClose={loading ? undefined : onClose}
      title={title}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={loading}>{cancelLabel}</Button>
          <Button variant={destructive ? 'danger' : 'primary'} onClick={onConfirm} loading={loading}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      {message && <p className="text-sm text-v2-ink-muted leading-relaxed">{message}</p>}
    </Modal>
  );
}

/* ── Drawer (side sheet) ─────────────────────────────────────────────────── */
export function Drawer({ open, onClose, side = 'right', title, width = 'max-w-md', className = '', children }) {
  useOverlay(open, onClose);
  const trapRef = useFocusTrap(open);
  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-[200]">
      <div className="absolute inset-0 bg-v2-ink/40 backdrop-blur-[2px] animate-in fade-in" onClick={onClose} aria-hidden />
      <div
        ref={trapRef}
        role="dialog"
        aria-modal="true"
        aria-label={title || undefined}
        tabIndex={-1}
        className={cn(
          'absolute top-0 bottom-0 w-full bg-v2-surface shadow-v2-overlay flex flex-col outline-none',
          side === 'right'
            ? 'right-0 border-l border-v2-hairline animate-in slide-in-from-right-6 fade-in'
            : 'left-0 border-r border-v2-hairline animate-in fade-in',
          width,
          className,
        )}
      >
        <div className="flex items-center justify-between gap-4 px-5 h-14 border-b border-v2-hairline shrink-0">
          {title && <h2 className="text-sm font-semibold text-v2-ink truncate">{title}</h2>}
          <button onClick={onClose} aria-label="Close" className="p-1.5 -mr-1.5 rounded-v2-field text-v2-ink-faint hover:text-v2-ink hover:bg-v2-surface-2">
            <X size={17} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">{children}</div>
      </div>
    </div>,
    document.body,
  );
}

/* ── Menu (dropdown) ─────────────────────────────────────────────────────── */
export function Menu({ open, onClose, anchor = 'right', className = '', children }) {
  const ref = useRef(null);
  const handleClickOutside = useCallback((e) => {
    if (ref.current && !ref.current.contains(e.target)) onClose?.();
  }, [onClose]);
  useEffect(() => {
    if (!open) return;
    document.addEventListener('mousedown', handleClickOutside);
    const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, handleClickOutside, onClose]);
  if (!open) return null;
  return (
    <div
      ref={ref}
      role="menu"
      className={cn(
        'absolute z-50 mt-1.5 min-w-[180px] rounded-v2-card border border-v2-hairline bg-v2-surface shadow-v2-raised py-1',
        'animate-in fade-in zoom-in-95 slide-in-from-top-1',
        anchor === 'right' ? 'right-0' : 'left-0',
        className,
      )}
    >
      {children}
    </div>
  );
}

export function MenuItem({ icon: Icon, onClick, destructive = false, disabled = false, className = '', children }) {
  return (
    <button
      role="menuitem"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'w-full flex items-center gap-2.5 px-3 py-1.5 text-[13px] text-left transition-colors disabled:opacity-50',
        destructive ? 'text-v2-critical hover:bg-v2-critical-soft' : 'text-v2-ink-muted hover:bg-v2-surface-2 hover:text-v2-ink',
        className,
      )}
    >
      {Icon && <Icon size={15} className="shrink-0" />}
      {children}
    </button>
  );
}

export function MenuDivider() {
  return <div className="my-1 h-px bg-v2-hairline" />;
}

/* ── Tooltip (CSS-only, hover/focus) ─────────────────────────────────────── */
export function Tooltip({ label, side = 'top', className = '', children }) {
  const pos = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-1.5',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-1.5',
    left: 'right-full top-1/2 -translate-y-1/2 mr-1.5',
    right: 'left-full top-1/2 -translate-y-1/2 ml-1.5',
  }[side];
  return (
    <span className={cn('relative inline-flex group/tt', className)}>
      {children}
      <span
        role="tooltip"
        className={cn(
          'pointer-events-none absolute z-[300] whitespace-nowrap rounded-md bg-v2-ink px-2 py-1 text-[11px] font-medium text-v2-surface',
          'opacity-0 group-hover/tt:opacity-100 group-focus-within/tt:opacity-100 transition-opacity',
          pos,
        )}
      >
        {label}
      </span>
    </span>
  );
}
