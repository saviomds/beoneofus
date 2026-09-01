'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '../../supabaseClient';
import { consolePathFor } from '../../../lib/orgVerticals';
import {
  Building2, Landmark, GraduationCap, HeartPulse, HandHeart, Users2, Sparkles,
  ArrowLeft, Loader2, AlertTriangle, CheckCircle2,
} from 'lucide-react';

const TYPES = [
  { id: 'business',   label: 'Business',    icon: Building2 },
  { id: 'government', label: 'Government',  icon: Landmark },
  { id: 'education',  label: 'Education',   icon: GraduationCap },
  { id: 'healthcare', label: 'Healthcare',  icon: HeartPulse },
  { id: 'ngo',        label: 'NGO',         icon: HandHeart },
  { id: 'community',  label: 'Community',   icon: Users2 },
  { id: 'other',      label: 'Other',       icon: Sparkles },
];

export default function NewOrganizationPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const [type, setType] = useState(() => {
    if (typeof window === 'undefined') return 'business';
    const valid = ['business', 'government', 'education', 'healthcare', 'ngo', 'community', 'other'];
    const cat = new URLSearchParams(window.location.search).get('category');
    return cat && valid.includes(cat) ? cat : 'business';
  });
  const [name, setName] = useState('');
  const [tagline, setTagline] = useState('');
  const [sector, setSector] = useState('');
  const [location, setLocation] = useState('');
  const [website, setWebsite] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    let settled = false;
    const gate = (session) => {
      if (settled) return;
      settled = true;
      if (!session) router.replace('/auth?next=/organizations/new');
      else setChecking(false);
    };
    supabase.auth.getSession()
      .then(({ data: { session } }) => gate(session))
      .catch(() => gate(null)); // getSession rejected → treat as signed-out
    // Safety net: if getSession never resolves (e.g. a stale navigator.locks
    // lock from a crashed tab), don't spin forever — fall back to the auth gate.
    const t = setTimeout(() => gate(null), 4000);
    return () => clearTimeout(t);
  }, [router]);

  // The category chosen at business sign-up (?category=…) prefills `type` via the
  // useState initializer above; here we just clear the sign-up handoff flags.
  useEffect(() => {
    try { localStorage.removeItem('pending_account_type'); localStorage.removeItem('pending_org_category'); } catch {}
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    if (!name.trim()) { setError('Please enter your organization name.'); return; }
    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.replace('/auth?next=/organizations/new'); return; }
      const res = await fetch('/api/organizations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ type, name, tagline, sector, location, website, description }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Could not create organization.');
      const created = data.organization;
      router.push(created?.slug ? consolePathFor(created.type || type, created.slug) : '/organizations');
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  };

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-ink">
        <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const field = 'w-full bg-gray-100/80 dark:bg-white/[0.06] rounded-xl py-3 px-4 text-[15px] text-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-brand-500/30 focus:bg-white dark:focus:bg-white/[0.09] transition-all placeholder:text-gray-400 border-0';

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-ink text-gray-900 dark:text-gray-100">
      <header className="sticky top-0 z-40 bg-white/85 dark:bg-ink/85 backdrop-blur-xl border-b border-gray-100 dark:border-white/10">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 h-14 flex items-center">
          <Link href="/for-institutions" className="flex items-center gap-2 text-sm font-bold text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
            <ArrowLeft size={16} /> For institutions
          </Link>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-black tracking-tight">Create your organization</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1.5">Put your institution on the graph. You can refine everything later.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Type picker */}
          <div>
            <label className="block text-sm font-bold mb-2.5">Organization type</label>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {TYPES.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setType(id)}
                  className={`flex flex-col items-center gap-1.5 py-3 rounded-xl border text-xs font-bold transition-all ${
                    type === id
                      ? 'border-brand-500 bg-brand-50 dark:bg-brand-500/15 text-brand-600 dark:text-brand-300'
                      : 'border-gray-200 dark:border-white/10 text-gray-500 dark:text-gray-400 hover:border-gray-300 dark:hover:border-white/20'
                  }`}
                >
                  <Icon size={18} />
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold mb-2">Name <span className="text-brand-500">*</span></label>
            <input className={field} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Ministry of Digital Skills" maxLength={120} autoFocus />
          </div>

          <div>
            <label className="block text-sm font-bold mb-2">Tagline</label>
            <input className={field} value={tagline} onChange={(e) => setTagline(e.target.value)} placeholder="One line on what you do" maxLength={140} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold mb-2">Sector / field</label>
              <input className={field} value={sector} onChange={(e) => setSector(e.target.value)} placeholder="e.g. Public sector, EdTech" maxLength={80} />
            </div>
            <div>
              <label className="block text-sm font-bold mb-2">Location</label>
              <input className={field} value={location} onChange={(e) => setLocation(e.target.value)} placeholder="City, Country" maxLength={80} />
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold mb-2">Website</label>
            <input className={field} value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://…" maxLength={200} />
          </div>

          <div>
            <label className="block text-sm font-bold mb-2">About</label>
            <textarea className={`${field} min-h-[110px] resize-y`} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What your organization does and who it serves." maxLength={1000} />
          </div>

          {error && (
            <div className="flex items-start gap-2.5 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/40 rounded-xl p-3.5 text-sm text-red-600 dark:text-red-400">
              <AlertTriangle size={16} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center justify-center gap-2 bg-brand-500 hover:bg-brand-600 disabled:opacity-60 text-white px-6 py-3.5 rounded-xl font-black text-sm transition-all shadow-lg shadow-brand-500/25"
            >
              {saving ? <><Loader2 size={16} className="animate-spin" /> Creating…</> : <><CheckCircle2 size={16} /> Create organization</>}
            </button>
            <Link href="/for-institutions" className="text-sm font-bold text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white px-3 py-3 transition-colors">
              Cancel
            </Link>
          </div>
        </form>
      </main>
    </div>
  );
}
