import { WizardSection } from './WizardSection'
import { Field, TextInput, TextArea, Select } from '../FormControls'
import type { Application, EducationLevel, EmploymentType, StudyDetails, WorkDetails } from '../../types'
import type { Errors } from '../../lib/validation'

interface StepProps {
  application: Application
  onChange: (patch: Partial<Application>) => void
  errors: Errors
}

const EDUCATION_LEVELS: EducationLevel[] = ['Certificate', 'Diploma', "Bachelor's", "Master's", 'PhD', 'Short Course', 'Other']
const EMPLOYMENT_TYPES: EmploymentType[] = ['Full-time', 'Part-time', 'Contract', 'Seasonal', 'Internship']

export function StepApplicationDetails({ application, onChange, errors }: StepProps) {
  function updateStudy(patch: Partial<StudyDetails>) {
    onChange({ study: { ...application.study, ...patch } })
  }
  function updateWork(patch: Partial<WorkDetails>) {
    onChange({ work: { ...application.work, ...patch } })
  }

  if (application.type === 'study') {
    const s = application.study
    return (
      <div className="space-y-5">
        <WizardSection title="Your Study Plans">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Education level" htmlFor="s-level" required error={errors['study.educationLevel']}>
              <Select id="s-level" value={s.educationLevel} onChange={(e) => updateStudy({ educationLevel: e.target.value as EducationLevel })} error={errors['study.educationLevel']}>
                <option value="">Select…</option>
                {EDUCATION_LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
              </Select>
            </Field>
            <Field label="Preferred field of study" htmlFor="s-field" required error={errors['study.preferredField']}>
              <TextInput id="s-field" value={s.preferredField} onChange={(e) => updateStudy({ preferredField: e.target.value })} error={errors['study.preferredField']} />
            </Field>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Preferred program" htmlFor="s-program">
              <TextInput id="s-program" value={s.preferredProgram} onChange={(e) => updateStudy({ preferredProgram: e.target.value })} />
            </Field>
            <Field label="Preferred institution" htmlFor="s-institution">
              <TextInput id="s-institution" value={s.preferredInstitution} onChange={(e) => updateStudy({ preferredInstitution: e.target.value })} />
            </Field>
          </div>
          <Field label="Preferred intake" htmlFor="s-intake" hint="e.g. September 2027">
            <TextInput id="s-intake" value={s.preferredIntake} onChange={(e) => updateStudy({ preferredIntake: e.target.value })} />
          </Field>
        </WizardSection>

        <WizardSection title="Additional Questions">
          <Field label="Why do you want to study abroad?" htmlFor="s-motivation" required error={errors['study.motivation']}>
            <TextArea id="s-motivation" value={s.motivation} onChange={(e) => updateStudy({ motivation: e.target.value })} error={errors['study.motivation']} />
          </Field>
          <Field label="Career goals" htmlFor="s-goals">
            <TextArea id="s-goals" value={s.careerGoals} onChange={(e) => updateStudy({ careerGoals: e.target.value })} />
          </Field>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Preferred study location" htmlFor="s-location">
              <TextInput id="s-location" value={s.preferredLocation} onChange={(e) => updateStudy({ preferredLocation: e.target.value })} />
            </Field>
            <Field label="Budget" htmlFor="s-budget" hint="Estimated annual budget">
              <TextInput id="s-budget" value={s.budget} onChange={(e) => updateStudy({ budget: e.target.value })} />
            </Field>
          </div>
          <Field label="Language abilities" htmlFor="s-languages">
            <TextInput id="s-languages" value={s.languages} onChange={(e) => updateStudy({ languages: e.target.value })} />
          </Field>
        </WizardSection>
      </div>
    )
  }

  const w = application.work
  return (
    <div className="space-y-5">
      <WizardSection title="Your Work Plans">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Desired job / occupation" htmlFor="w-occupation" required error={errors['work.desiredOccupation']}>
            <TextInput id="w-occupation" value={w.desiredOccupation} onChange={(e) => updateWork({ desiredOccupation: e.target.value })} error={errors['work.desiredOccupation']} />
          </Field>
          <Field label="Industry" htmlFor="w-industry" required error={errors['work.industry']}>
            <TextInput id="w-industry" value={w.industry} onChange={(e) => updateWork({ industry: e.target.value })} error={errors['work.industry']} />
          </Field>
        </div>
        <Field label="Skills" htmlFor="w-skills" hint="Comma-separated list">
          <TextArea id="w-skills" value={w.skills} onChange={(e) => updateWork({ skills: e.target.value })} />
        </Field>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Years of experience" htmlFor="w-years" required error={errors['work.yearsOfExperience']}>
            <TextInput id="w-years" inputMode="numeric" value={w.yearsOfExperience} onChange={(e) => updateWork({ yearsOfExperience: e.target.value })} error={errors['work.yearsOfExperience']} />
          </Field>
          <Field label="Education level" htmlFor="w-level" required error={errors['work.educationLevel']}>
            <Select id="w-level" value={w.educationLevel} onChange={(e) => updateWork({ educationLevel: e.target.value as EducationLevel })} error={errors['work.educationLevel']}>
              <option value="">Select…</option>
              {EDUCATION_LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
            </Select>
          </Field>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Preferred employment type" htmlFor="w-type">
            <Select id="w-type" value={w.preferredEmploymentType} onChange={(e) => updateWork({ preferredEmploymentType: e.target.value as EmploymentType })}>
              <option value="">Select…</option>
              {EMPLOYMENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </Select>
          </Field>
          <Field label="Expected salary range" htmlFor="w-salary">
            <TextInput id="w-salary" value={w.expectedSalaryRange} onChange={(e) => updateWork({ expectedSalaryRange: e.target.value })} />
          </Field>
        </div>
        <Field label="Preferred location" htmlFor="w-location">
          <TextInput id="w-location" value={w.preferredLocation} onChange={(e) => updateWork({ preferredLocation: e.target.value })} />
        </Field>
      </WizardSection>
    </div>
  )
}
