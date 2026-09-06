'use client';

// ── BeOneOfUs 2.0 UI kit — data display (table kit / KPI) ──────────────────

import { ChevronUp, ChevronDown, ChevronsUpDown, ArrowUpRight, ArrowDownRight, MoreHorizontal } from 'lucide-react';
import { cn } from './cn';
import { Menu } from './overlays';
import { useState } from 'react';

/* ── Table shell ─────────────────────────────────────────────────────────── */
export function Table({ className = '', children, minWidth }) {
  return (
    <div className="w-full overflow-x-auto rounded-v2-card border border-v2-hairline bg-v2-surface">
      <table className={cn('w-full text-sm border-collapse', className)} style={minWidth ? { minWidth } : undefined}>
        {children}
      </table>
    </div>
  );
}

export function THead({ children }) {
  return <thead className="bg-v2-surface-2">{children}</thead>;
}

export function TBody({ children }) {
  return <tbody>{children}</tbody>;
}

export function Th({ children, sortable = false, sortDir = null, onSort, align = 'left', className = '' }) {
  const Icon = sortDir === 'asc' ? ChevronUp : sortDir === 'desc' ? ChevronDown : ChevronsUpDown;
  return (
    <th
      className={cn(
        'px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-v2-ink-faint border-b border-v2-hairline whitespace-nowrap',
        align === 'right' && 'text-right', align === 'center' && 'text-center', align === 'left' && 'text-left',
        className,
      )}
    >
      {sortable ? (
        <button onClick={onSort} className="inline-flex items-center gap-1 hover:text-v2-ink-muted transition-colors uppercase tracking-wide">
          {children}
          <Icon size={12} className={sortDir ? 'text-v2-ink-muted' : 'text-v2-ink-faint/60'} />
        </button>
      ) : (
        children
      )}
    </th>
  );
}

export function Tr({ onClick, selected = false, className = '', children }) {
  return (
    <tr
      onClick={onClick}
      className={cn(
        'border-b border-v2-hairline last:border-0 transition-colors',
        onClick && 'cursor-pointer',
        selected ? 'bg-v2-brand-soft/50' : 'hover:bg-v2-surface-2/60',
        className,
      )}
    >
      {children}
    </tr>
  );
}

export function Td({ align = 'left', className = '', children, ...props }) {
  return (
    <td
      className={cn(
        'px-4 py-3 text-[13px] text-v2-ink-muted align-middle',
        align === 'right' && 'text-right tabular-nums', align === 'center' && 'text-center',
        className,
      )}
      {...props}
    >
      {children}
    </td>
  );
}

/* ── RowActions (kebab menu) ─────────────────────────────────────────────── */
export function RowActions({ children, label = 'Row actions' }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative inline-flex" onClick={(e) => e.stopPropagation()}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={label}
        className="w-7 h-7 inline-flex items-center justify-center rounded-v2-field text-v2-ink-faint hover:bg-v2-surface-2 hover:text-v2-ink transition-colors"
      >
        <MoreHorizontal size={16} />
      </button>
      <Menu open={open} onClose={() => setOpen(false)}>{children}</Menu>
    </div>
  );
}

/* ── BulkBar ─────────────────────────────────────────────────────────────── */
export function BulkBar({ count, onClear, children, className = '' }) {
  if (!count) return null;
  return (
    <div className={cn('flex items-center gap-3 px-4 py-2.5 rounded-v2-card border border-v2-hairline bg-v2-surface shadow-v2-card animate-in slide-in-from-bottom-2 fade-in', className)}>
      <span className="text-[13px] font-medium text-v2-ink">{count} selected</span>
      <button onClick={onClear} className="text-[12px] text-v2-ink-faint hover:text-v2-ink">Clear</button>
      <div className="ml-auto flex items-center gap-2">{children}</div>
    </div>
  );
}

/* ── Pagination ──────────────────────────────────────────────────────────── */
export function Pagination({ page, pageCount, onPage, total, className = '' }) {
  if (pageCount <= 1 && !total) return null;
  return (
    <div className={cn('flex items-center justify-between gap-3 pt-3 text-[13px] text-v2-ink-faint', className)}>
      <span>{total != null ? `${total.toLocaleString()} total` : `Page ${page} of ${pageCount}`}</span>
      <div className="flex items-center gap-1.5">
        <button
          onClick={() => onPage(page - 1)}
          disabled={page <= 1}
          className="h-8 px-3 rounded-v2-field border border-v2-hairline-2 bg-v2-surface text-v2-ink-muted hover:bg-v2-surface-2 disabled:opacity-40 disabled:pointer-events-none transition-colors"
        >
          Previous
        </button>
        <span className="px-2 tabular-nums">{page} / {pageCount}</span>
        <button
          onClick={() => onPage(page + 1)}
          disabled={page >= pageCount}
          className="h-8 px-3 rounded-v2-field border border-v2-hairline-2 bg-v2-surface text-v2-ink-muted hover:bg-v2-surface-2 disabled:opacity-40 disabled:pointer-events-none transition-colors"
        >
          Next
        </button>
      </div>
    </div>
  );
}

/* ── KpiCard ─────────────────────────────────────────────────────────────── */
export function KpiCard({ label, value, delta, deltaLabel, icon: Icon, hint, spark, className = '' }) {
  const dir = delta == null ? null : delta >= 0 ? 'up' : 'down';
  return (
    <div className={cn('rounded-v2-card border border-v2-hairline bg-v2-surface p-4 flex flex-col gap-1.5', className)}>
      <div className="flex items-center justify-between">
        <span className="text-[12px] font-medium text-v2-ink-faint uppercase tracking-wide">{label}</span>
        {Icon && <Icon size={15} className="text-v2-ink-faint" />}
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-[22px] font-semibold text-v2-ink tabular-nums tracking-[-0.01em]">{value}</span>
        {dir && (
          <span className={cn('inline-flex items-center gap-0.5 text-[12px] font-medium', dir === 'up' ? 'text-v2-positive' : 'text-v2-critical')}>
            {dir === 'up' ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
            {Math.abs(delta)}{typeof delta === 'number' ? '%' : ''}
          </span>
        )}
      </div>
      {(hint || deltaLabel) && <p className="text-[12px] text-v2-ink-faint">{deltaLabel || hint}</p>}
      {spark && <div className="mt-1">{spark}</div>}
    </div>
  );
}

export function KpiRow({ className = '', children }) {
  return <div className={cn('grid gap-3 grid-cols-2 lg:grid-cols-4', className)}>{children}</div>;
}
