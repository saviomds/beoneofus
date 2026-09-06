import Link from 'next/link'
import {
  UserPlus, FileText, Clock, CheckCircle2, ClipboardList, UploadCloud,
  Search, RefreshCcw, Award, ArrowRight,
} from 'lucide-react'
import { PublicHeader } from '../_study-work/components/PublicHeader'
import { PublicFooter } from '../_study-work/components/PublicFooter'

export const metadata = {
  title: 'How It Works — beoneofus Study & Work Abroad',
  description: 'The complete Study Abroad and Work Abroad application journey, explained step by step.',
}

const STEPS = [
  { n: '01', icon: UserPlus, title: 'Create your account', desc: 'Already have a beoneofus account? We use it — no need to sign up again. New here? Create one in under a minute.' },
  { n: '02', icon: FileText, title: 'Start your application', desc: 'Choose Study Abroad or Work Abroad, and complete your initial application with your personal details.' },
  { n: '03', icon: Clock, title: 'Application under review', desc: 'Our team reviews your initial submission. You do not need to do anything else at this stage.' },
  { n: '04', icon: CheckCircle2, title: 'Application confirmed', desc: 'Once confirmed, the next stage unlocks — your full application, requirements, and documents.' },
  { n: '05', icon: ClipboardList, title: 'Complete your full application', desc: 'Add your education/employment history and travel information, and see your personalized requirements.' },
  { n: '06', icon: UploadCloud, title: 'Upload your documents', desc: 'Upload each required document. You can track the status of every single one.' },
  { n: '07', icon: Search, title: 'Document review', desc: 'Our team verifies each document — approving it, or letting you know exactly what to correct.' },
  { n: '08', icon: RefreshCcw, title: 'Fix anything required', desc: 'If a correction is needed, we tell you exactly what and why — you can re-upload right away.' },
  { n: '09', icon: Award, title: 'Approval & final documents', desc: 'Once everything is approved and processed, your completed document package becomes available to download.' },
]

export default function HowItWorksPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      <PublicHeader />

      <main>
        <section className="max-w-4xl mx-auto px-4 sm:px-6 py-16 sm:py-20 text-center">
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-gray-900 dark:text-white mb-4">How It Works</h1>
          <p className="text-gray-500 dark:text-gray-400 text-lg max-w-xl mx-auto">
            From choosing Study or Work Abroad to receiving your final documents — here is the complete journey.
          </p>
        </section>

        <section className="max-w-3xl mx-auto px-4 sm:px-6 pb-20">
          <ol className="relative">
            {STEPS.map((step, i) => (
              <li key={step.n} className="relative pb-10 last:pb-0 pl-16">
                {i < STEPS.length - 1 && (
                  <span className="absolute left-[23px] top-12 bottom-0 w-0.5 bg-gray-200 dark:bg-gray-800" aria-hidden="true" />
                )}
                <span className="absolute left-0 top-0 w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <step.icon size={20} />
                </span>
                <p className="text-[11px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-1">Step {step.n}</p>
                <h3 className="font-black text-gray-900 dark:text-white mb-1.5">{step.title}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">{step.desc}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="max-w-6xl mx-auto px-4 sm:px-6 pb-20">
          <div className="rounded-3xl bg-gray-900 dark:bg-gray-900 border border-gray-800 p-8 sm:p-12 text-white text-center">
            <h2 className="text-2xl sm:text-3xl font-black mb-3">Know exactly where you stand, always.</h2>
            <p className="text-gray-300 mb-7 max-w-lg mx-auto">Your dashboard always shows your current stage, what&apos;s missing, and what happens next.</p>
            <div className="flex flex-wrap justify-center gap-3">
              <Link href="/apply" className="inline-flex items-center gap-2 px-7 py-3.5 bg-white text-gray-900 font-black rounded-2xl hover:bg-gray-100 transition-colors text-sm">
                Start an Application <ArrowRight size={16} />
              </Link>
              <Link href="/requirements" className="inline-flex items-center gap-2 px-7 py-3.5 bg-white/10 border border-white/20 text-white font-bold rounded-2xl hover:bg-white/20 transition-colors text-sm">
                See Requirements
              </Link>
            </div>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  )
}
