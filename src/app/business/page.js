'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '../supabaseClient';
import { orgMeta } from '../../lib/orgTypes';
import { ArrowLeft, Plus, ChevronRight, Loader2, Building2, ShieldCheck } from 'lucide-react';

export default function BusinessSwitcher() {
  const router = useRouter();
  const [orgs, setOrgs] = useState([]);
  const [state, setState] = useState('loading');

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.replace('/auth?next=/business'); return; }
      const { data } = await supabase
        .from('organization_members')
        .select('role, organizations(id, slug, name, type, tagline, is_verified, verification_status)')
        .eq('user_id', session.user.id);
      const list = (data || [])
        .filter((r) => r.organizations && ['owner', 'admin', 'recruiter', 'program_manager'].includes(r.role))
        .map((r) => ({ ...r.organizations, myRole: r.role }));
      setOrgs(list);
      setState('ready');
    })();
  }, [router]);

  if (state === 'loading') {
    return <div className="min-h-screen bg-ink flex items-center justify-center"><Loader2 className="animate-spin text-brand-400" size={26} /></div>;
  }

  return (
    <div className="min-h-screen bg-ink text-gray-200">
      <header className="sticky top-0 z-40 bg-ink/90 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Link href="/dash/home" className="flex items-center gap-2 text-sm font-bold text-gray-400 hover:text-white transition-colors">
            <ArrowLeft size={16} /> Personal
          </Link>
          <span className="text-[11px] font-mono uppercase tracking-widest text-gray-500">Business</span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-black text-white tracking-tight">Your organizations</h1>
          <p className="text-gray-400 mt-1.5">Switch into a business console to manage postings, talent, and verification.</p>
        </div>

        {orgs.length === 0 ? (
          <div className="bg-white/[0.03] border border-white/10 rounded-2xl py-16 text-center">
            <div className="w-12 h-12 rounded-2xl bg-brand-500/15 text-brand-400 flex items-center justify-center mx-auto mb-4"><Building2 size={22} /></div>
            <p className="font-bold text-white">No organizations yet</p>
            <p className="text-sm text-gray-500 mt-1 mb-5">Create one to open a business console.</p>
            <Link href="/organizations/new" className="inline-flex items-center gap-1.5 text-sm font-bold bg-brand-500 hover:bg-brand-600 text-white px-4 py-2.5 rounded-xl transition-colors">
              <Plus size={15} /> Create organization
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {orgs.map((o) => {
              const meta = orgMeta(o.type);
              const Icon = meta.icon;
              return (
                <Link key={o.id} href={`/business/${o.slug}`} className="group flex items-center gap-4 bg-white/[0.03] border border-white/10 hover:border-brand-500/40 rounded-2xl p-4 transition-all">
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-brand-500 to-trust-500 flex items-center justify-center shrink-0"><Icon size={20} className="text-white" /></div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="font-bold text-white truncate">{o.name}</p>
                      {o.is_verified && <ShieldCheck size={14} className="text-trust-500 shrink-0" />}
                    </div>
                    <p className="text-xs text-gray-500 capitalize">{meta.label} · {o.myRole}</p>
                  </div>
                  <ChevronRight size={18} className="text-gray-600 group-hover:text-brand-400 transition-colors shrink-0" />
                </Link>
              );
            })}
            <Link href="/organizations/new" className="flex items-center justify-center gap-1.5 text-sm font-bold text-gray-400 hover:text-white border border-dashed border-white/15 hover:border-white/30 rounded-2xl py-4 transition-all">
              <Plus size={15} /> Create another organization
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}
