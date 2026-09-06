'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'
import { ChevronDown, ArrowRight } from 'lucide-react'
import type { MegaMenuDef } from '../../lib/navContent'

interface MegaMenuProps {
  menu: MegaMenuDef
  open: boolean
  onOpen: () => void
  onClose: () => void
}

export function MegaMenuTrigger({ menu, open, onOpen, onClose }: MegaMenuProps) {
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onPointerDown(e: PointerEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) onClose()
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open, onClose])

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => (open ? onClose() : onOpen())}
        aria-expanded={open}
        aria-haspopup="true"
        className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold transition-colors duration-150 ${
          open
            ? 'bg-cyan-50 text-cyan-700 dark:bg-cyan-500/10 dark:text-cyan-300'
            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-white'
        }`}
      >
        {menu.label}
        <ChevronDown size={14} className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>

      <div
        role="menu"
        aria-hidden={!open}
        className={`absolute left-1/2 -translate-x-1/2 top-[calc(100%+12px)] w-[640px] max-w-[92vw] rounded-3xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-xl shadow-gray-900/[0.06] dark:shadow-black/40 p-7 z-50 transition-[opacity,transform] duration-200 ease-out ${
          open ? 'opacity-100 translate-y-0 visible pointer-events-auto' : 'opacity-0 -translate-y-1.5 invisible pointer-events-none'
        }`}
      >
          <div className="grid grid-cols-5 gap-8">
            <div className="col-span-2 flex flex-col">
              <h3 className="text-lg font-black text-gray-900 dark:text-white mb-2">{menu.featured.title}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed mb-4">{menu.featured.description}</p>
              <Link
                href={menu.featured.href}
                onClick={onClose}
                className="mt-auto inline-flex items-center gap-1.5 text-sm font-bold text-cyan-600 dark:text-cyan-400 hover:text-cyan-700 dark:hover:text-cyan-300"
              >
                Learn more <ArrowRight size={14} />
              </Link>
            </div>

            <div className="col-span-3 grid grid-cols-2 gap-x-5 gap-y-4">
              {menu.items.map(({ icon: Icon, title, description, href }) => (
                <Link
                  key={title}
                  href={href}
                  onClick={onClose}
                  role="menuitem"
                  className="flex items-start gap-3 p-2.5 -m-2.5 rounded-2xl hover:bg-gray-50 dark:hover:bg-white/5 transition-colors group"
                >
                  <span className="w-9 h-9 rounded-xl bg-cyan-50 dark:bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 flex items-center justify-center shrink-0 group-hover:bg-cyan-100 dark:group-hover:bg-cyan-500/20 transition-colors">
                    <Icon size={16} />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-bold text-gray-900 dark:text-white">{title}</span>
                    <span className="block text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-snug">{description}</span>
                  </span>
                </Link>
              ))}
            </div>
          </div>
      </div>
    </div>
  )
}
