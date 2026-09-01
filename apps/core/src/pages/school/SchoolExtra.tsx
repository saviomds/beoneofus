import { useState } from 'react'
import { useCurrentUser, useAuth } from '@/context/AuthContext'
import { useAsync } from '@/hooks/useAsync'
import { transferService } from '@/services/transferService'
import { studentService } from '@/services/studentService'
import { universityService } from '@/services/universityService'
import {
  AsyncView, Button, Card, CardHeader, DataTable, EmptyState, Field, PageHeader, Select,
  StatusBadge, TextArea, TextInput, Timeline, useToast, formatDateTime,
} from '@/components/ui'
import { EDUCATION_KEYS } from '@shared/config/educationStructures'
import type { EducationStructureKey, Id, TransferRequest } from '@shared/types'

/* ---------------------------------------------------------------- Transfers */

export function SchoolTransfers() {
  const user = useCurrentUser()
  const toast = useToast()
  const [open, setOpen] = useState(false)
  const [detail, setDetail] = useState<TransferRequest | null>(null)
  const data = useAsync(() => transferService.list(user), [user.id])
  const students = useAsync(() => studentService.list(user).catch(() => []), [user.id])
  const dests = useAsync(() => transferService.destinations(user), [user.id])
  const [f, setF] = useState({ studentId: '', toOrganizationId: '', reason: '', targetLevel: 'O_LEVEL' as EducationStructureKey, targetAcademicYear: String(new Date().getFullYear()) })

  const table = (rows: TransferRequest[], kind: string) => (
    <DataTable
      rows={rows}
      getKey={(t) => t.id}
      emptyTitle={`No ${kind} transfers`}
      columns={[
        { key: 'student', header: 'Student', render: (t) => <strong>{t.studentName}</strong> },
        { key: 'ref', header: 'Reference', render: (t) => t.id },
        { key: 'dir', header: kind === 'outgoing' ? 'To' : 'From', render: (t) => (kind === 'outgoing' ? t.toOrganizationId : t.fromOrganizationId) },
        { key: 'status', header: 'Status', render: (t) => <StatusBadge status={t.status} /> },
      ]}
      rowActions={(t) => (
        <>
          <Button size="sm" variant="ghost" onClick={() => setDetail(t)}>Open</Button>
          {kind === 'incoming' && ['INITIATED', 'APPROVED'].includes(t.status) && (
            <Button size="sm" variant="primary" onClick={async () => { await transferService.advance(user, t.id, 'accept', 'Accepted'); toast.push('Transfer accepted — student moved, history retained', 'success'); data.reload() }}>Accept</Button>
          )}
          {kind === 'outgoing' && t.status === 'INITIATED' && (
            <Button size="sm" variant="ghost" onClick={async () => { await transferService.advance(user, t.id, 'cancel', 'Cancelled by origin'); data.reload() }}>Cancel</Button>
          )}
        </>
      )}
    />
  )

  return (
    <div className="section-stack">
      <PageHeader title="Student Transfers" description="Move a student to another institution without destroying their history." actions={<Button variant="primary" onClick={() => setOpen(true)}>Initiate transfer</Button>} />
      <AsyncView data={data} error={data.error} onRetry={data.reload}>
        {(d) => (
          <>
            <Card><CardHeader title="Outgoing" /><div className="card-body">{table(d.outgoing, 'outgoing')}</div></Card>
            <Card><CardHeader title="Incoming" /><div className="card-body">{table(d.incoming, 'incoming')}</div></Card>
          </>
        )}
      </AsyncView>

      {open && (
        <div className="modal-scrim" onMouseDown={(e) => e.target === e.currentTarget && setOpen(false)}>
          <div className="modal" role="dialog" aria-modal="true" aria-label="Initiate transfer">
            <div className="modal-head"><h2>Initiate transfer</h2><button className="icon-btn" onClick={() => setOpen(false)}>✕</button></div>
            <form onSubmit={async (e) => {
              e.preventDefault()
              await transferService.initiate(user, f)
              toast.push('Transfer initiated — destination notified', 'success')
              setOpen(false); data.reload()
            }}>
              <div className="modal-body">
                <Field label="Student">
                  <Select value={f.studentId} onChange={(e) => setF((x) => ({ ...x, studentId: e.target.value }))} required>
                    <option value="">Select…</option>
                    {(students.data ?? []).map((s) => <option key={s.id} value={s.id}>{s.firstName} {s.lastName}</option>)}
                  </Select>
                </Field>
                <Field label="Destination institution">
                  <Select value={f.toOrganizationId} onChange={(e) => setF((x) => ({ ...x, toOrganizationId: e.target.value }))} required>
                    <option value="">Select…</option>
                    {(dests.data ?? []).map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </Select>
                </Field>
                <div className="form-grid">
                  <Field label="Target level">
                    <Select value={f.targetLevel} onChange={(e) => setF((x) => ({ ...x, targetLevel: e.target.value as EducationStructureKey }))}>
                      {EDUCATION_KEYS.map((k) => <option key={k}>{k}</option>)}
                    </Select>
                  </Field>
                  <Field label="Academic year"><TextInput value={f.targetAcademicYear} onChange={(e) => setF((x) => ({ ...x, targetAcademicYear: e.target.value }))} /></Field>
                </div>
                <Field label="Reason"><TextArea value={f.reason} onChange={(e) => setF((x) => ({ ...x, reason: e.target.value }))} required /></Field>
              </div>
              <div className="modal-foot"><Button variant="ghost" type="button" onClick={() => setOpen(false)}>Cancel</Button><Button variant="primary" type="submit" disabled={!f.studentId || !f.toOrganizationId}>Initiate</Button></div>
            </form>
          </div>
        </div>
      )}

      {detail && (
        <div className="modal-scrim" onMouseDown={(e) => e.target === e.currentTarget && setDetail(null)}>
          <div className="modal modal-lg" role="dialog" aria-modal="true" aria-label="Transfer detail">
            <div className="modal-head"><h2>{detail.id}</h2><button className="icon-btn" onClick={() => setDetail(null)}>✕</button></div>
            <div className="modal-body">
              <p><strong>{detail.studentName}</strong> · {detail.reason}</p>
              <p className="field-hint">{detail.fromOrganizationId} → {detail.toOrganizationId} · <StatusBadge status={detail.status} /></p>
              <h4 style={{ margin: '14px 0 8px' }}>Timeline</h4>
              <Timeline items={detail.timeline.map((t) => ({ title: t.action, when: formatDateTime(t.at), note: t.note }))} />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/* ---------------------------------------------------------------- University: faculties / departments / programs */

export function InstitutionPrograms() {
  const user = useCurrentUser()
  const { organization } = useAuth()
  const toast = useToast()
  const faculties = useAsync(() => universityService.faculties(user), [user.id])
  const departments = useAsync(() => universityService.departments(user), [user.id])
  const programs = useAsync(() => universityService.programs(user), [user.id])
  const courses = useAsync(() => universityService.courses(user), [user.id])

  const [facForm, setFacForm] = useState({ name: '', code: '', deanName: '' })
  const [depForm, setDepForm] = useState({ facultyId: '', name: '', code: '', headName: '' })
  const [progForm, setProgForm] = useState({ departmentId: '', name: '', code: '', durationYears: 4 })

  if (organization && organization.organizationType !== 'UNIVERSITY') {
    return (
      <div className="section-stack">
        <PageHeader title="Faculties & Programs" description="University structure." />
        <Card><div className="card-body"><EmptyState title="Not applicable" description="This section is available for university institutions." /></div></Card>
      </div>
    )
  }

  return (
    <div className="section-stack">
      <PageHeader title="Faculties & Programs" description="Faculties → departments → programs → courses." />

      <Card>
        <CardHeader title="Faculties" />
        <form className="card-body" onSubmit={async (e) => { e.preventDefault(); await universityService.createFaculty(user, facForm); toast.push('Faculty added', 'success'); setFacForm({ name: '', code: '', deanName: '' }); faculties.reload() }}>
          <div className="form-grid">
            <Field label="Name"><TextInput value={facForm.name} onChange={(e) => setFacForm((x) => ({ ...x, name: e.target.value }))} required /></Field>
            <Field label="Code"><TextInput value={facForm.code} onChange={(e) => setFacForm((x) => ({ ...x, code: e.target.value }))} required /></Field>
            <Field label="Dean"><TextInput value={facForm.deanName} onChange={(e) => setFacForm((x) => ({ ...x, deanName: e.target.value }))} /></Field>
          </div>
          <Button variant="primary" type="submit" disabled={!facForm.name.trim()}>Add faculty</Button>
          <AsyncView data={faculties}>{(list) => <div style={{ marginTop: 12 }}>{list.map((fac) => <div key={fac.id} style={{ padding: '6px 0', borderBottom: '1px solid var(--border)' }}><strong>{fac.name}</strong> · {fac.code} · Dean: {fac.deanName || '—'}</div>)}</div>}</AsyncView>
        </form>
      </Card>

      <Card>
        <CardHeader title="Departments" />
        <form className="card-body" onSubmit={async (e) => { e.preventDefault(); await universityService.createDepartment(user, depForm); toast.push('Department added', 'success'); setDepForm({ facultyId: '', name: '', code: '', headName: '' }); departments.reload() }}>
          <div className="form-grid">
            <Field label="Faculty">
              <Select value={depForm.facultyId} onChange={(e) => setDepForm((x) => ({ ...x, facultyId: e.target.value }))} required>
                <option value="">Select…</option>
                {(faculties.data ?? []).map((fac) => <option key={fac.id} value={fac.id}>{fac.name}</option>)}
              </Select>
            </Field>
            <Field label="Name"><TextInput value={depForm.name} onChange={(e) => setDepForm((x) => ({ ...x, name: e.target.value }))} required /></Field>
            <Field label="Code"><TextInput value={depForm.code} onChange={(e) => setDepForm((x) => ({ ...x, code: e.target.value }))} required /></Field>
            <Field label="Head"><TextInput value={depForm.headName} onChange={(e) => setDepForm((x) => ({ ...x, headName: e.target.value }))} /></Field>
          </div>
          <Button variant="primary" type="submit" disabled={!depForm.facultyId || !depForm.name.trim()}>Add department</Button>
          <AsyncView data={departments}>{(list) => <div style={{ marginTop: 12 }}>{list.map((d) => <div key={d.id} style={{ padding: '6px 0', borderBottom: '1px solid var(--border)' }}><strong>{d.name}</strong> · {d.code}</div>)}</div>}</AsyncView>
        </form>
      </Card>

      <Card>
        <CardHeader title="Programs" />
        <form className="card-body" onSubmit={async (e) => { e.preventDefault(); await universityService.createProgram(user, progForm); toast.push('Program added', 'success'); setProgForm({ departmentId: '', name: '', code: '', durationYears: 4 }); programs.reload() }}>
          <div className="form-grid">
            <Field label="Department">
              <Select value={progForm.departmentId} onChange={(e) => setProgForm((x) => ({ ...x, departmentId: e.target.value }))} required>
                <option value="">Select…</option>
                {(departments.data ?? []).map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </Select>
            </Field>
            <Field label="Program name"><TextInput value={progForm.name} onChange={(e) => setProgForm((x) => ({ ...x, name: e.target.value }))} required /></Field>
            <Field label="Code"><TextInput value={progForm.code} onChange={(e) => setProgForm((x) => ({ ...x, code: e.target.value }))} required /></Field>
            <Field label="Duration (years)"><TextInput type="number" value={String(progForm.durationYears)} onChange={(e) => setProgForm((x) => ({ ...x, durationYears: Number(e.target.value) }))} /></Field>
          </div>
          <Button variant="primary" type="submit" disabled={!progForm.departmentId || !progForm.name.trim()}>Add program</Button>
          <AsyncView data={programs}>{(list) => <div style={{ marginTop: 12 }}>{list.map((p: { id: Id; name: string; code: string; durationYears: number }) => <div key={p.id} style={{ padding: '6px 0', borderBottom: '1px solid var(--border)' }}><strong>{p.name}</strong> · {p.code} · {p.durationYears}yr</div>)}</div>}</AsyncView>
        </form>
      </Card>

      <Card>
        <CardHeader title="Courses" />
        <div className="card-body">
          <AsyncView data={courses} isEmpty={(d) => d.length === 0} empty={<EmptyState title="No courses yet" />}>
            {(list) => <table className="data"><tbody>{list.map((c) => <tr key={c.id}><td><strong>{c.name}</strong></td><td>{c.code}</td><td>{c.credits} credits</td><td>Year {c.year}, Sem {c.semester}</td></tr>)}</tbody></table>}
          </AsyncView>
        </div>
      </Card>
    </div>
  )
}
