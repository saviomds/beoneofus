import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useCurrentUser } from '@/context/AuthContext'
import { useAsync } from '@/hooks/useAsync'
import { studentService } from '@/services/studentService'
import { requestService } from '@/services/requestService'
import { announcementService } from '@/services/announcementService'
import { documentService } from '@/services/documentService'
import { analyticsService } from '@/services/analyticsService'
import {
  AsyncView, Button, Card, CardHeader, DataTable, EmptyState, Field, MetaList, PageHeader,
  ProgressBar, Select, StatCard, StatusBadge, Chips, TextArea, TextInput, Timeline, useToast,
  formatDate, BarChart,
} from '@/components/ui'
import type { Student } from '@/types'

function useStudent() {
  const user = useCurrentUser()
  return useAsync(() => studentService.profileFor(user), [user.id])
}

/* -------------------------------------------------------------- Dashboard */

export function StudentDashboard() {
  const user = useCurrentUser()
  const profile = useStudent()

  return (
    <div className="section-stack">
      <PageHeader title={`Welcome back, ${user.name.split(' ')[0]}`} description="Your learning, mentorship and school activity at a glance." />
      <AsyncView data={profile.data} error={profile.error} onRetry={profile.reload}>
        {({ student, className }) => <DashboardBody student={student} className={className} />}
      </AsyncView>
    </div>
  )
}

function DashboardBody({ student, className }: { student: Student; className: string | null }) {
  const user = useCurrentUser()
  const stats = useAsync(async () => {
    const [attendance, average, reports, sessions, feed] = await Promise.all([
      studentService.attendanceRate(student.id),
      studentService.academicAverage(student.id),
      studentService.reportsFor(user, student.id),
      studentService.sessionsFor(user, student.id),
      announcementService.feedFor(user),
    ])
    return { attendance, average, reports, sessions, feed }
  }, [student.id])

  return (
    <AsyncView data={stats.data} error={stats.error} onRetry={stats.reload}>
      {(d) => (
        <>
          <div className="stat-grid">
            <StatCard label="Attendance" value={`${d.attendance}%`} delta={{ text: d.attendance >= 75 ? 'On track' : 'Below threshold', dir: d.attendance >= 75 ? 'up' : 'down' }} />
            <StatCard label="Academic average" value={`${d.average}%`} />
            <StatCard label="Profile completion" value={`${student.profileCompletion}%`} />
            <StatCard label="Class" value={className ?? '—'} />
          </div>

          <div className="grid-2">
            <Card>
              <CardHeader title="Upcoming mentorship" subtitle="Your scheduled sessions" />
              <div className="card-body">
                {d.sessions.filter((s) => s.status === 'scheduled').length === 0 ? (
                  <EmptyState title="No sessions scheduled" description="Your mentor will schedule the next session." />
                ) : (
                  <Timeline
                    items={d.sessions
                      .filter((s) => s.status === 'scheduled')
                      .map((s) => ({ title: s.topic, when: `${formatDate(s.date)} · ${s.time}`, note: s.goals.join(' · ') }))}
                  />
                )}
              </div>
            </Card>

            <Card>
              <CardHeader title="Recent reports" subtitle="Shared by your teachers and mentors" action={<Link className="btn btn-ghost btn-sm" to="/student/reports">View all</Link>} />
              <div className="card-body">
                {d.reports.length === 0 ? (
                  <EmptyState title="No reports yet" />
                ) : (
                  d.reports.slice(0, 4).map((r) => (
                    <div key={r.id} style={{ padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                        <strong>{r.subject}</strong>
                        <StatusBadge status={r.status} />
                      </div>
                      <div className="field-hint">{r.reference} · {formatDate(r.createdAt)}</div>
                    </div>
                  ))
                )}
              </div>
            </Card>
          </div>

          <Card>
            <CardHeader title="School announcements" />
            <div className="card-body">
              {d.feed.length === 0 ? (
                <EmptyState title="No announcements" />
              ) : (
                d.feed.slice(0, 4).map((a) => (
                  <div key={a.id} style={{ padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                      <strong>{a.pinned ? '📌 ' : ''}{a.title}</strong>
                      <StatusBadge status={a.priority} />
                    </div>
                    <p style={{ color: 'var(--text-soft)', fontSize: '0.875rem', marginTop: 4 }}>{a.body}</p>
                  </div>
                ))
              )}
            </div>
          </Card>
        </>
      )}
    </AsyncView>
  )
}

/* -------------------------------------------------------------- Profile */

export function StudentProfile() {
  const user = useCurrentUser()
  const toast = useToast()
  const profile = useStudent()
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState<Partial<Student>>({})

  return (
    <div className="section-stack">
      <PageHeader title="My Profile" description="Personal, academic and guardian information." />
      <AsyncView data={profile.data} error={profile.error} onRetry={profile.reload}>
        {({ student, className }) => (
          <>
            <Card>
              <CardHeader
                title={`${student.firstName} ${student.lastName}`}
                subtitle={`${student.studentNumber} · ${student.gradeLevel}`}
                action={
                  <Button
                    onClick={() => {
                      setForm({
                        address: student.address,
                        guardianName: student.guardianName,
                        guardianPhone: student.guardianPhone,
                        guardianEmail: student.guardianEmail,
                        emergencyContact: student.emergencyContact,
                      })
                      setEditing(true)
                    }}
                  >
                    Edit contact info
                  </Button>
                }
              />
              <div className="card-body">
                <div style={{ marginBottom: 16 }}>
                  <span className="field-hint">Profile completion</span>
                  <ProgressBar value={student.profileCompletion} />
                </div>
                <MetaList
                  items={[
                    { label: 'Program', value: student.program },
                    { label: 'Class', value: className ?? 'Unassigned' },
                    { label: 'Date of birth', value: formatDate(student.dateOfBirth) },
                    { label: 'Gender', value: student.gender },
                    { label: 'Enrolled', value: formatDate(student.enrollmentDate) },
                    { label: 'Status', value: <StatusBadge status={student.status} /> },
                    { label: 'Address', value: student.address },
                    { label: 'Guardian', value: `${student.guardianName} · ${student.guardianPhone}` },
                    { label: 'Emergency contact', value: student.emergencyContact },
                  ]}
                />
              </div>
            </Card>

            <div className="grid-2">
              <Card>
                <CardHeader title="Skills" />
                <div className="card-body"><Chips items={student.skills} /></div>
              </Card>
              <Card>
                <CardHeader title="Interests" />
                <div className="card-body"><Chips items={student.interests} /></div>
              </Card>
            </div>

            <Card>
              <CardHeader title="Achievements" />
              <div className="card-body">
                {student.achievements.length === 0 ? <EmptyState title="No achievements recorded yet" /> : (
                  <ul>{student.achievements.map((a) => <li key={a}>{a}</li>)}</ul>
                )}
              </div>
            </Card>

            {editing && (
              <div className="modal-scrim" onMouseDown={(e) => e.target === e.currentTarget && setEditing(false)}>
                <div className="modal" role="dialog" aria-modal="true" aria-label="Edit contact info">
                  <div className="modal-head"><h2>Edit contact info</h2><button className="icon-btn" onClick={() => setEditing(false)}>✕</button></div>
                  <form
                    onSubmit={async (e) => {
                      e.preventDefault()
                      await studentService.update(user, student.id, form)
                      toast.push('Profile updated', 'success')
                      setEditing(false)
                      profile.reload()
                    }}
                  >
                    <div className="modal-body">
                      {(['address', 'guardianName', 'guardianPhone', 'guardianEmail', 'emergencyContact'] as const).map((k) => (
                        <Field key={k} label={k.replace(/([A-Z])/g, ' $1')}>
                          <TextInput value={String(form[k] ?? '')} onChange={(e) => setForm((f) => ({ ...f, [k]: e.target.value }))} />
                        </Field>
                      ))}
                    </div>
                    <div className="modal-foot">
                      <Button variant="ghost" type="button" onClick={() => setEditing(false)}>Cancel</Button>
                      <Button variant="primary" type="submit">Save</Button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </>
        )}
      </AsyncView>
    </div>
  )
}

/* -------------------------------------------------------------- Academic */

export function StudentAcademic() {
  const user = useCurrentUser()
  const profile = useStudent()
  return (
    <div className="section-stack">
      <PageHeader title="Academic" description="Subjects, grades, teacher comments and trends." />
      <AsyncView data={profile.data} error={profile.error} onRetry={profile.reload}>
        {({ student }) => <AcademicBody studentId={student.id} />}
      </AsyncView>
    </div>
  )

  function AcademicBody({ studentId }: { studentId: string }) {
    const records = useAsync(() => studentService.academicFor(user, studentId), [studentId])
    const progress = useAsync(() => analyticsService.studentProgress(user, studentId), [studentId])
    return (
      <>
        <AsyncView data={progress.data}>
          {(p) => (
            <Card>
              <CardHeader title="Performance by subject" subtitle={`Overall average ${p.average}%`} />
              <div className="card-body"><BarChart data={p.bySubject} unit="%" /></div>
            </Card>
          )}
        </AsyncView>
        <Card>
          <CardHeader title="Grade records" />
          <div className="card-body">
            <AsyncView data={records} isEmpty={(d) => d.length === 0} empty={<EmptyState title="No grades recorded yet" />}>
              {(rows) => (
                <DataTable
                  rows={rows}
                  getKey={(r) => r.id}
                  columns={[
                    { key: 'subject', header: 'Subject', render: (r) => <strong>{r.subjectName}</strong> },
                    { key: 'term', header: 'Term', render: (r) => r.term },
                    { key: 'score', header: 'Score', render: (r) => `${r.score}%`, sortValue: (r) => r.score },
                    { key: 'grade', header: 'Grade', render: (r) => <StatusBadge status={r.grade === 'A' || r.grade === 'B' ? 'approved' : r.grade === 'F' ? 'rejected' : 'submitted'} /> },
                    { key: 'comment', header: 'Teacher comment', render: (r) => r.teacherComment || '—' },
                  ]}
                />
              )}
            </AsyncView>
          </div>
        </Card>
      </>
    )
  }
}

/* -------------------------------------------------------------- Attendance */

export function StudentAttendance() {
  const user = useCurrentUser()
  const profile = useStudent()
  return (
    <div className="section-stack">
      <PageHeader title="Attendance" description="Your attendance record and history." />
      <AsyncView data={profile.data}>
        {({ student }) => <AttendanceBody studentId={student.id} />}
      </AsyncView>
    </div>
  )
  function AttendanceBody({ studentId }: { studentId: string }) {
    const rows = useAsync(() => studentService.attendanceFor(user, studentId), [studentId])
    const rate = useAsync(() => studentService.attendanceRate(studentId), [studentId])
    return (
      <>
        <AsyncView data={rows.data}>
          {(list) => {
            const count = (s: string) => list.filter((r) => r.status === s).length
            return (
              <div className="stat-grid">
                <StatCard label="Attendance rate" value={`${rate.data ?? 0}%`} />
                <StatCard label="Present" value={count('present')} />
                <StatCard label="Late" value={count('late')} />
                <StatCard label="Absent" value={count('absent')} />
              </div>
            )
          }}
        </AsyncView>
        <Card>
          <CardHeader title="History" />
          <div className="card-body">
            <AsyncView data={rows} isEmpty={(d) => d.length === 0} empty={<EmptyState title="No attendance records" />}>
              {(list) => (
                <DataTable
                  rows={list}
                  getKey={(r) => r.id}
                  filters={[{ key: 'status', label: 'Status', options: ['present', 'late', 'absent', 'excused'], match: (r, v) => r.status === v }]}
                  columns={[
                    { key: 'date', header: 'Date', render: (r) => formatDate(r.date), sortValue: (r) => r.date },
                    { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
                    { key: 'note', header: 'Note', render: (r) => r.note || '—' },
                  ]}
                />
              )}
            </AsyncView>
          </div>
        </Card>
      </>
    )
  }
}

/* -------------------------------------------------------------- Reports */

export function StudentReports() {
  const user = useCurrentUser()
  const profile = useStudent()
  return (
    <div className="section-stack">
      <PageHeader title="Reports" description="Academic, mentorship and progress reports shared with you." />
      <AsyncView data={profile.data}>
        {({ student }) => <ReportsBody studentId={student.id} />}
      </AsyncView>
    </div>
  )
  function ReportsBody({ studentId }: { studentId: string }) {
    const rows = useAsync(() => studentService.reportsFor(user, studentId), [studentId])
    return (
      <Card>
        <div className="card-body">
          <AsyncView data={rows} isEmpty={(d) => d.length === 0} empty={<EmptyState title="No reports yet" description="Reports from your teachers and mentors will appear here." />}>
            {(list) => (
              <DataTable
                rows={list}
                getKey={(r) => r.id}
                filters={[{ key: 'type', label: 'Type', options: [...new Set(list.map((r) => r.type))], match: (r, v) => r.type === v }]}
                columns={[
                  { key: 'subject', header: 'Report', render: (r) => <strong>{r.subject}</strong> },
                  { key: 'type', header: 'Type', render: (r) => <StatusBadge status={r.type} /> },
                  { key: 'ref', header: 'Reference', render: (r) => r.reference },
                  { key: 'date', header: 'Date', render: (r) => formatDate(r.createdAt), sortValue: (r) => r.createdAt },
                  { key: 'content', header: 'Summary', render: (r) => <span style={{ color: 'var(--text-soft)' }}>{r.content.slice(0, 120)}…</span> },
                ]}
              />
            )}
          </AsyncView>
        </div>
      </Card>
    )
  }
}

/* -------------------------------------------------------------- Credentials */

export function StudentCredentials() {
  const user = useCurrentUser()
  const profile = useStudent()
  return (
    <div className="section-stack">
      <PageHeader title="Credentials" description="Verified certificates and badges you've earned." />
      <AsyncView data={profile.data}>
        {({ student }) => <CredBody studentId={student.id} />}
      </AsyncView>
    </div>
  )
  function CredBody({ studentId }: { studentId: string }) {
    const rows = useAsync(() => studentService.credentialsFor(user, studentId), [studentId])
    return (
      <AsyncView data={rows} isEmpty={(d) => d.length === 0} empty={<Card><div className="card-body"><EmptyState title="No credentials yet" /></div></Card>}>
        {(list) => (
          <div className="grid-2">
            {list.map((c) => (
              <Card key={c.id}>
                <div className="card-body">
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <strong>{c.title}</strong>
                    <StatusBadge status={c.status} />
                  </div>
                  <MetaList
                    items={[
                      { label: 'Issuer', value: c.issuer },
                      { label: 'Issued', value: formatDate(c.issuedDate) },
                      { label: 'Type', value: c.type },
                      { label: 'Verification code', value: <code>{c.verificationCode}</code> },
                    ]}
                  />
                </div>
              </Card>
            ))}
          </div>
        )}
      </AsyncView>
    )
  }
}

/* -------------------------------------------------------------- Mentors */

export function StudentMentors() {
  const user = useCurrentUser()
  const profile = useStudent()
  return (
    <div className="section-stack">
      <PageHeader title="Mentors" description="Your mentorship sessions, goals and progress." />
      <AsyncView data={profile.data}>
        {({ student }) => <MentorBody studentId={student.id} />}
      </AsyncView>
    </div>
  )
  function MentorBody({ studentId }: { studentId: string }) {
    const sessions = useAsync(() => studentService.sessionsFor(user, studentId), [studentId])
    return (
      <Card>
        <CardHeader title="Mentorship sessions" />
        <div className="card-body">
          <AsyncView data={sessions} isEmpty={(d) => d.length === 0} empty={<EmptyState title="No mentorship sessions yet" description="Once a mentor is assigned, your sessions appear here." />}>
            {(list) => (
              <div className="section-stack">
                {list.map((s) => (
                  <div key={s.id} style={{ padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                      <strong>{s.topic}</strong>
                      <StatusBadge status={s.status} />
                    </div>
                    <div className="field-hint">{formatDate(s.date)} · {s.time}</div>
                    {s.goals.length > 0 && <div style={{ marginTop: 6 }}><Chips items={s.goals} /></div>}
                    {s.progressNote && <p style={{ marginTop: 6, color: 'var(--text-soft)', fontSize: '0.875rem' }}>{s.progressNote}</p>}
                  </div>
                ))}
              </div>
            )}
          </AsyncView>
        </div>
      </Card>
    )
  }
}

/* -------------------------------------------------------------- Requests */

export function StudentRequests() {
  const user = useCurrentUser()
  const toast = useToast()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ type: 'Academic support', title: '', description: '', priority: 'medium' as const })
  const rows = useAsync(() => requestService.list(user), [user.id])

  return (
    <div className="section-stack">
      <PageHeader
        title="Requests"
        description="Raise a request to your school or the education authority and track its status."
        actions={<Button variant="primary" onClick={() => setOpen(true)}>New request</Button>}
      />
      <Card>
        <div className="card-body">
          <AsyncView data={rows} isEmpty={(d) => d.length === 0} empty={<EmptyState title="No requests yet" action={<Button variant="primary" onClick={() => setOpen(true)}>Create request</Button>} />}>
            {(list) => (
              <DataTable
                rows={list}
                getKey={(r) => r.id}
                columns={[
                  { key: 'title', header: 'Request', render: (r) => <strong>{r.title}</strong> },
                  { key: 'type', header: 'Type', render: (r) => r.type },
                  { key: 'ref', header: 'Reference', render: (r) => r.reference },
                  { key: 'priority', header: 'Priority', render: (r) => <StatusBadge status={r.priority} /> },
                  { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
                  { key: 'response', header: 'Response', render: (r) => r.response || '—' },
                ]}
              />
            )}
          </AsyncView>
        </div>
      </Card>

      {open && (
        <div className="modal-scrim" onMouseDown={(e) => e.target === e.currentTarget && setOpen(false)}>
          <div className="modal" role="dialog" aria-modal="true" aria-label="New request">
            <div className="modal-head"><h2>New request</h2><button className="icon-btn" onClick={() => setOpen(false)}>✕</button></div>
            <form
              onSubmit={async (e) => {
                e.preventDefault()
                try {
                  // A student's request is raised in their school's context.
                  await requestService.create(user, {
                    type: form.type,
                    title: form.title,
                    description: form.description,
                    priority: form.priority,
                    governmentDepartment: 'Basic Education Directorate',
                  })
                  toast.push('Request submitted', 'success')
                  setOpen(false)
                  rows.reload()
                } catch (err) {
                  toast.push(err instanceof Error ? err.message : 'Could not submit request', 'error')
                }
              }}
            >
              <div className="modal-body">
                <Field label="Type">
                  <Select value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}>
                    {['Academic support', 'Document / transcript', 'Class transfer', 'Wellbeing', 'Other'].map((t) => (
                      <option key={t}>{t}</option>
                    ))}
                  </Select>
                </Field>
                <Field label="Title"><TextInput value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} required /></Field>
                <Field label="Description"><TextArea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} required /></Field>
              </div>
              <div className="modal-foot">
                <Button variant="ghost" type="button" onClick={() => setOpen(false)}>Cancel</Button>
                <Button variant="primary" type="submit" disabled={!form.title.trim()}>Submit</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

/* -------------------------------------------------------------- Documents */

export function StudentDocuments() {
  const user = useCurrentUser()
  const toast = useToast()
  const rows = useAsync(() => documentService.forOwner(user, user.id), [user.id])
  return (
    <div className="section-stack">
      <PageHeader title="Documents" description="Your identity documents, certificates and academic files." />
      <div className="banner banner-info">This demo records document metadata only (name, size) — no file is uploaded or stored.</div>
      <Card>
        <div className="card-body">
          <div className="toolbar">
            <label className="btn btn-secondary btn-sm">
              Add document
              <input
                type="file"
                hidden
                onChange={async (e) => {
                  const file = e.target.files?.[0]
                  if (!file) return
                  await documentService.register(user, { ownerId: user.id, type: 'Student upload', title: file.name, fileName: file.name, size: file.size })
                  toast.push('Document metadata recorded', 'success')
                  rows.reload()
                }}
              />
            </label>
          </div>
          <AsyncView data={rows} isEmpty={(d) => d.length === 0} empty={<EmptyState title="No documents" />}>
            {(list) => (
              <DataTable
                rows={list}
                getKey={(r) => r.id}
                columns={[
                  { key: 'title', header: 'Title', render: (r) => <strong>{r.title}</strong> },
                  { key: 'type', header: 'Type', render: (r) => r.type },
                  { key: 'file', header: 'File', render: (r) => `${r.fileName} · ${(r.size / 1024).toFixed(0)} KB` },
                  { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
                  { key: 'date', header: 'Added', render: (r) => formatDate(r.createdAt), sortValue: (r) => r.createdAt },
                ]}
              />
            )}
          </AsyncView>
        </div>
      </Card>
    </div>
  )
}

/* -------------------------------------------------------------- Courses & Schedule (lightweight) */

export function StudentCourses() {
  const user = useCurrentUser()
  const profile = useStudent()
  return (
    <div className="section-stack">
      <PageHeader title="Courses" description="Subjects you're enrolled in this term." />
      <AsyncView data={profile.data}>
        {({ student }) => <CoursesBody studentId={student.id} />}
      </AsyncView>
    </div>
  )
  function CoursesBody({ studentId }: { studentId: string }) {
    const records = useAsync(() => studentService.academicFor(user, studentId), [studentId])
    return (
      <AsyncView data={records} isEmpty={(d) => d.length === 0} empty={<Card><div className="card-body"><EmptyState title="No enrolled subjects recorded" /></div></Card>}>
        {(list) => (
          <div className="grid-2">
            {list.map((r) => (
              <Card key={r.id}>
                <div className="card-body">
                  <strong>{r.subjectName}</strong>
                  <p className="field-hint">{r.term}</p>
                  <div style={{ marginTop: 8 }}>
                    <span className="field-hint">Current score</span>
                    <ProgressBar value={r.score} />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </AsyncView>
    )
  }
}

export function StudentSchedule() {
  const user = useCurrentUser()
  const profile = useStudent()
  return (
    <div className="section-stack">
      <PageHeader title="Schedule" description="Upcoming mentorship sessions and school dates." />
      <AsyncView data={profile.data}>
        {({ student }) => <ScheduleBody studentId={student.id} />}
      </AsyncView>
    </div>
  )
  function ScheduleBody({ studentId }: { studentId: string }) {
    const sessions = useAsync(() => studentService.sessionsFor(user, studentId), [studentId])
    return (
      <Card>
        <CardHeader title="Sessions" />
        <div className="card-body">
          <AsyncView data={sessions} isEmpty={(d) => d.filter((s) => s.status === 'scheduled').length === 0} empty={<EmptyState title="Nothing scheduled" />}>
            {(list) => (
              <Timeline
                items={list
                  .filter((s) => s.status === 'scheduled')
                  .map((s) => ({ title: s.topic, when: `${formatDate(s.date)} · ${s.time}`, note: s.goals.join(' · ') }))}
              />
            )}
          </AsyncView>
        </div>
      </Card>
    )
  }
}
