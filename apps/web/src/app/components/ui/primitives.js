'use client';

// ── BeOneOfUs 2.0 UI kit — structural + display primitives ──────────────────
// Tailwind v4 utilities backed by the `v2-*` tokens in globals.css.
// Enterprise register: hairline borders, restrained radius, subtle elevation.

import { forwardRef } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from './cn';

/* ── Button ──────────────────────────────────────────────────────────────── */
const BTN_BASE =
  'inline-flex items-center justify-center gap-2 font-medium whitespace-nowrap ' +
  'rounded-v2-field border transition-colors select-none ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 focus-visible:ring-offset-1 ' +
  'focus-visible:ring-offset-v2-surface disabled:opacity-50 disabled:pointer-events-none';

const BTN_VARIANTS = {
  primary:
    'bg-brand-600 hover:bg-brand-700 text-white border-transparent shadow-v2-xs',
  secondary:
    'bg-v2-surface hover:bg-v2-surface-2 text-v2-ink border-v2-hairline-2 shadow-v2-xs',
  ghost:
    'bg-transparent hover:bg-v2-surface-2 text-v2-ink-muted hover:text-v2-ink border-transparent',
  danger:
    'bg-v2-critical hover:brightness-110 text-white border-transparent shadow-v2-xs',
  'danger-ghost':
    'bg-transparent hover:bg-v2-critical-soft text-v2-critical border-transparent',
};

const BTN_SIZES = {
  sm: 'h-8 px-3 text-[13px]',
  md: 'h-9 px-3.5 text-sm',
  lg: 'h-10 px-4 text-sm',
};

export const Button = forwardRef(function Button(
  {
    variant = 'secondary',
    size = 'md',
    loading = false,
    disabled = false,
    icon: Icon = null,
    iconRight: IconRight = null,
    block = false,
    className = '',
    children,
    ...props
  },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        BTN_BASE,
        BTN_VARIANTS[variant] || BTN_VARIANTS.secondary,
        BTN_SIZES[size] || BTN_SIZES.md,
        block && 'w-full',
        className,
      )}
      {...props}
    >
      {loading ? (
        <Loader2 size={size === 'sm' ? 13 : 15} className="animate-spin" />
      ) : (
        Icon && <Icon size={size === 'sm' ? 14 : 16} strokeWidth={2} />
      )}
      {children}
      {IconRight && !loading && <IconRight size={size === 'sm' ? 14 : 16} strokeWidth={2} />}
    </button>
  );
});

/* ── IconButton ──────────────────────────────────────────────────────────── */
const ICONBTN_SIZES = { sm: 'w-7 h-7', md: 'w-9 h-9', lg: 'w-10 h-10' };

export const IconButton = forwardRef(function IconButton(
  { size = 'md', variant = 'ghost', className = '', label, badge, children, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      aria-label={label}
      title={label}
      className={cn(
        'relative inline-flex items-center justify-center rounded-v2-field border transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40',
        ICONBTN_SIZES[size] || ICONBTN_SIZES.md,
        variant === 'ghost'
          ? 'border-transparent text-v2-ink-muted hover:bg-v2-surface-2 hover:text-v2-ink'
          : 'border-v2-hairline-2 bg-v2-surface text-v2-ink-muted hover:bg-v2-surface-2 hover:text-v2-ink shadow-v2-xs',
        className,
      )}
      {...props}
    >
      {children}
      {badge > 0 && (
        <span className="absolute -top-1 -right-1 min-w-[15px] h-[15px] px-1 rounded-full bg-v2-critical text-white text-[9px] font-semibold leading-none flex items-center justify-center border-2 border-v2-surface">
          {badge > 9 ? '9+' : badge}
        </span>
      )}
    </button>
  );
});

/* ── Card ────────────────────────────────────────────────────────────────── */
export function Card({ as: Tag = 'div', interactive = false, className = '', children, ...props }) {
  return (
    <Tag
      className={cn(
        'bg-v2-surface border border-v2-hairline rounded-v2-card shadow-v2-card',
        interactive && 'transition-colors hover:border-v2-hairline-2 hover:bg-v2-surface-2/40 cursor-pointer',
        className,
      )}
      {...props}
    >
      {children}
    </Tag>
  );
}

export function CardHeader({ title, subtitle, action, className = '', children }) {
  return (
    <div
      className={cn(
        'flex items-start justify-between gap-3 px-4 py-3 border-b border-v2-hairline',
        className,
      )}
    >
      {children || (
        <div className="min-w-0">
          {title && <h3 className="text-sm font-semibold text-v2-ink truncate">{title}</h3>}
          {subtitle && <p className="text-[13px] text-v2-ink-faint mt-0.5">{subtitle}</p>}
        </div>
      )}
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export function CardBody({ className = '', flush = false, children }) {
  return <div className={cn(flush ? 'p-0' : 'p-4', className)}>{children}</div>;
}

/* ── Badge / StatusBadge ─────────────────────────────────────────────────── */
const TONES = {
  neutral: 'bg-v2-surface-3 text-v2-ink-muted',
  brand: 'bg-v2-brand-soft text-brand-700 dark:text-brand-300',
  positive: 'bg-v2-positive-soft text-v2-positive',
  caution: 'bg-v2-caution-soft text-v2-caution',
  critical: 'bg-v2-critical-soft text-v2-critical',
  info: 'bg-v2-info-soft text-v2-info',
};

export function Badge({ tone = 'neutral', dot = false, size = 'md', className = '', children }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 font-medium rounded-full whitespace-nowrap',
        size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-0.5 text-xs',
        TONES[tone] || TONES.neutral,
        className,
      )}
    >
      {dot && <span className="w-1.5 h-1.5 rounded-full bg-current shrink-0" />}
      {children}
    </span>
  );
}

// Maps common status strings → tone. Extend per surface as needed.
const STATUS_TONE = {
  active: 'positive', approved: 'positive', signed: 'positive', completed: 'positive',
  accepted: 'positive', published: 'positive', paid: 'positive', open: 'positive', live: 'positive',
  pending: 'caution', pending_review: 'caution', draft: 'neutral', viewed: 'caution',
  in_review: 'caution', processing: 'caution', sent: 'info',
  declined: 'critical', rejected: 'critical', expired: 'critical', closed: 'critical',
  cancelled: 'critical', blocked: 'critical', failed: 'critical',
};

export function StatusBadge({ status, label, className = '' }) {
  const key = String(status || '').toLowerCase();
  const tone = STATUS_TONE[key] || 'neutral';
  const text = label || key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  return (
    <Badge tone={tone} dot className={cn('capitalize', className)}>
      {text}
    </Badge>
  );
}

/* ── Chip ────────────────────────────────────────────────────────────────── */
export function Chip({ onRemove, active = false, className = '', children, ...props }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[13px] transition-colors',
        active
          ? 'border-brand-500 bg-v2-brand-soft text-brand-700 dark:text-brand-300'
          : 'border-v2-hairline bg-v2-surface-2 text-v2-ink-muted',
        (props.onClick || onRemove) && 'cursor-pointer hover:border-v2-hairline-2',
        className,
      )}
      {...props}
    >
      {children}
      {onRemove && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          className="ml-0.5 -mr-1 text-v2-ink-faint hover:text-v2-ink"
          aria-label="Remove"
        >
          ×
        </button>
      )}
    </span>
  );
}

/* ── Avatar ──────────────────────────────────────────────────────────────── */
const AVATAR_SIZES = { xs: 24, sm: 32, md: 40, lg: 56, xl: 80 };

export function Avatar({ src, name = '', size = 'md', square = false, status, className = '' }) {
  const px = AVATAR_SIZES[size] || size || 40;
  const initials = String(name).trim().split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase() || '?';
  return (
    <span
      className={cn('relative inline-flex shrink-0 items-center justify-center overflow-hidden bg-v2-surface-3 text-v2-ink-muted font-medium', square ? 'rounded-v2-field' : 'rounded-full', className)}
      style={{ width: px, height: px, fontSize: px * 0.36 }}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
      ) : (
        initials
      )}
      {status && (
        <span
          className={cn(
            'absolute bottom-0 right-0 rounded-full border-2 border-v2-surface',
            status === 'online' ? 'bg-emerald-400' : 'bg-v2-ink-faint',
          )}
          style={{ width: Math.max(8, px * 0.24), height: Math.max(8, px * 0.24) }}
        />
      )}
    </span>
  );
}

/* ── ProgressBar ─────────────────────────────────────────────────────────── */
export function ProgressBar({ value = 0, tone = 'brand', className = '', showLabel = false }) {
  const pct = Math.max(0, Math.min(100, value));
  const fill = {
    brand: 'bg-brand-500', positive: 'bg-v2-positive', caution: 'bg-v2-caution', critical: 'bg-v2-critical',
  }[tone] || 'bg-brand-500';
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className="flex-1 h-1.5 rounded-full bg-v2-surface-3 overflow-hidden" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
        <div className={cn('h-full rounded-full transition-[width] duration-500', fill)} style={{ width: `${pct}%` }} />
      </div>
      {showLabel && <span className="text-[11px] tabular-nums text-v2-ink-faint w-9 text-right">{Math.round(pct)}%</span>}
    </div>
  );
}

/* ── Spinner ─────────────────────────────────────────────────────────────── */
export function Spinner({ size = 16, className = '' }) {
  return <Loader2 size={size} className={cn('animate-spin text-v2-ink-faint', className)} />;
}

/* ── Kbd ─────────────────────────────────────────────────────────────────── */
export function Kbd({ children, className = '' }) {
  return (
    <kbd className={cn('inline-flex items-center rounded border border-v2-hairline-2 bg-v2-surface px-1.5 py-0.5 font-mono text-[10px] font-medium text-v2-ink-faint', className)}>
      {children}
    </kbd>
  );
}
