import { Link } from 'react-router-dom'
import { ThemeToggle } from '@/components/ui'
import { WEB_URL } from '@/config/platform'

// Ecosystem nodes shown on the right-hand visual panel — identical to the
// auth screens, so the portal reads as one continuous experience end to end.
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

export function Landing() {
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

          <h1 className="landing-headline">
            One ecosystem for students, mentors, schools and institutions.
          </h1>
          <p className="login-tagline" style={{ maxWidth: 380 }}>
            Sign in to your student, mentor, school, or institution dashboard —
            or verify a credential issued on the platform.
          </p>

          <div className="landing-actions">
            <Link className="btn btn-primary btn-block" to="/login">
              Sign in
            </Link>
            <a className="btn btn-secondary btn-block" href={WEB_URL}>
              Learn more about beoneofus
            </a>
          </div>

          <div className="landing-quicklinks">
            <Link to="/register/institution">Register your institution</Link>
            <span aria-hidden="true">·</span>
            <Link to="/verify">Verify a credential</Link>
          </div>

          <div className="login-footer">
            <a href={`${WEB_URL}/privacy`} target="_blank" rel="noopener noreferrer">Privacy</a>
            <span aria-hidden="true">·</span>
            <a href={`${WEB_URL}/terms`} target="_blank" rel="noopener noreferrer">Terms</a>
            <span aria-hidden="true">·</span>
            <a href={WEB_URL}>← Back to beoneofus</a>
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
