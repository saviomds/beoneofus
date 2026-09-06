'use client';

import { useEffect, useState, useCallback } from 'react';
import Image from 'next/image';
import { History, RefreshCw, Search, ChevronDown, Loader2 } from 'lucide-react';
import { supabase } from '../supabaseClient';

// Human-readable label + category per action. Category drives the filter chips.
const ACTION_META: Record<string, { label: string; category: string }> = {
  delete_user:              { label: 'Deleted user',              category: 'User' },
  self_delete_account:      { label: 'Deleted own account',       category: 'User' },
  grant_admin:              { label: 'Granted admin',             category: 'User' },
  revoke_admin:             { label: 'Revoked admin',             category: 'User' },
  update_user_flags:        { label: 'Updated user flags',        category: 'User' },
  suspend_user:             { label: 'Suspended user',            category: 'User' },
  unsuspend_user:           { label: 'Reinstated user',           category: 'User' },
  revoke_access:            { label: 'Revoked access',            category: 'User' },
  promote_to_founder:       { label: 'Promoted to co-founder',    category: 'User' },
  premium_accept:           { label: 'Approved premium',          category: 'Money' },
  premium_decline:          { label: 'Declined premium',          category: 'Money' },
  update_paystack_keys:     { label: 'Rotated Paystack keys',     category: 'Money' },
  accept_application:       { label: 'Accepted application',      category: 'Decisions' },
  decline_application:      { label: 'Declined application',      category: 'Decisions' },
  revoke_application:       { label: 'Revoked application',       category: 'Decisions' },
  update_platform_settings: { label: 'Updated platform settings', category: 'System' },
  delete_platform_setting:  { label: 'Deleted platform setting',  category: 'System' },
  update_platform_version:  { label: 'Updated platform version',  category: 'System' },
  resolve_error_log:        { label: 'Resolved error log',        category: 'System' },
};
const CATEGORIES = ['All', 'User', 'Money', 'Decisions', 'System'];

function getRelativeTime(dateStr: string) {
  if (!dateStr) return '';
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 60) return 'Just now';
  if (diff < 3600) return Math.floor(diff / 60) + 'm ago';
  if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
  return Math.floor(diff / 86400) + 'd ago';
}

function Avatar({ username, avatarUrl }: { username?: string | null; avatarUrl?: string | null }) {
  return (
    <div className="relative w-8 h-8 rounded-full overflow-hidden flex items-center justify-center text-white text-[10px] font-black shrink-0"
      style={{ background: avatarUrl ? undefined : 'linear-gradient(135deg,#94a3b8,#64748b)' }}>
      {avatarUrl
        ? <Image src={avatarUrl} alt="" fill sizes="32px" className="object-cover" />
        : (username?.slice(0, 2).toUpperCase() || '?')}
    </div>
  );
}

export default function AuditLogTab() {
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('All');
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchEntries = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('admin_audit_log')
      .select(`
        *,
        actor:profiles!admin_audit_log_actor_id_fkey(username, avatar_url),
        target:profiles!admin_audit_log_target_user_id_fkey(username, avatar_url)
      `)
      .order('created_at', { ascending: false })
      .limit(200);
    if (!error) setEntries(data || []);
    setLoading(false);
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- initial load on mount
  useEffect(() => { fetchEntries(); }, [fetchEntries]);

  const q = search.trim().toLowerCase();
  const filtered = entries.filter(e => {
    const meta = ACTION_META[e.action];
    if (category !== 'All' && meta?.category !== category) return false;
    if (!q) return true;
    return e.actor?.username?.toLowerCase().includes(q) || e.target?.username?.toLowerCase().includes(q) || e.action.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0"
            style={{ background: 'linear-gradient(135deg,#0f172a,#334155)' }}>
            <History size={17} className="text-white" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">Accountability</p>
            <h2 className="text-xl font-black text-gray-900 leading-tight flex items-center gap-2">
              Audit Log
              <span className="text-xs font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-lg">{filtered.length}</span>
            </h2>
          </div>
        </div>
        <button onClick={fetchEntries} className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-gray-50 rounded-xl text-xs font-bold text-gray-500 hover:text-gray-800 border border-gray-200 transition-all shadow-sm">
          <RefreshCw size={12} /> Refresh
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by actor, target, or action…"
            className="w-full bg-white border border-gray-200 rounded-xl py-2.5 pl-9 pr-4 text-xs text-gray-900 focus:outline-none focus:border-gray-400 transition-all" />
        </div>
        <div className="flex gap-1 p-1 bg-gray-100 rounded-xl shrink-0 overflow-x-auto">
          {CATEGORIES.map(c => (
            <button key={c} onClick={() => setCategory(c)}
              className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold whitespace-nowrap transition-all ${category === c ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}>
              {c}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="py-12 flex justify-center"><Loader2 className="animate-spin text-gray-400" size={24} /></div>
      ) : filtered.length === 0 ? (
        <div className="py-12 text-center text-gray-400 text-sm">No admin actions recorded yet.</div>
      ) : (
        <div className="space-y-2">
          {filtered.map(entry => {
            const meta = ACTION_META[entry.action] || { label: entry.action, category: 'System' };
            const open = expandedId === entry.id;
            const hasDetails = entry.details && Object.keys(entry.details).length > 0;
            return (
              <div key={entry.id} className="bg-white rounded-2xl border border-gray-100 transition-all hover:shadow-sm">
                <button
                  onClick={() => hasDetails && setExpandedId(open ? null : entry.id)}
                  className={`w-full flex items-center gap-3 p-3.5 text-left ${hasDetails ? 'cursor-pointer' : 'cursor-default'}`}
                >
                  <Avatar username={entry.actor?.username} avatarUrl={entry.actor?.avatar_url} />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-gray-800 truncate">
                      <span className="font-black">@{entry.actor?.username || 'unknown'}</span>
                      {' '}<span className="text-gray-500">{meta.label.toLowerCase()}</span>
                      {entry.target?.username && (
                        <> — <span className="font-black">@{entry.target.username}</span></>
                      )}
                    </p>
                    <p className="text-[10px] text-gray-400 mt-0.5">{meta.category} · {getRelativeTime(entry.created_at)}</p>
                  </div>
                  {hasDetails && <ChevronDown size={13} className={`text-gray-300 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />}
                </button>
                {open && hasDetails && (
                  <div className="px-3.5 pb-3.5">
                    <pre className="text-[10px] text-gray-500 bg-gray-50 rounded-xl p-3 overflow-x-auto whitespace-pre-wrap">
                      {JSON.stringify(entry.details, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
