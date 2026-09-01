import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { NAV, ROLE_LABEL, ROLE_HOME } from '@/config/nav'
import { notificationService } from '@/services/notificationService'
import { searchService } from '@/services/searchService'
import type { SearchHit } from '@/services/searchService'
import { Avatar, Logo, ThemeToggle } from '@/components/ui'
import type { Notification } from '@/types'

export function PortalLayout() {
  const { user, role, organization, logout, impersonating, endSupportView } = useAuth()
  const [mobileOpen, setMobileOpen] = useState(false)
  const location = useLocation()

  useEffect(() => setMobileOpen(false), [location.pathname])

  if (!user || !role) return null
  const items = (NAV[role] ?? []).filter((i) => !i.orgType || i.orgType === organization?.organizationType)

  return (
    <div className="shell">
      {mobileOpen && <div className="scrim" onClick={() => setMobileOpen(false)} />}
      <aside className={`sidebar ${mobileOpen ? 'open' : ''}`}>
        <Link to={ROLE_HOME[role]} className="sidebar-brand">
          <Logo />
          <span className="brand-text">
            <span className="mark">BeOneOfUs</span>
            <span className="role">{ROLE_LABEL[role]}</span>
          </span>
        </Link>
        <nav className="sidebar-nav">
          {items.map((item) => (
            <div key={item.to + item.label}>
              {item.section && <div className="sidebar-section">{item.section}</div>}
              <NavLink to={item.to} end={item.to === ROLE_HOME[role]} className={({ isActive }) => (isActive ? 'active' : '')}>
                <span className="ico" aria-hidden="true">
                  {item.icon}
                </span>
                {item.label}
              </NavLink>
            </div>
          ))}
        </nav>
        <div className="sidebar-foot">
          <button className="btn btn-ghost btn-block" onClick={logout}>
            Log out
          </button>
        </div>
      </aside>

      <div className="main">
        {impersonating && (
          <div className="impersonation-bar">
            Support view — you are viewing {user.name}&rsquo;s portal (read-only intent).
            <button onClick={endSupportView}>Exit support view</button>
          </div>
        )}
        <Topbar onMenu={() => setMobileOpen(true)} />
        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

function Topbar({ onMenu }: { onMenu: () => void }) {
  const { user, role, logout } = useAuth()
  const navigate = useNavigate()
  const [notifOpen, setNotifOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [notifs, setNotifs] = useState<Notification[]>([])
  const [q, setQ] = useState('')
  const [hits, setHits] = useState<SearchHit[]>([])
  const boxRef = useRef<HTMLDivElement>(null)

  const refresh = () => {
    if (user) notificationService.forUser(user.id).then(setNotifs)
  }
  useEffect(() => {
    refresh()
    const id = window.setInterval(refresh, 15_000)
    return () => window.clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  useEffect(() => {
    if (!user || q.trim().length < 2) {
      setHits([])
      return
    }
    let active = true
    searchService.query(user, q).then((r) => active && setHits(r))
    return () => {
      active = false
    }
  }, [q, user])

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) {
        setNotifOpen(false)
        setProfileOpen(false)
      }
    }
    window.addEventListener('mousedown', onClick)
    return () => window.removeEventListener('mousedown', onClick)
  }, [])

  if (!user || !role) return null
  const unread = notifs.filter((n) => !n.read).length

  return (
    <header className="topbar" ref={boxRef}>
      <button className="icon-btn menu-toggle" onClick={onMenu} aria-label="Open menu">
        ☰
      </button>
      <div className="topbar-search">
        <input
          placeholder="Search people, reports, requests…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label="Global search"
        />
        {hits.length > 0 && (
          <div className="popover" style={{ left: 0, right: 'auto', minWidth: 320 }}>
            <div className="popover-list">
              {hits.map((h, i) => (
                <button
                  key={i}
                  className="popover-item"
                  onClick={() => {
                    setQ('')
                    setHits([])
                    navigate(h.href)
                  }}
                >
                  <strong>{h.label}</strong>
                  {h.sub}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="topbar-actions">
        <ThemeToggle />
        <div style={{ position: 'relative' }}>
          <button
            className="icon-btn"
            aria-label={`Notifications (${unread} unread)`}
            onClick={() => {
              setNotifOpen((o) => !o)
              setProfileOpen(false)
            }}
          >
            🔔
            {unread > 0 && <span className="dot">{unread}</span>}
          </button>
          {notifOpen && (
            <div className="popover">
              <div className="popover-head">
                Notifications
                <button
                  className="link-btn"
                  onClick={async () => {
                    await notificationService.markAllRead(user.id)
                    refresh()
                  }}
                >
                  Mark all read
                </button>
              </div>
              <div className="popover-list">
                {notifs.length === 0 && <div className="popover-item">You&rsquo;re all caught up.</div>}
                {notifs.slice(0, 8).map((n) => (
                  <button
                    key={n.id}
                    className={`popover-item ${n.read ? '' : 'unread'}`}
                    onClick={async () => {
                      await notificationService.markRead(n.id)
                      refresh()
                      setNotifOpen(false)
                      if (n.actionUrl) navigate(n.actionUrl)
                    }}
                  >
                    <strong>{n.title}</strong>
                    {n.message}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div style={{ position: 'relative' }}>
          <button
            className="icon-btn"
            aria-label="Account menu"
            onClick={() => {
              setProfileOpen((o) => !o)
              setNotifOpen(false)
            }}
          >
            <Avatar name={user.name} />
          </button>
          {profileOpen && (
            <div className="popover">
              <div className="popover-head" style={{ display: 'block' }}>
                {user.name}
                <div style={{ fontWeight: 400, color: 'var(--text-faint)', fontSize: '0.8rem' }}>{user.code}</div>
              </div>
              <div className="popover-list">
                <Link className="popover-item" to={`/${role === 'mentor' ? 'teacher' : role}/profile`} onClick={() => setProfileOpen(false)}>
                  <strong>Profile</strong>
                  View and edit your profile
                </Link>
                <Link className="popover-item" to={`/${role === 'mentor' ? 'teacher' : role}/settings`} onClick={() => setProfileOpen(false)}>
                  <strong>Settings</strong>
                  Preferences and security
                </Link>
                <button className="popover-item" onClick={logout}>
                  <strong>Log out</strong>
                  End this session
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
