import { useState } from 'react'
import { useCurrentUser } from '@/context/AuthContext'
import { useAsync } from '@/hooks/useAsync'
import { timetableService } from '@/services/operationsService'
import { admissionService } from '@/services/operationsService'
import { financeService } from '@/services/operationsService'
import { bulkImportService, batchService } from '@/services'
import { directoryService } from '@/services/directoryService'
import { studentService } from '@/services/studentService'
import {
  AsyncView, Badge, Button, Card, CardHeader, DataTable, EmptyState, Field, Modal, PageHeader,
  Select, StatCard, StatusBadge, TextArea, TextInput, Timeline, useToast, formatDate, formatDateTime,
} from '@/components/ui'
import { EDUCATION_KEYS } from '@shared/config/educationStructures'
import type {
  Application, EducationStructureKey, FeeItem, Id, ImportKind, Invoice, PaymentMethod, TimetableSlot,
} from '@shared/types'

const DAYS = ['', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri']
const money = (n: number, c = 'RWF') => `${c} ${n.toLocaleString()}`

/* ================================================================ Timetable */

export function Timetable() {
  const user = useCurrentUser()
  const toast = useToast()
  const classes = useAsync(() => directoryService.classes(user).catch(() => []), [user.id])
  const subjects = useAsync(() => directoryService.subjects(user).catch(() => []), [user.id])
  const teachers = useAsync(() => directoryService.teachers(user).catch(() => []), [user.id])
  const [classId, setClassId] = useState('')
  const slots = useAsync(() => (classId ? timetableService.forClass(user, classId) : Promise.resolve([] as TimetableSlot[])), [classId])
  const [f, setF] = useState({ dayOfWeek: 1, period: 1, startTime: '08:00', endTime: '08:50', subjectId: '', teacherId: '', room: '' })

  const grid: Record<string, TimetableSlot> = {}
  for (const s of slots.data ?? []) grid[`${s.dayOfWeek}-${s.period}`] = s
  const periods = [1, 2, 3, 4, 5, 6, 7, 8]

  return (
    <div className="section-stack">
      <PageHeader title="Timetable" description="Schedule subjects into day/period slots. Period-level attendance resolves its subject from here." />
      <Card>
        <div className="card-body">
          <Field label="Class">
            <Select value={classId} onChange={(e) => setClassId(e.target.value)}>
              <option value="">Select…</option>
              {(classes.data ?? []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </Field>
        </div>
      </Card>

      {classId && (
        <>
          <Card>
            <div className="card-body" style={{ overflowX: 'auto' }}>
              <table className="data">
                <thead><tr><th>Period</th>{DAYS.slice(1).map((d) => <th key={d}>{d}</th>)}</tr></thead>
                <tbody>
                  {periods.map((p) => (
                    <tr key={p}>
                      <td><strong>P{p}</strong></td>
                      {[1, 2, 3, 4, 5].map((day) => {
                        const s = grid[`${day}-${p}`]
                        return (
                          <td key={day}>
                            {s ? (
                              <span>
                                {s.subjectName || '—'}<br />
                                <span className="field-hint">{s.startTime}–{s.endTime}</span>{' '}
                                <button className="link-btn" onClick={async () => { await timetableService.remove(user, s.id); slots.reload() }}>✕</button>
                              </span>
                            ) : <span className="field-hint">—</span>}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <Card>
            <CardHeader title="Add a slot" />
            <form className="card-body" onSubmit={async (e) => {
              e.preventDefault()
              try {
                await timetableService.create(user, {
                  classId, dayOfWeek: f.dayOfWeek, period: f.period, startTime: f.startTime, endTime: f.endTime,
                  subjectId: f.subjectId || null, teacherId: f.teacherId || null, room: f.room,
                })
                toast.push('Slot added', 'success')
                slots.reload()
              } catch (err) {
                toast.push(err instanceof Error ? err.message : 'Could not add', 'error')
              }
            }}>
              <div className="form-grid">
                <Field label="Day"><Select value={String(f.dayOfWeek)} onChange={(e) => setF((x) => ({ ...x, dayOfWeek: Number(e.target.value) }))}>{[1, 2, 3, 4, 5].map((d) => <option key={d} value={d}>{DAYS[d]}</option>)}</Select></Field>
                <Field label="Period"><TextInput type="number" value={String(f.period)} onChange={(e) => setF((x) => ({ ...x, period: Number(e.target.value) || 1 }))} /></Field>
                <Field label="Start"><TextInput value={f.startTime} onChange={(e) => setF((x) => ({ ...x, startTime: e.target.value }))} /></Field>
                <Field label="End"><TextInput value={f.endTime} onChange={(e) => setF((x) => ({ ...x, endTime: e.target.value }))} /></Field>
                <Field label="Subject"><Select value={f.subjectId} onChange={(e) => setF((x) => ({ ...x, subjectId: e.target.value }))}><option value="">—</option>{(subjects.data ?? []).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</Select></Field>
                <Field label="Teacher"><Select value={f.teacherId} onChange={(e) => setF((x) => ({ ...x, teacherId: e.target.value }))}><option value="">—</option>{(teachers.data ?? []).map((t) => <option key={t.id} value={t.id}>{t.firstName} {t.lastName}</option>)}</Select></Field>
                <Field label="Room"><TextInput value={f.room} onChange={(e) => setF((x) => ({ ...x, room: e.target.value }))} /></Field>
              </div>
              <Button variant="primary" type="submit">Add slot</Button>
            </form>
          </Card>
        </>
      )}
    </div>
  )
}

/* ================================================================ Admissions */

export function Admissions() {
  const user = useCurrentUser()
  const toast = useToast()
  const data = useAsync(() => admissionService.list(user), [user.id])
  const classes = useAsync(() => directoryService.classes(user).catch(() => []), [user.id])
  const [open, setOpen] = useState(false)
  const [detail, setDetail] = useState<Application | null>(null)
  const [f, setF] = useState<{ applicantFirstName: string; applicantLastName: string; gradeApplyingFor: string; level: EducationStructureKey; guardianName: string; guardianPhone: string; priorSchool: string; notes: string }>({
    applicantFirstName: '', applicantLastName: '', gradeApplyingFor: '', level: 'O_LEVEL', guardianName: '', guardianPhone: '', priorSchool: '', notes: '',
  })

  const act = async (app: Application, fn: () => Promise<unknown>, msg: string) => {
    try { await fn(); toast.push(msg, 'success'); data.reload(); setDetail(null); void app } catch (err) { toast.push(err instanceof Error ? err.message : 'Failed', 'error') }
  }

  return (
    <div className="section-stack">
      <PageHeader title="Admissions" description="Applications from DRAFT → offer → enrolment. Enrolling creates the student record once, no duplicates." actions={<Button variant="primary" onClick={() => setOpen(true)}>New application</Button>} />
      <AsyncView data={data} isEmpty={(d) => d.length === 0} empty={<EmptyState title="No applications" />} onRetry={data.reload}>
        {(rows) => (
          <Card><div className="card-body">
            <DataTable
              rows={rows}
              getKey={(r) => r.id}
              emptyTitle="No applications"
              filters={[{ key: 'status', label: 'Status', options: ['SUBMITTED', 'UNDER_REVIEW', 'SHORTLISTED', 'OFFERED', 'OFFER_ACCEPTED', 'ENROLLED', 'REJECTED'], match: (r, v) => r.status === v }]}
              columns={[
                { key: 'name', header: 'Applicant', render: (r: Application) => <strong>{r.applicantFirstName} {r.applicantLastName}</strong> },
                { key: 'grade', header: 'Grade', render: (r: Application) => r.gradeApplyingFor },
                { key: 'intake', header: 'Intake', render: (r: Application) => r.intakeYear },
                { key: 'status', header: 'Status', render: (r: Application) => <StatusBadge status={r.status} /> },
              ]}
              rowActions={(r) => <Button size="sm" variant="ghost" onClick={() => setDetail(r)}>Open</Button>}
            />
          </div></Card>
        )}
      </AsyncView>

      <Modal open={open} onClose={() => setOpen(false)} title="New application" footer={
        <>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="primary" disabled={!f.applicantFirstName.trim() || !f.applicantLastName.trim() || !f.gradeApplyingFor.trim()} onClick={async () => {
            try {
              await admissionService.create(user, { ...f, submit: true })
              toast.push('Application submitted', 'success')
              setOpen(false); data.reload()
            } catch (err) { toast.push(err instanceof Error ? err.message : 'Failed', 'error') }
          }}>Submit</Button>
        </>
      }>
        <div className="form-grid">
          <Field label="First name"><TextInput value={f.applicantFirstName} onChange={(e) => setF((x) => ({ ...x, applicantFirstName: e.target.value }))} /></Field>
          <Field label="Last name"><TextInput value={f.applicantLastName} onChange={(e) => setF((x) => ({ ...x, applicantLastName: e.target.value }))} /></Field>
          <Field label="Grade applying for"><TextInput value={f.gradeApplyingFor} onChange={(e) => setF((x) => ({ ...x, gradeApplyingFor: e.target.value }))} placeholder="e.g. S4" /></Field>
          <Field label="Level"><Select value={f.level} onChange={(e) => setF((x) => ({ ...x, level: e.target.value as EducationStructureKey }))}>{EDUCATION_KEYS.map((k) => <option key={k}>{k}</option>)}</Select></Field>
          <Field label="Guardian name"><TextInput value={f.guardianName} onChange={(e) => setF((x) => ({ ...x, guardianName: e.target.value }))} /></Field>
          <Field label="Guardian phone"><TextInput value={f.guardianPhone} onChange={(e) => setF((x) => ({ ...x, guardianPhone: e.target.value }))} /></Field>
          <Field label="Prior school"><TextInput value={f.priorSchool} onChange={(e) => setF((x) => ({ ...x, priorSchool: e.target.value }))} /></Field>
        </div>
        <Field label="Notes"><TextArea value={f.notes} onChange={(e) => setF((x) => ({ ...x, notes: e.target.value }))} /></Field>
      </Modal>

      {detail && (
        <Modal open onClose={() => setDetail(null)} size="lg" title={`${detail.reference} — ${detail.applicantFirstName} ${detail.applicantLastName}`}>
          <p style={{ fontSize: '0.9rem' }}>Grade {detail.gradeApplyingFor} · intake {detail.intakeYear} · <StatusBadge status={detail.status} /></p>
          {detail.priorSchool && <p style={{ fontSize: '0.85rem', color: 'var(--text-soft)' }}>Prior: {detail.priorSchool}</p>}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', margin: '10px 0' }}>
            {['SUBMITTED', 'UNDER_REVIEW', 'SHORTLISTED', 'WAITLISTED'].includes(detail.status) && (
              <>
                <Button size="sm" onClick={() => act(detail, () => admissionService.review(user, detail.id, 'start_review'), 'Under review')}>Start review</Button>
                <Button size="sm" onClick={() => act(detail, () => admissionService.review(user, detail.id, 'shortlist'), 'Shortlisted')}>Shortlist</Button>
                <Button size="sm" variant="primary" onClick={() => act(detail, () => admissionService.review(user, detail.id, 'offer'), 'Offer made')}>Make offer</Button>
                <Button size="sm" variant="danger" onClick={() => act(detail, () => admissionService.review(user, detail.id, 'reject', { note: 'Not successful' }), 'Rejected')}>Reject</Button>
              </>
            )}
            {detail.status === 'OFFERED' && <Button size="sm" onClick={() => act(detail, () => admissionService.acceptOffer(user, detail.id), 'Offer accepted')}>Accept offer</Button>}
            {(detail.status === 'OFFER_ACCEPTED' || detail.status === 'OFFERED') && (
              <EnrollButton app={detail} classes={classes.data ?? []} onDone={() => { data.reload(); setDetail(null) }} />
            )}
          </div>
          <h4 style={{ margin: '12px 0 6px' }}>Timeline</h4>
          <Timeline items={detail.timeline.map((t) => ({ title: t.action, when: formatDateTime(t.at), note: t.note }))} />
        </Modal>
      )}
    </div>
  )
}

function EnrollButton({ app, classes, onDone }: { app: Application; classes: { id: Id; name: string }[]; onDone: () => void }) {
  const user = useCurrentUser()
  const toast = useToast()
  const [open, setOpen] = useState(false)
  const [classId, setClassId] = useState('')
  return (
    <>
      <Button size="sm" variant="primary" onClick={() => setOpen(true)}>Enrol</Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Enrol applicant" footer={
        <>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="primary" onClick={async () => {
            try {
              const r = await admissionService.enroll(user, app.id, { classId: classId || null })
              toast.push(`Enrolled as ${r.student.id}`, 'success')
              setOpen(false); onDone()
            } catch (err) { toast.push(err instanceof Error ? err.message : 'Failed', 'error') }
          }}>Enrol</Button>
        </>
      }>
        <p style={{ fontSize: '0.85rem' }}>Creates a student record + account + initial enrolment for <strong>{app.applicantFirstName} {app.applicantLastName}</strong>.</p>
        <Field label="Class (optional)"><Select value={classId} onChange={(e) => setClassId(e.target.value)}><option value="">Assign later</option>{classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select></Field>
      </Modal>
    </>
  )
}

/* ================================================================ Finance */

export function Finance() {
  const user = useCurrentUser()
  const toast = useToast()
  const summary = useAsync(() => financeService.summary(user), [user.id])
  const fees = useAsync(() => financeService.feeStructures(user), [user.id])
  const invoices = useAsync(() => financeService.invoices(user), [user.id])
  const students = useAsync(() => studentService.list(user).catch(() => []), [user.id])
  const [invOpen, setInvOpen] = useState(false)
  const [pay, setPay] = useState<Invoice | null>(null)
  const [inv, setInv] = useState({ studentId: '', feeStructureId: '', term: 'Term 3 2026', academicYear: '2026', discount: 0 })
  const [p, setP] = useState<{ amount: number; method: PaymentMethod; reference: string }>({ amount: 0, method: 'mobile_money', reference: '' })

  return (
    <div className="section-stack">
      <PageHeader title="Finance" description="Fee structures, invoices and manually-recorded payments. No payment gateway — receipts are generated on record." actions={<Button variant="primary" onClick={() => setInvOpen(true)}>New invoice</Button>} />
      <AsyncView data={summary}>
        {(s) => (
          <div className="stat-grid">
            <StatCard label="Billed" value={money(s.billed, s.currency)} />
            <StatCard label="Collected" value={money(s.collected, s.currency)} />
            <StatCard label="Outstanding" value={money(s.outstanding, s.currency)} />
            <StatCard label="Overdue invoices" value={s.overdueInvoices} />
          </div>
        )}
      </AsyncView>

      <Card>
        <CardHeader title="Fee structures" />
        <div className="card-body">
          <AsyncView data={fees} isEmpty={(d) => d.length === 0} empty={<EmptyState title="No fee structures" />}>
            {(rows) => rows.map((fs) => (
              <div key={fs.id} style={{ padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                <strong>{fs.name}</strong> · {fs.level} · {money(fs.total, fs.currency)} {fs.isDefault && <Badge tone="success">default</Badge>}
              </div>
            ))}
          </AsyncView>
          <FeeStructureForm onDone={() => fees.reload()} />
        </div>
      </Card>

      <Card>
        <CardHeader title="Invoices" />
        <div className="card-body">
          <AsyncView data={invoices} isEmpty={(d) => d.length === 0} empty={<EmptyState title="No invoices" />}>
            {(rows) => (
              <DataTable
                rows={rows}
                getKey={(r) => r.id}
                emptyTitle="No invoices"
                columns={[
                  { key: 'ref', header: 'Invoice', render: (r: Invoice) => <strong>{r.reference}</strong> },
                  { key: 'student', header: 'Student', render: (r: Invoice) => r.studentName },
                  { key: 'term', header: 'Term', render: (r: Invoice) => r.term },
                  { key: 'total', header: 'Total', render: (r: Invoice) => money(r.total, r.currency) },
                  { key: 'bal', header: 'Balance', render: (r: Invoice) => money(r.total - r.paidAmount, r.currency) },
                  { key: 'status', header: 'Status', render: (r: Invoice) => <StatusBadge status={r.status} /> },
                ]}
                rowActions={(r) => (['PENDING', 'PARTIALLY_PAID', 'OVERDUE'].includes(r.status)
                  ? <Button size="sm" variant="primary" onClick={() => { setPay(r); setP({ amount: r.total - r.paidAmount, method: 'mobile_money', reference: '' }) }}>Record payment</Button>
                  : null)}
              />
            )}
          </AsyncView>
        </div>
      </Card>

      <Modal open={invOpen} onClose={() => setInvOpen(false)} title="New invoice" footer={
        <>
          <Button variant="ghost" onClick={() => setInvOpen(false)}>Cancel</Button>
          <Button variant="primary" disabled={!inv.studentId || !inv.feeStructureId} onClick={async () => {
            try {
              await financeService.createInvoice(user, inv)
              toast.push('Invoice created', 'success')
              setInvOpen(false); invoices.reload(); summary.reload()
            } catch (err) { toast.push(err instanceof Error ? err.message : 'Failed', 'error') }
          }}>Create</Button>
        </>
      }>
        <Field label="Student"><Select value={inv.studentId} onChange={(e) => setInv((x) => ({ ...x, studentId: e.target.value }))}><option value="">Select…</option>{(students.data ?? []).map((s) => <option key={s.id} value={s.id}>{s.firstName} {s.lastName}</option>)}</Select></Field>
        <Field label="Fee structure"><Select value={inv.feeStructureId} onChange={(e) => setInv((x) => ({ ...x, feeStructureId: e.target.value }))}><option value="">Select…</option>{(fees.data ?? []).map((fs) => <option key={fs.id} value={fs.id}>{fs.name} — {money(fs.total, fs.currency)}</option>)}</Select></Field>
        <div className="form-grid">
          <Field label="Term"><TextInput value={inv.term} onChange={(e) => setInv((x) => ({ ...x, term: e.target.value }))} /></Field>
          <Field label="Year"><TextInput value={inv.academicYear} onChange={(e) => setInv((x) => ({ ...x, academicYear: e.target.value }))} /></Field>
          <Field label="Discount"><TextInput type="number" value={String(inv.discount)} onChange={(e) => setInv((x) => ({ ...x, discount: Number(e.target.value) || 0 }))} /></Field>
        </div>
      </Modal>

      {pay && (
        <Modal open onClose={() => setPay(null)} title={`Record payment — ${pay.reference}`} footer={
          <>
            <Button variant="ghost" onClick={() => setPay(null)}>Cancel</Button>
            <Button variant="primary" disabled={!(p.amount > 0)} onClick={async () => {
              try {
                await financeService.recordPayment(user, { invoiceId: pay.id, amount: p.amount, method: p.method, reference: p.reference })
                toast.push('Payment recorded — receipt generated', 'success')
                setPay(null); invoices.reload(); summary.reload()
              } catch (err) { toast.push(err instanceof Error ? err.message : 'Failed', 'error') }
            }}>Record</Button>
          </>
        }>
          <p style={{ fontSize: '0.85rem' }}>Outstanding: <strong>{money(pay.total - pay.paidAmount, pay.currency)}</strong></p>
          <div className="form-grid">
            <Field label="Amount"><TextInput type="number" value={String(p.amount)} onChange={(e) => setP((x) => ({ ...x, amount: Number(e.target.value) || 0 }))} /></Field>
            <Field label="Method"><Select value={p.method} onChange={(e) => setP((x) => ({ ...x, method: e.target.value as PaymentMethod }))}>{['cash', 'bank_transfer', 'mobile_money', 'card', 'waiver', 'other'].map((m) => <option key={m} value={m}>{m.replace('_', ' ')}</option>)}</Select></Field>
            <Field label="Reference"><TextInput value={p.reference} onChange={(e) => setP((x) => ({ ...x, reference: e.target.value }))} /></Field>
          </div>
        </Modal>
      )}
    </div>
  )
}

function FeeStructureForm({ onDone }: { onDone: () => void }) {
  const user = useCurrentUser()
  const toast = useToast()
  const [open, setOpen] = useState(false)
  const [f, setF] = useState<{ name: string; level: EducationStructureKey; academicYear: string; items: FeeItem[] }>({
    name: '', level: 'O_LEVEL', academicYear: '2026', items: [{ label: 'Tuition', amount: 0 }],
  })
  return (
    <>
      <Button size="sm" variant="ghost" style={{ marginTop: 8 }} onClick={() => setOpen(true)}>Add fee structure</Button>
      <Modal open={open} onClose={() => setOpen(false)} title="New fee structure" footer={
        <>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="primary" disabled={!f.name.trim() || f.items.some((i) => !i.label.trim())} onClick={async () => {
            try {
              await financeService.createFeeStructure(user, { ...f, isDefault: true })
              toast.push('Created', 'success')
              setOpen(false); onDone()
            } catch (err) { toast.push(err instanceof Error ? err.message : 'Failed', 'error') }
          }}>Create</Button>
        </>
      }>
        <div className="form-grid">
          <Field label="Name"><TextInput value={f.name} onChange={(e) => setF((x) => ({ ...x, name: e.target.value }))} /></Field>
          <Field label="Level"><Select value={f.level} onChange={(e) => setF((x) => ({ ...x, level: e.target.value as EducationStructureKey }))}>{EDUCATION_KEYS.map((k) => <option key={k}>{k}</option>)}</Select></Field>
          <Field label="Year"><TextInput value={f.academicYear} onChange={(e) => setF((x) => ({ ...x, academicYear: e.target.value }))} /></Field>
        </div>
        {f.items.map((it, i) => (
          <div key={i} className="form-grid">
            <Field label="Item"><TextInput value={it.label} onChange={(e) => setF((x) => ({ ...x, items: x.items.map((y, j) => j === i ? { ...y, label: e.target.value } : y) }))} /></Field>
            <Field label="Amount"><TextInput type="number" value={String(it.amount)} onChange={(e) => setF((x) => ({ ...x, items: x.items.map((y, j) => j === i ? { ...y, amount: Number(e.target.value) || 0 } : y) }))} /></Field>
          </div>
        ))}
        <Button size="sm" variant="ghost" onClick={() => setF((x) => ({ ...x, items: [...x.items, { label: '', amount: 0 }] }))}>Add item</Button>
      </Modal>
    </>
  )
}

/* ================================================================ Bulk import */

const TEMPLATES: Record<ImportKind, string> = {
  students: 'first_name,last_name,grade_level,level,study_code,guardian_name,guardian_phone,email\nJane,Doe,S1,O_LEVEL,,Mary Doe,+250780000000,jane@example.rw',
  teachers: 'first_name,last_name,email,phone,subjects\nJohn,Smith,j.smith@example.rw,+250780000001,"Mathematics;Physics"',
  guardians: 'student_number,name,relationship,email,phone\nKIA-2291,Paul Uwase,father,p.uwase@example.rw,+250780000002',
}

export function BulkImport() {
  const user = useCurrentUser()
  const toast = useToast()
  const [kind, setKind] = useState<ImportKind>('students')
  const [csv, setCsv] = useState('')
  const [report, setReport] = useState<import('@shared/types').ImportReport | null>(null)
  const [phase, setPhase] = useState<'edit' | 'validated'>('edit')

  return (
    <div className="section-stack">
      <PageHeader title="Bulk Import" description="Upload a CSV of students, teachers or guardians. Validate first, review the row-by-row report, then commit. One bad row never blocks the others." />
      <Card>
        <div className="card-body">
          <div className="form-grid">
            <Field label="Import type">
              <Select value={kind} onChange={(e) => { setKind(e.target.value as ImportKind); setReport(null); setPhase('edit') }}>
                <option value="students">Students</option>
                <option value="teachers">Teachers</option>
                <option value="guardians">Guardians</option>
              </Select>
            </Field>
            <div style={{ display: 'flex', alignItems: 'end' }}>
              <Button size="sm" variant="ghost" onClick={() => setCsv(TEMPLATES[kind])}>Load template</Button>
            </div>
          </div>
          <Field label="CSV">
            <TextArea value={csv} onChange={(e) => { setCsv(e.target.value); setPhase('edit') }} rows={8} style={{ fontFamily: 'monospace', fontSize: '0.82rem' }} />
          </Field>
          <input type="file" accept=".csv,text/csv" onChange={async (e) => {
            const file = e.target.files?.[0]
            if (file) { setCsv(await file.text()); setPhase('edit') }
          }} />
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <Button variant="secondary" disabled={!csv.trim()} onClick={async () => {
              try {
                const r = await bulkImportService.validate(user, kind, csv)
                setReport(r); setPhase('validated')
                toast.push(`${r.total - r.failed} of ${r.total} rows valid`, r.failed ? 'error' : 'success')
              } catch (err) { toast.push(err instanceof Error ? err.message : 'Failed', 'error') }
            }}>Validate</Button>
            <Button variant="primary" disabled={phase !== 'validated' || !report || report.total === report.failed} onClick={async () => {
              try {
                const r = await bulkImportService.commit(user, kind, csv)
                setReport(r); setPhase('edit')
                toast.push(`${r.created} created, ${r.failed} failed`, r.failed ? 'error' : 'success')
              } catch (err) { toast.push(err instanceof Error ? err.message : 'Failed', 'error') }
            }}>Commit valid rows</Button>
          </div>
        </div>
      </Card>

      {report && (
        <Card>
          <CardHeader title={`Report — ${report.created ? `${report.created} created, ` : ''}${report.failed} failed, ${report.warnings} warnings`} />
          <div className="card-body" style={{ overflowX: 'auto' }}>
            <table className="data">
              <thead><tr><th>Row</th><th>Data</th><th>Result</th></tr></thead>
              <tbody>
                {report.rows.map((r) => (
                  <tr key={r.row}>
                    <td>{r.row}</td>
                    <td style={{ fontSize: '0.8rem' }}>{Object.values(r.data).slice(0, 4).join(' · ')}</td>
                    <td>
                      {r.created ? <Badge tone="success">created {r.id}</Badge>
                        : r.ok ? <Badge tone="info">valid</Badge>
                          : <Badge tone="danger">{r.errors.join('; ')}</Badge>}
                      {r.warnings.length > 0 && <span className="field-hint"> ⚠ {r.warnings.join('; ')}</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  )
}

/* ================================================================ Year-end */

export function YearEnd() {
  const user = useCurrentUser()
  const toast = useToast()
  const classes = useAsync(() => directoryService.classes(user).catch(() => []), [user.id])
  const [classId, setClassId] = useState('')
  const [year, setYear] = useState(String(new Date().getFullYear() + 1))
  const [preview, setPreview] = useState<{ studentId: Id; studentName: string; currentGrade: string; nextGrade: string | null; action: string }[] | null>(null)

  return (
    <div className="section-stack">
      <PageHeader title="Year-End Operations" description="Promote or graduate a whole class, and archive it. Preview first — every commit is audited." />
      <Card>
        <div className="card-body">
          <div className="form-grid">
            <Field label="Class"><Select value={classId} onChange={(e) => { setClassId(e.target.value); setPreview(null) }}><option value="">Select…</option>{(classes.data ?? []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select></Field>
            <Field label="New academic year"><TextInput value={year} onChange={(e) => setYear(e.target.value)} /></Field>
            <div style={{ display: 'flex', alignItems: 'end', gap: 8 }}>
              <Button variant="secondary" disabled={!classId} onClick={async () => {
                try { setPreview(await batchService.previewPromotion(user, { classId })) } catch (err) { toast.push(err instanceof Error ? err.message : 'Failed', 'error') }
              }}>Preview promotion</Button>
            </div>
          </div>
        </div>
      </Card>

      {preview && (
        <Card>
          <CardHeader title={`${preview.length} students`} />
          <div className="card-body">
            <table className="data">
              <thead><tr><th>Student</th><th>Current</th><th>→ Next</th><th>Action</th></tr></thead>
              <tbody>
                {preview.map((r) => (
                  <tr key={r.studentId}><td>{r.studentName}</td><td>{r.currentGrade}</td><td>{r.nextGrade ?? '—'}</td><td><Badge tone={r.action === 'graduate' ? 'success' : 'info'}>{r.action}</Badge></td></tr>
                ))}
              </tbody>
            </table>
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <Button variant="primary" onClick={async () => {
                if (!window.confirm(`Promote/graduate ${preview.length} students into ${year}? This is audited and hard to undo.`)) return
                try {
                  const r = await batchService.commitPromotion(user, { classId, toAcademicYear: year })
                  toast.push(`${r.promoted} promoted, ${r.graduated} graduated`, 'success')
                  setPreview(null)
                } catch (err) { toast.push(err instanceof Error ? err.message : 'Failed', 'error') }
              }}>Commit promotion</Button>
              <Button variant="ghost" onClick={async () => {
                if (!window.confirm('Archive this class and close its active enrolments?')) return
                const r = await batchService.archiveClass(user, classId)
                toast.push(`Class archived, ${r.enrolmentsClosed} enrolments closed`, 'success')
                setPreview(null); setClassId(''); classes.reload()
              }}>Archive class</Button>
            </div>
          </div>
        </Card>
      )}

      <p style={{ fontSize: '0.85rem', color: 'var(--text-faint)' }}>
        {formatDate(new Date().toISOString())} · promotion uses the standard grade ladder; students at the top of a ladder are graduated.
      </p>
    </div>
  )
}
