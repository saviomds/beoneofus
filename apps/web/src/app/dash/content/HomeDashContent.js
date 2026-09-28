'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '../../supabaseClient';
import Image from 'next/image';
import {
  Users, MessageSquare, Bell, Settings, Briefcase, Globe, Compass,
  ChevronRight, CalendarDays, CheckCircle2, Circle, ArrowRight, Flame,
  FileText, Library, PenLine, Clock,
} from 'lucide-react';
import VerifiedBadge from '../../components/VerifiedBadge';
import PremiumBadge from '../../components/PremiumBadge';
import { getAvatarSrc } from '../../../lib/avatar';
import { useLanguage } from '../../../lib/i18n';

/* ── Helpers ─────────────────────────────────────── */
function timeAgo(ts) {
  const s = Math.floor((Date.now() - new Date(ts)) / 1000);
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function calcCompleteness(profile) {
  if (!profile) return { score: 0, missing: [] };
  const checks = [
    { label: 'home_dash.completeness.full_name',   done: !!profile.full_name },
    { label: 'home_dash.completeness.photo',       done: !!profile.avatar_url },
    { label: 'home_dash.completeness.bio',         done: !!profile.status },
    { label: 'home_dash.completeness.location',    done: !!profile.location },
    { label: 'home_dash.completeness.work_status', done: !!profile.work_status },
    { label: 'home_dash.completeness.skills',      done: Array.isArray(profile.skills) && profile.skills.length > 0 },
    { label: 'home_dash.completeness.github',      done: !!profile.github },
    { label: 'home_dash.completeness.website',     done: !!profile.website },
  ];
  const done = checks.filter(c => c.done).length;
  return { score: Math.round((done / checks.length) * 100), missing: checks.filter(c => !c.done).map(c => c.label) };
}

/* ── Static config ────────────────────────────────── */
const STEPS = [
  { labelKey: 'home_dash.steps.profile_label', descKey: 'home_dash.steps.profile_desc', href: '/dash/profile' },
  { labelKey: 'home_dash.steps.explore_label', descKey: 'home_dash.steps.explore_desc', href: '/dash/jobs' },
  { labelKey: 'home_dash.steps.connect_label', descKey: 'home_dash.steps.connect_desc', href: '/dash/connections' },
];

const QUICK_ACTIONS = [
  { labelKey: 'home_dash.actions.find_jobs',     icon: Briefcase,    href: '/dash/jobs' },
  { labelKey: 'home_dash.actions.remote_work',   icon: Globe,        href: '/dash/freelance' },
  { labelKey: 'home_dash.actions.opportunities', icon: Compass,      href: '/opportunities' },
  { labelKey: 'home_dash.actions.create_post',   icon: PenLine,      href: '/dash/feed' },
  { labelKey: 'home_dash.actions.content',       icon: Library,      href: '/contents' },
  { labelKey: 'home_dash.actions.events',        icon: CalendarDays, href: '/dash/events' },
  { labelKey: 'home_dash.actions.groups',        icon: Users,        href: '/dash/groups' },
  { labelKey: 'home_dash.actions.settings',      icon: Settings,     href: '/dash/settings' },
];

const card = 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl';

function SectionTitle({ children, action }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">{children}</h2>
      {action}
    </div>
  );
}

export default function HomeDashContent() {
  const router = useRouter();
  const { t, lang } = useLanguage();
  const [profile, setProfile]         = useState(null);
  const [authSession, setAuthSession] = useState(null);
  const [stats, setStats]             = useState({ connections: 0, messages: 0, notifications: 0 });
  const [loading, setLoading]         = useState(true);
  const [streak, setStreak]           = useState(0);
  const [feedPosts, setFeedPosts]     = useState([]);

  const greetingHour = new Date().getHours();
  const greeting = greetingHour < 12 ? t('home_dash.greeting_morning') : greetingHour < 17 ? t('home_dash.greeting_afternoon') : t('home_dash.greeting_evening');
  const today = new Date().toLocaleDateString(lang, { weekday: 'long', month: 'long', day: 'numeric' });

  useEffect(() => {
    let isMounted = true;
    const fallbackTimer = window.setTimeout(() => {
      if (isMounted) setLoading(false);
    }, 3500);

    const init = async () => {
      try {
        const { data: { session: s } } = await supabase.auth.getSession();
        if (!isMounted) return;
        if (!s) { setLoading(false); return; }
        setAuthSession(s);
        const uid = s.user.id;

        const [profileRes, connRes, msgRes, notifRes] = await Promise.all([
          supabase.from('profiles').select('username,avatar_url,status,is_verified,is_premium,is_trial_premium,profile_visibility,is_admin,full_name,location,work_status,github,website,skills,role').eq('id', uid).single(),
          supabase.from('connections').select('id', { count: 'exact', head: true }).or(`sender_id.eq.${uid},receiver_id.eq.${uid}`).eq('status', 'accepted'),
          supabase.from('messages').select('id', { count: 'exact', head: true }).eq('receiver_id', uid).eq('is_read', false),
          supabase.from('notifications').select('id', { count: 'exact', head: true }).eq('receiver_id', uid).eq('unread', true),
        ]);
        if (!isMounted) return;

        setProfile(profileRes.data || null);
        setStats({ connections: connRes.count || 0, messages: msgRes.count || 0, notifications: notifRes.count || 0 });

        // Streak
        const { data: activityRows } = await supabase.from('user_activity').select('created_at').eq('user_id', uid).order('created_at', { ascending: false }).limit(90);
        if (activityRows?.length) {
          const days = new Set(activityRows.map(r => r.created_at?.slice(0, 10)));
          let sk = 0;
          const now = new Date();
          for (let i = 0; i < 90; i++) {
            const d = new Date(now);
            d.setDate(d.getDate() - i);
            if (days.has(d.toISOString().slice(0, 10))) sk++;
            else if (i > 0) break;
          }
          if (isMounted) setStreak(sk);
        }

        // Latest articles
        const { data: posts } = await supabase
          .from('blog_posts')
          .select('id,title,slug,excerpt,tags,created_at,cover_url')
          .eq('published', true)
          .order('created_at', { ascending: false })
          .limit(3);
        if (posts && isMounted) setFeedPosts(posts);
      } catch (e) {
        console.error('HomeDash:', e);
      } finally {
        if (isMounted) {
          clearTimeout(fallbackTimer);
          setLoading(false);
        }
      }
    };
    init();

    return () => {
      isMounted = false;
      clearTimeout(fallbackTimer);
    };
  }, []);

  const isGuest = !loading && !authSession;
  const { score, missing } = calcCompleteness(profile);
  const barColor = score >= 80 ? 'bg-emerald-500' : score >= 50 ? 'bg-amber-500' : 'bg-blue-600';
  const stepsDone = [score >= 60, stats.connections > 0, stats.connections >= 3];
  const doneCount = stepsDone.filter(Boolean).length;
  const avatarSrc = getAvatarSrc(profile, authSession);
  const displayName = profile?.full_name?.split(' ')[0] || profile?.username;

  const statCards = [
    { key: 'connections',   label: t('home_dash.stat_connections'),   value: stats.connections,   icon: Users,         href: '/dash/connections' },
    { key: 'messages',      label: t('home_dash.stat_messages'),      value: stats.messages,      icon: MessageSquare, href: '/dash/messages',      highlight: stats.messages > 0 },
    { key: 'notifications', label: t('home_dash.stat_notifications'), value: stats.notifications, icon: Bell,          href: '/dash/notifications', highlight: stats.notifications > 0 },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-6">

      {/* ── Greeting ─────────────────────────────── */}
      <header className="flex items-center gap-4">
        {!isGuest && (
          <div className="relative w-12 h-12 sm:w-14 sm:h-14 rounded-full overflow-hidden shrink-0 bg-blue-600 text-white flex items-center justify-center text-lg font-semibold uppercase">
            {avatarSrc
              ? <Image src={avatarSrc} alt="" fill sizes="56px" className="object-cover" referrerPolicy="no-referrer" />
              : (profile?.full_name?.[0] || profile?.username?.[0] || '')}
          </div>
        )}
        <div className="min-w-0">
          <p className="text-sm text-gray-500 dark:text-gray-400">{today}</p>
          <h1 className="text-2xl sm:text-[28px] font-semibold tracking-tight text-gray-900 dark:text-gray-100 flex items-center gap-2 flex-wrap">
            <span>{greeting}{displayName ? `, ${displayName}` : ''}</span>
            {profile?.is_verified && <VerifiedBadge size={18} />}
            {(profile?.is_premium || profile?.is_admin) && profile?.profile_visibility?.premium_badge !== false && (
              <PremiumBadge size={18} isTrial={!!profile?.is_trial_premium} />
            )}
          </h1>
          {!isGuest && <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{t('home_dash.subtitle')}</p>}
        </div>
      </header>

      {/* ── Guest welcome / account summary ─────── */}
      {isGuest ? (
        <section className={`${card} p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center gap-5`}>
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{t('home_dash.guest_title')}</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 max-w-md">{t('home_dash.guest_desc')}</p>
          </div>
          <div className="flex gap-2.5 shrink-0">
            <Link href="/auth" className="h-10 px-5 inline-flex items-center rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors">
              {t('home_dash.sign_in')}
            </Link>
            <Link href="/auth?mode=sign-up" className="h-10 px-5 inline-flex items-center rounded-lg border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/[0.04] text-sm font-semibold transition-colors">
              {t('home_dash.create_account')}
            </Link>
          </div>
        </section>
      ) : (
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {statCards.map(({ key, label, value, icon: Icon, href, highlight }) => (
            <Link
              key={key}
              href={href}
              className={`${card} group p-5 flex items-center gap-4 hover:border-gray-300 dark:hover:border-gray-700 hover:shadow-sm transition-all`}
            >
              <span className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                highlight ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300'
              }`}>
                <Icon size={20} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-2xl font-semibold leading-tight text-gray-900 dark:text-gray-100 tabular-nums">
                  {loading ? <span className="inline-block w-8 h-6 rounded bg-gray-100 dark:bg-gray-800 animate-pulse align-middle" /> : value}
                </span>
                <span className="block text-sm text-gray-500 dark:text-gray-400 truncate">{label}</span>
              </span>
              <ChevronRight size={18} className="text-gray-300 dark:text-gray-600 group-hover:text-gray-500 group-hover:translate-x-0.5 transition-all shrink-0" />
            </Link>
          ))}
        </section>
      )}

      {/* ── Get started (hidden once complete) ──── */}
      {!isGuest && !loading && doneCount < STEPS.length && (
        <section className={`${card} p-5 sm:p-6`}>
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">{t('home_dash.get_started')}</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{t('home_dash.get_started_desc')}</p>
            </div>
            <span className="text-sm font-medium text-gray-500 dark:text-gray-400 shrink-0 tabular-nums">
              {t('home_dash.steps_done', { done: doneCount, total: STEPS.length })}
            </span>
          </div>
          <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden mb-4">
            <div className="h-full bg-blue-600 rounded-full transition-all duration-700" style={{ width: `${(doneCount / STEPS.length) * 100}%` }} />
          </div>
          <ol className="divide-y divide-gray-100 dark:divide-gray-800">
            {STEPS.map((step, i) => {
              const done = stepsDone[i];
              return (
                <li key={step.href}>
                  <Link href={step.href} className="group flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                    {done
                      ? <CheckCircle2 size={22} className="text-emerald-500 shrink-0" />
                      : <Circle size={22} className="text-gray-300 dark:text-gray-600 shrink-0" />}
                    <span className="flex-1 min-w-0">
                      <span className={`block text-sm font-medium ${done ? 'text-gray-400 dark:text-gray-500 line-through' : 'text-gray-900 dark:text-gray-100'}`}>
                        {t(step.labelKey)}
                      </span>
                      {!done && <span className="block text-sm text-gray-500 dark:text-gray-400 truncate">{t(step.descKey)}</span>}
                    </span>
                    {!done && <ChevronRight size={18} className="text-gray-300 dark:text-gray-600 group-hover:text-blue-600 shrink-0 transition-colors" />}
                  </Link>
                </li>
              );
            })}
          </ol>
        </section>
      )}

      {/* ── Quick actions ────────────────────────── */}
      <section>
        <SectionTitle>{t('home_dash.quick_actions')}</SectionTitle>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {QUICK_ACTIONS.map(({ labelKey, icon: Icon, href }) => (
            <Link
              key={href}
              href={href}
              className={`${card} group flex items-center gap-3 p-4 hover:border-blue-300 dark:hover:border-blue-500/40 hover:shadow-sm transition-all`}
            >
              <span className="w-9 h-9 rounded-lg bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                <Icon size={18} />
              </span>
              <span className="text-sm font-medium text-gray-800 dark:text-gray-200 leading-snug">{t(labelKey)}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* ── Progress ─────────────────────────────── */}
      {!isGuest && (
        <section className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className={`${card} p-5`}>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">{t('home_dash.profile_strength')}</h2>
              <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 tabular-nums">{score}%</span>
            </div>
            <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden mb-4">
              <div className={`h-full ${barColor} rounded-full transition-all duration-700`} style={{ width: `${score}%` }} />
            </div>
            {missing.length > 0 ? (
              <>
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {missing.slice(0, 4).map(m => (
                    <span key={m} className="text-xs text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 px-2.5 py-1 rounded-full">{t(m)}</span>
                  ))}
                  {missing.length > 4 && (
                    <span className="text-xs text-gray-500 dark:text-gray-400 px-1 py-1">+{missing.length - 4} {t('home_dash.more_suffix')}</span>
                  )}
                </div>
                <Link href="/dash/profile" className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 dark:text-blue-400 hover:underline">
                  {t('home_dash.complete_profile')} <ArrowRight size={14} />
                </Link>
              </>
            ) : (
              <p className="flex items-center gap-2 text-sm font-medium text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 size={16} /> {t('home_dash.profile_complete')}
              </p>
            )}
          </div>

          <div className={`${card} p-5`}>
            <div className="flex items-center gap-2 mb-3">
              <Flame size={18} className="text-orange-500" />
              <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">{t('home_dash.streak_title')}</h2>
            </div>
            <p className="flex items-baseline gap-2 mb-2">
              <span className="text-4xl font-semibold text-gray-900 dark:text-gray-100 tabular-nums leading-none">{streak}</span>
              <span className="text-sm text-gray-500 dark:text-gray-400">{streak !== 1 ? t('home_dash.days') : t('home_dash.day')}</span>
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
              {streak === 0
                ? t('home_dash.streak_zero')
                : streak >= 7
                ? t('home_dash.streak_strong', { days: streak })
                : t('home_dash.streak_building')}
            </p>
          </div>
        </section>
      )}

      {/* ── Latest articles ──────────────────────── */}
      <section>
        <SectionTitle
          action={
            <button onClick={() => router.push('/dash/blog')} className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1">
              {t('home_dash.view_all')} <ArrowRight size={14} />
            </button>
          }
        >
          {t('home_dash.latest_articles')}
        </SectionTitle>

        {feedPosts.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-300 dark:border-gray-700 p-8 text-center">
            <FileText size={24} className="text-gray-300 dark:text-gray-600 mx-auto mb-2" />
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">{t('home_dash.feed_empty')}</p>
            <Link href="/dash/blog" className="text-sm font-semibold text-blue-600 dark:text-blue-400 hover:underline">
              {t('home_dash.feed_go_blog')}
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {feedPosts.map((post) => (
              <Link
                key={post.id}
                href={post.slug ? `/blog/${post.slug}` : '/dash/blog'}
                className={`${card} group overflow-hidden hover:border-gray-300 dark:hover:border-gray-700 hover:shadow-sm transition-all`}
              >
                {post.cover_url ? (
                  <div className="relative w-full h-32">
                    <Image src={post.cover_url} alt="" fill sizes="(min-width: 640px) 33vw, 100vw" className="object-cover" />
                  </div>
                ) : (
                  <div className="w-full h-32 bg-gray-50 dark:bg-gray-800/60 flex items-center justify-center">
                    <FileText size={24} className="text-gray-300 dark:text-gray-600" />
                  </div>
                )}
                <div className="p-4">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 leading-snug line-clamp-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    {post.title}
                  </h3>
                  <p className="flex items-center gap-2 mt-2 text-xs text-gray-500 dark:text-gray-400">
                    {post.tags?.[0] && <span className="truncate">{post.tags[0]}</span>}
                    <span className="flex items-center gap-1 ml-auto shrink-0">
                      <Clock size={12} /> {t('home_dash.ago', { time: timeAgo(post.created_at) })}
                    </span>
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
