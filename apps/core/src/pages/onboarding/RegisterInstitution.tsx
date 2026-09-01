import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useAsync } from '@/hooks/useAsync'
import { invitationService } from '@/services/invitationService'
import { AsyncView, Button, Field, TextInput, Banner } from '@/components/ui'
import { ThemeToggle } from '@/components/ui'

export function RegisterInstitution() {
  const [params] = useSearchParams()
  const token = params.get('token') ?? ''
  const invite = useAsync(() => invitationService.getByToken(token), [token])
  const [done, setDone] = useState<{ code: string; name: string } | null>(null)
  const [error, setError] = useState('')
  const [f, setF] = useState({
    representativeName: '', representativePhone: '', password: '', confirm: '',
    registrationNumber: '', province: '', district: '', city: '', address: '', phone: '', website: '',
  })

  return (
    <div className="auth-screen">
      <div style={{ position: 'fixed', top: 16, right: 16 }}><ThemeToggle /></div>
      <div className="auth-card" style={{ maxWidth: 460 }}>
        <div className="auth-logo">
          <img src="/logo/logo.png" alt="" width={34} height={34} />
          <span className="mark">BeOneOfUs</span>
        </div>
        <p className="tagline">Institution onboarding</p>

        {done ? (
          <>
            <Banner tone="success">
              <strong>{done.name}</strong> has been registered and is now <strong>awaiting platform approval</strong>.
            </Banner>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-soft)', margin: '12px 0' }}>
              Your institution administrator sign-in code is:
            </p>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '1.1rem', textAlign: 'center', margin: '8px 0 16px' }}>{done.code}</p>
            <p className="field-hint">Password: the one you just chose. You&rsquo;ll be able to sign in once an administrator approves the institution.</p>
            <Link className="btn btn-primary btn-block" to="/login" style={{ marginTop: 16 }}>Go to sign in</Link>
          </>
        ) : (
          <AsyncView data={invite} error={invite.error}>
            {(inv) => {
              if (!inv) return <Banner tone="danger">This invitation link is invalid.</Banner>
              if (inv.status !== 'PENDING') return <Banner tone="danger">This invitation is {inv.status.toLowerCase()} and can no longer be used.</Banner>
              return (
                <form
                  onSubmit={async (e) => {
                    e.preventDefault()
                    setError('')
                    if (f.password !== f.confirm) { setError('Passwords do not match.'); return }
                    try {
                      const res = await invitationService.accept(token, {
                        password: f.password, representativeName: f.representativeName, representativePhone: f.representativePhone,
                        registrationNumber: f.registrationNumber, country: 'Rwanda', province: f.province, district: f.district,
                        city: f.city, address: f.address, phone: f.phone, website: f.website,
                      })
                      setDone({ code: res.adminCode, name: res.organization.officialName })
                    } catch (err) {
                      setError(err instanceof Error ? err.message : 'Registration failed.')
                    }
                  }}
                >
                  <Banner tone="info">
                    You have been invited to register <strong>{inv.organizationName}</strong> ({inv.organizationType}).
                  </Banner>
                  {error && <Banner tone="danger">{error}</Banner>}
                  <Field label="Your name (institution representative)"><TextInput value={f.representativeName} onChange={(e) => setF((x) => ({ ...x, representativeName: e.target.value }))} required /></Field>
                  <div className="form-grid">
                    <Field label="Your phone"><TextInput value={f.representativePhone} onChange={(e) => setF((x) => ({ ...x, representativePhone: e.target.value }))} /></Field>
                    <Field label="Registration number"><TextInput value={f.registrationNumber} onChange={(e) => setF((x) => ({ ...x, registrationNumber: e.target.value }))} /></Field>
                    <Field label="Province"><TextInput value={f.province} onChange={(e) => setF((x) => ({ ...x, province: e.target.value }))} /></Field>
                    <Field label="District"><TextInput value={f.district} onChange={(e) => setF((x) => ({ ...x, district: e.target.value }))} /></Field>
                    <Field label="City"><TextInput value={f.city} onChange={(e) => setF((x) => ({ ...x, city: e.target.value }))} /></Field>
                    <Field label="Institution phone"><TextInput value={f.phone} onChange={(e) => setF((x) => ({ ...x, phone: e.target.value }))} /></Field>
                  </div>
                  <Field label="Address"><TextInput value={f.address} onChange={(e) => setF((x) => ({ ...x, address: e.target.value }))} /></Field>
                  <div className="form-grid">
                    <Field label="Choose a password" hint="At least 6 characters"><TextInput type="password" value={f.password} onChange={(e) => setF((x) => ({ ...x, password: e.target.value }))} required /></Field>
                    <Field label="Confirm password"><TextInput type="password" value={f.confirm} onChange={(e) => setF((x) => ({ ...x, confirm: e.target.value }))} required /></Field>
                  </div>
                  <Button variant="primary" type="submit" block disabled={!f.representativeName || f.password.length < 6}>
                    Complete registration
                  </Button>
                </form>
              )
            }}
          </AsyncView>
        )}
      </div>
    </div>
  )
}
