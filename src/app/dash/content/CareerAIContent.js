'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Sparkles, Target, CheckCircle2, XCircle, AlertCircle, Loader2,
  ChevronRight, RotateCcw, Star, TrendingUp, BookOpen, Code2,
  ArrowRight, Clock, Zap, BarChart2, History, ChevronDown, ChevronUp,
  Brain, Lightbulb,
} from 'lucide-react';
import { supabase } from '../../supabaseClient';

const POPULAR_ROLES = [
  'Frontend Developer', 'Backend Developer', 'Full Stack Developer',
  'Mobile Developer (React Native)', 'DevOps Engineer', 'Data Scientist',
  'AI/ML Engineer', 'Cloud Architect', 'Cybersecurity Engineer',
  'Product Manager', 'UI/UX Designer', 'Blockchain Developer',
];

function ScoreMeter({ score }) {
  const color = score >= 75 ? 'text-emerald-500' : score >= 50 ? 'text-blue-500' : score >= 30 ? 'text-amber-500' : 'text-red-500';
  const bgColor = score >= 75 ? 'bg-emerald-500' : score >= 50 ? 'bg-blue-500' : score >= 30 ? 'bg-amber-500' : 'bg-red-500';
  const label = score >= 75 ? 'Strong' : score >= 50 ? 'Good' : score >= 30 ? 'Building' : 'Beginner';

  return (
    <div className="flex flex-col items-center gap-3 p-6 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl">
      <div className="relative w-32 h-32">
        <svg className="w-32 h-32 -rotate-90" viewBox="0 0 120 120">
          <circle cx="60" cy="60" r="50" fill="none" stroke="currentColor" className="text-gray-100 dark:text-gray-800" strokeWidth="10" />
          <circle
            cx="60" cy="60" r="50" fill="none" strokeWidth="10"
            className={bgColor.replace('bg-', 'stroke-')}
            strokeDasharray={`${(score / 100) * 314} 314`}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`text-3xl font-black ${color}`}>{score}</span>
          <span className="text-xs font-bold text-gray-400 dark:text-gray-500">/100</span>
        </div>
      </div>
      <div className="text-center">
        <p className={`text-sm font-black uppercase tracking-widest ${color}`}>{label}</p>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Readiness Score</p>
      </div>
    </div>
  );
}

function SkillChip({ skill, variant = 'have' }) {
  const styles = {
    have: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/50',
    weak: 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800/50',
    missing: 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800/50',
  };
  const icons = {
    have: <CheckCircle2 size={11} />,
    weak: <AlertCircle size={11} />,
    missing: <XCircle size={11} />,
  };
  return (
    <span className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-lg border ${styles[variant]}`}>
      {icons[variant]} {skill}
    </span>
  );
}

function RoadmapCard({ month, data, index }) {
  const [open, setOpen] = useState(index === 0);
  const colors = [
    { border: 'border-blue-200 dark:border-blue-800/50', bg: 'bg-blue-50 dark:bg-blue-900/10', badge: 'bg-blue-600 text-white', dot: 'bg-blue-500' },
    { border: 'border-violet-200 dark:border-violet-800/50', bg: 'bg-violet-50 dark:bg-violet-900/10', badge: 'bg-violet-600 text-white', dot: 'bg-violet-500' },
    { border: 'border-emerald-200 dark:border-emerald-800/50', bg: 'bg-emerald-50 dark:bg-emerald-900/10', badge: 'bg-emerald-600 text-white', dot: 'bg-emerald-500' },
  ];
  const c = colors[index] || colors[0];

  return (
    <div className={`border ${c.border} rounded-2xl overflow-hidden`}>
      <button
        onClick={() => setOpen(v => !v)}
        className={`w-full flex items-center justify-between p-4 ${c.bg} hover:opacity-90 transition-opacity`}
      >
        <div className="flex items-center gap-3">
          <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg ${c.badge}`}>
            Month {index + 1}
          </span>
          <span className="text-sm font-bold text-gray-900 dark:text-gray-100">{data?.focus}</span>
        </div>
        {open ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
      </button>
      {open && (
        <div className="p-4 space-y-4 bg-white dark:bg-gray-900">
          {data?.learn?.length > 0 && (
            <div>
              <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                <BookOpen size={11} /> Learn
              </p>
              <ul className="space-y-1.5">
                {data.learn.map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                    <div className={`w-1.5 h-1.5 rounded-full ${c.dot} mt-1.5 shrink-0`} />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {data?.build && (
            <div>
              <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                <Code2 size={11} /> Build
              </p>
              <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{data.build}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function AnalysisResult({ analysis, onReset }) {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-gray-900 dark:text-gray-100 tracking-tight">{analysis.current_level}</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 font-medium">{analysis.summary}</p>
        </div>
        <button
          onClick={onReset}
          className="p-2 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 transition-colors"
          title="New analysis"
        >
          <RotateCcw size={16} />
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <ScoreMeter score={analysis.score || 0} />
        <div className="sm:col-span-2 grid grid-cols-1 gap-3">
          {/* Have */}
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-4">
            <p className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
              <CheckCircle2 size={11} /> Current Skills ({analysis.have?.length || 0})
            </p>
            <div className="flex flex-wrap gap-1.5">
              {analysis.have?.map(s => <SkillChip key={s} skill={s} variant="have" />)}
              {!analysis.have?.length && <span className="text-xs text-gray-400">None detected</span>}
            </div>
          </div>
          {/* Weak */}
          {analysis.weak?.length > 0 && (
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-4">
              <p className="text-[10px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                <AlertCircle size={11} /> Needs Deepening ({analysis.weak.length})
              </p>
              <div className="flex flex-wrap gap-1.5">
                {analysis.weak.map(w => <SkillChip key={w.skill} skill={w.skill} variant="weak" />)}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Missing */}
      {analysis.missing?.length > 0 && (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-4">
          <p className="text-[10px] font-black text-red-600 dark:text-red-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
            <XCircle size={11} /> Missing Skills
          </p>
          <div className="space-y-2">
            {analysis.missing.map(m => (
              <div key={m.skill} className="flex items-start justify-between gap-3">
                <SkillChip skill={m.skill} variant="missing" />
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${
                    m.priority === 'high' ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                    : m.priority === 'medium' ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
                  }`}>{m.priority}</span>
                  {m.reason && <span className="text-xs text-gray-400 dark:text-gray-500 hidden sm:block">{m.reason}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Roadmap */}
      {analysis.roadmap && Object.keys(analysis.roadmap).length > 0 && (
        <div>
          <p className="text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
            <TrendingUp size={11} /> 3-Month Learning Roadmap
          </p>
          <div className="space-y-3">
            {['month_1', 'month_2', 'month_3'].map((key, i) =>
              analysis.roadmap[key] ? (
                <RoadmapCard key={key} month={key} data={analysis.roadmap[key]} index={i} />
              ) : null
            )}
          </div>
        </div>
      )}

      {/* Target titles */}
      {analysis.job_titles?.length > 0 && (
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/10 dark:to-indigo-900/10 border border-blue-200 dark:border-blue-800/50 rounded-2xl p-4">
          <p className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
            <Target size={11} /> Career Path Titles
          </p>
          <div className="flex flex-wrap gap-2">
            {analysis.job_titles.map((title, i) => (
              <div key={title} className="flex items-center gap-1.5 text-xs font-bold text-blue-700 dark:text-blue-300 bg-white dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/50 rounded-lg px-3 py-1.5">
                {i < 2 && <Star size={11} fill="currentColor" />}
                {title}
                {i === analysis.job_titles.length - 1 && <ArrowRight size={11} />}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function HistoryCard({ item, onLoad }) {
  return (
    <button
      onClick={() => onLoad(item)}
      className="w-full text-left p-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl hover:border-blue-400 dark:hover:border-blue-600 hover:shadow-md transition-all group"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-gray-900 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate">
            {item.target_role}
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
            {new Date(item.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className={`text-sm font-black ${item.score >= 70 ? 'text-emerald-500' : item.score >= 40 ? 'text-blue-500' : 'text-amber-500'}`}>
            {item.score}
          </span>
          <BarChart2 size={14} className="text-gray-400" />
        </div>
      </div>
    </button>
  );
}

export default function CareerAIContent() {
  const [session, setSession] = useState(null);
  const [step, setStep] = useState('form');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [analysis, setAnalysis] = useState(null);
  const [history, setHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);

  const [targetRole, setTargetRole] = useState('');
  const [cvText, setCvText] = useState('');
  const [experience, setExperience] = useState('');

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) loadHistory(session.access_token);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, s) => {
      setSession(s);
      if (s) loadHistory(s.access_token);
    });
    return () => subscription.unsubscribe();
  }, []);

  const loadHistory = useCallback(async (token) => {
    const res = await fetch('/api/career/analyze', { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) {
      const { analyses } = await res.json();
      setHistory(analyses || []);
    }
  }, []);

  const handleAnalyze = async () => {
    if (!targetRole.trim()) { setError('Please enter or select a target role'); return; }
    if (!session) { setError('Please sign in to use Career AI'); return; }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/career/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ targetRole: targetRole.trim(), cvText: cvText.trim(), experience: experience.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Analysis failed');
      setAnalysis(data.analysis);
      setStep('result');
      loadHistory(session.access_token);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const loadFromHistory = (item) => {
    setAnalysis({
      current_level: `${item.target_role} Candidate`,
      have: item.skills_found || [],
      weak: item.weak_skills || [],
      missing: item.missing_skills || [],
      score: item.score || 0,
      summary: item.summary || '',
      roadmap: item.roadmap || {},
    });
    setStep('result');
    setShowHistory(false);
  };

  if (!session) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="text-center py-20">
          <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Brain size={28} className="text-blue-500" />
          </div>
          <h2 className="text-2xl font-black text-gray-900 dark:text-gray-100 mb-2">Career AI Scanner</h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">Sign in to get your personalized career gap analysis and roadmap.</p>
          <button onClick={() => window.location.href = '/auth'} className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-6 rounded-xl transition-all active:scale-95">
            Sign In to Continue
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto w-full space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-gray-100 tracking-tighter">Career AI Scanner</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-0.5 font-medium">
            Discover your skill gaps and get a personalised 3-month roadmap.
          </p>
        </div>
        {history.length > 0 && (
          <button
            onClick={() => setShowHistory(v => !v)}
            className="flex items-center gap-1.5 text-xs font-bold text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 bg-gray-100 dark:bg-gray-800 hover:bg-blue-50 dark:hover:bg-blue-900/20 px-3 py-2 rounded-xl transition-all"
          >
            <History size={13} /> History ({history.length})
          </button>
        )}
      </div>

      {/* History panel */}
      {showHistory && history.length > 0 && (
        <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
          <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Past Analyses</p>
          {history.map(item => <HistoryCard key={item.id} item={item} onLoad={loadFromHistory} />)}
        </div>
      )}

      {step === 'form' && (
        <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
          {/* Target role */}
          <div>
            <label className="text-[11px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest block mb-2">
              Target Role *
            </label>
            <input
              type="text"
              value={targetRole}
              onChange={e => setTargetRole(e.target.value)}
              placeholder="e.g. Senior Frontend Developer"
              className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
            <div className="flex flex-wrap gap-1.5 mt-2">
              {POPULAR_ROLES.map(role => (
                <button
                  key={role}
                  onClick={() => setTargetRole(role)}
                  className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border transition-all ${
                    targetRole === role
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-blue-400 dark:hover:border-blue-600'
                  }`}
                >
                  {role}
                </button>
              ))}
            </div>
          </div>

          {/* CV paste */}
          <div>
            <label className="text-[11px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest block mb-2">
              Paste Your CV / Resume <span className="font-medium normal-case text-gray-400">(optional — improves accuracy)</span>
            </label>
            <textarea
              value={cvText}
              onChange={e => setCvText(e.target.value)}
              placeholder="Paste your CV text here for more accurate analysis..."
              rows={5}
              className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none transition-all"
            />
          </div>

          {/* Additional experience */}
          <div>
            <label className="text-[11px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest block mb-2">
              Additional Context <span className="font-medium normal-case text-gray-400">(projects, experience)</span>
            </label>
            <textarea
              value={experience}
              onChange={e => setExperience(e.target.value)}
              placeholder="Describe your current experience, projects you've built, tools you use..."
              rows={3}
              className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none transition-all"
            />
          </div>

          {error && (
            <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800/50 rounded-xl">
              <AlertCircle size={15} className="text-red-500 shrink-0 mt-0.5" />
              <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
            </div>
          )}

          <div className="flex items-center gap-3 p-4 bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800/50 rounded-2xl">
            <Lightbulb size={18} className="text-blue-500 shrink-0" />
            <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed">
              AI will compare your profile skills, CV, and experience against the target role requirements to generate a personalized gap analysis and 3-month learning roadmap.
            </p>
          </div>

          <button
            onClick={handleAnalyze}
            disabled={loading || !targetRole.trim()}
            className="w-full py-4 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black rounded-xl transition-all flex items-center justify-center gap-2 text-sm active:scale-95 shadow-lg shadow-blue-500/20"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
            {loading ? 'Analyzing Your Career…' : 'Run Career AI Analysis'}
          </button>
        </div>
      )}

      {step === 'result' && analysis && (
        <AnalysisResult analysis={analysis} onReset={() => { setStep('form'); setAnalysis(null); }} />
      )}
    </div>
  );
}
