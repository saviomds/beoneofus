import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth, useCurrentUser } from '@/context/AuthContext'
import { useAsync } from '@/hooks/useAsync'
import { userService } from '@/services/userService'
import { auditService } from '@/services/auditService'
import { analyticsService } from '@/services/analyticsService'
import { directoryService } from '@/services/directoryService'
import { reportService } from '@/services/reportService'
import { requestService } from '@/services/requestService'
import { announcementService } from '@/services/announcementService'
import { notificationService } from '@/services/notificationService'
import { studentService } from '@/services/studentService'
import { ROLE_PERMISSIONS, ROLES } from '@/services/rbac'
import { ROLE_HOME } from '@/config/nav'
import {
  AsyncView, Button, Card, CardHeader, DataTable, EmptyState, Field, PageHeader, Select,
  StatCard, StatusBadge, TextArea, TextInput, BarChart, useToast, formatDate, formatDateTime, MetaList, Chips,
} from '@/components/ui'
import type { Role, SafeUser, UserStatus } from '@/types'

/* -------------------------------------------------------------- Dashboard */

export function AdminDashboard() {
  const user = useCurrentUser()
  const counts = useAsync(() => userService.counts(user), [user.id])
  const platform = useAsync(() => analyticsService.platform(user), [user.id])
  const audit = useAsync(() => auditService.list().then((r) => r.slice(0, 8)), [user.id])

  return (
    <div className="section-stack">
      <PageHeader title="Platform Administration" description="System-wide control centre." />
      <AsyncView data={counts.data} error={counts.error} onRetry={counts.reload}>
        {(c) => (
          <div className="stat-grid">
            <StatCard label="Total users" value={c.total} delta={{ text: `${c.active} active` }} />
            <StatCard label="Pending approvals" value={c.pending} />
            <StatCard label="Suspended" value={c.suspended} />
            <StatCard label="Students" value={c.students} />
            <StatCard label="Teachers" value={c.teachers} />
            <StatCard label="Mentors" value={c.mentors} />
            <StatCard label="Schools" value={c.schools} />
            <StatCard label="Government" value={c.government} />
          </div>
        )}
      </AsyncView>
      <div className="grid-2">
        <Card>
          <CardHeader title="Platform activity (7 days)" />
          <div className="card-body">
            <AsyncView data={platform.data}>{(p) => <BarChart data={p.activityByDay} />}</AsyncView>
          </div>
        </Card>
        <Card>
          <CardHeader title="Top actions" />
          <div className="card-body">
            <AsyncView data={platform.data}>
              {(p) => (
                <table className="data"><tbody>
                  {p.topActions.map((a) => <tr key={a.action}><td><strong>{a.action.replace(/_/g, ' ')}</strong></td><td>{a.count}</td></tr>)}
                </tbody></table>
              )}
            </AsyncView>
          </div>
        </Card>
      </div>
      <Card>
        <CardHeader title="Recent activity" />
        <div className="card-body">
          <AsyncView data={audit.data}>
            {(rows) => (
              <table className="data"><tbody>
                {rows.map((r) => (
                  <tr key={r.id}><td><strong>{r.action.replace(/_/g, ' ')}</strong></td><td>{r.actorId}</td><td>{formatDateTime(r.timestamp)}</td></tr>
                ))}
              </tbody></table>
            )}
          </AsyncView>
        </div>
      </Card>
    </div>
  )
}

/* -------------------------------------------------------------- Users */

export function AdminUsers() {
  const admin = useCurrentUser()
  const { startSupportView } = useAuth()
  const navigate = useNavigate()
  const toast = useToast()
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState<SafeUser | null>(null)
  const users = useAsync(() => userService.list(admin), [admin.id])

  return (
    <div className="section-stack">
      <PageHeader title="Users" description="Create, edit and manage every account on the platform." actions={<Button variant="primary" onClick={() => setCreating(true)}>Create user</Button>} />
      <Card>
        <div className="card-body">
          <AsyncView data={users} isEmpty={(d) => d.length === 0} empty={<EmptyState title="No users" />}>
            {(list) => (
              <DataTable
                rows={list}
                getKey={(u) => u.id}
                searchable={(u) => `${u.name} ${u.code} ${u.email}`}
                filters={[
                  { key: 'role', label: 'Role', options: ROLES, match: (u, v) => u.role === v },
                  { key: 'status', label: 'Status', options: ['active', 'pending', 'suspended', 'inactive', 'archived'], match: (u, v) => u.status === v },
                ]}
                columns={[
                  { key: 'name', header: 'Name', render: (u) => <strong>{u.name}</strong>, sortValue: (u) => u.name },
                  { key: 'code', header: 'Code', render: (u) => u.code },
                  { key: 'role', header: 'Role', render: (u) => u.role },
                  { key: 'status', header: 'Status', render: (u) => <StatusBadge status={u.status} /> },
                  { key: 'last', header: 'Last login', render: (u) => formatDate(u.lastLogin), sortValue: (u) => u.lastLogin ?? '' },
                ]}
                rowActions={(u) => (
                  <>
                    <Button size="sm" variant="ghost" onClick={() => setEditing(u)}>Edit</Button>
                    {u.status === 'active' ? (
                      <Button size="sm" variant="ghost" disabled={u.id === admin.id} onClick={async () => { await userService.setStatus(admin, u.id, 'suspended'); toast.push('User suspended'); users.reload() }}>Suspend</Button>
                    ) : (
                      <Button size="sm" variant="ghost" onClick={async () => { await userService.setStatus(admin, u.id, 'active'); toast.push('User activated', 'success'); users.reload() }}>Activate</Button>
                    )}
                    {u.id !== admin.id && u.status === 'active' && (
                      <Button size="sm" variant="ghost" onClick={() => { startSupportView(u); navigate(ROLE_HOME[u.role]) }}>Support view</Button>
                    )}
                  </>
                )}
              />
            )}
          </AsyncView>
        </div>
      </Card>

      {creating && <UserModal title="Create user" onClose={() => setCreating(false)} onSave={async (f) => { await userService.create(admin, f); toast.push('User created', 'success'); setCreating(false); users.reload() }} />}
      {editing && (
        <UserModal
          title={`Edit ${editing.name}`}
          initial={editing}
          onClose={() => setEditing(null)}
          onSave={async (f) => {
            await userService.update(admin, editing.id, { name: f.name, email: f.email, phone: f.phone, role: f.role, status: f.status })
            toast.push('User updated', 'success'); setEditing(null); users.reload()
          }}
        />
      )}
    </div>
  )
}

function UserModal({
  title, initial, onClose, onSave,
}: {
  title: string
  initial?: SafeUser
  onClose: () => void
  onSave: (f: { name: string; email: string; phone: string; role: Role; status: UserStatus }) => void
}) {
  const [f, setF] = useState({
    name: initial?.name ?? '',
    email: initial?.email ?? '',
    phone: initial?.phone ?? '',
    role: (initial?.role ?? 'student') as Role,
    status: (initial?.status ?? 'pending') as UserStatus,
  })
  return (
    <div className="modal-scrim" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={title}>
        <div className="modal-head"><h2>{title}</h2><button className="icon-btn" onClick={onClose}>✕</button></div>
        <form onSubmit={(e) => { e.preventDefault(); onSave(f) }}>
          <div className="modal-body">
            <Field label="Name"><TextInput value={f.name} onChange={(e) => setF((x) => ({ ...x, name: e.target.value }))} required /></Field>
            <div className="form-grid">
              <Field label="Email"><TextInput type="email" value={f.email} onChange={(e) => setF((x) => ({ ...x, email: e.target.value }))} /></Field>
              <Field label="Phone"><TextInput value={f.phone} onChange={(e) => setF((x) => ({ ...x, phone: e.target.value }))} /></Field>
              <Field label="Role">
                <Select value={f.role} onChange={(e) => setF((x) => ({ ...x, role: e.target.value as Role }))}>
                  {ROLES.map((r) => <option key={r}>{r}</option>)}
                </Select>
              </Field>
              <Field label="Status">
                <Select value={f.status} onChange={(e) => setF((x) => ({ ...x, status: e.target.value as UserStatus }))}>
                  {['active', 'pending', 'suspended', 'inactive', 'archived'].map((s) => <option key={s}>{s}</option>)}
                </Select>
              </Field>
            </div>
            {!initial && <p className="field-hint">New accounts are created with the password <code>demo123</code>.</p>}
          </div>
          <div className="modal-foot"><Button variant="ghost" type="button" onClick={onClose}>Cancel</Button><Button variant="primary" type="submit">Save</Button></div>
        </form>
      </div>
    </div>
  )
}

/* -------------------------------------------------------------- Registries (read-only) */

export function AdminStudents() {
  const admin = useCurrentUser()
  const rows = useAsync(() => studentService.list(admin), [admin.id])
  return (
    <RegistryPage title="Students" description="All student records across schools.">
      <AsyncView data={rows} isEmpty={(d) => d.length === 0} empty={<EmptyState title="No students" />}>
        {(list) => (
          <DataTable
            rows={list}
            getKey={(s) => s.id}
            searchable={(s) => `${s.firstName} ${s.lastName} ${s.studentNumber}`}
            filters={[{ key: 'status', label: 'Status', options: ['active', 'inactive', 'archived'], match: (s, v) => s.status === v }]}
            columns={[
              { key: 'name', header: 'Student', render: (s) => <strong>{s.firstName} {s.lastName}</strong> },
              { key: 'no', header: 'ID', render: (s) => s.studentNumber },
              { key: 'grade', header: 'Grade', render: (s) => s.gradeLevel },
              { key: 'school', header: 'School', render: (s) => s.schoolId },
              { key: 'status', header: 'Status', render: (s) => <StatusBadge status={s.status} /> },
            ]}
          />
        )}
      </AsyncView>
    </RegistryPage>
  )
}

export function AdminTeachers() {
  const admin = useCurrentUser()
  const rows = useAsync(() => directoryService.teachers(), [admin.id])
  return (
    <RegistryPage title="Teachers" description="All teaching staff.">
      <AsyncView data={rows} isEmpty={(d) => d.length === 0} empty={<EmptyState title="No teachers" />}>
        {(list) => (
          <DataTable rows={list} getKey={(t) => t.id} searchable={(t) => `${t.firstName} ${t.lastName}`}
            columns={[
              { key: 'name', header: 'Teacher', render: (t) => <strong>{t.firstName} {t.lastName}</strong> },
              { key: 'school', header: 'School', render: (t) => t.schoolId },
              { key: 'subjects', header: 'Subjects', render: (t) => t.subjects.join(', ') },
              { key: 'status', header: 'Status', render: (t) => <StatusBadge status={t.status} /> },
            ]} />
        )}
      </AsyncView>
    </RegistryPage>
  )
}

export function AdminMentors() {
  const admin = useCurrentUser()
  const rows = useAsync(() => directoryService.mentors(), [admin.id])
  return (
    <RegistryPage title="Mentors" description="All mentors.">
      <AsyncView data={rows} isEmpty={(d) => d.length === 0} empty={<EmptyState title="No mentors" />}>
        {(list) => (
          <DataTable rows={list} getKey={(m) => m.id}
            columns={[
              { key: 'spec', header: 'Specialisation', render: (m) => <strong>{m.specialization}</strong> },
              { key: 'mentees', header: 'Mentees', render: (m) => m.assignedStudentIds.length },
              { key: 'status', header: 'Status', render: (m) => <StatusBadge status={m.status} /> },
            ]} />
        )}
      </AsyncView>
    </RegistryPage>
  )
}

export function AdminSchools() {
  const admin = useCurrentUser()
  const rows = useAsync(() => directoryService.schools(), [admin.id])
  return (
    <RegistryPage title="Schools" description="All registered institutions.">
      <AsyncView data={rows} isEmpty={(d) => d.length === 0} empty={<EmptyState title="No schools" />}>
        {(list) => (
          <DataTable rows={list} getKey={(s) => s.id} searchable={(s) => `${s.officialName} ${s.district}`}
            columns={[
              { key: 'name', header: 'Institution', render: (s) => <strong>{s.officialName}</strong> },
              { key: 'code', header: 'Code', render: (s) => s.organizationCode },
              { key: 'type', header: 'Type', render: (s) => s.organizationType },
              { key: 'district', header: 'District', render: (s) => s.district },
              { key: 'status', header: 'Status', render: (s) => <StatusBadge status={s.status} /> },
            ]} />
        )}
      </AsyncView>
    </RegistryPage>
  )
}

export function AdminGovernment() {
  const admin = useCurrentUser()
  const rows = useAsync(() => userService.list(admin, { role: 'government' }), [admin.id])
  return (
    <RegistryPage title="Government" description="Government accounts.">
      <AsyncView data={rows} isEmpty={(d) => d.length === 0} empty={<EmptyState title="No government accounts" />}>
        {(list) => (
          <DataTable rows={list} getKey={(u) => u.id}
            columns={[
              { key: 'name', header: 'Account', render: (u) => <strong>{u.name}</strong> },
              { key: 'code', header: 'Code', render: (u) => u.code },
              { key: 'status', header: 'Status', render: (u) => <StatusBadge status={u.status} /> },
            ]} />
        )}
      </AsyncView>
    </RegistryPage>
  )
}

function RegistryPage({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <div className="section-stack">
      <PageHeader title={title} description={description} />
      <Card><div className="card-body">{children}</div></Card>
    </div>
  )
}

/* -------------------------------------------------------------- Oversight: reports / requests */

export function AdminReports() {
  const admin = useCurrentUser()
  const rows = useAsync(() => reportService.list(admin), [admin.id])
  return (
    <RegistryPage title="Reports" description="Every report on the platform.">
      <AsyncView data={rows} isEmpty={(d) => d.length === 0} empty={<EmptyState title="No reports" />}>
        {(list) => (
          <DataTable rows={list} getKey={(r) => r.id} searchable={(r) => `${r.subject} ${r.reference}`}
            filters={[{ key: 'status', label: 'Status', options: [...new Set(list.map((r) => r.status))], match: (r, v) => r.status === v }]}
            columns={[
              { key: 'subject', header: 'Report', render: (r) => <strong>{r.subject}</strong> },
              { key: 'ref', header: 'Reference', render: (r) => r.reference },
              { key: 'type', header: 'Type', render: (r) => r.type },
              { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
              { key: 'date', header: 'Created', render: (r) => formatDate(r.createdAt), sortValue: (r) => r.createdAt },
            ]} />
        )}
      </AsyncView>
    </RegistryPage>
  )
}

export function AdminRequests() {
  const admin = useCurrentUser()
  const rows = useAsync(() => requestService.list(admin), [admin.id])
  return (
    <RegistryPage title="Requests" description="Every school→government request.">
      <AsyncView data={rows} isEmpty={(d) => d.length === 0} empty={<EmptyState title="No requests" />}>
        {(list) => (
          <DataTable rows={list} getKey={(r) => r.id} searchable={(r) => `${r.title} ${r.reference}`}
            filters={[{ key: 'status', label: 'Status', options: [...new Set(list.map((r) => r.status))], match: (r, v) => r.status === v }]}
            columns={[
              { key: 'title', header: 'Request', render: (r) => <strong>{r.title}</strong> },
              { key: 'ref', header: 'Reference', render: (r) => r.reference },
              { key: 'priority', header: 'Priority', render: (r) => <StatusBadge status={r.priority} /> },
              { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
            ]} />
        )}
      </AsyncView>
    </RegistryPage>
  )
}

/* -------------------------------------------------------------- Content / Notifications */

export function AdminContent() {
  const admin = useCurrentUser()
  const toast = useToast()
  const rows = useAsync(() => announcementService.feedFor(admin), [admin.id])
  return (
    <RegistryPage title="Content" description="Announcements across every scope.">
      <AsyncView data={rows} isEmpty={(d) => d.length === 0} empty={<EmptyState title="No announcements" />}>
        {(list) => (
          <DataTable rows={list} getKey={(a) => a.id} searchable={(a) => a.title}
            columns={[
              { key: 'title', header: 'Title', render: (a) => <strong>{a.pinned ? '📌 ' : ''}{a.title}</strong> },
              { key: 'scope', header: 'Scope', render: (a) => a.scope },
              { key: 'priority', header: 'Priority', render: (a) => <StatusBadge status={a.priority} /> },
              { key: 'date', header: 'Published', render: (a) => formatDate(a.createdAt), sortValue: (a) => a.createdAt },
            ]}
            rowActions={(a) => (
              <Button size="sm" variant="ghost" onClick={async () => { await announcementService.remove(admin, a.id); toast.push('Removed'); rows.reload() }}>Remove</Button>
            )}
          />
        )}
      </AsyncView>
    </RegistryPage>
  )
}

export function AdminNotifications() {
  const toast = useToast()
  const [f, setF] = useState({ audience: 'all' as Role | 'all', title: '', message: '' })
  return (
    <div className="section-stack">
      <PageHeader title="Notifications" description="Broadcast a notification to a role or the whole platform." />
      <Card>
        <CardHeader title="New broadcast" />
        <form className="card-body" onSubmit={async (e) => {
          e.preventDefault()
          const { sent } = await notificationService.broadcast(f.audience, f.title, f.message)
          toast.push(`Sent to ${sent} users`, 'success')
          setF({ audience: 'all', title: '', message: '' })
        }}>
          <Field label="Audience">
            <Select value={f.audience} onChange={(e) => setF((x) => ({ ...x, audience: e.target.value as Role | 'all' }))}>
              <option value="all">Everyone</option>
              {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
            </Select>
          </Field>
          <Field label="Title"><TextInput value={f.title} onChange={(e) => setF((x) => ({ ...x, title: e.target.value }))} required /></Field>
          <Field label="Message"><TextArea value={f.message} onChange={(e) => setF((x) => ({ ...x, message: e.target.value }))} required /></Field>
          <Button variant="primary" type="submit" disabled={!f.title.trim() || !f.message.trim()}>Send broadcast</Button>
        </form>
      </Card>
    </div>
  )
}

/* -------------------------------------------------------------- Audit / System */

export function AdminAudit() {
  const admin = useCurrentUser()
  const rows = useAsync(() => auditService.list(), [admin.id])
  return (
    <RegistryPage title="Audit Logs" description="Every recorded action on the platform.">
      <AsyncView data={rows} isEmpty={(d) => d.length === 0} empty={<EmptyState title="No audit entries" />}>
        {(list) => (
          <DataTable
            rows={list}
            getKey={(r) => r.id}
            searchable={(r) => `${r.action} ${r.actorId} ${r.targetId ?? ''} ${r.targetType ?? ''}`}
            filters={[
              { key: 'action', label: 'Action', options: [...new Set(list.map((r) => r.action))], match: (r, v) => r.action === v },
              { key: 'role', label: 'Actor role', options: [...new Set(list.map((r) => r.actorRole))], match: (r, v) => r.actorRole === v },
            ]}
            columns={[
              { key: 'action', header: 'Action', render: (r) => <strong>{r.action.replace(/_/g, ' ')}</strong> },
              { key: 'actor', header: 'Actor', render: (r) => `${r.actorId} (${r.actorRole})` },
              { key: 'target', header: 'Target', render: (r) => (r.targetId ? `${r.targetId} · ${r.targetType}` : '—') },
              { key: 'when', header: 'When', render: (r) => formatDateTime(r.timestamp), sortValue: (r) => r.timestamp },
            ]}
          />
        )}
      </AsyncView>
    </RegistryPage>
  )
}

export function AdminSystem() {
  const admin = useCurrentUser()
  const platform = useAsync(() => analyticsService.platform(admin), [admin.id])
  const [role, setRole] = useState<Role>('school')
  return (
    <div className="section-stack">
      <PageHeader title="System" description="Health, configuration and the role/permission model." />
      <AsyncView data={platform.data}>
        {(p) => (
          <div className="stat-grid">
            <StatCard label="Audit events" value={p.totals.events} />
            <StatCard label="Students" value={p.totals.students} />
            <StatCard label="Teachers" value={p.totals.teachers} />
          </div>
        )}
      </AsyncView>
      <Card>
        <CardHeader title="Service health" subtitle="Illustrative — this demo has no external services" />
        <div className="card-body">
          <table className="data"><tbody>
            {[['Application', 'healthy'], ['Local data store', 'healthy'], ['Authentication', 'healthy'], ['Audit trail', 'healthy']].map(([s, st]) => (
              <tr key={s}><td><strong>{s}</strong></td><td><StatusBadge status={st} /></td></tr>
            ))}
          </tbody></table>
        </div>
      </Card>
      <Card>
        <CardHeader title="Role / permission model" action={
          <Select value={role} onChange={(e) => setRole(e.target.value as Role)} style={{ width: 'auto' }}>
            {ROLES.map((r) => <option key={r}>{r}</option>)}
          </Select>
        } />
        <div className="card-body">
          <MetaList items={[{ label: 'Role', value: role }, { label: 'Permission count', value: ROLE_PERMISSIONS[role].length }]} />
          <div style={{ marginTop: 12 }}><Chips items={[...ROLE_PERMISSIONS[role]]} /></div>
        </div>
      </Card>
    </div>
  )
}
