import { useState } from 'react'
import { useAuth, useCurrentUser } from '@/context/AuthContext'
import { useAsync } from '@/hooks/useAsync'
import { notificationService } from '@/services/notificationService'
import { messageService } from '@/services/messageService'
import { settingsService } from '@/services/settingsService'
import { authService } from '@/services/authService'
import {
  AsyncView, Button, Card, CardHeader, EmptyState, PageHeader, StatusBadge, Field, Select,
  TextInput, TextArea, useToast, formatDateTime, Avatar, Banner,
} from '@/components/ui'
import { useTheme } from '@/lib/theme'
import type { Message, SafeUser } from '@/types'

/* ---------------------------------------------------------------- Notifications */

export function NotificationsPage() {
  const user = useCurrentUser()
  const toast = useToast()
  const [filter, setFilter] = useState('All')
  const { data, reload } = useAsync(() => notificationService.forUser(user.id), [user.id])

  const types = ['All', 'system', 'academic', 'attendance', 'mentorship', 'report', 'government', 'request', 'message', 'security']

  return (
    <div className="section-stack">
      <PageHeader
        title="Notifications"
        description="Everything that needs your attention across the ecosystem."
        actions={
          <Button
            onClick={async () => {
              await notificationService.markAllRead(user.id)
              toast.push('All notifications marked as read', 'success')
              reload()
            }}
          >
            Mark all read
          </Button>
        }
      />
      <Card>
        <div className="card-body">
          <div className="toolbar">
            <Select value={filter} onChange={(e) => setFilter(e.target.value)} aria-label="Filter by type">
              {types.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </Select>
          </div>
          <AsyncView data={data} isEmpty={(d) => d.length === 0} empty={<EmptyState title="No notifications yet" />}>
            {(rows) => {
              const filtered = rows.filter((n) => filter === 'All' || n.type === filter)
              if (filtered.length === 0) return <EmptyState title="Nothing matches that filter" />
              return (
                <div className="timeline">
                  {filtered.map((n) => (
                    <div className="timeline-item" key={n.id}>
                      <div className="timeline-dot" style={{ borderColor: n.read ? 'var(--border-strong)' : 'var(--brand)' }} />
                      <div className="timeline-body" style={{ flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                          <strong>{n.title}</strong>
                          <StatusBadge status={n.type} />
                        </div>
                        <p style={{ color: 'var(--text-soft)', margin: '4px 0' }}>{n.message}</p>
                        <div className="when">{formatDateTime(n.createdAt)}</div>
                        <div className="row-actions" style={{ marginTop: 8 }}>
                          {!n.read && (
                            <Button size="sm" variant="ghost" onClick={async () => { await notificationService.markRead(n.id); reload() }}>
                              Mark read
                            </Button>
                          )}
                          {n.actionUrl && (
                            <a className="btn btn-ghost btn-sm" href={n.actionUrl}>
                              Open
                            </a>
                          )}
                          <Button size="sm" variant="ghost" onClick={async () => { await notificationService.remove(n.id); reload() }}>
                            Dismiss
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )
            }}
          </AsyncView>
        </div>
      </Card>
    </div>
  )
}

/* ---------------------------------------------------------------- Messages */

export function MessagesPage() {
  const user = useCurrentUser()
  const toast = useToast()
  const [activeId, setActiveId] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const [composing, setComposing] = useState(false)

  const convos = useAsync(() => messageService.conversations(user), [user.id])
  const thread = useAsync<Message[]>(() => (activeId ? messageService.thread(user, activeId) : Promise.resolve([])), [activeId])

  return (
    <div className="section-stack">
      <PageHeader
        title="Messages"
        description="Conversations with the people you're authorised to contact."
        actions={<Button variant="primary" onClick={() => setComposing(true)}>New message</Button>}
      />
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(220px, 300px) 1fr', gap: 16 }}>
        <Card>
          <div className="card-body-flush">
            <AsyncView data={convos.data} isEmpty={(d) => d.length === 0} empty={<EmptyState title="No conversations" />}>
              {(list) => (
                <div className="popover-list" style={{ maxHeight: 'none' }}>
                  {list.map((c) => (
                    <button
                      key={c.id}
                      className={`popover-item ${c.unread ? 'unread' : ''}`}
                      onClick={() => setActiveId(c.id)}
                    >
                      <strong>{c.others.map((o) => o.name).join(', ') || c.subject}</strong>
                      {c.last?.body?.slice(0, 60) ?? c.subject}
                    </button>
                  ))}
                </div>
              )}
            </AsyncView>
          </div>
        </Card>

        <Card>
          <div className="card-body">
            {!activeId ? (
              <EmptyState title="Select a conversation" description="Choose a thread on the left, or start a new message." />
            ) : (
              <>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
                  {(thread.data ?? []).map((m) => (
                    <div
                      key={m.id}
                      style={{
                        alignSelf: m.senderId === user.id ? 'flex-end' : 'flex-start',
                        background: m.senderId === user.id ? 'var(--brand-soft)' : 'var(--surface-2)',
                        padding: '8px 12px',
                        borderRadius: 10,
                        maxWidth: '75%',
                      }}
                    >
                      <div style={{ fontSize: '0.9rem' }}>{m.body}</div>
                      <div className="when" style={{ fontSize: '0.7rem', color: 'var(--text-faint)' }}>{formatDateTime(m.createdAt)}</div>
                    </div>
                  ))}
                </div>
                <form
                  style={{ display: 'flex', gap: 8 }}
                  onSubmit={async (e) => {
                    e.preventDefault()
                    if (!draft.trim()) return
                    await messageService.send(user, activeId, draft.trim())
                    setDraft('')
                    thread.reload()
                    convos.reload()
                  }}
                >
                  <TextInput value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Write a message…" />
                  <Button variant="primary" type="submit">Send</Button>
                </form>
              </>
            )}
          </div>
        </Card>
      </div>

      {composing && (
        <ComposeModal
          user={user}
          onClose={() => setComposing(false)}
          onSent={(id) => {
            setComposing(false)
            setActiveId(id)
            convos.reload()
            toast.push('Message sent', 'success')
          }}
        />
      )}
    </div>
  )
}

function ComposeModal({ user, onClose, onSent }: { user: SafeUser; onClose: () => void; onSent: (conversationId: string) => void }) {
  const contacts = useAsync(() => messageService.contactsFor(user), [user.id])
  const [to, setTo] = useState('')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [error, setError] = useState('')

  return (
    <div className="modal-scrim" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-label="New message">
        <div className="modal-head">
          <h2>New message</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <form
          onSubmit={async (e) => {
            e.preventDefault()
            setError('')
            try {
              const conv = await messageService.startConversation(user, to, subject || '(no subject)', body)
              onSent(conv.id)
            } catch (err) {
              setError(err instanceof Error ? err.message : 'Could not send.')
            }
          }}
        >
          <div className="modal-body">
            {error && <div className="banner banner-danger">{error}</div>}
            <Field label="Recipient">
              <Select value={to} onChange={(e) => setTo(e.target.value)} required>
                <option value="">Select a contact…</option>
                {(contacts.data ?? []).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} · {c.role}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Subject">
              <TextInput value={subject} onChange={(e) => setSubject(e.target.value)} />
            </Field>
            <Field label="Message">
              <TextArea value={body} onChange={(e) => setBody(e.target.value)} required />
            </Field>
          </div>
          <div className="modal-foot">
            <Button variant="ghost" type="button" onClick={onClose}>Cancel</Button>
            <Button variant="primary" type="submit" disabled={!to || !body.trim()}>Send</Button>
          </div>
        </form>
      </div>
    </div>
  )
}

/* ---------------------------------------------------------------- Settings */

export function SettingsPage() {
  const user = useCurrentUser()
  const toast = useToast()
  const theme = useTheme()
  const { data, setData } = useAsync(() => settingsService.forActor(user), [user.id])

  return (
    <div className="section-stack">
      <PageHeader title="Settings" description="Preferences for your account and workspace." />
      <AsyncView data={data}>
        {(record) => (
          <Card>
            <CardHeader title="Preferences" subtitle={`Scope: ${record.scope}`} />
            <div className="card-body">
              {Object.entries(record.values).map(([key, value]) => {
                if (key === 'theme') {
                  return (
                    <Field key={key} label="Theme" hint="Also toggled from the top bar. Saved per browser.">
                      <Select
                        value={theme.choice}
                        onChange={(e) => {
                          const v = e.target.value as 'system' | 'light' | 'dark'
                          theme.setTheme(v)
                          setData((p) => ({ ...p!, values: { ...p!.values, theme: v } }))
                        }}
                      >
                        <option value="system">System</option>
                        <option value="light">Light</option>
                        <option value="dark">Dark</option>
                      </Select>
                    </Field>
                  )
                }
                if (typeof value === 'boolean') {
                  return (
                    <label key={key} className="setting-row" style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                      <span style={{ textTransform: 'capitalize' }}>{key.replace(/([A-Z])/g, ' $1')}</span>
                      <input
                        type="checkbox"
                        checked={value}
                        onChange={(e) => setData((p) => ({ ...p!, values: { ...p!.values, [key]: e.target.checked } }))}
                      />
                    </label>
                  )
                }
                return (
                  <Field key={key} label={key.replace(/([A-Z])/g, ' $1')}>
                    <TextInput
                      value={String(value)}
                      onChange={(e) => setData((p) => ({ ...p!, values: { ...p!.values, [key]: e.target.value } }))}
                    />
                  </Field>
                )
              })}
              <Button
                variant="primary"
                style={{ marginTop: 16 }}
                onClick={async () => {
                  await settingsService.save(user, record.values)
                  toast.push('Settings saved', 'success')
                }}
              >
                Save settings
              </Button>
            </div>
          </Card>
        )}
      </AsyncView>

      <SecurityCard />
    </div>
  )
}

function SecurityCard() {
  const user = useCurrentUser()
  const { refreshUser } = useAuth()
  const toast = useToast()
  const [cur, setCur] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  const rotates = user.role === 'government'

  return (
    <Card>
      <CardHeader title="Security" subtitle="Access code and password" />
      <div className="card-body">
        <Field label="Your access code">
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <code style={{ fontSize: '0.95rem' }}>{user.code}</code>
            {rotates && (
              <Button
                size="sm"
                variant="secondary"
                onClick={async () => {
                  const code = await authService.rotateCode(user)
                  await refreshUser()
                  toast.push(`New access code: ${code}`, 'success')
                }}
              >
                Rotate now
              </Button>
            )}
          </div>
        </Field>
        {rotates && (
          <Banner tone="info">
            This is a government account: your access code is <strong>regenerated on every
            sign-in</strong>. Note the code above &mdash; you&rsquo;ll need it next time. Your
            password does not change unless you change it below.
          </Banner>
        )}

        <h3 style={{ fontSize: '0.9rem', margin: '18px 0 10px' }}>Change password</h3>
        {err && <Banner tone="danger">{err}</Banner>}
        <form
          onSubmit={async (e) => {
            e.preventDefault()
            setErr('')
            if (next !== confirm) {
              setErr('The new passwords do not match.')
              return
            }
            setBusy(true)
            try {
              await authService.changePassword(user, cur, next)
              toast.push('Password changed', 'success')
              setCur('')
              setNext('')
              setConfirm('')
            } catch (e2) {
              setErr(e2 instanceof Error ? e2.message : 'Could not change password.')
            } finally {
              setBusy(false)
            }
          }}
        >
          <Field label="Current password">
            <TextInput type="password" value={cur} onChange={(e) => setCur(e.target.value)} required autoComplete="current-password" />
          </Field>
          <div className="form-grid">
            <Field label="New password" hint="At least 6 characters">
              <TextInput type="password" value={next} onChange={(e) => setNext(e.target.value)} required autoComplete="new-password" />
            </Field>
            <Field label="Confirm new password">
              <TextInput type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required autoComplete="new-password" />
            </Field>
          </div>
          <Button variant="primary" type="submit" disabled={busy || !cur || !next}>
            {busy ? 'Saving…' : 'Change password'}
          </Button>
        </form>
      </div>
    </Card>
  )
}

/* ---------------------------------------------------------------- Account profile (generic) */

export function AccountProfilePage() {
  const user = useCurrentUser()
  const { impersonating } = useAuth()
  return (
    <div className="section-stack">
      <PageHeader title="Profile" description="Your identity across the BeOneOfUs ecosystem." />
      <Card>
        <div className="card-body" style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
          <Avatar name={user.name} large />
          <div>
            <h2>{user.name}</h2>
            <p style={{ color: 'var(--text-faint)' }}>
              {user.code} · {user.role} · {user.email || 'no email on file'}
            </p>
          </div>
        </div>
      </Card>
      {impersonating && <div className="banner banner-warning">You are viewing this profile in support view.</div>}
    </div>
  )
}
