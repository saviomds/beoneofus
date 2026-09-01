import { useAuth } from '@/context/AuthContext'
import { SystemScreen } from './SystemScreen'

export function AccountInactive() {
  const { user, logout } = useAuth()
  return (
    <SystemScreen
      badge="Access paused"
      tone="danger"
      title={`This account is ${user?.status ?? 'inactive'}`}
      primary={{ label: 'Return to sign in', onClick: () => logout() }}
    >
      <p>
        A platform administrator has set your account to <strong>{user?.status}</strong>. Please
        contact platform support to restore access.
      </p>
    </SystemScreen>
  )
}
