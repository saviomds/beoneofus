'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  ShieldCheck, Star, Clock, CheckCircle2, XCircle, Loader2,
  ArrowLeft, Zap, Trophy, AlertCircle, RefreshCw, Lock, ChevronRight,
  BadgeCheck, Target, BarChart2, Timer,
} from 'lucide-react';
import { supabase } from '../../supabaseClient';

const AVAILABLE_SKILLS = [
  { name: 'JavaScript', icon: '🟨', level: 'Intermediate–Advanced', questions: 10 },
  { name: 'TypeScript', icon: '🔷', level: 'Intermediate', questions: 10 },
  { name: 'React', icon: '⚛️', level: 'Intermediate–Advanced', questions: 10 },
  { name: 'Next.js', icon: '▲', level: 'Intermediate', questions: 10 },
  { name: 'Node.js', icon: '🟩', level: 'Intermediate', questions: 10 },
  { name: 'Python', icon: '🐍', level: 'Beginner–Advanced', questions: 10 },
  { name: 'SQL', icon: '🗃️', level: 'Intermediate', questions: 10 },
  { name: 'Docker', icon: '🐳', level: 'Intermediate', questions: 10 },
  { name: 'AWS', icon: '☁️', level: 'Intermediate', questions: 10 },
  { name: 'System Design', icon: '🏗️', level: 'Advanced', questions: 10 },
  { name: 'Git', icon: '🔀', level: 'Beginner–Intermediate', questions: 10 },
  { name: 'Go', icon: '🐹', level: 'Intermediate', questions: 10 },
  { name: 'GraphQL', icon: '⬡', level: 'Intermediate', questions: 10 },
  { name: 'Cybersecurity', icon: '🔒', level: 'Intermediate', questions: 10 },
  { name: 'Data Science', icon: '📊', level: 'Intermediate', questions: 10 },
  { name: 'Flutter', icon: '💙', level: 'Intermediate', questions: 10 },
];

const PASS_SCORE = 75;
const TEST_DURATION = 10 * 60; // 10 minutes

function fmtTime(secs) {
  const m = Math.floor(secs / 60), s = secs % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function CertBadge({ cert }) {
  const expired = cert.expires_at && new Date(cert.expires_at) < new Date();
  return (
    <div className={`bg-white dark:bg-gray-900 border rounded-2xl p-4 flex items-center gap-3 ${expired ? 'border-gray-200 dark:border-gray-700 opacity-60' : 'border-blue-200 dark:border-blue-800/50'}`}>
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${expired ? 'bg-gray-100 dark:bg-gray-800' : 'bg-gradient-to-br from-blue-500 to-indigo-600'}`}>
        <BadgeCheck size={22} className={expired ? 'text-gray-400' : 'text-white'} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-black text-gray-900 dark:text-gray-100 text-sm">{cert.skill}</p>
        <p className="text-xs text-gray-500 dark:text-gray-400">Score: {cert.score}% · {expired ? 'Expired' : `Expires ${new Date(cert.expires_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`}</p>
      </div>
      <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-lg ${expired ? 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400' : 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800/50'}`}>
        {expired ? 'Expired' : 'Verified'}
      </span>
    </div>
  );
}

function SkillCard({ skill, cert, onStart }) {
  const isVerified = cert && !expired(cert);
  function expired(c) { return c?.expires_at && new Date(c.expires_at) < new Date(); }

  return (
    <button
      onClick={() => onStart(skill)}
      disabled={isVerified}
      className={`w-full text-left bg-white dark:bg-gray-900 border rounded-2xl p-4 transition-all group ${isVerified ? 'border-blue-200 dark:border-blue-800/50 cursor-default' : 'border-gray-200 dark:border-gray-800 hover:border-blue-400 dark:hover:border-blue-600 hover:shadow-md'}`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="text-2xl leading-none">{skill.icon}</span>
          <div>
            <p className="font-black text-gray-900 dark:text-gray-100 text-sm group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{skill.name}</p>
            <p className="text-[10px] text-gray-400 dark:text-gray-500 font-medium">{skill.level} · {skill.questions} questions · 10 min</p>
          </div>
        </div>
        {isVerified ? (
          <div className="flex items-center gap-1.5 text-[10px] font-black text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/50 px-2.5 py-1.5 rounded-xl shrink-0">
            <BadgeCheck size={12} /> Certified
          </div>
        ) : (
          <div className="flex items-center gap-1 text-[10px] font-black text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-2.5 py-1.5 rounded-xl shrink-0 group-hover:bg-blue-50 dark:group-hover:bg-blue-900/20 group-hover:text-blue-600 dark:group-hover:text-blue-400 group-hover:border-blue-200 dark:group-hover:border-blue-800/50 transition-all">
            <Zap size={11} /> Take Test
          </div>
        )}
      </div>
      {cert && !isVerified && (
        <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-2 font-bold">Certificate expired — retake to renew</p>
      )}
    </button>
  );
}

function ActiveTest({ skill, token, onDone, onBack }) {
  const [questions, setQuestions] = useState([]);
  const [testId, setTestId] = useState(null);
  const [answers, setAnswers] = useState({});
  const [currentIdx, setCurrentIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [results, setResults] = useState(null);
  const [timeLeft, setTimeLeft] = useState(TEST_DURATION);
  const [timedOut, setTimedOut] = useState(false);
  const [error, setError] = useState('');
  const startTime = useRef(Date.now());
  const timerRef = useRef(null);

  useEffect(() => {
    const generate = async () => {
      const res = await fetch('/api/skills/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: 'generate', skill: skill.name }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Failed to generate test'); setLoading(false); return; }
      setQuestions(data.questions || []);
      setTestId(data.test_id);
      setLoading(false);
    };
    generate();
  }, [skill, token]);

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) { clearInterval(timerRef.current); setTimedOut(true); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, []);

  useEffect(() => {
    if (timedOut && !results && !submitting) handleSubmit();
  }, [timedOut]);

  const handleSubmit = async () => {
    if (!testId) return;
    setSubmitting(true);
    clearInterval(timerRef.current);
    const timeTaken = Math.round((Date.now() - startTime.current) / 1000);
    const res = await fetch('/api/skills/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ action: 'submit', test_id: testId, answers, time_taken: timeTaken }),
    });
    const data = await res.json();
    if (res.ok) setResults(data);
    else setError(data.error || 'Submission failed');
    setSubmitting(false);
  };

  const q = questions[currentIdx];
  const answeredCount = Object.keys(answers).length;

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
      <Loader2 size={32} className="animate-spin text-blue-500" />
      <p className="text-sm font-bold text-gray-500 dark:text-gray-400">Generating {skill.name} test…</p>
    </div>
  );

  if (error) return (
    <div className="space-y-4">
      <button onClick={onBack} className="flex items-center gap-2 text-sm font-bold text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"><ArrowLeft size={14} /> Back</button>
      <div className="flex items-start gap-2 p-4 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800/50 rounded-2xl">
        <AlertCircle size={16} className="text-red-500 shrink-0 mt-0.5" />
        <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
      </div>
    </div>
  );

  if (results) {
    const passed = results.passed;
    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className={`rounded-3xl border p-8 text-center ${passed ? 'bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/10 dark:to-indigo-900/10 border-blue-200 dark:border-blue-800/50' : 'bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/10 dark:to-orange-900/10 border-amber-200 dark:border-amber-800/50'}`}>
          {passed ? <Trophy size={40} className="mx-auto mb-3 text-blue-500" /> : <Target size={40} className="mx-auto mb-3 text-amber-500" />}
          <p className="text-5xl font-black text-gray-900 dark:text-gray-100 mb-1">{results.score}%</p>
          <p className={`text-lg font-black uppercase tracking-widest mb-2 ${passed ? 'text-blue-600 dark:text-blue-400' : 'text-amber-600 dark:text-amber-400'}`}>
            {passed ? 'Certified!' : 'Not Quite'}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {results.correct}/{results.total} correct · Pass mark: {PASS_SCORE}%
          </p>
          {passed && (
            <div className="mt-4 inline-flex items-center gap-2 text-sm font-black text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-900/30 border border-blue-300 dark:border-blue-700/50 px-4 py-2 rounded-xl">
              <BadgeCheck size={16} /> {skill.name} Badge Earned
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden">
          <div className="px-5 py-3 bg-gray-50 dark:bg-gray-800/50">
            <p className="text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest">Answers Review</p>
          </div>
          {results.results?.slice(0, 5).map((r, i) => (
            <div key={r.id} className="px-5 py-3 border-t border-gray-100 dark:border-gray-800 flex items-start justify-between gap-3">
              <p className="text-xs text-gray-700 dark:text-gray-300 font-medium">Q{i + 1}</p>
              {r.correct
                ? <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
                : <XCircle size={16} className="text-red-400 shrink-0" />}
            </div>
          ))}
        </div>

        <div className="flex gap-3">
          <button onClick={onBack} className="flex-1 py-3 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-bold rounded-xl transition-all text-sm">
            Back to Skills
          </button>
          {!passed && (
            <button onClick={() => onDone()} className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-xl transition-all text-sm flex items-center justify-center gap-2">
              <RefreshCw size={14} /> Try Again
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 transition-colors"><ArrowLeft size={16} /></button>
          <div>
            <p className="font-black text-gray-900 dark:text-gray-100 text-sm">{skill.icon} {skill.name} Test</p>
            <p className="text-xs text-gray-400 dark:text-gray-500">{answeredCount}/{questions.length} answered</p>
          </div>
        </div>
        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border font-black text-sm tabular-nums ${timeLeft > 300 ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300' : timeLeft > 60 ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300' : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 animate-pulse'}`}>
          <Timer size={13} /> {fmtTime(timeLeft)}
        </div>
      </div>

      {/* Progress */}
      <div className="flex items-center gap-2">
        <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
          <div className="bg-blue-600 h-1.5 rounded-full transition-all duration-300" style={{ width: `${(answeredCount / questions.length) * 100}%` }} />
        </div>
      </div>

      {/* Question navigator */}
      <div className="flex gap-1.5 flex-wrap">
        {questions.map((_, i) => (
          <button key={i} onClick={() => setCurrentIdx(i)} className={`w-8 h-8 rounded-lg text-[11px] font-black transition-all border ${i === currentIdx ? 'bg-blue-600 text-white border-blue-600 scale-110 shadow-sm' : answers[questions[i]?.id] ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/50' : 'bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700'}`}>
            {answers[questions[i]?.id] ? <CheckCircle2 size={14} className="mx-auto" /> : i + 1}
          </button>
        ))}
      </div>

      {/* Question */}
      {q && (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Question {currentIdx + 1} of {questions.length}</span>
          </div>
          <p className="text-sm font-bold text-gray-900 dark:text-gray-100 leading-relaxed">{q.question}</p>
          <div className="space-y-2 mt-3">
            {q.options?.map(opt => (
              <button
                key={opt}
                onClick={() => setAnswers(prev => ({ ...prev, [q.id]: opt }))}
                className={`w-full text-left px-4 py-3 rounded-xl border text-sm font-medium transition-all ${
                  answers[q.id] === opt
                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                    : 'bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-blue-400 dark:hover:border-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/10'
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
          <div className="flex gap-2 pt-1">
            {currentIdx > 0 && <button onClick={() => setCurrentIdx(p => p - 1)} className="flex-1 py-2.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-bold rounded-xl transition-all">← Prev</button>}
            {currentIdx < questions.length - 1 ? (
              <button onClick={() => setCurrentIdx(p => p + 1)} className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold rounded-xl transition-all">Next →</button>
            ) : (
              <button onClick={handleSubmit} disabled={submitting || answeredCount < questions.length} className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-black rounded-xl transition-all flex items-center justify-center gap-2">
                {submitting ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
                {submitting ? 'Grading…' : `Submit (${answeredCount}/${questions.length})`}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function SkillsContent() {
  const [session, setSession] = useState(null);
  const [certifications, setCertifications] = useState([]);
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTest, setActiveTest] = useState(null);
  const [activeTab, setActiveTab] = useState('skills');

  const loadData = useCallback(async (token) => {
    const res = await fetch('/api/skills/test', { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) { const data = await res.json(); setCertifications(data.certifications || []); setTests(data.tests || []); }
    setLoading(false);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) loadData(session.access_token);
      else setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, s) => {
      setSession(s);
      if (s) loadData(s.access_token);
    });
    return () => subscription.unsubscribe();
  }, [loadData]);

  if (!session) {
    return (
      <div className="max-w-2xl mx-auto text-center py-20">
        <ShieldCheck size={40} className="mx-auto text-gray-300 dark:text-gray-700 mb-3" />
        <h2 className="text-xl font-black text-gray-900 dark:text-gray-100 mb-2">Verified Skills</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">Sign in to take skill tests and earn verified badges.</p>
        <button onClick={() => window.location.href = '/auth'} className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-6 rounded-xl transition-all">Sign In</button>
      </div>
    );
  }

  if (activeTest) {
    return (
      <div className="max-w-2xl mx-auto w-full">
        <ActiveTest
          skill={activeTest}
          token={session.access_token}
          onBack={() => { setActiveTest(null); loadData(session.access_token); }}
          onDone={() => { setActiveTest(null); loadData(session.access_token); }}
        />
      </div>
    );
  }

  const certMap = Object.fromEntries(certifications.map(c => [c.skill, c]));

  return (
    <div className="max-w-2xl mx-auto w-full space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-gray-100 tracking-tighter">Verified Skills</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-0.5 font-medium">Take AI-powered tests and earn verified skill badges.</p>
        </div>
        {certifications.length > 0 && (
          <div className="text-right">
            <p className="text-2xl font-black text-blue-600 dark:text-blue-400">{certifications.length}</p>
            <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Badges</p>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl">
        {[{ id: 'skills', label: 'Take a Test' }, { id: 'badges', label: `My Badges (${certifications.length})` }, { id: 'history', label: 'Test History' }].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex-1 py-2 text-xs font-black rounded-lg transition-all ${activeTab === tab.id ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}`}>
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-20 bg-gray-100 dark:bg-gray-800 rounded-2xl animate-pulse" />)}</div>
      ) : activeTab === 'skills' ? (
        <div>
          <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3">Available Tests — score ≥{PASS_SCORE}% to earn a badge</p>
          <div className="space-y-2">
            {AVAILABLE_SKILLS.map(skill => (
              <SkillCard key={skill.name} skill={skill} cert={certMap[skill.name]} onStart={setActiveTest} />
            ))}
          </div>
        </div>
      ) : activeTab === 'badges' ? (
        certifications.length ? (
          <div className="space-y-3">
            {certifications.map(c => <CertBadge key={c.id} cert={c} />)}
          </div>
        ) : (
          <div className="text-center py-16">
            <BadgeCheck size={36} className="mx-auto text-gray-300 dark:text-gray-700 mb-3" />
            <h3 className="font-bold text-gray-900 dark:text-gray-100">No badges yet</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Take a test and score ≥{PASS_SCORE}% to earn your first badge.</p>
            <button onClick={() => setActiveTab('skills')} className="mt-4 bg-blue-600 hover:bg-blue-500 text-white font-bold py-2.5 px-5 rounded-xl transition-all text-sm">Take a Test</button>
          </div>
        )
      ) : (
        tests.length ? (
          <div className="space-y-2">
            {tests.map(t => (
              <div key={t.id} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-bold text-gray-900 dark:text-gray-100">{t.skill}</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500">{new Date(t.created_at).toLocaleDateString()}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-lg font-black ${t.score >= PASS_SCORE ? 'text-emerald-500' : 'text-amber-500'}`}>{t.score}%</span>
                  {t.passed ? <BadgeCheck size={18} className="text-blue-500" /> : <XCircle size={18} className="text-gray-400" />}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <BarChart2 size={36} className="mx-auto text-gray-300 dark:text-gray-700 mb-3" />
            <p className="text-gray-500 dark:text-gray-400 text-sm">No tests taken yet.</p>
          </div>
        )
      )}
    </div>
  );
}
