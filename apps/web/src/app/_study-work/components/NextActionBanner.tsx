import Link from 'next/link'
import { ArrowRight, Sparkles } from 'lucide-react'

export function NextActionBanner({ title, href }: { title: string; href: string }) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between gap-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white px-4 py-3.5 transition-colors group"
    >
      <span className="flex items-center gap-2.5 min-w-0">
        <Sparkles size={16} className="shrink-0" />
        <span className="min-w-0">
          <span className="block text-[10px] font-bold uppercase tracking-widest text-blue-200">Next Action</span>
          <span className="block text-sm font-bold truncate">{title}</span>
        </span>
      </span>
      <ArrowRight size={16} className="shrink-0 group-hover:translate-x-0.5 transition-transform" />
    </Link>
  )
}
