'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../supabaseClient';
import Image from 'next/image';
import {
  Users, MessageSquare, Bell, Settings,
  Crown, UserPlus, Briefcase, Compass,
  ChevronRight, CalendarDays, TrendingUp,
  BarChart2, CheckCircle2, Circle, ArrowRight, Flame,
  Bot, Award, Clock, FileText, Library,
  CheckCheck,
} from 'lucide-react';
import VerifiedBadge from '../../components/VerifiedBadge';
import PremiumBadge from '../../components/PremiumBadge';
import { getAvatarSrc } from '../../../lib/avatar';

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
    { label: 'Full name',   done: !!profile.full_name },
    { label: 'Photo',       done: !!profile.avatar_url },
    { label: 'Bio',         done: !!profile.status },
    { label: 'Location',    done: !!profile.location },
    { label: 'Work status', done: !!profile.work_status },
    { label: 'Skills',      done: Array.isArray(profile.skills) && profile.skills.length > 0 },
    { label: 'GitHub',      done: !!profile.github },
    { label: 'Website',     done: !!profile.website },
  ];
  const done = checks.filter(c => c.done).length;
  return { score: Math.round((done / checks.length) * 100), missing: checks.filter(c => !c.done).map(c => c.label) };
}

/* ── Hub cards ────────────────────────────────────── */
const HUBS = [
  {
    href: '/contents',
    label: 'Contents',
    desc: 'Everything knowledge-related — courses, career roadmaps, articles, and your saved resources.',
    icon: Library,
    iconBg: 'bg-gradient-to-br from-amber-500 to-orange-500',
    bg: 'bg-amber-50 dark:bg-amber-900/20',
    border: 'border-amber-200 dark:border-amber-800/40',
    text: 'text-amber-600 dark:text-amber-400',
    pills: ['Learn', 'Pathways', 'Blog', 'Bookmarks', 'Docs'],
    pillStyle: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400',
  },
  {
    href: '/opportunities',
    label: 'Opportunities',
    desc: 'Find work, hire talent, manage contracts, and connect with mentors and co-founders.',
    icon: TrendingUp,
    iconBg: 'bg-gradient-to-br from-blue-600 to-indigo-600',
    bg: 'bg-blue-50 dark:bg-blue-900/20',
    border: 'border-blue-200 dark:border-blue-800/40',
    text: 'text-blue-600 dark:text-blue-400',
    pills: ['Jobs', 'Services', 'Contracts', 'Mentorship', 'Partnership'],
    pillStyle: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
  },
];

/* ── Quick-nav ────────────────────────────────────── */
const NAV_TILES = [
  { id: 'connections',   label: 'Network',    icon: UserPlus,      stat: null,            color: 'text-blue-500' },
  { id: 'messages',      label: 'Messages',   icon: MessageSquare, stat: 'messages',      color: 'text-sky-500' },
  { id: 'notifications', label: 'Alerts',     icon: Bell,          stat: 'notifications', color: 'text-red-500' },
  { id: 'feed',          label: 'Discovery',  icon: Compass,       stat: null,            color: 'text-cyan-500' },
  { id: 'ai',            label: 'AI',         icon: Bot,           stat: null,            color: 'text-violet-500' },
  { id: 'coaching',      label: 'Coaching',   icon: Award,         stat: null,            color: 'text-indigo-500' },
  { id: 'events',        label: 'Events',     icon: CalendarDays,  stat: null,            color: 'text-purple-500' },
  { id: 'settings',      label: 'Settings',   icon: Settings,      stat: null,            color: 'text-gray-400' },
];

/* ── Onboarding steps ─────────────────────────────── */
const STEPS = [
  { n: 1, label: 'Build your profile',      desc: 'Add your skills, bio, and photo so others can find and trust you.',      key: 'profile' },
  { n: 2, label: 'Choose a pathway',        desc: 'Pick a career roadmap that matches your goals and start progressing.',    key: 'pathways' },
  { n: 3, label: 'Explore opportunities',   desc: 'Browse jobs, services, and partnerships in your field.',                 key: 'opportunities' },
  { n: 4, label: 'Connect & grow',          desc: 'Send connection requests, join groups, and build your professional network.', key: 'connections' },
];

export default function HomeDashContent() {
  const router = useRouter();
  const [profile, setProfile]         = useState(null);
  const [authSession, setAuthSession] = useState(null);
  const [stats, setStats]             = useState({ connections: 0, messages: 0, notifications: 0 });
  const [loading, setLoading]         = useState(true);
  const [streak, setStreak]           = useState(0);
  const [pathwayCount, setPathwayCount] = useState(0);
  const [feedPosts, setFeedPosts]     = useState([]);
  const [aiQuery, setAiQuery]         = useState('');

  const greetingHour = new Date().getHours();
  const greeting = greetingHour < 12 ? 'Good morning' : greetingHour < 17 ? 'Good afternoon' : 'Good evening';
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  const go = (id) => router.push('/dash/' + id);

  // Assistant-first: hand the goal to the unified match engine, then route
  const askAi = (query) => {
    const q = (query ?? aiQuery).trim();
    try { if (q) sessionStorage.setItem('match_goal', q); } catch { /* no storage */ }
    router.push('/dash/matches');
  };

  useEffect(() => {
    const init = async () => {
      try {
        const { data: { session: s } } = await supabase.auth.getSession();
        if (!s) { setLoading(false); return; }
        setAuthSession(s);
        const uid = s.user.id;

        const [profileRes, connRes, msgRes, notifRes] = await Promise.all([
          supabase.from('profiles').select('username,avatar_url,status,is_verified,is_premium,is_trial_premium,profile_visibility,is_admin,full_name,location,work_status,github,website,skills,role').eq('id', uid).single(),
          supabase.from('connections').select('id', { count: 'exact', head: true }).or(`sender_id.eq.${uid},receiver_id.eq.${uid}`).eq('status', 'accepted'),
          supabase.from('messages').select('id', { count: 'exact', head: true }).eq('receiver_id', uid).eq('is_read', false),
          supabase.from('notifications').select('id', { count: 'exact', head: true }).eq('receiver_id', uid).eq('unread', true),
        ]);

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
          setStreak(sk);
        }

        // Pathways
        const { count: pc } = await supabase.from('user_pathways').select('id', { count: 'exact', head: true }).eq('user_id', uid);
        setPathwayCount(pc || 0);

        // Blog feed
        const { data: posts } = await supabase
          .from('blog_posts')
          .select('id,title,excerpt,tags,created_at,cover_url')
          .eq('published', true)
          .order('created_at', { ascending: false })
          .limit(3);
        if (posts) setFeedPosts(posts);
      } catch (e) {
        console.error('HomeDash:', e);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  const getBadge = (stat) => {
    if (stat === 'messages') return stats.messages;
    if (stat === 'notifications') return stats.notifications;
    return 0;
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-32 bg-gray-200 dark:bg-gray-800 rounded-3xl" />
        <div className="grid grid-cols-2 gap-4">
          {[1, 2].map(i => <div key={i} className="h-40 bg-gray-100 dark:bg-gray-800 rounded-2xl" />)}
        </div>
        <div className="grid grid-cols-4 gap-3">
          {[1, 2, 3, 4, 5, 6, 7, 8].map(i => <div key={i} className="h-16 bg-gray-100 dark:bg-gray-800 rounded-xl" />)}
        </div>
      </div>
    );
  }

  const { score, missing } = calcCompleteness(profile);
  const barColor = score >= 80 ? 'bg-emerald-500' : score >= 50 ? 'bg-amber-500' : 'bg-red-500';

  /* Derive which onboarding steps are done */
  const stepsDone = [
    score >= 60,           // profile built
    pathwayCount > 0,      // pathway picked
    stats.connections > 0, // explored/connected
    stats.connections >= 3, // grown network
  ];

  return (
    <div className="space-y-8 pb-6">

      {/* ── WELCOME BANNER ─────────────────────────── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-900 p-6 sm:p-8 text-white shadow-xl">
        <div className="pointer-events-none absolute -top-20 -right-20 w-72 h-72 rounded-full bg-blue-500/10 blur-3xl" />

        <div className="relative z-10 flex items-center gap-4">
          {getAvatarSrc(profile, authSession) ? (
            <div className="relative w-14 h-14 rounded-2xl overflow-hidden border-2 border-white/20 shrink-0">
              <Image src={getAvatarSrc(profile, authSession)} alt="avatar" fill sizes="56px" className="object-cover" referrerPolicy="no-referrer" />
            </div>
          ) : (
            <div className="w-14 h-14 rounded-2xl bg-white/10 border-2 border-white/20 shrink-0 flex items-center justify-center text-xl font-black text-white/60">
              {profile?.full_name?.[0] || profile?.username?.[0] || '?'}
            </div>
          )}

          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[3px] text-blue-300 mb-0.5">{today}</p>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight">
              {greeting}
              {profile?.username && (
                <span className="flex items-center gap-2 flex-wrap mt-0.5">
                  <span className="text-blue-300">@{profile.username}</span>
                  {profile.is_verified && <VerifiedBadge size={16} />}
                  {(profile.is_premium || profile.is_admin) && profile.profile_visibility?.premium_badge !== false && (
                    <PremiumBadge size={16} isTrial={!!profile.is_trial_premium} />
                  )}
                </span>
              )}
            </h1>
          </div>
        </div>

        {/* Three stat pills */}
        <div className="relative z-10 flex flex-wrap gap-2 mt-5">
          {[
            { label: `${stats.connections} connection${stats.connections !== 1 ? 's' : ''}`, id: 'connections', icon: Users, badge: 0, iconColor: 'text-blue-300' },
            { label: stats.messages > 0 ? `${stats.messages} unread` : 'Messages', id: 'messages', icon: MessageSquare, badge: stats.messages, iconColor: 'text-sky-300' },
            { label: stats.notifications > 0 ? `${stats.notifications} alert${stats.notifications !== 1 ? 's' : ''}` : 'Alerts', id: 'notifications', icon: Bell, badge: stats.notifications, iconColor: 'text-yellow-300' },
          ].map(({ label, id, icon: Icon, badge, iconColor }) => (
            <button
              key={id}
              onClick={() => go(id)}
              className="flex items-center gap-2 bg-white/10 hover:bg-white/20 active:scale-95 transition-all px-3 py-1.5 rounded-xl text-xs font-bold backdrop-blur-sm border border-white/10"
            >
              <Icon size={12} className={`${iconColor} shrink-0`} />
              <span>{label}</span>
              {badge > 0 && (
                <span className="bg-red-500 text-white text-[9px] font-black w-4 h-4 flex items-center justify-center rounded-full shrink-0">
                  {badge > 99 ? '99+' : badge}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── AI ASSISTANT BAR (assistant-first) ─────── */}
      <div>
        <form onSubmit={(e) => { e.preventDefault(); askAi(); }}>
          <div className="flex items-center gap-2 bg-white dark:bg-[#18181B] border border-gray-200 dark:border-zinc-800 rounded-2xl p-2 pl-4 shadow-sm focus-within:border-brand-400 focus-within:ring-2 focus-within:ring-brand-500/20 transition-all">
            <Bot size={18} className="text-brand-500 shrink-0" />
            <input
              value={aiQuery}
              onChange={(e) => setAiQuery(e.target.value)}
              placeholder="Tell me what you're looking for…"
              className="flex-1 bg-transparent outline-none text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 min-w-0"
              aria-label="Ask the AI assistant"
            />
            <button type="submit" className="shrink-0 inline-flex items-center gap-1.5 bg-brand-500 hover:bg-brand-600 text-white text-xs font-bold px-3.5 sm:px-4 py-2 rounded-xl transition-colors active:scale-95">
              <span className="hidden sm:inline">Ask AI</span>
              <ArrowRight size={13} />
            </button>
          </div>
        </form>
        <div className="flex flex-wrap gap-1.5 mt-2.5">
          {['Find a remote job', 'Match me a mentor', 'Suggest a course', 'Grow my network'].map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => askAi(s)}
              className="text-[11px] font-semibold px-3 py-1 rounded-full bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-gray-300 hover:bg-brand-50 dark:hover:bg-brand-500/15 hover:text-brand-600 dark:hover:text-brand-300 transition-colors"
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* ── YOUR JOURNEY ───────────────────────────── */}
      <section>
        <div className="flex items-center gap-3 mb-4">
          <h2 className="text-[11px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Your journey</h2>
          <div className="flex-1 h-px bg-gray-200 dark:bg-gray-800" />
          <span className="text-[10px] font-black text-gray-400 shrink-0">{stepsDone.filter(Boolean).length}/{STEPS.length}</span>
        </div>
        <div className="flex items-stretch gap-2 sm:gap-3">
          {STEPS.map((step, i) => {
            const done = stepsDone[i];
            return (
              <button
                key={step.n}
                onClick={() => go(step.key)}
                title={step.desc}
                className={`group relative flex-1 min-w-0 text-left p-3 sm:p-4 rounded-2xl border transition-all active:scale-[0.98] ${
                  done
                    ? 'bg-emerald-50 dark:bg-emerald-900/15 border-emerald-200 dark:border-emerald-800/40'
                    : 'bg-white dark:bg-[#18181B] border-gray-200/80 dark:border-zinc-800/80 hover:border-brand-300 dark:hover:border-brand-700'
                }`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black mb-2 transition-colors ${
                  done ? 'bg-emerald-500 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-400 group-hover:bg-brand-500 group-hover:text-white'
                }`}>
                  {done ? <CheckCheck size={15} /> : step.n}
                </div>
                <p className={`text-[11px] sm:text-xs font-bold leading-tight line-clamp-2 ${
                  done ? 'text-emerald-700 dark:text-emerald-400' : 'text-gray-900 dark:text-gray-100'
                }`}>
                  {step.label}
                </p>
              </button>
            );
          })}
        </div>
      </section>

      {/* ── HUB CARDS ──────────────────────────────── */}
      <section>
        <div className="flex items-center gap-3 mb-4">
          <h2 className="text-[11px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Platform</h2>
          <div className="flex-1 h-px bg-gray-200 dark:bg-gray-800" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {HUBS.map((hub) => {
            const Icon = hub.icon;
            return (
              <button
                key={hub.label}
                onClick={() => router.push(hub.href)}
                className={`group text-left p-6 rounded-2xl border ${hub.bg} ${hub.border} transition-all duration-200 hover:shadow-xl hover:-translate-y-1 active:scale-[0.98]`}
              >
                <div className="flex items-start justify-between mb-5">
                  <div className={`w-12 h-12 ${hub.iconBg} rounded-xl flex items-center justify-center shadow-md group-hover:scale-105 transition-transform duration-200`}>
                    <Icon size={22} className="text-white" />
                  </div>
                  <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full ${hub.pillStyle}`}>
                    {hub.pills.length} sections
                  </span>
                </div>

                <h3 className={`text-lg font-black ${hub.text} mb-1.5`}>{hub.label}</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed mb-4">{hub.desc}</p>

                <div className="flex flex-wrap gap-1.5 mb-5">
                  {hub.pills.map((p) => (
                    <span key={p} className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${hub.pillStyle}`}>{p}</span>
                  ))}
                </div>

                <span className={`inline-flex items-center gap-1.5 text-xs font-black ${hub.text}`}>
                  Browse {hub.label}
                  <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* ── QUICK NAV ──────────────────────────────── */}
      <section>
        <div className="flex items-center gap-3 mb-4">
          <h2 className="text-[11px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Quick Access</h2>
          <div className="flex-1 h-px bg-gray-200 dark:bg-gray-800" />
        </div>

        <div className="grid grid-cols-4 sm:grid-cols-8 gap-2.5">
          {NAV_TILES.map((tile) => {
            const Icon = tile.icon;
            const badge = getBadge(tile.stat);
            return (
              <button
                key={tile.id}
                onClick={() => go(tile.id)}
                className="group relative flex flex-col items-center gap-2 py-4 px-1 rounded-2xl bg-white dark:bg-[#18181B] border border-gray-200/80 dark:border-zinc-800/80 hover:border-gray-300 dark:hover:border-zinc-600 hover:shadow-md transition-all duration-200 active:scale-[0.95]"
              >
                {badge > 0 && (
                  <span className="absolute top-2 right-2 bg-red-500 text-white text-[8px] font-black min-w-[15px] h-[15px] flex items-center justify-center rounded-full px-1">
                    {badge > 99 ? '99+' : badge}
                  </span>
                )}
                <Icon size={18} className={`${tile.color} group-hover:scale-110 transition-transform duration-200`} />
                <span className="text-[10px] font-bold text-gray-600 dark:text-gray-400 text-center leading-tight">{tile.label}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* ── LIVE FEED ──────────────────────────────── */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <h2 className="text-[11px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">What&apos;s New</h2>
            <div className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/40 px-2 py-0.5 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live
            </div>
          </div>
          <button onClick={() => go('blog')} className="text-[11px] font-black text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1">
            View all <ArrowRight size={11} />
          </button>
        </div>

        {feedPosts.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-200 dark:border-gray-800 p-8 text-center">
            <FileText size={26} className="text-gray-300 dark:text-gray-600 mx-auto mb-2" />
            <p className="text-xs text-gray-400 dark:text-gray-500 mb-3">No posts yet — be the first to publish.</p>
            <button onClick={() => go('blog')} className="text-[11px] font-black text-blue-600 dark:text-blue-400 hover:underline">
              Go to Blog
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {feedPosts.map((post) => (
              <button
                key={post.id}
                onClick={() => go('blog')}
                className="group text-left p-4 rounded-2xl bg-white dark:bg-[#18181B] border border-gray-200/80 dark:border-zinc-800/80 hover:border-gray-300 dark:hover:border-zinc-600 hover:shadow-md transition-all duration-200 active:scale-[0.98]"
              >
                {post.cover_url ? (
                  <div className="relative w-full h-28 rounded-xl overflow-hidden mb-3 border border-gray-100 dark:border-gray-800">
                    <Image src={post.cover_url} alt={post.title} fill sizes="300px" className="object-cover" />
                  </div>
                ) : (
                  <div className="w-full h-28 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 mb-3 flex items-center justify-center border border-gray-100 dark:border-gray-800">
                    <FileText size={24} className="text-blue-300 dark:text-blue-700" />
                  </div>
                )}
                <h3 className="text-[13px] font-black text-gray-900 dark:text-gray-100 leading-tight line-clamp-2 mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                  {post.title}
                </h3>
                <div className="flex items-center gap-2">
                  {post.tags?.[0] && (
                    <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800/40">
                      {post.tags[0]}
                    </span>
                  )}
                  <span className="flex items-center gap-1 text-[10px] text-gray-400 dark:text-gray-500 ml-auto">
                    <Clock size={9} />
                    {timeAgo(post.created_at)} ago
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </section>

      {/* ── CAREER PROGRESS ────────────────────────── */}
      <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">

        {/* Profile Strength */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-8 h-8 bg-blue-600 rounded-xl flex items-center justify-center shrink-0">
              <BarChart2 size={15} className="text-white" />
            </div>
            <p className="text-sm font-black text-gray-900 dark:text-gray-100">Profile Strength</p>
            <span className={`ml-auto text-xs font-black px-2 py-0.5 rounded-full ${score >= 80 ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' : score >= 50 ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400' : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'}`}>
              {score}%
            </span>
          </div>
          <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden mb-3">
            <div className={`h-full ${barColor} rounded-full transition-all duration-700`} style={{ width: `${score}%` }} />
          </div>
          {missing.length > 0 ? (
            <div className="space-y-1">
              {missing.slice(0, 3).map(m => (
                <div key={m} className="flex items-center gap-2">
                  <Circle size={9} className="text-gray-300 dark:text-gray-600 shrink-0" />
                  <span className="text-[11px] text-gray-500 dark:text-gray-400">{m}</span>
                </div>
              ))}
              {missing.length > 3 && <p className="text-[10px] text-gray-400">+{missing.length - 3} more</p>}
              <button onClick={() => go('profile')} className="mt-2 flex items-center gap-1 text-[11px] font-black text-blue-600 dark:text-blue-400 hover:underline">
                Complete profile <ArrowRight size={10} />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 size={14} />
              <span className="text-xs font-bold">Profile complete — great work!</span>
            </div>
          )}
        </div>

        {/* Activity Streak */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-8 h-8 bg-orange-500 rounded-xl flex items-center justify-center shrink-0">
              <Flame size={15} className="text-white" />
            </div>
            <p className="text-sm font-black text-gray-900 dark:text-gray-100">Activity Streak</p>
          </div>
          <div className="flex items-end gap-2.5 mb-3">
            <p className="text-5xl font-black text-orange-500 leading-none">{streak}</p>
            <div className="mb-1">
              <p className="text-sm font-black text-gray-700 dark:text-gray-300">day{streak !== 1 ? 's' : ''}</p>
              <p className="text-[10px] text-gray-400">consecutive</p>
            </div>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
            {streak === 0
              ? 'Log in and take action every day to start your streak.'
              : streak >= 7
              ? `${streak} days strong. Keep the momentum going.`
              : 'Building momentum — come back tomorrow!'}
          </p>
        </div>

      </section>

    </div>
  );
}
