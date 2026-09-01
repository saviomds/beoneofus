import { useEffect, useMemo, useState } from 'react'
import { useCurrentUser } from '@/context/AuthContext'
import { useAsync } from '@/hooks/useAsync'
import { academicService } from '@/services/academicService'
import { directoryService } from '@/services/directoryService'
import { teacherService } from '@/services/teacherService'
import type { AssessmentInput } from '@/services/academicService'
import {
  AsyncView, Button, Card, Field, PageHeader, Select, TextInput, useToast,
} from '@/components/ui'
import type { AssessmentScheme, ClassRecord, Id, Student, Subject } from '@shared/types'

export function Gradebook() {
  const user = useCurrentUser()
  const toast = useToast()
  const classes = useAsync(() => directoryService.classes(user).catch(() => [] as ClassRecord[]), [user.id])
  const subjects = useAsync(() => directoryService.subjects(user).catch(() => [] as Subject[]), [user.id])
  const schemes = useAsync(() => academicService.schemes(user).catch(() => [] as AssessmentScheme[]), [user.id])

  const [classId, setClassId] = useState('')
  const [subjectId, setSubjectId] = useState('')
  const [term, setTerm] = useState('Term 2 2026')
  const [year, setYear] = useState('2026')
  const [component, setComponent] = useState('')
  const [title, setTitle] = useState('')
  const [maxScore, setMaxScore] = useState(100)
  const [marks, setMarks] = useState<Record<Id, string>>({})

  const cls = (classes.data ?? []).find((c) => c.id === classId)
  const scheme = (schemes.data ?? []).find((s) => cls && s.level === cls.level && s.isDefault)
    ?? (schemes.data ?? []).find((s) => cls && s.level === cls.level)
  const components = useMemo(
    () => scheme?.components ?? [{ key: 'overall', label: 'Overall', weight: 100 }],
    [scheme],
  )
  const roster = useAsync(() => (classId ? teacherService.roster(user, classId) : Promise.resolve([] as Student[])), [classId])

  useEffect(() => {
    if (components.length && !components.some((c) => c.key === component)) setComponent(components[0].key)
  }, [components, component])

  const save = async () => {
    const entries: AssessmentInput[] = Object.entries(marks)
      .filter(([, v]) => v !== '' && Number.isFinite(Number(v)))
      .map(([studentId, v]) => ({
        studentId, subjectId, subjectName: (subjects.data ?? []).find((s) => s.id === subjectId)?.name ?? '',
        classId, academicYear: year, term, componentKey: component, title: title || component,
        score: Number(v), maxScore,
      }))
    if (!entries.length) { toast.push('Enter at least one mark', 'error'); return }
    try {
      const r = await academicService.bulkRecordAssessments(user, entries)
      toast.push(`${r.saved} marks saved`, 'success')
      setMarks({})
    } catch (err) {
      toast.push(err instanceof Error ? err.message : 'Could not save', 'error')
    }
  }

  return (
    <div className="section-stack">
      <PageHeader title="Gradebook" description="Enter weighted assessment marks. Report cards combine components using the class's grading scheme." />
      <Card>
        <div className="card-body">
          <div className="form-grid">
            <Field label="Class">
              <Select value={classId} onChange={(e) => { setClassId(e.target.value); setSubjectId('') }}>
                <option value="">Select…</option>
                {(classes.data ?? []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
            </Field>
            <Field label="Subject">
              <Select value={subjectId} onChange={(e) => setSubjectId(e.target.value)} disabled={!classId}>
                <option value="">Select…</option>
                {(subjects.data ?? []).filter((s) => !cls || !cls.subjectIds.length || cls.subjectIds.includes(s.id)).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </Select>
            </Field>
            <Field label="Component">
              <Select value={component} onChange={(e) => setComponent(e.target.value)}>
                {components.map((c) => <option key={c.key} value={c.key}>{c.label} ({c.weight}%)</option>)}
              </Select>
            </Field>
            <Field label="Assessment title"><TextInput value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Mid-term" /></Field>
            <Field label="Term"><TextInput value={term} onChange={(e) => setTerm(e.target.value)} /></Field>
            <Field label="Year"><TextInput value={year} onChange={(e) => setYear(e.target.value)} /></Field>
            <Field label="Max score"><TextInput type="number" value={String(maxScore)} onChange={(e) => setMaxScore(Number(e.target.value) || 100)} /></Field>
          </div>
          {scheme ? <p className="field-hint">Scheme: {scheme.name}</p> : classId && <p className="field-hint">No grading scheme for this level — marks record as a single component.</p>}
        </div>
      </Card>

      {classId && subjectId && (
        <AsyncView data={roster}>
          {(students) => (
            <Card>
              <div className="card-body">
                <table className="data">
                  <thead><tr><th>Student</th><th>Mark (/{maxScore})</th></tr></thead>
                  <tbody>
                    {students.map((s) => (
                      <tr key={s.id}>
                        <td>{s.firstName} {s.lastName}</td>
                        <td>
                          <input
                            className="input"
                            style={{ width: 100 }}
                            type="number"
                            value={marks[s.id] ?? ''}
                            onChange={(e) => setMarks((m) => ({ ...m, [s.id]: e.target.value }))}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <Button variant="primary" style={{ marginTop: 12 }} onClick={save}>Save marks</Button>
              </div>
            </Card>
          )}
        </AsyncView>
      )}
    </div>
  )
}
