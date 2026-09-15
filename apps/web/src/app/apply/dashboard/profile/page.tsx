'use client'

import { useEffect, useState } from 'react'
import { CheckCircle2, Info } from 'lucide-react'
import { useStudyWork } from '../../../_study-work/state/StudyWorkContext'
import { Field, TextInput, PhoneInput, DateInput, Button } from '../../../_study-work/components/FormControls'
import { LoadingState } from '../../../_study-work/components/EmptyState'
import type { ClientUser } from '../../../_study-work/types'

export default function ProfilePage() {
  const { loading, user, updateProfile } = useStudyWork()
  const [form, setForm] = useState<ClientUser | null>(user)
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => { setForm(user) }, [user])

  if (loading) return <LoadingState />
  if (!form) return null

  function update(patch: Partial<ClientUser>) {
    setForm((prev) => (prev ? { ...prev, ...patch } : prev))
    setSaved(false)
  }

  async function handleSave() {
    if (!form) return
    setSaving(true)
    try {
      await updateProfile(form)
      setSaved(true)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-xl font-black text-gray-900 dark:text-white">Profile</h1>

      <div className="flex items-start gap-2.5 rounded-2xl bg-blue-50 dark:bg-blue-500/10 text-blue-800 dark:text-blue-300 p-4 text-sm">
        <Info size={16} className="shrink-0 mt-0.5" />
        Your email and account security are managed from your main beoneofus account settings. Applicant details below
        are specific to this application portal.
      </div>

      <section className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 sm:p-6">
        <h2 className="font-black text-gray-900 dark:text-white mb-4">Personal Information</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Field label="First name" htmlFor="pr-first"><TextInput id="pr-first" value={form.firstName} onChange={(e) => update({ firstName: e.target.value })} /></Field>
          <Field label="Middle name" htmlFor="pr-middle"><TextInput id="pr-middle" value={form.middleName} onChange={(e) => update({ middleName: e.target.value })} /></Field>
          <Field label="Last name" htmlFor="pr-last"><TextInput id="pr-last" value={form.lastName} onChange={(e) => update({ lastName: e.target.value })} /></Field>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
          <Field label="Nationality" htmlFor="pr-nat"><TextInput id="pr-nat" value={form.nationality} onChange={(e) => update({ nationality: e.target.value })} /></Field>
          <Field label="Date of birth" htmlFor="pr-dob"><DateInput id="pr-dob" value={form.dateOfBirth} onChange={(e) => update({ dateOfBirth: e.target.value })} /></Field>
        </div>
      </section>

      <section className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 sm:p-6">
        <h2 className="font-black text-gray-900 dark:text-white mb-4">Contact Information</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Email" htmlFor="pr-email"><TextInput id="pr-email" type="email" value={form.email} disabled /></Field>
          <Field label="Phone" htmlFor="pr-phone"><PhoneInput id="pr-phone" value={form.phone} onChange={(e) => update({ phone: e.target.value })} /></Field>
        </div>
        <Field label="Country of residence" htmlFor="pr-cor">
          <TextInput id="pr-cor" value={form.countryOfResidence} onChange={(e) => update({ countryOfResidence: e.target.value })} />
        </Field>
      </section>

      <section className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 sm:p-6">
        <h2 className="font-black text-gray-900 dark:text-white mb-2">Security</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Password and login security are managed from your beoneofus account settings.
        </p>
      </section>

      <section className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 sm:p-6">
        <h2 className="font-black text-gray-900 dark:text-white mb-2">Preferences</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">Notification and language preferences will appear here in a future update.</p>
      </section>

      <div className="flex items-center gap-3">
        <Button type="button" onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save Changes'}</Button>
        {saved && <span className="flex items-center gap-1.5 text-sm font-semibold text-emerald-600 dark:text-emerald-400"><CheckCircle2 size={15} /> Saved</span>}
      </div>
    </div>
  )
}
