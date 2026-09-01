import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useCurrentUser } from '@/context/AuthContext'
import { useAsync } from '@/hooks/useAsync'
import { governmentService } from '@/services/governmentService'
import { requestService } from '@/services/requestService'
import { reportService } from '@/services/reportService'
import { announcementService } from '@/services/announcementService'
import { auditService } from '@/services/auditService'
import { documentService } from '@/services/documentService'
import { directoryService } from '@/services/directoryService'
import {
  AsyncView, Button, Card, CardHeader, DataTable, EmptyState, Field, PageHeader, Select,
  StatCard, StatusBadge, TextArea, TextInput, BarChart, useToast, formatDate, formatDateTime, MetaList,
} from '@/components/ui'
import { RequestDetail } from '@/pages/school/SchoolPages'
import type { GovRequest } from '@/types'

/* -------------------------------------------------------------- Dashboard */

export function GovernmentDashboard() {
  const user = useCurrentUser()
  const overview = useAsync(() => governmentService.overview(user), [user.id])
  const byDistrict = useAsync(() => governmentService.byDistrict(user), [user.id])

  return (
    <div className="section-stack">
      <PageHeader title="Government Dashboard" description="Institutional oversight — aggregated statistics only, no private student data." />
      <div className="banner banner-warning" role="status">
        🔑&nbsp;<span>
          Your access code was rotated for this session. <strong>Next sign-in code: {user.code}</strong>.
          Keep it safe — it changes again next time. Manage it in <Link to="/government/settings">Settings</Link>.
        </span>
      </div>
      <AsyncView data={overview.data} error={overview.error} onRetry={overview.reload}>
        {(o) => (
          <>
            <div className="stat-grid">
              <StatCard label="Registered institutions" value={o.institutions} delta={{ text: `${o.activeInstitutions} active` }} />
              <StatCard label="Students" value={o.students.toLocaleString()} />
              <StatCard label="Teachers" value={o.teachers.toLocaleString()} />
              <StatCard label="Mentors" value={o.mentors.toLocaleString()} />
              <StatCard label="Attendance rate" value={`${o.attendanceRate}%`} />
              <StatCard label="Academic average" value={`${o.academicAverage}%`} />
              <StatCard label="Districts" value={o.districts} />
            </div>
            <Card>
              <CardHeader title="Attendance by district" action={<Link className="btn btn-ghost btn-sm" to="/government/analytics">Analytics</Link>} />
              <div className="card-body">
                <AsyncView data={byDistrict.data}>
                  {(rows) => <BarChart data={rows.map((r) => ({ label: r.district, value: r.attendanceRate }))} unit="%" />}
                </AsyncView>
              </div>
            </Card>
          </>
        )}
      </AsyncView>
    </div>
  )
}

/* -------------------------------------------------------------- Schools / Institutions */

export function GovernmentSchools() {
  const user = useCurrentUser()
  const rows = useAsync(() => governmentService.schoolStats(user), [user.id])
  return (
    <div className="section-stack">
      <PageHeader title="Schools" description="Registry of schools under your jurisdiction." />
      <Card>
        <div className="card-body">
          <AsyncView data={rows} isEmpty={(d) => d.length === 0} empty={<EmptyState title="No schools registered" />}>
            {(list) => (
              <DataTable
                rows={list}
                getKey={(s) => s.schoolId}
                searchable={(s) => `${s.name} ${s.district}`}
                filters={[{ key: 'district', label: 'District', options: [...new Set(list.map((s) => s.district))], match: (s, v) => s.district === v }]}
                columns={[
                  { key: 'name', header: 'School', render: (s) => <strong>{s.name}</strong> },
                  { key: 'district', header: 'District', render: (s) => s.district },
                  { key: 'students', header: 'Students', render: (s) => s.students, sortValue: (s) => s.students },
                  { key: 'teachers', header: 'Teachers', render: (s) => s.teachers },
                  { key: 'att', header: 'Attendance', render: (s) => `${s.attendanceRate}%`, sortValue: (s) => s.attendanceRate },
                  { key: 'avg', header: 'Avg score', render: (s) => `${s.academicAverage}%` },
                  { key: 'req', header: 'Open requests', render: (s) => s.openRequests },
                  { key: 'status', header: 'Status', render: (s) => <StatusBadge status={s.status} /> },
                ]}
              />
            )}
          </AsyncView>
        </div>
      </Card>
    </div>
  )
}

export function GovernmentInstitutions() {
  const user = useCurrentUser()
  const schools = useAsync(() => directoryService.schools(), [user.id])
  return (
    <div className="section-stack">
      <PageHeader title="Institutions" description="Full institutional records." />
      <AsyncView data={schools.data} isEmpty={(d) => d.length === 0} empty={<Card><div className="card-body"><EmptyState title="No institutions" /></div></Card>}>
        {(list) => (
          <div className="grid-2">
            {list.map((s) => (
              <Card key={s.id}>
                <div className="card-body">
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><strong>{s.officialName}</strong><StatusBadge status={s.status} /></div>
                  <MetaList items={[
                    { label: 'Code', value: s.organizationCode },
                    { label: 'Registration', value: s.registrationNumber || '—' },
                    { label: 'District', value: s.district },
                    { label: 'Type', value: s.organizationType },
                    { label: 'Levels', value: s.institutionLevels.join(', ') || '—' },
                    { label: 'Head', value: s.headName },
                  ]} />
                </div>
              </Card>
            ))}
          </div>
        )}
      </AsyncView>
    </div>
  )
}

/* -------------------------------------------------------------- Analytics */

export function GovernmentAnalytics() {
  const user = useCurrentUser()
  const overview = useAsync(() => governmentService.overview(user), [user.id])
  const byDistrict = useAsync(() => governmentService.byDistrict(user), [user.id])
  return (
    <div className="section-stack">
      <PageHeader title="Analytics" description="Regional performance and enrolment trends (aggregated)." />
      <AsyncView data={overview.data}>
        {(o) => (
          <div className="stat-grid">
            <StatCard label="Enrolment" value={o.students.toLocaleString()} />
            <StatCard label="Attendance" value={`${o.attendanceRate}%`} />
            <StatCard label="Academic average" value={`${o.academicAverage}%`} />
            <StatCard label="Active institutions" value={`${o.activeInstitutions}/${o.institutions}`} />
          </div>
        )}
      </AsyncView>
      <div className="grid-2">
        <Card>
          <CardHeader title="Students by district" />
          <div className="card-body">
            <AsyncView data={byDistrict.data}>{(r) => <BarChart data={r.map((x) => ({ label: x.district, value: x.students }))} />}</AsyncView>
          </div>
        </Card>
        <Card>
          <CardHeader title="Attendance by district" />
          <div className="card-body">
            <AsyncView data={byDistrict.data}>{(r) => <BarChart data={r.map((x) => ({ label: x.district, value: x.attendanceRate }))} unit="%" />}</AsyncView>
          </div>
        </Card>
      </div>
    </div>
  )
}

/* -------------------------------------------------------------- Reports */

export function GovernmentReports() {
  const user = useCurrentUser()
  const rows = useAsync(() => reportService.list(user), [user.id])
  return (
    <div className="section-stack">
      <PageHeader title="Reports" description="Reports submitted by schools to the authority." />
      <Card>
        <div className="card-body">
          <AsyncView data={rows} isEmpty={(d) => d.length === 0} empty={<EmptyState title="No reports" />}>
            {(list) => (
              <DataTable
                rows={list.filter((r) => r.status !== 'draft')}
                getKey={(r) => r.id}
                searchable={(r) => `${r.subject} ${r.reference}`}
                filters={[{ key: 'type', label: 'Type', options: [...new Set(list.map((r) => r.type))], match: (r, v) => r.type === v }]}
                columns={[
                  { key: 'subject', header: 'Report', render: (r) => <strong>{r.subject}</strong> },
                  { key: 'type', header: 'Type', render: (r) => r.type },
                  { key: 'ref', header: 'Reference', render: (r) => r.reference },
                  { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
                  { key: 'date', header: 'Date', render: (r) => formatDate(r.createdAt), sortValue: (r) => r.createdAt },
                ]}
              />
            )}
          </AsyncView>
        </div>
      </Card>
    </div>
  )
}

/* -------------------------------------------------------------- Request Center */

export function GovernmentRequests() {
  const user = useCurrentUser()
  const toast = useToast()
  const rows = useAsync(() => requestService.list(user), [user.id])
  const officers = useAsync(() => requestService.officers(), [user.id])
  const [detail, setDetail] = useState<GovRequest | null>(null)
  const [assigning, setAssigning] = useState<GovRequest | null>(null)

  return (
    <div className="section-stack">
      <PageHeader title="Request Center" description="Casework from schools — assign, review, respond and close." />
      <AsyncView data={rows} isEmpty={(d) => d.length === 0} empty={<Card><div className="card-body"><EmptyState title="No requests" /></div></Card>}>
        {(list) => (
          <>
            <div className="stat-grid">
              <StatCard label="Total" value={list.length} />
              <StatCard label="Awaiting action" value={list.filter((r) => ['submitted', 'received', 'need_information'].includes(r.status)).length} />
              <StatCard label="Under review" value={list.filter((r) => r.status === 'under_review').length} />
              <StatCard label="Completed" value={list.filter((r) => r.status === 'completed').length} />
            </div>
            <Card>
              <div className="card-body">
                <DataTable
                  rows={list}
                  getKey={(r) => r.id}
                  searchable={(r) => `${r.title} ${r.reference} ${r.type}`}
                  filters={[
                    { key: 'status', label: 'Status', options: [...new Set(list.map((r) => r.status))], match: (r, v) => r.status === v },
                    { key: 'priority', label: 'Priority', options: ['low', 'medium', 'high', 'urgent'], match: (r, v) => r.priority === v },
                  ]}
                  columns={[
                    { key: 'title', header: 'Request', render: (r) => <strong>{r.title}</strong> },
                    { key: 'ref', header: 'Reference', render: (r) => r.reference },
                    { key: 'type', header: 'Type', render: (r) => r.type },
                    { key: 'priority', header: 'Priority', render: (r) => <StatusBadge status={r.priority} /> },
                    { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
                    { key: 'officer', header: 'Officer', render: (r) => (r.assignedOfficerId ? 'Assigned' : '—') },
                  ]}
                  rowActions={(r) => (
                    <>
                      <Button size="sm" variant="ghost" onClick={() => setDetail(r)}>Open</Button>
                      {!r.assignedOfficerId && <Button size="sm" variant="ghost" onClick={() => setAssigning(r)}>Assign</Button>}
                      {r.status === 'submitted' && (
                        <Button size="sm" variant="ghost" onClick={async () => { await requestService.advance(user, r.id, 'received', 'Logged by the department.'); toast.push('Marked received'); rows.reload() }}>
                          Receive
                        </Button>
                      )}
                    </>
                  )}
                />
              </div>
            </Card>
          </>
        )}
      </AsyncView>

      {assigning && (
        <div className="modal-scrim" onMouseDown={(e) => e.target === e.currentTarget && setAssigning(null)}>
          <div className="modal" role="dialog" aria-modal="true" aria-label="Assign request">
            <div className="modal-head"><h2>Assign {assigning.reference}</h2><button className="icon-btn" onClick={() => setAssigning(null)}>✕</button></div>
            <AssignForm
              officers={(officers.data ?? []).map((o) => ({ id: o.id, name: o.name }))}
              onCancel={() => setAssigning(null)}
              onAssign={async (officerId, note) => {
                await requestService.advance(user, assigning.id, 'assign', note || 'Assigned for review.', { officerId })
                toast.push('Request assigned', 'success')
                setAssigning(null)
                rows.reload()
              }}
            />
          </div>
        </div>
      )}

      {detail && <RequestDetail request={detail} canRespond onClose={() => setDetail(null)} onChange={() => rows.reload()} />}
    </div>
  )
}

function AssignForm({
  officers, onCancel, onAssign,
}: {
  officers: { id: string; name: string }[]
  onCancel: () => void
  onAssign: (officerId: string, note: string) => void
}) {
  const [officerId, setOfficerId] = useState(officers[0]?.id ?? '')
  const [note, setNote] = useState('')
  return (
    <form onSubmit={(e) => { e.preventDefault(); onAssign(officerId, note) }}>
      <div className="modal-body">
        <Field label="Officer">
          <Select value={officerId} onChange={(e) => setOfficerId(e.target.value)}>
            {officers.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
          </Select>
        </Field>
        <Field label="Note"><TextArea value={note} onChange={(e) => setNote(e.target.value)} /></Field>
      </div>
      <div className="modal-foot"><Button variant="ghost" type="button" onClick={onCancel}>Cancel</Button><Button variant="primary" type="submit">Assign</Button></div>
    </form>
  )
}

/* -------------------------------------------------------------- Announcements */

export function GovernmentAnnouncements() {
  const user = useCurrentUser()
  const toast = useToast()
  const [f, setF] = useState({ title: '', body: '', priority: 'high' as const })
  const authored = useAsync(() => announcementService.authored(user), [user.id])
  return (
    <div className="section-stack">
      <PageHeader title="Announcements" description="Publish directives and notices to all schools." />
      <Card>
        <CardHeader title="New announcement" />
        <form className="card-body" onSubmit={async (e) => {
          e.preventDefault()
          await announcementService.create(user, { title: f.title, body: f.body, priority: f.priority, audience: ['school'] })
          toast.push('Published to all schools', 'success'); setF({ title: '', body: '', priority: 'high' }); authored.reload()
        }}>
          <Field label="Title"><TextInput value={f.title} onChange={(e) => setF((x) => ({ ...x, title: e.target.value }))} required /></Field>
          <Field label="Message"><TextArea value={f.body} onChange={(e) => setF((x) => ({ ...x, body: e.target.value }))} required /></Field>
          <Button variant="primary" type="submit" disabled={!f.title.trim()}>Publish</Button>
        </form>
      </Card>
      <Card>
        <CardHeader title="Published" />
        <div className="card-body">
          <AsyncView data={authored} isEmpty={(d) => d.length === 0} empty={<EmptyState title="Nothing published" />}>
            {(list) => list.map((a) => (
              <div key={a.id} style={{ padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                <strong>{a.title}</strong>
                <p style={{ color: 'var(--text-soft)', fontSize: '0.875rem' }}>{a.body}</p>
              </div>
            ))}
          </AsyncView>
        </div>
      </Card>
    </div>
  )
}

/* -------------------------------------------------------------- Documents / Audit */

export function GovernmentDocuments() {
  const user = useCurrentUser()
  const gov = useAsync(() => governmentService.body(user), [user.id])
  const docs = useAsync(async () => {
    const body = await governmentService.body(user)
    return body ? documentService.forOrganization(user, body.id) : []
  }, [user.id])
  return (
    <div className="section-stack">
      <PageHeader title="Documents" description="Departmental documents and submissions." />
      <Card>
        <div className="card-body">
          <AsyncView data={docs} isEmpty={(d) => d.length === 0} empty={<EmptyState title="No documents" description={gov.data ? undefined : 'Loading department…'} />}>
            {(list) => (
              <DataTable
                rows={list}
                getKey={(d) => d.id}
                columns={[
                  { key: 'title', header: 'Title', render: (d) => <strong>{d.title}</strong> },
                  { key: 'type', header: 'Type', render: (d) => d.type },
                  { key: 'status', header: 'Status', render: (d) => <StatusBadge status={d.status} /> },
                  { key: 'date', header: 'Added', render: (d) => formatDate(d.createdAt) },
                ]}
              />
            )}
          </AsyncView>
        </div>
      </Card>
    </div>
  )
}

export function GovernmentAudit() {
  const user = useCurrentUser()
  const rows = useAsync(() => auditService.list(), [user.id])
  return (
    <div className="section-stack">
      <PageHeader title="Audit Log" description="Request casework and oversight actions." />
      <Card>
        <div className="card-body">
          <AsyncView data={rows} isEmpty={(d) => d.length === 0} empty={<EmptyState title="No audit entries" />}>
            {(list) => (
              <DataTable
                rows={list.filter((r) => r.action.includes('REQUEST') || r.actorRole === 'government')}
                getKey={(r) => r.id}
                searchable={(r) => `${r.action} ${r.actorId}`}
                columns={[
                  { key: 'action', header: 'Action', render: (r) => <strong>{r.action.replace(/_/g, ' ')}</strong> },
                  { key: 'actor', header: 'Actor', render: (r) => r.actorId },
                  { key: 'target', header: 'Target', render: (r) => r.targetId ?? '—' },
                  { key: 'when', header: 'When', render: (r) => formatDateTime(r.timestamp), sortValue: (r) => r.timestamp },
                ]}
              />
            )}
          </AsyncView>
        </div>
      </Card>
    </div>
  )
}
