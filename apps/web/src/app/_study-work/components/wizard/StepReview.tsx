import { Pencil } from 'lucide-react'
import type { Application } from '../../types'

interface StepReviewProps {
  application: Application
  onEdit: (stepIndex: number) => void
}

function ReviewSection({ title, stepIndex, onEdit, children }: { title: string; stepIndex: number; onEdit: (i: number) => void; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-gray-200 dark:border-gray-800 p-5 sm:p-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-black text-gray-900 dark:text-white">{title}</h3>
        <button type="button" onClick={() => onEdit(stepIndex)} className="flex items-center gap-1 text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline">
          <Pencil size={12} /> Edit
        </button>
      </div>
      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2.5">{children}</dl>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] font-bold uppercase tracking-wide text-gray-400 dark:text-gray-500">{label}</dt>
      <dd className="text-sm text-gray-800 dark:text-gray-200 truncate">{value || <span className="text-gray-300 dark:text-gray-600">—</span>}</dd>
    </div>
  )
}

export function StepReview({ application, onEdit }: StepReviewProps) {
  const { personal, travel } = application

  return (
    <div className="space-y-5">
      <ReviewSection title="Personal Information" stepIndex={0} onEdit={onEdit}>
        <Row label="Full name" value={[personal.legalFirstName, personal.middleName, personal.lastName].filter(Boolean).join(' ')} />
        <Row label="Date of birth" value={personal.dateOfBirth} />
        <Row label="Nationality" value={personal.nationality} />
        <Row label="Country of residence" value={personal.countryOfResidence} />
        <Row label="City" value={personal.city} />
        <Row label="Phone" value={personal.phone} />
        <Row label="Email" value={personal.email} />
        <Row label="Address" value={personal.address} />
        <Row label="Emergency contact" value={`${personal.emergencyContact.name}${personal.emergencyContact.relationship ? ` (${personal.emergencyContact.relationship})` : ''}`} />
      </ReviewSection>

      <ReviewSection title="Passport / Travel" stepIndex={0} onEdit={onEdit}>
        <Row label="Passport status" value={
          travel.passportStatus === 'HAVE_VALID' ? 'Valid passport' :
          travel.passportStatus === 'PROCESSING' ? 'Being processed' :
          travel.passportStatus === 'NONE' ? 'No passport yet' : ''
        } />
        {travel.passportStatus === 'HAVE_VALID' && <Row label="Passport number" value={travel.passportNumber} />}
      </ReviewSection>

      {application.type === 'study' ? (
        <>
          <ReviewSection title="Study Plans" stepIndex={1} onEdit={onEdit}>
            <Row label="Education level" value={application.study.educationLevel} />
            <Row label="Preferred field" value={application.study.preferredField} />
            <Row label="Preferred program" value={application.study.preferredProgram} />
            <Row label="Preferred institution" value={application.study.preferredInstitution} />
            <Row label="Preferred intake" value={application.study.preferredIntake} />
            <Row label="Budget" value={application.study.budget} />
          </ReviewSection>
          <ReviewSection title="Previous Education" stepIndex={2} onEdit={onEdit}>
            {application.study.previousEducation.length === 0 && <p className="text-sm text-gray-400 col-span-2">No records added.</p>}
            {application.study.previousEducation.map((r) => (
              <Row key={r.id} label={r.institution || 'Institution'} value={`${r.qualification}${r.fieldOfStudy ? ` — ${r.fieldOfStudy}` : ''}`} />
            ))}
          </ReviewSection>
        </>
      ) : (
        <>
          <ReviewSection title="Work Plans" stepIndex={1} onEdit={onEdit}>
            <Row label="Desired occupation" value={application.work.desiredOccupation} />
            <Row label="Industry" value={application.work.industry} />
            <Row label="Years of experience" value={application.work.yearsOfExperience} />
            <Row label="Education level" value={application.work.educationLevel} />
            <Row label="Employment type" value={application.work.preferredEmploymentType} />
            <Row label="Expected salary" value={application.work.expectedSalaryRange} />
          </ReviewSection>
          <ReviewSection title="Employment History" stepIndex={2} onEdit={onEdit}>
            {application.work.employmentHistory.length === 0 && <p className="text-sm text-gray-400 col-span-2">No records added.</p>}
            {application.work.employmentHistory.map((r) => (
              <Row key={r.id} label={r.company || 'Company'} value={r.jobTitle} />
            ))}
          </ReviewSection>
        </>
      )}
    </div>
  )
}
