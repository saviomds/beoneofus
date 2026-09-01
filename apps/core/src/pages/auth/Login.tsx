import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { ROLE_HOME } from '@/config/nav'
import { ThemeToggle } from '@/components/ui'
import { WEB_URL } from '@/config/platform'

const DEMO: [string, string][] = [
  ['BOU-STU-10231', 'Student · School A'],
  ['BOU-TEA-40871', 'Teacher / Mentor · School A'],
  ['BOU-SCH-77120', 'Institution admin · School A (Kigali Innovation Academy)'],
  ['BOU-SCH-77121', 'Institution admin · School B (Green Hills Academy)'],
  ['BOU-ORG-UNI-00001', 'Institution admin · University (Kigali Institute of Technology)'],
  ['BOU-GDN-00001', 'Parent / Guardian (Josephine — children at School A & School B)'],
  ['BOU-GOV-00042', 'Government (MINEDUC)'],
  ['BOU-ADM-00001', 'Platform admin'],
]

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

        <div className="auth-demo">
          <p style={{ marginBottom: 6 }}>
            Demo sign-in codes — password <code>demo123</code> (click to fill)
          </p>
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {DEMO.map(([c, r]) => (
              <li key={c} style={{ marginBottom: 2 }}>
                <button
                  className="link-btn"
                  type="button"
                  onClick={() => {
                    setCode(c)
                    setPassword('demo123')
                    setStatus('idle')
                  }}
                >
                  {c}
                </button>{' '}
                — {r}
                {c.startsWith('BOU-GOV') && (
                  <span className="field-hint"> — code rotates on every sign-in</span>
                )}
              </li>
            ))}
          </ul>
          <p style={{ marginTop: 10 }}>
            Sign-in codes start with <code>BOU-</code>. Codes like{' '}
            <code>ORG-RW-SCH-000002</code> are <strong>institution IDs</strong>, not logins — each
            institution has its own <code>BOU-</code> admin account above.
          </p>
          <p style={{ marginTop: 8 }}>
            The <strong>Government</strong> code changes after each sign-in. Your next code is shown
            on the dashboard and in Settings → Security. If it&rsquo;s lost, an admin can read it in{' '}
            <strong>Admin → Users</strong>.
          </p>
        </div>
      </div>
    </div>
  )
}
