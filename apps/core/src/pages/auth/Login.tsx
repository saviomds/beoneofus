import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { ROLE_HOME } from '@/config/nav'
import { ThemeToggle } from '@/components/ui'
import { WEB_URL } from '@/config/platform'

// Demo sign-in codes / walkthrough: see apps/core/DEMO-ACCOUNTS.md (dev reference).

// Ecosystem nodes shown on the right-hand visual panel. Positions are percentages
// on a 0–100 canvas so the connecting lines (same coordinate space) always line up.
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

function IconUser() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  )
}

function IconLock() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="11" width="16" height="9" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  )
}

function IconEye() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

function IconEyeOff() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.94 10.94 0 0 1 12 19c-7 0-11-7-11-7a21.3 21.3 0 0 1 5.06-5.94M9.9 4.24A10.94 10.94 0 0 1 12 4c7 0 11 7 11 7a21.3 21.3 0 0 1-2.16 3.19" />
      <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
      <path d="M1 1l22 22" />
    </svg>
  )
}

export function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle')
  const [message, setMessage] = useState('')

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    const entered = code.trim()
    if (/^ORG-/i.test(entered)) {
      setStatus('error')
      setMessage(
        `"${entered}" is an institution ID, not a sign-in code. Use your personal BOU-… account code (e.g. the institution's BOU-SCH-… or BOU-ORG-… admin account).`,
      )
      return
    }
    setStatus('loading')
    setMessage('')
    try {
      const user = await login(entered, password)
      const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname
      navigate(from && from !== '/login' ? from : ROLE_HOME[user.role], { replace: true })
    } catch (err) {
      setStatus('error')
      setMessage(err instanceof Error ? err.message : 'Sign in failed.')
    }
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
          <p className="login-tagline">One ecosystem for students, mentors, schools and institutions.</p>
          <a className="login-back" href={WEB_URL}>← Back to beoneofus</a>

          <form className="login-form" onSubmit={onSubmit}>
            <label className="field">
              <span>Username / Code</span>
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
            <label className="field">
              <span>Password</span>
              <div className="input-group">
                <span className="input-icon" aria-hidden="true"><IconLock /></span>
                <input
                  className="input has-icon has-toggle"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  className="input-toggle"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  aria-pressed={showPassword}
                >
                  {showPassword ? <IconEyeOff /> : <IconEye />}
                </button>
              </div>
            </label>

            <div className="auth-row" style={{ justifyContent: 'flex-end' }}>
              <Link className="link-btn" to="/forgot-password">
                Forgot password?
              </Link>
            </div>

            {status === 'error' && (
              <div className="banner banner-danger" role="alert">
                {message}
              </div>
            )}

            <button className="btn btn-primary btn-block" type="submit" disabled={status === 'loading'}>
              {status === 'loading' ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

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
