'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { supabase } from '../../supabaseClient';
import { orgMeta } from '../../../lib/orgTypes';
import { consolePathFor } from '../../../lib/orgVerticals';
import {
  ArrowLeft, ShieldCheck, MapPin, Globe, CalendarDays, Users2,
  Building2, Mail, ExternalLink, LayoutDashboard, Briefcase, ArrowUpRight,
  Sparkles, Star, Loader2, Pencil, X, Save, Image as ImageIcon,
  Check, Plus, Eye, ShoppingBag, Trash2,
} from 'lucide-react';

const ADDFIELD = 'w-full bg-gray-100 dark:bg-white/[0.06] rounded-xl py-2.5 px-3.5 text-sm outline-none focus:ring-2 focus:ring-brand-500/30 border-0 placeholder:text-gray-400';

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
  const router = useRouter();
  const [org, setOrg] = useState(null);
  const [members, setMembers] = useState([]);
  const [posts, setPosts] = useState([]);
  const [canManage, setCanManage] = useState(false);
  const [state, setState] = useState('loading'); // loading | ready | notfound
  const [talent, setTalent] = useState(null);        // { engine, candidates } | null
  const [talentLoading, setTalentLoading] = useState(false);

  // Social / stats
  const [followerCount, setFollowerCount] = useState(0);
  const [viewCount, setViewCount] = useState(0);
  const [following, setFollowing] = useState(false);
  const [followBusy, setFollowBusy] = useState(false);

  // Org content
  const [updates, setUpdates] = useState([]);
  const [events, setEvents] = useState([]);
  const [products, setProducts] = useState([]);
  const [appliedJobs, setAppliedJobs] = useState([]);
  const [applyingJob, setApplyingJob] = useState(null);
  const [newPost, setNewPost] = useState('');
  const [posting, setPosting] = useState(false);
  const [contentErr, setContentErr] = useState(null);
  const [addKind, setAddKind] = useState(null); // 'event' | 'product' | null
  const [addForm, setAddForm] = useState({});
  const [savingAdd, setSavingAdd] = useState(false);

  // Owner edit
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [editErr, setEditErr] = useState(null);
  const [uploadingAsset, setUploadingAsset] = useState(null); // 'logo' | 'banner' | null

  const openEdit = () => {
    if (!org) return;
    setEditErr(null);
    setForm({
      name: org.name || '',
      tagline: org.tagline || '',
      sector: org.sector || '',
      location: org.location || '',
      country: org.country || '',
      website: org.website || '',
      contact_email: org.contact_email || '',
      size: org.size || '',
      founded_year: org.founded_year || '',
      focus_areas: Array.isArray(org.focus_areas) ? org.focus_areas.join(', ') : (org.focus_areas || ''),
      description: org.description || '',
      logo_url: org.logo_url || '',
      banner_url: org.banner_url || '',
    });
    setEditing(true);
  };

  const uploadAsset = async (kind, file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) { setEditErr('Please choose an image file.'); return; }
    if (file.size > 5 * 1024 * 1024) { setEditErr('Image must be under 5 MB.'); return; }
    setUploadingAsset(kind); setEditErr(null);
    try {
      const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
      const path = `${org.id}/${kind}_${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from('org-assets').upload(path, file, { upsert: true });
      if (upErr) throw new Error(upErr.message);
      const { data: pub } = supabase.storage.from('org-assets').getPublicUrl(path);
      setForm((f) => ({ ...f, [kind === 'logo' ? 'logo_url' : 'banner_url']: pub.publicUrl }));
    } catch (e) {
      setEditErr(e.message || 'Upload failed.');
    } finally {
      setUploadingAsset(null);
    }
  };

  const saveEdit = async () => {
    if (!form?.name?.trim()) { setEditErr('Name is required.'); return; }
    setSaving(true); setEditErr(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Your session expired — sign in again.');
      const res = await fetch(`/api/organizations/${slug}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Could not save changes.');
      setOrg(data.organization);   // reflect saved values immediately
      setEditing(false);
    } catch (e) {
      setEditErr(e.message);
    } finally {
      setSaving(false);
    }
  };

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

      // Open positions / posts published by this organization (jobs are per-owner)
      const { data: j } = await supabase
        .from('jobs')
        .select('id, title, type, location, salary, created_at, external_url, status, department, tags')
        .eq('user_id', o.owner_id)
        .eq('approved', true)
        .order('created_at', { ascending: false })
        .limit(12);
      if (active) setPosts((j || []).filter((x) => (x.status || 'active') !== 'closed'));

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

  // AI talent matches — managers only. Fetched once we know the viewer can manage.
  useEffect(() => {
    if (!canManage) return;
    let active = true;
    (async () => {
      setTalentLoading(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        const res = await fetch(`/api/organizations/${slug}/talent`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        const data = await res.json().catch(() => ({}));
        if (active && res.ok) setTalent(data);
      } catch {
        /* non-fatal — the section just won't render */
      } finally {
        if (active) setTalentLoading(false);
      }
    })();
    return () => { active = false; };
  }, [canManage, slug]);

  // Followers + page views. All guarded — until the org_social migration is
  // applied these tables/RPC don't exist, so failures are swallowed silently.
  useEffect(() => {
    if (!org?.id) return;
    let active = true;
    (async () => {
      supabase.rpc('increment_org_view', { org: org.id }).then(() => {}, () => {});
      if (typeof org.view_count === 'number') setViewCount(org.view_count);
      try {
        const { count } = await supabase
          .from('org_followers')
          .select('user_id', { count: 'exact', head: true })
          .eq('organization_id', org.id);
        if (active && typeof count === 'number') setFollowerCount(count);
      } catch { /* table not present yet */ }
      const { data: { session } } = await supabase.auth.getSession();
      if (session && active) {
        try {
          const { data } = await supabase
            .from('org_followers')
            .select('user_id')
            .eq('organization_id', org.id)
            .eq('user_id', session.user.id)
            .maybeSingle();
          if (active) setFollowing(!!data);
        } catch { /* ignore */ }
      }
    })();
    return () => { active = false; };
  }, [org?.id]);

  const toggleFollow = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { router.push(`/auth?next=${encodeURIComponent(`/organizations/${slug}`)}`); return; }
    setFollowBusy(true);
    const wasFollowing = following;
    // optimistic
    setFollowing(!wasFollowing);
    setFollowerCount((c) => Math.max(0, c + (wasFollowing ? -1 : 1)));
    try {
      if (wasFollowing) {
        await supabase.from('org_followers').delete()
          .eq('organization_id', org.id).eq('user_id', session.user.id);
      } else {
        await supabase.from('org_followers')
          .insert({ organization_id: org.id, user_id: session.user.id });
      }
    } catch {
      // revert on failure (e.g. table not migrated yet)
      setFollowing(wasFollowing);
      setFollowerCount((c) => Math.max(0, c + (wasFollowing ? 1 : -1)));
    } finally {
      setFollowBusy(false);
    }
  };

  // Load org content (updates / events / products) — public reads.
  useEffect(() => {
    if (!org?.id) return;
    let active = true;
    (async () => {
      const [{ data: up }, { data: ev }, { data: pr }] = await Promise.all([
        supabase.from('org_posts').select('*').eq('organization_id', org.id).order('created_at', { ascending: false }).limit(20),
        supabase.from('org_events').select('*').eq('organization_id', org.id).order('starts_at', { ascending: true, nullsFirst: false }).limit(20),
        supabase.from('org_products').select('*').eq('organization_id', org.id).order('created_at', { ascending: false }).limit(20),
      ]);
      if (!active) return;
      setUpdates(up || []); setEvents(ev || []); setProducts(pr || []);
    })();
    return () => { active = false; };
  }, [org?.id]);

  // Which of this org's roles has the viewer already applied to?
  useEffect(() => {
    if (!slug || posts.length === 0) return;
    let active = true;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      try {
        const res = await fetch(`/api/organizations/${slug}/apply`, { headers: { Authorization: `Bearer ${session.access_token}` } });
        const data = await res.json().catch(() => ({}));
        if (active && res.ok) setAppliedJobs(data.applied || []);
      } catch { /* ignore */ }
    })();
    return () => { active = false; };
  }, [slug, posts.length]);

  const authedFetch = async (url, opts = {}) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { router.push(`/auth?next=${encodeURIComponent(`/organizations/${slug}`)}`); return null; }
    return fetch(url, {
      ...opts,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}`, ...(opts.headers || {}) },
    });
  };

  const applyToJob = async (jobId) => {
    setApplyingJob(jobId);
    try {
      const res = await authedFetch(`/api/organizations/${slug}/apply`, { method: 'POST', body: JSON.stringify({ jobId }) });
      if (!res) return;
      const data = await res.json().catch(() => ({}));
      if (res.ok) setAppliedJobs((a) => [...new Set([...a, jobId])]);
      else setContentErr(data.error || 'Could not apply.');
    } finally {
      setApplyingJob(null);
    }
  };

  const submitPost = async () => {
    if (!newPost.trim()) return;
    setPosting(true); setContentErr(null);
    try {
      const res = await authedFetch(`/api/organizations/${slug}/content`, { method: 'POST', body: JSON.stringify({ kind: 'post', content: newPost }) });
      if (!res) return;
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Could not post.');
      setUpdates((u) => [data.item, ...u]);
      setNewPost('');
    } catch (e) { setContentErr(e.message); }
    finally { setPosting(false); }
  };

  const submitAdd = async () => {
    setSavingAdd(true); setContentErr(null);
    try {
      const res = await authedFetch(`/api/organizations/${slug}/content`, { method: 'POST', body: JSON.stringify({ kind: addKind, ...addForm }) });
      if (!res) return;
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Could not save.');
      if (addKind === 'event') setEvents((e) => [...e, data.item].sort((a, b) => new Date(a.starts_at || 0) - new Date(b.starts_at || 0)));
      else setProducts((p) => [data.item, ...p]);
      setAddKind(null); setAddForm({});
    } catch (e) { setContentErr(e.message); }
    finally { setSavingAdd(false); }
  };

  const deleteContent = async (kind, id) => {
    const res = await authedFetch(`/api/organizations/${slug}/content`, { method: 'DELETE', body: JSON.stringify({ kind, id }) });
    if (!res || !res.ok) return;
    if (kind === 'post') setUpdates((u) => u.filter((x) => x.id !== id));
    if (kind === 'event') setEvents((e) => e.filter((x) => x.id !== id));
    if (kind === 'product') setProducts((p) => p.filter((x) => x.id !== id));
  };

  if (state === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-ink">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="mt-4 h-40 sm:h-56 rounded-2xl bg-gray-100 dark:bg-white/[0.03] animate-pulse" />
          <div className="mt-5 flex gap-4">
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-gray-200 dark:bg-white/10 animate-pulse shrink-0" />
            <div className="flex-1 pt-1">
              <div className="h-7 w-64 max-w-full bg-gray-200 dark:bg-white/10 rounded-lg animate-pulse" />
              <div className="h-4 w-80 max-w-full bg-gray-100 dark:bg-white/5 rounded mt-3 animate-pulse" />
            </div>
          </div>
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
      {/* ── Owner edit modal ── */}
      {editing && form && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-sm"
          onClick={() => !saving && setEditing(false)}
        >
          <div
            className="w-full max-w-2xl max-h-[92vh] flex flex-col bg-white dark:bg-ink border border-gray-200 dark:border-white/10 rounded-2xl shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-gray-100 dark:border-white/10 bg-white dark:bg-ink rounded-t-2xl shrink-0">
              <h2 className="text-lg font-black tracking-tight">Edit organization</h2>
              <button onClick={() => !saving && setEditing(false)} className="text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"><X size={20} /></button>
            </div>

            <div className="p-5 sm:p-6 space-y-5 overflow-y-auto flex-1">
              {/* Banner + logo */}
              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-2">Cover banner (image background)</label>
                <div className="relative h-32 rounded-xl overflow-hidden bg-gradient-to-br from-brand-500 via-brand-600 to-trust-600">
                  {form.banner_url && <Image src={form.banner_url} alt="" width={400} height={128} unoptimized className="w-full h-full object-cover" referrerPolicy="no-referrer" />}
                  <label className="absolute bottom-2 right-2 inline-flex items-center gap-1.5 text-xs font-bold bg-white/90 dark:bg-ink/80 text-gray-800 dark:text-white px-2.5 py-1.5 rounded-lg cursor-pointer hover:bg-white shadow-sm transition-colors">
                    {uploadingAsset === 'banner' ? <Loader2 size={13} className="animate-spin" /> : <ImageIcon size={13} />} Upload banner
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => uploadAsset('banner', e.target.files?.[0])} />
                  </label>
                </div>
                <div className="mt-3 flex items-center gap-3">
                  <div className="w-16 h-16 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 overflow-hidden flex items-center justify-center shrink-0">
                    {form.logo_url ? <Image src={form.logo_url} alt="" width={64} height={64} unoptimized className="w-full h-full object-cover" referrerPolicy="no-referrer" /> : <Building2 size={22} className="text-gray-400" />}
                  </div>
                  <label className="inline-flex items-center gap-1.5 text-sm font-bold bg-gray-100 dark:bg-white/10 text-gray-800 dark:text-white px-3 py-2 rounded-xl cursor-pointer hover:bg-gray-200 dark:hover:bg-white/15 transition-colors">
                    {uploadingAsset === 'logo' ? <Loader2 size={14} className="animate-spin" /> : <ImageIcon size={14} />} Upload logo
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => uploadAsset('logo', e.target.files?.[0])} />
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1.5">Name <span className="text-brand-500">*</span></label>
                <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} maxLength={120} className="w-full bg-gray-100 dark:bg-white/[0.06] rounded-xl py-2.5 px-3.5 text-sm outline-none focus:ring-2 focus:ring-brand-500/30 border-0 placeholder:text-gray-400" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1.5">Tagline</label>
                <input value={form.tagline} onChange={(e) => setForm((f) => ({ ...f, tagline: e.target.value }))} maxLength={140} placeholder="One line on what you do" className="w-full bg-gray-100 dark:bg-white/[0.06] rounded-xl py-2.5 px-3.5 text-sm outline-none focus:ring-2 focus:ring-brand-500/30 border-0 placeholder:text-gray-400" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1.5">Sector / field</label>
                  <input value={form.sector} onChange={(e) => setForm((f) => ({ ...f, sector: e.target.value }))} maxLength={80} className="w-full bg-gray-100 dark:bg-white/[0.06] rounded-xl py-2.5 px-3.5 text-sm outline-none focus:ring-2 focus:ring-brand-500/30 border-0" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1.5">Size</label>
                  <input value={form.size} onChange={(e) => setForm((f) => ({ ...f, size: e.target.value }))} maxLength={40} placeholder="e.g. 11–50" className="w-full bg-gray-100 dark:bg-white/[0.06] rounded-xl py-2.5 px-3.5 text-sm outline-none focus:ring-2 focus:ring-brand-500/30 border-0 placeholder:text-gray-400" />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1.5">Location</label>
                  <input value={form.location} onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))} maxLength={80} placeholder="City" className="w-full bg-gray-100 dark:bg-white/[0.06] rounded-xl py-2.5 px-3.5 text-sm outline-none focus:ring-2 focus:ring-brand-500/30 border-0 placeholder:text-gray-400" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1.5">Country</label>
                  <input value={form.country} onChange={(e) => setForm((f) => ({ ...f, country: e.target.value }))} maxLength={60} className="w-full bg-gray-100 dark:bg-white/[0.06] rounded-xl py-2.5 px-3.5 text-sm outline-none focus:ring-2 focus:ring-brand-500/30 border-0" />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1.5">Website</label>
                  <input value={form.website} onChange={(e) => setForm((f) => ({ ...f, website: e.target.value }))} maxLength={200} placeholder="https://…" className="w-full bg-gray-100 dark:bg-white/[0.06] rounded-xl py-2.5 px-3.5 text-sm outline-none focus:ring-2 focus:ring-brand-500/30 border-0 placeholder:text-gray-400" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1.5">Founded year</label>
                  <input value={form.founded_year} onChange={(e) => setForm((f) => ({ ...f, founded_year: e.target.value }))} inputMode="numeric" maxLength={4} placeholder="2020" className="w-full bg-gray-100 dark:bg-white/[0.06] rounded-xl py-2.5 px-3.5 text-sm outline-none focus:ring-2 focus:ring-brand-500/30 border-0 placeholder:text-gray-400" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1.5">Contact email</label>
                <input value={form.contact_email} onChange={(e) => setForm((f) => ({ ...f, contact_email: e.target.value }))} maxLength={120} placeholder="hello@company.com" className="w-full bg-gray-100 dark:bg-white/[0.06] rounded-xl py-2.5 px-3.5 text-sm outline-none focus:ring-2 focus:ring-brand-500/30 border-0 placeholder:text-gray-400" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1.5">Focus areas <span className="font-normal text-gray-400">(comma separated — also powers talent matching)</span></label>
                <input value={form.focus_areas} onChange={(e) => setForm((f) => ({ ...f, focus_areas: e.target.value }))} placeholder="React, Design, Public health" className="w-full bg-gray-100 dark:bg-white/[0.06] rounded-xl py-2.5 px-3.5 text-sm outline-none focus:ring-2 focus:ring-brand-500/30 border-0 placeholder:text-gray-400" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1.5">About</label>
                <textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} maxLength={4000} rows={5} placeholder="What your organization does and who it serves." className="w-full bg-gray-100 dark:bg-white/[0.06] rounded-xl py-2.5 px-3.5 text-sm outline-none focus:ring-2 focus:ring-brand-500/30 border-0 resize-y placeholder:text-gray-400" />
              </div>

              {editErr && (
                <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/40 rounded-xl px-3.5 py-2.5">{editErr}</div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 px-5 sm:px-6 py-4 border-t border-gray-100 dark:border-white/10 bg-white dark:bg-ink rounded-b-2xl shrink-0">
              <button onClick={() => setEditing(false)} disabled={saving} className="text-sm font-bold text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white px-4 py-2.5 transition-colors">Cancel</button>
              <button onClick={saveEdit} disabled={saving} className="inline-flex items-center gap-2 bg-brand-500 hover:bg-brand-600 disabled:opacity-60 text-white px-5 py-2.5 rounded-xl font-black text-sm transition-colors shadow-sm shadow-brand-500/25">
                {saving ? <><Loader2 size={15} className="animate-spin" /> Saving…</> : <><Save size={15} /> Save changes</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Add event / product modal ── */}
      {addKind && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-sm" onClick={() => !savingAdd && setAddKind(null)}>
          <div className="w-full max-w-md max-h-[92vh] overflow-y-auto bg-white dark:bg-ink border border-gray-200 dark:border-white/10 rounded-2xl shadow-2xl p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-black">{addKind === 'event' ? 'Add event' : 'Add product / service'}</h2>
              <button onClick={() => setAddKind(null)} className="text-gray-400 hover:text-gray-900 dark:hover:text-white"><X size={18} /></button>
            </div>
            <div className="space-y-3">
              {addKind === 'event' ? (
                <>
                  <input placeholder="Event title" value={addForm.title || ''} onChange={(e) => setAddForm((f) => ({ ...f, title: e.target.value }))} className={ADDFIELD} />
                  <div>
                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">Starts</label>
                    <input type="datetime-local" value={addForm.starts_at || ''} onChange={(e) => setAddForm((f) => ({ ...f, starts_at: e.target.value }))} className={ADDFIELD} />
                  </div>
                  <input placeholder="Location (optional)" value={addForm.location || ''} onChange={(e) => setAddForm((f) => ({ ...f, location: e.target.value }))} className={ADDFIELD} />
                  <textarea placeholder="Description (optional)" rows={3} value={addForm.description || ''} onChange={(e) => setAddForm((f) => ({ ...f, description: e.target.value }))} className={`${ADDFIELD} resize-y`} />
                </>
              ) : (
                <>
                  <input placeholder="Name" value={addForm.name || ''} onChange={(e) => setAddForm((f) => ({ ...f, name: e.target.value }))} className={ADDFIELD} />
                  <input placeholder="Price (optional, e.g. $49)" value={addForm.price || ''} onChange={(e) => setAddForm((f) => ({ ...f, price: e.target.value }))} className={ADDFIELD} />
                  <input placeholder="Link (optional, https://…)" value={addForm.url || ''} onChange={(e) => setAddForm((f) => ({ ...f, url: e.target.value }))} className={ADDFIELD} />
                  <textarea placeholder="Description (optional)" rows={3} value={addForm.description || ''} onChange={(e) => setAddForm((f) => ({ ...f, description: e.target.value }))} className={`${ADDFIELD} resize-y`} />
                </>
              )}
              {contentErr && <p className="text-sm text-red-500 dark:text-red-400">{contentErr}</p>}
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setAddKind(null)} disabled={savingAdd} className="text-sm font-bold text-gray-500 dark:text-gray-400 px-4 py-2">Cancel</button>
              <button onClick={submitAdd} disabled={savingAdd} className="inline-flex items-center gap-1.5 bg-brand-500 hover:bg-brand-600 text-white px-4 py-2 rounded-xl font-bold text-sm disabled:opacity-60">
                {savingAdd ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Back bar */}
      <header className="sticky top-0 z-40 bg-white/85 dark:bg-ink/85 backdrop-blur-xl border-b border-gray-100 dark:border-white/10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Link href="/organizations" className="flex items-center gap-2 text-sm font-bold text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
            <ArrowLeft size={16} /> Organizations
          </Link>
          {canManage && (
            <div className="flex items-center gap-2">
              <button onClick={openEdit} className="inline-flex items-center gap-1.5 text-sm font-bold bg-white dark:bg-white/10 border border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-200 px-3.5 py-1.5 rounded-lg hover:border-gray-300 dark:hover:border-white/20 transition-colors">
                <Pencil size={13} /> Edit
              </button>
              <Link href={consolePathFor(org.type, slug)} className="inline-flex items-center gap-1.5 text-sm font-bold bg-brand-500 hover:bg-brand-600 text-white px-4 py-1.5 rounded-lg shadow-sm shadow-brand-500/25 transition-colors">
                <LayoutDashboard size={14} /> <span className="hidden sm:inline">Manage console</span><span className="sm:hidden">Console</span>
              </Link>
            </div>
          )}
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 pb-20">
        {/* Banner — a contained, rounded card. Because it lives inside the same
            width-constrained column as the content, it can't bleed anywhere and
            nothing sits on top of the cover image. */}
        <div className="relative mt-4 h-40 sm:h-56 rounded-2xl overflow-hidden bg-gradient-to-br from-brand-500 via-brand-600 to-trust-600">
          {org.banner_url
            ? <Image src={org.banner_url} alt="" width={800} height={224} unoptimized className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            : <div className="absolute inset-0" style={{ background: 'radial-gradient(70% 130% at 15% 0%, rgba(255,255,255,.18), transparent 55%), radial-gradient(60% 120% at 90% 10%, rgba(23,195,166,.35), transparent 55%)' }} />}
        </div>

        {/* Identity — logo + name sit cleanly BELOW the banner. Logo left, details
            right on desktop; stacked on mobile. Nothing overlaps the cover. */}
        <div className="mt-5 flex flex-col sm:flex-row sm:items-end gap-4">
          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 shadow-sm flex items-center justify-center overflow-hidden shrink-0">
            {org.logo_url
              ? <Image src={org.logo_url} alt="" width={96} height={96} unoptimized className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              : <span className={`w-full h-full flex items-center justify-center ${meta.accent.icon}`}><Icon size={34} /></span>}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight">{org.name}</h1>
              <VerifiedPill status={org.verification_status} isVerified={org.is_verified} />
            </div>
            {org.tagline && <p className="text-gray-600 dark:text-gray-300 mt-1.5 max-w-2xl">{org.tagline}</p>}

            {/* Stats + follow/message actions */}
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2.5 mt-3.5">
              <div className="flex items-center gap-4 text-sm">
                <span className="text-gray-600 dark:text-gray-300">
                  <span className="font-black text-gray-900 dark:text-white tabular-nums">{followerCount}</span> follower{followerCount === 1 ? '' : 's'}
                </span>
                {viewCount > 0 && (
                  <span className="inline-flex items-center gap-1 text-gray-400 dark:text-gray-500">
                    <Eye size={13} /> <span className="tabular-nums">{viewCount}</span>
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={toggleFollow}
                  disabled={followBusy}
                  className={`inline-flex items-center gap-1.5 text-sm font-bold px-4 py-1.5 rounded-lg transition-colors disabled:opacity-60 ${
                    following
                      ? 'bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-white/15'
                      : 'bg-brand-500 hover:bg-brand-600 text-white shadow-sm shadow-brand-500/25'
                  }`}
                >
                  {followBusy ? <Loader2 size={14} className="animate-spin" /> : (following ? <Check size={14} /> : <Plus size={14} />)}
                  {following ? 'Following' : 'Follow'}
                </button>
                {!canManage && owner?.username && (
                  <Link
                    href={`/u/${owner.username}`}
                    className="inline-flex items-center gap-1.5 text-sm font-bold bg-white dark:bg-white/10 border border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-200 px-4 py-1.5 rounded-lg hover:border-gray-300 dark:hover:border-white/20 transition-colors"
                  >
                    <Mail size={14} /> Message
                  </Link>
                )}
              </div>
            </div>
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
            {/* AI talent matches — visible only to the org's managers */}
            {canManage && (
              <section className="bg-white dark:bg-white/[0.03] border border-brand-200 dark:border-brand-500/20 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-1">
                  <h2 className="text-sm font-black uppercase tracking-widest text-brand-600 dark:text-brand-400 flex items-center gap-2">
                    <Sparkles size={14} /> AI talent matches
                  </h2>
                  {talent?.engine && talent.engine !== 'none' && (
                    <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-white/5 rounded-full px-2 py-0.5">
                      {talent.engine === 'ai' ? 'AI ranked' : 'Best fit'}
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                  People whose skills fit your focus areas and open roles. Only you and your team see this.
                </p>
                {talentLoading ? (
                  <div className="flex items-center gap-2 text-sm text-gray-400 py-6 justify-center">
                    <Loader2 size={16} className="animate-spin" /> Finding matches…
                  </div>
                ) : !talent || (talent.candidates?.length ?? 0) === 0 ? (
                  <div className="text-sm text-gray-400 py-4">
                    {talent?.reason === 'no_match'
                      ? 'No one matches your requirements yet — check back as more people join and complete their skills.'
                      : 'Add focus areas or post an open role, so AI can match candidates to what you actually need.'}
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {talent.candidates.map((c) => (
                      <Link
                        key={c.id}
                        href={c.username ? `/u/${c.username}` : '#'}
                        className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 dark:border-white/10 hover:border-brand-400 dark:hover:border-brand-500/50 hover:bg-gray-50 dark:hover:bg-white/[0.04] transition-all group"
                      >
                        <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-white/10 overflow-hidden flex items-center justify-center text-xs font-black text-gray-500 dark:text-gray-300 shrink-0">
                          {c.avatar_url
                            ? <Image src={c.avatar_url} alt="" width={40} height={40} unoptimized className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            : (c.full_name?.[0] || c.username?.[0] || '?').toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <p className="text-sm font-bold text-gray-900 dark:text-white truncate group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
                              {c.full_name || c.username || 'Candidate'}
                            </p>
                            {c.is_verified && <ShieldCheck size={13} className="text-trust-500 shrink-0" />}
                          </div>
                          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{c.reason || c.status || 'Open to work'}</p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0 text-brand-600 dark:text-brand-400" title="Fit score">
                          <Star size={13} className="fill-current" />
                          <span className="text-sm font-black tabular-nums">{c.score}</span>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </section>
            )}

            {/* Open positions / posts */}
            {posts.length > 0 && (
              <section className="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/10 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 flex items-center gap-2">
                    <Briefcase size={14} /> Open positions
                  </h2>
                  <span className="text-xs font-black text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-white/5 rounded-full px-2 py-0.5">{posts.length}</span>
                </div>
                <div className="space-y-2.5">
                  {posts.map((p) => {
                    const external = !!p.external_url;
                    const applied = appliedJobs.includes(p.id);
                    return (
                      <div
                        key={p.id}
                        className="flex items-center justify-between gap-4 p-4 rounded-xl border border-gray-200 dark:border-white/10 hover:border-brand-400 dark:hover:border-brand-500/50 transition-all"
                      >
                        <div className="min-w-0">
                          <p className="font-bold text-gray-900 dark:text-white truncate">{p.title}</p>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-gray-500 dark:text-gray-400">
                            {p.type && <span className="capitalize">{p.type}</span>}
                            {p.location && <span className="inline-flex items-center gap-1"><MapPin size={11} />{p.location}</span>}
                            {p.department && <span>{p.department}</span>}
                            {p.salary && <span className="text-trust-600 dark:text-trust-500 font-semibold">{p.salary}</span>}
                          </div>
                        </div>
                        {external ? (
                          <a href={p.external_url} target="_blank" rel="noreferrer" className="shrink-0 inline-flex items-center gap-1.5 text-sm font-bold bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-200 px-3.5 py-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-white/15 transition-colors">
                            View <ArrowUpRight size={14} />
                          </a>
                        ) : canManage ? (
                          <span className="shrink-0 text-xs font-bold text-gray-400 dark:text-gray-500">Your posting</span>
                        ) : applied ? (
                          <span className="shrink-0 inline-flex items-center gap-1.5 text-sm font-bold text-trust-600 dark:text-trust-500"><Check size={14} /> Applied</span>
                        ) : (
                          <button onClick={() => applyToJob(p.id)} disabled={applyingJob === p.id} className="shrink-0 inline-flex items-center gap-1.5 text-sm font-bold bg-brand-500 hover:bg-brand-600 disabled:opacity-60 text-white px-4 py-1.5 rounded-lg shadow-sm shadow-brand-500/25 transition-colors">
                            {applyingJob === p.id ? <Loader2 size={14} className="animate-spin" /> : <Briefcase size={14} />} Apply
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Updates */}
            {(updates.length > 0 || canManage) && (
              <section className="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/10 rounded-2xl p-6">
                <h2 className="text-sm font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-4 flex items-center gap-2">
                  <Sparkles size={14} /> Updates
                </h2>
                {canManage && (
                  <div className="mb-4">
                    <textarea value={newPost} onChange={(e) => setNewPost(e.target.value)} rows={3} maxLength={4000} placeholder="Share an update with your followers…" className={`${ADDFIELD} resize-y`} />
                    <div className="flex justify-end mt-2">
                      <button onClick={submitPost} disabled={posting || !newPost.trim()} className="inline-flex items-center gap-1.5 bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white px-4 py-1.5 rounded-lg font-bold text-sm transition-colors">
                        {posting ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} Post update
                      </button>
                    </div>
                  </div>
                )}
                {updates.length === 0 ? (
                  <p className="text-sm text-gray-400 py-1">No updates yet.</p>
                ) : (
                  <div className="space-y-3">
                    {updates.map((u) => (
                      <div key={u.id} className="group relative p-4 rounded-xl bg-gray-50 dark:bg-white/[0.03] border border-gray-100 dark:border-white/5">
                        <p className="text-[15px] text-gray-800 dark:text-gray-200 whitespace-pre-line leading-relaxed">{u.content}</p>
                        {u.image_url && <Image src={u.image_url} alt="" width={0} height={0} sizes="100vw" unoptimized className="mt-3 rounded-lg max-h-72 object-cover" referrerPolicy="no-referrer" style={{ width: 'auto', height: 'auto' }} />}
                        <p className="text-xs text-gray-400 mt-2">{new Date(u.created_at).toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                        {canManage && (
                          <button onClick={() => deleteContent('post', u.id)} className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-all" title="Delete"><Trash2 size={14} /></button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )}

            {/* Events */}
            {(events.length > 0 || canManage) && (
              <section className="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/10 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 flex items-center gap-2"><CalendarDays size={14} /> Events</h2>
                  {canManage && <button onClick={() => { setAddKind('event'); setAddForm({}); setContentErr(null); }} className="text-xs font-bold text-brand-600 dark:text-brand-400 inline-flex items-center gap-1"><Plus size={13} /> Add</button>}
                </div>
                {events.length === 0 ? (
                  <p className="text-sm text-gray-400 py-1">No upcoming events.</p>
                ) : (
                  <div className="space-y-2.5">
                    {events.map((ev) => (
                      <div key={ev.id} className="group relative flex items-start gap-3 p-4 rounded-xl border border-gray-200 dark:border-white/10">
                        <div className="w-10 h-10 rounded-lg bg-brand-50 dark:bg-brand-500/15 text-brand-600 dark:text-brand-400 flex items-center justify-center shrink-0"><CalendarDays size={18} /></div>
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-gray-900 dark:text-white">{ev.title}</p>
                          <div className="flex flex-wrap gap-x-3 text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                            {ev.starts_at && <span>{new Date(ev.starts_at).toLocaleString('en', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</span>}
                            {ev.location && <span className="inline-flex items-center gap-1"><MapPin size={11} />{ev.location}</span>}
                          </div>
                          {ev.description && <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{ev.description}</p>}
                        </div>
                        {canManage && <button onClick={() => deleteContent('event', ev.id)} className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-all"><Trash2 size={14} /></button>}
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )}

            {/* Products & services */}
            {(products.length > 0 || canManage) && (
              <section className="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/10 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 flex items-center gap-2"><ShoppingBag size={14} /> Products &amp; services</h2>
                  {canManage && <button onClick={() => { setAddKind('product'); setAddForm({}); setContentErr(null); }} className="text-xs font-bold text-brand-600 dark:text-brand-400 inline-flex items-center gap-1"><Plus size={13} /> Add</button>}
                </div>
                {products.length === 0 ? (
                  <p className="text-sm text-gray-400 py-1">Nothing listed yet.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {products.map((pr) => (
                      <div key={pr.id} className="group relative p-4 rounded-xl border border-gray-200 dark:border-white/10">
                        {pr.image_url && <Image src={pr.image_url} alt="" width={400} height={112} unoptimized className="w-full h-28 object-cover rounded-lg mb-2" referrerPolicy="no-referrer" />}
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-bold text-gray-900 dark:text-white">{pr.name}</p>
                          {pr.price && <span className="text-sm font-black text-trust-600 dark:text-trust-500 shrink-0">{pr.price}</span>}
                        </div>
                        {pr.description && <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">{pr.description}</p>}
                        {pr.url && <a href={pr.url} target="_blank" rel="noreferrer" className="text-xs font-bold text-brand-600 dark:text-brand-400 inline-flex items-center gap-1 mt-2">Learn more <ArrowUpRight size={11} /></a>}
                        {canManage && <button onClick={() => deleteContent('product', pr.id)} className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-all"><Trash2 size={14} /></button>}
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )}

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
                            ? <Image src={p.avatar_url} alt="" width={36} height={36} unoptimized className="w-full h-full object-cover" referrerPolicy="no-referrer" />
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
                      ? <Image src={owner.avatar_url} alt="" width={40} height={40} unoptimized className="w-full h-full object-cover" referrerPolicy="no-referrer" />
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
