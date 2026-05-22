'use client';

import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import {
  Briefcase, ChevronRight, CheckCircle2, XCircle, Loader2, Code2,
  MessageSquare, Star, AlertTriangle, ArrowLeft, Trophy, Clock,
  TrendingUp, Zap, BarChart2, ChevronDown, ChevronUp, RefreshCw, Trash2,
} from 'lucide-react';
import { supabase } from '../../supabaseClient';

const MonacoEditor = dynamic(
  async () => {
    if (typeof window !== 'undefined' && !window.MonacoEnvironment) {
      window.MonacoEnvironment = {
        getWorker(_, label) {
          const blob = new Blob(['self.onmessage=function(){};'], { type: 'application/javascript' });
          return new Worker(URL.createObjectURL(blob));
        },
      };
    }
    const monaco = await import('monaco-editor');
    const { loader, default: Editor } = await import('@monaco-editor/react');
    loader.config({ monaco });
    return Editor;
  },
  { ssr: false }
);

// ── Helpers ──────────────────────────────────────────────────

function ScoreBadge({ score }) {
  const color =
    score >= 80 ? 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
    : score >= 60 ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
    : score >= 40 ? 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800'
    : 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800';
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-black px-2.5 py-1 rounded-lg border ${color}`}>
      <Star size={11} fill="currentColor" /> {score}/100
    </span>
  );
}

function StatusPill({ status }) {
  const map = {
    active:           { label: 'In Progress',      cls: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800' },
    answers_complete: { label: 'Q&A Done',         cls: 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800' },
    coding:           { label: 'Coding Challenge',  cls: 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-800' },
    completed:        { label: 'Completed',         cls: 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 border-green-200 dark:border-green-800' },
  };
  const { label, cls } = map[status] || map.active;
  return <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg border ${cls}`}>{label}</span>;
}

// ── Room List ─────────────────────────────────────────────────

function RoomList({ rooms, onSelect, onDelete, deletingId, loading }) {
  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2].map(i => (
          <div key={i} className="h-28 bg-gray-100 dark:bg-gray-800 rounded-2xl animate-pulse" />
        ))}
      </div>
    );
  }
  if (!rooms.length) {
    return (
      <div className="text-center py-20">
        <Briefcase size={40} className="mx-auto text-gray-300 dark:text-gray-700 mb-4" />
        <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">No Interviews Yet</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 max-w-xs mx-auto">
          When an employer invites you to an interview, it will appear here.
        </p>
      </div>
    );
  }
  return (
    <div className="space-y-4">
      {rooms.map(room => (
        <div
          key={room.id}
          className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl hover:border-blue-400 dark:hover:border-blue-600 hover:shadow-lg transition-all group"
        >
          <button
            onClick={() => onSelect(room)}
            className="w-full text-left p-5"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <StatusPill status={room.status} />
                  {room.overall_score != null && <ScoreBadge score={room.overall_score} />}
                </div>
                <h3 className="font-black text-gray-900 dark:text-gray-100 text-base group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate mt-2">
                  {room.job_title}
                </h3>
                {room.company && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">{room.company}</p>
                )}
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1.5">
                  {room.questions?.length || 0} question{room.questions?.length !== 1 ? 's' : ''} ·{' '}
                  {new Date(room.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </p>
              </div>
              <ChevronRight size={18} className="text-gray-400 group-hover:text-blue-500 transition-colors mt-1 shrink-0" />
            </div>
          </button>
          <div className="px-5 pb-4 flex justify-end border-t border-gray-100 dark:border-gray-800 pt-3">
            <button
              onClick={() => onDelete(room.id)}
              disabled={deletingId === room.id}
              className="flex items-center gap-1.5 text-xs font-bold text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300 disabled:opacity-50 transition-colors"
            >
              {deletingId === room.id
                ? <Loader2 size={13} className="animate-spin" />
                : <Trash2 size={13} />}
              Delete
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Q&A Phase ─────────────────────────────────────────────────

function QAPhase({ room, answers, onAnswerSubmit, submitting, timeUp, onTimeUp }) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [draft, setDraft] = useState('');
  const [feedback, setFeedback] = useState(null); // { score, ai_feedback, strengths, improvements }
  const [showingFeedback, setShowingFeedback] = useState(false);

  const questions = room.questions || [];

  // Restore progress: find the first unanswered question
  useEffect(() => {
    const answeredIndices = new Set(answers.map(a => a.question_index));
    let start = 0;
    while (start < questions.length && answeredIndices.has(start)) start++;
    setCurrentIdx(Math.min(start, questions.length - 1));
  }, [answers, questions.length]);

  const answered = new Set(answers.map(a => a.question_index));
  const question = questions[currentIdx];
  const existingAnswer = answers.find(a => a.question_index === currentIdx);

  // Restore saved draft from localStorage when switching questions
  useEffect(() => {
    if (existingAnswer) { setDraft(''); return; }
    const saved = localStorage.getItem(`iv_draft_${room.id}_${currentIdx}`);
    setDraft(saved || '');
  }, [currentIdx, room.id, existingAnswer]);

  // Auto-save draft to localStorage as user types
  useEffect(() => {
    if (draft) localStorage.setItem(`iv_draft_${room.id}_${currentIdx}`, draft);
  }, [draft, currentIdx, room.id]);

  const handleSubmit = async () => {
    if (!draft.trim()) return;
    const result = await onAnswerSubmit(currentIdx, question.text, draft.trim());
    if (result) {
      localStorage.removeItem(`iv_draft_${room.id}_${currentIdx}`);
      setFeedback(result);
      setShowingFeedback(true);
      setDraft('');
    }
  };

  // Auto-submit current draft when timer expires, then hand off to parent
  useEffect(() => {
    if (!timeUp) return;
    const auto = async () => {
      if (draft.trim() && question && !existingAnswer) {
        await onAnswerSubmit(currentIdx, question.text, draft.trim());
        localStorage.removeItem(`iv_draft_${room.id}_${currentIdx}`);
      }
      onTimeUp?.();
    };
    auto();
  }, [timeUp]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleNext = () => {
    setShowingFeedback(false);
    setFeedback(null);
    const next = currentIdx + 1;
    if (next < questions.length) setCurrentIdx(next);
  };

  if (!questions.length) return null;

  return (
    <div className="space-y-6">
      {/* Progress bar */}
      <div className="flex items-center gap-3">
        <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-500"
            style={{ width: `${(answered.size / questions.length) * 100}%` }}
          />
        </div>
        <span className="text-xs font-black text-gray-500 dark:text-gray-400 shrink-0">
          {answered.size}/{questions.length}
        </span>
      </div>

      {/* Question navigator */}
      <div className="flex gap-2 flex-wrap">
        {questions.map((_, i) => (
          <button
            key={i}
            onClick={() => { setShowingFeedback(false); setFeedback(null); setCurrentIdx(i); }}
            className={`w-8 h-8 rounded-lg text-xs font-black transition-all border ${
              i === currentIdx
                ? 'bg-blue-600 text-white border-blue-600 scale-110 shadow-md'
                : answered.has(i)
                ? 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 border-green-200 dark:border-green-800'
                : 'bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700'
            }`}
          >
            {answered.has(i) ? <CheckCircle2 size={14} className="mx-auto" /> : i + 1}
          </button>
        ))}
      </div>

      {/* Question card */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-3">
          <MessageSquare size={14} className="text-blue-500" />
          <span className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">
            Question {currentIdx + 1} of {questions.length}
          </span>
        </div>
        <p className="text-base font-bold text-gray-900 dark:text-gray-100 leading-relaxed">
          {question?.text}
        </p>
        {question?.context && (
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 italic">{question.context}</p>
        )}
      </div>

      {/* Previous answer (read-only) */}
      {existingAnswer && !showingFeedback && (
        <div className="bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest">Your Answer</span>
            <ScoreBadge score={existingAnswer.ai_score} />
          </div>
          <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{existingAnswer.answer_text}</p>
          <button
            onClick={() => setShowingFeedback(true)}
            className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
          >
            View AI Feedback <ChevronDown size={12} />
          </button>
        </div>
      )}

      {/* AI Feedback panel */}
      {(showingFeedback && (feedback || existingAnswer)) && (() => {
        const fb = feedback || existingAnswer;
        return (
          <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800/50 rounded-2xl p-5 space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest flex items-center gap-1.5">
                <Zap size={12} /> AI Feedback
              </span>
              <ScoreBadge score={fb.ai_score} />
            </div>
            <p className="text-sm text-gray-800 dark:text-gray-200 leading-relaxed">{fb.ai_feedback}</p>
            {fb.strengths?.length > 0 && (
              <div>
                <p className="text-[10px] font-black text-green-600 dark:text-green-400 uppercase tracking-widest mb-1.5">Strengths</p>
                <ul className="space-y-1">
                  {fb.strengths.map((s, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                      <CheckCircle2 size={14} className="text-green-500 shrink-0 mt-0.5" /> {s}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {fb.improvements?.length > 0 && (
              <div>
                <p className="text-[10px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-widest mb-1.5">Improvements</p>
                <ul className="space-y-1">
                  {fb.improvements.map((s, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                      <TrendingUp size={14} className="text-amber-500 shrink-0 mt-0.5" /> {s}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {currentIdx < questions.length - 1 && (
              <button
                onClick={handleNext}
                className="w-full mt-2 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all text-sm flex items-center justify-center gap-2 active:scale-95"
              >
                Next Question <ChevronRight size={16} />
              </button>
            )}
          </div>
        );
      })()}

      {/* Answer input (only if not yet answered or re-answering) */}
      {!existingAnswer && !showingFeedback && (
        <div className="space-y-3">
          <textarea
            value={draft}
            onChange={e => setDraft(e.target.value)}
            placeholder="Type your answer here... Be thorough and specific."
            rows={6}
            className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none transition-all"
          />
          <button
            onClick={handleSubmit}
            disabled={submitting || draft.trim().length < 10}
            className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 text-sm active:scale-95 shadow-md shadow-blue-500/20"
          >
            {submitting ? <Loader2 size={16} className="animate-spin" /> : <Zap size={16} />}
            {submitting ? 'Evaluating…' : 'Submit & Get AI Feedback'}
          </button>
        </div>
      )}
    </div>
  );
}

// ── Coding Phase ──────────────────────────────────────────────

function CodingPhase({ room, userId, onComplete, timeUp }) {
  const [challenge, setChallenge] = useState(room.coding_challenge || null);
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(!room.coding_challenge);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [showDesc, setShowDesc] = useState(true);

  const fetchChallenge = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/interview/coding-challenge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'generate', roomId: room.id, applicantId: userId }),
      });
      const data = await res.json();
      if (data.challenge) {
        setChallenge(data.challenge);
        setCode(data.challenge.starterCode || '');
      }
    } catch (err) {
      console.error('Challenge fetch failed:', err);
    } finally {
      setLoading(false);
    }
  }, [room.id, userId]);

  useEffect(() => {
    if (!challenge) fetchChallenge();
    else {
      const saved = localStorage.getItem(`iv_code_${room.id}`);
      setCode(saved || challenge.starterCode || '');
    }
  }, [challenge, fetchChallenge, room.id]);

  // Auto-save code to localStorage on every change
  useEffect(() => {
    if (code) localStorage.setItem(`iv_code_${room.id}`, code);
  }, [code, room.id]);

  // Auto-submit when timer expires
  useEffect(() => {
    if (timeUp && !result && !submitting) handleSubmit();
  }, [timeUp]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmit = async () => {
    if (!code.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/interview/coding-challenge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'submit',
          roomId: room.id,
          applicantId: userId,
          code,
          language: challenge?.language || 'javascript',
        }),
      });
      const data = await res.json();
      if (data.success) {
        localStorage.removeItem(`iv_code_${room.id}`);
        setResult(data);
        onComplete(data);
      }
    } catch (err) {
      console.error('Code submit failed:', err);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <Loader2 size={32} className="animate-spin text-blue-500" />
        <p className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">Generating Your Challenge…</p>
      </div>
    );
  }

  if (result) {
    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className={`rounded-2xl border p-6 ${result.passed ? 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800' : 'bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800'}`}>
          <div className="flex items-center gap-3 mb-4">
            {result.passed
              ? <CheckCircle2 size={28} className="text-green-500" />
              : <AlertTriangle size={28} className="text-amber-500" />}
            <div>
              <p className="font-black text-gray-900 dark:text-gray-100 text-lg">
                {result.passed ? 'Challenge Passed!' : 'Challenge Submitted'}
              </p>
              <ScoreBadge score={result.score} />
            </div>
          </div>
          <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{result.feedback}</p>
          <div className="flex gap-4 mt-4">
            <div className="flex items-center gap-1.5 text-xs font-bold text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 rounded-lg px-3 py-1.5 border border-gray-200 dark:border-gray-700">
              <Clock size={12} /> Time: {result.timeComplexity}
            </div>
            <div className="flex items-center gap-1.5 text-xs font-bold text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 rounded-lg px-3 py-1.5 border border-gray-200 dark:border-gray-700">
              <BarChart2 size={12} /> Space: {result.spaceComplexity}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Challenge description */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden">
        <button
          onClick={() => setShowDesc(v => !v)}
          className="w-full flex items-center justify-between p-5 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Code2 size={16} className="text-purple-500" />
            <span className="font-black text-gray-900 dark:text-gray-100">{challenge?.title}</span>
            <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-800">
              {challenge?.difficulty || 'medium'}
            </span>
          </div>
          {showDesc ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
        </button>
        {showDesc && (
          <div className="px-5 pb-5 border-t border-gray-100 dark:border-gray-800">
            <div className="prose prose-sm dark:prose-invert max-w-none pt-4">
              <pre className="whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300 font-sans leading-relaxed bg-transparent p-0 m-0">
                {challenge?.description}
              </pre>
            </div>
            {challenge?.testCases?.length > 0 && (
              <div className="mt-4 space-y-2">
                <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Test Cases</p>
                {challenge.testCases.map((tc, i) => (
                  <div key={i} className="text-xs font-mono bg-gray-50 dark:bg-gray-800 rounded-lg px-3 py-2 border border-gray-200 dark:border-gray-700">
                    <span className="text-gray-500 dark:text-gray-400">Input:</span> {tc.input} →{' '}
                    <span className="text-gray-500 dark:text-gray-400">Expected:</span> {tc.expected}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Monaco editor */}
      <div className="rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="bg-gray-900 px-4 py-2 flex items-center gap-2">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <div className="w-3 h-3 rounded-full bg-amber-400" />
            <div className="w-3 h-3 rounded-full bg-green-500" />
          </div>
          <span className="text-xs text-gray-400 font-mono ml-2">{challenge?.language || 'javascript'}</span>
        </div>
        <MonacoEditor
          height="380px"
          language={challenge?.language || 'javascript'}
          theme="vs-dark"
          value={code}
          onChange={v => setCode(v || '')}
          options={{
            fontSize: 14,
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            lineNumbers: 'on',
            roundedSelection: true,
            automaticLayout: true,
            tabSize: 2,
          }}
        />
      </div>

      <button
        onClick={handleSubmit}
        disabled={submitting || !code.trim()}
        className="w-full py-4 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-black rounded-xl transition-all flex items-center justify-center gap-2 text-sm active:scale-95 shadow-lg shadow-purple-500/20"
      >
        {submitting ? <Loader2 size={16} className="animate-spin" /> : <Code2 size={16} />}
        {submitting ? 'Evaluating Code…' : 'Submit Code for AI Review'}
      </button>
    </div>
  );
}

// ── Results View ──────────────────────────────────────────────

function ResultsView({ room, answers, codeResult }) {
  const qScores = answers.map(a => a.ai_score || 0);
  const avg = qScores.length ? Math.round(qScores.reduce((s, n) => s + n, 0) / qScores.length) : 0;
  const overall = room.overall_score ?? avg;

  const grade =
    overall >= 85 ? { label: 'Excellent', color: 'text-green-600 dark:text-green-400', bg: 'from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20' }
    : overall >= 70 ? { label: 'Good', color: 'text-blue-600 dark:text-blue-400', bg: 'from-blue-50 to-sky-50 dark:from-blue-900/20 dark:to-sky-900/20' }
    : overall >= 55 ? { label: 'Fair', color: 'text-amber-600 dark:text-amber-400', bg: 'from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20' }
    : { label: 'Needs Work', color: 'text-red-600 dark:text-red-400', bg: 'from-red-50 to-rose-50 dark:from-red-900/20 dark:to-rose-900/20' };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Score card */}
      <div className={`bg-gradient-to-br ${grade.bg} border border-gray-200 dark:border-gray-700 rounded-3xl p-8 text-center`}>
        <Trophy size={40} className={`mx-auto mb-4 ${grade.color}`} />
        <p className="text-5xl font-black text-gray-900 dark:text-gray-100 mb-1">{overall}</p>
        <p className={`text-lg font-black ${grade.color} uppercase tracking-widest mb-2`}>{grade.label}</p>
        <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Overall Interview Score</p>
      </div>

      {/* Per-question breakdown */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl divide-y divide-gray-100 dark:divide-gray-800 overflow-hidden">
        <div className="px-5 py-3 bg-gray-50 dark:bg-gray-800/50">
          <p className="text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest">Q&A Breakdown</p>
        </div>
        {answers.sort((a, b) => a.question_index - b.question_index).map((a, i) => (
          <div key={a.id} className="p-5 space-y-2">
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm font-bold text-gray-800 dark:text-gray-200 leading-snug flex-1 min-w-0">{a.question_text}</p>
              <ScoreBadge score={a.ai_score} />
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">{a.ai_feedback}</p>
          </div>
        ))}
      </div>

      {/* Coding result */}
      {codeResult && (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5 space-y-2">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest">Coding Challenge</p>
            <ScoreBadge score={codeResult.score} />
          </div>
          <p className="text-sm text-gray-700 dark:text-gray-300">{codeResult.feedback}</p>
          <div className="flex gap-3 mt-2 flex-wrap">
            <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 px-2.5 py-1 rounded-lg border border-gray-200 dark:border-gray-700 font-mono">
              Time: {codeResult.timeComplexity}
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 px-2.5 py-1 rounded-lg border border-gray-200 dark:border-gray-700 font-mono">
              Space: {codeResult.spaceComplexity}
            </span>
            {codeResult.passed && (
              <span className="text-xs font-black text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-2.5 py-1 rounded-lg border border-green-200 dark:border-green-800">
                ✓ Tests Passed
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Room Detail ───────────────────────────────────────────────

function RoomDetail({ room: initialRoom, userId, onBack }) {
  const [room, setRoom] = useState(initialRoom);
  const [answers, setAnswers] = useState([]);
  const [codeResult, setCodeResult] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [leaveConfirm, setLeaveConfirm] = useState(false);
  const [timeLeft, setTimeLeft] = useState(null); // seconds remaining, null = no timer
  const [timeUp, setTimeUp] = useState(false);

  useEffect(() => {
    const fetchAnswers = async () => {
      const { data } = await supabase
        .from('interview_answers')
        .select('*')
        .eq('room_id', room.id)
        .order('question_index');
      setAnswers(data || []);
    };
    fetchAnswers();
  }, [room.id]);

  const handleAnswerSubmit = async (questionIndex, questionText, answerText) => {
    setSubmitting(true);
    try {
      const res = await fetch('/api/interview/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId: room.id,
          applicantId: userId,
          questionIndex,
          questionText,
          answerText,
          jobTitle: room.job_title,
          company: room.company,
        }),
      });
      const data = await res.json();
      if (data.answer) {
        setAnswers(prev => {
          const next = prev.filter(a => a.question_index !== questionIndex);
          return [...next, data.answer];
        });
        if (data.allAnswered) {
          setRoom(prev => ({ ...prev, status: 'answers_complete' }));
        }
        return data.answer;
      }
    } catch (err) {
      console.error('Answer submit failed:', err);
    } finally {
      setSubmitting(false);
    }
    return null;
  };

  const handleCodeComplete = (result) => {
    localStorage.removeItem(`iv_timer_${initialRoom.id}`);
    setCodeResult(result);
    setRoom(prev => ({ ...prev, status: 'completed', overall_score: result.overallScore }));
  };

  // Force-complete the interview from the Q&A side (called when timer expires mid-Q&A)
  const handleForceComplete = useCallback(async () => {
    const { data: currentAnswers } = await supabase
      .from('interview_answers')
      .select('ai_score')
      .eq('room_id', initialRoom.id);
    const scores = (currentAnswers || []).map(a => a.ai_score || 0);
    const overallScore = scores.length
      ? Math.round(scores.reduce((s, n) => s + n, 0) / scores.length)
      : 0;
    await supabase
      .from('interview_rooms')
      .update({ status: 'completed', overall_score: overallScore })
      .eq('id', initialRoom.id);
    localStorage.removeItem(`iv_timer_${initialRoom.id}`);
    setRoom(prev => ({ ...prev, status: 'completed', overall_score: overallScore }));
  }, [initialRoom.id]);

  const allAnswered = answers.length >= (room.questions?.length || 0);
  const phase = room.status === 'completed' ? 'results'
    : (room.status === 'coding' || room.status === 'answers_complete') && allAnswered ? 'coding'
    : 'qa';

  // Countdown timer
  useEffect(() => {
    if (phase === 'results') return;
    const endTime = Number(localStorage.getItem(`iv_timer_${initialRoom.id}`));
    if (!endTime) return;
    const tick = () => {
      const remaining = Math.max(0, Math.ceil((endTime - Date.now()) / 1000));
      setTimeLeft(remaining);
      if (remaining === 0) setTimeUp(true);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [phase, initialRoom.id]);

  // Warn on browser close/refresh while interview is in progress
  useEffect(() => {
    if (phase === 'results') return;
    const handler = (e) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [phase]);

  const handleBack = () => {
    if (phase !== 'results') { setLeaveConfirm(true); return; }
    onBack();
  };

  return (
    <div className="space-y-5">
      {/* Leave confirmation modal */}
      {leaveConfirm && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-gray-200 dark:border-gray-700 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 mb-3">
              <AlertTriangle size={22} className="text-amber-500 shrink-0" />
              <h3 className="font-black text-gray-900 dark:text-gray-100">Leave Interview?</h3>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-5 leading-relaxed">
              Your progress is saved and you can come back to finish. But the interview won't be submitted until you complete all sections.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setLeaveConfirm(false)}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                Stay
              </button>
              <button
                onClick={onBack}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-sm font-bold transition-colors"
              >
                Leave
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-start gap-3">
        <button
          onClick={handleBack}
          className="p-2 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 transition-colors shrink-0 mt-0.5"
        >
          <ArrowLeft size={16} />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <StatusPill status={room.status} />
          </div>
          <h2 className="font-black text-gray-900 dark:text-gray-100 text-xl tracking-tight leading-tight">{room.job_title}</h2>
          {room.company && <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">{room.company}</p>}
        </div>
        {/* Countdown timer */}
        {timeLeft !== null && phase !== 'results' && (
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border font-black text-sm tabular-nums shrink-0 ${
            timeLeft > 600
              ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-700 dark:text-green-300'
              : timeLeft > 180
              ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300'
              : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 animate-pulse'
          }`}>
            <Clock size={13} />
            {fmtTime(timeLeft)}
          </div>
        )}
      </div>

      {/* Phase indicator */}
      <div className="flex items-center gap-2 text-xs font-bold text-gray-400 dark:text-gray-500">
        <span className={phase === 'qa' || phase === 'coding' || phase === 'results' ? 'text-blue-600 dark:text-blue-400' : ''}>
          Q&A
        </span>
        <ChevronRight size={12} />
        <span className={phase === 'coding' || phase === 'results' ? 'text-purple-600 dark:text-purple-400' : ''}>
          Coding
        </span>
        <ChevronRight size={12} />
        <span className={phase === 'results' ? 'text-green-600 dark:text-green-400' : ''}>
          Results
        </span>
      </div>

      {/* Phase content */}
      {phase === 'qa' && (
        <QAPhase
          room={room}
          answers={answers}
          onAnswerSubmit={handleAnswerSubmit}
          submitting={submitting}
          timeUp={timeUp}
          onTimeUp={handleForceComplete}
        />
      )}

      {phase === 'coding' && (
        <>
          <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/50 rounded-xl p-4 flex items-start gap-3">
            <CheckCircle2 size={18} className="text-green-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-gray-900 dark:text-gray-100">Q&A Complete!</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Now complete the coding challenge below. Your code will be evaluated by AI.
              </p>
            </div>
          </div>
          <CodingPhase room={room} userId={userId} onComplete={handleCodeComplete} timeUp={timeUp} />
        </>
      )}

      {phase === 'results' && (
        <ResultsView room={room} answers={answers} codeResult={codeResult} />
      )}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────

const INTERVIEW_DURATION_MS = 60 * 60 * 1000; // 60 minutes total

function fmtTime(s) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

const INTERVIEW_RULES = [
  { icon: MessageSquare, text: 'Answer each question in your own words. Be specific and thorough — vague answers score lower.' },
  { icon: XCircle,       text: 'Submitted answers cannot be edited. Think before you submit.' },
  { icon: ChevronRight,  text: 'The coding challenge unlocks only after all Q&A questions are answered.' },
  { icon: Code2,         text: 'You have ~20–30 minutes for the coding challenge. Write clean, working code.' },
  { icon: Zap,           text: 'Each answer and your code are evaluated by AI immediately.' },
  { icon: Clock,         text: 'You have 60 minutes total. When the timer reaches zero your interview is automatically submitted with whatever you have completed.' },
  { icon: AlertTriangle, text: 'Do not close or refresh the tab mid-interview. Your drafts are auto-saved, but the interview won\'t be submitted until all sections are complete.' },
];

function InterviewRulesScreen({ room, onBegin, onBack }) {
  const [agreed, setAgreed] = useState(false);
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="flex items-start gap-3">
        <button
          onClick={onBack}
          className="p-2 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 transition-colors shrink-0 mt-0.5"
        >
          <ArrowLeft size={16} />
        </button>
        <div>
          <h2 className="font-black text-gray-900 dark:text-gray-100 text-xl tracking-tight">Before You Begin</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 font-medium mt-0.5">{room.job_title}{room.company ? ` · ${room.company}` : ''}</p>
        </div>
      </div>

      <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800/50 rounded-2xl p-5 space-y-4">
        <p className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest">Interview Rules</p>
        <ul className="space-y-3.5">
          {INTERVIEW_RULES.map(({ icon: Icon, text }, i) => (
            <li key={i} className="flex items-start gap-3">
              <Icon size={15} className="text-blue-500 dark:text-blue-400 shrink-0 mt-0.5" />
              <span className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{text}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-4 flex items-center justify-between gap-3">
        <span className="text-sm text-gray-700 dark:text-gray-300 font-medium">
          {room.questions?.length || 0} questions · AI-evaluated · Coding challenge included
        </span>
        <span className="flex items-center gap-1.5 text-sm font-black text-amber-600 dark:text-amber-400 shrink-0">
          <Clock size={14} /> 60:00
        </span>
      </div>

      <label className="flex items-start gap-3 cursor-pointer group">
        <input
          type="checkbox"
          checked={agreed}
          onChange={e => setAgreed(e.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-gray-300 dark:border-gray-600 text-blue-600 accent-blue-600 cursor-pointer shrink-0"
        />
        <span className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed group-hover:text-gray-900 dark:group-hover:text-gray-200 transition-colors">
          I have read and understood the rules above.
        </span>
      </label>

      <button
        onClick={() => {
          const key = `iv_timer_${room.id}`;
          if (!localStorage.getItem(key)) {
            localStorage.setItem(key, String(Date.now() + INTERVIEW_DURATION_MS));
          }
          onBegin();
        }}
        disabled={!agreed}
        className="w-full py-4 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-black rounded-xl transition-all flex items-center justify-center gap-2 text-sm active:scale-95 shadow-lg shadow-blue-500/20"
      >
        <ChevronRight size={16} /> Begin Interview
      </button>
    </div>
  );
}

export default function InterviewContent() {
  const [userId, setUserId] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [rulesRoom, setRulesRoom] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [confirmDeleteAll, setConfirmDeleteAll] = useState(false);
  const [deletingAll, setDeletingAll] = useState(false);

  const fetchRooms = useCallback(async (uid, admin) => {
    const query = supabase
      .from('interview_rooms')
      .select('*')
      .order('created_at', { ascending: false });
    if (!admin) query.eq('applicant_id', uid);
    const { data } = await query;
    setRooms(data || []);
  }, []);

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setLoading(false); return; }
      const uid = session.user.id;
      setUserId(uid);
      const { data: profile } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', uid)
        .single();
      const admin = profile?.is_admin ?? false;
      setIsAdmin(admin);
      await fetchRooms(uid, admin);
      setLoading(false);
    };
    init();
  }, [fetchRooms]);

  const handleRefresh = async () => {
    if (!userId) return;
    setRefreshing(true);
    await fetchRooms(userId, isAdmin);
    setRefreshing(false);
  };

  const handleDeleteRoom = async (roomId) => {
    setDeletingId(roomId);
    await supabase.from('interview_answers').delete().eq('room_id', roomId);
    await supabase.from('interview_rooms').delete().eq('id', roomId);
    setRooms(prev => prev.filter(r => r.id !== roomId));
    setDeletingId(null);
  };

  const handleDeleteAll = async () => {
    setDeletingAll(true);
    const ids = rooms.map(r => r.id);
    if (ids.length) {
      await supabase.from('interview_answers').delete().in('room_id', ids);
      await supabase.from('interview_rooms').delete().in('id', ids);
    }
    setRooms([]);
    setDeletingAll(false);
    setConfirmDeleteAll(false);
  };

  if (!userId && !loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <Briefcase size={36} className="text-gray-300 dark:text-gray-700" />
        <p className="text-gray-500 dark:text-gray-400 font-bold">Sign in to view your interviews.</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto w-full animate-in fade-in slide-in-from-bottom-2 duration-300">
      {selectedRoom ? (
        <RoomDetail
          room={selectedRoom}
          userId={userId}
          onBack={() => { setSelectedRoom(null); handleRefresh(); }}
        />
      ) : rulesRoom ? (
        <InterviewRulesScreen
          room={rulesRoom}
          onBack={() => setRulesRoom(null)}
          onBegin={() => { setSelectedRoom(rulesRoom); setRulesRoom(null); }}
        />
      ) : (
        <>
          {/* Delete All confirm modal */}
          {confirmDeleteAll && (
            <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-gray-200 dark:border-gray-700 animate-in zoom-in-95 duration-200">
                <div className="flex items-center gap-3 mb-3">
                  <AlertTriangle size={22} className="text-red-500 shrink-0" />
                  <h3 className="font-black text-gray-900 dark:text-gray-100">Delete All Interviews?</h3>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-5 leading-relaxed">
                  This will permanently delete all {rooms.length} interview room{rooms.length !== 1 ? 's' : ''} and their answers. This cannot be undone.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setConfirmDeleteAll(false)}
                    disabled={deletingAll}
                    className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDeleteAll}
                    disabled={deletingAll}
                    className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-sm font-bold transition-colors flex items-center justify-center gap-2"
                  >
                    {deletingAll ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                    {deletingAll ? 'Deleting…' : 'Delete All'}
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-black text-gray-900 dark:text-gray-100 tracking-tighter">Interviews</h1>
              <p className="text-gray-500 dark:text-gray-400 text-sm mt-0.5 font-medium">
                {isAdmin ? 'All interview rooms (admin view).' : 'Your active and completed interview rooms.'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {rooms.length > 0 && (
                <button
                  onClick={() => setConfirmDeleteAll(true)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40 text-red-600 dark:text-red-400 text-xs font-bold border border-red-200 dark:border-red-800 transition-colors"
                  title="Delete all interviews"
                >
                  <Trash2 size={13} /> Delete All
                </button>
              )}
              <button
                onClick={handleRefresh}
                className="p-2 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 transition-colors"
                title="Refresh"
              >
                <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>
          <RoomList
            rooms={rooms}
            onSelect={(room) => {
              if (room.status === 'completed') {
                setSelectedRoom(room);
              } else {
                setRulesRoom(room);
              }
            }}
            onDelete={handleDeleteRoom}
            deletingId={deletingId}
            loading={loading}
          />
        </>
      )}
    </div>
  );
}
