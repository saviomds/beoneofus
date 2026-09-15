'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { PublicHeader } from '../../_study-work/components/PublicHeader'
import { PublicFooter } from '../../_study-work/components/PublicFooter'
import { Field, TextInput, PhoneInput, DateInput, Checkbox, Button } from '../../_study-work/components/FormControls'
import { LoadingState } from '../../_study-work/components/EmptyState'
import { useStudyWork } from '../../_study-work/state/StudyWorkContext'
import { isBlank, isValidPhone, isAdult, REQUIRED_MESSAGE, type Errors } from '../../_study-work/lib/validation'
import type { ApplicationType } from '../../_study-work/types'

// Shown right after real sign-in (see /apply/page.tsx), once per account — it
// collects only what the base beoneofus account doesn't already have
// (nationality, country of residence, date of birth, phone, and name if the
// account only carries a username). There is no separate identity system
// here: applying always means being signed in with a real account.
export default function ApplyDetailsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const type = (searchParams.get('type') as ApplicationType) || 'study'
  const { loading, user, hasApplicantProfile, saveApplicantDetails, createApplication } = useStudyWork()

  const [firstName, setFirstName] = useState('')
  const [middleName, setMiddleName] = useState('')
  const [lastName, setLastName] = useState('')
  const [phone, setPhone] = useState('')
  const [nationality, setNationality] = useState('')
  const [countryOfResidence, setCountryOfResidence] = useState('')
  const [dateOfBirth, setDateOfBirth] = useState('')
  const [agreeTerms, setAgreeTerms] = useState(false)
  const [agreePrivacy, setAgreePrivacy] = useState(false)
  const [agreeProcessing, setAgreeProcessing] = useState(false)
  const [errors, setErrors] = useState<Errors>({})
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const prefilledRef = useRef(false)

  useEffect(() => {
    if (user && !prefilledRef.current) {
      prefilledRef.current = true
      setFirstName(user.firstName)
      setMiddleName(user.middleName)
      setLastName(user.lastName)
      setPhone(user.phone)
      setNationality(user.nationality)
      setCountryOfResidence(user.countryOfResidence)
      setDateOfBirth(user.dateOfBirth)
    }
  }, [user])

  useEffect(() => {
    if (!loading && !user) {
      router.replace(`/auth?mode=sign-up&next=${encodeURIComponent(`/apply/details?type=${type}`)}`)
    }
  }, [loading, user, type, router])

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-950 flex flex-col">
        <PublicHeader />
        <main className="flex-1 flex items-center justify-center"><LoadingState label="Checking your account…" /></main>
        <PublicFooter />
      </div>
    )
  }

  function validate(): Errors {
    const next: Errors = {}
    if (isBlank(firstName)) next.firstName = REQUIRED_MESSAGE
    if (isBlank(lastName)) next.lastName = REQUIRED_MESSAGE
    if (!isValidPhone(phone)) next.phone = 'Enter a valid phone number.'
    if (isBlank(nationality)) next.nationality = REQUIRED_MESSAGE
    if (isBlank(countryOfResidence)) next.countryOfResidence = REQUIRED_MESSAGE
    if (!isAdult(dateOfBirth)) next.dateOfBirth = 'You must be at least 16 years old to apply.'
    if (!hasApplicantProfile) {
      if (!agreeTerms) next.agreeTerms = 'You must agree to the Terms & Conditions.'
      if (!agreePrivacy) next.agreePrivacy = 'You must agree to the Privacy Policy.'
      if (!agreeProcessing) next.agreeProcessing = 'Consent is required to process your application.'
    }
    return next
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    const next = validate()
    setErrors(next)
    if (Object.keys(next).length > 0) return

    setSubmitting(true)
    setSubmitError('')
    try {
      await saveApplicantDetails({ firstName, middleName, lastName, phone, nationality, countryOfResidence, dateOfBirth })
      const application = await createApplication(type)
      router.push(`/apply/wizard/${application.id}`)
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 flex flex-col">
      <PublicHeader />

      <main className="flex-1 max-w-xl mx-auto px-4 sm:px-6 py-14 w-full">
        <h1 className="text-3xl font-black tracking-tight text-gray-900 dark:text-white mb-2">A few more details</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">
          Applying for <strong className="text-gray-700 dark:text-gray-200">{type === 'study' ? 'Study Abroad' : 'Work Abroad'}</strong> as {user.email}.
        </p>

        <form onSubmit={onSubmit} className="space-y-5" noValidate>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Field label="First name" htmlFor="d-first" required error={errors.firstName}>
              <TextInput id="d-first" value={firstName} onChange={(e) => setFirstName(e.target.value)} error={errors.firstName} autoComplete="given-name" />
            </Field>
            <Field label="Middle name" htmlFor="d-middle">
              <TextInput id="d-middle" value={middleName} onChange={(e) => setMiddleName(e.target.value)} autoComplete="additional-name" />
            </Field>
            <Field label="Last name" htmlFor="d-last" required error={errors.lastName}>
              <TextInput id="d-last" value={lastName} onChange={(e) => setLastName(e.target.value)} error={errors.lastName} autoComplete="family-name" />
            </Field>
          </div>

          <Field label="Phone number" htmlFor="d-phone" required error={errors.phone}>
            <PhoneInput id="d-phone" value={phone} onChange={(e) => setPhone(e.target.value)} error={errors.phone} autoComplete="tel" />
          </Field>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Nationality" htmlFor="d-nat" required error={errors.nationality}>
              <TextInput id="d-nat" value={nationality} onChange={(e) => setNationality(e.target.value)} error={errors.nationality} />
            </Field>
            <Field label="Country of residence" htmlFor="d-cor" required error={errors.countryOfResidence}>
              <TextInput id="d-cor" value={countryOfResidence} onChange={(e) => setCountryOfResidence(e.target.value)} error={errors.countryOfResidence} />
            </Field>
          </div>

          <Field label="Date of birth" htmlFor="d-dob" required error={errors.dateOfBirth}>
            <DateInput id="d-dob" value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} error={errors.dateOfBirth} max={new Date().toISOString().slice(0, 10)} />
          </Field>

          {!hasApplicantProfile && (
            <div className="space-y-3 pt-2 border-t border-gray-100 dark:border-gray-800">
              <Checkbox id="d-terms" checked={agreeTerms} onChange={(e) => setAgreeTerms(e.target.checked)} error={errors.agreeTerms}
                label={<>I agree to the <Link href="/terms" target="_blank" className="text-blue-600 dark:text-blue-400 hover:underline">Terms &amp; Conditions</Link>.</>} />
              <Checkbox id="d-privacy" checked={agreePrivacy} onChange={(e) => setAgreePrivacy(e.target.checked)} error={errors.agreePrivacy}
                label={<>I agree to the <Link href="/privacy" target="_blank" className="text-blue-600 dark:text-blue-400 hover:underline">Privacy Policy</Link>.</>} />
              <Checkbox id="d-processing" checked={agreeProcessing} onChange={(e) => setAgreeProcessing(e.target.checked)} error={errors.agreeProcessing}
                label="I consent to the processing of information required for my application." />
            </div>
          )}

          {submitError && (
            <p className="text-sm font-semibold text-rose-600 dark:text-rose-400">{submitError}</p>
          )}

          <Button type="submit" disabled={submitting} className="w-full">
            {submitting ? 'Saving…' : 'Continue'}
          </Button>
        </form>
      </main>

      <PublicFooter />
    </div>
  )
}
