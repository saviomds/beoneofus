"use client";

import { useState, useEffect } from 'react';
import { X, ArrowRight, MessageCircle, Hash, TrendingUp, Zap, Star, Sparkles, Users, Flame } from 'lucide-react';
import { supabase } from '../supabaseClient';

const DISCUSS_ACTIONS = [
  { label: 'Trending',       icon: TrendingUp,    color: 'blue'   },
  { label: 'Ask a Question', icon: MessageCircle, color: 'violet' },
  { label: 'Share Update',   icon: Zap,           color: 'indigo' },
];

const DISCOVER_ACTIONS = [
  { label: 'All Channels', icon: Hash,     color: 'blue'   },
  { label: 'Top Members',  icon: Star,     color: 'violet' },
  { label: 'New Nodes',    icon: Sparkles, color: 'indigo' },
];

const colorMap = {
  blue:   'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-100 dark:border-blue-500/20 hover:bg-blue-100 dark:hover:bg-blue-500/20',
  violet: 'bg-violet-50 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-100 dark:border-violet-500/20 hover:bg-violet-100 dark:hover:bg-violet-500/20',
  indigo: 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-100 dark:border-indigo-500/20 hover:bg-indigo-100 dark:hover:bg-indigo-500/20',
};

export default function QuickViewModal({ type, onClose, onNavigate }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [todayCount, setTodayCount] = useState(0);

  const isDiscuss = type === 'discuss';
  const target = isDiscuss ? 'feed' : 'groups';
  const Icon = isDiscuss ? MessageCircle : Hash;
  const quickActions = isDiscuss ? DISCUSS_ACTIONS : DISCOVER_ACTIONS;
  const gradient = isDiscuss
    ? 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)'
    : 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)';

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        if (isDiscuss) {
          const todayISO = new Date(new Date().setHours(0, 0, 0, 0)).toISOString();
          const [{ data: posts }, { count: tot }, { count: tod }] = await Promise.all([
            supabase.from('posts').select('id, title, content, created_at').order('created_at', { ascending: false }).limit(4),
            supabase.from('posts').select('*', { count: 'exact', head: true }),
            supabase.from('posts').select('*', { count: 'exact', head: true }).gte('created_at', todayISO),
          ]);
          if (posts) setItems(posts);
          setTotal(tot || 0);
          setTodayCount(tod || 0);
        } else {
          const [{ data: groups }, { count: tot }] = await Promise.all([
            supabase.from('groups').select('id, name, description, created_at').eq('is_private', false).order('created_at', { ascending: false }).limit(4),
            supabase.from('groups').select('*', { count: 'exact', head: true }).eq('is_private', false),
          ]);
          if (groups) setItems(groups);
          setTotal(tot || 0);
        }
      } catch (err) {
        console.error('QuickViewModal fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    const table = isDiscuss ? 'posts' : 'groups';
    const channel = supabase.channel(`quickview-${type}`)
      .on('postgres_changes', { event: '*', schema: 'public', table }, fetchData)
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [type, isDiscuss]);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-xl" onClick={onClose} />

      <div className="relative w-full max-w-2xl bg-white dark:bg-gray-950 border border-gray-200 dark:border-white/[0.06] rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">

        {/* ── Gradient header ── */}
        <div className="relative h-32 overflow-hidden" style={{ background: gradient }}>
          <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.10) 1px, transparent 1px)', backgroundSize: '18px 18px' }} />
          <div className="absolute inset-0 bg-gradient-to-t from-black/25 to-transparent" />

          <div className="absolute bottom-5 left-6 flex items-end gap-3">
            <div className="w-11 h-11 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center border border-white/25 shrink-0">
              <Icon size={20} className="text-white" />
            </div>
            <div>
              <p className="text-[9px] font-black text-white/65 uppercase tracking-[4px] mb-0.5">
                {isDiscuss ? 'Community Forums' : 'Global Nodes'}
              </p>
              <h2 className="text-2xl font-black text-white tracking-tight leading-none">
                {isDiscuss ? 'Live Discussions' : 'Discover Channels'}
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 bg-white/15 hover:bg-white/25 rounded-xl text-white transition-all"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-5">
          {/* ── Stats row ── */}
          <div className="flex items-stretch gap-3 mb-5">
            <div className="flex-1 flex flex-col items-center justify-center bg-gray-50 dark:bg-white/[0.04] border border-gray-100 dark:border-white/[0.06] rounded-2xl px-4 py-3">
              <p className="text-xl font-black text-gray-900 dark:text-white">{total}</p>
              <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mt-0.5">{isDiscuss ? 'Posts' : 'Channels'}</p>
            </div>
            {isDiscuss && (
              <div className="flex-1 flex flex-col items-center justify-center bg-violet-50 dark:bg-violet-500/10 border border-violet-100 dark:border-violet-500/20 rounded-2xl px-4 py-3">
                <p className="text-xl font-black text-violet-600 dark:text-violet-400">{todayCount}</p>
                <p className="text-[10px] font-bold text-violet-400 uppercase tracking-wider mt-0.5">Today</p>
              </div>
            )}
            <div className="flex-1 flex flex-col items-center justify-center bg-gray-50 dark:bg-white/[0.04] border border-gray-100 dark:border-white/[0.06] rounded-2xl px-4 py-3">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <p className="text-xl font-black text-gray-900 dark:text-white">Live</p>
              </div>
              <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mt-0.5">Status</p>
            </div>
            <div className="flex-1 flex flex-col items-center justify-center bg-gray-50 dark:bg-white/[0.04] border border-gray-100 dark:border-white/[0.06] rounded-2xl px-4 py-3">
              <div className="flex items-center gap-1">
                <Flame size={16} className="text-violet-500" />
                <p className="text-xl font-black text-gray-900 dark:text-white">{items.length}</p>
              </div>
              <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mt-0.5">Recent</p>
            </div>
          </div>

          {/* ── Cards grid (all same h-24) ── */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            {loading ? (
              [1, 2, 3, 4].map(i => (
                <div key={i} className="h-24 bg-gray-100 dark:bg-white/[0.04] rounded-2xl animate-pulse" />
              ))
            ) : items.length > 0 ? items.map(item => (
              <div
                key={item.id}
                onClick={() => onNavigate(target)}
                className="h-24 flex flex-col p-3.5 bg-white dark:bg-gray-900/70 border border-gray-100 dark:border-white/[0.06] rounded-2xl hover:border-blue-200 dark:hover:border-blue-500/20 hover:shadow-lg hover:-translate-y-0.5 cursor-pointer group transition-all duration-200"
              >
                <div className="flex items-start gap-2 mb-auto">
                  <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${isDiscuss ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-500 dark:text-blue-400' : 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-500 dark:text-indigo-400'}`}>
                    <Icon size={12} />
                  </div>
                  <p className="text-[13px] font-bold text-gray-900 dark:text-gray-100 line-clamp-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors leading-snug">
                    {item.title || item.name || 'Untitled'}
                  </p>
                </div>
                <p className="text-[10px] text-gray-400 dark:text-gray-500 line-clamp-1 font-medium mt-1">
                  {item.content || item.description || 'Join the conversation'}
                </p>
              </div>
            )) : (
              <div className="col-span-2 h-24 flex items-center justify-center text-sm text-gray-400 dark:text-gray-500 font-medium bg-gray-50 dark:bg-white/[0.02] rounded-2xl border border-dashed border-gray-200 dark:border-white/[0.08]">
                Nothing here yet — be the first!
              </div>
            )}
          </div>

          {/* ── Quick action chips ── */}
          <div className="flex items-center gap-2 mb-4 overflow-x-auto no-scrollbar pb-0.5">
            {quickActions.map(({ label, icon: ActionIcon, color }) => (
              <button
                key={label}
                onClick={() => onNavigate(target)}
                className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-wider border transition-all ${colorMap[color]}`}
              >
                <ActionIcon size={12} /> {label}
              </button>
            ))}
          </div>

          {/* ── CTA ── */}
          <button
            onClick={() => onNavigate(target)}
            className="flex items-center justify-center gap-2 w-full py-3.5 bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 text-white rounded-2xl font-black uppercase tracking-widest text-xs transition-all shadow-lg shadow-blue-500/20 active:scale-[0.98]"
          >
            Enter Full View <ArrowRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
