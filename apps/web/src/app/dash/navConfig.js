// Single source of truth for dashboard navigation: the sidebar renders these
// sections, and the header uses the same labels for the current page title.
import {
  LayoutDashboard, Newspaper, MessageSquare, Bell,
  Briefcase, Globe, Building2, ScrollText, Handshake, Compass,
  ShoppingBag, PenLine,
  UserPlus, Users, CalendarDays, Terminal, Rocket,
  BarChart2, Crown, Settings, LayoutGrid,
} from 'lucide-react';

// `badge` names a live counter the sidebar supplies (messages / notifications / groups).
export const NAV_SECTIONS = [
  {
    id: 'main',
    items: [
      { id: 'home',          icon: LayoutDashboard },
      { id: 'feed',          icon: Newspaper },
      { id: 'messages',      icon: MessageSquare, badge: 'messages' },
      { id: 'notifications', icon: Bell,          badge: 'notifications' },
    ],
  },
  {
    id: 'work',
    items: [
      { id: 'jobs',         icon: Briefcase },
      { id: 'freelance',    icon: Globe },
      { id: 'companies',    icon: Building2 },
      { id: 'contracts',    icon: ScrollText },
      { id: 'partnerships', icon: Handshake },
      { id: 'discover',     icon: Compass },
    ],
  },
  {
    id: 'create',
    items: [
      { id: 'services', icon: ShoppingBag },
      { id: 'blog',     icon: PenLine },
    ],
  },
  {
    id: 'community',
    items: [
      { id: 'connections', icon: UserPlus },
      { id: 'groups',      icon: Users, badge: 'groups' },
      { id: 'events',      icon: CalendarDays },
      { id: 'tech-hub',    icon: Terminal },
      { id: 'startups',    icon: Rocket },
    ],
  },
  {
    id: 'account',
    items: [
      { id: 'analytics', icon: BarChart2 },
      { id: 'premium',   icon: Crown },
      { id: 'settings',  icon: Settings },
      { id: 'more',      icon: LayoutGrid },
    ],
  },
];

// Pages reachable from elsewhere (profile menu, links) that aren't in the nav.
const EXTRA_TITLES = ['profile', 'search', 'docs', 'bookmarks', 'pages', 'company-pages', 'admin', 'marketplace', 'discuss', 'apply'];

export function sectionLabel(t, id) {
  return t(`dash_nav.items.${id}`);
}

export function sectionTitle(t, id) {
  if (!id) return '';
  const known = NAV_SECTIONS.some(s => s.items.some(i => i.id === id)) || EXTRA_TITLES.includes(id);
  return known ? sectionLabel(t, id) : '';
}
