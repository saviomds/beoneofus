import { useState } from 'react'
import { useCurrentUser } from '@/context/AuthContext'
import { useAsync } from '@/hooks/useAsync'
import { directoryService } from '@/services/directoryService'
import { teacherService } from '@/services/teacherService'
import { mentorService } from '@/services/mentorService'
import { reportService } from '@/services/reportService'
import { studentService } from '@/services/studentService'
import { announcementService } from '@/services/announcementService'
import {
  AsyncView, Button, Card, CardHeader, DataTable, EmptyState, Field, MetaList, PageHeader,
  Select, StatCard, StatusBadge, TextArea, TextInput, Timeline, useToast, formatDate, Chips,
} from '@/components/ui'
import type { AttendanceStatus, Student } from '@/types'

/* -------------------------------------------------------------- Dashboard */

export function TeacherDashboard() {
  const user = useCurrentUser()
  const data = useAsync(async () => {
    const [students, classes, sessions, reports] = await Promise.all([
      directoryService.studentsForTeacher((await directoryService.teacherForUser(user.id))?.id ?? '__none__'),
      directoryService.classes(user.organizationId ?? undefined),
      mentorService.sessions(user),
      reportService.list(user, { authorId: user.id }),
    ])
    return { students, classes, sessions, reports }
  }, [user.id])

  return (
    <div className="section-stack">
      <PageHeader title={`Welcome back, ${user.name.split(' ')[0]}`} description="Your students, classes, sessions and reporting workload." />
      <AsyncView data={data.data} error={data.error} onRetry={data.reload}>
        {(d) => (
          <>
            <div className="stat-grid">
              <StatCard label="Assigned students" value={d.students.length} />
              <StatCard label="Classes" value={d.classes.filter((c) => c.homeroomTeacherId).length} />
              <StatCard label="Upcoming sessions" value={d.sessions.filter((s) => s.status === 'scheduled').length} />
              <StatCard label="Reports in draft" value={d.reports.filter((r) => r.status === 'draft').length} />
            </div>
            <div className="grid-2">
              <Card>
                <CardHeader title="Today's mentorship" />
                <div className="card-body">
                  {d.sessions.filter((s) => s.status === 'scheduled').length === 0 ? (
                    <EmptyState title="No sessions scheduled" />
                  ) : (
                    <Timeline items={d.sessions.filter((s) => s.status === 'scheduled').map((s) => ({ title: s.topic, when: `${formatDate(s.date)} · ${s.time}` }))} />
                  )}
                </div>
              </Card>
              <Card>
                <CardHeader title="Reports needing attention" />
                <div className="card-body">
                  {d.reports.filter((r) => r.status === 'draft' || r.status === 'rejected').length === 0 ? (
                    <EmptyState title="Nothing outstanding" />
                  ) : (
                    d.reports.filter((r) => r.status === 'draft' || r.status === 'rejected').map((r) => (
                      <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                        <span>{r.subject}</span>
                        <StatusBadge status={r.status} />
                      </div>
                    ))
                  )}
                </div>
              </Card>
            </div>
          </>
        )}
      </AsyncView>
    </div>
  )
}

/* -------------------------------------------------------------- Students */

export function TeacherStudents() {
  const user = useCurrentUser()
  const data = useAsync(async () => {
    const teacher = await directoryService.teacherForUser(user.id)
    const mentor = await mentorService.myMentor(user)
    const students = await studentService.list(user)
    const scoped = students.filter(
      (s) => (teacher && s.teacherId === teacher.id) || (mentor && mentor.assignedStudentIds.includes(s.id)),
    )
    return { scoped }
  }, [user.id])

  return (
    <div className="section-stack">
      <PageHeader title="Students" description="Students assigned to you for teaching or mentorship." />
      <Card>
        <div className="card-body">
          <AsyncView data={data.data} error={data.error} onRetry={data.reload} isEmpty={(d) => d.scoped.length === 0} empty={<EmptyState title="No students assigned yet" />}>
            {(d) => <StudentTable students={d.scoped} />}
          </AsyncView>
        </div>
      </Card>
    </div>
  )
}

function StudentTable({ students }: { students: Student[] }) {
  const user = useCurrentUser()
  const [selected, setSelected] = useState<Student | null>(null)
  return (
    <>
      <DataTable
        rows={students}
        getKey={(s) => s.id}
        searchable={(s) => `${s.firstName} ${s.lastName} ${s.studentNumber}`}
        filters={[{ key: 'status', label: 'Status', options: ['active', 'inactive', 'archived'], match: (s, v) => s.status === v }]}
        columns={[
          { key: 'name', header: 'Student', render: (s) => <strong>{s.firstName} {s.lastName}</strong> },
          { key: 'no', header: 'ID', render: (s) => s.studentNumber },
          { key: 'grade', header: 'Grade', render: (s) => s.gradeLevel },
          { key: 'status', header: 'Status', render: (s) => <StatusBadge status={s.status} /> },
        ]}
        rowActions={(s) => <Button size="sm" variant="ghost" onClick={() => setSelected(s)}>View</Button>}
      />
      {selected && (
        <div className="modal-scrim" onMouseDown={(e) => e.target === e.currentTarget && setSelected(null)}>
          <div className="modal modal-lg" role="dialog" aria-modal="true" aria-label="Student detail">
            <div className="modal-head"><h2>{selected.firstName} {selected.lastName}</h2><button className="icon-btn" onClick={() => setSelected(null)}>✕</button></div>
            <div className="modal-body">
              <StudentSnapshot studentId={selected.id} />
            </div>
          </div>
        </div>
      )}
    </>
  )

  function StudentSnapshot({ studentId }: { studentId: string }) {
    const snap = useAsync(async () => {
      const [academic, attendance, reports, average, rate] = await Promise.all([
        studentService.academicFor(user, studentId),
        studentService.attendanceFor(user, studentId),
        studentService.reportsFor(user, studentId),
        studentService.academicAverage(studentId),
        studentService.attendanceRate(studentId),
      ])
      return { academic, attendance, reports, average, rate }
    }, [studentId])
    return (
      <AsyncView data={snap.data}>
        {(d) => (
          <div className="section-stack">
            <div className="stat-grid">
              <StatCard label="Average" value={`${d.average}%`} />
              <StatCard label="Attendance" value={`${d.rate}%`} />
              <StatCard label="Reports" value={d.reports.length} />
            </div>
            <Card>
              <CardHeader title="Grades" />
              <div className="card-body">
                {d.academic.length === 0 ? <EmptyState title="No grades" /> : (
                  <table className="data"><tbody>
                    {d.academic.map((a) => (
                      <tr key={a.id}><td><strong>{a.subjectName}</strong></td><td>{a.score}% ({a.grade})</td><td>{a.teacherComment}</td></tr>
                    ))}
                  </tbody></table>
                )}
              </div>
            </Card>
          </div>
        )}
      </AsyncView>
    )
  }
}

/* -------------------------------------------------------------- Classes */

export function TeacherClasses() {
  const user = useCurrentUser()
  const data = useAsync(() => directoryService.classes(user.organizationId ?? undefined), [user.id])
  return (
    <div className="section-stack">
      <PageHeader title="Classes" description="Classes you teach and their rosters." />
      <AsyncView data={data.data} error={data.error} onRetry={data.reload} isEmpty={(d) => d.length === 0} empty={<Card><div className="card-body"><EmptyState title="No classes" /></div></Card>}>
        {(list) => (
          <div className="grid-2">
            {list.map((c) => (
              <Card key={c.id}>
                <div className="card-body">
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <strong>{c.name}</strong>
                    <StatusBadge status={c.status} />
                  </div>
                  <MetaList items={[
                    { label: 'Grade', value: c.gradeLevel },
                    { label: 'Room', value: c.room },
                    { label: 'Students', value: c.studentIds.length },
                    { label: 'Subjects', value: c.subjectIds.length },
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

/* -------------------------------------------------------------- Attendance */

export function TeacherAttendance() {
  const user = useCurrentUser()
  const toast = useToast()
  const [classId, setClassId] = useState('')
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [marks, setMarks] = useState<Record<string, AttendanceStatus>>({})

  const classes = useAsync(() => directoryService.classes(user.organizationId ?? undefined), [user.id])
  const roster = useAsync(() => (classId ? teacherService.roster(user, classId) : Promise.resolve([])), [classId])
  const existing = useAsync(() => (classId ? teacherService.attendanceForDate(user, classId, date) : Promise.resolve([])), [classId, date])

  return (
    <div className="section-stack">
      <PageHeader title="Attendance" description="Record daily attendance for your class rosters." />
      <Card>
        <div className="card-body">
          <div className="toolbar">
            <Select value={classId} onChange={(e) => setClassId(e.target.value)} aria-label="Class">
              <option value="">Select a class…</option>
              {(classes.data ?? []).map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </Select>
            <TextInput type="date" value={date} onChange={(e) => setDate(e.target.value)} style={{ width: 'auto' }} />
          </div>

          {!classId ? (
            <EmptyState title="Choose a class" description="Select a class and date to record attendance." />
          ) : (
            <AsyncView data={roster.data} isEmpty={(d) => d.length === 0} empty={<EmptyState title="No students in this class" />}>
              {(students) => {
                const currentFor = (sid: string): AttendanceStatus =>
                  marks[sid] ?? (existing.data?.find((r) => r.studentId === sid)?.status ?? 'present')
                return (
                  <>
                    <table className="data">
                      <thead><tr><th>Student</th><th>Status</th></tr></thead>
                      <tbody>
                        {students.map((s) => (
                          <tr key={s.id}>
                            <td><strong>{s.firstName} {s.lastName}</strong></td>
                            <td>
                              <Select value={currentFor(s.id)} onChange={(e) => setMarks((m) => ({ ...m, [s.id]: e.target.value as AttendanceStatus }))} style={{ width: 'auto' }}>
                                {(['present', 'late', 'absent', 'excused'] as const).map((o) => <option key={o}>{o}</option>)}
                              </Select>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <Button
                      variant="primary"
                      style={{ marginTop: 16 }}
                      onClick={async () => {
                        await teacherService.recordAttendance(
                          user, classId, date,
                          students.map((s) => ({ studentId: s.id, status: currentFor(s.id) })),
                        )
                        toast.push('Attendance saved', 'success')
                        setMarks({})
                        existing.reload()
                      }}
                    >
                      Save attendance
                    </Button>
                  </>
                )
              }}
            </AsyncView>
          )}
        </div>
      </Card>
    </div>
  )
}

/* -------------------------------------------------------------- Reports */

export function TeacherReports() {
  const user = useCurrentUser()
  const toast = useToast()
  const [open, setOpen] = useState(false)
  const rows = useAsync(() => reportService.list(user, { authorId: user.id }), [user.id])
  const students = useAsync(() => studentService.list(user).catch(() => []), [user.id])

  return (
    <div className="section-stack">
      <PageHeader title="Reports" description="Create, submit and track academic and mentorship reports." actions={<Button variant="primary" onClick={() => setOpen(true)}>New report</Button>} />
      <Card>
        <div className="card-body">
          <AsyncView data={rows} isEmpty={(d) => d.length === 0} empty={<EmptyState title="No reports yet" action={<Button variant="primary" onClick={() => setOpen(true)}>Create report</Button>} />}>
            {(list) => (
              <DataTable
                rows={list}
                getKey={(r) => r.id}
                filters={[{ key: 'status', label: 'Status', options: ['draft', 'submitted', 'under_review', 'approved', 'rejected'], match: (r, v) => r.status === v }]}
                columns={[
                  { key: 'subject', header: 'Report', render: (r) => <strong>{r.subject}</strong> },
                  { key: 'type', header: 'Type', render: (r) => r.type },
                  { key: 'ref', header: 'Reference', render: (r) => r.reference },
                  { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
                  { key: 'updated', header: 'Updated', render: (r) => formatDate(r.updatedAt), sortValue: (r) => r.updatedAt },
                ]}
                rowActions={(r) =>
                  r.status === 'draft' || r.status === 'rejected' ? (
                    <Button size="sm" variant="secondary" onClick={async () => { await reportService.submit(user, r.id); toast.push('Report submitted for review', 'success'); rows.reload() }}>
                      Submit
                    </Button>
                  ) : null
                }
              />
            )}
          </AsyncView>
        </div>
      </Card>

      {open && (
        <ReportModal
          students={students.data ?? []}
          onClose={() => setOpen(false)}
          onSaved={() => { setOpen(false); rows.reload(); toast.push('Report created', 'success') }}
        />
      )}
    </div>
  )

  function ReportModal({ students: list, onClose, onSaved }: { students: Student[]; onClose: () => void; onSaved: () => void }) {
    const [form, setForm] = useState({ type: 'academic', subject: '', content: '', targetStudentId: '', submit: false })
    return (
      <div className="modal-scrim" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
        <div className="modal" role="dialog" aria-modal="true" aria-label="New report">
          <div className="modal-head"><h2>New report</h2><button className="icon-btn" onClick={onClose}>✕</button></div>
          <form
            onSubmit={async (e) => {
              e.preventDefault()
              const target = list.find((s) => s.id === form.targetStudentId)
              await reportService.create(user, {
                type: form.type as never,
                subject: form.subject,
                content: form.content,
                targetUserId: target?.userId ?? null,
                organizationId: user.organizationId,
                status: form.submit ? 'submitted' : 'draft',
              })
              onSaved()
            }}
          >
            <div className="modal-body">
              <Field label="Type">
                <Select value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}>
                  {['academic', 'progress', 'attendance', 'behavior', 'mentorship', 'career'].map((t) => <option key={t}>{t}</option>)}
                </Select>
              </Field>
              <Field label="About student (optional)">
                <Select value={form.targetStudentId} onChange={(e) => setForm((f) => ({ ...f, targetStudentId: e.target.value }))}>
                  <option value="">General / class report</option>
                  {list.map((s) => <option key={s.id} value={s.id}>{s.firstName} {s.lastName}</option>)}
                </Select>
              </Field>
              <Field label="Subject"><TextInput value={form.subject} onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))} required /></Field>
              <Field label="Content"><TextArea value={form.content} onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))} required /></Field>
              <label style={{ display: 'flex', gap: 8, fontSize: '0.875rem' }}>
                <input type="checkbox" checked={form.submit} onChange={(e) => setForm((f) => ({ ...f, submit: e.target.checked }))} />
                Submit for school review immediately
              </label>
            </div>
            <div className="modal-foot">
              <Button variant="ghost" type="button" onClick={onClose}>Cancel</Button>
              <Button variant="primary" type="submit" disabled={!form.subject.trim()}>Save</Button>
            </div>
          </form>
        </div>
      </div>
    )
  }
}

/* -------------------------------------------------------------- Mentorship */

export function TeacherMentorship() {
  const user = useCurrentUser()
  const toast = useToast()
  const [open, setOpen] = useState(false)
  const mentor = useAsync(() => mentorService.myMentor(user), [user.id])
  const mentees = useAsync(() => mentorService.mentees(user).catch(() => []), [user.id])
  const sessions = useAsync(() => mentorService.sessions(user), [user.id])

  if (mentor.data === null && !mentor.loading) {
    return (
      <div className="section-stack">
        <PageHeader title="Mentorship" description="Mentorship workspace." />
        <Card><div className="card-body"><EmptyState title="You are not registered as a mentor" description="Ask your school to enable mentoring on your account." /></div></Card>
      </div>
    )
  }

  return (
    <div className="section-stack">
      <PageHeader title="Mentorship" description="Your mentees, sessions, goals and private notes." actions={<Button variant="primary" onClick={() => setOpen(true)}>Schedule session</Button>} />
      <AsyncView data={mentees.data}>
        {(list) => (
          <div className="stat-grid">
            <StatCard label="Active mentees" value={list.length} />
            <StatCard label="Sessions scheduled" value={(sessions.data ?? []).filter((s) => s.status === 'scheduled').length} />
            <StatCard label="Sessions completed" value={(sessions.data ?? []).filter((s) => s.status === 'completed').length} />
          </div>
        )}
      </AsyncView>

      <Card>
        <CardHeader title="Sessions" />
        <div className="card-body">
          <AsyncView data={sessions} isEmpty={(d) => d.length === 0} empty={<EmptyState title="No sessions yet" />}>
            {(list) => (
              <div className="section-stack">
                {list.map((s) => (
                  <SessionRow key={s.id} sessionId={s.id} onChange={() => { sessions.reload() }} />
                ))}
              </div>
            )}
          </AsyncView>
        </div>
      </Card>

      {open && (
        <div className="modal-scrim" onMouseDown={(e) => e.target === e.currentTarget && setOpen(false)}>
          <div className="modal" role="dialog" aria-modal="true" aria-label="Schedule session">
            <div className="modal-head"><h2>Schedule session</h2><button className="icon-btn" onClick={() => setOpen(false)}>✕</button></div>
            <ScheduleForm
              mentees={mentees.data ?? []}
              onClose={() => setOpen(false)}
              onSaved={() => { setOpen(false); sessions.reload(); toast.push('Session scheduled', 'success') }}
            />
          </div>
        </div>
      )}
    </div>
  )

  function ScheduleForm({ mentees: list, onClose, onSaved }: { mentees: Student[]; onClose: () => void; onSaved: () => void }) {
    const [form, setForm] = useState({ studentId: '', date: '', time: '14:00', topic: '', goals: '' })
    return (
      <form
        onSubmit={async (e) => {
          e.preventDefault()
          await mentorService.schedule(user, {
            studentId: form.studentId, date: form.date, time: form.time, topic: form.topic,
            goals: form.goals.split(',').map((g) => g.trim()).filter(Boolean),
          })
          onSaved()
        }}
      >
        <div className="modal-body">
          <Field label="Mentee">
            <Select value={form.studentId} onChange={(e) => setForm((f) => ({ ...f, studentId: e.target.value }))} required>
              <option value="">Select…</option>
              {list.map((s) => <option key={s.id} value={s.id}>{s.firstName} {s.lastName}</option>)}
            </Select>
          </Field>
          <div className="form-grid">
            <Field label="Date"><TextInput type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} required /></Field>
            <Field label="Time"><TextInput type="time" value={form.time} onChange={(e) => setForm((f) => ({ ...f, time: e.target.value }))} required /></Field>
          </div>
          <Field label="Topic"><TextInput value={form.topic} onChange={(e) => setForm((f) => ({ ...f, topic: e.target.value }))} required /></Field>
          <Field label="Goals (comma separated)"><TextInput value={form.goals} onChange={(e) => setForm((f) => ({ ...f, goals: e.target.value }))} /></Field>
        </div>
        <div className="modal-foot">
          <Button variant="ghost" type="button" onClick={onClose}>Cancel</Button>
          <Button variant="primary" type="submit" disabled={!form.studentId || !form.date}>Schedule</Button>
        </div>
      </form>
    )
  }

  function SessionRow({ sessionId, onChange }: { sessionId: string; onChange: () => void }) {
    const one = useAsync(() => mentorService.sessions(user, {}).then((all) => all.find((s) => s.id === sessionId) ?? null), [sessionId])
    const [note, setNote] = useState<string | null>(null)
    const [priv, setPriv] = useState<string | null>(null)
    return (
      <AsyncView data={one.data}>
        {(s) => {
          if (!s) return null
          return (
            <div style={{ padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                <strong>{s.topic}</strong>
                <StatusBadge status={s.status} />
              </div>
              <div className="field-hint">{formatDate(s.date)} · {s.time} · {mentee(s.studentId)}</div>
              {s.goals.length > 0 && <div style={{ marginTop: 6 }}><Chips items={s.goals} /></div>}
              <div className="form-grid" style={{ marginTop: 8 }}>
                <Field label="Progress note (shared)">
                  <TextArea
                    value={note ?? s.progressNote}
                    onChange={(e) => setNote(e.target.value)}
                  />
                </Field>
                <Field label="Private note (mentor only)">
                  <TextArea
                    value={priv ?? s.privateNote}
                    onChange={(e) => setPriv(e.target.value)}
                  />
                </Field>
              </div>
              <div className="row-actions">
                <Button size="sm" onClick={async () => {
                  await mentorService.update(user, s.id, { progressNote: note ?? s.progressNote, privateNote: priv ?? s.privateNote })
                  toast.push('Session updated', 'success'); setNote(null); setPriv(null); onChange()
                }}>Save notes</Button>
                {s.status === 'scheduled' && (
                  <Button size="sm" variant="secondary" onClick={async () => { await mentorService.setStatus(user, s.id, 'completed'); onChange() }}>
                    Mark completed
                  </Button>
                )}
              </div>
            </div>
          )
        }}
      </AsyncView>
    )
    function mentee(id: string) {
      return (mentees.data ?? []).find((m) => m.id === id)?.firstName ?? 'Mentee'
    }
  }
}

/* -------------------------------------------------------------- Schedule / Resources / Announcements */

export function TeacherSchedule() {
  const user = useCurrentUser()
  const sessions = useAsync(() => mentorService.sessions(user), [user.id])
  return (
    <div className="section-stack">
      <PageHeader title="Schedule" description="Your upcoming mentorship sessions." />
      <Card>
        <div className="card-body">
          <AsyncView data={sessions} isEmpty={(d) => d.filter((s) => s.status === 'scheduled').length === 0} empty={<EmptyState title="Nothing scheduled" />}>
            {(list) => <Timeline items={list.filter((s) => s.status === 'scheduled').map((s) => ({ title: s.topic, when: `${formatDate(s.date)} · ${s.time}` }))} />}
          </AsyncView>
        </div>
      </Card>
    </div>
  )
}

export function TeacherResources() {
  return (
    <div className="section-stack">
      <PageHeader title="Resources" description="Teaching materials and shared resources." />
      <Card><div className="card-body"><EmptyState title="No shared resources yet" description="Resource sharing (files and links) will use the document store. File contents are not stored in this demo." /></div></Card>
    </div>
  )
}

export function TeacherAnnouncements() {
  const user = useCurrentUser()
  const toast = useToast()
  const canPost = user.permissions.includes('announcements.create')
  const [form, setForm] = useState({ title: '', body: '', priority: 'medium' as const })
  const authored = useAsync(() => announcementService.authored(user), [user.id])

  return (
    <div className="section-stack">
      <PageHeader title="Announcements" description="Post updates to your students." />
      {canPost ? (
        <Card>
          <CardHeader title="New announcement" />
          <form
            className="card-body"
            onSubmit={async (e) => {
              e.preventDefault()
              await announcementService.create(user, { title: form.title, body: form.body, priority: form.priority, audience: ['student'] })
              toast.push('Announcement published', 'success')
              setForm({ title: '', body: '', priority: 'medium' })
              authored.reload()
            }}
          >
            <Field label="Title"><TextInput value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} required /></Field>
            <Field label="Message"><TextArea value={form.body} onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))} required /></Field>
            <Button variant="primary" type="submit" disabled={!form.title.trim()}>Publish</Button>
          </form>
        </Card>
      ) : (
        <div className="banner banner-info">Your account is not authorised to post announcements. Ask your school to enable it.</div>
      )}
      <Card>
        <CardHeader title="Your announcements" />
        <div className="card-body">
          <AsyncView data={authored} isEmpty={(d) => d.length === 0} empty={<EmptyState title="None yet" />}>
            {(list) => list.map((a) => (
              <div key={a.id} style={{ padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><strong>{a.title}</strong><StatusBadge status={a.priority} /></div>
                <p style={{ color: 'var(--text-soft)', fontSize: '0.875rem' }}>{a.body}</p>
              </div>
            ))}
          </AsyncView>
        </div>
      </Card>
    </div>
  )
}
