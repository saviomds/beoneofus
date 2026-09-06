'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard, FileText, ClipboardList, FolderOpen, MessageSquare,
  Bell, UserCircle, Menu, X, LogOut, ArrowLeft,
} from 'lucide-react'
import { useStudyWork } from '../state/StudyWorkContext'
import { useNotifications } from '../hooks/useNotifications'
import { DemoModeSwitcher } from './DemoModeSwitcher'

const NAV = [
  { href: '/apply/dashboard', label: 'Dashboard', icon: LayoutDashboard, match: (p: string) => p === '/apply/dashboard' },
  { href: '/apply/dashboard/my-application', label: 'My Application', icon: FileText, match: (p: string) => p.includes('/application/') && !p.endsWith('/requirements') && !p.endsWith('/documents') },
  { href: '/apply/dashboard/requirements', label: 'Requirements', icon: ClipboardList, match: (p: string) => p.endsWith('/requirements') },
  { href: '/apply/dashboard/documents', label: 'Documents', icon: FolderOpen, match: (p: string) => p.endsWith('/documents') },
  { href: '/apply/dashboard/messages', label: 'Messages', icon: MessageSquare, match: (p: string) => p.startsWith('/apply/dashboard/messages') },
  { href: '/apply/dashboard/notifications', label: 'Notifications', icon: Bell, match: (p: string) => p.startsWith('/apply/dashboard/notifications') },
  { href: '/apply/dashboard/profile', label: 'Profile', icon: UserCircle, match: (p: string) => p.startsWith('/apply/dashboard/profile') },
]

export function PortalShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { user, logout } = useStudyWork()
  const { unreadCount } = useNotifications(user?.id ?? null)
  const [mobileOpen, setMobileOpen] = useState(false)

  async function handleLogout() {
    await logout()
    router.push('/')
  }

  const SidebarContent = (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2.5 px-5 py-5">
        <Image src="/logo.svg" alt="" width={26} height={26} unoptimized />
        <div>
          <p className="font-black text-sm text-gray-900 dark:text-white leading-tight">beoneofus</p>
          <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 leading-tight">Study & Work Abroad</p>
        </div>
      </div>

      <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto">
        {NAV.map(({ href, label, icon: Icon, match }) => {
          const active = match(pathname ?? '')
          return (
            <Link
              key={href}
              href={href}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors relative ${
                active
                  ? 'bg-cyan-50 dark:bg-cyan-500/10 text-cyan-700 dark:text-cyan-300'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              <Icon size={17} className="shrink-0" />
              {label}
              {label === 'Notifications' && unreadCount > 0 && (
                <span className="ml-auto text-[10px] font-bold bg-rose-500 text-white rounded-full min-w-[18px] h-[18px] px-1 flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      <div className="px-3 pb-4 pt-2 border-t border-gray-100 dark:border-gray-800 mt-2">
        <Link href="/" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
          <ArrowLeft size={17} /> Back to beoneofus
        </Link>
        <button
          type="button"
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors"
        >
          <LogOut size={17} /> Log out
        </button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 lg:left-0 lg:w-64 border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
        {SidebarContent}
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-72 bg-white dark:bg-gray-900 shadow-2xl">
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              aria-label="Close menu"
            >
              <X size={20} />
            </button>
            {SidebarContent}
          </div>
        </div>
      )}

      {/* Mobile topbar */}
      <div className="lg:hidden sticky top-0 z-30 flex items-center justify-between px-4 h-14 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        <button type="button" onClick={() => setMobileOpen(true)} aria-label="Open menu" className="text-gray-500 dark:text-gray-300">
          <Menu size={22} />
        </button>
        <div className="flex items-center gap-2">
          <Image src="/logo.svg" alt="" width={20} height={20} unoptimized />
          <span className="font-black text-sm text-gray-900 dark:text-white">beoneofus</span>
        </div>
        <Link href="/apply/dashboard/notifications" className="relative text-gray-500 dark:text-gray-300">
          <Bell size={20} />
          {unreadCount > 0 && <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-rose-500" />}
        </Link>
      </div>

      <main className="lg:pl-64">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8">{children}</div>
      </main>

      <DemoModeSwitcher />
    </div>
  )
}
