import Link from 'next/link'
import { GraduationCap, CheckCircle2, ArrowRight, BookOpen, Wallet, Globe2 } from 'lucide-react'
import { PublicHeader } from '../_study-work/components/PublicHeader'
import { PublicFooter } from '../_study-work/components/PublicFooter'

export const metadata = {
  title: 'Study Abroad in Mauritius — beoneofus',
  description: 'Find opportunities to study in Mauritius, and let beoneofus guide you through the whole application journey.',
}

const HIGHLIGHTS = [
  { icon: BookOpen, title: 'Accredited programs', body: 'Certificate through PhD, across a wide range of fields and institutions.' },
  { icon: Wallet, title: 'Transparent costs', body: 'Understand tuition and living costs up front, before you commit.' },
  { icon: Globe2, title: 'Guided every step', body: 'A dedicated advisor reviews your application and requirements with you.' },
]

const LEVELS = ['Certificate', 'Diploma', "Bachelor's", "Master's", 'PhD', 'Short Course']

export default function StudyAbroadPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      <PublicHeader />

      <main>
        <section className="relative overflow-hidden bg-gradient-to-br from-gray-900 via-gray-900 to-blue-950 text-white">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:24px_24px]" />
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-20 sm:py-28 relative">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/20 text-xs font-bold uppercase tracking-widest mb-6">
              <GraduationCap size={14} /> Study Abroad
            </div>
            <h1 className="text-4xl sm:text-6xl font-black tracking-tight max-w-3xl mb-5 leading-tight">
              Find opportunities to study in Mauritius.
            </h1>
            <p className="text-gray-300 text-lg max-w-xl mb-8 leading-relaxed">
              From choosing a program to arriving on campus, beoneofus guides your Study Abroad application from
              start to finish — one clear step at a time.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link href="/apply?type=study" className="inline-flex items-center gap-2 px-6 py-3.5 bg-white text-gray-900 font-black rounded-2xl hover:bg-gray-100 transition-colors text-sm shadow-lg">
                Apply for Study Abroad <ArrowRight size={16} />
              </Link>
              <Link href="/how-it-works" className="inline-flex items-center gap-2 px-6 py-3.5 bg-white/10 border border-white/20 text-white font-bold rounded-2xl hover:bg-white/20 transition-colors text-sm">
                See how it works
              </Link>
            </div>
          </div>
        </section>

        <section className="max-w-6xl mx-auto px-4 sm:px-6 py-16">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-16">
            {HIGHLIGHTS.map(({ icon: Icon, title, body }) => (
              <div key={title} className="rounded-2xl border border-gray-100 dark:border-gray-800 p-6">
                <div className="w-11 h-11 rounded-xl bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-4">
                  <Icon size={20} />
                </div>
                <h3 className="font-black text-gray-900 dark:text-white mb-1.5">{title}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">{body}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-start">
            <div>
              <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-4">Education levels we support</h2>
              <div className="flex flex-wrap gap-2">
                {LEVELS.map((level) => (
                  <span key={level} className="text-sm font-semibold px-3.5 py-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200">{level}</span>
                ))}
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-5 leading-relaxed">
                Tell us your preferred field, program, institution, and intake during your application — your advisor
                will confirm what&apos;s realistic for your background once your application is confirmed.
              </p>
            </div>
            <div className="rounded-3xl border border-gray-100 dark:border-gray-800 p-7 bg-gray-50 dark:bg-gray-900">
              <h3 className="font-black text-gray-900 dark:text-white mb-4">What you&apos;ll need to get started</h3>
              <ul className="space-y-3">
                {['A valid passport (or one in progress)', 'Your most recent academic transcript', 'Proof of funds for tuition and living costs', 'A short statement of purpose'].map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-sm text-gray-600 dark:text-gray-300">
                    <CheckCircle2 size={16} className="text-emerald-500 shrink-0 mt-0.5" /> {item}
                  </li>
                ))}
              </ul>
              <Link href="/requirements" className="inline-flex items-center gap-1.5 text-sm font-bold text-blue-600 dark:text-blue-400 hover:underline mt-5">
                See full requirements <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        </section>

        <section className="max-w-6xl mx-auto px-4 sm:px-6 pb-20">
          <div className="rounded-3xl bg-gradient-to-br from-blue-600 to-indigo-700 p-8 sm:p-12 text-white text-center">
            <h2 className="text-2xl sm:text-3xl font-black mb-3">Ready to start your Study Abroad application?</h2>
            <p className="text-blue-100 mb-7 max-w-lg mx-auto">Create your account and start your application in a few minutes — no payment required to begin.</p>
            <Link href="/apply?type=study" className="inline-flex items-center gap-2 px-7 py-3.5 bg-white text-blue-700 font-black rounded-2xl hover:bg-blue-50 transition-colors text-sm shadow-lg">
              Apply for Study Abroad <ArrowRight size={16} />
            </Link>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  )
}
