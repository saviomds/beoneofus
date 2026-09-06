import Link from 'next/link'

export function PublicFooter() {
  return (
    <footer className="border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 py-10">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <Link href="/" className="font-black text-base flex items-center gap-2 text-gray-900 dark:text-gray-100">
          beone<span className="text-blue-600">of</span>us
        </Link>
        <div className="flex flex-wrap justify-center gap-4">
          {[
            { href: '/study-abroad', label: 'Study Abroad' },
            { href: '/work-abroad', label: 'Work Abroad' },
            { href: '/how-it-works', label: 'How It Works' },
            { href: '/requirements', label: 'Requirements' },
            { href: '/contact', label: 'Contact' },
            { href: '/privacy', label: 'Privacy' },
            { href: '/terms', label: 'Terms' },
          ].map(({ href, label }) => (
            <Link key={href} href={href} className="text-xs text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 transition-colors font-medium">
              {label}
            </Link>
          ))}
        </div>
        <p className="text-xs text-gray-400">© {new Date().getFullYear()} beoneofus</p>
      </div>
    </footer>
  )
}
