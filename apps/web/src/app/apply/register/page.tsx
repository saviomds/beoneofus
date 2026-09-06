'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { PublicHeader } from '../../_study-work/components/PublicHeader'
import { PublicFooter } from '../../_study-work/components/PublicFooter'
import { Field, TextInput, PhoneInput, DateInput, Checkbox, Button } from '../../_study-work/components/FormControls'
import { LoadingState } from '../../_study-work/components/EmptyState'
import { useStudyWork } from '../../_study-work/state/StudyWorkContext'
import { isBlank, isValidEmail, isValidPhone, isAdult, REQUIRED_MESSAGE, type Errors } from '../../_study-work/lib/validation'
import type { ApplicationType } from '../../_study-work/types'

export default function ApplyRegisterPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const type = (searchParams.get('type') as ApplicationType) || 'study'
  const { loading, user, register, createApplication } = useStudyWork()

  const [firstName, setFirstName] = useState('')
  const [middleName, setMiddleName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [nationality, setNationality] = useState('')
  const [countryOfResidence, setCountryOfResidence] = useState('')
  const [dateOfBirth, setDateOfBirth] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [agreeTerms, setAgreeTerms] = useState(false)
  const [agreePrivacy, setAgreePrivacy] = useState(false)
  const [agreeProcessing, setAgreeProcessing] = useState(false)
  const [errors, setErrors] = useState<Errors>({})
  const [submitting, setSubmitting] = useState(false)
  // Registering sets `user` too — without this, the "already signed in"
  // guard below fires right after a fresh signup and redirects away from
  // the wizard navigation `onSubmit` just triggered.
  const justRegisteredRef = useRef(false)

  // Already signed in — reuse that account, skip registration entirely.
  useEffect(() => {
    if (!loading && user && !justRegisteredRef.current) {
      router.replace(`/apply?type=${type}`)
    }
  }, [loading, user, type, router])

  if (loading || user) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-950 flex flex-col">
        <PublicHeader />
        <main className="flex-1 flex items-center justify-center"><LoadingState label={user ? 'Continuing with your account…' : 'Checking your account…'} /></main>
        <PublicFooter />
      </div>
    )
  }

  function validate(): Errors {
    const next: Errors = {}
    if (isBlank(firstName)) next.firstName = REQUIRED_MESSAGE
    if (isBlank(lastName)) next.lastName = REQUIRED_MESSAGE
    if (!isValidEmail(email)) next.email = 'Enter a valid email address.'
    if (!isValidPhone(phone)) next.phone = 'Enter a valid phone number.'
    if (isBlank(nationality)) next.nationality = REQUIRED_MESSAGE
    if (isBlank(countryOfResidence)) next.countryOfResidence = REQUIRED_MESSAGE
    if (!isAdult(dateOfBirth)) next.dateOfBirth = 'You must be at least 16 years old to apply.'
    if (password.length < 8) next.password = 'Use at least 8 characters.'
    if (confirmPassword !== password) next.confirmPassword = 'Passwords do not match.'
    if (!agreeTerms) next.agreeTerms = 'You must agree to the Terms & Conditions.'
    if (!agreePrivacy) next.agreePrivacy = 'You must agree to the Privacy Policy.'
    if (!agreeProcessing) next.agreeProcessing = 'Consent is required to process your application.'
    return next
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    const next = validate()
    setErrors(next)
    if (Object.keys(next).length > 0) return

    setSubmitting(true)
    try {
      justRegisteredRef.current = true
      const registered = await register({
        firstName, middleName, lastName, email, phone,
        nationality, countryOfResidence, dateOfBirth, password,
      })
      const application = createApplication(type, registered)
      router.push(`/apply/wizard/${application.id}`)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 flex flex-col">
      <PublicHeader />

      <main className="flex-1 max-w-xl mx-auto px-4 sm:px-6 py-14 w-full">
        <h1 className="text-3xl font-black tracking-tight text-gray-900 dark:text-white mb-2">Create your account</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">
          Applying for <strong className="text-gray-700 dark:text-gray-200">{type === 'study' ? 'Study Abroad' : 'Work Abroad'}</strong>.
          Already have an account? <Link href={`/login?next=/apply?type=${type}`} className="font-bold text-blue-600 dark:text-blue-400 hover:underline">Sign in instead</Link>.
        </p>

        <form onSubmit={onSubmit} className="space-y-5" noValidate>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Field label="First name" htmlFor="r-first" required error={errors.firstName}>
              <TextInput id="r-first" value={firstName} onChange={(e) => setFirstName(e.target.value)} error={errors.firstName} autoComplete="given-name" />
            </Field>
            <Field label="Middle name" htmlFor="r-middle">
              <TextInput id="r-middle" value={middleName} onChange={(e) => setMiddleName(e.target.value)} autoComplete="additional-name" />
            </Field>
            <Field label="Last name" htmlFor="r-last" required error={errors.lastName}>
              <TextInput id="r-last" value={lastName} onChange={(e) => setLastName(e.target.value)} error={errors.lastName} autoComplete="family-name" />
            </Field>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Email" htmlFor="r-email" required error={errors.email}>
              <TextInput id="r-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} error={errors.email} autoComplete="email" />
            </Field>
            <Field label="Phone number" htmlFor="r-phone" required error={errors.phone}>
              <PhoneInput id="r-phone" value={phone} onChange={(e) => setPhone(e.target.value)} error={errors.phone} autoComplete="tel" />
            </Field>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Nationality" htmlFor="r-nat" required error={errors.nationality}>
              <TextInput id="r-nat" value={nationality} onChange={(e) => setNationality(e.target.value)} error={errors.nationality} />
            </Field>
            <Field label="Country of residence" htmlFor="r-cor" required error={errors.countryOfResidence}>
              <TextInput id="r-cor" value={countryOfResidence} onChange={(e) => setCountryOfResidence(e.target.value)} error={errors.countryOfResidence} />
            </Field>
          </div>

          <Field label="Date of birth" htmlFor="r-dob" required error={errors.dateOfBirth}>
            <DateInput id="r-dob" value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} error={errors.dateOfBirth} max={new Date().toISOString().slice(0, 10)} />
          </Field>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Password" htmlFor="r-pass" required error={errors.password}>
              <TextInput id="r-pass" type="password" value={password} onChange={(e) => setPassword(e.target.value)} error={errors.password} autoComplete="new-password" />
            </Field>
            <Field label="Confirm password" htmlFor="r-pass2" required error={errors.confirmPassword}>
              <TextInput id="r-pass2" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} error={errors.confirmPassword} autoComplete="new-password" />
            </Field>
          </div>

          <div className="space-y-3 pt-2 border-t border-gray-100 dark:border-gray-800">
            <Checkbox id="r-terms" checked={agreeTerms} onChange={(e) => setAgreeTerms(e.target.checked)} error={errors.agreeTerms}
              label={<>I agree to the <Link href="/terms" target="_blank" className="text-blue-600 dark:text-blue-400 hover:underline">Terms &amp; Conditions</Link>.</>} />
            <Checkbox id="r-privacy" checked={agreePrivacy} onChange={(e) => setAgreePrivacy(e.target.checked)} error={errors.agreePrivacy}
              label={<>I agree to the <Link href="/privacy" target="_blank" className="text-blue-600 dark:text-blue-400 hover:underline">Privacy Policy</Link>.</>} />
            <Checkbox id="r-processing" checked={agreeProcessing} onChange={(e) => setAgreeProcessing(e.target.checked)} error={errors.agreeProcessing}
              label="I consent to the processing of information required for my application." />
          </div>

          <Button type="submit" disabled={submitting} className="w-full">
            {submitting ? 'Creating your account…' : 'Create Account & Continue'}
          </Button>
        </form>
      </main>

      <PublicFooter />
    </div>
  )
}
