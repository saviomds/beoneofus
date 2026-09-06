'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Menu, X, ChevronDown, ArrowRight } from 'lucide-react'
import { MegaMenuTrigger } from './nav/MegaMenu'
import { MEGA_MENUS, SIMPLE_LINKS } from '../lib/navContent'

export function PublicHeader() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [openMenu, setOpenMenu] = useState<string | null>(null)
  const [mobileExpanded, setMobileExpanded] = useState<string | null>(null)

  return (
    <div className="sticky top-0 z-50 px-3 sm:px-4 pt-3">
      <header className="max-w-5xl mx-auto rounded-2xl border border-gray-100 dark:border-gray-800 bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl shadow-sm shadow-gray-900/[0.04] dark:shadow-black/20">
        <div className="h-16 px-4 sm:px-5 flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2 shrink-0 font-black text-[15px] tracking-tight text-gray-900 dark:text-gray-100">
            <Image src="/logo.svg" alt="beoneofus" width={22} height={22} unoptimized />
            <span>beone<span className="text-cyan-600 dark:text-cyan-400">of</span>us</span>
          </Link>

          <nav className="hidden md:flex items-center gap-1" onMouseLeave={() => setOpenMenu(null)}>
            {MEGA_MENUS.map((menu) => (
              <MegaMenuTrigger
                key={menu.key}
                menu={menu}
                open={openMenu === menu.key}
                onOpen={() => setOpenMenu(menu.key)}
                onClose={() => setOpenMenu((cur) => (cur === menu.key ? null : cur))}
              />
            ))}
            {SIMPLE_LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="px-4 py-2 rounded-full text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-white transition-colors duration-150"
              >
                {l.label}
              </Link>
            ))}
          </nav>

          <div className="hidden md:flex items-center gap-2 shrink-0">
            <Link href="/login" className="px-3.5 py-2 text-sm font-semibold text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors">
              Sign in
            </Link>
            <Link
              href="/apply"
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-gray-900 hover:bg-gray-800 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100 text-white text-sm font-bold transition-colors"
            >
              Start Application
            </Link>
          </div>

          <button type="button" onClick={() => setMobileOpen((v) => !v)} className="md:hidden text-gray-600 dark:text-gray-300" aria-label="Menu" aria-expanded={mobileOpen}>
            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </header>

      {/* Mobile panel — proper accordion navigation, not a shrunk mega-menu */}
      {mobileOpen && (
        <div className="md:hidden max-w-5xl mx-auto mt-2 rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm overflow-hidden">
          <div className="max-h-[70vh] overflow-y-auto divide-y divide-gray-100 dark:divide-gray-800">
            {MEGA_MENUS.map((menu) => {
              const expanded = mobileExpanded === menu.key
              return (
                <div key={menu.key}>
                  <button
                    type="button"
                    onClick={() => setMobileExpanded(expanded ? null : menu.key)}
                    className="w-full flex items-center justify-between px-5 py-4 text-left"
                    aria-expanded={expanded}
                  >
                    <span className="text-sm font-bold text-gray-900 dark:text-white">{menu.label}</span>
                    <ChevronDown size={16} className={`text-gray-400 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`} />
                  </button>
                  {expanded && (
                    <div className="px-5 pb-4 space-y-1">
                      {menu.items.map(({ icon: Icon, title, description, href }) => (
                        <Link
                          key={title}
                          href={href}
                          onClick={() => { setMobileOpen(false); setMobileExpanded(null) }}
                          className="flex items-start gap-3 py-2.5 rounded-xl"
                        >
                          <span className="w-8 h-8 rounded-lg bg-cyan-50 dark:bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 flex items-center justify-center shrink-0">
                            <Icon size={14} />
                          </span>
                          <span>
                            <span className="block text-sm font-semibold text-gray-800 dark:text-gray-100">{title}</span>
                            <span className="block text-xs text-gray-500 dark:text-gray-400">{description}</span>
                          </span>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
            {SIMPLE_LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setMobileOpen(false)}
                className="block px-5 py-4 text-sm font-bold text-gray-900 dark:text-white"
              >
                {l.label}
              </Link>
            ))}
          </div>

          <div className="flex gap-2 p-4 border-t border-gray-100 dark:border-gray-800">
            <Link href="/login" onClick={() => setMobileOpen(false)} className="flex-1 text-center px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-700 dark:text-gray-200">
              Sign in
            </Link>
            <Link href="/apply" onClick={() => setMobileOpen(false)} className="flex-1 inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-gray-900 dark:bg-white dark:text-gray-900 text-white text-sm font-bold">
              Start Application <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
