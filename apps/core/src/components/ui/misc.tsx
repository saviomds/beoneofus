import { useState } from 'react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

export function PageHeader({
  title,
  description,
  actions,
  crumbs,
}: {
  title: string
  description?: string
  actions?: ReactNode
  crumbs?: { label: string; to?: string }[]
}) {
  return (
    <div>
      {crumbs && crumbs.length > 0 && (
        <nav className="breadcrumbs" aria-label="Breadcrumb">
          {crumbs.map((c) => (
            <span key={c.label}>{c.to ? <Link to={c.to}>{c.label}</Link> : c.label}</span>
          ))}
        </nav>
      )}
      <div className="page-head">
        <div>
          <h1>{title}</h1>
          {description && <p>{description}</p>}
        </div>
        {actions && <div className="row-actions">{actions}</div>}
      </div>
    </div>
  )
}

export function Tabs({
  tabs,
  active,
  onChange,
}: {
  tabs: { key: string; label: string }[]
  active: string
  onChange: (key: string) => void
}) {
  return (
    <div className="tabs" role="tablist">
      {tabs.map((t) => (
        <button
          key={t.key}
          role="tab"
          aria-selected={active === t.key}
          className={active === t.key ? 'active' : ''}
          onClick={() => onChange(t.key)}
        >
          {t.label}
        </button>
      ))}
    </div>
  )
}

export function useTabs(initial: string) {
  const [active, setActive] = useState(initial)
  return { active, setActive }
}

export function Timeline({
  items,
}: {
  items: { title: string; when: string; note?: string }[]
}) {
  return (
    <div className="timeline">
      {items.map((it, i) => (
        <div className="timeline-item" key={i}>
          <div className="timeline-dot" />
          <div className="timeline-body">
            <strong>{it.title}</strong>
            <div className="when">{it.when}</div>
            {it.note && <p style={{ marginTop: 4, color: 'var(--text-soft)' }}>{it.note}</p>}
          </div>
        </div>
      ))}
    </div>
  )
}

export function BarChart({ data, unit = '' }: { data: { label: string; value: number }[]; unit?: string }) {
  const max = Math.max(1, ...data.map((d) => d.value))
  if (data.length === 0) return <p className="field-hint">No data for this period.</p>
  return (
    <div className="bars">
      {data.map((d) => (
        <div className="col" key={d.label} title={`${d.value}${unit}`}>
          <div className="bar" style={{ height: `${(d.value / max) * 100}%` }} />
          <span>{d.label}</span>
        </div>
      ))}
    </div>
  )
}

export function MetaList({ items }: { items: { label: string; value: ReactNode }[] }) {
  return (
    <dl className="meta-list">
      {items.map((it) => (
        <div key={it.label}>
          <dt>{it.label}</dt>
          <dd>{it.value ?? '—'}</dd>
        </div>
      ))}
    </dl>
  )
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return String(iso)
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return String(iso)
  return d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
}
