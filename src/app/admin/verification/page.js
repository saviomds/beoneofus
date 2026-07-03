'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '../../supabaseClient';
import { orgMeta } from '../../../lib/orgTypes';
import {
  ShieldCheck, ArrowLeft, Loader2, Lock, FileText, ExternalLink,
  Check, X, Clock, Inbox,
} from 'lucide-react';

export default function AdminVerification() {
  const router = useRouter();
  const [state, setState] = useState('loading'); // loading | ready | denied
  const [token, setToken] = useState(null);
  const [tab, setTab] = useState('pending');
  const [requests, setRequests] = useState([]);
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async (status, tok) => {
    const res = await fetch(`/api/admin/verification?status=${status}`, { headers: { Authorization: `Bearer ${tok}` } });
    if (res.status === 403) { setState('denied'); return; }
    const data = await res.json().catch(() => ({}));
    setRequests(data.requests || []);
    setState('ready');
  }, []);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.replace('/auth?next=/admin/verification'); return; }
      setToken(session.access_token);
      load('pending', session.access_token);
    })();
  }, [router, load]);

  const switchTab = (t) => { setTab(t); setState('loading'); load(t, token); };

  const act = async (id, action) => {
    setBusyId(id);
    await fetch('/api/admin/verification', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ id, action }),
    });
    setBusyId(null);
    setRequests((rs) => rs.filter((r) => r.id !== id));
  };

  if (state === 'loading') {
    return <div className="min-h-screen bg-ink flex items-center justify-center"><Loader2 className="animate-spin text-brand-400" size={26} /></div>;
  }
  if (state === 'denied') {
    return (
      <div className="min-h-screen bg-ink text-gray-200 flex flex-col items-center justify-center px-6 text-center">
        <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center text-gray-500 mb-5"><Lock size={24} /></div>
        <h1 className="text-xl font-black text-white">Admins only</h1>
        <p className="text-sm text-gray-400 mt-1.5 mb-6">This trust-review console is restricted to platform administrators.</p>
        <Link href="/dash/home" className="text-sm font-bold bg-brand-500 hover:bg-brand-600 text-white px-5 py-2.5 rounded-xl transition-colors">Back to dashboard</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ink text-gray-200">
      <header className="sticky top-0 z-40 bg-ink/90 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-3">
          <Link href="/dash/home" className="text-gray-400 hover:text-white transition-colors"><ArrowLeft size={18} /></Link>
          <ShieldCheck size={18} className="text-trust-500" />
          <span className="font-black text-white text-sm">Trust &amp; Verification review</span>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex gap-1.5 mb-6">
          {['pending', 'approved', 'rejected'].map((t) => (
            <button key={t} onClick={() => switchTab(t)}
              className={`px-4 py-2 rounded-xl text-sm font-bold capitalize transition-all ${tab === t ? 'bg-brand-500 text-white' : 'bg-white/5 text-gray-400 hover:text-white'}`}>
              {t}
            </button>
          ))}
        </div>

        {requests.length === 0 ? (
          <div className="bg-white/[0.03] border border-white/10 rounded-2xl py-16 text-center">
            <Inbox size={26} className="text-gray-600 mx-auto mb-3" />
            <p className="font-bold text-white">Nothing {tab}</p>
            <p className="text-sm text-gray-500 mt-1">The {tab} queue is empty.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {requests.map((r) => {
              const org = r.organizations;
              const meta = org ? orgMeta(org.type) : null;
              const Icon = meta?.icon || ShieldCheck;
              return (
                <div key={r.id} className="bg-white/[0.03] border border-white/10 rounded-2xl p-5">
                  <div className="flex items-start gap-3.5">
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-brand-500 to-trust-500 flex items-center justify-center shrink-0"><Icon size={20} className="text-white" /></div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-bold text-white">{org?.name || 'Organization'}</p>
                        {meta && <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">{meta.label}</span>}
                        {org?.is_verified && <span className="text-[10px] font-bold text-trust-500">already verified</span>}
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Requested by {r.profiles?.full_name || r.profiles?.username || 'user'} · <Clock size={10} className="inline" /> {new Date(r.created_at).toLocaleDateString()}
                      </p>
                      <div className="flex flex-wrap gap-x-5 gap-y-1 mt-2.5 text-sm text-gray-300">
                        {r.registration_number && <span>Reg #: <span className="font-mono text-white">{r.registration_number}</span></span>}
                        {org?.slug && <Link href={`/organizations/${org.slug}`} className="text-brand-400 hover:text-brand-300 inline-flex items-center gap-1">Public page <ExternalLink size={11} /></Link>}
                        {r.document_signed_url
                          ? <a href={r.document_signed_url} target="_blank" rel="noreferrer" className="text-trust-500 hover:underline inline-flex items-center gap-1"><FileText size={13} /> View document</a>
                          : <span className="text-gray-500 inline-flex items-center gap-1"><FileText size={13} /> No document</span>}
                      </div>
                      {r.note && <p className="text-sm text-gray-400 mt-2 italic">“{r.note}”</p>}
                    </div>
                  </div>

                  {tab === 'pending' && (
                    <div className="flex gap-2 mt-4 justify-end">
                      <button onClick={() => act(r.id, 'reject')} disabled={busyId === r.id}
                        className="inline-flex items-center gap-1.5 bg-white/5 hover:bg-red-500/15 text-gray-300 hover:text-red-400 px-4 py-2 rounded-xl text-sm font-bold transition-all disabled:opacity-50">
                        <X size={15} /> Reject
                      </button>
                      <button onClick={() => act(r.id, 'approve')} disabled={busyId === r.id}
                        className="inline-flex items-center gap-1.5 bg-trust-500 hover:bg-trust-600 text-ink px-4 py-2 rounded-xl text-sm font-bold transition-all disabled:opacity-50">
                        {busyId === r.id ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />} Approve &amp; verify
                      </button>
                    </div>
                  )}
                  {tab !== 'pending' && r.review_note && <p className="text-xs text-gray-500 mt-3">Review note: {r.review_note}</p>}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
