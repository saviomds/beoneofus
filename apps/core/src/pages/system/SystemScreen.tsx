import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ThemeToggle } from '@/components/ui'

/** Shared full-page frame for 403 / 404 / account-status screens. */
export function SystemScreen({
  badge,
  title,
  children,
  primary,
  secondary,
  tone = 'neutral',
}: {
  badge: string
  title: string
  children?: ReactNode
  primary?: { label: string; to?: string; onClick?: () => void }
  secondary?: { label: string; to?: string; onClick?: () => void }
  tone?: 'neutral' | 'warning' | 'danger'
}) {
  const accent =
    tone === 'danger' ? 'var(--danger)' : tone === 'warning' ? 'var(--warning)' : 'var(--brand)'
  return (
    <div className="auth-screen">
      <div style={{ position: 'fixed', top: 16, right: 16 }}>
        <ThemeToggle />
      </div>
      <div className="auth-card" style={{ maxWidth: 460, textAlign: 'center' }}>
        <div className="auth-logo" style={{ justifyContent: 'center' }}>
          <img src="/logo/logo.png" alt="" width={30} height={30} />
          <span className="mark" style={{ fontSize: '1.15rem' }}>BeOneOfUs</span>
        </div>
        <div
          aria-hidden="true"
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: '2.6rem',
            fontWeight: 600,
            color: accent,
            lineHeight: 1,
            margin: '10px 0 6px',
          }}
        >
          {badge}
        </div>
        <h1 style={{ fontSize: '1.15rem', marginBottom: 8 }}>{title}</h1>
        {children && (
          <div style={{ fontSize: '0.875rem', color: 'var(--text-soft)', lineHeight: 1.55, marginBottom: 22 }}>
            {children}
          </div>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {primary &&
            (primary.to ? (
              <Link className="btn btn-primary btn-block" to={primary.to}>
                {primary.label}
              </Link>
            ) : (
              <button className="btn btn-primary btn-block" onClick={primary.onClick}>
                {primary.label}
              </button>
            ))}
          {secondary &&
            (secondary.to ? (
              <Link className="btn btn-secondary btn-block" to={secondary.to}>
                {secondary.label}
              </Link>
            ) : (
              <button className="btn btn-secondary btn-block" onClick={secondary.onClick}>
                {secondary.label}
              </button>
            ))}
        </div>
      </div>
    </div>
  )
}
