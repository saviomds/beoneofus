'use client';

// ── BeOneOfUs 2.0 UI kit — form controls ───────────────────────────────────

import { forwardRef, useId, useState } from 'react';
import { Search, Eye, EyeOff, ChevronDown, X } from 'lucide-react';
import { cn } from './cn';

const CONTROL_BASE =
  'w-full rounded-v2-field border border-v2-hairline-2 bg-v2-surface text-v2-ink ' +
  'placeholder:text-v2-ink-faint transition-colors ' +
  'focus:outline-none focus:border-brand-500 focus:ring-[3px] focus:ring-brand-500/25 ' +
  'disabled:opacity-60 disabled:cursor-not-allowed';

const CONTROL_INVALID = 'border-v2-critical focus:border-v2-critical focus:ring-v2-critical/25';

/* ── Field wrapper (label + hint + error) ────────────────────────────────── */
export function Field({ label, hint, error, required, htmlFor, className = '', children }) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      {label && (
        <label htmlFor={htmlFor} className="text-[13px] font-medium text-v2-ink-muted">
          {label}
          {required && <span className="text-v2-critical ml-0.5">*</span>}
        </label>
      )}
      {children}
      {error ? (
        <p className="text-[12px] text-v2-critical">{error}</p>
      ) : hint ? (
        <p className="text-[12px] text-v2-ink-faint">{hint}</p>
      ) : null}
    </div>
  );
}

/* ── Input ───────────────────────────────────────────────────────────────── */
export const Input = forwardRef(function Input(
  { invalid = false, size = 'md', icon: Icon, className = '', ...props },
  ref,
) {
  const h = size === 'sm' ? 'h-8 text-[13px]' : size === 'lg' ? 'h-11 text-sm' : 'h-9 text-sm';
  return (
    <div className="relative">
      {Icon && (
        <Icon size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-v2-ink-faint" />
      )}
      <input
        ref={ref}
        className={cn(CONTROL_BASE, h, Icon ? 'pl-9 pr-3' : 'px-3', invalid && CONTROL_INVALID, className)}
        {...props}
      />
    </div>
  );
});

/* ── Textarea ────────────────────────────────────────────────────────────── */
export const Textarea = forwardRef(function Textarea(
  { invalid = false, className = '', rows = 4, ...props },
  ref,
) {
  return (
    <textarea
      ref={ref}
      rows={rows}
      className={cn(CONTROL_BASE, 'px-3 py-2 text-sm leading-relaxed resize-y min-h-[80px]', invalid && CONTROL_INVALID, className)}
      {...props}
    />
  );
});

/* ── Select (native, styled) ─────────────────────────────────────────────── */
export const Select = forwardRef(function Select(
  { invalid = false, size = 'md', className = '', children, ...props },
  ref,
) {
  const h = size === 'sm' ? 'h-8 text-[13px]' : size === 'lg' ? 'h-11 text-sm' : 'h-9 text-sm';
  return (
    <div className="relative">
      <select
        ref={ref}
        className={cn(CONTROL_BASE, h, 'appearance-none pl-3 pr-9 cursor-pointer', invalid && CONTROL_INVALID, className)}
        {...props}
      >
        {children}
      </select>
      <ChevronDown size={15} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-v2-ink-faint" />
    </div>
  );
});

/* ── SearchInput ─────────────────────────────────────────────────────────── */
export const SearchInput = forwardRef(function SearchInput(
  { value, onChange, onClear, kbd, className = '', size = 'md', ...props },
  ref,
) {
  const h = size === 'sm' ? 'h-8 text-[13px]' : 'h-9 text-sm';
  return (
    <div className={cn('relative', className)}>
      <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-v2-ink-faint" />
      <input
        ref={ref}
        type="search"
        value={value}
        onChange={onChange}
        className={cn(CONTROL_BASE, h, 'pl-9', value ? 'pr-9' : kbd ? 'pr-14' : 'pr-3', '[&::-webkit-search-cancel-button]:hidden')}
        {...props}
      />
      {value ? (
        <button
          type="button"
          onClick={onClear}
          aria-label="Clear search"
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-v2-ink-faint hover:text-v2-ink"
        >
          <X size={14} />
        </button>
      ) : kbd ? (
        <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2">
          <kbd className="inline-flex items-center rounded border border-v2-hairline-2 bg-v2-surface px-1.5 py-0.5 font-mono text-[10px] text-v2-ink-faint">
            {kbd}
          </kbd>
        </span>
      ) : null}
    </div>
  );
});

/* ── PasswordInput ───────────────────────────────────────────────────────── */
export const PasswordInput = forwardRef(function PasswordInput(
  { invalid = false, className = '', ...props },
  ref,
) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        ref={ref}
        type={show ? 'text' : 'password'}
        className={cn(CONTROL_BASE, 'h-9 text-sm pl-3 pr-10', invalid && CONTROL_INVALID, className)}
        {...props}
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        aria-label={show ? 'Hide password' : 'Show password'}
        aria-pressed={show}
        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded text-v2-ink-faint hover:text-v2-ink hover:bg-v2-surface-2"
      >
        {show ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    </div>
  );
});

/* ── Toggle (switch) ─────────────────────────────────────────────────────── */
export function Toggle({ checked = false, onChange, disabled = false, label, className = '', id }) {
  const autoId = useId();
  const inputId = id || autoId;
  return (
    <label htmlFor={inputId} className={cn('inline-flex items-center gap-2.5 cursor-pointer select-none', disabled && 'opacity-50 cursor-not-allowed', className)}>
      <button
        id={inputId}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => !disabled && onChange?.(!checked)}
        className={cn(
          'relative w-9 h-5 rounded-full transition-colors shrink-0',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 focus-visible:ring-offset-1 focus-visible:ring-offset-v2-surface',
          checked ? 'bg-brand-600' : 'bg-v2-surface-3 border border-v2-hairline-2',
        )}
      >
        <span
          className={cn(
            'absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform',
            checked && 'translate-x-4',
          )}
        />
      </button>
      {label && <span className="text-[13px] text-v2-ink">{label}</span>}
    </label>
  );
}

/* ── Checkbox ────────────────────────────────────────────────────────────── */
export const Checkbox = forwardRef(function Checkbox({ label, className = '', ...props }, ref) {
  return (
    <label className={cn('inline-flex items-center gap-2 cursor-pointer select-none', className)}>
      <input
        ref={ref}
        type="checkbox"
        className="w-4 h-4 rounded border-v2-hairline-2 text-brand-600 focus:ring-2 focus:ring-brand-500/40 focus:ring-offset-0"
        {...props}
      />
      {label && <span className="text-[13px] text-v2-ink">{label}</span>}
    </label>
  );
});
