import Link from 'next/link';
import {
  ArrowRight, ShieldCheck, CheckCircle2, GraduationCap, Building2, School,
  HandHeart, BadgeCheck, ClipboardList, Briefcase, BarChart3, Users, Mail,
} from 'lucide-react';
import { PublicHeader } from '../_study-work/components/PublicHeader';
import { PublicFooter } from '../_study-work/components/PublicFooter';

export const metadata = {
  title: 'For Institutions — beoneofus',
  description:
    'Schools, universities, employers and programmes use beoneofus to connect Rwandan graduates and school-leavers with study and work opportunities in Mauritius — through a verified organization page, programmes, job posts and real outcome tracking.',
};

// Who beoneofus works with — each card opens organization setup for that type.
const AUDIENCES = [
  {
    icon: School,
    type: 'education',
    title: 'Schools & universities in Rwanda',
    desc: 'Support your graduates and school-leavers as they apply to study or work in Mauritius, and follow their progress after they leave you.',
  },
  {
    icon: GraduationCap,
    type: 'education',
    title: 'Universities & colleges in Mauritius',
    desc: 'Reach motivated international students whose applications and documents have been prepared with a beoneofus advisor.',
  },
  {
    icon: Building2,
    type: 'business',
    title: 'Employers in Mauritius',
    desc: 'Post jobs and placements, and meet Work Abroad candidates whose paperwork has already been reviewed step by step.',
  },
  {
    icon: HandHeart,
    type: 'ngo',
    title: 'Scholarship & placement programmes',
    desc: 'Governments, NGOs and foundations can run cohorts, scholarships or placement programmes and track every participant.',
  },
];

// What an organization actually gets on the platform today.
const FEATURES = [
  { icon: BadgeCheck,    title: 'Verified organization page', desc: 'A public page for your institution. Request verification and the beoneofus team reviews it before your verified badge appears.' },
  { icon: ClipboardList, title: 'Programmes & participants',   desc: 'Create intakes, cohorts or placement programmes, add participants and keep each person’s status up to date.' },
  { icon: Briefcase,     title: 'Jobs & opportunities',        desc: 'Publish jobs, internships and placements. Every post is reviewed by our team before it goes live.' },
  { icon: BarChart3,     title: 'Outcomes & recommendations',  desc: 'See enrolment, completion and placement figures from your own data, with suggested next actions.' },
  { icon: Users,         title: 'Team access',                 desc: 'Invite colleagues as admins, recruiters or programme managers, so the right people handle the right work.' },
  { icon: ShieldCheck,   title: 'A safer process',             desc: 'Students and workers are guided through requirements and document review, so the people who reach you are prepared.' },
];

const STEPS = [
  { title: 'Create your organization page', desc: 'Free to set up in a few minutes. Add your details, logo and what you offer.' },
  { title: 'Request verification',          desc: 'Submit your information. Our team checks it and approves your verified badge.' },
  { title: 'Add programmes or post jobs',   desc: 'Open intakes, cohorts, scholarships or job placements for applicants.' },
  { title: 'Track participants & outcomes', desc: 'Follow each person’s progress and see your results in one dashboard.' },
];

export default function ForInstitutionsPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100">
      <PublicHeader />

      <main>
        {/* ── Hero ── */}
        <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-16 pb-16 sm:pt-24 sm:pb-20">
          <p className="inline-flex items-center gap-2 text-sm font-semibold text-blue-600 dark:text-blue-400">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-600 dark:bg-blue-400" /> For institutions
          </p>
          <h1 className="mt-4 text-4xl sm:text-5xl md:text-[56px] font-bold tracking-tight leading-[1.08] max-w-3xl">
            Help young people from Rwanda study and work in Mauritius.
          </h1>
          <p className="mt-6 text-lg text-gray-600 dark:text-gray-300 max-w-2xl leading-relaxed">
            beoneofus guides graduates and school-leavers through every step of studying or working abroad. Schools,
            universities, employers and programmes join to open opportunities, receive prepared applicants and track
            real outcomes.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-3">
            <Link href="/organizations/new" className="group inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white h-12 px-6 rounded-xl text-sm font-semibold shadow-sm transition-colors">
              Create your organization page
              <ArrowRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
            </Link>
            <a href="mailto:partners@beoneofus.work" className="inline-flex items-center justify-center gap-2 border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-white/5 text-gray-900 dark:text-white h-12 px-6 rounded-xl text-sm font-semibold transition-colors">
              <Mail size={16} /> Talk to our partnerships team
            </a>
          </div>
          <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">Free to create · Verification reviewed by our team</p>
        </section>

        {/* ── Who it's for ── */}
        <section className="border-t border-gray-100 dark:border-gray-800 bg-gray-50/60 dark:bg-white/[0.02]">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
            <div className="max-w-2xl mb-10">
              <h2 className="text-3xl font-bold tracking-tight">Who we work with</h2>
              <p className="mt-3 text-gray-600 dark:text-gray-400">
                Every organization joins the same way, with a page and tools shaped to its type.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {AUDIENCES.map(({ icon: Icon, type, title, desc }) => (
                <Link
                  key={title}
                  href={`/organizations/new?category=${type}`}
                  className="group flex gap-4 p-6 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 hover:border-blue-300 dark:hover:border-blue-500/40 hover:shadow-sm transition-all"
                >
                  <span className="w-11 h-11 rounded-xl bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                    <Icon size={20} />
                  </span>
                  <span className="min-w-0">
                    <span className="flex items-center gap-1.5 font-semibold text-gray-900 dark:text-white">
                      {title}
                      <ArrowRight size={14} className="text-gray-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all" />
                    </span>
                    <span className="block mt-1.5 text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{desc}</span>
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* ── What you get ── */}
        <section className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
          <div className="max-w-2xl mb-10">
            <h2 className="text-3xl font-bold tracking-tight">What your organization gets</h2>
            <p className="mt-3 text-gray-600 dark:text-gray-400">Everything below is available as soon as your page is created.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-10">
            {FEATURES.map(({ icon: Icon, title, desc }) => (
              <div key={title}>
                <span className="w-10 h-10 rounded-xl border border-gray-200 dark:border-gray-800 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-4">
                  <Icon size={19} />
                </span>
                <h3 className="font-semibold text-gray-900 dark:text-white">{title}</h3>
                <p className="mt-1.5 text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── How it works ── */}
        <section className="border-t border-gray-100 dark:border-gray-800">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-20 grid grid-cols-1 lg:grid-cols-[1fr_1.4fr] gap-10 lg:gap-16">
            <div>
              <h2 className="text-3xl font-bold tracking-tight">How it works</h2>
              <p className="mt-3 text-gray-600 dark:text-gray-400 leading-relaxed">
                Getting started takes minutes. Applicants follow their own guided journey, from application to
                document review and final documents, so the people who reach you arrive prepared.
              </p>
              <Link href="/how-it-works" className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 dark:text-blue-400 hover:underline">
                See the applicant journey <ArrowRight size={14} />
              </Link>
            </div>
            <ol className="space-y-6">
              {STEPS.map((step, i) => (
                <li key={step.title} className="flex gap-4">
                  <span className="w-8 h-8 rounded-full bg-blue-600 text-white text-sm font-semibold flex items-center justify-center shrink-0">{i + 1}</span>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">{step.title}</h3>
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{step.desc}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* ── Trust ── */}
        <section className="max-w-6xl mx-auto px-4 sm:px-6 pb-16 sm:pb-20">
          <div className="rounded-3xl bg-gray-900 dark:bg-gray-900 border border-gray-800 text-white p-8 sm:p-12">
            <div className="max-w-2xl">
              <p className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-400">
                <ShieldCheck size={16} /> Trust &amp; verification
              </p>
              <h2 className="mt-3 text-2xl sm:text-3xl font-bold tracking-tight">Opportunity abroad only works when everyone can be trusted.</h2>
              <ul className="mt-7 space-y-3">
                {[
                  'Organizations are reviewed by the beoneofus team before receiving a verified badge',
                  'Job and placement posts are checked before they are published',
                  'Applicants’ documents are reviewed one by one by our advisors',
                  'Content is moderated to keep the platform free of scams and misleading offers',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3 text-sm text-gray-200">
                    <CheckCircle2 size={18} className="text-emerald-400 shrink-0 mt-0.5" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* ── CTA ── */}
        <section className="border-t border-gray-100 dark:border-gray-800">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 py-16 sm:py-20 text-center">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">Open a door for the next student or worker.</h2>
            <p className="mt-4 text-gray-600 dark:text-gray-400 text-lg">Create your organization page for free, or talk to us about a partnership.</p>
            <div className="mt-8 flex flex-col sm:flex-row justify-center gap-3">
              <Link href="/organizations/new" className="group inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white h-12 px-6 rounded-xl text-sm font-semibold transition-colors">
                Create your organization page
                <ArrowRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
              </Link>
              <Link href="/contact" className="inline-flex items-center justify-center gap-2 border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-white/5 text-gray-900 dark:text-white h-12 px-6 rounded-xl text-sm font-semibold transition-colors">
                Contact us
              </Link>
            </div>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}
