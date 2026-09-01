'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import {
  BarChart2, Eye, Users, TrendingUp, Crown, Loader2,
  RefreshCw, Lock, ArrowUpRight, ArrowDownRight, Calendar,
  UserCheck, Sparkles,
} from 'lucide-react';
import { supabase } from '../../supabaseClient';
import VerifiedBadge from '../../components/VerifiedBadge';
import { useLanguage } from '../../../lib/i18n';

/* Premium-gate feature bullet keys (resolved with t() in render) */
const GATE_FEATURE_KEYS = [
  'gate_feature_1',
  'gate_feature_2',
  'gate_feature_3',
  'gate_feature_4',
];

/* ── Mini bar chart ─────────────────────────────────────── */
function MiniBarChart({ data }) {
  if (!data || data.length === 0) return null;
  const max = Math.max(...data.map(d => d.count), 1);
  return (
    <div className="flex items-end gap-1 h-16">
      {data.map((d, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative">
          <div
            className="w-full bg-blue-500/20 dark:bg-blue-400/20 rounded-t-sm transition-all group-hover:bg-blue-500/40"
            style={{ height: `${Math.max((d.count / max) * 56, 3)}px` }}
          />
          <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[9px] font-bold text-gray-500 dark:text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
            {d.count}
          </span>
        </div>
      ))}
    </div>
  );
}

/* ── Stat card ───────────────────────────────────────────── */
function StatCard({ icon: Icon, label, value, sub, color = 'blue', trend }) {
  const colors = {
    blue:    'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400',
    emerald: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400',
    violet:  'bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400',
    amber:   'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400',
  };
  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-4">
      <div className="flex items-center justify-between mb-3">
        <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${colors[color]}`}>
          <Icon size={16} />
        </div>
        {trend !== undefined && (
          <span className={`flex items-center gap-0.5 text-[10px] font-bold ${trend >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}`}>
            {trend >= 0 ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}
            {Math.abs(trend)}%
          </span>
        )}
      </div>
      <p className="text-2xl font-black text-gray-900 dark:text-gray-100">{value}</p>
      <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mt-0.5">{label}</p>
      {sub && <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">{sub}</p>}
    </div>
  );
}

/* ── Viewer row ──────────────────────────────────────────── */
function ViewerRow({ viewer }) {
  const { t } = useLanguage();
  const initial = (viewer.username?.[0] || '?').toUpperCase();
  const colors  = ['bg-blue-500','bg-violet-500','bg-emerald-500','bg-amber-500','bg-rose-500'];
  const color   = colors[initial.charCodeAt(0) % colors.length];
  const timeAgo = (dt) => {
    const diff = new Date().getTime() - new Date(dt).getTime();
    if (diff < 3600000) return t('analytics.time_minutes', { n: Math.floor(diff / 60000) });
    if (diff < 86400000) return t('analytics.time_hours', { n: Math.floor(diff / 3600000) });
    return t('analytics.time_days', { n: Math.floor(diff / 86400000) });
  };
  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-gray-100 dark:border-gray-800 last:border-0">
      <div className={`w-8 h-8 rounded-full ${color} text-white flex items-center justify-center text-xs font-black shrink-0 overflow-hidden relative`}>
        {viewer.avatar_url
          ? <Image src={viewer.avatar_url} alt={viewer.username} fill className="object-cover" sizes="32px" referrerPolicy="no-referrer" />
          : initial}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1">
          <p className="text-xs font-bold text-gray-900 dark:text-gray-100 truncate">@{viewer.username || t('analytics.anonymous')}</p>
          {viewer.is_verified && <VerifiedBadge size={10} />}
        </div>
        <p className="text-[10px] text-gray-400 dark:text-gray-500 capitalize">{viewer.role || t('analytics.role_member')}</p>
      </div>
      <span className="text-[10px] text-gray-400 dark:text-gray-500 shrink-0">{timeAgo(viewer.viewed_at)}</span>
    </div>
  );
}

/* ── Premium gate overlay ────────────────────────────────── */
function PremiumGate({ onUpgrade }) {
  const { t } = useLanguage();
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <div className="w-16 h-16 bg-gradient-to-br from-amber-400 to-yellow-500 rounded-2xl flex items-center justify-center mb-5 shadow-lg shadow-amber-200 dark:shadow-amber-900/30">
        <Crown size={28} className="text-white" />
      </div>
      <h2 className="text-xl font-black text-gray-900 dark:text-gray-100 mb-2">{t('analytics.gate_title')}</h2>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 max-w-xs leading-relaxed">
        {t('analytics.gate_desc')}
      </p>
      <div className="space-y-2.5 text-left w-full max-w-xs mb-7">
        {GATE_FEATURE_KEYS.map(k => (
          <div key={k} className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <Sparkles size={8} />
            </div>
            <span className="text-xs text-gray-600 dark:text-gray-400">{t(`analytics.${k}`)}</span>
          </div>
        ))}
      </div>
      <button
        onClick={onUpgrade}
        className="flex items-center gap-2 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-white text-sm font-black px-6 py-3 rounded-xl shadow-md shadow-amber-200 dark:shadow-amber-900/30 transition-all active:scale-95"
      >
        <Crown size={15} /> {t('analytics.gate_upgrade')}
      </button>
    </div>
  );
}

/* ── Main component ──────────────────────────────────────── */
export default function AnalyticsContent() {
  const router = useRouter();
  const { t } = useLanguage();
  const [loading, setLoading]         = useState(true);
  const [refreshing, setRefreshing]   = useState(false);
  const [analytics, setAnalytics]     = useState(null);
  const [isPremium, setIsPremium]     = useState(false);
  const [error, setError]             = useState(null);

  const load = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true); else setLoading(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push('/auth'); return; }

      const res  = await fetch('/api/analytics/profile', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const data = await res.json();

      if (res.status === 403 && data.premium_required) {
        setIsPremium(false);
      } else if (!res.ok) {
        setError(data.error || '__load_failed__');
      } else {
        setAnalytics(data);
        setIsPremium(true);
      }
    } catch {
      setError('__network_error__');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [router]);

  useEffect(() => {
    const init = () => { load(); };
    init();
  }, [load]);

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-8 w-48 bg-gray-200 dark:bg-gray-800 rounded-xl" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <div key={i} className="h-24 bg-gray-100 dark:bg-gray-800 rounded-2xl" />)}
        </div>
        <div className="h-48 bg-gray-100 dark:bg-gray-800 rounded-2xl" />
      </div>
    );
  }

  if (!isPremium) {
    return <PremiumGate onUpgrade={() => router.push('/dash/premium')} />;
  }

  if (error) {
    const errorMsg =
      error === '__load_failed__'   ? t('analytics.error_load')
      : error === '__network_error__' ? t('analytics.error_network')
      : error;
    return (
      <div className="flex flex-col items-center py-16 gap-4 text-center">
        <p className="text-sm text-gray-500 dark:text-gray-400">{errorMsg}</p>
        <button onClick={() => load()} className="text-xs font-bold text-blue-500 hover:underline">{t('analytics.retry')}</button>
      </div>
    );
  }

  const a = analytics;

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[3px] text-gray-400 dark:text-gray-500">{t('analytics.career')}</p>
          <h1 className="text-xl font-black text-gray-900 dark:text-gray-100">{t('analytics.title')}</h1>
        </div>
        <button
          onClick={() => load(true)}
          disabled={refreshing}
          className="flex items-center gap-2 text-xs font-bold text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-all"
        >
          <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
          {t('analytics.refresh')}
        </button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard icon={Eye}     label={t('analytics.stat_total_views')}    value={a.total_views}  color="blue"    sub={t('analytics.stat_all_time')} />
        <StatCard icon={Calendar} label={t('analytics.stat_views_7d')} value={a.views_7d}   color="violet"  sub={t('analytics.stat_last_week')} />
        <StatCard icon={TrendingUp} label={t('analytics.stat_views_30d')} value={a.views_30d} color="emerald" sub={t('analytics.stat_last_month')} />
        <StatCard icon={Users}   label={t('analytics.stat_connections')}   value={a.connections}   color="amber"   sub={t('analytics.stat_accepted')} />
      </div>

      {/* Chart */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center">
              <BarChart2 size={14} className="text-white" />
            </div>
            <p className="text-sm font-black text-gray-900 dark:text-gray-100">{t('analytics.chart_title')}</p>
          </div>
        </div>
        <MiniBarChart data={a.daily_chart} />
        <div className="flex items-end justify-between mt-2">
          {(a.daily_chart || []).map((d, i) => (
            <span key={i} className="flex-1 text-center text-[9px] text-gray-400 dark:text-gray-500 truncate">{d.date}</span>
          ))}
        </div>
      </div>

      {/* Who viewed you */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-7 h-7 bg-violet-600 rounded-lg flex items-center justify-center">
            <UserCheck size={14} className="text-white" />
          </div>
          <p className="text-sm font-black text-gray-900 dark:text-gray-100">{t('analytics.visitors_title')}</p>
          <span className="ml-auto text-[10px] font-bold text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-900/20 px-2 py-0.5 rounded-full border border-violet-200 dark:border-violet-800/40">
            {t('analytics.premium_badge')}
          </span>
        </div>

        {(a.recent_viewers || []).length === 0 ? (
          <p className="text-xs text-gray-400 dark:text-gray-500 text-center py-4">{t('analytics.no_visitors')}</p>
        ) : (
          <div>
            {a.recent_viewers.map((v, i) => <ViewerRow key={i} viewer={v} />)}
          </div>
        )}
      </div>

      {/* Growth tip */}
      <div className="bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl p-5 text-white">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles size={16} className="text-blue-200" />
          <p className="text-sm font-black">{t('analytics.tip_title')}</p>
        </div>
        <p className="text-xs text-blue-100 leading-relaxed mb-3">
          {t('analytics.tip_body_1')}<strong className="text-white">{t('analytics.tip_body_strong')}</strong>{t('analytics.tip_body_2')}
        </p>
        <button
          onClick={() => router.push('/dash/profile')}
          className="flex items-center gap-2 bg-white/20 hover:bg-white/30 transition-all text-white text-xs font-black px-4 py-2 rounded-xl active:scale-95"
        >
          {t('analytics.edit_profile')} <ArrowUpRight size={13} />
        </button>
      </div>

    </div>
  );
}
