import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { toneFor, labelFor } from '@/config/status'
import { useTheme } from '@/lib/theme'

export function Logo({ size = 26 }: { size?: number }) {
  return (
    <img
      src="/logo/logo.png"
      alt="BeOneOfUs"
      width={size}
      height={size}
      style={{ borderRadius: size * 0.27, display: 'block' }}
    />
  )
}

export function ThemeToggle({ className = 'icon-btn' }: { className?: string }) {
  const { choice, resolved, toggle } = useTheme()
  const icon = choice === 'system' ? '🖥' : resolved === 'dark' ? '🌙' : '☀'
  const label =
    choice === 'system' ? 'Theme: system' : choice === 'dark' ? 'Theme: dark' : 'Theme: light'
  return (
    <button className={className} onClick={toggle} aria-label={label} title={label}>
      <span aria-hidden="true">{icon}</span>
    </button>
  )
}

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'

export function Button({
  variant = 'secondary',
  size,
  block,
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: 'sm'; block?: boolean }) {
  return (
    <button
      className={`btn btn-${variant} ${size === 'sm' ? 'btn-sm' : ''} ${block ? 'btn-block' : ''} ${className}`}
      {...props}
    />
  )
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`card ${className}`}>{children}</section>
}

export function CardHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="card-header">
      <div>
        <h2>{title}</h2>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}

export function StatusBadge({ status }: { status: string }) {
  return <span className={`badge badge-${toneFor(status)}`}>{labelFor(status)}</span>
}

export function Badge({ tone = 'neutral', children }: { tone?: string; children: ReactNode }) {
  return <span className={`badge badge-${tone}`}>{children}</span>
}

export function Avatar({ name, large }: { name: string; large?: boolean }) {
  const initials = name
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
  return (
    <span className={`avatar ${large ? 'avatar-lg' : ''}`} aria-hidden="true">
      {initials || '?'}
    </span>
  )
}

export function ProgressBar({ value }: { value: number }) {
  return (
    <div className="progress" role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={100}>
      <span style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  )
}

export function Chips({ items }: { items: string[] }) {
  if (!items.length) return <span className="field-hint">None recorded</span>
  return (
    <div className="chip-row">
      {items.map((i) => (
        <span className="chip" key={i}>
          {i}
        </span>
      ))}
    </div>
  )
}

export function Banner({ tone = 'info', children }: { tone?: 'success' | 'info' | 'warning' | 'danger'; children: ReactNode }) {
  return (
    <div className={`banner banner-${tone}`} role="status">
      {children}
    </div>
  )
}

export function StatCard({ label, value, delta }: { label: string; value: ReactNode; delta?: { text: string; dir?: 'up' | 'down' } }) {
  return (
    <div className="stat">
      <span className="stat-label">{label}</span>
      <span className="stat-value">{value}</span>
      {delta && <span className={`stat-delta ${delta.dir ?? ''}`}>{delta.text}</span>}
    </div>
  )
}
