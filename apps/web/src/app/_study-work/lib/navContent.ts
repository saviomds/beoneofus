import {
  GraduationCap, Briefcase, BookOpen, ClipboardList, Compass, FileStack,
  LifeBuoy, HelpCircle, Mail, type LucideIcon,
} from 'lucide-react'

export interface MegaMenuItem {
  icon: LucideIcon
  title: string
  description: string
  href: string
}

export interface MegaMenuDef {
  key: string
  label: string
  featured: { title: string; description: string; href: string }
  items: MegaMenuItem[]
}

export const MEGA_MENUS: MegaMenuDef[] = [
  {
    key: 'study',
    label: 'Study Abroad',
    featured: {
      title: 'Study Abroad',
      description: 'Find programs and opportunities for studying in Mauritius.',
      href: '/study-abroad',
    },
    items: [
      { icon: Compass, title: 'Programs', description: 'Browse study opportunities', href: '/study-abroad' },
      { icon: ClipboardList, title: 'Requirements', description: 'See application requirements', href: '/requirements' },
      { icon: LifeBuoy, title: 'How It Works', description: 'Understand the application process', href: '/how-it-works' },
      { icon: FileStack, title: 'Documents', description: 'Prepare your application documents', href: '/requirements' },
      { icon: GraduationCap, title: 'Application', description: 'Start your application', href: '/apply?type=study' },
    ],
  },
  {
    key: 'work',
    label: 'Work Abroad',
    featured: {
      title: 'Work Abroad',
      description: 'Explore opportunities to work in Mauritius.',
      href: '/work-abroad',
    },
    items: [
      { icon: Compass, title: 'Jobs', description: 'Explore available opportunities', href: '/work-abroad' },
      { icon: ClipboardList, title: 'Requirements', description: 'Understand what you need', href: '/requirements' },
      { icon: LifeBuoy, title: 'How It Works', description: 'Learn the process', href: '/how-it-works' },
      { icon: FileStack, title: 'Documents', description: 'Prepare required documents', href: '/requirements' },
      { icon: Briefcase, title: 'Application', description: 'Start your work application', href: '/apply?type=work' },
    ],
  },
  {
    key: 'resources',
    label: 'Resources',
    featured: {
      title: 'Resources',
      description: 'Everything clients need to understand the process.',
      href: '/how-it-works',
    },
    items: [
      { icon: BookOpen, title: 'Guides', description: 'Helpful application guides', href: '/how-it-works' },
      { icon: HelpCircle, title: 'FAQs', description: 'Frequently asked questions', href: '/how-it-works' },
      { icon: ClipboardList, title: 'Requirements', description: 'Application requirements', href: '/requirements' },
      { icon: Mail, title: 'Support', description: 'Get help from BeOneOfUs', href: '/contact' },
    ],
  },
]

export const SIMPLE_LINKS = [{ href: '/how-it-works', label: 'How It Works' }]
