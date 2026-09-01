import { useState } from 'react'
import { useCurrentUser } from '@/context/AuthContext'
import { useAsync } from '@/hooks/useAsync'
import { academicService } from '@/services/academicService'
import { interventionService } from '@/services/interventionService'
import { guardianService } from '@/services/guardianService'
import { directoryService } from '@/services/directoryService'
import { studentService } from '@/services/studentService'
import {
  AsyncView, Badge, Button, Card, CardHeader, DataTable, EmptyState, Field, Modal, PageHeader,
  Select, StatusBadge, TextArea, TextInput, useToast, formatDate,
} from '@/components/ui'
import { EDUCATION_KEYS } from '@shared/config/educationStructures'
import type {
  AssessmentComponent, AssessmentScheme, EducationStructureKey, GuardianRelationship,
  Intervention, RecordType, ReportCard,
} from '@shared/types'

const GUARDIAN_TYPES: RecordType[] = ['IDENTITY', 'ACADEMIC_RECORDS', 'ATTENDANCE_SUMMARY', 'REPORTS']

/* ================================================================ Grading schemes */

export function GradingSchemes() {
  const user = useCurrentUser()
  const toast = useToast()
  const data = useAsync(() => academicService.schemes(user), [user.id])
  const [open, setOpen] = useState(false)
  const [f, setF] = useState<{ name: string; level: EducationStructureKey; passMark: number; isDefault: boolean; components: AssessmentComponent[] }>({
    name: '', level: 'O_LEVEL', passMark: 50, isDefault: true,
    components: [
      { key: 'ca', label: 'Continuous assessment', weight: 40 },
      { key: 'exam', label: 'Term exam', weight: 60 },
    ],
  })
  const total = f.components.reduce((s, c) => s + (Number(c.weight) || 0), 0)

  const setComp = (i: number, patch: Partial<AssessmentComponent>) =>
    setF((x) => ({ ...x, components: x.components.map((c, j) => (j === i ? { ...c, ...patch } : c)) }))

  return (
    <div className="section-stack">
      <PageHeader
        title="Grading Schemes"
        description="Configure weighted assessment components and grade bands per education level. Report cards use these."
        actions={<Button variant="primary" onClick={() => setOpen(true)}>New scheme</Button>}
      />
      <AsyncView data={data} isEmpty={(d) => d.length === 0} empty={<EmptyState title="No grading schemes" description="Create one so report cards can be generated." />} onRetry={data.reload}>
        {(rows) => (
          <>
            {rows.map((s: AssessmentScheme) => (
              <Card key={s.id}>
                <CardHeader title={`${s.name} · ${s.level}`} action={s.isDefault ? <Badge tone="success">Default</Badge> : undefined} />
                <div className="card-body">
                  <p style={{ fontSize: '0.9rem' }}>
                    {s.components.map((c) => `${c.label} ${c.weight}%`).join(' · ')} · pass mark {s.passMark}%
                  </p>
                  <p style={{ fontSize: '0.82rem', color: 'var(--text-faint)' }}>
                    Bands: {s.gradeBands.map((b) => `${b.letter}≥${b.min}`).join(', ')}
                  </p>
                </div>
              </Card>
            ))}
          </>
        )}
      </AsyncView>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="New grading scheme"
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button
              variant="primary"
              disabled={!f.name.trim() || Math.round(total) !== 100}
              onClick={async () => {
                try {
                  await academicService.createScheme(user, { name: f.name, level: f.level, components: f.components, passMark: f.passMark, isDefault: f.isDefault })
                  toast.push('Scheme created', 'success')
                  setOpen(false)
                  data.reload()
                } catch (err) {
                  toast.push(err instanceof Error ? err.message : 'Could not create', 'error')
                }
              }}
            >
              Create {Math.round(total) !== 100 ? `(weights = ${total})` : ''}
            </Button>
          </>
        }
      >
        <div className="form-grid">
          <Field label="Name"><TextInput value={f.name} onChange={(e) => setF((x) => ({ ...x, name: e.target.value }))} required /></Field>
          <Field label="Level">
            <Select value={f.level} onChange={(e) => setF((x) => ({ ...x, level: e.target.value as EducationStructureKey }))}>
              {EDUCATION_KEYS.map((k) => <option key={k}>{k}</option>)}
            </Select>
          </Field>
          <Field label="Pass mark %"><TextInput type="number" value={String(f.passMark)} onChange={(e) => setF((x) => ({ ...x, passMark: Number(e.target.value) || 0 }))} /></Field>
          <label className="field-inline" style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <input type="checkbox" checked={f.isDefault} onChange={(e) => setF((x) => ({ ...x, isDefault: e.target.checked }))} /> Default for this level
          </label>
        </div>
        <CardHeader title={`Components (weights must total 100 — now ${total})`} action={<Button size="sm" variant="ghost" onClick={() => setF((x) => ({ ...x, components: [...x.components, { key: '', label: '', weight: 0 }] }))}>Add</Button>} />
        {f.components.map((c, i) => (
          <div key={i} className="form-grid" style={{ borderBottom: '1px solid var(--border)', paddingBottom: 8, marginBottom: 8 }}>
            <Field label="Key"><TextInput value={c.key} onChange={(e) => setComp(i, { key: e.target.value })} placeholder="ca" /></Field>
            <Field label="Label"><TextInput value={c.label} onChange={(e) => setComp(i, { label: e.target.value })} /></Field>
            <Field label="Weight %"><TextInput type="number" value={String(c.weight)} onChange={(e) => setComp(i, { weight: Number(e.target.value) || 0 })} /></Field>
            <Button size="sm" variant="ghost" disabled={f.components.length <= 1} onClick={() => setF((x) => ({ ...x, components: x.components.filter((_, j) => j !== i) }))}>Remove</Button>
          </div>
        ))}
      </Modal>
    </div>
  )
}

/* ================================================================ Report cards */

export function ReportCards() {
  const user = useCurrentUser()
  const toast = useToast()
  const classes = useAsync(() => directoryService.classes(user).catch(() => []), [user.id])
  const [classId, setClassId] = useState('')
  const [term, setTerm] = useState('Term 2 2026')
  const [year, setYear] = useState('2026')
  const cards = useAsync(() => (classId ? academicService.reportCards(user, { classId, term }) : Promise.resolve([] as ReportCard[])), [classId, term])
  const [view, setView] = useState<ReportCard | null>(null)

  return (
    <div className="section-stack">
      <PageHeader title="Report Cards" description="Generate weighted, position-ranked report cards per class and term, then publish them to students and guardians." />
      <Card>
        <div className="card-body">
          <div className="form-grid">
            <Field label="Class">
              <Select value={classId} onChange={(e) => setClassId(e.target.value)}>
                <option value="">Select…</option>
                {(classes.data ?? []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
            </Field>
            <Field label="Term"><TextInput value={term} onChange={(e) => setTerm(e.target.value)} /></Field>
            <Field label="Academic year"><TextInput value={year} onChange={(e) => setYear(e.target.value)} /></Field>
            <div style={{ display: 'flex', alignItems: 'end' }}>
              <Button
                variant="primary"
                disabled={!classId}
                onClick={async () => {
                  try {
                    const r = await academicService.generateReportCards(user, { classId, term, academicYear: year })
                    toast.push(`${r.created} created, ${r.updated} updated`, 'success')
                    cards.reload()
                  } catch (err) {
                    toast.push(err instanceof Error ? err.message : 'Could not generate', 'error')
                  }
                }}
              >
                Generate
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {classId && (
        <AsyncView data={cards} isEmpty={(d) => d.length === 0} empty={<EmptyState title="No report cards for this class/term" description="Enter marks in the gradebook, then Generate." />} onRetry={cards.reload}>
          {(rows) => (
            <Card>
              <div className="card-body">
                <DataTable
                  rows={rows}
                  getKey={(r) => r.id}
                  emptyTitle="No report cards"
                  columns={[
                    { key: 'name', header: 'Student', render: (r: ReportCard) => <strong>{r.studentName}</strong> },
                    { key: 'avg', header: 'Average', render: (r: ReportCard) => `${r.average}%` },
                    { key: 'gpa', header: 'GPA', render: (r: ReportCard) => r.gpa.toFixed(2) },
                    { key: 'pos', header: 'Position', render: (r: ReportCard) => (r.overallPosition ? `${r.overallPosition}/${r.classSize}` : '—') },
                    { key: 'att', header: 'Attendance', render: (r: ReportCard) => `${r.attendanceRate}%` },
                    { key: 'status', header: 'Status', render: (r: ReportCard) => <StatusBadge status={r.status} /> },
                  ]}
                  rowActions={(r) => (
                    <>
                      <Button size="sm" variant="ghost" onClick={() => setView(r)}>Open</Button>
                      {r.status === 'draft' && (
                        <Button size="sm" variant="primary" onClick={async () => {
                          await academicService.publishReportCard(user, r.id)
                          toast.push('Published — student & guardians notified', 'success')
                          cards.reload()
                        }}>Publish</Button>
                      )}
                    </>
                  )}
                />
              </div>
            </Card>
          )}
        </AsyncView>
      )}

      {view && <ReportCardModal card={view} onClose={() => setView(null)} onSaved={() => { setView(null); cards.reload() }} />}
    </div>
  )
}

export function ReportCardModal({ card, onClose, onSaved }: { card: ReportCard; onClose: () => void; onSaved?: () => void }) {
  const user = useCurrentUser()
  const toast = useToast()
  const [conduct, setConduct] = useState(card.conduct)
  const [remark, setRemark] = useState(card.headTeacherRemark)
  const editable = card.status === 'draft' && !!onSaved

  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      title={`${card.reference} — ${card.studentName}`}
      footer={editable ? (
        <>
          <Button variant="ghost" onClick={onClose}>Close</Button>
          <Button variant="primary" onClick={async () => {
            await academicService.updateReportCard(user, card.id, { conduct, headTeacherRemark: remark })
            toast.push('Saved', 'success')
            onSaved?.()
          }}>Save remarks</Button>
        </>
      ) : undefined}
    >
      <a className="btn btn-secondary btn-sm" href={`/api/report-cards/${card.id}/pdf`} target="_blank" rel="noreferrer" style={{ float: 'right' }}>Download PDF</a>
      <p style={{ fontSize: '0.85rem', color: 'var(--text-soft)' }}>
        {card.term} · {card.academicYear} · GPA {card.gpa.toFixed(2)} · avg {card.average}% ·
        position {card.overallPosition ? `${card.overallPosition}/${card.classSize}` : '—'} · attendance {card.attendanceRate}%
      </p>
      <table className="data" style={{ marginTop: 10 }}>
        <thead><tr><th>Subject</th><th>Breakdown</th><th>Score</th><th>Grade</th><th>Position</th></tr></thead>
        <tbody>
          {card.lines.map((l) => (
            <tr key={l.subjectId}>
              <td><strong>{l.subjectName}</strong></td>
              <td style={{ fontSize: '0.8rem' }}>{l.components.map((c) => `${c.label}: ${c.percent ?? '—'}${c.percent !== null ? '%' : ''}`).join(' · ')}</td>
              <td>{l.weightedScore ?? '—'}{l.weightedScore !== null ? '%' : ''}</td>
              <td>{l.letter}</td>
              <td>{l.position ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="form-grid" style={{ marginTop: 12 }}>
        <Field label="Conduct"><TextInput value={conduct} disabled={!editable} onChange={(e) => setConduct(e.target.value)} /></Field>
      </div>
      <Field label="Head teacher remark"><TextArea value={remark} disabled={!editable} onChange={(e) => setRemark(e.target.value)} /></Field>
    </Modal>
  )
}

/* ================================================================ Interventions */

export function Interventions() {
  const user = useCurrentUser()
  const toast = useToast()
  const data = useAsync(() => interventionService.list(user), [user.id])
  const students = useAsync(() => studentService.list(user).catch(() => []), [user.id])
  const teachers = useAsync(() => directoryService.teachers(user).catch(() => []), [user.id])
  const [open, setOpen] = useState(false)
  const [detail, setDetail] = useState<Intervention | null>(null)
  const [f, setF] = useState<{ studentId: string; kind: Intervention['kind']; reason: string }>({ studentId: '', kind: 'academic', reason: '' })

  return (
    <div className="section-stack">
      <PageHeader
        title="Interventions"
        description="Attendance interventions open automatically when a student falls below the threshold. Add academic or conduct cases manually."
        actions={<Button variant="primary" onClick={() => setOpen(true)}>Open intervention</Button>}
      />
      <AsyncView data={data} isEmpty={(d) => d.length === 0} empty={<EmptyState title="No open interventions" />} onRetry={data.reload}>
        {(rows) => (
          <Card>
            <div className="card-body">
              <DataTable
                rows={rows}
                getKey={(r) => r.id}
                emptyTitle="No interventions"
                filters={[{ key: 'status', label: 'Status', options: ['open', 'in_progress', 'resolved', 'escalated'], match: (r, v) => r.status === v }]}
                columns={[
                  { key: 'student', header: 'Student', render: (r: Intervention) => <strong>{r.studentName}</strong> },
                  { key: 'kind', header: 'Type', render: (r: Intervention) => <span style={{ textTransform: 'capitalize' }}>{r.kind}</span> },
                  { key: 'reason', header: 'Reason', render: (r: Intervention) => r.reason },
                  { key: 'auto', header: '', render: (r: Intervention) => (r.autoOpened ? <Badge tone="warning">auto</Badge> : null) },
                  { key: 'status', header: 'Status', render: (r: Intervention) => <StatusBadge status={r.status} /> },
                ]}
                rowActions={(r) => <Button size="sm" variant="ghost" onClick={() => setDetail(r)}>Open</Button>}
              />
            </div>
          </Card>
        )}
      </AsyncView>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Open an intervention"
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button variant="primary" disabled={!f.studentId || !f.reason.trim()} onClick={async () => {
              try {
                await interventionService.open(user, f)
                toast.push('Intervention opened', 'success')
                setOpen(false); setF({ studentId: '', kind: 'academic', reason: '' }); data.reload()
              } catch (err) {
                toast.push(err instanceof Error ? err.message : 'Could not open', 'error')
              }
            }}>Open</Button>
          </>
        }
      >
        <Field label="Student">
          <Select value={f.studentId} onChange={(e) => setF((x) => ({ ...x, studentId: e.target.value }))} required>
            <option value="">Select…</option>
            {(students.data ?? []).map((s) => <option key={s.id} value={s.id}>{s.firstName} {s.lastName}</option>)}
          </Select>
        </Field>
        <Field label="Type">
          <Select value={f.kind} onChange={(e) => setF((x) => ({ ...x, kind: e.target.value as Intervention['kind'] }))}>
            <option value="academic">Academic</option>
            <option value="attendance">Attendance</option>
            <option value="conduct">Conduct</option>
          </Select>
        </Field>
        <Field label="Reason"><TextArea value={f.reason} onChange={(e) => setF((x) => ({ ...x, reason: e.target.value }))} required /></Field>
      </Modal>

      {detail && (
        <Modal open onClose={() => setDetail(null)} size="lg" title={`${detail.reference} — ${detail.studentName}`}>
          <p style={{ fontSize: '0.9rem' }}>{detail.reason}</p>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-soft)' }}>
            <StatusBadge status={detail.status} /> {detail.metric !== null && <>· metric {detail.metric}% / threshold {detail.threshold}%</>}
          </p>
          <div className="form-grid" style={{ marginTop: 10 }}>
            <Field label="Status">
              <Select value={detail.status} onChange={async (e) => {
                const updated = await interventionService.advance(user, detail.id, { status: e.target.value as Intervention['status'] })
                setDetail(updated); data.reload()
              }}>
                <option value="open">Open</option>
                <option value="in_progress">In progress</option>
                <option value="resolved">Resolved</option>
                <option value="escalated">Escalated</option>
              </Select>
            </Field>
            <Field label="Assign to">
              <Select value={detail.assignedTo ?? ''} onChange={async (e) => {
                const updated = await interventionService.advance(user, detail.id, { assignedTo: e.target.value || null })
                setDetail(updated); data.reload()
              }}>
                <option value="">Unassigned</option>
                {(teachers.data ?? []).map((t) => <option key={t.id} value={t.userId}>{t.firstName} {t.lastName}</option>)}
              </Select>
            </Field>
          </div>
          <AddNote onAdd={async (note) => {
            const updated = await interventionService.advance(user, detail.id, { note })
            setDetail(updated)
          }} />
          <h4 style={{ margin: '12px 0 6px' }}>Notes</h4>
          {detail.notes.length === 0 ? <p style={{ fontSize: '0.85rem', color: 'var(--text-faint)' }}>No notes yet.</p> : (
            <ul style={{ paddingLeft: 16, fontSize: '0.85rem' }}>
              {detail.notes.map((n) => <li key={n.id}>{formatDate(n.at)} — {n.note}</li>)}
            </ul>
          )}
        </Modal>
      )}
    </div>
  )
}

function AddNote({ onAdd }: { onAdd: (note: string) => Promise<void> }) {
  const [v, setV] = useState('')
  return (
    <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
      <TextInput value={v} onChange={(e) => setV(e.target.value)} placeholder="Add a case note…" />
      <Button variant="secondary" disabled={!v.trim()} onClick={async () => { await onAdd(v.trim()); setV('') }}>Add</Button>
    </div>
  )
}

/* ================================================================ Guardian links */

export function GuardianLinks() {
  const user = useCurrentUser()
  const toast = useToast()
  const data = useAsync(() => guardianService.links(user), [user.id])
  const students = useAsync(() => studentService.list(user).catch(() => []), [user.id])
  const [open, setOpen] = useState(false)
  const [f, setF] = useState<{ studentId: string; mode: 'new' | 'existing'; guardianCode: string; name: string; email: string; relationship: GuardianRelationship; types: RecordType[] }>({
    studentId: '', mode: 'new', guardianCode: '', name: '', email: '', relationship: 'guardian', types: GUARDIAN_TYPES,
  })
  const toggle = (t: RecordType) => setF((x) => ({ ...x, types: x.types.includes(t) ? x.types.filter((y) => y !== t) : [...x.types, t] }))

  return (
    <div className="section-stack">
      <PageHeader title="Guardians" description="Link parents and guardians to students. They get read-only access to the categories you choose — and can be linked to children at other institutions." actions={<Button variant="primary" onClick={() => setOpen(true)}>Link a guardian</Button>} />
      <AsyncView data={data} isEmpty={(d) => d.length === 0} empty={<EmptyState title="No guardian links yet" />} onRetry={data.reload}>
        {(rows) => (
          <Card>
            <div className="card-body">
              <DataTable
                rows={rows}
                getKey={(l) => l.id}
                emptyTitle="No guardian links"
                columns={[
                  { key: 'g', header: 'Guardian', render: (l) => <strong>{l.guardianName}</strong> },
                  { key: 's', header: 'Student', render: (l) => l.studentName },
                  { key: 'rel', header: 'Relationship', render: (l) => <span style={{ textTransform: 'capitalize' }}>{l.relationship}</span> },
                  { key: 'types', header: 'Can view', render: (l) => l.canViewRecordTypes.length },
                  { key: 'status', header: 'Status', render: (l) => <StatusBadge status={l.status} /> },
                ]}
                rowActions={(l) => l.status === 'active' && (
                  <Button size="sm" variant="danger" onClick={async () => {
                    await guardianService.revokeLink(user, l.id)
                    toast.push('Link revoked', 'success')
                    data.reload()
                  }}>Revoke</Button>
                )}
              />
            </div>
          </Card>
        )}
      </AsyncView>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Link a guardian"
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button
              variant="primary"
              disabled={!f.studentId || (f.mode === 'new' ? !f.name.trim() : !f.guardianCode.trim())}
              onClick={async () => {
                try {
                  const r = await guardianService.linkGuardian(user, {
                    studentId: f.studentId, relationship: f.relationship, canViewRecordTypes: f.types,
                    ...(f.mode === 'existing' ? { guardianCode: f.guardianCode } : { name: f.name, email: f.email }),
                  })
                  toast.push(r.created ? `Guardian account created — code ${r.guardianCode} (password demo123)` : 'Guardian linked', 'success')
                  setOpen(false)
                  data.reload()
                } catch (err) {
                  toast.push(err instanceof Error ? err.message : 'Could not link', 'error')
                }
              }}
            >
              Link
            </Button>
          </>
        }
      >
        <Field label="Student">
          <Select value={f.studentId} onChange={(e) => setF((x) => ({ ...x, studentId: e.target.value }))} required>
            <option value="">Select…</option>
            {(students.data ?? []).map((s) => <option key={s.id} value={s.id}>{s.firstName} {s.lastName}</option>)}
          </Select>
        </Field>
        <Field label="Guardian">
          <Select value={f.mode} onChange={(e) => setF((x) => ({ ...x, mode: e.target.value as 'new' | 'existing' }))}>
            <option value="new">Create a new guardian account</option>
            <option value="existing">Use an existing guardian code</option>
          </Select>
        </Field>
        {f.mode === 'existing' ? (
          <Field label="Guardian code"><TextInput value={f.guardianCode} onChange={(e) => setF((x) => ({ ...x, guardianCode: e.target.value }))} placeholder="BOU-GDN-…" /></Field>
        ) : (
          <div className="form-grid">
            <Field label="Full name"><TextInput value={f.name} onChange={(e) => setF((x) => ({ ...x, name: e.target.value }))} /></Field>
            <Field label="Email"><TextInput value={f.email} onChange={(e) => setF((x) => ({ ...x, email: e.target.value }))} /></Field>
          </div>
        )}
        <Field label="Relationship">
          <Select value={f.relationship} onChange={(e) => setF((x) => ({ ...x, relationship: e.target.value as GuardianRelationship }))}>
            <option value="mother">Mother</option>
            <option value="father">Father</option>
            <option value="guardian">Guardian</option>
            <option value="other">Other</option>
          </Select>
        </Field>
        <Field label="Can view">
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {GUARDIAN_TYPES.map((t) => (
              <button key={t} type="button" className={`chip ${f.types.includes(t) ? 'chip-active' : ''}`} onClick={() => toggle(t)}>{t.replace(/_/g, ' ').toLowerCase()}</button>
            ))}
          </div>
        </Field>
      </Modal>
    </div>
  )
}

