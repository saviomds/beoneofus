import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { ROLE_HOME, ROLE_LABEL } from '@/config/nav'
import { SystemScreen } from './SystemScreen'
import { PageHeader, Card, EmptyState, Button } from '@/components/ui'

export function NotFound() {
  const { role } = useAuth()
  const location = useLocation()

  return (
    <SystemScreen
      badge="404"
      title="We couldn’t find that page"
      primary={{ label: role ? 'Go to my dashboard' : 'Go to sign in', to: role ? ROLE_HOME[role] : '/login' }}
      secondary={role ? undefined : { label: 'Sign in', to: '/login' }}
    >
      <p>
        There’s no page at <code style={{ fontSize: '0.8rem' }}>{location.pathname}</code>.
      </p>
      {role && (
        <p style={{ marginTop: 10, color: 'var(--text-faint)', fontSize: '0.8rem' }}>
          Use the sidebar in your {ROLE_LABEL[role]} portal, or the search box in the top bar,
          to find what you need.
        </p>
      )}
    </SystemScreen>
  )
}

/** In-shell 404 for unknown routes inside a portal (keeps the sidebar/topbar). */
export function PortalNotFound() {
  const { role } = useAuth()
  const location = useLocation()
  return (
    <div className="section-stack">
      <PageHeader title="Page not found" description={`There’s no page at ${location.pathname}.`} />
      <Card>
        <div className="card-body">
          <EmptyState
            title="404 — nothing here"
            description="This route doesn’t exist in your portal. It may have moved, or the link is mistyped."
            action={
              <Link to={role ? ROLE_HOME[role] : '/login'}>
                <Button variant="primary">Back to dashboard</Button>
              </Link>
            }
          />
        </div>
      </Card>
    </div>
  )
}
