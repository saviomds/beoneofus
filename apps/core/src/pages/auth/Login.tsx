import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { ROLE_HOME } from '@/config/nav'
import { ThemeToggle } from '@/components/ui'
import { WEB_URL } from '@/config/platform'

// Demo sign-in codes / walkthrough: see apps/core/DEMO-ACCOUNTS.md (dev reference).

export function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
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
    <div className="auth-screen">
      <div style={{ position: 'fixed', top: 16, right: 16 }}>
        <ThemeToggle />
      </div>
      <div className="auth-card">
        <div className="auth-logo">
          <img src="/logo/logo.png" alt="" width={34} height={34} />
          <span className="mark">BeOneOfUs</span>
        </div>
        <p className="tagline">One ecosystem for students, mentors, schools and institutions.</p>
        <p style={{ marginTop: -4, marginBottom: 12 }}>
          <a className="link-btn" href={WEB_URL}>← Back to beoneofus</a>
        </p>

        <form onSubmit={onSubmit}>
          <label className="field">
            <span>Username / Code</span>
            <input
              className="input"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="BOU-STU-XXXXX"
              autoComplete="username"
              required
            />
          </label>
          <label className="field">
            <span>Password</span>
            <input
              className="input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              required
            />
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
      </div>
    </div>
  )
}
