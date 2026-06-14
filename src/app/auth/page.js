import Link from 'next/link';
import Image from 'next/image';
import AuthForm from '../components/Auth';

const FEATURES = [
  'Public profile at /u/username',
  'Connect with people worldwide',
  'Collaborate on real projects in real-time',
  'Live chat and real-time messaging',
  'Earn certificates and achievements',
  'Track your activity and growth',
];

export default function AuthPage() {
  return (
    <div className="flex min-h-screen">
      {/* Left – Brand panel (desktop only) */}
      <div className="hidden lg:flex lg:w-[460px] xl:w-[520px] shrink-0 flex-col justify-between bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 p-12 relative overflow-hidden">
        {/* decorative blobs */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute bottom-0 right-0 w-[420px] h-[420px] rounded-full bg-indigo-500/20 blur-3xl" />
          <div className="absolute top-1/2 -right-20 w-64 h-64 rounded-full bg-blue-400/10 blur-2xl" />
        </div>

        {/* Logo */}
        <Link href="/" className="relative z-10 inline-flex items-center gap-3 group w-fit">
          <div className="w-10 h-10 rounded-2xl overflow-hidden bg-white ring-[3px] ring-white/70 shadow-lg">
            <Image src="/logo.svg" alt="beoneofus logo" width={40} height={40} unoptimized />
          </div>
          <span className="text-xl font-black tracking-tight text-white">
            beone<span className="text-blue-200">of</span>us
          </span>
        </Link>

        {/* Middle content */}
        <div className="relative z-10 space-y-8">
          <div className="space-y-4">
            <h2 className="text-4xl font-black text-white leading-tight tracking-tight">
              One community. Endless&nbsp;possibilities.
            </h2>
            <p className="text-blue-100 text-base leading-relaxed">
              Connect, collaborate, and grow with people who share your drive — whatever your field, whatever your goal.
            </p>
          </div>

          <ul className="space-y-3.5">
            {FEATURES.map((f) => (
              <li key={f} className="flex items-center gap-3 text-blue-100 text-sm">
                <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </span>
                {f}
              </li>
            ))}
          </ul>
        </div>

        {/* Bottom copyright */}
        <p className="relative z-10 text-blue-200/50 text-xs">
          © 2026 beoneofus · All rights reserved.
        </p>
      </div>

      {/* Right – Form panel */}
      <div className="flex flex-1 flex-col items-center px-5 py-8 sm:px-8 md:px-12 bg-gray-50 dark:bg-gray-950">

        {/* Mobile top bar */}
        <div className="lg:hidden w-full flex items-center justify-between mb-6 max-w-[420px]">
          <Link href="/" className="inline-flex items-center gap-2.5">
            <div className="w-9 h-9 flex items-center justify-center">
              <Image src="/logo.svg" alt="beoneofus logo" width={36} height={36} unoptimized />
            </div>
            <span className="text-lg font-black tracking-tight text-gray-900 dark:text-gray-100">
              beone<span className="text-blue-500">of</span>us
            </span>
          </Link>
          <Link
            href="/"
            className="text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors flex items-center gap-1"
          >
            <span>←</span> Home
          </Link>
        </div>

        {/* my-auto centers this block vertically when space allows; collapses naturally when form is tall */}
        <div className="flex flex-col items-center w-full my-auto gap-8 py-4">

          {/* Form card */}
          <div className="w-full max-w-[420px]">
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-xl shadow-gray-200/60 dark:shadow-black/30 p-7 sm:p-8">
              <AuthForm />
            </div>
          </div>

          {/* Footer */}
          <footer className="w-full max-w-[420px] text-center space-y-2">
            <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs text-gray-400 dark:text-gray-500">
              <Link href="/" className="hidden lg:inline hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
                ← Home
              </Link>
              <span className="hidden lg:inline">·</span>
              <Link href="/privacy" className="hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
                Privacy Policy
              </Link>
              <span>·</span>
              <Link href="/terms" className="hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
                Terms of Service
              </Link>
              <span>·</span>
              <Link href="/help" className="hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
                Help
              </Link>
            </div>
            <p className="text-xs text-gray-300 dark:text-gray-700">
              © 2026 beoneofus · Connecting people worldwide
            </p>
          </footer>

        </div>
      </div>
    </div>
  );
}
