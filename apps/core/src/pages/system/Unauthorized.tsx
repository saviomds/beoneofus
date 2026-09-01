import { useLocation } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { ROLE_HOME, ROLE_LABEL } from '@/config/nav'
import { SystemScreen } from './SystemScreen'
import type { Role } from '@shared/types'

const roleList = (roles?: Role[]) =>
  roles && roles.length ? roles.map((r) => ROLE_LABEL[r]).join(' or ') : 'a different role'

export function Unauthorized({ needed }: { needed?: Role[] }) {
  const { user, role, organization, logout } = useAuth()
  const location = useLocation()

  return (
    <SystemScreen
      badge="403"
      tone="warning"
      title="You don’t have access to this area"
      primary={{ label: 'Go to my dashboard', to: role ? ROLE_HOME[role] : '/login' }}
      secondary={{
        label: 'Sign in with a different account',
        onClick: async () => {
          await logout()
        },
      }}
    >
      <p>
        <code style={{ fontSize: '0.8rem' }}>{location.pathname}</code> is restricted to{' '}
        <strong>{roleList(needed)}</strong>.
      </p>
      {user && (
        <p style={{ marginTop: 10 }}>
          You’re signed in as <strong>{user.name}</strong> ({ROLE_LABEL[user.role]}
          {organization ? ` · ${organization.shortName || organization.officialName}` : ''}).
        </p>
      )}
      <p style={{ marginTop: 10, color: 'var(--text-faint)', fontSize: '0.8rem' }}>
        If this is wrong, ask a platform administrator to adjust your account, or sign in with
        an account that has the required role.
      </p>
    </SystemScreen>
  )
}
