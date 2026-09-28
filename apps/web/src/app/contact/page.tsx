'use client'

import { useState } from 'react'
import { Mail, Phone, MapPin, CheckCircle2, Loader2, AlertCircle } from 'lucide-react'
import { PublicHeader } from '../_study-work/components/PublicHeader'
import { PublicFooter } from '../_study-work/components/PublicFooter'
import { Field, TextInput, TextArea, Select, Button } from '../_study-work/components/FormControls'
import { isBlank, isValidEmail, type Errors } from '../_study-work/lib/validation'

const CONTACT_EMAIL = 'dominiquesaviomds@gmail.com'
const PHONES = [
  { label: 'Rwanda', display: '+250 786 731 976', tel: '+250786731976' },
  { label: 'Mauritius', display: '+230 5475 3221', tel: '+23054753221' },
]

export default function ContactPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [topic, setTopic] = useState('Study Abroad')
  const [message, setMessage] = useState('')
  const [website, setWebsite] = useState('') // honeypot — hidden from people
  const [errors, setErrors] = useState<Errors>({})
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState('')
  const [sent, setSent] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (sending) return
    const next: Errors = {}
    if (isBlank(name)) next.name = 'Please enter your name.'
    if (!isValidEmail(email)) next.email = 'Please enter a valid email address.'
    if (isBlank(message)) next.message = 'Please enter a message.'
    else if (message.trim().length < 10) next.message = 'Please write a little more (at least 10 characters).'
    setErrors(next)
    if (Object.keys(next).length > 0) return

    setSending(true)
    setSendError('')
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, topic, message, website }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Something went wrong. Please try again.')
      setSent(true)
    } catch (err) {
      setSendError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setSending(false)
    }
  }

  function reset() {
    setName(''); setEmail(''); setTopic('Study Abroad'); setMessage(''); setErrors({}); setSent(false)
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      <PublicHeader />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-10">
          <div className="lg:col-span-2">
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-gray-900 dark:text-white mb-4">Contact Us</h1>
            <p className="text-gray-500 dark:text-gray-400 mb-8 leading-relaxed">
              Questions about Study Abroad, Work Abroad, or an application already in progress? Reach out — we
              typically reply within 24 hours.
            </p>
            <ul className="space-y-5 text-sm">
              <li className="flex items-start gap-3">
                <Mail size={16} className="text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-0.5">Email</p>
                  <a href={`mailto:${CONTACT_EMAIL}`} className="text-gray-700 dark:text-gray-200 hover:text-blue-600 dark:hover:text-blue-400 break-all">
                    {CONTACT_EMAIL}
                  </a>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <Phone size={16} className="text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-0.5">Phone</p>
                  {PHONES.map((p) => (
                    <p key={p.tel} className="text-gray-700 dark:text-gray-200">
                      <span className="text-gray-400">{p.label}: </span>
                      <a href={`tel:${p.tel}`} className="hover:text-blue-600 dark:hover:text-blue-400">{p.display}</a>
                    </p>
                  ))}
                </div>
              </li>
              <li className="flex items-start gap-3">
                <MapPin size={16} className="text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-0.5">Where we work</p>
                  <p className="text-gray-700 dark:text-gray-200">Rwanda &amp; Mauritius</p>
                </div>
              </li>
            </ul>
          </div>

          <div className="lg:col-span-3">
            {sent ? (
              <div role="status" className="rounded-2xl border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50 dark:bg-emerald-500/10 p-8 text-center">
                <CheckCircle2 size={32} className="text-emerald-600 dark:text-emerald-400 mx-auto mb-3" />
                <h2 className="font-black text-gray-900 dark:text-white mb-1">Message sent</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
                  Thanks, {name.split(' ')[0]}. We&apos;ll reply to <strong className="text-gray-700 dark:text-gray-200">{email}</strong> shortly.
                </p>
                <Button type="button" variant="secondary" onClick={reset}>Send another message</Button>
              </div>
            ) : (
              <form onSubmit={onSubmit} className="space-y-4" noValidate>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Your name" htmlFor="c-name" required error={errors.name}>
                    <TextInput id="c-name" autoComplete="name" maxLength={120} value={name} onChange={(e) => setName(e.target.value)} error={errors.name} />
                  </Field>
                  <Field label="Email address" htmlFor="c-email" required error={errors.email}>
                    <TextInput id="c-email" type="email" autoComplete="email" maxLength={200} value={email} onChange={(e) => setEmail(e.target.value)} error={errors.email} />
                  </Field>
                </div>
                <Field label="Topic" htmlFor="c-topic">
                  <Select id="c-topic" value={topic} onChange={(e) => setTopic(e.target.value)}>
                    <option>Study Abroad</option>
                    <option>Work Abroad</option>
                    <option>An existing application</option>
                    <option>Something else</option>
                  </Select>
                </Field>
                <Field label="Message" htmlFor="c-message" required error={errors.message}>
                  <TextArea id="c-message" maxLength={5000} value={message} onChange={(e) => setMessage(e.target.value)} error={errors.message} rows={5} />
                </Field>

                {/* Honeypot: off-screen and skipped by keyboard and screen readers. */}
                <div aria-hidden="true" className="absolute -left-[10000px] w-px h-px overflow-hidden">
                  <label htmlFor="c-website">Website</label>
                  <input id="c-website" type="text" tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
                </div>

                {sendError && (
                  <p role="alert" className="flex items-start gap-2 rounded-xl border border-rose-200 dark:border-rose-900/50 bg-rose-50 dark:bg-rose-500/10 px-4 py-3 text-sm text-rose-700 dark:text-rose-300">
                    <AlertCircle size={16} className="mt-0.5 shrink-0" /> {sendError}
                  </p>
                )}

                <Button type="submit" disabled={sending} className="w-full sm:w-auto">
                  {sending ? <><Loader2 size={16} className="animate-spin" /> Sending…</> : 'Send Message'}
                </Button>
              </form>
            )}
          </div>
        </div>
      </main>

      <PublicFooter />
    </div>
  )
}
