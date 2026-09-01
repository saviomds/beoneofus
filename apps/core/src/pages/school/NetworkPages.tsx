import { useState } from 'react'
import { useCurrentUser } from '@/context/AuthContext'
import { useAsync } from '@/hooks/useAsync'
import { recordRequestService } from '@/services/recordRequestService'
import { consentService } from '@/services/consentService'
import { credentialService } from '@/services/credentialService'
import { campaignService } from '@/services/campaignService'
import { studentService } from '@/services/studentService'
import {
  AsyncView, Badge, Button, Card, CardHeader, DataTable, EmptyState, Field, Modal,
  PageHeader, Select, StatusBadge, TextArea, TextInput, Timeline, useToast, formatDate, formatDateTime,
} from '@/components/ui'
import { RECORD_TYPES } from '@shared/types'
import type { Campaign, CampaignSubmission, Consent, Credential, Id, RecordRequest, RecordType } from '@shared/types'

const TYPE_LABEL: Record<RecordType, string> = {
  IDENTITY: 'Identity',
  ENROLLMENTS: 'Enrolments',
  ACADEMIC_RECORDS: 'Academic records',
  ATTENDANCE_SUMMARY: 'Attendance summary',
  REPORTS: 'Reports',
  CREDENTIALS: 'Credentials',
  TRANSFER_HISTORY: 'Transfer history',
}

/* ================================================================ Record Requests */

export function RecordRequests() {
  const user = useCurrentUser()
  const toast = useToast()
  const data = useAsync(() => recordRequestService.list(user), [user.id])
  const sources = useAsync(() => recordRequestService.sources(user), [user.id])
  const students = useAsync(() => studentService.list(user).catch(() => []), [user.id])
  const [open, setOpen] = useState(false)
  const [review, setReview] = useState<RecordRequest | null>(null)
  const [detail, setDetail] = useState<RecordRequest | null>(null)
  const [f, setF] = useState<{ studentId: string; sourceOrganizationId: string; purpose: string; legalBasis: string; types: RecordType[] }>({
    studentId: '', sourceOrganizationId: '', purpose: '', legalBasis: '', types: ['ACADEMIC_RECORDS', 'ENROLLMENTS'],
  })

  const toggleType = (t: RecordType, list: RecordType[], set: (v: RecordType[]) => void) =>
    set(list.includes(t) ? list.filter((x) => x !== t) : [...list, t])

  const columns = (kind: 'outgoing' | 'incoming') => [
    { key: 'student', header: 'Student', render: (r: RecordRequest) => <strong>{r.studentName}</strong> },
    { key: 'org', header: kind === 'outgoing' ? 'From institution' : 'Requested by', render: (r: RecordRequest) => (kind === 'outgoing' ? r.sourceOrganizationId : r.requestingOrganizationId) },
    { key: 'types', header: 'Categories', render: (r: RecordRequest) => r.requestedRecordTypes.map((t) => TYPE_LABEL[t]).join(', ') },
    { key: 'status', header: 'Status', render: (r: RecordRequest) => <StatusBadge status={r.status} /> },
    { key: 'expires', header: 'Access until', render: (r: RecordRequest) => (r.expiresAt ? formatDate(r.expiresAt) : '—') },
  ]

  return (
    <div className="section-stack">
      <PageHeader
        title="Records Requests"
        description="Request a student's history from another institution, or review requests for your own records. Access is read-only, scoped and revocable."
        actions={<Button variant="primary" onClick={() => setOpen(true)}>Request records</Button>}
      />

      <AsyncView data={data} onRetry={data.reload}>
        {(d) => (
          <>
            <Card>
              <CardHeader title="Outgoing — records we asked for" />
              <div className="card-body">
                <DataTable
                  rows={d.outgoing}
                  getKey={(r) => r.id}
                  emptyTitle="No outgoing requests"
                  columns={columns('outgoing')}
                  rowActions={(r) => (
                    <>
                      <Button size="sm" variant="ghost" onClick={() => setDetail(r)}>Open</Button>
                      {(r.status === 'APPROVED' || r.status === 'PARTIALLY_APPROVED') && (
                        <Button size="sm" variant="primary" onClick={() => setDetail(r)}>View records</Button>
                      )}
                    </>
                  )}
                />
              </div>
            </Card>

            <Card>
              <CardHeader title="Incoming — requests for our records" />
              <div className="card-body">
                <DataTable
                  rows={d.incoming}
                  getKey={(r) => r.id}
                  emptyTitle="No incoming requests"
                  columns={columns('incoming')}
                  rowActions={(r) => (
                    <>
                      <Button size="sm" variant="ghost" onClick={() => setDetail(r)}>Open</Button>
                      {['SUBMITTED', 'UNDER_REVIEW', 'MORE_INFORMATION_REQUIRED'].includes(r.status) && (
                        <Button size="sm" variant="primary" onClick={() => setReview(r)}>Review</Button>
                      )}
                      {(r.status === 'APPROVED' || r.status === 'PARTIALLY_APPROVED') && (
                        <Button size="sm" variant="danger" onClick={async () => {
                          await recordRequestService.revoke(user, r.id, 'Revoked by institution')
                          toast.push('Access revoked', 'success')
                          data.reload()
                        }}>Revoke access</Button>
                      )}
                    </>
                  )}
                />
              </div>
            </Card>
          </>
        )}
      </AsyncView>

      {/* create */}
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Request student records"
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button
              variant="primary"
              disabled={!f.studentId || !f.sourceOrganizationId || !f.purpose.trim() || !f.types.length}
              onClick={async () => {
                try {
                  await recordRequestService.create(user, {
                    studentId: f.studentId, sourceOrganizationId: f.sourceOrganizationId,
                    requestedRecordTypes: f.types, purpose: f.purpose, legalBasis: f.legalBasis,
                  })
                  toast.push('Request submitted — the holding institution has been notified', 'success')
                  setOpen(false)
                  setF({ studentId: '', sourceOrganizationId: '', purpose: '', legalBasis: '', types: ['ACADEMIC_RECORDS', 'ENROLLMENTS'] })
                  data.reload()
                } catch (err) {
                  toast.push(err instanceof Error ? err.message : 'Could not submit', 'error')
                }
              }}
            >
              Submit request
            </Button>
          </>
        }
      >
        <Field label="Student (currently or previously enrolled with you)">
          <Select value={f.studentId} onChange={(e) => setF((x) => ({ ...x, studentId: e.target.value }))} required>
            <option value="">Select…</option>
            {(students.data ?? []).map((s) => <option key={s.id} value={s.id}>{s.firstName} {s.lastName} · {s.institutionStudentNumber}</option>)}
          </Select>
        </Field>
        <Field label="Holding institution">
          <Select value={f.sourceOrganizationId} onChange={(e) => setF((x) => ({ ...x, sourceOrganizationId: e.target.value }))} required>
            <option value="">Select…</option>
            {(sources.data ?? []).map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
          </Select>
        </Field>
        <Field label="Record categories">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {RECORD_TYPES.map((t) => (
              <button
                key={t}
                type="button"
                className={`chip ${f.types.includes(t) ? 'chip-active' : ''}`}
                onClick={() => toggleType(t, f.types, (v) => setF((x) => ({ ...x, types: v })))}
              >
                {TYPE_LABEL[t]}
              </button>
            ))}
          </div>
        </Field>
        <Field label="Purpose"><TextArea value={f.purpose} onChange={(e) => setF((x) => ({ ...x, purpose: e.target.value }))} required placeholder="e.g. Continuing education — placement into S6." /></Field>
        <Field label="Legal basis / reference (optional)"><TextInput value={f.legalBasis} onChange={(e) => setF((x) => ({ ...x, legalBasis: e.target.value }))} placeholder="e.g. Guardian consent on file, ref GC-2026-014" /></Field>
      </Modal>

      {review && <ReviewModal request={review} onClose={() => setReview(null)} onDone={() => { setReview(null); data.reload() }} />}
      {detail && <DetailModal request={detail} onClose={() => setDetail(null)} />}
    </div>
  )
}

function ReviewModal({ request, onClose, onDone }: { request: RecordRequest; onClose: () => void; onDone: () => void }) {
  const user = useCurrentUser()
  const toast = useToast()
  const consents = useAsync(() => consentService.list(user).catch(() => [] as Consent[]), [user.id])
  const [approved, setApproved] = useState<RecordType[]>(request.requestedRecordTypes)
  const [consentId, setConsentId] = useState('')
  const [legalBasis, setLegalBasis] = useState(request.legalBasis)
  const [note, setNote] = useState('')
  const [days, setDays] = useState(90)
  const [captureConsent, setCaptureConsent] = useState(false)
  const [c, setC] = useState({ grantedByName: '', grantedByRelationship: 'guardian' as Consent['grantedByRelationship'], purpose: request.purpose })

  const matchingConsents = (consents.data ?? []).filter(
    (x) => x.studentId === request.studentId && x.requestingOrganizationId === request.requestingOrganizationId && x.status === 'GRANTED',
  )

  const decide = async (decision: 'approve' | 'partial' | 'reject' | 'need_info') => {
    try {
      let useConsentId = consentId || undefined
      if ((decision === 'approve' || decision === 'partial') && captureConsent && !useConsentId) {
        const created = await consentService.record(user, {
          studentId: request.studentId, requestingOrganizationId: request.requestingOrganizationId,
          scopeRecordTypes: approved, grantedByName: c.grantedByName, grantedByRelationship: c.grantedByRelationship,
          purpose: c.purpose, legalBasis: legalBasis || 'Consent recorded at review', requestId: request.id,
        })
        useConsentId = created.id
      }
      await recordRequestService.review(user, request.id, decision, {
        approvedRecordTypes: approved, consentId: useConsentId ?? null, legalBasis, note, expiresInDays: days,
      })
      toast.push('Decision recorded', 'success')
      onDone()
    } catch (err) {
      toast.push(err instanceof Error ? err.message : 'Could not record decision', 'error')
    }
  }

  const toggle = (t: RecordType) => setApproved((l) => (l.includes(t) ? l.filter((x) => x !== t) : [...l, t]))

  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      title={`Review — ${request.studentName}`}
      footer={
        <>
          <Button variant="ghost" onClick={() => decide('need_info')}>Need info</Button>
          <Button variant="danger" onClick={() => decide('reject')}>Reject</Button>
          <Button variant="primary" disabled={!approved.length} onClick={() => decide(approved.length < request.requestedRecordTypes.length ? 'partial' : 'approve')}>
            Approve {approved.length < request.requestedRecordTypes.length ? '(partial)' : ''}
          </Button>
        </>
      }
    >
      <p style={{ fontSize: '0.9rem' }}><strong>Requested by:</strong> {request.requestingOrganizationId}</p>
      <p style={{ fontSize: '0.9rem', color: 'var(--text-soft)' }}>{request.purpose}</p>

      <Field label="Approve these categories">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {request.requestedRecordTypes.map((t) => (
            <button key={t} type="button" className={`chip ${approved.includes(t) ? 'chip-active' : ''}`} onClick={() => toggle(t)}>{TYPE_LABEL[t]}</button>
          ))}
        </div>
      </Field>

      <Field label="Lawful basis — link a consent record">
        <Select value={consentId} onChange={(e) => setConsentId(e.target.value)}>
          <option value="">None selected</option>
          {matchingConsents.map((x) => <option key={x.id} value={x.id}>{x.id} · {x.grantedByName} ({x.grantedByRelationship})</option>)}
        </Select>
      </Field>

      <label className="field-inline" style={{ display: 'flex', gap: 8, alignItems: 'center', margin: '4px 0 8px' }}>
        <input type="checkbox" checked={captureConsent} onChange={(e) => setCaptureConsent(e.target.checked)} />
        <span>Record a new consent now</span>
      </label>
      {captureConsent && (
        <div className="form-grid">
          <Field label="Consent given by"><TextInput value={c.grantedByName} onChange={(e) => setC((x) => ({ ...x, grantedByName: e.target.value }))} placeholder="Full name" /></Field>
          <Field label="Relationship">
            <Select value={c.grantedByRelationship} onChange={(e) => setC((x) => ({ ...x, grantedByRelationship: e.target.value as Consent['grantedByRelationship'] }))}>
              <option value="self">Self (adult student)</option>
              <option value="parent">Parent</option>
              <option value="guardian">Guardian</option>
              <option value="legal_representative">Legal representative</option>
              <option value="other">Other</option>
            </Select>
          </Field>
        </div>
      )}

      <div className="form-grid">
        <Field label="Legal basis (if no consent record)"><TextInput value={legalBasis} onChange={(e) => setLegalBasis(e.target.value)} placeholder="e.g. Statutory records transfer" /></Field>
        <Field label="Access valid for (days)"><TextInput type="number" value={String(days)} onChange={(e) => setDays(Number(e.target.value) || 0)} /></Field>
      </div>
      <Field label="Decision note"><TextArea value={note} onChange={(e) => setNote(e.target.value)} /></Field>
      <p style={{ fontSize: '0.8rem', color: 'var(--text-faint)' }}>
        Approval needs either a linked consent record or a stated legal basis. The receiving institution gets read-only
        access to the selected categories until the expiry date; you can revoke it at any time.
      </p>
    </Modal>
  )
}

function DetailModal({ request, onClose }: { request: RecordRequest; onClose: () => void }) {
  const user = useCurrentUser()
  const granted = request.status === 'APPROVED' || request.status === 'PARTIALLY_APPROVED'
  const isOutgoing = request.requestingOrganizationId === user.organizationId
  const showRecords = granted && isOutgoing
  const academic = useAsync(
    () => (showRecords && request.approvedRecordTypes.includes('ACADEMIC_RECORDS') ? studentService.academicFor(user, request.studentId).catch(() => []) : Promise.resolve([])),
    [request.id, showRecords],
  )
  const attendance = useAsync(
    () => (showRecords && request.approvedRecordTypes.includes('ATTENDANCE_SUMMARY') ? studentService.attendanceFor(user, request.studentId).catch(() => []) : Promise.resolve([])),
    [request.id, showRecords],
  )

  return (
    <Modal open onClose={onClose} size="lg" title={`${request.reference} — ${request.studentName}`}>
      <p style={{ fontSize: '0.9rem' }}>
        {request.requestingOrganizationId} → {request.sourceOrganizationId} · <StatusBadge status={request.status} />
      </p>
      <p style={{ fontSize: '0.9rem', color: 'var(--text-soft)' }}>{request.purpose}</p>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', margin: '8px 0' }}>
        {(request.approvedRecordTypes.length ? request.approvedRecordTypes : request.requestedRecordTypes).map((t) => (
          <Badge key={t} tone={request.approvedRecordTypes.includes(t) ? 'success' : 'neutral'}>{TYPE_LABEL[t]}</Badge>
        ))}
      </div>
      {request.expiresAt && <p style={{ fontSize: '0.85rem' }}>Access until <strong>{formatDate(request.expiresAt)}</strong></p>}

      <h4 style={{ margin: '14px 0 8px' }}>Timeline</h4>
      <Timeline items={request.timeline.map((t) => ({ title: t.action, when: formatDateTime(t.at), note: t.note }))} />

      {showRecords && (
        <>
          <h4 style={{ margin: '16px 0 8px' }}>Shared records (read-only)</h4>
          {request.approvedRecordTypes.includes('ACADEMIC_RECORDS') && (
            <AsyncView data={academic} isEmpty={(d) => d.length === 0} empty={<EmptyState title="No academic records" />}>
              {(rows) => (
                <table className="data"><tbody>
                  {rows.map((r) => <tr key={r.id}><td><strong>{r.subjectName}</strong></td><td>{r.term}</td><td>{r.score}% ({r.grade})</td></tr>)}
                </tbody></table>
              )}
            </AsyncView>
          )}
          {request.approvedRecordTypes.includes('ATTENDANCE_SUMMARY') && (
            <AsyncView data={attendance} isEmpty={(d) => d.length === 0} empty={<EmptyState title="No attendance records" />}>
              {(rows) => <p style={{ fontSize: '0.9rem' }}>{rows.length} attendance entries · {rows.filter((r) => r.status === 'present' || r.status === 'late').length} present/late</p>}
            </AsyncView>
          )}
        </>
      )}
    </Modal>
  )
}

/* ================================================================ Issued credentials */

export function IssuedCredentials() {
  const user = useCurrentUser()
  const toast = useToast()
  const data = useAsync(() => credentialService.listForOrg(user), [user.id])
  const students = useAsync(() => studentService.list(user).catch(() => []), [user.id])
  const [open, setOpen] = useState(false)
  const [f, setF] = useState({ studentId: '', title: '', type: 'certificate' as Credential['type'], issuedDate: new Date().toISOString().slice(0, 10) })

  return (
    <div className="section-stack">
      <PageHeader
        title="Credentials"
        description="Issue verifiable certificates, diplomas and awards. Anyone can confirm one at /verify without signing in."
        actions={<Button variant="primary" onClick={() => setOpen(true)}>Issue credential</Button>}
      />
      <AsyncView data={data} onRetry={data.reload}>
        {(rows) => (
          <Card>
            <div className="card-body">
              <DataTable
                rows={rows}
                getKey={(c) => c.id}
                emptyTitle="No credentials issued yet"
                columns={[
                  { key: 'title', header: 'Credential', render: (c: Credential) => <strong>{c.title}</strong> },
                  { key: 'type', header: 'Type', render: (c: Credential) => <span style={{ textTransform: 'capitalize' }}>{c.type}</span> },
                  { key: 'issued', header: 'Issued', render: (c: Credential) => formatDate(c.issuedDate) },
                  { key: 'code', header: 'Verification code', render: (c: Credential) => <code>{c.verificationCode}</code> },
                  { key: 'status', header: 'Status', render: (c: Credential) => <StatusBadge status={c.status} /> },
                ]}
                rowActions={(c) => (
                  <>
                    <a className="btn btn-ghost btn-sm" href={`/verify/${encodeURIComponent(c.verificationCode)}`} target="_blank" rel="noreferrer">Verify page</a>
                    {c.status === 'issued' && (
                      <Button size="sm" variant="danger" onClick={async () => {
                        await credentialService.revoke(user, c.id, 'Revoked by issuer')
                        toast.push('Credential revoked', 'success')
                        data.reload()
                      }}>Revoke</Button>
                    )}
                  </>
                )}
              />
            </div>
          </Card>
        )}
      </AsyncView>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Issue a credential"
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button
              variant="primary"
              disabled={!f.studentId || !f.title.trim()}
              onClick={async () => {
                try {
                  const c = await credentialService.issue(user, f)
                  toast.push(`Issued — verification code ${c.verificationCode}`, 'success')
                  setOpen(false)
                  setF({ studentId: '', title: '', type: 'certificate', issuedDate: new Date().toISOString().slice(0, 10) })
                  data.reload()
                } catch (err) {
                  toast.push(err instanceof Error ? err.message : 'Could not issue', 'error')
                }
              }}
            >
              Issue
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
        <Field label="Title"><TextInput value={f.title} onChange={(e) => setF((x) => ({ ...x, title: e.target.value }))} placeholder="e.g. Advanced Mathematics — Level 3" required /></Field>
        <div className="form-grid">
          <Field label="Type">
            <Select value={f.type} onChange={(e) => setF((x) => ({ ...x, type: e.target.value as Credential['type'] }))}>
              <option value="certificate">Certificate</option>
              <option value="diploma">Diploma</option>
              <option value="badge">Badge</option>
              <option value="award">Award</option>
            </Select>
          </Field>
          <Field label="Issue date"><TextInput type="date" value={f.issuedDate} onChange={(e) => setF((x) => ({ ...x, issuedDate: e.target.value }))} /></Field>
        </div>
      </Modal>
    </div>
  )
}

/* ================================================================ School campaigns */

export function SchoolCampaigns() {
  const user = useCurrentUser()
  const data = useAsync(() => campaignService.list(user), [user.id])
  const [active, setActive] = useState<Id | null>(null)

  return (
    <div className="section-stack">
      <PageHeader title="Government Data Campaigns" description="Structured data returns requested by the ministry. Complete and submit before the due date." />
      <AsyncView data={data} isEmpty={(d) => d.length === 0} empty={<EmptyState title="No campaigns" description="You'll see data campaigns here when the ministry publishes one." />} onRetry={data.reload}>
        {(rows) => (
          <Card>
            <div className="card-body">
              <DataTable
                rows={rows}
                getKey={(c) => c.id}
                emptyTitle="No campaigns"
                columns={[
                  { key: 'title', header: 'Campaign', render: (c: Campaign) => <strong>{c.title}</strong> },
                  { key: 'due', header: 'Due', render: (c: Campaign) => formatDate(c.dueAt) },
                  { key: 'status', header: 'Status', render: (c: Campaign) => <StatusBadge status={c.status} /> },
                ]}
                rowActions={(c) => <Button size="sm" variant="primary" onClick={() => setActive(c.id)}>Open</Button>}
              />
            </div>
          </Card>
        )}
      </AsyncView>
      {active && <CampaignResponder campaignId={active} onClose={() => { setActive(null); data.reload() }} />}
    </div>
  )
}

function CampaignResponder({ campaignId, onClose }: { campaignId: Id; onClose: () => void }) {
  const user = useCurrentUser()
  const toast = useToast()
  const load = useAsync(() => campaignService.submissionFor(user, campaignId), [campaignId])
  const [values, setValues] = useState<Record<string, unknown>>({})
  const [ready, setReady] = useState(false)

  if (load.data && !ready) {
    setValues(load.data.submission.data ?? {})
    setReady(true)
  }

  const locked = (s: CampaignSubmission['status']) => ['SUBMITTED', 'UNDER_REVIEW', 'APPROVED'].includes(s)

  return (
    <Modal open onClose={onClose} size="lg" title="Campaign response">
      <AsyncView data={load}>
        {({ campaign, submission }) => (
          <>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-soft)' }}>{campaign.description}</p>
            <p style={{ fontSize: '0.85rem' }}>Due {formatDate(campaign.dueAt)} · <StatusBadge status={submission.status} /></p>
            {submission.status === 'RETURNED' && submission.reviewNote && (
              <div className="banner banner-warning" style={{ margin: '8px 0' }}>Returned for correction: {submission.reviewNote}</div>
            )}
            <div style={{ marginTop: 10 }}>
              {campaign.fields.map((field) => (
                <Field key={field.key} label={`${field.label}${field.required ? ' *' : ''}`}>
                  {field.type === 'boolean' ? (
                    <Select
                      value={String(values[field.key] ?? '')}
                      disabled={locked(submission.status)}
                      onChange={(e) => setValues((v) => ({ ...v, [field.key]: e.target.value === 'true' }))}
                    >
                      <option value="">—</option>
                      <option value="true">Yes</option>
                      <option value="false">No</option>
                    </Select>
                  ) : field.type === 'select' ? (
                    <Select value={String(values[field.key] ?? '')} disabled={locked(submission.status)} onChange={(e) => setValues((v) => ({ ...v, [field.key]: e.target.value }))}>
                      <option value="">—</option>
                      {field.options.map((o) => <option key={o}>{o}</option>)}
                    </Select>
                  ) : (
                    <TextInput
                      type={field.type === 'number' || field.type === 'integer' ? 'number' : field.type === 'date' ? 'date' : 'text'}
                      value={String(values[field.key] ?? '')}
                      disabled={locked(submission.status)}
                      onChange={(e) => setValues((v) => ({ ...v, [field.key]: e.target.value }))}
                    />
                  )}
                  {field.help && <span className="field-hint">{field.help}</span>}
                </Field>
              ))}
            </div>
            {!locked(submission.status) && (
              <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                <Button variant="secondary" onClick={async () => {
                  await campaignService.saveSubmission(user, campaignId, values)
                  toast.push('Draft saved', 'success')
                  load.reload()
                }}>Save draft</Button>
                <Button variant="primary" onClick={async () => {
                  try {
                    await campaignService.saveSubmission(user, campaignId, values)
                    await campaignService.submit(user, campaignId)
                    toast.push('Response submitted', 'success')
                    onClose()
                  } catch (err) {
                    toast.push(err instanceof Error ? err.message : 'Could not submit', 'error')
                  }
                }}>Submit response</Button>
              </div>
            )}
          </>
        )}
      </AsyncView>
    </Modal>
  )
}
