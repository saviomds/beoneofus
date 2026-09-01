import { useState } from 'react'
import { useCurrentUser } from '@/context/AuthContext'
import { useAsync } from '@/hooks/useAsync'
import { academicService } from '@/services/academicService'
import { studentService } from '@/services/studentService'
import {
  AsyncView, Button, Card, CardHeader, EmptyState, Modal, PageHeader, StatCard, useTabs, Tabs, formatDate,
} from '@/components/ui'
import type { ReportCard } from '@shared/types'

export function StudentReportCards() {
  const user = useCurrentUser()
  const tabs = useTabs('cards')
  const profile = useAsync(() => studentService.profileFor(user), [user.id])
  const studentId = profile.data?.student.id

  return (
    <div className="section-stack">
      <PageHeader title="Report Cards & Transcript" description="Your published term report cards and cumulative academic transcript." />
      <Tabs tabs={[{ key: 'cards', label: 'Report cards' }, { key: 'transcript', label: 'Transcript' }]} active={tabs.active} onChange={tabs.setActive} />
      {!studentId ? <Card><div className="card-body"><EmptyState title="Loading…" /></div></Card>
        : tabs.active === 'cards' ? <ReportCardList studentId={studentId} /> : <TranscriptPanel studentId={studentId} />}
    </div>
  )
}

export function ReportCardList({ studentId }: { studentId: string }) {
  const user = useCurrentUser()
  const data = useAsync(() => academicService.reportCards(user, { studentId }), [studentId])
  const [view, setView] = useState<ReportCard | null>(null)
  return (
    <AsyncView data={data} isEmpty={(d) => d.length === 0} empty={<EmptyState title="No published report cards yet" />} onRetry={data.reload}>
      {(rows) => (
        <>
          {rows.map((r) => (
            <Card key={r.id}>
              <CardHeader title={`${r.term} · ${r.academicYear}`} action={<Button size="sm" variant="ghost" onClick={() => setView(r)}>Open</Button>} />
              <div className="card-body">
                <div className="stat-grid">
                  <StatCard label="Average" value={`${r.average}%`} />
                  <StatCard label="GPA" value={r.gpa.toFixed(2)} />
                  <StatCard label="Position" value={r.overallPosition ? `${r.overallPosition}/${r.classSize}` : '—'} />
                  <StatCard label="Attendance" value={`${r.attendanceRate}%`} />
                </div>
              </div>
            </Card>
          ))}
          {view && <ReportCardView card={view} onClose={() => setView(null)} />}
        </>
      )}
    </AsyncView>
  )
}

export function ReportCardView({ card, onClose }: { card: ReportCard; onClose: () => void }) {
  return (
    <Modal open onClose={onClose} size="lg" title={`${card.term} report card`}>
      <a className="btn btn-secondary btn-sm" href={`/api/report-cards/${card.id}/pdf`} target="_blank" rel="noreferrer" style={{ float: 'right' }}>Download PDF</a>
      <p style={{ fontSize: '0.85rem', color: 'var(--text-soft)' }}>
        Published {card.publishedAt ? formatDate(card.publishedAt) : ''} · GPA {card.gpa.toFixed(2)} · average {card.average}% ·
        position {card.overallPosition ? `${card.overallPosition}/${card.classSize}` : '—'}
      </p>
      <table className="data" style={{ marginTop: 10 }}>
        <thead><tr><th>Subject</th><th>Score</th><th>Grade</th><th>Position</th><th>Remark</th></tr></thead>
        <tbody>
          {card.lines.map((l) => (
            <tr key={l.subjectId}>
              <td><strong>{l.subjectName}</strong></td>
              <td>{l.weightedScore ?? '—'}{l.weightedScore !== null ? '%' : ''}</td>
              <td>{l.letter}</td>
              <td>{l.position ?? '—'}</td>
              <td style={{ fontSize: '0.82rem' }}>{l.remark}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {card.conduct && <p style={{ marginTop: 10, fontSize: '0.9rem' }}><strong>Conduct:</strong> {card.conduct}</p>}
      {card.headTeacherRemark && <p style={{ fontSize: '0.9rem' }}><strong>Head teacher:</strong> {card.headTeacherRemark}</p>}
    </Modal>
  )
}

export function TranscriptPanel({ studentId }: { studentId: string }) {
  const user = useCurrentUser()
  const data = useAsync(() => academicService.transcript(user, studentId), [studentId])
  return (
    <AsyncView data={data} onRetry={data.reload}>
      {(t) => (
        <Card>
          <CardHeader
            title={`${t.student.name} · ${t.student.number}`}
            action={<a className="btn btn-secondary btn-sm" href={`/api/students/${studentId}/transcript.pdf`} target="_blank" rel="noreferrer">Download PDF · GPA {t.cumulativeGpa.toFixed(2)}</a>}
          />
          <div className="card-body">
            {t.terms.length === 0 ? <EmptyState title="No academic history yet" /> : t.terms.map((term, i) => (
              <div key={i} style={{ borderBottom: '1px solid var(--border)', padding: '10px 0' }}>
                <p style={{ fontWeight: 600 }}>
                  {term.term} · {term.academicYear}
                  {term.gpa !== null && <span className="field-hint"> — GPA {term.gpa.toFixed(2)}, avg {term.average}%{term.position ? `, position ${term.position}` : ''}</span>}
                </p>
                <table className="data">
                  <tbody>
                    {term.subjects.map((s, j) => (
                      <tr key={j}><td>{s.subjectName}</td><td>{s.score ?? '—'}{s.score !== null ? '%' : ''}</td><td>{s.grade}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        </Card>
      )}
    </AsyncView>
  )
}
