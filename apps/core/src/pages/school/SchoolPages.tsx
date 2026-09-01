import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useCurrentUser } from '@/context/AuthContext'
import { useAsync } from '@/hooks/useAsync'
import { directoryService } from '@/services/directoryService'
import { studentService } from '@/services/studentService'
import { reportService } from '@/services/reportService'
import { requestService } from '@/services/requestService'
import { announcementService } from '@/services/announcementService'
import { documentService } from '@/services/documentService'
import { analyticsService } from '@/services/analyticsService'
import { auditService } from '@/services/auditService'
import { nameOf } from '@/services/helpers'
import {
  AsyncView, Button, Card, CardHeader, DataTable, EmptyState, Field, MetaList, PageHeader,
  Select, StatCard, StatusBadge, TextArea, TextInput, Timeline, useToast, formatDate, formatDateTime, BarChart,
} from '@/components/ui'
import { REQUEST_STATUSES } from '@/config/status'
import type { GovRequest, Student } from '@/types'

const orgId = (u: { organizationId: string | null }) => u.organizationId ?? '__none__'

/* -------------------------------------------------------------- Dashboard */

export function SchoolDashboard() {
  const user = useCurrentUser()
  const data = useAsync(() => analyticsService.school(user, orgId(user)), [user.id])
  const audit = useAsync(() => auditService.list().then((r) => r.slice(0, 6)), [user.id])

  return (
    <div className="section-stack">
      <PageHeader title="School Dashboard" description="Enrolment, attendance, performance and operations." />
      <AsyncView data={data.data} error={data.error} onRetry={data.reload}>
        {(a) => (
          <>
            <div className="stat-grid">
              <StatCard label="Total students" value={a.totalStudents} delta={{ text: `${a.activeStudents} active` }} />
              <StatCard label="Attendance rate" value={`${a.attendanceRate}%`} delta={{ text: a.attendanceRate >= 75 ? 'Healthy' : 'Below target', dir: a.attendanceRate >= 75 ? 'up' : 'down' }} />
              <StatCard label="Academic average" value={`${a.academicAverage}%`} />
              <StatCard label="Students at risk" value={a.atRisk} delta={{ text: 'attendance or grades low', dir: a.atRisk ? 'down' : undefined }} />
              <StatCard label="Teachers" value={a.teachers} />
              <StatCard label="Mentors" value={a.mentors} />
              <StatCard label="Reports pending" value={a.reportsPending} />
              <StatCard label="Report completion" value={`${a.reportCompletion}%`} />
            </div>
            <div className="grid-2">
              <Card>
                <CardHeader title="Attendance trend" />
                <div className="card-body"><BarChart data={a.attendanceTrend} unit="%" /></div>
              </Card>
              <Card>
                <CardHeader title="Performance by class" />
                <div className="card-body">
                  {a.performanceByClass.length === 0 ? <EmptyState title="No class data" /> : (
                    <table className="data"><tbody>
                      {a.performanceByClass.map((c) => (
                        <tr key={c.className}><td><strong>{c.className}</strong></td><td>{c.students} students</td><td>{c.average}% avg</td></tr>
                      ))}
                    </tbody></table>
                  )}
                </div>
              </Card>
            </div>
            <Card>
              <CardHeader title="Recent activity" action={<Link className="btn btn-ghost btn-sm" to="/school/audit">Full audit log</Link>} />
              <div className="card-body">
                <AsyncView data={audit.data}>
                  {(rows) => <Timeline items={rows.map((r) => ({ title: r.action.replace(/_/g, ' '), when: formatDateTime(r.timestamp), note: r.actorId }))} />}
                </AsyncView>
              </div>
            </Card>
          </>
        )}
      </AsyncView>
    </div>
  )
}

/* -------------------------------------------------------------- School profile */

export function SchoolProfile() {
  const user = useCurrentUser()
  const toast = useToast()
  const school = useAsync(() => directoryService.schoolForActor(user), [user.id])
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState<Record<string, string>>({})

  return (
    <div className="section-stack">
      <PageHeader title="School Profile" description="Institution details on record with the platform and government." />
      <AsyncView data={school.data} error={school.error} onRetry={school.reload}>
        {(s) => {
          if (!s) return <EmptyState title="No institution record" />
          return (
            <>
              <Card>
                <CardHeader
                  title={s.officialName}
                  subtitle={`${s.organizationCode} · ${s.district}, ${s.province}`}
                  action={<Button onClick={() => { setForm({ phone: s.phone, email: s.email, website: s.website, headName: s.headName, address: s.address, registrationNumber: s.registrationNumber }); setEditing(true) }}>Edit</Button>}
                />
                <div className="card-body">
                  <MetaList items={[
                    { label: 'Short name', value: s.shortName },
                    { label: 'Institution type', value: s.organizationType },
                    { label: 'Education levels', value: s.institutionLevels.join(', ') || '—' },
                    { label: 'Registration', value: s.registrationNumber || '—' },
                    { label: 'Head of institution', value: `${s.headTitle}: ${s.headName}` },
                    { label: 'Country', value: s.country },
                    { label: 'City', value: s.city },
                    { label: 'Phone', value: s.phone },
                    { label: 'Email', value: s.email },
                    { label: 'Website', value: s.website || '—' },
                    { label: 'Address', value: s.address },
                    { label: 'Status', value: <StatusBadge status={s.status} /> },
                  ]} />
                </div>
              </Card>

              {editing && (
                <div className="modal-scrim" onMouseDown={(e) => e.target === e.currentTarget && setEditing(false)}>
                  <div className="modal" role="dialog" aria-modal="true" aria-label="Edit school profile">
                    <div className="modal-head"><h2>Edit school profile</h2><button className="icon-btn" onClick={() => setEditing(false)}>✕</button></div>
                    <form onSubmit={async (e) => { e.preventDefault(); await directoryService.updateSchool(user, s.id, form); toast.push('School profile updated', 'success'); setEditing(false); school.reload() }}>
                      <div className="modal-body">
                        {Object.keys(form).map((k) => (
                          <Field key={k} label={k.replace(/([A-Z])/g, ' $1')}>
                            <TextInput value={form[k]} onChange={(e) => setForm((f) => ({ ...f, [k]: e.target.value }))} />
                          </Field>
                        ))}
                      </div>
                      <div className="modal-foot"><Button variant="ghost" type="button" onClick={() => setEditing(false)}>Cancel</Button><Button variant="primary" type="submit">Save</Button></div>
                    </form>
                  </div>
                </div>
              )}
            </>
          )
        }}
      </AsyncView>
    </div>
  )
}

/* -------------------------------------------------------------- Students registry */

export function SchoolStudents() {
  const user = useCurrentUser()
  const toast = useToast()
  const [adding, setAdding] = useState(false)
  const [assign, setAssign] = useState<Student | null>(null)

  const students = useAsync(() => studentService.list(user, { schoolId: orgId(user) }), [user.id])
  const classes = useAsync(() => directoryService.classes(orgId(user)), [user.id])
  const teachers = useAsync(() => directoryService.teachers(orgId(user)), [user.id])
  const mentors = useAsync(() => directoryService.mentors(orgId(user)), [user.id])

  return (
    <div className="section-stack">
      <PageHeader title="Students" description="Your full student registry." actions={<Button variant="primary" onClick={() => setAdding(true)}>Add student</Button>} />
      <Card>
        <div className="card-body">
          <AsyncView data={students} isEmpty={(d) => d.length === 0} empty={<EmptyState title="No students found" action={<Button variant="primary" onClick={() => setAdding(true)}>Add student</Button>} />}>
            {(list) => (
              <DataTable
                rows={list}
                getKey={(s) => s.id}
                searchable={(s) => `${s.firstName} ${s.lastName} ${s.studentNumber} ${s.gradeLevel}`}
                filters={[
                  { key: 'status', label: 'Status', options: ['active', 'inactive', 'archived'], match: (s, v) => s.status === v },
                  { key: 'grade', label: 'Grade', options: [...new Set(list.map((s) => s.gradeLevel))], match: (s, v) => s.gradeLevel === v },
                ]}
                columns={[
                  { key: 'name', header: 'Student', render: (s) => <strong>{s.firstName} {s.lastName}</strong>, sortValue: (s) => s.lastName },
                  { key: 'no', header: 'ID', render: (s) => s.studentNumber },
                  { key: 'grade', header: 'Grade', render: (s) => s.gradeLevel },
                  { key: 'class', header: 'Class', render: (s) => (classes.data ?? []).find((c) => c.id === s.classId)?.name ?? 'Unassigned' },
                  { key: 'mentor', header: 'Mentor', render: (s) => (s.mentorId ? 'Assigned' : '—') },
                  { key: 'status', header: 'Status', render: (s) => <StatusBadge status={s.status} /> },
                ]}
                rowActions={(s) => (
                  <>
                    <Button size="sm" variant="ghost" onClick={() => setAssign(s)}>Assign</Button>
                    {s.status !== 'archived' && (
                      <Button size="sm" variant="ghost" onClick={async () => { await studentService.archive(user, s.id); toast.push('Student archived'); students.reload() }}>
                        Archive
                      </Button>
                    )}
                  </>
                )}
              />
            )}
          </AsyncView>
        </div>
      </Card>

      {adding && (
        <AddStudentModal
          classes={(classes.data ?? []).map((c) => ({ id: c.id, name: c.name }))}
          onClose={() => setAdding(false)}
          onSaved={() => { setAdding(false); students.reload(); toast.push('Student added', 'success') }}
        />
      )}
      {assign && (
        <AssignModal
          student={assign}
          classes={(classes.data ?? []).map((c) => ({ id: c.id, name: c.name }))}
          teachers={(teachers.data ?? []).map((t) => ({ id: t.id, name: `${t.firstName} ${t.lastName}` }))}
          mentors={(mentors.data ?? []).map((m) => ({ id: m.id, name: m.specialization }))}
          onClose={() => setAssign(null)}
          onSaved={() => { setAssign(null); students.reload(); toast.push('Assignment updated', 'success') }}
        />
      )}
    </div>
  )

  function AddStudentModal({ classes: cls, onClose, onSaved }: { classes: { id: string; name: string }[]; onClose: () => void; onSaved: () => void }) {
    const [f, setF] = useState({
      firstName: '', lastName: '', dateOfBirth: '', gender: 'female', gradeLevel: 'Senior 4',
      program: '', guardianName: '', guardianPhone: '', guardianEmail: '', address: '', classId: '', email: '',
    })
    return (
      <div className="modal-scrim" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
        <div className="modal modal-lg" role="dialog" aria-modal="true" aria-label="Add student">
          <div className="modal-head"><h2>Add student</h2><button className="icon-btn" onClick={onClose}>✕</button></div>
          <form
            onSubmit={async (e) => {
              e.preventDefault()
              await studentService.create(user, {
                schoolId: orgId(user), studentNumber: `KIA-${Math.floor(2000 + Math.random() * 8000)}`,
                firstName: f.firstName, lastName: f.lastName, dateOfBirth: f.dateOfBirth || '2009-01-01',
                gender: f.gender as Student['gender'], gradeLevel: f.gradeLevel, classId: f.classId || null,
                program: f.program, guardianName: f.guardianName, guardianPhone: f.guardianPhone,
                guardianEmail: f.guardianEmail, emergencyContact: f.guardianPhone, address: f.address,
                enrollmentDate: new Date().toISOString().slice(0, 10), teacherId: null, mentorId: null,
                skills: [], interests: [], achievements: [], status: 'active', email: f.email,
              })
              onSaved()
            }}
          >
            <div className="modal-body">
              <div className="form-grid">
                <Field label="First name"><TextInput value={f.firstName} onChange={(e) => setF((x) => ({ ...x, firstName: e.target.value }))} required /></Field>
                <Field label="Last name"><TextInput value={f.lastName} onChange={(e) => setF((x) => ({ ...x, lastName: e.target.value }))} required /></Field>
                <Field label="Date of birth"><TextInput type="date" value={f.dateOfBirth} onChange={(e) => setF((x) => ({ ...x, dateOfBirth: e.target.value }))} /></Field>
                <Field label="Gender">
                  <Select value={f.gender} onChange={(e) => setF((x) => ({ ...x, gender: e.target.value }))}>
                    <option value="female">Female</option><option value="male">Male</option><option value="other">Other</option>
                  </Select>
                </Field>
                <Field label="Grade level"><TextInput value={f.gradeLevel} onChange={(e) => setF((x) => ({ ...x, gradeLevel: e.target.value }))} /></Field>
                <Field label="Class">
                  <Select value={f.classId} onChange={(e) => setF((x) => ({ ...x, classId: e.target.value }))}>
                    <option value="">Unassigned</option>
                    {cls.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </Select>
                </Field>
                <Field label="Program"><TextInput value={f.program} onChange={(e) => setF((x) => ({ ...x, program: e.target.value }))} /></Field>
                <Field label="Student email"><TextInput type="email" value={f.email} onChange={(e) => setF((x) => ({ ...x, email: e.target.value }))} /></Field>
                <Field label="Guardian name"><TextInput value={f.guardianName} onChange={(e) => setF((x) => ({ ...x, guardianName: e.target.value }))} /></Field>
                <Field label="Guardian phone"><TextInput value={f.guardianPhone} onChange={(e) => setF((x) => ({ ...x, guardianPhone: e.target.value }))} /></Field>
              </div>
              <Field label="Address"><TextInput value={f.address} onChange={(e) => setF((x) => ({ ...x, address: e.target.value }))} /></Field>
            </div>
            <div className="modal-foot">
              <Button variant="ghost" type="button" onClick={onClose}>Cancel</Button>
              <Button variant="primary" type="submit" disabled={!f.firstName || !f.lastName}>Add student</Button>
            </div>
          </form>
        </div>
      </div>
    )
  }

  function AssignModal({
    student, classes: cls, teachers: tea, mentors: men, onClose, onSaved,
  }: {
    student: Student
    classes: { id: string; name: string }[]
    teachers: { id: string; name: string }[]
    mentors: { id: string; name: string }[]
    onClose: () => void
    onSaved: () => void
  }) {
    const [classId, setClassId] = useState(student.classId ?? '')
    const [teacherId, setTeacherId] = useState(student.teacherId ?? '')
    const [mentorId, setMentorId] = useState(student.mentorId ?? '')
    return (
      <div className="modal-scrim" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
        <div className="modal" role="dialog" aria-modal="true" aria-label="Assign student">
          <div className="modal-head"><h2>Assign {student.firstName} {student.lastName}</h2><button className="icon-btn" onClick={onClose}>✕</button></div>
          <form
            onSubmit={async (e) => {
              e.preventDefault()
              if (classId !== (student.classId ?? '')) await studentService.assignClass(user, student.id, classId || null)
              if (teacherId !== (student.teacherId ?? '')) await studentService.assignTeacher(user, student.id, teacherId || null)
              if (mentorId !== (student.mentorId ?? '')) await studentService.assignMentor(user, student.id, mentorId || null)
              onSaved()
            }}
          >
            <div className="modal-body">
              <Field label="Class">
                <Select value={classId} onChange={(e) => setClassId(e.target.value)}>
                  <option value="">Unassigned</option>
                  {cls.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </Select>
              </Field>
              <Field label="Teacher">
                <Select value={teacherId} onChange={(e) => setTeacherId(e.target.value)}>
                  <option value="">Unassigned</option>
                  {tea.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </Select>
              </Field>
              <Field label="Mentor">
                <Select value={mentorId} onChange={(e) => setMentorId(e.target.value)}>
                  <option value="">Unassigned</option>
                  {men.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                </Select>
              </Field>
            </div>
            <div className="modal-foot"><Button variant="ghost" type="button" onClick={onClose}>Cancel</Button><Button variant="primary" type="submit">Save</Button></div>
          </form>
        </div>
      </div>
    )
  }
}

/* -------------------------------------------------------------- Teachers / Mentors registries */

export function SchoolTeachers() {
  const user = useCurrentUser()
  const rows = useAsync(() => directoryService.teachers(orgId(user)), [user.id])
  return (
    <div className="section-stack">
      <PageHeader title="Teachers" description="Teaching staff registry." />
      <Card>
        <div className="card-body">
          <AsyncView data={rows} isEmpty={(d) => d.length === 0} empty={<EmptyState title="No teachers" />}>
            {(list) => (
              <DataTable
                rows={list}
                getKey={(t) => t.id}
                searchable={(t) => `${t.firstName} ${t.lastName} ${t.subjects.join(' ')}`}
                columns={[
                  { key: 'name', header: 'Teacher', render: (t) => <strong>{t.firstName} {t.lastName}</strong> },
                  { key: 'staff', header: 'Staff no.', render: (t) => t.staffNumber },
                  { key: 'subjects', header: 'Subjects', render: (t) => t.subjects.join(', ') },
                  { key: 'exp', header: 'Experience', render: (t) => `${t.experienceYears} yrs`, sortValue: (t) => t.experienceYears },
                  { key: 'mentor', header: 'Mentor', render: (t) => (t.isMentor ? 'Yes' : 'No') },
                  { key: 'status', header: 'Status', render: (t) => <StatusBadge status={t.status} /> },
                ]}
              />
            )}
          </AsyncView>
        </div>
      </Card>
    </div>
  )
}

export function SchoolMentors() {
  const user = useCurrentUser()
  const rows = useAsync(() => directoryService.mentors(orgId(user)), [user.id])
  return (
    <div className="section-stack">
      <PageHeader title="Mentors" description="Mentor registry and student assignments." />
      <Card>
        <div className="card-body">
          <AsyncView data={rows} isEmpty={(d) => d.length === 0} empty={<EmptyState title="No mentors" />}>
            {(list) => (
              <DataTable
                rows={list}
                getKey={(m) => m.id}
                columns={[
                  { key: 'spec', header: 'Specialisation', render: (m) => <strong>{m.specialization}</strong> },
                  { key: 'skills', header: 'Skills', render: (m) => m.skills.join(', ') },
                  { key: 'avail', header: 'Availability', render: (m) => m.availability },
                  { key: 'mentees', header: 'Mentees', render: (m) => m.assignedStudentIds.length, sortValue: (m) => m.assignedStudentIds.length },
                  { key: 'status', header: 'Status', render: (m) => <StatusBadge status={m.status} /> },
                ]}
              />
            )}
          </AsyncView>
        </div>
      </Card>
    </div>
  )
}

/* -------------------------------------------------------------- Classes / Subjects */

export function SchoolClasses() {
  const user = useCurrentUser()
  const toast = useToast()
  const rows = useAsync(() => directoryService.classes(orgId(user)), [user.id])
  const [open, setOpen] = useState(false)
  const [f, setF] = useState({ name: '', gradeLevel: '', room: '' })
  return (
    <div className="section-stack">
      <PageHeader title="Classes" description="Class groups and rosters." actions={<Button variant="primary" onClick={() => setOpen(true)}>Create class</Button>} />
      <Card>
        <div className="card-body">
          <AsyncView data={rows} isEmpty={(d) => d.length === 0} empty={<EmptyState title="No classes" />}>
            {(list) => (
              <DataTable
                rows={list}
                getKey={(c) => c.id}
                columns={[
                  { key: 'name', header: 'Class', render: (c) => <strong>{c.name}</strong> },
                  { key: 'grade', header: 'Grade', render: (c) => c.gradeLevel },
                  { key: 'room', header: 'Room', render: (c) => c.room },
                  { key: 'students', header: 'Students', render: (c) => c.studentIds.length, sortValue: (c) => c.studentIds.length },
                  { key: 'status', header: 'Status', render: (c) => <StatusBadge status={c.status} /> },
                ]}
              />
            )}
          </AsyncView>
        </div>
      </Card>
      {open && (
        <div className="modal-scrim" onMouseDown={(e) => e.target === e.currentTarget && setOpen(false)}>
          <div className="modal" role="dialog" aria-modal="true" aria-label="Create class">
            <div className="modal-head"><h2>Create class</h2><button className="icon-btn" onClick={() => setOpen(false)}>✕</button></div>
            <form onSubmit={async (e) => {
              e.preventDefault()
              await directoryService.createClass(user, {
                schoolId: orgId(user), name: f.name, gradeLevel: f.gradeLevel, homeroomTeacherId: null,
                subjectIds: [], studentIds: [], room: f.room, status: 'active',
              })
              toast.push('Class created', 'success'); setOpen(false); setF({ name: '', gradeLevel: '', room: '' }); rows.reload()
            }}>
              <div className="modal-body">
                <Field label="Name"><TextInput value={f.name} onChange={(e) => setF((x) => ({ ...x, name: e.target.value }))} required /></Field>
                <Field label="Grade level"><TextInput value={f.gradeLevel} onChange={(e) => setF((x) => ({ ...x, gradeLevel: e.target.value }))} /></Field>
                <Field label="Room"><TextInput value={f.room} onChange={(e) => setF((x) => ({ ...x, room: e.target.value }))} /></Field>
              </div>
              <div className="modal-foot"><Button variant="ghost" type="button" onClick={() => setOpen(false)}>Cancel</Button><Button variant="primary" type="submit">Create</Button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export function SchoolSubjects() {
  const user = useCurrentUser()
  const rows = useAsync(() => directoryService.subjects(orgId(user)), [user.id])
  return (
    <div className="section-stack">
      <PageHeader title="Subjects" description="Subjects offered by the school." />
      <Card>
        <div className="card-body">
          <AsyncView data={rows} isEmpty={(d) => d.length === 0} empty={<EmptyState title="No subjects" />}>
            {(list) => (
              <DataTable
                rows={list}
                getKey={(s) => s.id}
                columns={[
                  { key: 'name', header: 'Subject', render: (s) => <strong>{s.name}</strong> },
                  { key: 'code', header: 'Code', render: (s) => s.code },
                  { key: 'dept', header: 'Department', render: (s) => s.department },
                  { key: 'desc', header: 'Description', render: (s) => s.description },
                ]}
              />
            )}
          </AsyncView>
        </div>
      </Card>
    </div>
  )
}

/* -------------------------------------------------------------- Attendance / Academic overview */

export function SchoolAttendance() {
  const user = useCurrentUser()
  const data = useAsync(() => analyticsService.school(user, orgId(user)), [user.id])
  return (
    <div className="section-stack">
      <PageHeader title="Attendance" description="School-wide attendance overview." />
      <AsyncView data={data.data}>
        {(a) => (
          <>
            <div className="stat-grid">
              <StatCard label="Attendance rate" value={`${a.attendanceRate}%`} />
              <StatCard label="Students at risk" value={a.atRisk} />
            </div>
            <Card><CardHeader title="Attendance trend" /><div className="card-body"><BarChart data={a.attendanceTrend} unit="%" /></div></Card>
          </>
        )}
      </AsyncView>
    </div>
  )
}

export function SchoolAcademic() {
  const user = useCurrentUser()
  const data = useAsync(() => analyticsService.school(user, orgId(user)), [user.id])
  return (
    <div className="section-stack">
      <PageHeader title="Academic Records" description="Performance across classes and subjects." />
      <AsyncView data={data.data}>
        {(a) => (
          <Card>
            <CardHeader title="Performance by class" subtitle={`School average ${a.academicAverage}%`} />
            <div className="card-body"><BarChart data={a.performanceByClass.map((c) => ({ label: c.className.split(' ')[0], value: c.average }))} unit="%" /></div>
          </Card>
        )}
      </AsyncView>
    </div>
  )
}

/* -------------------------------------------------------------- Reports centre */

export function SchoolReports() {
  const user = useCurrentUser()
  const toast = useToast()
  const all = useAsync(() => reportService.list(user, { organizationId: orgId(user) }), [user.id])
  const [review, setReview] = useState<{ id: string; subject: string } | null>(null)
  const [note, setNote] = useState('')

  return (
    <div className="section-stack">
      <PageHeader title="Reports" description="Review, approve and archive reports across the school." />
      <Card>
        <div className="card-body">
          <AsyncView data={all} isEmpty={(d) => d.length === 0} empty={<EmptyState title="No reports" />}>
            {(list) => (
              <DataTable
                rows={list}
                getKey={(r) => r.id}
                searchable={(r) => `${r.subject} ${r.reference}`}
                filters={[
                  { key: 'status', label: 'Status', options: ['draft', 'submitted', 'under_review', 'approved', 'rejected'], match: (r, v) => r.status === v },
                  { key: 'type', label: 'Type', options: [...new Set(list.map((r) => r.type))], match: (r, v) => r.type === v },
                ]}
                columns={[
                  { key: 'subject', header: 'Report', render: (r) => <strong>{r.subject}</strong> },
                  { key: 'type', header: 'Type', render: (r) => r.type },
                  { key: 'ref', header: 'Reference', render: (r) => r.reference },
                  { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
                  { key: 'updated', header: 'Updated', render: (r) => formatDate(r.updatedAt), sortValue: (r) => r.updatedAt },
                ]}
                rowActions={(r) =>
                  r.status === 'submitted' || r.status === 'under_review' ? (
                    <Button size="sm" variant="secondary" onClick={() => { setReview({ id: r.id, subject: r.subject }); setNote('') }}>Review</Button>
                  ) : null
                }
              />
            )}
          </AsyncView>
        </div>
      </Card>

      {review && (
        <div className="modal-scrim" onMouseDown={(e) => e.target === e.currentTarget && setReview(null)}>
          <div className="modal" role="dialog" aria-modal="true" aria-label="Review report">
            <div className="modal-head"><h2>Review: {review.subject}</h2><button className="icon-btn" onClick={() => setReview(null)}>✕</button></div>
            <div className="modal-body">
              <Field label="Review note"><TextArea value={note} onChange={(e) => setNote(e.target.value)} /></Field>
            </div>
            <div className="modal-foot">
              <Button variant="ghost" onClick={() => setReview(null)}>Cancel</Button>
              <Button variant="danger" onClick={async () => { await reportService.review(user, review.id, 'rejected', note); toast.push('Report rejected'); setReview(null); all.reload() }}>Reject</Button>
              <Button variant="primary" onClick={async () => { await reportService.review(user, review.id, 'approved', note); toast.push('Report approved', 'success'); setReview(null); all.reload() }}>Approve</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/* -------------------------------------------------------------- Documents */

export function SchoolDocuments() {
  const user = useCurrentUser()
  const toast = useToast()
  const rows = useAsync(() => documentService.forOrganization(user, orgId(user)), [user.id])
  return (
    <div className="section-stack">
      <PageHeader title="Documents" description="Institutional documents and verified records." />
      <div className="banner banner-info">Metadata only — file contents are not stored in this demo.</div>
      <Card>
        <div className="card-body">
          <div className="toolbar">
            <label className="btn btn-secondary btn-sm">
              Add document
              <input type="file" hidden onChange={async (e) => {
                const file = e.target.files?.[0]
                if (!file) return
                await documentService.register(user, { ownerId: user.id, organizationId: orgId(user), type: 'School document', title: file.name, fileName: file.name, size: file.size })
                toast.push('Document recorded', 'success'); rows.reload()
              }} />
            </label>
          </div>
          <AsyncView data={rows} isEmpty={(d) => d.length === 0} empty={<EmptyState title="No documents" />}>
            {(list) => (
              <DataTable
                rows={list}
                getKey={(d) => d.id}
                columns={[
                  { key: 'title', header: 'Title', render: (d) => <strong>{d.title}</strong> },
                  { key: 'type', header: 'Type', render: (d) => d.type },
                  { key: 'file', header: 'File', render: (d) => `${d.fileName} · ${(d.size / 1024).toFixed(0)} KB` },
                  { key: 'status', header: 'Status', render: (d) => <StatusBadge status={d.status} /> },
                ]}
                rowActions={(d) => d.status === 'pending' ? (
                  <Button size="sm" variant="ghost" onClick={async () => { await documentService.setStatus(user, d.id, 'verified'); toast.push('Verified'); rows.reload() }}>Verify</Button>
                ) : null}
              />
            )}
          </AsyncView>
        </div>
      </Card>
    </div>
  )
}

/* -------------------------------------------------------------- Announcements */

export function SchoolAnnouncements() {
  const user = useCurrentUser()
  const toast = useToast()
  const [f, setF] = useState({ title: '', body: '', priority: 'medium' as const })
  const authored = useAsync(() => announcementService.authored(user), [user.id])
  return (
    <div className="section-stack">
      <PageHeader title="Announcements" description="Publish updates to students, teachers and mentors." />
      <Card>
        <CardHeader title="New announcement" />
        <form className="card-body" onSubmit={async (e) => {
          e.preventDefault()
          await announcementService.create(user, { title: f.title, body: f.body, priority: f.priority })
          toast.push('Announcement published', 'success'); setF({ title: '', body: '', priority: 'medium' }); authored.reload()
        }}>
          <Field label="Title"><TextInput value={f.title} onChange={(e) => setF((x) => ({ ...x, title: e.target.value }))} required /></Field>
          <Field label="Message"><TextArea value={f.body} onChange={(e) => setF((x) => ({ ...x, body: e.target.value }))} required /></Field>
          <Field label="Priority">
            <Select value={f.priority} onChange={(e) => setF((x) => ({ ...x, priority: e.target.value as never }))}>
              {['low', 'medium', 'high', 'urgent'].map((p) => <option key={p}>{p}</option>)}
            </Select>
          </Field>
          <Button variant="primary" type="submit" disabled={!f.title.trim()}>Publish</Button>
        </form>
      </Card>
      <Card>
        <CardHeader title="Published" />
        <div className="card-body">
          <AsyncView data={authored} isEmpty={(d) => d.length === 0} empty={<EmptyState title="Nothing published yet" />}>
            {(list) => list.map((a) => (
              <div key={a.id} style={{ padding: '10px 0', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                <div><strong>{a.title}</strong><p style={{ color: 'var(--text-soft)', fontSize: '0.875rem' }}>{a.body}</p></div>
                <div className="row-actions">
                  <Button size="sm" variant="ghost" onClick={async () => { await announcementService.setPinned(user, a.id, !a.pinned); authored.reload() }}>{a.pinned ? 'Unpin' : 'Pin'}</Button>
                  <Button size="sm" variant="ghost" onClick={async () => { await announcementService.remove(user, a.id); authored.reload() }}>Remove</Button>
                </div>
              </div>
            ))}
          </AsyncView>
        </div>
      </Card>
    </div>
  )
}

/* -------------------------------------------------------------- Government liaison */

export function SchoolGovernment() {
  const user = useCurrentUser()
  const toast = useToast()
  const [open, setOpen] = useState(false)
  const [detail, setDetail] = useState<GovRequest | null>(null)
  const [f, setF] = useState({ type: 'Infrastructure', title: '', description: '', priority: 'medium' as const })
  const requests = useAsync(() => requestService.list(user), [user.id])
  const feed = useAsync(() => announcementService.feedFor(user).then((r) => r.filter((a) => a.scope === 'government')), [user.id])

  return (
    <div className="section-stack">
      <PageHeader title="Government" description="Submit requests to the education authority and track responses." actions={<Button variant="primary" onClick={() => setOpen(true)}>New request</Button>} />

      <Card>
        <CardHeader title="Government announcements" />
        <div className="card-body">
          <AsyncView data={feed} isEmpty={(d) => d.length === 0} empty={<EmptyState title="No government announcements" />}>
            {(list) => list.map((a) => (
              <div key={a.id} style={{ padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><strong>{a.title}</strong><StatusBadge status={a.priority} /></div>
                <p style={{ color: 'var(--text-soft)', fontSize: '0.875rem' }}>{a.body}</p>
              </div>
            ))}
          </AsyncView>
        </div>
      </Card>

      <Card>
        <CardHeader title="Your requests" />
        <div className="card-body">
          <AsyncView data={requests} isEmpty={(d) => d.length === 0} empty={<EmptyState title="No requests submitted" action={<Button variant="primary" onClick={() => setOpen(true)}>Create request</Button>} />}>
            {(list) => (
              <DataTable
                rows={list}
                getKey={(r) => r.id}
                columns={[
                  { key: 'title', header: 'Request', render: (r) => <strong>{r.title}</strong> },
                  { key: 'ref', header: 'Reference', render: (r) => r.reference },
                  { key: 'type', header: 'Type', render: (r) => r.type },
                  { key: 'priority', header: 'Priority', render: (r) => <StatusBadge status={r.priority} /> },
                  { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
                ]}
                rowActions={(r) => <Button size="sm" variant="ghost" onClick={() => setDetail(r)}>Track</Button>}
              />
            )}
          </AsyncView>
        </div>
      </Card>

      {open && (
        <div className="modal-scrim" onMouseDown={(e) => e.target === e.currentTarget && setOpen(false)}>
          <div className="modal" role="dialog" aria-modal="true" aria-label="New government request">
            <div className="modal-head"><h2>New government request</h2><button className="icon-btn" onClick={() => setOpen(false)}>✕</button></div>
            <form onSubmit={async (e) => {
              e.preventDefault()
              await requestService.create(user, {
                type: f.type, title: f.title, description: f.description, priority: f.priority,
                governmentDepartment: 'Basic Education Directorate',
              })
              toast.push('Request submitted to MINEDUC', 'success'); setOpen(false); setF({ type: 'Infrastructure', title: '', description: '', priority: 'medium' }); requests.reload()
            }}>
              <div className="modal-body">
                <Field label="Type">
                  <Select value={f.type} onChange={(e) => setF((x) => ({ ...x, type: e.target.value }))}>
                    {['Infrastructure', 'Funding', 'Resources', 'Staffing', 'Incident report', 'Statistics submission', 'Other'].map((t) => <option key={t}>{t}</option>)}
                  </Select>
                </Field>
                <Field label="Priority">
                  <Select value={f.priority} onChange={(e) => setF((x) => ({ ...x, priority: e.target.value as never }))}>
                    {['low', 'medium', 'high', 'urgent'].map((p) => <option key={p}>{p}</option>)}
                  </Select>
                </Field>
                <Field label="Title"><TextInput value={f.title} onChange={(e) => setF((x) => ({ ...x, title: e.target.value }))} required /></Field>
                <Field label="Description"><TextArea value={f.description} onChange={(e) => setF((x) => ({ ...x, description: e.target.value }))} required /></Field>
              </div>
              <div className="modal-foot"><Button variant="ghost" type="button" onClick={() => setOpen(false)}>Cancel</Button><Button variant="primary" type="submit" disabled={!f.title.trim()}>Submit</Button></div>
            </form>
          </div>
        </div>
      )}

      {detail && <RequestDetail request={detail} onClose={() => setDetail(null)} canRespond={false} onChange={() => requests.reload()} />}
    </div>
  )
}

/* -------------------------------------------------------------- Audit (school-scoped) */

export function SchoolAudit() {
  const user = useCurrentUser()
  const rows = useAsync(() => auditService.list(), [user.id])
  return (
    <div className="section-stack">
      <PageHeader title="Audit Log" description="Actions recorded across your school's operations." />
      <Card>
        <div className="card-body">
          <AsyncView data={rows} isEmpty={(d) => d.length === 0} empty={<EmptyState title="No audit entries" />}>
            {(list) => (
              <DataTable
                rows={list}
                getKey={(r) => r.id}
                searchable={(r) => `${r.action} ${r.actorId} ${r.targetType ?? ''}`}
                filters={[{ key: 'action', label: 'Action', options: [...new Set(list.map((r) => r.action))], match: (r, v) => r.action === v }]}
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

/* -------------------------------------------------------------- shared: request detail w/ timeline */

export function RequestDetail({
  request, onClose, canRespond, onChange,
}: {
  request: GovRequest
  onClose: () => void
  canRespond: boolean
  onChange: () => void
}) {
  const user = useCurrentUser()
  const toast = useToast()
  const [note, setNote] = useState('')
  const [response, setResponse] = useState(request.response)
  const [status, setStatus] = useState(request.status)
  const school = useAsync(() => requestService.schoolName(request.schoolId), [request.id])
  const timelineNames = useAsync(async () => {
    const entries = await Promise.all(request.timeline.map(async (t) => ({ ...t, name: await nameOf(t.actorId) })))
    return entries
  }, [request.id])

  return (
    <div className="modal-scrim" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-lg" role="dialog" aria-modal="true" aria-label="Request detail">
        <div className="modal-head"><h2>{request.reference}</h2><button className="icon-btn" onClick={onClose}>✕</button></div>
        <div className="modal-body">
          <MetaList items={[
            { label: 'School', value: school.data ?? request.schoolId },
            { label: 'Type', value: request.type },
            { label: 'Priority', value: <StatusBadge status={request.priority} /> },
            { label: 'Status', value: <StatusBadge status={request.status} /> },
            { label: 'Submitted', value: formatDate(request.submittedAt) },
          ]} />
          <h3 style={{ marginTop: 16 }}>{request.title}</h3>
          <p style={{ color: 'var(--text-soft)', margin: '6px 0 16px' }}>{request.description}</p>

          {request.response && (
            <div className="banner banner-info"><strong>Response:&nbsp;</strong>{request.response}</div>
          )}

          <h4 style={{ margin: '12px 0 8px' }}>Timeline</h4>
          <AsyncView data={timelineNames.data}>
            {(entries) => (
              <Timeline items={entries.map((t) => ({ title: `${t.action} — ${t.name}`, when: formatDateTime(t.at), note: t.note }))} />
            )}
          </AsyncView>

          {canRespond && (
            <div style={{ marginTop: 16, borderTop: '1px solid var(--border)', paddingTop: 16 }}>
              <Field label="Move to status">
                <Select value={status} onChange={(e) => setStatus(e.target.value as typeof status)}>
                  {REQUEST_STATUSES.filter((s) => !['draft', 'submitted'].includes(s)).map((s) => <option key={s}>{s}</option>)}
                </Select>
              </Field>
              <Field label="Note (added to the timeline)"><TextArea value={note} onChange={(e) => setNote(e.target.value)} /></Field>
              <Field label="Official response (optional)"><TextArea value={response} onChange={(e) => setResponse(e.target.value)} /></Field>
            </div>
          )}
        </div>
        <div className="modal-foot">
          <Button variant="ghost" onClick={onClose}>Close</Button>
          {canRespond && (
            <Button
              variant="primary"
              onClick={async () => {
                const map: Record<string, Parameters<typeof requestService.advance>[2]> = {
                  received: 'received', under_review: 'under_review', need_information: 'need_information',
                  approved: 'approved', rejected: 'rejected', in_progress: 'in_progress',
                  completed: 'completed', cancelled: 'cancelled',
                }
                await requestService.advance(user, request.id, map[status] ?? 'under_review', note || `Moved to ${status}`, {
                  response: response || undefined,
                })
                toast.push('Request updated', 'success')
                onChange()
                onClose()
              }}
            >
              Update request
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
