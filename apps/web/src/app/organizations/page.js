'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Building2, ArrowLeft, Plus, Search, ShieldCheck, MapPin, Globe,
} from 'lucide-react';
import { orgMeta, ORG_TYPE_ORDER } from '../../lib/orgTypes';

const FILTERS = ['all', ...ORG_TYPE_ORDER];

export default function OrganizationsDirectory() {
  const [orgs, setOrgs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [type, setType] = useState('all');
  const [q, setQ] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (type !== 'all') params.set('type', type);
    if (q.trim()) params.set('q', q.trim());
    try {
      const res = await fetch(`/api/organizations?${params.toString()}`);
      const data = await res.json().catch(() => ({}));
      setOrgs(data.organizations || []);
    } catch {
      setOrgs([]);
    } finally {
      setLoading(false);
    }
  }, [type, q]);

  useEffect(() => {
    const t = setTimeout(load, q ? 300 : 0);
    return () => clearTimeout(t);
  }, [load, q]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-ink text-gray-900 dark:text-gray-100">
      <header className="sticky top-0 z-40 bg-white/85 dark:bg-ink/85 backdrop-blur-xl border-b border-gray-100 dark:border-white/10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-sm font-bold text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
            <ArrowLeft size={16} /> Home
          </Link>
          <Link href="/organizations/new" className="inline-flex items-center gap-1.5 text-sm font-bold bg-brand-500 hover:bg-brand-600 text-white px-4 py-2 rounded-xl transition-colors shadow-sm shadow-brand-500/30">
            <Plus size={15} /> New organization
          </Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
        <div className="mb-7">
          <h1 className="text-3xl font-black tracking-tight">Organizations</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1.5">Businesses, governments, schools, healthcare providers, and NGOs on the graph.</p>
        </div>

        {/* Search + filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-7">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by name, sector, or location…"
              className="w-full bg-white dark:bg-white/[0.05] border border-gray-200 dark:border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-brand-500/30 transition-all"
            />
          </div>
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
            {FILTERS.map((f) => (
              <button
                key={f}
                onClick={() => setType(f)}
                className={`shrink-0 px-3.5 py-2 rounded-xl text-xs font-bold capitalize transition-all ${
                  type === f
                    ? 'bg-brand-500 text-white shadow-sm shadow-brand-500/30'
                    : 'bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                {f === 'all' ? 'All' : orgMeta(f).label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-32 rounded-2xl bg-gray-100 dark:bg-white/[0.03] border border-gray-200 dark:border-white/5 animate-pulse" />
            ))}
          </div>
        ) : orgs.length === 0 ? (
          <div className="text-center py-20 rounded-2xl border border-dashed border-gray-200 dark:border-white/10">
            <div className="w-12 h-12 rounded-2xl bg-brand-50 dark:bg-brand-500/15 text-brand-500 flex items-center justify-center mx-auto mb-4">
              <Building2 size={22} />
            </div>
            <p className="font-bold text-gray-900 dark:text-white">No organizations yet</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 mb-5">Be the first institution on the graph.</p>
            <Link href="/organizations/new" className="inline-flex items-center gap-1.5 text-sm font-bold bg-brand-500 hover:bg-brand-600 text-white px-4 py-2.5 rounded-xl transition-colors">
              <Plus size={15} /> Create organization
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {orgs.map((o) => {
              const meta = orgMeta(o.type);
              const Icon = meta.icon;
              return (
                <Link
                  key={o.id}
                  href={`/organizations/${o.slug}`}
                  className={`group p-5 rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/[0.03] ${meta.accent.ring} hover:shadow-lg transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500`}
                >
                  <div className="flex items-start gap-3.5">
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${meta.accent.icon}`}>
                      {o.logo_url
                        ? <Image src={o.logo_url} alt="" width={44} height={44} unoptimized className="w-full h-full object-cover rounded-xl" referrerPolicy="no-referrer" />
                        : <Icon size={20} />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <h3 className="font-bold text-gray-900 dark:text-white truncate group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">{o.name}</h3>
                        {o.is_verified && <ShieldCheck size={15} className="text-trust-500 shrink-0" />}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${meta.accent.chip}`}>{meta.label}</span>
                        {o.sector && <span className="text-xs text-gray-400 truncate">{o.sector}</span>}
                      </div>
                      {o.tagline && <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 line-clamp-2 leading-relaxed">{o.tagline}</p>}
                      <div className="flex items-center gap-3 mt-3 text-xs text-gray-400">
                        {o.location && <span className="inline-flex items-center gap-1"><MapPin size={12} />{o.location}</span>}
                        {o.website && <span className="inline-flex items-center gap-1"><Globe size={12} />Website</span>}
                        {o.hiring && <span className="inline-flex items-center gap-1 text-trust-600 dark:text-trust-500 font-bold">Hiring</span>}
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
