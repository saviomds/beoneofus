import { useState } from 'react'
import { useCurrentUser } from '@/context/AuthContext'
import { useAsync } from '@/hooks/useAsync'
import { organizationService } from '@/services/organizationService'
import { invitationService } from '@/services/invitationService'
import { systemService } from '@/services/systemService'
import { ROLES, ROLE_PERMISSIONS } from '@shared/rbac'
import { EDUCATION_KEYS } from '@shared/config/educationStructures'
import {
  AsyncView, Button, Card, CardHeader, DataTable, EmptyState, Field, MetaList, PageHeader,
  Select, StatCard, StatusBadge, TextInput, Chips, useToast, formatDateTime, formatDate, Banner,
} from '@/components/ui'
import type { OrganizationType, Role } from '@shared/types'

/* ---------------------------------------------------------------- Organizations */

export function AdminOrganizations() {
  const admin = useCurrentUser()
  const toast = useToast()
  const orgs = useAsync(() => organizationService.list(admin), [admin.id])

  return (
    <div className="section-stack">
      <PageHeader title="Institutions" description="Every tenant on the platform — approve, suspend, reactivate or archive." />
      <Card>
        <div className="card-body">
          <AsyncView data={orgs} isEmpty={(d) => d.length === 0} empty={<EmptyState title="No institutions yet" />}>
            {(list) => (
              <DataTable
                rows={list}
                getKey={(o) => o.id}
                searchable={(o) => `${o.officialName} ${o.organizationCode} ${o.district}`}
                filters={[
                  { key: 'status', label: 'Status', options: ['PENDING', 'ACTIVE', 'SUSPENDED', 'ARCHIVED'], match: (o, v) => o.status === v },
                  { key: 'type', label: 'Type', options: ['SCHOOL', 'UNIVERSITY', 'COLLEGE', 'TRAINING_CENTER'], match: (o, v) => o.organizationType === v },
                ]}
                columns={[
                  { key: 'name', header: 'Institution', render: (o) => <strong>{o.officialName}</strong>, sortValue: (o) => o.officialName },
                  { key: 'code', header: 'Code', render: (o) => o.organizationCode },
                  { key: 'type', header: 'Type', render: (o) => o.organizationType },
                  { key: 'district', header: 'District', render: (o) => o.district || '—' },
                  { key: 'status', header: 'Status', render: (o) => <StatusBadge status={o.status} /> },
                ]}
                rowActions={(o) => (
                  <>
                    {o.status === 'PENDING' && <Button size="sm" variant="primary" onClick={async () => { await organizationService.setStatus(admin, o.id, 'ACTIVE', 'Approved'); toast.push('Institution activated', 'success'); orgs.reload() }}>Approve</Button>}
                    {o.status === 'ACTIVE' && <Button size="sm" variant="ghost" onClick={async () => { await organizationService.setStatus(admin, o.id, 'SUSPENDED'); toast.push('Suspended'); orgs.reload() }}>Suspend</Button>}
                    {o.status === 'SUSPENDED' && <Button size="sm" variant="ghost" onClick={async () => { await organizationService.setStatus(admin, o.id, 'ACTIVE'); toast.push('Reactivated', 'success'); orgs.reload() }}>Reactivate</Button>}
                    {o.status !== 'ARCHIVED' && <Button size="sm" variant="ghost" onClick={async () => { await organizationService.setStatus(admin, o.id, 'ARCHIVED'); toast.push('Archived'); orgs.reload() }}>Archive</Button>}
                  </>
                )}
              />
            )}
          </AsyncView>
        </div>
      </Card>
    </div>
  )
}

/* ---------------------------------------------------------------- Invitations (shared admin + government) */

export function InvitationManager({ heading }: { heading: string }) {
  const actor = useCurrentUser()
  const toast = useToast()
  const [open, setOpen] = useState(false)
  const [issued, setIssued] = useState<{ link: string; token: string } | null>(null)
  const [f, setF] = useState<{ organizationName: string; organizationType: OrganizationType; institutionLevels: string[]; recipientName: string; recipientEmail: string }>({
    organizationName: '', organizationType: 'SCHOOL', institutionLevels: ['O_LEVEL'], recipientName: '', recipientEmail: '',
  })
  const list = useAsync(() => invitationService.list(actor), [actor.id])

  return (
    <div className="section-stack">
      <PageHeader
        title={heading}
        description="Institution access is invitation-only. Links are single-use, expiring and revocable."
        actions={<Button variant="primary" onClick={() => { setIssued(null); setOpen(true) }}>New invitation</Button>}
      />

      {issued && (
        <Banner tone="success">
          Invitation created. Share this one-time link (no email is sent in this demo):&nbsp;
          <code>{location.origin}{issued.link}</code>
          <Button size="sm" variant="ghost" onClick={() => { navigator.clipboard?.writeText(`${location.origin}${issued.link}`); toast.push('Link copied', 'success') }}>Copy</Button>
        </Banner>
      )}

      <Card>
        <div className="card-body">
          <AsyncView data={list} isEmpty={(d) => d.length === 0} empty={<EmptyState title="No invitations issued" />}>
            {(rows) => (
              <DataTable
                rows={rows}
                getKey={(i) => i.id}
                columns={[
                  { key: 'org', header: 'Institution', render: (i) => <strong>{i.organizationName}</strong> },
                  { key: 'type', header: 'Type', render: (i) => i.organizationType },
                  { key: 'ref', header: 'Reference', render: (i) => i.id },
                  { key: 'to', header: 'Recipient', render: (i) => `${i.recipientName} · ${i.recipientEmail}` },
                  { key: 'exp', header: 'Expires', render: (i) => formatDate(i.expiresAt) },
                  { key: 'status', header: 'Status', render: (i) => <StatusBadge status={i.status} /> },
                ]}
                rowActions={(i) => i.status === 'PENDING' ? (
                  <Button size="sm" variant="ghost" onClick={async () => { await invitationService.revoke(actor, i.id); toast.push('Invitation revoked'); list.reload() }}>Revoke</Button>
                ) : null}
              />
            )}
          </AsyncView>
        </div>
      </Card>

      {open && (
        <div className="modal-scrim" onMouseDown={(e) => e.target === e.currentTarget && setOpen(false)}>
          <div className="modal" role="dialog" aria-modal="true" aria-label="New invitation">
            <div className="modal-head"><h2>New institution invitation</h2><button className="icon-btn" onClick={() => setOpen(false)}>✕</button></div>
            <form
              onSubmit={async (e) => {
                e.preventDefault()
                const res = await invitationService.create(actor, f)
                setIssued({ link: res.link, token: res.token })
                setOpen(false)
                setF({ organizationName: '', organizationType: 'SCHOOL', institutionLevels: ['O_LEVEL'], recipientName: '', recipientEmail: '' })
                list.reload()
                toast.push('Invitation created', 'success')
              }}
            >
              <div className="modal-body">
                <Field label="Institution name"><TextInput value={f.organizationName} onChange={(e) => setF((x) => ({ ...x, organizationName: e.target.value }))} required /></Field>
                <div className="form-grid">
                  <Field label="Institution type">
                    <Select value={f.organizationType} onChange={(e) => setF((x) => ({ ...x, organizationType: e.target.value as OrganizationType }))}>
                      {(['SCHOOL', 'UNIVERSITY', 'COLLEGE', 'TRAINING_CENTER', 'OTHER'] as OrganizationType[]).map((t) => <option key={t}>{t}</option>)}
                    </Select>
                  </Field>
                  <Field label="Primary education level">
                    <Select value={f.institutionLevels[0]} onChange={(e) => setF((x) => ({ ...x, institutionLevels: [e.target.value] }))}>
                      {EDUCATION_KEYS.map((k) => <option key={k}>{k}</option>)}
                    </Select>
                  </Field>
                  <Field label="Representative name"><TextInput value={f.recipientName} onChange={(e) => setF((x) => ({ ...x, recipientName: e.target.value }))} required /></Field>
                  <Field label="Representative email"><TextInput type="email" value={f.recipientEmail} onChange={(e) => setF((x) => ({ ...x, recipientEmail: e.target.value }))} required /></Field>
                </div>
              </div>
              <div className="modal-foot"><Button variant="ghost" type="button" onClick={() => setOpen(false)}>Cancel</Button><Button variant="primary" type="submit" disabled={!f.organizationName.trim()}>Create invitation</Button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export function AdminInvitations() {
  return <InvitationManager heading="Invitations" />
}

/* ---------------------------------------------------------------- System health */

export function AdminSystemHealth() {
  const admin = useCurrentUser()
  const toast = useToast()
  const health = useAsync(() => systemService.health(admin), [admin.id])
  const [role, setRole] = useState<Role>('school')

  return (
    <div className="section-stack">
      <PageHeader
        title="System Health"
        description="Storage engine status, integrity, journal and sessions."
        actions={<Button onClick={async () => { const r = await systemService.recheck(admin); toast.push(`Integrity check: ${r.status}`, r.status === 'ERROR' ? 'error' : 'success'); health.reload() }}>Re-run integrity check</Button>}
      />
      <AsyncView data={health} error={health.error} onRetry={health.reload}>
        {(hz) => (
          <>
            <div className="stat-grid">
              <StatCard label="Storage status" value={<StatusBadge status={hz.status} />} />
              <StatCard label="Last backup" value={hz.lastBackup ? formatDateTime(hz.lastBackup.split('-').slice(0, 3).join('-')) : '—'} delta={{ text: `${hz.backupCount} snapshots` }} />
              <StatCard label="Journal entries" value={hz.journal.entries} delta={{ text: `${hz.journal.rolledBack} rolled back` }} />
              <StatCard label="Incomplete tx" value={hz.journal.incompleteTransactions} />
              <StatCard label="Active sessions" value={hz.activeSessions} />
            </div>
            <Card>
              <CardHeader title="Collections" subtitle={hz.dataDir} />
              <div className="card-body">
                <table className="data"><tbody>
                  {hz.collections.map((c) => (
                    <tr key={c.name}><td><strong>{c.name}</strong></td><td>{c.rows} rows</td><td>{c.ok ? <StatusBadge status="healthy" /> : <StatusBadge status="error" />}</td></tr>
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
                <MetaList items={[{ label: 'Role', value: role }, { label: 'Permissions', value: ROLE_PERMISSIONS[role].length }]} />
                <div style={{ marginTop: 12 }}><Chips items={[...ROLE_PERMISSIONS[role]]} /></div>
              </div>
            </Card>
          </>
        )}
      </AsyncView>
    </div>
  )
}

/* ---------------------------------------------------------------- Backups */

export function AdminBackups() {
  const admin = useCurrentUser()
  const toast = useToast()
  const backups = useAsync(() => systemService.backups(admin), [admin.id])
  const [restoring, setRestoring] = useState<string | null>(null)
  const [confirm, setConfirm] = useState('')

  return (
    <div className="section-stack">
      <PageHeader
        title="Backups & Restore"
        description="Snapshots of the entire database. A restore always takes a safety snapshot first."
        actions={<Button variant="primary" onClick={async () => { await systemService.createBackup(admin, 'manual'); toast.push('Backup created', 'success'); backups.reload() }}>Create backup</Button>}
      />
      <Banner tone="warning">Restoring replaces the current database. A <code>pre-restore</code> safety backup is created automatically so a restore is reversible.</Banner>
      <Card>
        <div className="card-body">
          <AsyncView data={backups} isEmpty={(d) => d.length === 0} empty={<EmptyState title="No backups yet" />}>
            {(list) => (
              <DataTable
                rows={list}
                getKey={(b) => b.id}
                columns={[
                  { key: 'id', header: 'Backup', render: (b) => <strong>{b.id}</strong> },
                  { key: 'label', header: 'Label', render: (b) => b.label },
                  { key: 'created', header: 'Created', render: (b) => formatDateTime(b.createdAt) },
                  { key: 'rows', header: 'Records', render: (b) => Object.values(b.counts).reduce((a, n) => a + n, 0) },
                ]}
                rowActions={(b) => <Button size="sm" variant="ghost" onClick={() => { setRestoring(b.id); setConfirm('') }}>Restore</Button>}
              />
            )}
          </AsyncView>
        </div>
      </Card>

      {restoring && (
        <div className="modal-scrim" onMouseDown={(e) => e.target === e.currentTarget && setRestoring(null)}>
          <div className="modal" role="dialog" aria-modal="true" aria-label="Restore backup">
            <div className="modal-head"><h2>Restore {restoring}</h2><button className="icon-btn" onClick={() => setRestoring(null)}>✕</button></div>
            <div className="modal-body">
              <Banner tone="danger">This replaces every collection with the backup&rsquo;s contents. Type <code>RESTORE</code> to confirm.</Banner>
              <Field label="Confirmation"><TextInput value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="RESTORE" /></Field>
            </div>
            <div className="modal-foot">
              <Button variant="ghost" onClick={() => setRestoring(null)}>Cancel</Button>
              <Button variant="danger" disabled={confirm !== 'RESTORE'} onClick={async () => {
                const r = await systemService.restoreBackup(admin, restoring, confirm)
                toast.push(`Restored. Safety backup: ${r.safetyBackup}`, 'success')
                setRestoring(null)
                backups.reload()
              }}>Restore now</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
