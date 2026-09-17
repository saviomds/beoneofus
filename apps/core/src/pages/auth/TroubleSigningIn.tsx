import { Link } from 'react-router-dom'
import { ThemeToggle } from '@/components/ui'
import { WEB_URL } from '@/config/platform'

// Ecosystem nodes shown on the right-hand visual panel — identical to the sign-in
// and reset-password screens, so all three auth screens read as one experience.
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

function IconHelpCircle() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M9.5 9a2.5 2.5 0 0 1 4.9.8c0 1.7-2.4 2-2.4 3.7" />
      <path d="M12 17.5h.01" />
    </svg>
  )
}

const ISSUES: Array<{ title: string; body: React.ReactNode }> = [
  {
    title: 'My code or password isn’t accepted',
    body: (
      <>
        Your sign-in code follows the pattern <code>BOU-ROLE-XXXXX</code> (e.g.{' '}
        <code>BOU-STU-10231</code>) — check for a typo, and make sure you’re not
        entering an institution ID (<code>ORG-…</code>), which can’t sign in directly.
      </>
    ),
  },
  {
    title: 'I forgot my password',
    body: (
      <>
        Use <Link to="/forgot-password">Reset your password</Link> with your account code —
        we’ll issue a one-time reset token.
      </>
    ),
  },
  {
    title: 'I lost my account code',
    body: 'Ask your school or organization admin to look it up for you — they can see every account code for your institution.',
  },
  {
    title: 'My account is inactive or suspended',
    body: 'Contact your institution’s admin, or reach our support team below and we’ll help sort it out.',
  },
]

export function TroubleSigningIn() {
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
          <p className="login-tagline">Trouble signing in? Let&rsquo;s get you back into your account.</p>
          <Link className="login-back" to="/login">← Back to sign in</Link>

          <div className="help-list">
            {ISSUES.map((issue) => (
              <div className="help-item" key={issue.title}>
                <span className="help-item-icon" aria-hidden="true"><IconHelpCircle /></span>
                <div>
                  <p className="help-item-title">{issue.title}</p>
                  <p className="help-item-body">{issue.body}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="help-contact">
            <p className="help-contact-title">Still stuck?</p>
            <p className="help-contact-body">
              Our support team replies within 24 hours at{' '}
              <a href="mailto:support@beoneofus.work?subject=Trouble%20signing%20in">support@beoneofus.work</a>.
            </p>
            <a
              className="btn btn-primary btn-block"
              href="mailto:support@beoneofus.work?subject=Trouble%20signing%20in"
              style={{ marginTop: 12 }}
            >
              Email support
            </a>
          </div>

          <div className="login-footer">
            <a href={`${WEB_URL}/privacy`} target="_blank" rel="noopener noreferrer">Privacy</a>
            <span aria-hidden="true">·</span>
            <a href={`${WEB_URL}/terms`} target="_blank" rel="noopener noreferrer">Terms</a>
            <span aria-hidden="true">·</span>
            <Link to="/login">Back to sign in</Link>
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
