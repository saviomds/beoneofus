'use client'

import { useEffect, useState } from 'react'
import { CheckCircle2 } from 'lucide-react'
import { useApplicationDetailScope } from '../../../../../_study-work/state/ApplicationDetailScope'
import { useStudyWork } from '../../../../../_study-work/state/StudyWorkContext'
import { StepApplicationDetails } from '../../../../../_study-work/components/wizard/StepApplicationDetails'
import { StepEducationWork } from '../../../../../_study-work/components/wizard/StepEducationWork'
import { Button } from '../../../../../_study-work/components/FormControls'
import { validateApplicationDetailsStep } from '../../../../../_study-work/lib/wizardValidation'
import type { Application } from '../../../../../_study-work/types'
import type { Errors } from '../../../../../_study-work/lib/validation'

export default function EducationEmploymentTab() {
  const { application, refresh } = useApplicationDetailScope()
  const { saveDraft } = useStudyWork()
  const [draft, setDraft] = useState<Application | null>(application)
  const [errors, setErrors] = useState<Errors>({})
  const [saved, setSaved] = useState(false)

  useEffect(() => { setDraft(application) }, [application])

  if (!draft) return null

  function updateDraft(patch: Partial<Application>) {
    setDraft((prev) => (prev ? { ...prev, ...patch } : prev))
    setSaved(false)
  }

  function handleSave() {
    if (!draft) return
    const stepErrors = validateApplicationDetailsStep(draft)
    setErrors(stepErrors)
    if (Object.keys(stepErrors).length > 0) return
    saveDraft(draft.id, draft)
    refresh()
    setSaved(true)
  }

  return (
    <div className="space-y-5">
      <StepApplicationDetails application={draft} onChange={updateDraft} errors={errors} />
      <StepEducationWork application={draft} onChange={updateDraft} />
      <div className="flex items-center gap-3">
        <Button type="button" onClick={handleSave}>Save Changes</Button>
        {saved && <span className="flex items-center gap-1.5 text-sm font-semibold text-emerald-600 dark:text-emerald-400"><CheckCircle2 size={15} /> Saved</span>}
      </div>
    </div>
  )
}
