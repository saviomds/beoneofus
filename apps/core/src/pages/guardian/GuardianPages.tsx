import { useState } from 'react'
import { useCurrentUser } from '@/context/AuthContext'
import { useAsync } from '@/hooks/useAsync'
import { guardianService } from '@/services/guardianService'
import {
  AsyncView, Badge, Button, Card, CardHeader, EmptyState, Modal, PageHeader, StatCard,
  StatusBadge, Tabs, TextInput, useTabs, useToast, formatDate,
} from '@/components/ui'
import { ReportCardView } from '@/pages/student/ReportCards'
import type { AttendanceRecord, Id, ReportCard } from '@shared/types'

export function GuardianOverview() {
  const user = useCurrentUser()
  const data = useAsync(() => guardianService.myChildren(user), [user.id])
  return (
    <div className="section-stack">
      <PageHeader title={`Welcome, ${user.name}`} description="A read-only view of your children's academic life across their institutions." />
      <AsyncView data={data} isEmpty={(d) => d.length === 0} empty={<EmptyState title="No linked children" description="Ask your child's school to link your guardian account." />} onRetry={data.reload}>
        {(rows) => (
          <div className="stat-grid">
            {rows.map((c) => (
              <Card key={c.link.id}>
                <CardHeader title={`${c.student.firstName} ${c.student.lastName}`} action={c.link.isPrimary ? <Badge tone="info">Primary</Badge> : undefined} />
                <div className="card-body">
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-soft)' }}>{c.organizationName} · {c.student.gradeLevel}</p>
                  <div className="stat-grid" style={{ marginTop: 8 }}>
                    <StatCard label="Attendance" value={`${c.attendanceRate}%`} />
                    <StatCard label="Latest GPA" value={c.latestReportCard ? c.latestReportCard.gpa.toFixed(2) : '—'} />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </AsyncView>
    </div>
  )
}

export function GuardianChildren() {
  const user = useCurrentUser()
  const data = useAsync(() => guardianService.myChildren(user), [user.id])
  const [active, setActive] = useState<Id | null>(null)
  return (
    <div className="section-stack">
      <PageHeader title="My Children" description="Grades, attendance and report cards for each linked child." />
      <AsyncView data={data} isEmpty={(d) => d.length === 0} empty={<EmptyState title="No linked children" />} onRetry={data.reload}>
        {(rows) => (
          <>
            {rows.map((c) => (
              <Card key={c.link.id}>
                <CardHeader
                  title={`${c.student.firstName} ${c.student.lastName}`}
                  subtitle={`${c.organizationName} · ${c.student.institutionStudentNumber}`}
                  action={<Button size="sm" variant="ghost" onClick={() => setActive(c.student.id)}>Open</Button>}
                />
              </Card>
            ))}
            {active && <ChildDetail studentId={active} onClose={() => setActive(null)} />}
          </>
        )}
      </AsyncView>
    </div>
  )
}

function ChildDetail({ studentId, onClose }: { studentId: Id; onClose: () => void }) {
  const user = useCurrentUser()
  const toast = useToast()
  const tabs = useTabs('grades')
  const data = useAsync(() => guardianService.childOverview(user, studentId), [studentId])
  const [card, setCard] = useState<ReportCard | null>(null)
  const [excuseFor, setExcuseFor] = useState<AttendanceRecord | null>(null)
  const [reason, setReason] = useState('')

  return (
    <Modal open onClose={onClose} size="lg" title="Child overview">
      <AsyncView data={data}>
        {(d) => (
          <>
            <p style={{ fontSize: '0.9rem' }}><strong>{d.student.firstName} {d.student.lastName}</strong> · {d.organizationName} · {d.student.gradeLevel}</p>
            <Tabs
              tabs={[{ key: 'grades', label: 'Grades' }, { key: 'attendance', label: 'Attendance' }, { key: 'cards', label: 'Report cards' }, { key: 'news', label: 'Announcements' }]}
              active={tabs.active}
              onChange={tabs.setActive}
            />

            {tabs.active === 'grades' && (
              d.assessments.length === 0 ? <EmptyState title="No marks recorded" /> : (
                <table className="data"><thead><tr><th>Subject</th><th>Assessment</th><th>Score</th><th>Date</th></tr></thead>
                  <tbody>{d.assessments.map((a) => <tr key={a.id}><td>{a.subjectName}</td><td>{a.title}</td><td>{a.score}/{a.maxScore}</td><td>{formatDate(a.date)}</td></tr>)}</tbody>
                </table>
              )
            )}

            {tabs.active === 'attendance' && (
              <>
                <p style={{ fontSize: '0.85rem' }}>Attendance rate: <strong>{d.attendanceRate}%</strong></p>
                {d.attendance.length === 0 ? <EmptyState title="No attendance records" /> : (
                  <table className="data"><thead><tr><th>Date</th><th>Status</th><th>Excuse</th><th /></tr></thead>
                    <tbody>{d.attendance.slice(0, 40).map((r) => (
                      <tr key={r.id}>
                        <td>{formatDate(r.date)}</td>
                        <td><StatusBadge status={r.status} /></td>
                        <td>{r.excuseStatus === 'none' ? '—' : <StatusBadge status={r.excuseStatus} />}</td>
                        <td>{(r.status === 'absent' || r.status === 'late') && r.excuseStatus === 'none' && (
                          <Button size="sm" variant="ghost" onClick={() => { setExcuseFor(r); setReason('') }}>Request excuse</Button>
                        )}</td>
                      </tr>
                    ))}</tbody>
                  </table>
                )}
              </>
            )}

            {tabs.active === 'cards' && (
              d.reportCards.length === 0 ? <EmptyState title="No published report cards" /> : d.reportCards.map((rc) => (
                <div key={rc.id} style={{ padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                  <strong>{rc.term} {rc.academicYear}</strong> — GPA {rc.gpa.toFixed(2)}, avg {rc.average}%
                  <Button size="sm" variant="ghost" onClick={() => setCard(rc)} style={{ marginLeft: 8 }}>Open</Button>
                </div>
              ))
            )}

            {tabs.active === 'news' && (
              d.announcements.length === 0 ? <EmptyState title="No announcements" /> : d.announcements.map((a) => (
                <div key={a.id} style={{ padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                  <strong>{a.title}</strong>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-soft)' }}>{a.body}</p>
                </div>
              ))
            )}
          </>
        )}
      </AsyncView>

      {card && <ReportCardView card={card} onClose={() => setCard(null)} />}

      {excuseFor && (
        <Modal
          open
          onClose={() => setExcuseFor(null)}
          title="Request an excuse"
          footer={
            <>
              <Button variant="ghost" onClick={() => setExcuseFor(null)}>Cancel</Button>
              <Button variant="primary" disabled={!reason.trim()} onClick={async () => {
                try {
                  await guardianService.requestExcuse(user, excuseFor.id, reason.trim())
                  toast.push('Excuse request sent to the school', 'success')
                  setExcuseFor(null)
                  data.reload()
                } catch (err) {
                  toast.push(err instanceof Error ? err.message : 'Could not send', 'error')
                }
              }}>Send</Button>
            </>
          }
        >
          <p style={{ fontSize: '0.85rem' }}>Absence on {formatDate(excuseFor.date)}</p>
          <TextInput value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason (e.g. medical appointment)" />
        </Modal>
      )}
    </Modal>
  )
}
