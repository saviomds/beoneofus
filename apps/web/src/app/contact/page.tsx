'use client'

import { useState } from 'react'
import { Mail, Phone, MapPin, CheckCircle2 } from 'lucide-react'
import { PublicHeader } from '../_study-work/components/PublicHeader'
import { PublicFooter } from '../_study-work/components/PublicFooter'
import { Field, TextInput, TextArea, Select, Button } from '../_study-work/components/FormControls'
import { isBlank, isValidEmail, type Errors } from '../_study-work/lib/validation'

export default function ContactPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [topic, setTopic] = useState('Study Abroad')
  const [message, setMessage] = useState('')
  const [errors, setErrors] = useState<Errors>({})
  const [sent, setSent] = useState(false)

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    const next: Errors = {}
    if (isBlank(name)) next.name = 'Please enter your name.'
    if (!isValidEmail(email)) next.email = 'Please enter a valid email address.'
    if (isBlank(message)) next.message = 'Please enter a message.'
    setErrors(next)
    if (Object.keys(next).length === 0) {
      // No backend for this feature yet — this simulates a successful send.
      setSent(true)
    }
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
            <div className="space-y-4 text-sm">
              <div className="flex items-center gap-3 text-gray-600 dark:text-gray-300">
                <Mail size={16} className="text-blue-600 dark:text-blue-400" /> support@beoneofus.work
              </div>
              <div className="flex items-center gap-3 text-gray-600 dark:text-gray-300">
                <Phone size={16} className="text-blue-600 dark:text-blue-400" /> +230 000 0000
              </div>
              <div className="flex items-center gap-3 text-gray-600 dark:text-gray-300">
                <MapPin size={16} className="text-blue-600 dark:text-blue-400" /> Port Louis, Mauritius
              </div>
            </div>
          </div>

          <div className="lg:col-span-3">
            {sent ? (
              <div className="rounded-2xl border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50 dark:bg-emerald-500/10 p-8 text-center">
                <CheckCircle2 size={32} className="text-emerald-600 dark:text-emerald-400 mx-auto mb-3" />
                <h2 className="font-black text-gray-900 dark:text-white mb-1">Message sent</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">Thanks for reaching out — our team will get back to you shortly.</p>
              </div>
            ) : (
              <form onSubmit={onSubmit} className="space-y-4" noValidate>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Your name" htmlFor="c-name" required error={errors.name}>
                    <TextInput id="c-name" value={name} onChange={(e) => setName(e.target.value)} error={errors.name} />
                  </Field>
                  <Field label="Email address" htmlFor="c-email" required error={errors.email}>
                    <TextInput id="c-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} error={errors.email} />
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
                  <TextArea id="c-message" value={message} onChange={(e) => setMessage(e.target.value)} error={errors.message} rows={5} />
                </Field>
                <Button type="submit" className="w-full sm:w-auto">Send Message</Button>
              </form>
            )}
          </div>
        </div>
      </main>

      <PublicFooter />
    </div>
  )
}
