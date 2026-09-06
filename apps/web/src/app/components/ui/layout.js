'use client';

// ── BeOneOfUs 2.0 UI kit — page/section layout + navigation ────────────────

import { ChevronRight } from 'lucide-react';
import { cn } from './cn';

/* ── PageHeader ──────────────────────────────────────────────────────────── */
export function PageHeader({ title, description, breadcrumbs, actions, className = '', children }) {
  return (
    <div className={cn('mb-6', className)}>
      {breadcrumbs?.length > 0 && <Breadcrumbs items={breadcrumbs} className="mb-2" />}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          {title && <h1 className="text-xl font-semibold text-v2-ink tracking-[-0.01em] sm:text-[22px]">{title}</h1>}
          {description && <p className="mt-1 text-[13px] text-v2-ink-faint max-w-2xl leading-relaxed">{description}</p>}
        </div>
        {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
      </div>
      {children && <div className="mt-4">{children}</div>}
    </div>
  );
}

/* ── Breadcrumbs ─────────────────────────────────────────────────────────── */
export function Breadcrumbs({ items = [], className = '' }) {
  return (
    <nav aria-label="Breadcrumb" className={cn('flex items-center flex-wrap gap-1 text-[12px] text-v2-ink-faint', className)}>
      {items.map((item, i) => (
        <span key={i} className="flex items-center gap-1">
          {i > 0 && <ChevronRight size={12} className="text-v2-ink-faint/60" />}
          {item.href && i < items.length - 1 ? (
            <a href={item.href} className="hover:text-v2-ink-muted transition-colors">{item.label}</a>
          ) : (
            <span className={i === items.length - 1 ? 'text-v2-ink-muted' : ''}>{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}

/* ── SectionHeader ───────────────────────────────────────────────────────── */
export function SectionHeader({ title, description, icon: Icon, action, className = '' }) {
  return (
    <div className={cn('flex items-center justify-between gap-3 mb-3', className)}>
      <div className="flex items-center gap-2 min-w-0">
        {Icon && <Icon size={15} className="text-v2-ink-faint shrink-0" />}
        <div className="min-w-0">
          <h2 className="text-[13px] font-semibold text-v2-ink-muted uppercase tracking-wide truncate">{title}</h2>
          {description && <p className="text-[12px] text-v2-ink-faint normal-case font-normal">{description}</p>}
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

/* ── Tabs (underline) ────────────────────────────────────────────────────── */
export function Tabs({ tabs = [], value, onChange, className = '' }) {
  return (
    <div className={cn('flex items-center gap-1 border-b border-v2-hairline overflow-x-auto no-scrollbar', className)} role="tablist">
      {tabs.map((tab) => {
        const id = tab.id ?? tab;
        const label = tab.label ?? tab;
        const active = value === id;
        return (
          <button
            key={id}
            role="tab"
            aria-selected={active}
            onClick={() => onChange?.(id)}
            className={cn(
              'relative px-3 py-2.5 text-[13px] font-medium whitespace-nowrap transition-colors -mb-px border-b-2',
              active
                ? 'text-v2-ink border-brand-500'
                : 'text-v2-ink-faint border-transparent hover:text-v2-ink-muted',
            )}
          >
            {label}
            {tab.count != null && (
              <span className={cn('ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums', active ? 'bg-v2-brand-soft text-brand-700 dark:text-brand-300' : 'bg-v2-surface-3 text-v2-ink-faint')}>
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/* ── SegmentedControl ────────────────────────────────────────────────────── */
export function SegmentedControl({ options = [], value, onChange, size = 'md', className = '' }) {
  return (
    <div className={cn('inline-flex items-center gap-0.5 rounded-v2-field border border-v2-hairline bg-v2-surface-2 p-0.5', className)}>
      {options.map((opt) => {
        const id = opt.id ?? opt;
        const label = opt.label ?? opt;
        const active = value === id;
        return (
          <button
            key={id}
            onClick={() => onChange?.(id)}
            className={cn(
              'rounded-[6px] font-medium transition-colors whitespace-nowrap flex items-center gap-1.5',
              size === 'sm' ? 'h-6 px-2 text-[12px]' : 'h-7 px-2.5 text-[13px]',
              active ? 'bg-v2-surface text-v2-ink shadow-v2-xs' : 'text-v2-ink-faint hover:text-v2-ink-muted',
            )}
          >
            {opt.icon && <opt.icon size={13} />}
            {label}
          </button>
        );
      })}
    </div>
  );
}

/* ── Toolbar ─────────────────────────────────────────────────────────────── */
export function Toolbar({ className = '', children }) {
  return <div className={cn('flex flex-wrap items-center gap-2 mb-4', className)}>{children}</div>;
}
