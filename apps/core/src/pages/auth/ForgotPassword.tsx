import { useState } from 'react'
import { Link } from 'react-router-dom'
import { authService } from '@/services/authService'

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
    <div className="auth-screen">
      <div className="auth-card">
        <span className="mark">Reset password</span>
        <p className="tagline">Enter your account code to start a reset.</p>

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
          <form onSubmit={onSubmit}>
            <label className="field">
              <span>Account code</span>
              <input
                className="input"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="BOU-STU-XXXXX"
                required
              />
            </label>
            <button className="btn btn-primary btn-block" disabled={loading}>
              {loading ? 'Working…' : 'Send reset token'}
            </button>
            <p style={{ textAlign: 'center', marginTop: 12 }}>
              <Link className="link-btn" to="/login">
                Back to sign in
              </Link>
            </p>
          </form>
        )}
      </div>
    </div>
  )
}
