import Link from 'next/link'
import { GraduationCap, Briefcase, ArrowRight, Info } from 'lucide-react'
import { PublicHeader } from '../_study-work/components/PublicHeader'
import { PublicFooter } from '../_study-work/components/PublicFooter'

export const metadata = {
  title: 'General Requirements — beoneofus Study & Work Abroad',
  description: 'A general overview of what you need to apply for Study Abroad or Work Abroad with beoneofus.',
}

const STUDY_REQUIREMENTS = [
  { name: 'Valid Passport', note: 'Valid for at least 12 months from your intended travel date.' },
  { name: 'Academic Transcript', note: 'An official, stamped copy from your most recent institution.' },
  { name: 'Proof of Funds', note: 'Bank statement or sponsorship letter for tuition and living costs.' },
  { name: 'Statement of Purpose', note: 'A short essay on your motivation and goals.' },
  { name: 'English Proficiency Test', note: 'IELTS/TOEFL, if your prior education was not in English.', optional: true },
]

const WORK_REQUIREMENTS = [
  { name: 'Valid Passport', note: 'Valid for at least 12 months from your intended travel date.' },
  { name: 'Police Clearance Certificate', note: 'Issued within the last 6 months.' },
  { name: 'Curriculum Vitae (CV)', note: 'Your up-to-date professional CV.' },
  { name: 'Proof of Work Experience', note: 'Reference letters or contracts from previous employers.' },
  { name: 'Employment Contract Draft', note: 'From your prospective employer, once available.', optional: true },
  { name: 'Medical Certificate', note: 'Required for some employers or permit categories.', optional: true },
]

function RequirementGroup({ icon: Icon, title, items, tint, href }: {
  icon: React.ElementType; title: string; items: { name: string; note: string; optional?: boolean }[]; tint: string; href: string
}) {
  return (
    <div className="rounded-3xl border border-gray-100 dark:border-gray-800 p-7">
      <div className={`w-12 h-12 rounded-2xl ${tint} flex items-center justify-center mb-5`}>
        <Icon size={22} />
      </div>
      <h2 className="text-xl font-black text-gray-900 dark:text-white mb-5">{title}</h2>
      <ul className="space-y-4 mb-6">
        {items.map((item) => (
          <li key={item.name} className="flex items-start justify-between gap-3 border-b border-gray-100 dark:border-gray-800 pb-4 last:border-0 last:pb-0">
            <div>
              <p className="text-sm font-bold text-gray-900 dark:text-white">{item.name}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{item.note}</p>
            </div>
            <span className={`shrink-0 text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${item.optional ? 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400' : 'bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400'}`}>
              {item.optional ? 'Optional' : 'Required'}
            </span>
          </li>
        ))}
      </ul>
      <Link href={href} className="inline-flex items-center gap-1.5 text-sm font-bold text-blue-600 dark:text-blue-400 hover:underline">
        Start this application <ArrowRight size={14} />
      </Link>
    </div>
  )
}

export default function RequirementsPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      <PublicHeader />

      <main>
        <section className="max-w-4xl mx-auto px-4 sm:px-6 py-16 sm:py-20 text-center">
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-gray-900 dark:text-white mb-4">General Requirements</h1>
          <p className="text-gray-500 dark:text-gray-400 text-lg max-w-2xl mx-auto">
            A general overview of what most applicants need. Your exact, personalized requirements are confirmed
            once your application is reviewed and confirmed — they can vary based on your program, employer,
            nationality, and category.
          </p>
        </section>

        <section className="max-w-5xl mx-auto px-4 sm:px-6 pb-16">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <RequirementGroup icon={GraduationCap} title="Study Abroad" items={STUDY_REQUIREMENTS} tint="bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400" href="/apply?type=study" />
            <RequirementGroup icon={Briefcase} title="Work Abroad" items={WORK_REQUIREMENTS} tint="bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" href="/apply?type=work" />
          </div>

          <div className="mt-8 flex items-start gap-3 rounded-2xl bg-amber-50 dark:bg-amber-500/10 text-amber-800 dark:text-amber-300 p-5 text-sm leading-relaxed">
            <Info size={18} className="shrink-0 mt-0.5" />
            <p>
              This page is general guidance, not a guaranteed or exhaustive legal requirement list. Immigration and
              institutional requirements change and can vary by individual case — your assigned advisor will confirm
              exactly what applies to you after your application is confirmed.
            </p>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  )
}
