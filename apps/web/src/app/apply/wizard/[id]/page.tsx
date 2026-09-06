'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowLeft, ArrowRight, Save } from 'lucide-react'
import { useStudyWork } from '../../../_study-work/state/StudyWorkContext'
import { Stepper } from '../../../_study-work/components/Stepper'
import { Button } from '../../../_study-work/components/FormControls'
import { LoadingState, ErrorState } from '../../../_study-work/components/EmptyState'
import { StepPersonal } from '../../../_study-work/components/wizard/StepPersonal'
import { StepApplicationDetails } from '../../../_study-work/components/wizard/StepApplicationDetails'
import { StepEducationWork } from '../../../_study-work/components/wizard/StepEducationWork'
import { StepReview } from '../../../_study-work/components/wizard/StepReview'
import { WIZARD_STEP_VALIDATORS } from '../../../_study-work/lib/wizardValidation'
import { getApplication } from '../../../_study-work/services/applicationService'
import type { Application } from '../../../_study-work/types'
import type { Errors } from '../../../_study-work/lib/validation'

const STEPS = [
  { number: '01', label: 'Personal' },
  { number: '02', label: 'Application' },
  { number: '03', label: 'Education/Work' },
  { number: '04', label: 'Review' },
  { number: '05', label: 'Submit' },
]

export default function ApplicationWizardPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const { loading, user, saveDraft, submitApplication } = useStudyWork()

  const [draft, setDraft] = useState<Application | null>(null)
  const [attemptedLoad, setAttemptedLoad] = useState(false)
  const [step, setStep] = useState(0) // 0..3 content steps (Review & Submit share step 3)
  const [errors, setErrors] = useState<Errors>({})
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (loading) return
    const app = getApplication(params.id)
    if (app) {
      setDraft(app)
      setStep(Math.min(app.draftStep, 3))
    }
    setAttemptedLoad(true)
  }, [loading, params.id])

  const stepperIndex = step === 3 ? 4 : step // "Review" content step visually sits at 04, but the last node (05 Submit) lights up once you're on that screen too

  const persist = useMemo(() => (next: Application) => saveDraft(next.id, next), [saveDraft])

  if (loading || !attemptedLoad) {
    return <CenteredMessage><LoadingState label="Loading your application…" /></CenteredMessage>
  }

  if (!user) {
    return (
      <CenteredMessage>
        <ErrorState title="Sign in required" body="Please sign in to continue this application." />
        <div className="text-center mt-4"><Link href="/login" className="text-sm font-bold text-blue-600 hover:underline">Go to sign in</Link></div>
      </CenteredMessage>
    )
  }

  if (!draft) {
    return (
      <CenteredMessage>
        <ErrorState title="Application not found" body="We couldn't find this application. It may have been removed." />
        <div className="text-center mt-4"><Link href="/apply/dashboard" className="text-sm font-bold text-blue-600 hover:underline">Back to dashboard</Link></div>
      </CenteredMessage>
    )
  }

  function updateDraft(patch: Partial<Application>) {
    setDraft((prev) => (prev ? { ...prev, ...patch } : prev))
  }

  function goTo(nextStep: number) {
    if (!draft) return
    persist({ ...draft, draftStep: nextStep })
    setStep(nextStep)
    setErrors({})
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function handleContinue() {
    if (!draft) return
    if (step < 2) {
      const validator = WIZARD_STEP_VALIDATORS[step]
      const stepErrors = validator(draft)
      setErrors(stepErrors)
      if (Object.keys(stepErrors).length > 0) return
    }
    goTo(Math.min(step + 1, 3))
  }

  function handleBack() {
    goTo(Math.max(step - 1, 0))
  }

  function handleSaveDraft() {
    if (!draft) return
    persist(draft)
  }

  function handleSubmit() {
    if (!draft) return
    persist(draft)
    setSubmitting(true)
    submitApplication(draft.id)
    router.push(`/apply/wizard/${draft.id}/submitted`)
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <header className="border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <Image src="/logo.svg" alt="" width={24} height={24} unoptimized />
            <span className="font-black text-sm text-gray-900 dark:text-white hidden sm:inline">beoneofus</span>
          </Link>
          <p className="text-xs font-bold text-gray-500 dark:text-gray-400 text-right">
            {draft.type === 'study' ? 'Study Abroad' : 'Work Abroad'} Application · {draft.applicationNumber}
          </p>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
        <div className="mb-8">
          <Stepper steps={STEPS} currentIndex={stepperIndex} />
        </div>

        {step === 0 && <StepPersonal application={draft} onChange={updateDraft} errors={errors} />}
        {step === 1 && <StepApplicationDetails application={draft} onChange={updateDraft} errors={errors} />}
        {step === 2 && <StepEducationWork application={draft} onChange={updateDraft} />}
        {step === 3 && <StepReview application={draft} onEdit={(i) => goTo(i)} />}

        <div className="flex items-center justify-between gap-3 mt-8 pt-6 border-t border-gray-200 dark:border-gray-800">
          <Button type="button" variant="ghost" onClick={handleBack} disabled={step === 0}>
            <ArrowLeft size={15} /> Back
          </Button>
          <div className="flex items-center gap-2">
            <Button type="button" variant="secondary" onClick={handleSaveDraft}>
              <Save size={15} /> Save Draft
            </Button>
            {step < 3 ? (
              <Button type="button" onClick={handleContinue}>
                Continue <ArrowRight size={15} />
              </Button>
            ) : (
              <Button type="button" onClick={() => setConfirmOpen(true)} disabled={submitting}>
                Submit Application <ArrowRight size={15} />
              </Button>
            )}
          </div>
        </div>
      </main>

      {confirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="confirm-title">
          <div className="absolute inset-0 bg-black/50" onClick={() => setConfirmOpen(false)} />
          <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-sm w-full p-6">
            <h2 id="confirm-title" className="font-black text-lg text-gray-900 dark:text-white mb-2">Submit your application?</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
              Once submitted, your application will be reviewed by the BeOneOfUs team.
            </p>
            <div className="flex items-center justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setConfirmOpen(false)}>Cancel</Button>
              <Button type="button" onClick={handleSubmit}>Yes, Submit</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function CenteredMessage({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-950 px-4">{children}</div>
}
