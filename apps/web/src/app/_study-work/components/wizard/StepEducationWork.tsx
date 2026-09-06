import { Plus, Trash2 } from 'lucide-react'
import { WizardSection } from './WizardSection'
import { Field, TextInput, DateInput, TextArea, Button } from '../FormControls'
import type { Application, Certification, EducationRecord, EmploymentRecord } from '../../types'

interface StepProps {
  application: Application
  onChange: (patch: Partial<Application>) => void
}

function localId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`
}

export function StepEducationWork({ application, onChange }: StepProps) {
  if (application.type === 'study') {
    const records = application.study.previousEducation

    function updateRecords(next: EducationRecord[]) {
      onChange({ study: { ...application.study, previousEducation: next } })
    }
    function addRecord() {
      updateRecords([...records, { id: localId('edu'), institution: '', qualification: '', fieldOfStudy: '', startDate: '', endDate: '', grade: '', country: '' }])
    }
    function updateRecord(id: string, patch: Partial<EducationRecord>) {
      updateRecords(records.map((r) => (r.id === id ? { ...r, ...patch } : r)))
    }
    function removeRecord(id: string) {
      updateRecords(records.filter((r) => r.id !== id))
    }

    return (
      <div className="space-y-5">
        <WizardSection title="Previous Education" description="Add every institution you have attended, most recent first.">
          <div className="space-y-4">
            {records.map((r, i) => (
              <div key={r.id} className="rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-wide">Record {i + 1}</p>
                  <button type="button" onClick={() => removeRecord(r.id)} className="text-rose-500 hover:text-rose-700 dark:hover:text-rose-400" aria-label="Remove record">
                    <Trash2 size={15} />
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field label="Institution" htmlFor={`edu-inst-${r.id}`}><TextInput id={`edu-inst-${r.id}`} value={r.institution} onChange={(e) => updateRecord(r.id, { institution: e.target.value })} /></Field>
                  <Field label="Qualification" htmlFor={`edu-qual-${r.id}`}><TextInput id={`edu-qual-${r.id}`} value={r.qualification} onChange={(e) => updateRecord(r.id, { qualification: e.target.value })} /></Field>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field label="Field of study" htmlFor={`edu-field-${r.id}`}><TextInput id={`edu-field-${r.id}`} value={r.fieldOfStudy} onChange={(e) => updateRecord(r.id, { fieldOfStudy: e.target.value })} /></Field>
                  <Field label="Country" htmlFor={`edu-country-${r.id}`}><TextInput id={`edu-country-${r.id}`} value={r.country} onChange={(e) => updateRecord(r.id, { country: e.target.value })} /></Field>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <Field label="Start date" htmlFor={`edu-start-${r.id}`}><DateInput id={`edu-start-${r.id}`} value={r.startDate} onChange={(e) => updateRecord(r.id, { startDate: e.target.value })} /></Field>
                  <Field label="End date" htmlFor={`edu-end-${r.id}`}><DateInput id={`edu-end-${r.id}`} value={r.endDate} onChange={(e) => updateRecord(r.id, { endDate: e.target.value })} /></Field>
                  <Field label="Grade / GPA" htmlFor={`edu-grade-${r.id}`}><TextInput id={`edu-grade-${r.id}`} value={r.grade} onChange={(e) => updateRecord(r.id, { grade: e.target.value })} /></Field>
                </div>
              </div>
            ))}
          </div>
          <Button type="button" variant="secondary" onClick={addRecord} className="mt-1">
            <Plus size={15} /> Add education record
          </Button>
        </WizardSection>
      </div>
    )
  }

  const employment = application.work.employmentHistory
  const certifications = application.work.certifications

  function updateEmployment(next: EmploymentRecord[]) {
    onChange({ work: { ...application.work, employmentHistory: next } })
  }
  function addEmployment() {
    updateEmployment([...employment, { id: localId('emp'), company: '', jobTitle: '', country: '', startDate: '', endDate: '', responsibilities: '' }])
  }
  function updateEmploymentRecord(id: string, patch: Partial<EmploymentRecord>) {
    updateEmployment(employment.map((r) => (r.id === id ? { ...r, ...patch } : r)))
  }
  function removeEmployment(id: string) {
    updateEmployment(employment.filter((r) => r.id !== id))
  }

  function updateCertifications(next: Certification[]) {
    onChange({ work: { ...application.work, certifications: next } })
  }
  function addCertification() {
    updateCertifications([...certifications, { id: localId('cert'), name: '', issuingOrganization: '', date: '', expiryDate: '' }])
  }
  function updateCertification(id: string, patch: Partial<Certification>) {
    updateCertifications(certifications.map((c) => (c.id === id ? { ...c, ...patch } : c)))
  }
  function removeCertification(id: string) {
    updateCertifications(certifications.filter((c) => c.id !== id))
  }

  return (
    <div className="space-y-5">
      <WizardSection title="Employment History" description="Add your previous roles, most recent first.">
        <div className="space-y-4">
          {employment.map((r, i) => (
            <div key={r.id} className="rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-wide">Role {i + 1}</p>
                <button type="button" onClick={() => removeEmployment(r.id)} className="text-rose-500 hover:text-rose-700 dark:hover:text-rose-400" aria-label="Remove role">
                  <Trash2 size={15} />
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Company" htmlFor={`emp-co-${r.id}`}><TextInput id={`emp-co-${r.id}`} value={r.company} onChange={(e) => updateEmploymentRecord(r.id, { company: e.target.value })} /></Field>
                <Field label="Job title" htmlFor={`emp-title-${r.id}`}><TextInput id={`emp-title-${r.id}`} value={r.jobTitle} onChange={(e) => updateEmploymentRecord(r.id, { jobTitle: e.target.value })} /></Field>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Field label="Country" htmlFor={`emp-country-${r.id}`}><TextInput id={`emp-country-${r.id}`} value={r.country} onChange={(e) => updateEmploymentRecord(r.id, { country: e.target.value })} /></Field>
                <Field label="Start date" htmlFor={`emp-start-${r.id}`}><DateInput id={`emp-start-${r.id}`} value={r.startDate} onChange={(e) => updateEmploymentRecord(r.id, { startDate: e.target.value })} /></Field>
                <Field label="End date" htmlFor={`emp-end-${r.id}`} hint="Leave blank if current"><DateInput id={`emp-end-${r.id}`} value={r.endDate} onChange={(e) => updateEmploymentRecord(r.id, { endDate: e.target.value })} /></Field>
              </div>
              <Field label="Responsibilities" htmlFor={`emp-resp-${r.id}`}><TextArea id={`emp-resp-${r.id}`} value={r.responsibilities} onChange={(e) => updateEmploymentRecord(r.id, { responsibilities: e.target.value })} /></Field>
            </div>
          ))}
        </div>
        <Button type="button" variant="secondary" onClick={addEmployment} className="mt-1">
          <Plus size={15} /> Add employment record
        </Button>
      </WizardSection>

      <WizardSection title="Professional Certifications" description="Optional — add any relevant certifications.">
        <div className="space-y-4">
          {certifications.map((c, i) => (
            <div key={c.id} className="rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-wide">Certification {i + 1}</p>
                <button type="button" onClick={() => removeCertification(c.id)} className="text-rose-500 hover:text-rose-700 dark:hover:text-rose-400" aria-label="Remove certification">
                  <Trash2 size={15} />
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Certification" htmlFor={`cert-name-${c.id}`}><TextInput id={`cert-name-${c.id}`} value={c.name} onChange={(e) => updateCertification(c.id, { name: e.target.value })} /></Field>
                <Field label="Issuing organization" htmlFor={`cert-org-${c.id}`}><TextInput id={`cert-org-${c.id}`} value={c.issuingOrganization} onChange={(e) => updateCertification(c.id, { issuingOrganization: e.target.value })} /></Field>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Date" htmlFor={`cert-date-${c.id}`}><DateInput id={`cert-date-${c.id}`} value={c.date} onChange={(e) => updateCertification(c.id, { date: e.target.value })} /></Field>
                <Field label="Expiry date" htmlFor={`cert-exp-${c.id}`} hint="If applicable"><DateInput id={`cert-exp-${c.id}`} value={c.expiryDate} onChange={(e) => updateCertification(c.id, { expiryDate: e.target.value })} /></Field>
              </div>
            </div>
          ))}
        </div>
        <Button type="button" variant="secondary" onClick={addCertification} className="mt-1">
          <Plus size={15} /> Add certification
        </Button>
      </WizardSection>
    </div>
  )
}
