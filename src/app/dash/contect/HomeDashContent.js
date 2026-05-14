'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../supabaseClient';
import Image from 'next/image';
import {
  Users, MessageSquare, Bookmark, Bell, Settings,
  Crown, GraduationCap, Handshake, Newspaper, HeartHandshake,
  ShoppingBag, UserPlus, Briefcase, Compass, Home,
  ChevronRight, CalendarDays, TrendingUp, Zap, Star,
  LayoutDashboard,
} from 'lucide-react';
import VerifiedBadge from '../../components/VerifiedBadge';
import PremiumBadge from '../../components/PremiumBadge';

const SECTIONS = [
  {
    id: 'connections',
    label: 'Networking',
    icon: UserPlus,
    color: 'blue',
    desc: 'Grow your professional network. Connect with developers and teams you trust.',
    stat: null,
  },
  {
    id: 'marketplace',
    label: 'Jobs & Market',
    icon: Briefcase,
    color: 'emerald',
    desc: 'Browse job opportunities and benchmark market rates in your tech stack.',
    stat: null,
  },
  {
    id: 'groups',
    label: 'Discussions',
    icon: Users,
    color: 'violet',
    desc: 'Join channels, group conversations, and collaborative threads.',
    stat: 'groups',
  },
  {
    id: 'feed',
    label: 'Discovery',
    icon: Compass,
    color: 'cyan',
    desc: 'Explore posts, trending ideas, and fresh perspectives from the network.',
    stat: null,
  },
  {
    id: 'messages',
    label: 'Messaging',
    icon: MessageSquare,
    color: 'sky',
    desc: 'Private conversations with your connections in real time.',
    stat: 'messages',
  },
  {
    id: 'bookmarks',
    label: 'Bookmarks',
    icon: Bookmark,
    color: 'amber',
    desc: 'Your saved posts, code snippets, and articles in one place.',
    stat: null,
  },
  {
    id: 'premium',
    label: 'Premium',
    icon: Crown,
    color: 'yellow',
    desc: 'Unlock advanced features, priority visibility, and exclusive content.',
    stat: null,
  },
  {
    id: 'coaching',
    label: 'Coaching',
    icon: GraduationCap,
    color: 'indigo',
    desc: 'Work with expert coaches to level up your technical career trajectory.',
    stat: null,
  },
  {
    id: 'mentorship',
    label: 'Mentorship',
    icon: HeartHandshake,
    color: 'rose',
    desc: 'Give or receive structured guidance from experienced engineers.',
    stat: null,
  },
  {
    id: 'partnerships',
    label: 'Partnerships',
    icon: Handshake,
    color: 'teal',
    desc: 'Collaborate on projects, co-found startups, and build ventures together.',
    stat: null,
  },
  {
    id: 'blog',
    label: 'Blog',
    icon: Newspaper,
    color: 'orange',
    desc: 'Read and publish in-depth articles, tutorials, and tech insights.',
    stat: null,
  },
  {
    id: 'events',
    label: 'Events',
    icon: CalendarDays,
    color: 'purple',
    desc: 'Discover hackathons, meetups, AMAs, and community gatherings.',
    stat: null,
  },
  {
    id: 'notifications',
    label: 'Notifications',
    icon: Bell,
    color: 'red',
    desc: 'Stay on top of likes, mentions, connection requests, and activity.',
    stat: 'notifications',
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: Settings,
    color: 'gray',
    desc: 'Manage your profile, privacy preferences, and account security.',
    stat: null,
  },
  {
    id: 'more',
    label: 'Resources',
    icon: LayoutDashboard,
    color: 'indigo',
    desc: 'Access developer tools, API keys, system status, and community support.',
    stat: null,
  },
];

const COLORS = {
  blue:    { bg: 'bg-blue-50 dark:bg-blue-900/20',       text: 'text-blue-600 dark:text-blue-400',       border: 'border-blue-200 dark:border-blue-800/50',       icon: 'bg-blue-600'    },
  emerald: { bg: 'bg-emerald-50 dark:bg-emerald-900/20', text: 'text-emerald-600 dark:text-emerald-400', border: 'border-emerald-200 dark:border-emerald-800/50', icon: 'bg-emerald-600' },
  violet:  { bg: 'bg-violet-50 dark:bg-violet-900/20',   text: 'text-violet-600 dark:text-violet-400',   border: 'border-violet-200 dark:border-violet-800/50',   icon: 'bg-violet-600'  },
  cyan:    { bg: 'bg-cyan-50 dark:bg-cyan-900/20',       text: 'text-cyan-600 dark:text-cyan-400',       border: 'border-cyan-200 dark:border-cyan-800/50',       icon: 'bg-cyan-600'    },
  sky:     { bg: 'bg-sky-50 dark:bg-sky-900/20',         text: 'text-sky-600 dark:text-sky-400',         border: 'border-sky-200 dark:border-sky-800/50',         icon: 'bg-sky-600'     },
  amber:   { bg: 'bg-amber-50 dark:bg-amber-900/20',     text: 'text-amber-600 dark:text-amber-400',     border: 'border-amber-200 dark:border-amber-800/50',     icon: 'bg-amber-500'   },
  yellow:  { bg: 'bg-yellow-50 dark:bg-yellow-900/20',   text: 'text-yellow-700 dark:text-yellow-400',   border: 'border-yellow-300 dark:border-yellow-800/50',   icon: 'bg-yellow-500'  },
  indigo:  { bg: 'bg-indigo-50 dark:bg-indigo-900/20',   text: 'text-indigo-600 dark:text-indigo-400',   border: 'border-indigo-200 dark:border-indigo-800/50',   icon: 'bg-indigo-600'  },
  rose:    { bg: 'bg-rose-50 dark:bg-rose-900/20',       text: 'text-rose-600 dark:text-rose-400',       border: 'border-rose-200 dark:border-rose-800/50',       icon: 'bg-rose-600'    },
  teal:    { bg: 'bg-teal-50 dark:bg-teal-900/20',       text: 'text-teal-600 dark:text-teal-400',       border: 'border-teal-200 dark:border-teal-800/50',       icon: 'bg-teal-600'    },
  orange:  { bg: 'bg-orange-50 dark:bg-orange-900/20',   text: 'text-orange-600 dark:text-orange-400',   border: 'border-orange-200 dark:border-orange-800/50',   icon: 'bg-orange-600'  },
  purple:  { bg: 'bg-purple-50 dark:bg-purple-900/20',   text: 'text-purple-600 dark:text-purple-400',   border: 'border-purple-200 dark:border-purple-800/50',   icon: 'bg-purple-600'  },
  red:     { bg: 'bg-red-50 dark:bg-red-900/20',         text: 'text-red-600 dark:text-red-400',         border: 'border-red-200 dark:border-red-800/50',         icon: 'bg-red-600'     },
  gray:    { bg: 'bg-gray-50 dark:bg-gray-800/50',       text: 'text-gray-600 dark:text-gray-400',       border: 'border-gray-200 dark:border-gray-700',          icon: 'bg-gray-600'    },
};

/* Deterministic daily shuffle — same order all day, new order next day */
function getDailyFeatured(count = 3) {
  const dayIndex = Math.floor(Date.now() / 86400000);
  const arr = [...SECTIONS];
  let seed = dayIndex;
  for (let i = arr.length - 1; i > 0; i--) {
    seed = (seed * 1664525 + 1013904223) & 0xffffffff;
    const j = Math.abs(seed) % (i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr.slice(0, count);
}

export default function HomeDashContent() {
  const router = useRouter();
  const [profile, setProfile] = useState(null);
  const [stats, setStats] = useState({ connections: 0, messages: 0, notifications: 0, groups: 0 });
  const [loading, setLoading] = useState(true);
  const [dailyFeatured] = useState(() => getDailyFeatured(3));
  const [today] = useState(() =>
    new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
  );

  const greetingHour = new Date().getHours();
  const greeting = greetingHour < 12 ? 'Good morning' : greetingHour < 17 ? 'Good afternoon' : 'Good evening';

  useEffect(() => {
    const init = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) { setLoading(false); return; }
        const uid = session.user.id;

        const [profileRes, connRes, msgRes, notifRes, groupNotifRes] = await Promise.all([
          supabase.from('profiles').select('username, avatar_url, status, is_verified, is_premium, is_admin').eq('id', uid).single(),
          supabase.from('connections').select('id', { count: 'exact', head: true }).or(`sender_id.eq.${uid},receiver_id.eq.${uid}`).eq('status', 'accepted'),
          supabase.from('messages').select('id', { count: 'exact', head: true }).eq('receiver_id', uid).eq('is_read', false),
          supabase.from('notifications').select('id', { count: 'exact', head: true }).eq('receiver_id', uid).eq('unread', true),
          supabase.from('notifications').select('id', { count: 'exact', head: true }).eq('receiver_id', uid).eq('unread', true).in('type', ['group_invite', 'group_join_request']),
        ]);

        setProfile(profileRes.data || null);
        setStats({
          connections: connRes.count || 0,
          messages: msgRes.count || 0,
          notifications: (notifRes.count || 0) - (groupNotifRes.count || 0),
          groups: groupNotifRes.count || 0,
        });
      } catch (e) {
        console.error('HomeDash init error:', e);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  const go = (id) => router.push('/dash/' + id);

  const getBadge = (section) => {
    if (section.stat === 'messages') return stats.messages;
    if (section.stat === 'notifications') return stats.notifications;
    if (section.stat === 'groups') return stats.groups;
    return 0;
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-40 bg-gray-200 dark:bg-gray-800 rounded-3xl" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => <div key={i} className="h-36 bg-gray-100 dark:bg-gray-800 rounded-2xl" />)}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {[1, 2, 3, 4, 5, 6, 7, 8].map(i => <div key={i} className="h-24 bg-gray-100 dark:bg-gray-800 rounded-2xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-7">

      {/* ── HERO GREETING ── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-900 p-6 sm:p-8 text-white shadow-xl">
        {/* decorative glow */}
        <div className="pointer-events-none absolute -top-16 -right-16 w-64 h-64 rounded-full bg-blue-500/20 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 left-0 w-48 h-32 rounded-full bg-indigo-600/20 blur-2xl" />

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center gap-4">
          {/* Avatar */}
          {profile?.avatar_url && (
            <div className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-2xl overflow-hidden border-2 border-white/20 shrink-0 shadow-lg">
              <Image src={profile.avatar_url} alt="avatar" fill sizes="64px" className="object-cover" />
            </div>
          )}

          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[3px] text-blue-300 mb-0.5">{today}</p>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight leading-tight">
              {greeting}{profile?.username ? (
                <span className="flex items-center gap-2 flex-wrap mt-0.5">
                  <span className="text-blue-300">@{profile.username}</span>
                  {profile.is_verified && <VerifiedBadge size={16} />}
                  {(profile.is_premium || profile.is_admin) && <PremiumBadge size={16} />}
                </span>
              ) : ''}
            </h1>
            <p className="text-sm text-slate-300 font-medium mt-1">
              {profile?.status || 'Your network is active — here\'s what\'s waiting for you.'}
            </p>
          </div>
        </div>

        {/* Quick stat pills */}
        <div className="relative z-10 flex flex-wrap gap-2.5 mt-5">
          <button
            onClick={() => go('connections')}
            className="flex items-center gap-2 bg-white/10 hover:bg-white/20 active:scale-95 transition-all px-3 py-1.5 rounded-xl text-xs font-bold backdrop-blur-sm border border-white/10"
          >
            <Users size={12} className="text-blue-300 shrink-0" />
            <span>{stats.connections} connection{stats.connections !== 1 ? 's' : ''}</span>
          </button>

          <button
            onClick={() => go('messages')}
            className="flex items-center gap-2 bg-white/10 hover:bg-white/20 active:scale-95 transition-all px-3 py-1.5 rounded-xl text-xs font-bold backdrop-blur-sm border border-white/10"
          >
            <MessageSquare size={12} className="text-sky-300 shrink-0" />
            <span>{stats.messages > 0 ? `${stats.messages} unread` : 'Messages'}</span>
            {stats.messages > 0 && (
              <span className="bg-red-500 text-white text-[9px] font-black w-4 h-4 flex items-center justify-center rounded-full shrink-0">
                {stats.messages > 99 ? '99+' : stats.messages}
              </span>
            )}
          </button>

          <button
            onClick={() => go('notifications')}
            className="flex items-center gap-2 bg-white/10 hover:bg-white/20 active:scale-95 transition-all px-3 py-1.5 rounded-xl text-xs font-bold backdrop-blur-sm border border-white/10"
          >
            <Bell size={12} className="text-yellow-300 shrink-0" />
            <span>{stats.notifications > 0 ? `${stats.notifications} alert${stats.notifications !== 1 ? 's' : ''}` : 'Alerts'}</span>
            {stats.notifications > 0 && (
              <span className="bg-red-500 text-white text-[9px] font-black w-4 h-4 flex items-center justify-center rounded-full shrink-0">
                {stats.notifications > 99 ? '99+' : stats.notifications}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* ── TODAY'S SPOTLIGHT ── */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[3px] text-gray-400 dark:text-gray-500">Today&apos;s Spotlight</p>
            <h2 className="text-base font-black text-gray-900 dark:text-gray-100 mt-0.5">Sections to explore today</h2>
          </div>
          <span className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-blue-500 bg-blue-50 dark:bg-blue-900/20 px-2.5 py-1 rounded-full border border-blue-200 dark:border-blue-800/50 shrink-0">
            <Zap size={9} /> Refreshes daily
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {dailyFeatured.map((section) => {
            const c = COLORS[section.color];
            const Icon = section.icon;
            const badge = getBadge(section);
            return (
              <button
                key={section.id}
                onClick={() => go(section.id)}
                className={`group relative text-left p-5 rounded-2xl border ${c.bg} ${c.border} transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 active:scale-[0.98]`}
              >
                {badge > 0 && (
                  <span className="absolute top-3.5 right-3.5 bg-red-500 text-white text-[9px] font-black min-w-[18px] h-[18px] flex items-center justify-center rounded-full px-1">
                    {badge > 99 ? '99+' : badge}
                  </span>
                )}
                <div className={`w-10 h-10 ${c.icon} rounded-xl flex items-center justify-center mb-3 shadow-sm group-hover:scale-110 transition-transform duration-200`}>
                  <Icon size={18} className="text-white" />
                </div>
                <h3 className={`text-sm font-black ${c.text} mb-1.5`}>{section.label}</h3>
                <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed line-clamp-2 mb-3">{section.desc}</p>
                <div className={`flex items-center gap-1 text-[10px] font-black uppercase tracking-widest ${c.text}`}>
                  Explore <ChevronRight size={11} className="group-hover:translate-x-0.5 transition-transform" />
                </div>
              </button>
            );
          })}
        </div>

        <p className="text-center text-[10px] text-gray-400 dark:text-gray-500 mt-3 font-medium">
          Come back tomorrow to discover 3 more featured sections
        </p>
      </section>

      {/* ── ALL SECTIONS GRID ── */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <p className="text-[10px] font-black uppercase tracking-[3px] text-gray-400 dark:text-gray-500">All Sections</p>
          <div className="flex-1 h-px bg-gray-200 dark:bg-gray-800" />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {SECTIONS.map((section) => {
            const c = COLORS[section.color];
            const Icon = section.icon;
            const badge = getBadge(section);
            const isFeatured = dailyFeatured.some(f => f.id === section.id);

            return (
              <button
                key={section.id}
                onClick={() => go(section.id)}
                className="group relative text-left p-4 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 hover:shadow-md transition-all duration-200 active:scale-[0.97]"
              >
                {isFeatured && (
                  <span className="absolute top-2.5 right-2.5 flex items-center gap-0.5 text-[8px] font-black uppercase tracking-widest text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800/40 px-1.5 py-0.5 rounded-full">
                    <Star size={7} fill="currentColor" /> Today
                  </span>
                )}
                {badge > 0 && !isFeatured && (
                  <span className="absolute top-2.5 right-2.5 bg-red-500 text-white text-[8px] font-black min-w-[16px] h-4 flex items-center justify-center rounded-full px-1">
                    {badge > 99 ? '99+' : badge}
                  </span>
                )}

                <div className={`w-8 h-8 ${c.icon} rounded-xl flex items-center justify-center mb-2.5 shadow-sm group-hover:scale-110 transition-transform duration-200`}>
                  <Icon size={14} className="text-white" />
                </div>
                <p className="text-[12px] font-black text-gray-900 dark:text-gray-100 mb-0.5 leading-tight">{section.label}</p>
                <p className={`text-[10px] font-semibold leading-relaxed line-clamp-1 ${c.text}`}>
                  {section.desc.split('.')[0]}
                </p>
              </button>
            );
          })}
        </div>
      </section>

      {/* ── QUICK ACTIONS ── */}
      <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl p-5 text-white">
          <h3 className="text-sm font-black mb-1">Share to your network</h3>
          <p className="text-xs text-blue-100 mb-4 leading-relaxed">Post an update, share a code snippet, or start a discussion in your feed.</p>
          <button
            onClick={() => go('feed')}
            className="flex items-center gap-2 bg-white/20 hover:bg-white/30 transition-all text-white text-xs font-black px-4 py-2 rounded-xl active:scale-95"
          >
            <Home size={13} /> Open Feed
          </button>
        </div>

        <div className="bg-gradient-to-br from-emerald-600 to-teal-600 rounded-2xl p-5 text-white">
          <h3 className="text-sm font-black mb-1">Browse opportunities</h3>
          <p className="text-xs text-emerald-100 mb-4 leading-relaxed">Find your next role, freelance gig, or collaboration in the jobs board.</p>
          <button
            onClick={() => go('marketplace')}
            className="flex items-center gap-2 bg-white/20 hover:bg-white/30 transition-all text-white text-xs font-black px-4 py-2 rounded-xl active:scale-95"
          >
            <Briefcase size={13} /> View Jobs
          </button>
        </div>
      </section>

    </div>
  );
}
