import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ThemeToggle } from '@/components/ui'
import { credentialService } from '@/services/credentialService'
import type { PublicCredentialResult } from '@/services/credentialService'

/**
 * PUBLIC credential verification — no sign-in. Shows only issuer, credential,
 * holder name, issue date and validity. Never any other student data.
 */
export function VerifyCredential() {
  const { code: codeParam } = useParams()
  const [code, setCode] = useState(codeParam ?? '')
  const [result, setResult] = useState<PublicCredentialResult | null>(null)
  const [state, setState] = useState<'idle' | 'loading' | 'done' | 'error'>(codeParam ? 'loading' : 'idle')
  const [message, setMessage] = useState('')

  async function run(value: string) {
    if (!value.trim()) return
    setState('loading')
    setMessage('')
    try {
      setResult(await credentialService.verify(value.trim()))
      setState('done')
    } catch (err) {
      setState('error')
      setMessage(err instanceof Error ? err.message : 'Verification failed.')
    }
  }

  useEffect(() => {
    if (codeParam) run(codeParam)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [codeParam])

  const valid = result?.valid
  const accent = state === 'done' ? (valid ? 'var(--success)' : 'var(--danger)') : 'var(--brand)'

  return (
    <div className="auth-screen">
      <div style={{ position: 'fixed', top: 16, right: 16 }}>
        <ThemeToggle />
      </div>
      <div className="auth-card" style={{ maxWidth: 480 }}>
        <div className="auth-logo">
          <img src="/logo/logo.png" alt="" width={30} height={30} />
          <span className="mark">BeOneOfUs</span>
        </div>
        <p className="tagline">Credential verification</p>

        <form
          onSubmit={(e) => {
            e.preventDefault()
            run(code)
          }}
        >
          <label className="field">
            <span>Verification code</span>
            <input
              className="input"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="BOU-CRD-XXXX-XXXX"
              autoComplete="off"
              required
            />
          </label>
          <button className="btn btn-primary btn-block" type="submit" disabled={state === 'loading'}>
            {state === 'loading' ? 'Checking…' : 'Verify'}
          </button>
        </form>

        {state === 'error' && (
          <div className="banner banner-danger" role="alert" style={{ marginTop: 16 }}>
            {message}
          </div>
        )}

        {state === 'done' && result && (
          <div style={{ marginTop: 20, borderTop: '1px solid var(--border)', paddingTop: 18 }}>
            <div
              aria-hidden="true"
              style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', fontWeight: 600, color: accent }}
            >
              {valid ? 'Valid credential' : result.status === 'revoked' ? 'Revoked credential' : 'Not found'}
            </div>
            {result.credentialTitle ? (
              <dl style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '6px 14px', marginTop: 12, fontSize: '0.9rem' }}>
                <dt style={{ color: 'var(--text-faint)' }}>Credential</dt>
                <dd style={{ margin: 0 }}>{result.credentialTitle}</dd>
                <dt style={{ color: 'var(--text-faint)' }}>Type</dt>
                <dd style={{ margin: 0, textTransform: 'capitalize' }}>{result.credentialType}</dd>
                <dt style={{ color: 'var(--text-faint)' }}>Holder</dt>
                <dd style={{ margin: 0 }}>{result.holderName ?? '—'}</dd>
                <dt style={{ color: 'var(--text-faint)' }}>Issued by</dt>
                <dd style={{ margin: 0 }}>{result.issuerName}</dd>
                <dt style={{ color: 'var(--text-faint)' }}>Issued</dt>
                <dd style={{ margin: 0 }}>{result.issuedDate}</dd>
                <dt style={{ color: 'var(--text-faint)' }}>Status</dt>
                <dd style={{ margin: 0, textTransform: 'capitalize' }}>{result.status}</dd>
                <dt style={{ color: 'var(--text-faint)' }}>Code</dt>
                <dd style={{ margin: 0, fontFamily: 'var(--font-mono, monospace)' }}>{result.verificationCode}</dd>
              </dl>
            ) : (
              <p style={{ fontSize: '0.9rem', color: 'var(--text-soft)', marginTop: 10 }}>
                No credential matches that verification code.
              </p>
            )}
          </div>
        )}

        <p style={{ marginTop: 20, fontSize: '0.8rem', color: 'var(--text-faint)' }}>
          This page shows only what is required to confirm a credential is genuine. <Link to="/login">Sign in</Link> for
          full institutional access.
        </p>
      </div>
    </div>
  )
}
