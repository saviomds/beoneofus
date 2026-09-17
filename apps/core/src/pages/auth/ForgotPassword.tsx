import { useState } from 'react'
import { Link } from 'react-router-dom'
import { authService } from '@/services/authService'
import { ThemeToggle } from '@/components/ui'
import { WEB_URL } from '@/config/platform'

function IconUser() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  )
}

// Ecosystem nodes shown on the right-hand visual panel — identical to the sign-in
// screen's, so the two auth screens read as one continuous experience.
const ECOSYSTEM_NODES = [
  { label: 'Students', x: 50, y: 14 },
  { label: 'Schools', x: 75.5, y: 24.5 },
  { label: 'Institutions', x: 86, y: 50 },
  { label: 'Careers', x: 75.5, y: 75.5 },
  { label: 'Mentors', x: 50, y: 86 },
  { label: 'Community', x: 24.5, y: 75.5 },
  { label: 'Courses', x: 14, y: 50 },
  { label: 'Credentials', x: 24.5, y: 24.5 },
]

export function ForgotPassword() {
  const [code, setCode] = useState('')
  const [token, setToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const res = await authService.requestPasswordReset(code)
    setToken(res.token)
    setLoading(false)
  }

  return (
    <div className="login-split">
      <div style={{ position: 'fixed', top: 16, right: 16, zIndex: 5 }}>
        <ThemeToggle />
      </div>

      <div className="login-left">
        <div className="login-card">
          <div className="login-logo">
            <img src="/logo/logo.png" alt="" width={34} height={34} />
            <span className="login-mark">BeOneOfUs</span>
          </div>
          <p className="login-tagline">
            {token ? 'Your one-time reset token is ready.' : 'Enter your account code to start a reset.'}
          </p>
          <Link className="login-back" to="/login">← Back to sign in</Link>

          {token ? (
            <>
              <div className="banner banner-info">
                This is a demo environment — no email is sent. Your one-time reset token is:
              </div>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '1.1rem', textAlign: 'center', margin: '16px 0' }}>
                {token}
              </p>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-faint)' }}>
                In production this token would be delivered by email and exchanged for a new password on a secure
                reset page.
              </p>
              <Link className="btn btn-primary btn-block" to="/login" style={{ marginTop: 16 }}>
                Back to sign in
              </Link>
            </>
          ) : (
            <form className="login-form" onSubmit={onSubmit}>
              <label className="field">
                <span>Account code</span>
                <div className="input-group">
                  <span className="input-icon" aria-hidden="true"><IconUser /></span>
                  <input
                    className="input has-icon"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="BOU-STU-XXXXX"
                    autoComplete="username"
                    autoCapitalize="none"
                    spellCheck={false}
                    required
                  />
                </div>
              </label>
              <button className="btn btn-primary btn-block" disabled={loading}>
                {loading ? 'Working…' : 'Send reset token'}
              </button>
            </form>
          )}

          <div className="login-footer">
            <a href={`${WEB_URL}/privacy`} target="_blank" rel="noopener noreferrer">Privacy</a>
            <span aria-hidden="true">·</span>
            <a href={`${WEB_URL}/terms`} target="_blank" rel="noopener noreferrer">Terms</a>
            <span aria-hidden="true">·</span>
            <Link to="/trouble-signing-in">Trouble signing in?</Link>
          </div>
        </div>
      </div>

      <div className="login-right" aria-hidden="true">
        <div className="login-right-grid" />
        <div className="login-right-content">
          <p className="login-right-eyebrow">Connect. Learn. Grow.</p>
          <p className="login-right-sub">One ecosystem for education, mentorship and opportunity.</p>

          <div className="eco-canvas">
            <svg className="eco-lines" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">
              {ECOSYSTEM_NODES.map((n) => (
                <line key={n.label} x1={50} y1={50} x2={n.x} y2={n.y} />
              ))}
            </svg>

            <div className="eco-hub" />
            {ECOSYSTEM_NODES.map((n, i) => (
              <div
                key={n.label}
                className="eco-node"
                style={{ left: `${n.x}%`, top: `${n.y}%`, animationDelay: `${(i % 4) * 0.5}s` }}
              >
                {n.label}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
