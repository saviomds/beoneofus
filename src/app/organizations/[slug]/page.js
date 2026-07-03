'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '../../supabaseClient';
import { orgMeta } from '../../../lib/orgTypes';
import {
  ArrowLeft, ShieldCheck, MapPin, Globe, CalendarDays, Users2,
  Building2, Mail, ExternalLink, LayoutDashboard,
} from 'lucide-react';

function VerifiedPill({ status, isVerified }) {
  if (isVerified) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full bg-trust-50 dark:bg-trust-500/15 text-trust-600 dark:text-trust-500">
        <ShieldCheck size={13} /> Verified
      </span>
    );
  }
  if (status === 'pending') {
    return <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-premium-50 dark:bg-premium-500/15 text-premium-600 dark:text-premium-500">Verification pending</span>;
  }
  return <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-gray-400">Unverified</span>;
}

export default function OrganizationProfile() {
  const { slug } = useParams();
  const [org, setOrg] = useState(null);
  const [members, setMembers] = useState([]);
  const [canManage, setCanManage] = useState(false);
  const [state, setState] = useState('loading'); // loading | ready | notfound

  useEffect(() => {
    let active = true;
    (async () => {
      const { data: o, error } = await supabase
        .from('organizations')
        .select('*, profiles!organizations_owner_id_fkey(username, full_name, avatar_url)')
        .eq('slug', slug)
        .maybeSingle();
      if (!active) return;
      if (error || !o) { setState('notfound'); return; }
      setOrg(o);
      setState('ready');
      const { data: m } = await supabase
        .from('organization_members')
        .select('role, title, profiles!organization_members_user_id_fkey(username, full_name, avatar_url)')
        .eq('organization_id', o.id)
        .order('created_at', { ascending: true })
        .limit(24);
      if (active) setMembers(m || []);

      // Show a "Manage" entry point if the viewer owns/manages this org
      const { data: { session } } = await supabase.auth.getSession();
      if (active && session) {
        if (o.owner_id === session.user.id) setCanManage(true);
        else {
          const { data: mem } = await supabase
            .from('organization_members').select('role')
            .eq('organization_id', o.id).eq('user_id', session.user.id).maybeSingle();
          if (active && mem && ['owner', 'admin', 'recruiter', 'program_manager'].includes(mem.role)) setCanManage(true);
        }
      }
    })();
    return () => { active = false; };
  }, [slug]);

  if (state === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-ink">
        <div className="h-40 bg-gray-100 dark:bg-white/[0.03] animate-pulse" />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 -mt-10">
          <div className="w-20 h-20 rounded-2xl bg-gray-200 dark:bg-white/10 animate-pulse" />
          <div className="h-7 w-64 bg-gray-200 dark:bg-white/10 rounded-lg mt-4 animate-pulse" />
          <div className="h-4 w-80 bg-gray-100 dark:bg-white/5 rounded mt-3 animate-pulse" />
        </div>
      </div>
    );
  }

  if (state === 'notfound') {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-ink flex flex-col items-center justify-center px-6 text-center">
        <div className="w-14 h-14 rounded-2xl bg-gray-100 dark:bg-white/5 flex items-center justify-center text-gray-400 mb-5">
          <Building2 size={24} />
        </div>
        <h1 className="text-xl font-black text-gray-900 dark:text-white">Organization not found</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1.5 mb-6">It may have been removed, or the link is incorrect.</p>
        <Link href="/organizations" className="text-sm font-bold bg-brand-500 hover:bg-brand-600 text-white px-5 py-2.5 rounded-xl transition-colors">
          Browse organizations
        </Link>
      </div>
    );
  }

  const meta = orgMeta(org.type);
  const Icon = meta.icon;
  const owner = org.profiles;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-ink text-gray-900 dark:text-gray-100">
      {/* Back bar */}
      <header className="sticky top-0 z-40 bg-white/85 dark:bg-ink/85 backdrop-blur-xl border-b border-gray-100 dark:border-white/10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Link href="/organizations" className="flex items-center gap-2 text-sm font-bold text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
            <ArrowLeft size={16} /> Organizations
          </Link>
          {canManage && (
            <Link href={`/business/${slug}`} className="inline-flex items-center gap-1.5 text-sm font-bold bg-ink dark:bg-white/10 text-white px-3.5 py-1.5 rounded-lg hover:opacity-90 transition-opacity">
              <LayoutDashboard size={14} /> Manage
            </Link>
          )}
        </div>
      </header>

      {/* Banner */}
      <div className="relative h-40 sm:h-52 bg-gradient-to-br from-ink-soft to-ink overflow-hidden">
        {org.banner_url
          ? <img src={org.banner_url} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
          : <div className="absolute inset-0" style={{ background: 'radial-gradient(60% 120% at 80% 0%, rgba(76,95,245,.35), transparent 60%)' }} />}
      </div>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 pb-20">
        {/* Header card */}
        <div className="relative -mt-12 flex flex-col sm:flex-row sm:items-end gap-4">
          <div className="w-24 h-24 rounded-2xl border-4 border-gray-50 dark:border-ink bg-white dark:bg-white/5 shadow-lg flex items-center justify-center overflow-hidden shrink-0">
            {org.logo_url
              ? <img src={org.logo_url} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              : <span className={`w-full h-full flex items-center justify-center ${meta.accent.icon}`}><Icon size={34} /></span>}
          </div>
          <div className="flex-1 min-w-0 pb-1">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight">{org.name}</h1>
              <VerifiedPill status={org.verification_status} isVerified={org.is_verified} />
            </div>
            {org.tagline && <p className="text-gray-600 dark:text-gray-300 mt-1.5">{org.tagline}</p>}
          </div>
        </div>

        {/* Meta row */}
        <div className="flex flex-wrap items-center gap-2.5 mt-5">
          <span className={`inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider px-2.5 py-1 rounded-full ${meta.accent.chip}`}>
            <Icon size={13} /> {meta.label}
          </span>
          {org.sector && <span className="text-sm text-gray-500 dark:text-gray-400">{org.sector}</span>}
          {org.location && <span className="inline-flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400"><MapPin size={13} />{org.location}</span>}
          {org.founded_year && <span className="inline-flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400"><CalendarDays size={13} />Est. {org.founded_year}</span>}
          {org.hiring && <span className="inline-flex items-center gap-1 text-sm font-bold text-trust-600 dark:text-trust-500">Hiring now</span>}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
          {/* Main */}
          <div className="lg:col-span-2 space-y-6">
            {org.description && (
              <section className="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/10 rounded-2xl p-6">
                <h2 className="text-sm font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-3">About</h2>
                <p className="text-[15px] text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-line">{org.description}</p>
              </section>
            )}

            {Array.isArray(org.focus_areas) && org.focus_areas.length > 0 && (
              <section className="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/10 rounded-2xl p-6">
                <h2 className="text-sm font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-3">Focus areas</h2>
                <div className="flex flex-wrap gap-2">
                  {org.focus_areas.map((f) => (
                    <span key={f} className="text-sm font-medium px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-white/5 text-gray-700 dark:text-gray-300">{f}</span>
                  ))}
                </div>
              </section>
            )}

            {/* Team */}
            <section className="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/10 rounded-2xl p-6">
              <h2 className="text-sm font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-4 flex items-center gap-2">
                <Users2 size={14} /> Team
              </h2>
              {members.length === 0 ? (
                <p className="text-sm text-gray-400">No team members listed yet.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {members.map((m, i) => {
                    const p = m.profiles;
                    return (
                      <div key={i} className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-gray-200 dark:bg-white/10 overflow-hidden flex items-center justify-center text-xs font-black text-gray-500 dark:text-gray-300 shrink-0">
                          {p?.avatar_url
                            ? <img src={p.avatar_url} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            : (p?.full_name?.[0] || p?.username?.[0] || '?').toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{p?.full_name || p?.username || 'Member'}</p>
                          <p className="text-xs text-gray-400 capitalize truncate">{m.title || m.role}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </div>

          {/* Sidebar */}
          <aside className="space-y-4">
            {/* Trust signals */}
            <div className="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/10 rounded-2xl p-5">
              <h3 className="text-sm font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-3">Trust signals</h3>
              <ul className="space-y-3 text-sm">
                <li className="flex items-center gap-2.5">
                  <ShieldCheck size={15} className={org.is_verified ? 'text-trust-500 shrink-0' : 'text-gray-400 shrink-0'} />
                  <span className="text-gray-700 dark:text-gray-300">{org.is_verified ? 'Verified organization' : org.verification_status === 'pending' ? 'Verification pending' : 'Not yet verified'}</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Users2 size={15} className="text-gray-400 shrink-0" />
                  <span className="text-gray-700 dark:text-gray-300">{members.length} team member{members.length === 1 ? '' : 's'}</span>
                </li>
                {org.founded_year && (
                  <li className="flex items-center gap-2.5">
                    <CalendarDays size={15} className="text-gray-400 shrink-0" />
                    <span className="text-gray-700 dark:text-gray-300">Established {org.founded_year}</span>
                  </li>
                )}
              </ul>
            </div>
            <div className="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/10 rounded-2xl p-5">
              <h3 className="text-sm font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-3">Details</h3>
              <ul className="space-y-3 text-sm">
                {org.website && (
                  <li className="flex items-center gap-2.5">
                    <Globe size={15} className="text-gray-400 shrink-0" />
                    <a href={org.website} target="_blank" rel="noreferrer" className="text-brand-600 dark:text-brand-400 hover:underline inline-flex items-center gap-1 truncate">
                      {org.website.replace(/^https?:\/\//, '')} <ExternalLink size={12} className="shrink-0" />
                    </a>
                  </li>
                )}
                {org.contact_email && (
                  <li className="flex items-center gap-2.5">
                    <Mail size={15} className="text-gray-400 shrink-0" />
                    <a href={`mailto:${org.contact_email}`} className="text-gray-700 dark:text-gray-300 hover:text-brand-600 truncate">{org.contact_email}</a>
                  </li>
                )}
                {org.location && (
                  <li className="flex items-center gap-2.5">
                    <MapPin size={15} className="text-gray-400 shrink-0" />
                    <span className="text-gray-700 dark:text-gray-300">{org.location}{org.country ? `, ${org.country}` : ''}</span>
                  </li>
                )}
                {org.size && (
                  <li className="flex items-center gap-2.5">
                    <Users2 size={15} className="text-gray-400 shrink-0" />
                    <span className="text-gray-700 dark:text-gray-300">{org.size}</span>
                  </li>
                )}
              </ul>
            </div>

            {owner && (
              <div className="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/10 rounded-2xl p-5">
                <h3 className="text-sm font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-3">Managed by</h3>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-white/10 overflow-hidden flex items-center justify-center text-sm font-black text-gray-500 dark:text-gray-300 shrink-0">
                    {owner.avatar_url
                      ? <img src={owner.avatar_url} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      : (owner.full_name?.[0] || owner.username?.[0] || '?').toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{owner.full_name || owner.username}</p>
                    {owner.username && <Link href={`/u/${owner.username}`} className="text-xs text-brand-600 dark:text-brand-400 hover:underline">@{owner.username}</Link>}
                  </div>
                </div>
              </div>
            )}
          </aside>
        </div>
      </main>
    </div>
  );
}
