import { useState } from 'react'
import { useCurrentUser } from '@/context/AuthContext'
import { useAsync } from '@/hooks/useAsync'
import { campaignService } from '@/services/campaignService'
import type { CampaignDashboard } from '@/services/campaignService'
import {
  AsyncView, Button, Card, CardHeader, DataTable, EmptyState, Field, Modal, PageHeader,
  Select, StatCard, StatusBadge, TextArea, TextInput, useToast, formatDate,
} from '@/components/ui'
import type { Campaign, CampaignField, CampaignSubmission, Id, OrganizationType } from '@shared/types'

type DraftField = { label: string; type: CampaignField['type']; required: boolean }

const AUDIENCE: OrganizationType[] = ['SCHOOL', 'UNIVERSITY', 'COLLEGE', 'TRAINING_CENTER']

export function GovernmentCampaigns() {
  const user = useCurrentUser()
  const toast = useToast()
  const data = useAsync(() => campaignService.list(user), [user.id])
  const [open, setOpen] = useState(false)
  const [dash, setDash] = useState<Id | null>(null)
  const [f, setF] = useState<{ title: string; description: string; dueAt: string; audience: OrganizationType[]; fields: DraftField[] }>({
    title: '', description: '', dueAt: '', audience: ['SCHOOL'],
    fields: [{ label: 'Total enrolled students', type: 'integer', required: true }],
  })

  const addField = () => setF((x) => ({ ...x, fields: [...x.fields, { label: '', type: 'text', required: true }] }))
  const setField = (i: number, patch: Partial<DraftField>) =>
    setF((x) => ({ ...x, fields: x.fields.map((fl, j) => (j === i ? { ...fl, ...patch } : fl)) }))
  const removeField = (i: number) => setF((x) => ({ ...x, fields: x.fields.filter((_, j) => j !== i) }))
  const toggleAudience = (t: OrganizationType) =>
    setF((x) => ({ ...x, audience: x.audience.includes(t) ? x.audience.filter((a) => a !== t) : [...x.audience, t] }))

  return (
    <div className="section-stack">
      <PageHeader
        title="Data Campaigns"
        description="Create a structured data return, publish it to institutions, and track completion."
        actions={<Button variant="primary" onClick={() => setOpen(true)}>New campaign</Button>}
      />

      <AsyncView data={data} isEmpty={(d) => d.length === 0} empty={<EmptyState title="No campaigns yet" />} onRetry={data.reload}>
        {(rows) => (
          <Card>
            <div className="card-body">
              <DataTable
                rows={rows}
                getKey={(c) => c.id}
                emptyTitle="No campaigns"
                columns={[
                  { key: 'title', header: 'Campaign', render: (c: Campaign) => <strong>{c.title}</strong> },
                  { key: 'audience', header: 'Audience', render: (c: Campaign) => c.audienceOrganizationTypes.join(', ') },
                  { key: 'targets', header: 'Institutions', render: (c: Campaign) => (c.targetOrganizationIds.length || '—') },
                  { key: 'due', header: 'Due', render: (c: Campaign) => formatDate(c.dueAt) },
                  { key: 'status', header: 'Status', render: (c: Campaign) => <StatusBadge status={c.status} /> },
                ]}
                rowActions={(c) => (
                  <>
                    {c.status === 'DRAFT' && (
                      <Button size="sm" variant="primary" onClick={async () => {
                        try {
                          await campaignService.publish(user, c.id)
                          toast.push('Published to institutions', 'success')
                          data.reload()
                        } catch (err) {
                          toast.push(err instanceof Error ? err.message : 'Could not publish', 'error')
                        }
                      }}>Publish</Button>
                    )}
                    {c.status !== 'DRAFT' && <Button size="sm" variant="ghost" onClick={() => setDash(c.id)}>Dashboard</Button>}
                    {(c.status === 'OPEN' || c.status === 'CLOSING_SOON') && (
                      <Button size="sm" variant="ghost" onClick={async () => { await campaignService.close(user, c.id); data.reload() }}>Close</Button>
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
        size="lg"
        title="New data campaign"
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button
              variant="primary"
              disabled={!f.title.trim() || !f.dueAt || !f.audience.length || f.fields.some((fl) => !fl.label.trim())}
              onClick={async () => {
                try {
                  await campaignService.create(user, {
                    title: f.title, description: f.description, dueAt: f.dueAt,
                    audienceOrganizationTypes: f.audience,
                    fields: f.fields.map((fl) => ({ label: fl.label, type: fl.type, required: fl.required })),
                  })
                  toast.push('Draft campaign created', 'success')
                  setOpen(false)
                  data.reload()
                } catch (err) {
                  toast.push(err instanceof Error ? err.message : 'Could not create', 'error')
                }
              }}
            >
              Create draft
            </Button>
          </>
        }
      >
        <Field label="Title"><TextInput value={f.title} onChange={(e) => setF((x) => ({ ...x, title: e.target.value }))} required /></Field>
        <Field label="Description"><TextArea value={f.description} onChange={(e) => setF((x) => ({ ...x, description: e.target.value }))} /></Field>
        <Field label="Due date"><TextInput type="date" value={f.dueAt} onChange={(e) => setF((x) => ({ ...x, dueAt: e.target.value }))} required /></Field>
        <Field label="Audience">
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {AUDIENCE.map((t) => (
              <button key={t} type="button" className={`chip ${f.audience.includes(t) ? 'chip-active' : ''}`} onClick={() => toggleAudience(t)}>{t}</button>
            ))}
          </div>
        </Field>

        <CardHeader title="Data fields" action={<Button size="sm" variant="ghost" onClick={addField}>Add field</Button>} />
        {f.fields.map((fl, i) => (
          <div key={i} className="form-grid" style={{ alignItems: 'end', borderBottom: '1px solid var(--border)', paddingBottom: 8, marginBottom: 8 }}>
            <Field label="Label"><TextInput value={fl.label} onChange={(e) => setField(i, { label: e.target.value })} /></Field>
            <Field label="Type">
              <Select value={fl.type} onChange={(e) => setField(i, { type: e.target.value as CampaignField['type'] })}>
                <option value="text">Text</option>
                <option value="integer">Integer</option>
                <option value="number">Number</option>
                <option value="boolean">Yes / No</option>
                <option value="date">Date</option>
              </Select>
            </Field>
            <label className="field-inline" style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <input type="checkbox" checked={fl.required} onChange={(e) => setField(i, { required: e.target.checked })} /> Required
            </label>
            <Button size="sm" variant="ghost" onClick={() => removeField(i)} disabled={f.fields.length === 1}>Remove</Button>
          </div>
        ))}
      </Modal>

      {dash && <DashboardModal campaignId={dash} onClose={() => setDash(null)} />}
    </div>
  )
}

function DashboardModal({ campaignId, onClose }: { campaignId: Id; onClose: () => void }) {
  const user = useCurrentUser()
  const toast = useToast()
  const dash = useAsync(() => campaignService.dashboard(user, campaignId), [campaignId])
  const subs = useAsync(() => campaignService.submissions(user, campaignId), [campaignId])

  const review = async (id: Id, decision: 'approve' | 'return') => {
    const note = decision === 'return' ? window.prompt('Reason for returning:') ?? '' : ''
    await campaignService.reviewSubmission(user, id, decision, note)
    toast.push(decision === 'approve' ? 'Approved' : 'Returned', 'success')
    dash.reload()
    subs.reload()
  }

  return (
    <Modal open onClose={onClose} size="lg" title="Campaign dashboard">
      <AsyncView data={dash}>
        {(d: CampaignDashboard) => (
          <>
            <h3 style={{ margin: '0 0 4px' }}>{d.campaign.title}</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-soft)' }}>Due {formatDate(d.campaign.dueAt)}</p>
            <div className="stat-grid" style={{ margin: '12px 0' }}>
              <StatCard label="Assigned" value={d.assigned} />
              <StatCard label="Completion" value={`${d.completionPct}%`} />
              <StatCard label="Approved" value={d.totals.APPROVED} />
              <StatCard label="Overdue" value={d.overdue} />
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', fontSize: '0.8rem', color: 'var(--text-soft)' }}>
              <span>Not started: {d.totals.NOT_STARTED}</span>
              <span>· In progress: {d.totals.IN_PROGRESS}</span>
              <span>· Submitted: {d.totals.SUBMITTED}</span>
              <span>· Returned: {d.totals.RETURNED}</span>
            </div>
          </>
        )}
      </AsyncView>

      <h4 style={{ margin: '16px 0 8px' }}>Submissions</h4>
      <AsyncView data={subs} isEmpty={(d) => d.length === 0} empty={<EmptyState title="No institutions assigned" />}>
        {(rows) => (
          <table className="data">
            <tbody>
              {rows.map((s: CampaignSubmission & { organizationName: string }) => (
                <tr key={s.id}>
                  <td><strong>{s.organizationName}</strong></td>
                  <td><StatusBadge status={s.status} /></td>
                  <td>{s.submittedAt ? formatDate(s.submittedAt) : '—'}</td>
                  <td>
                    {(s.status === 'SUBMITTED' || s.status === 'UNDER_REVIEW') && (
                      <div className="row-actions">
                        <Button size="sm" variant="primary" onClick={() => review(s.id, 'approve')}>Approve</Button>
                        <Button size="sm" variant="ghost" onClick={() => review(s.id, 'return')}>Return</Button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </AsyncView>
    </Modal>
  )
}
