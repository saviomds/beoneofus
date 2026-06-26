'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Users, Star, Clock, Search, Plus, X, Loader2, ArrowLeft, Send,
  Sparkles, CheckCircle2, AlertCircle, RefreshCw, ChevronRight,
  CalendarDays, DollarSign, Globe, BadgeCheck, Brain, Zap,
} from 'lucide-react';
import { supabase } from '../../supabaseClient';

const COMMON_SKILLS = ['React', 'Node.js', 'Python', 'TypeScript', 'AWS', 'System Design', 'AI/ML', 'Mobile', 'DevOps', 'UI/UX', 'Product', 'Blockchain', 'Data Science', 'Go', 'Java'];

function StarRating({ value }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <Star key={i} size={11} className={i <= Math.round(value) ? 'text-amber-400 fill-amber-400' : 'text-gray-200 dark:text-gray-700'} />
      ))}
    </div>
  );
}

function MentorCard({ mentor, onSelect, matchScore, matchReason }) {
  const profile = mentor.profiles;
  const name = profile?.full_name || profile?.username || 'Mentor';
  return (
    <button
      onClick={() => onSelect(mentor)}
      className="w-full text-left bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5 hover:border-blue-400 dark:hover:border-blue-600 hover:shadow-lg transition-all group"
    >
      <div className="flex items-start gap-4 mb-3">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-black text-lg shrink-0">
          {profile?.avatar_url
            ? <img src={profile.avatar_url} alt="" className="w-12 h-12 rounded-xl object-cover" />
            : name[0]
          }
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <h3 className="font-black text-gray-900 dark:text-gray-100 text-sm group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate">{name}</h3>
            {mentor.verified && <BadgeCheck size={14} className="text-blue-500 shrink-0" />}
          </div>
          {mentor.headline && <p className="text-xs text-gray-500 dark:text-gray-400 truncate leading-snug">{mentor.headline}</p>}
          <div className="flex items-center gap-3 mt-1.5">
            <StarRating value={mentor.rating || 5} />
            <span className="text-[10px] text-gray-400 dark:text-gray-500">{mentor.session_count || 0} sessions</span>
            {mentor.experience_years > 0 && (
              <span className="text-[10px] text-gray-400 dark:text-gray-500">{mentor.experience_years}y exp</span>
            )}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          {matchScore && (
            <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/50 px-2 py-1 rounded-lg">
              {matchScore}% Match
            </span>
          )}
          {mentor.hourly_rate && (
            <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 flex items-center gap-0.5">
              <DollarSign size={10} />{mentor.hourly_rate}/hr
            </span>
          )}
        </div>
      </div>

      {mentor.skills?.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {mentor.skills.slice(0, 5).map(s => (
            <span key={s} className="text-[10px] font-bold px-2 py-0.5 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/50 rounded-md text-blue-600 dark:text-blue-400">{s}</span>
          ))}
          {mentor.skills.length > 5 && <span className="text-[10px] text-gray-400 font-medium">+{mentor.skills.length - 5}</span>}
        </div>
      )}

      {matchReason && (
        <p className="text-[11px] text-gray-500 dark:text-gray-400 italic leading-relaxed mb-2">{matchReason}</p>
      )}

      <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-1 text-[10px] text-gray-400 dark:text-gray-500">
          <Globe size={10} /> {mentor.languages?.join(', ') || 'English'}
        </div>
        <ChevronRight size={14} className="text-gray-400 group-hover:text-blue-500 transition-colors" />
      </div>
    </button>
  );
}

function BookSessionModal({ mentor, token, onClose, onBooked }) {
  const name = mentor.profiles?.full_name || mentor.profiles?.username || 'Mentor';
  const [form, setForm] = useState({ topic: '', goals: '', scheduled_at: '', duration_mins: 60 });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!form.topic.trim()) { setError('Topic is required'); return; }
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/mentor-sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ mentor_id: mentor.id, ...form }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to book session');
      onBooked(data.session);
      onClose();
    } catch (e) { setError(e.message); } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 rounded-3xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl border border-gray-200 dark:border-gray-700 animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-300">
        <div className="sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 px-5 py-4 flex items-center justify-between rounded-t-3xl z-10">
          <div>
            <h3 className="font-black text-gray-900 dark:text-gray-100">Book Session</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">with {name}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"><X size={16} className="text-gray-500" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest block mb-1.5">Session Topic *</label>
            <input type="text" value={form.topic} onChange={e => setForm(p => ({ ...p, topic: e.target.value }))} placeholder="e.g. React architecture review, Career advice..." className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3.5 py-2.5 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" />
          </div>
          <div>
            <label className="text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest block mb-1.5">Goals</label>
            <textarea value={form.goals} onChange={e => setForm(p => ({ ...p, goals: e.target.value }))} placeholder="What do you want to achieve in this session?" rows={3} className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3.5 py-2.5 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none transition-all" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest block mb-1.5">Preferred Date/Time</label>
              <input type="datetime-local" value={form.scheduled_at} onChange={e => setForm(p => ({ ...p, scheduled_at: e.target.value }))} className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3.5 py-2.5 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" />
            </div>
            <div>
              <label className="text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest block mb-1.5">Duration</label>
              <select value={form.duration_mins} onChange={e => setForm(p => ({ ...p, duration_mins: parseInt(e.target.value) }))} className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3.5 py-2.5 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all">
                <option value={30}>30 minutes</option>
                <option value={60}>60 minutes</option>
                <option value={90}>90 minutes</option>
                <option value={120}>120 minutes</option>
              </select>
            </div>
          </div>
          {error && <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800/50 rounded-xl"><AlertCircle size={14} className="text-red-500 shrink-0 mt-0.5" /><p className="text-xs text-red-700 dark:text-red-400">{error}</p></div>}
          <button onClick={handleSubmit} disabled={saving || !form.topic.trim()} className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-black rounded-xl transition-all flex items-center justify-center gap-2 text-sm active:scale-95">
            {saving ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
            {saving ? 'Booking…' : 'Send Request'}
          </button>
        </div>
      </div>
    </div>
  );
}

function BecomeMentorModal({ session, token, onClose, onSaved }) {
  const [form, setForm] = useState({ headline: '', bio: '', hourly_rate: '', experience_years: 0, portfolio_url: '' });
  const [skills, setSkills] = useState([]);
  const [customSkill, setCustomSkill] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const addSkill = s => { if (s && !skills.includes(s)) setSkills(p => [...p, s]); };

  const handleSubmit = async () => {
    if (!skills.length) { setError('Add at least one skill'); return; }
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/mentors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ...form, skills, hourly_rate: form.hourly_rate ? parseFloat(form.hourly_rate) : null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create mentor profile');
      onSaved(data.mentor);
      onClose();
    } catch (e) { setError(e.message); } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 rounded-3xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl border border-gray-200 dark:border-gray-700 animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-300">
        <div className="sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 px-5 py-4 flex items-center justify-between rounded-t-3xl z-10">
          <h3 className="font-black text-gray-900 dark:text-gray-100">Become a Mentor</h3>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"><X size={16} className="text-gray-500" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest block mb-1.5">Headline</label>
            <input type="text" value={form.headline} onChange={e => setForm(p => ({ ...p, headline: e.target.value }))} placeholder="e.g. Senior React Engineer · 8 years experience" className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3.5 py-2.5 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" />
          </div>
          <div>
            <label className="text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest block mb-1.5">Bio</label>
            <textarea value={form.bio} onChange={e => setForm(p => ({ ...p, bio: e.target.value }))} placeholder="Tell mentees about yourself, your experience, and how you can help them..." rows={4} className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3.5 py-2.5 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none transition-all" />
          </div>
          <div>
            <label className="text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest block mb-1.5">Skills *</label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {skills.map(s => <span key={s} onClick={() => setSkills(p => p.filter(x => x !== s))} className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800/50 rounded-lg cursor-pointer">{s} <X size={9} /></span>)}
            </div>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {COMMON_SKILLS.map(s => !skills.includes(s) && <button key={s} onClick={() => addSkill(s)} className="text-[10px] font-bold px-2 py-1 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 rounded-lg hover:border-blue-400 transition-all">+ {s}</button>)}
            </div>
            <div className="flex gap-2">
              <input value={customSkill} onChange={e => setCustomSkill(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && customSkill.trim()) { addSkill(customSkill.trim()); setCustomSkill(''); }}} placeholder="Custom skill..." className="flex-1 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-xs text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all" />
              <button onClick={() => { addSkill(customSkill.trim()); setCustomSkill(''); }} className="px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all"><Plus size={14} /></button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest block mb-1.5">Hourly Rate (USD)</label>
              <input type="number" min={0} value={form.hourly_rate} onChange={e => setForm(p => ({ ...p, hourly_rate: e.target.value }))} placeholder="e.g. 50" className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3.5 py-2.5 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all" />
            </div>
            <div>
              <label className="text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest block mb-1.5">Years of Experience</label>
              <input type="number" min={0} max={40} value={form.experience_years} onChange={e => setForm(p => ({ ...p, experience_years: parseInt(e.target.value) || 0 }))} className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3.5 py-2.5 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all" />
            </div>
          </div>
          <div>
            <label className="text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest block mb-1.5">Portfolio URL</label>
            <input type="url" value={form.portfolio_url} onChange={e => setForm(p => ({ ...p, portfolio_url: e.target.value }))} placeholder="https://..." className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3.5 py-2.5 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all" />
          </div>
          {error && <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800/50 rounded-xl"><AlertCircle size={14} className="text-red-500 shrink-0 mt-0.5" /><p className="text-xs text-red-700 dark:text-red-400">{error}</p></div>}
          <button onClick={handleSubmit} disabled={saving || !skills.length} className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-black rounded-xl transition-all flex items-center justify-center gap-2 text-sm active:scale-95">
            {saving ? <Loader2 size={15} className="animate-spin" /> : <Users size={15} />}
            {saving ? 'Creating…' : 'Create Mentor Profile'}
          </button>
        </div>
      </div>
    </div>
  );
}

function MentorDetail({ mentor, session, onBack }) {
  const [showBook, setShowBook] = useState(false);
  const [booked, setBooked] = useState(false);
  const name = mentor.profiles?.full_name || mentor.profiles?.username || 'Mentor';

  return (
    <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
      {showBook && session && (
        <BookSessionModal
          mentor={mentor}
          token={session.access_token}
          onClose={() => setShowBook(false)}
          onBooked={() => setBooked(true)}
        />
      )}

      <div className="flex items-center gap-3">
        <button onClick={onBack} className="p-2 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 transition-colors"><ArrowLeft size={16} /></button>
        <h2 className="font-black text-gray-900 dark:text-gray-100 text-xl tracking-tight flex-1 truncate">{name}</h2>
        {mentor.verified && <BadgeCheck size={18} className="text-blue-500 shrink-0" />}
      </div>

      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5">
        <div className="flex items-start gap-4 mb-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-black text-2xl shrink-0 overflow-hidden">
            {mentor.profiles?.avatar_url
              ? <img src={mentor.profiles.avatar_url} alt="" className="w-16 h-16 object-cover" />
              : name[0]
            }
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-black text-gray-900 dark:text-gray-100 mb-0.5">{name}</p>
            {mentor.headline && <p className="text-xs text-gray-500 dark:text-gray-400 leading-snug">{mentor.headline}</p>}
            <div className="flex items-center gap-3 mt-2">
              <StarRating value={mentor.rating || 5} />
              <span className="text-[10px] text-gray-400 dark:text-gray-500">{mentor.session_count || 0} sessions completed</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-4">
          {mentor.experience_years > 0 && (
            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3 text-center">
              <p className="text-lg font-black text-gray-900 dark:text-gray-100">{mentor.experience_years}y</p>
              <p className="text-[10px] text-gray-400 dark:text-gray-500 font-medium">Experience</p>
            </div>
          )}
          {mentor.hourly_rate && (
            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3 text-center">
              <p className="text-lg font-black text-gray-900 dark:text-gray-100">${mentor.hourly_rate}</p>
              <p className="text-[10px] text-gray-400 dark:text-gray-500 font-medium">Per Hour</p>
            </div>
          )}
          <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3 text-center">
            <p className="text-lg font-black text-gray-900 dark:text-gray-100">{mentor.rating ? parseFloat(mentor.rating).toFixed(1) : '5.0'}</p>
            <p className="text-[10px] text-gray-400 dark:text-gray-500 font-medium">Rating</p>
          </div>
        </div>
      </div>

      {mentor.bio && (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5">
          <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2">About</p>
          <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{mentor.bio}</p>
        </div>
      )}

      {mentor.skills?.length > 0 && (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5">
          <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3">Expertise</p>
          <div className="flex flex-wrap gap-2">
            {mentor.skills.map(s => (
              <span key={s} className="text-[11px] font-bold px-2.5 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800/50 rounded-lg">{s}</span>
            ))}
          </div>
        </div>
      )}

      {booked ? (
        <div className="flex items-center gap-3 p-4 bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-800/50 rounded-2xl">
          <CheckCircle2 size={20} className="text-emerald-500 shrink-0" />
          <div>
            <p className="font-bold text-emerald-700 dark:text-emerald-300 text-sm">Session Requested!</p>
            <p className="text-xs text-emerald-600/70 dark:text-emerald-400/70">The mentor will confirm your session request shortly.</p>
          </div>
        </div>
      ) : session ? (
        <button onClick={() => setShowBook(true)} className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-2xl transition-all flex items-center justify-center gap-2 text-sm active:scale-95 shadow-lg shadow-blue-500/20">
          <CalendarDays size={16} /> Book a Session
        </button>
      ) : (
        <button onClick={() => window.location.href = '/auth'} className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-2xl transition-all text-center text-sm">
          Sign In to Book
        </button>
      )}
    </div>
  );
}

export default function MentorsContent() {
  const [session, setSession] = useState(null);
  const [mentors, setMentors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [activeTab, setActiveTab] = useState('browse');
  const [showBecome, setShowBecome] = useState(false);
  const [isMentor, setIsMentor] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [skillFilter, setSkillFilter] = useState('');
  const [search, setSearch] = useState('');

  // AI match state
  const [goal, setGoal] = useState('');
  const [matching, setMatching] = useState(false);
  const [aiMatches, setAiMatches] = useState([]);
  const [matchError, setMatchError] = useState('');

  const fetchMentors = useCallback(async (skill, q) => {
    const params = new URLSearchParams();
    if (skill) params.set('skill', skill);
    if (q) params.set('q', q);
    const res = await fetch(`/api/mentors?${params}`);
    if (res.ok) { const { mentors } = await res.json(); setMentors(mentors || []); }
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      fetchMentors('', '');
      if (session) {
        const { data } = await supabase.from('mentors').select('id').eq('user_id', session.user.id).single();
        setIsMentor(!!data);
      }
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, s) => setSession(s));
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchMentors(skillFilter, search);
  }, [skillFilter]);

  const handleAIMatch = async () => {
    if (!goal.trim()) return;
    if (!session) { window.location.href = '/auth'; return; }
    setMatching(true);
    setMatchError('');
    setAiMatches([]);
    try {
      const res = await fetch('/api/mentors/match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ goal }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setAiMatches(data.ranked || []);
      setActiveTab('ai-match');
    } catch (e) { setMatchError(e.message); } finally { setMatching(false); }
  };

  if (selected) {
    return (
      <div className="max-w-2xl mx-auto w-full">
        <MentorDetail mentor={selected} session={session} onBack={() => setSelected(null)} />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto w-full space-y-5">
      {showBecome && session && (
        <BecomeMentorModal
          session={session}
          token={session.access_token}
          onClose={() => setShowBecome(false)}
          onSaved={() => { setIsMentor(true); setShowBecome(false); }}
        />
      )}

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-gray-100 tracking-tighter">Mentor Marketplace</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-0.5 font-medium">Learn from experienced professionals. Accelerate your growth.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => { setRefreshing(true); fetchMentors(skillFilter, search); }} className="p-2 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 transition-colors">
            <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
          </button>
          {session && !isMentor && (
            <button onClick={() => setShowBecome(true)} className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-black px-4 py-2.5 rounded-xl transition-all active:scale-95 shadow-sm shadow-blue-500/20">
              <Plus size={15} /> Become a Mentor
            </button>
          )}
          {isMentor && (
            <span className="flex items-center gap-1.5 text-[11px] font-black text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/50 px-3 py-2 rounded-xl">
              <BadgeCheck size={13} /> Mentor
            </span>
          )}
        </div>
      </div>

      {/* AI Match panel */}
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/10 dark:to-indigo-900/10 border border-blue-200 dark:border-blue-800/50 rounded-2xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <Brain size={16} className="text-blue-500 shrink-0" />
          <p className="text-sm font-black text-gray-900 dark:text-gray-100">AI Mentor Matching</p>
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={goal}
            onChange={e => setGoal(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleAIMatch(); }}
            placeholder="e.g. I need help becoming a senior React developer"
            className="flex-1 bg-white dark:bg-gray-900 border border-blue-200 dark:border-blue-800/50 rounded-xl px-4 py-2.5 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
          />
          <button
            onClick={handleAIMatch}
            disabled={matching || !goal.trim()}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white px-4 py-2.5 rounded-xl font-bold text-sm transition-all active:scale-95"
          >
            {matching ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
            Match
          </button>
        </div>
        {matchError && <p className="text-xs text-red-500 dark:text-red-400 mt-2">{matchError}</p>}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl">
        {[{ id: 'browse', label: 'Browse All' }, { id: 'ai-match', label: `AI Picks${aiMatches.length ? ` (${aiMatches.length})` : ''}` }].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex-1 py-2 text-xs font-black rounded-lg transition-all ${activeTab === tab.id ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}`}>
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'browse' && (
        <>
          {/* Skill filter + search */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
            <div className="relative shrink-0">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') fetchMentors(skillFilter, search); }}
                placeholder="Search mentors…"
                className="pl-8 pr-3 py-2 text-xs bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all w-40"
              />
            </div>
            <button onClick={() => setSkillFilter('')} className={`shrink-0 text-[11px] font-bold px-3 py-2 rounded-xl transition-all ${!skillFilter ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'}`}>All</button>
            {['React', 'Python', 'AWS', 'AI/ML', 'System Design', 'Mobile', 'DevOps'].map(s => (
              <button key={s} onClick={() => setSkillFilter(skillFilter === s ? '' : s)} className={`shrink-0 text-[11px] font-bold px-3 py-2 rounded-xl transition-all ${skillFilter === s ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'}`}>{s}</button>
            ))}
          </div>

          {loading ? (
            <div className="space-y-4">{[1, 2, 3].map(i => <div key={i} className="h-40 bg-gray-100 dark:bg-gray-800 rounded-2xl animate-pulse" />)}</div>
          ) : mentors.length ? (
            <div className="space-y-4">
              {mentors.map(m => <MentorCard key={m.id} mentor={m} onSelect={setSelected} />)}
            </div>
          ) : (
            <div className="text-center py-20">
              <Users size={40} className="mx-auto text-gray-300 dark:text-gray-700 mb-3" />
              <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">No mentors found</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Be the first to become a mentor on the platform.</p>
              {session && !isMentor && <button onClick={() => setShowBecome(true)} className="mt-4 bg-blue-600 hover:bg-blue-500 text-white font-bold py-2.5 px-6 rounded-xl transition-all text-sm">Become a Mentor</button>}
            </div>
          )}
        </>
      )}

      {activeTab === 'ai-match' && (
        <div className="space-y-4">
          {aiMatches.length ? (
            <>
              <p className="text-[11px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest flex items-center gap-1.5">
                <Zap size={11} /> AI-Recommended Mentors for your goal
              </p>
              {aiMatches.map(m => <MentorCard key={m.id} mentor={m} onSelect={setSelected} matchScore={m.match_score} matchReason={m.match_reason} />)}
            </>
          ) : (
            <div className="text-center py-16">
              <Sparkles size={32} className="mx-auto text-gray-300 dark:text-gray-700 mb-3" />
              <p className="text-sm font-bold text-gray-900 dark:text-gray-100">No AI matches yet</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Describe your learning goal above to get AI-matched mentors.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
