"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Terminal, ArrowLeft, Loader2, CheckCircle2, AlertTriangle, LayoutDashboard,
  X, Search, Star, Layers, BarChart2, Download, Trash, RefreshCw,
  Brain, ChevronLeft, ChevronRight, RotateCcw, Sparkles, ClipboardList,
  BookOpen, Zap, CheckCircle, XCircle, ChevronDown,
} from "lucide-react";
import { supabase } from "../supabaseClient";
import CourseForm from "../Academy/CourseForm";
import CourseList from "../Academy/CourseList";
import CourseDetailModal from "../Academy/CourseDetailModal";
import { CATEGORIES, LEVELS, LEVEL_COLORS } from "../Academy/constants";


// ── QuizGenerator ─────────────────────────────────────────────────────────────
const QT_COLORS = {
  recall:      "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800/50",
  application: "bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 border-violet-200 dark:border-violet-800/50",
  analysis:    "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/50",
};
const QT_LABELS = { recall: "Recall", application: "Application", analysis: "Analysis" };

function QuizGenerator({ onClose }) {
  const [phase,     setPhase]     = useState("input");    // input | generating | quiz | results
  const [topic,     setTopic]     = useState("");
  const [material,  setMaterial]  = useState("");
  const [count,     setCount]     = useState(10);
  const [questions, setQuestions] = useState([]);
  const [current,   setCurrent]   = useState(0);
  const [answers,   setAnswers]   = useState({});
  const [revealed,  setRevealed]  = useState({});
  const [error,     setError]     = useState("");

  const generate = async () => {
    if (!topic.trim() && !material.trim()) { setError("Enter a topic or paste course material."); return; }
    setError(""); setPhase("generating");
    try {
      const res = await fetch("/api/quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, material, count }),
      });
      const data = await res.json();
      if (data.error) { setError(data.error); setPhase("input"); return; }
      setQuestions(data.questions);
      setAnswers({}); setRevealed({}); setCurrent(0);
      setPhase("quiz");
    } catch {
      setError("Failed to generate quiz. Please try again.");
      setPhase("input");
    }
  };

  const pickAnswer = (qId, opt) => {
    if (revealed[qId]) return;
    setAnswers(prev => ({ ...prev, [qId]: opt }));
  };

  const reveal = (qId) => {
    if (!answers[qId]) return;
    setRevealed(prev => ({ ...prev, [qId]: true }));
  };

  const q = questions[current];
  const answered  = q ? !!answers[q.id] : false;
  const isRevealed = q ? !!revealed[q.id] : false;
  const isCorrect  = q ? answers[q.id] === q.correct : false;

  const totalAnswered = questions.filter(x => revealed[x.id]).length;
  const score = questions.length
    ? Math.round((questions.filter(x => revealed[x.id] && answers[x.id] === x.correct).length / questions.length) * 100)
    : 0;

  const allRevealed = questions.length > 0 && questions.every(x => revealed[x.id]);

  const reset = () => {
    setAnswers({}); setRevealed({}); setCurrent(0);
  };

  const restart = () => {
    setPhase("input"); setQuestions([]); setAnswers({}); setRevealed({}); setCurrent(0); setError("");
  };

  // ── Render ──
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="relative w-full max-w-2xl bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 flex flex-col max-h-[92vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">

        {/* Gradient stripe */}
        <div className="h-1 w-full bg-gradient-to-r from-blue-500 via-violet-500 to-pink-500 shrink-0"/>

        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 dark:border-gray-800 shrink-0">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-600 to-violet-600 flex items-center justify-center shadow-md shadow-blue-500/20 shrink-0">
            <Brain size={15} className="text-white"/>
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-black text-gray-900 dark:text-gray-100 leading-tight">Quiz Generator</h2>
            {phase === "quiz" && (
              <p className="text-[10px] text-gray-400 font-medium mt-px">
                {totalAnswered}/{questions.length} answered
                {allRevealed && <span className="text-blue-600 dark:text-blue-400 font-bold ml-2">· {score}% score</span>}
              </p>
            )}
          </div>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
            <X size={16}/>
          </button>
        </div>

        {/* ── INPUT ── */}
        {phase === "input" && (
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                Course Topic <span className="text-gray-400 font-normal">(required if no material)</span>
              </label>
              <input
                value={topic} onChange={e => setTopic(e.target.value)}
                placeholder="e.g. JavaScript Async/Await, Machine Learning basics, React Hooks…"
                className="w-full bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-gray-900 dark:text-gray-100 placeholder-gray-400 transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                Course Material <span className="text-gray-400 font-normal">(optional — paste notes, transcripts, docs)</span>
              </label>
              <textarea
                value={material} onChange={e => setMaterial(e.target.value)}
                placeholder="Paste your course notes, lesson content, or any study material here…"
                rows={6}
                className="w-full bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-gray-900 dark:text-gray-100 placeholder-gray-400 resize-none transition-all"
              />
              {material.length > 0 && (
                <p className="text-[10px] text-gray-400 mt-1">{material.length.toLocaleString()} chars — first 6 000 used</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-2">
                Number of Questions
              </label>
              <div className="flex gap-2">
                {[5, 10, 15, 20].map(n => (
                  <button key={n} onClick={() => setCount(n)}
                    className={`flex-1 py-2 text-sm font-black rounded-xl border transition-all ${count === n ? "bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/20" : "bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-blue-300"}`}>
                    {n}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-2 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-700">
              {Object.entries(QT_LABELS).map(([type, label]) => (
                <span key={type} className={`flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full border ${QT_COLORS[type]}`}>
                  {label}
                </span>
              ))}
              <span className="text-[10px] text-gray-500 ml-1 self-center">question types + answer explanations</span>
            </div>

            {error && (
              <p className="text-sm text-red-600 dark:text-red-400 font-medium flex items-center gap-2">
                <AlertTriangle size={14}/> {error}
              </p>
            )}

            <button onClick={generate} disabled={!topic.trim() && !material.trim()}
              className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-black rounded-xl transition-all shadow-lg shadow-blue-500/20 active:scale-[.98]">
              <Sparkles size={16}/> Generate {count} Quiz Questions
            </button>
          </div>
        )}

        {/* ── GENERATING ── */}
        {phase === "generating" && (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8 text-center">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-violet-600 flex items-center justify-center shadow-2xl shadow-blue-500/30">
              <Brain size={28} className="text-white"/>
            </div>
            <Loader2 size={28} className="animate-spin text-blue-500"/>
            <p className="text-base font-black text-gray-900 dark:text-gray-100">AI is crafting your quiz…</p>
            <p className="text-sm text-gray-400 max-w-xs">
              Generating {count} questions with recall, application &amp; analysis types
              {topic && <> on <strong className="text-gray-600 dark:text-gray-300">{topic}</strong></>}
            </p>
          </div>
        )}

        {/* ── QUIZ ── */}
        {phase === "quiz" && q && (
          <>
            {/* Progress bar */}
            <div className="h-1 bg-gray-100 dark:bg-gray-800 shrink-0">
              <div className="h-full bg-blue-500 transition-all duration-300" style={{ width: `${((current + 1) / questions.length) * 100}%` }}/>
            </div>

            <div className="flex-1 overflow-y-auto p-5">
              {/* Question header */}
              <div className="flex items-center gap-2.5 mb-4">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${revealed[q.id] ? (answers[q.id] === q.correct ? "bg-emerald-500 text-white" : "bg-red-500 text-white") : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300"}`}>
                  {revealed[q.id] ? (answers[q.id] === q.correct ? <CheckCircle size={13}/> : <XCircle size={13}/>) : current + 1}
                </div>
                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${QT_COLORS[q.questionType] ?? QT_COLORS.recall}`}>
                  {QT_LABELS[q.questionType] ?? q.questionType}
                </span>
                <span className="text-[10px] text-gray-400 font-medium ml-auto">
                  {current + 1} / {questions.length}
                </span>
              </div>

              <p className="text-base font-bold text-gray-900 dark:text-gray-100 mb-5 leading-snug">{q.question}</p>

              {/* Options */}
              <div className="space-y-2 mb-5">
                {q.options.map((opt, i) => {
                  const isSelected = answers[q.id] === opt;
                  const isRight    = opt === q.correct;
                  let cls = "border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/10";
                  if (isRevealed) {
                    if (isRight)          cls = "border-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300";
                    else if (isSelected)  cls = "border-red-400 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300";
                    else                  cls = "border-gray-100 dark:border-gray-800 text-gray-400 opacity-60";
                  } else if (isSelected) {
                    cls = "border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300";
                  }
                  return (
                    <button key={i} onClick={() => pickAnswer(q.id, opt)} disabled={isRevealed}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left text-sm font-medium transition-all disabled:cursor-default ${cls}`}>
                      <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center text-[10px] font-black shrink-0 ${isSelected && !isRevealed ? "border-blue-500 bg-blue-500 text-white" : isRevealed && isRight ? "border-emerald-500 bg-emerald-500 text-white" : isRevealed && isSelected ? "border-red-500 bg-red-500 text-white" : "border-current text-current"}`}>
                        {String.fromCharCode(65 + i)}
                      </span>
                      {opt}
                      {isRevealed && isRight   && <CheckCircle size={14} className="text-emerald-500 ml-auto shrink-0"/>}
                      {isRevealed && isSelected && !isRight && <XCircle size={14} className="text-red-500 ml-auto shrink-0"/>}
                    </button>
                  );
                })}
              </div>

              {/* Check answer / explanation */}
              {!isRevealed ? (
                <button onClick={() => reveal(q.id)} disabled={!answered}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white font-bold rounded-xl transition-all text-sm active:scale-[.98]">
                  Check Answer
                </button>
              ) : (
                <div className={`rounded-xl border p-4 text-sm ${isCorrect ? "bg-emerald-50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-800/50" : "bg-orange-50 dark:bg-orange-900/10 border-orange-200 dark:border-orange-800/50"}`}>
                  <p className={`font-black mb-1 flex items-center gap-2 ${isCorrect ? "text-emerald-700 dark:text-emerald-300" : "text-orange-700 dark:text-orange-300"}`}>
                    {isCorrect ? <><CheckCircle size={14}/> Correct!</> : <><XCircle size={14}/> Incorrect</>}
                  </p>
                  <p className="text-gray-700 dark:text-gray-300 leading-relaxed">{q.explanation}</p>
                </div>
              )}
            </div>

            {/* Navigation footer */}
            <div className="shrink-0 border-t border-gray-100 dark:border-gray-800 px-5 py-3 flex items-center gap-3 bg-white dark:bg-gray-900">
              <button onClick={() => setCurrent(c => Math.max(0, c - 1))} disabled={current === 0}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 rounded-xl hover:border-gray-300 disabled:opacity-30 transition-all bg-white dark:bg-gray-900">
                <ChevronLeft size={13}/> Prev
              </button>

              {/* Dot indicators */}
              <div className="flex-1 flex items-center justify-center gap-1 overflow-hidden">
                {questions.map((x, i) => (
                  <button key={x.id} onClick={() => setCurrent(i)}
                    className={`w-2 h-2 rounded-full transition-all shrink-0 ${i === current ? "bg-blue-600 w-4" : revealed[x.id] ? (answers[x.id] === x.correct ? "bg-emerald-400" : "bg-red-400") : "bg-gray-200 dark:bg-gray-700"}`}/>
                ))}
              </div>

              {current < questions.length - 1 ? (
                <button onClick={() => setCurrent(c => c + 1)}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-xl transition-all active:scale-95">
                  Next <ChevronRight size={13}/>
                </button>
              ) : (
                <button onClick={() => setPhase("results")}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-white bg-violet-600 hover:bg-violet-500 rounded-xl transition-all active:scale-95">
                  Results <ChevronRight size={13}/>
                </button>
              )}
            </div>
          </>
        )}

        {/* ── RESULTS ── */}
        {phase === "results" && (
          <>
            <div className="flex-1 overflow-y-auto p-5">
              {/* Score banner */}
              <div className={`rounded-2xl p-6 mb-6 text-center border relative overflow-hidden ${score >= 70 ? "bg-gradient-to-br from-emerald-50 to-green-100 dark:from-emerald-900/20 dark:to-green-900/20 border-emerald-200 dark:border-emerald-800/50" : score >= 50 ? "bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border-amber-200 dark:border-amber-800/50" : "bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 border-red-200 dark:border-red-800/50"}`}>
                <div className={`absolute top-0 left-0 right-0 h-1 ${score >= 70 ? "bg-gradient-to-r from-emerald-400 to-green-500" : score >= 50 ? "bg-gradient-to-r from-amber-400 to-orange-500" : "bg-gradient-to-r from-red-400 to-orange-500"}`}/>
                <div className={`text-5xl font-black mb-1 ${score >= 70 ? "text-emerald-600 dark:text-emerald-400" : score >= 50 ? "text-amber-600 dark:text-amber-400" : "text-red-600 dark:text-red-400"}`}>
                  {score}%
                </div>
                <p className={`font-black text-base mb-0.5 ${score >= 70 ? "text-emerald-700 dark:text-emerald-300" : score >= 50 ? "text-amber-700 dark:text-amber-300" : "text-red-700 dark:text-red-300"}`}>
                  {score >= 70 ? "Great work! 🎉" : score >= 50 ? "Almost there! 💪" : "Keep practising! 📚"}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {questions.filter(x => answers[x.id] === x.correct).length} correct out of {questions.length} questions
                  {topic && <> · <strong>{topic}</strong></>}
                </p>

                {/* Type breakdown */}
                <div className="flex gap-2 justify-center mt-3 flex-wrap">
                  {Object.keys(QT_LABELS).map(type => {
                    const qs  = questions.filter(x => x.questionType === type);
                    const ok  = qs.filter(x => answers[x.id] === x.correct).length;
                    if (!qs.length) return null;
                    return (
                      <span key={type} className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${QT_COLORS[type]}`}>
                        {QT_LABELS[type]}: {ok}/{qs.length}
                      </span>
                    );
                  })}
                </div>
              </div>

              {/* Per-question review */}
              <h3 className="text-sm font-black text-gray-900 dark:text-gray-100 mb-3">Question Review</h3>
              <div className="space-y-3">
                {questions.map((x, i) => {
                  const correct = answers[x.id] === x.correct;
                  return (
                    <div key={x.id} className={`rounded-xl border p-4 ${correct ? "border-emerald-200 dark:border-emerald-800/50 bg-emerald-50/50 dark:bg-emerald-900/10" : "border-red-200 dark:border-red-800/50 bg-red-50/50 dark:bg-red-900/10"}`}>
                      <div className="flex items-start gap-2.5 mb-2">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 ${correct ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600" : "bg-red-100 dark:bg-red-900/30 text-red-600"}`}>
                          {i + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                            <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full border ${QT_COLORS[x.questionType] ?? QT_COLORS.recall}`}>
                              {QT_LABELS[x.questionType] ?? x.questionType}
                            </span>
                            {correct
                              ? <span className="text-[9px] font-black text-emerald-600 flex items-center gap-0.5"><CheckCircle size={9}/> Correct</span>
                              : <span className="text-[9px] font-black text-red-500 flex items-center gap-0.5"><XCircle size={9}/> Incorrect</span>}
                          </div>
                          <p className="text-xs font-bold text-gray-800 dark:text-gray-200 mb-1 leading-snug">{x.question}</p>
                          {!correct && (
                            <p className="text-[10px] text-gray-500 mb-1">
                              Your answer: <span className="text-red-600 dark:text-red-400 font-bold">{answers[x.id] || "(no answer)"}</span>
                              {" · "}Correct: <span className="text-emerald-600 dark:text-emerald-400 font-bold">{x.correct}</span>
                            </p>
                          )}
                          <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">{x.explanation}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="shrink-0 border-t border-gray-100 dark:border-gray-800 px-5 py-3 flex gap-2 bg-white dark:bg-gray-900">
              <button onClick={() => { reset(); setPhase("quiz"); }}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-bold text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 rounded-xl hover:border-gray-300 transition-all bg-white dark:bg-gray-900">
                <RotateCcw size={12}/> Retake
              </button>
              <button onClick={restart}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-xl transition-all shadow-md shadow-blue-500/20">
                <Sparkles size={12}/> New Quiz
              </button>
            </div>
          </>
        )}

      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
const defaultForm = {
  title: "",
  category: "Frontend",
  level: "Beginner",
  duration: "",
  lessons: 1,
  rating: 5.0,
  description: "",
  topics: "",
  author: "@system",
  thumbnail_url: "",
};

export default function AdminCoursesPage() {
  const router = useRouter();
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [userId, setUserId] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  const [currentUsername, setCurrentUsername] = useState("@system");
  const [courses, setCourses] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState(null);
  const [thumbnailFile, setThumbnailFile] = useState(null);
  const [thumbnailPreview, setThumbnailPreview] = useState(null);
  const fileInputRef = useRef(null);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const toastTimerRef = useRef(null);

  // ─── Filter / Search / Sort ───
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState("All");
  const [filterLevel, setFilterLevel] = useState("All");
  const [sortOrder, setSortOrder] = useState("newest");
  const [isDuplicating, setIsDuplicating] = useState(false);

  // ─── NEW: Bulk select ───
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showQuiz,    setShowQuiz]    = useState(false);

  const [userProgress, setUserProgress] = useState({});
  const [formData, setFormData] = useState(defaultForm);

  // ─── Stats ───
  const stats = {
    total: courses.length,
    byLevel: LEVELS.reduce((acc, lvl) => {
      acc[lvl] = courses.filter(c => c.level === lvl).length;
      return acc;
    }, {}),
    avgRating: courses.length
      ? (courses.reduce((sum, c) => sum + (parseFloat(c.rating) || 0), 0) / courses.length).toFixed(1)
      : "—",
  };

  // ─── Filtered + sorted courses ───
  const visibleCourses = courses
    .filter(c => {
      const matchSearch =
        !searchQuery ||
        c.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.category?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.author?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchCat = filterCategory === "All" || c.category === filterCategory;
      const matchLvl = filterLevel === "All" || c.level === filterLevel;
      return matchSearch && matchCat && matchLvl;
    })
    .sort((a, b) => {
      if (sortOrder === "newest") return new Date(b.created_at) - new Date(a.created_at);
      if (sortOrder === "oldest") return new Date(a.created_at) - new Date(b.created_at);
      if (sortOrder === "az") return (a.title || "").localeCompare(b.title || "");
      if (sortOrder === "za") return (b.title || "").localeCompare(a.title || "");
      return 0;
    });

  // ─── FIX: Centralised toast with guaranteed cleanup ───
  const showToast = useCallback((type, message, duration = 5000) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ type, message });
    toastTimerRef.current = setTimeout(() => setToast(null), duration);
  }, []);

  useEffect(() => () => { if (toastTimerRef.current) clearTimeout(toastTimerRef.current); }, []);

  const fetchProgress = useCallback(async (uid) => {
    try {
      const { data, error } = await supabase
        .from("user_course_progress")
        .select("*")
        .eq("user_id", uid);
      
      if (data && !error) {
        const progressMap = {};
        data.forEach(p => {
          progressMap[p.course_id] = p;
        });
        setUserProgress(progressMap);
      }
    } catch (err) {
      console.error("Failed to fetch progress", err);
    }
  }, []);

  const fetchCourses = useCallback(async (silent = false) => {
    if (!silent) setIsRefreshing(true);
    try {
      const { data, error } = await supabase
        .from("courses")
        .select("*")
        .order("created_at", { ascending: false });
      if (!error && data) {
        // Deduplicate courses by title + category (case-insensitive)
        // Keep the first occurrence (most recent due to ordering)
        const seen = new Set();
        const deduplicated = data.filter(course => {
          const key = `${(course.title || '').toLowerCase().trim()}|${(course.category || '').toLowerCase()}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
        setCourses(deduplicated);
        // Sync selectedCourse if modal is open
        setSelectedCourse(prev => prev ? (deduplicated.find(d => d.id === prev.id) ?? null) : null);
      }
    } catch (err) {
      console.error(err);
    } finally {
      if (!silent) setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session && isMounted) {
        setUserId(session.user.id);
        fetchProgress(session.user.id);
        const { data: profile } = await supabase
          .from("profiles")
          .select("is_admin, is_premium, username")
          .eq("id", session.user.id)
          .single();
        if (isMounted) {
          if (profile?.is_admin) setIsAdmin(true);
          if (profile?.is_premium || profile?.is_admin) setIsPremium(true);
          if (profile?.username) {
            const uname = `@${profile.username}`;
            setCurrentUsername(uname);
            setFormData(prev => prev.author === "@system" ? { ...prev, author: uname } : prev);
          }
        }
      }
      if (isMounted) {
        setIsCheckingAuth(false);
        fetchCourses(true);
      }
    };
    init();
    return () => { isMounted = false; };
  }, [fetchCourses, fetchProgress]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 50 * 1024 * 1024) {
      showToast("error", "File must be under 50MB.");
      return;
    }
    setThumbnailFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setThumbnailPreview(reader.result);
    reader.readAsDataURL(file);
  };

  const resetForm = () => {
    setFormData({ ...defaultForm, author: currentUsername });
    setThumbnailFile(null);
    setThumbnailPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    setIsEditing(false);
    setEditId(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    const topicsArray = formData.topics
      .split(",")
      .map(t => t.trim())
      .filter(Boolean);

    try {
      let uploadedUrl = formData.thumbnail_url;

      if (thumbnailFile) {
        const ext = thumbnailFile.name.split(".").pop();
        const path = `thumbnails/${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("course_media")
          .upload(path, thumbnailFile);
        if (uploadError) throw new Error("Failed to upload thumbnail: " + uploadError.message);
        const { data: urlData } = supabase.storage.from("course_media").getPublicUrl(path);
        uploadedUrl = urlData.publicUrl;
      }

      const payload = {
        title: formData.title,
        category: formData.category,
        level: formData.level,
        duration: formData.duration,
        lessons: parseInt(formData.lessons, 10) || 1,
        rating: parseFloat(formData.rating) || 5.0,
        // FIX: store as `description` consistently — never `desc`
        description: formData.description,
        topics: topicsArray,
        author: formData.author,
        thumbnail_url: uploadedUrl,
      };

      if (isEditing) {
        const { error } = await supabase.from("courses").update(payload).eq("id", editId);
        if (error) throw error;
        showToast("success", "Course updated successfully!");
      } else {
        const { error } = await supabase.from("courses").insert(payload);
        if (error) throw error;
        showToast("success", "Course published! It is now live in the Academy.");
      }

      fetchCourses(true);
      resetForm();
    } catch (error) {
      console.error("Error saving course:", error);
      showToast("error", error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (course) => {
    setIsEditing(true);
    setEditId(course.id);
    setFormData({
      title: course.title || "",
      category: course.category || "Frontend",
      level: course.level || "Beginner",
      duration: course.duration || "",
      lessons: course.lessons || 1,
      rating: course.rating || 5.0,
      // FIX: read from `description` (the canonical field)
      description: course.description || course.desc || "",
      topics: (course.topics || []).join(", "),
      author: course.author || currentUsername,
      thumbnail_url: course.thumbnail_url || "",
    });
    setThumbnailFile(null);
    setThumbnailPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    window.scrollTo({ top: 0, behavior: "smooth" });
    setSelectedCourse(null); // close modal if open
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this course?")) return;
    try {
      const { error } = await supabase.from("courses").delete().eq("id", id);
      if (error) throw error;
      showToast("success", "Course deleted successfully!");
      fetchCourses(true);
      // Close modal if the deleted course was open
      setSelectedCourse(prev => (prev?.id === id ? null : prev));
    } catch (error) {
      showToast("error", error.message);
    }
  };

  // ─── Duplicate course ───
  const handleDuplicate = async (course) => {
    setIsDuplicating(true);
    try {
       
      const { id, created_at, updated_at, ...rest } = course;
      const payload = { ...rest, title: `${rest.title} (Copy)` };
      const { error } = await supabase.from("courses").insert(payload);
      if (error) throw error;
      showToast("success", `"${rest.title}" duplicated!`);
      fetchCourses(true);
    } catch (error) {
      showToast("error", error.message);
    } finally {
      setIsDuplicating(false);
    }
  };

  // ─── NEW: Bulk select helpers ───
  const toggleSelect = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === visibleCourses.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(visibleCourses.map(c => c.id)));
    }
  };

  // ─── NEW: Bulk delete ───
  const handleBulkDelete = async () => {
    if (!selectedIds.size) return;
    if (!window.confirm(`Delete ${selectedIds.size} course${selectedIds.size > 1 ? "s" : ""}? This cannot be undone.`)) return;
    setIsBulkDeleting(true);
    try {
      const ids = [...selectedIds];
      const { error } = await supabase.from("courses").delete().in("id", ids);
      if (error) throw error;
      showToast("success", `${ids.length} course${ids.length > 1 ? "s" : ""} deleted.`);
      setSelectedIds(new Set());
      fetchCourses(true);
      setSelectedCourse(prev => (prev && ids.includes(prev.id) ? null : prev));
    } catch (error) {
      showToast("error", error.message);
    } finally {
      setIsBulkDeleting(false);
    }
  };

  // ─── NEW: Export courses as JSON ───
  const handleExport = () => {
    const exportData = (selectedIds.size > 0
      ? courses.filter(c => selectedIds.has(c.id))
      : courses
    ).map(({ id, created_at, updated_at, ...rest }) => rest); // strip internal fields

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `courses-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast("success", `Exported ${exportData.length} course${exportData.length !== 1 ? "s" : ""}.`);
  };

  const clearFilters = () => {
    setSearchQuery(""); setFilterCategory("All"); setFilterLevel("All"); setSortOrder("newest");
  }

  const isAllSelected = visibleCourses.length > 0 && selectedIds.size === visibleCourses.length;
  const isPartialSelected = selectedIds.size > 0 && !isAllSelected;

  const handleCourseSelect = (course) => {
    if (!userId) {
      router.push("/auth");
      return;
    }
    setSelectedCourse(course);
  };

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-black flex items-center justify-center">
        <Loader2 className="animate-spin text-blue-500" size={32} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black text-gray-900 dark:text-gray-100 selection:bg-blue-500/30 overflow-x-hidden relative">
      {showQuiz && <QuizGenerator onClose={() => setShowQuiz(false)}/>}
      {/* Grid Background */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#00000008_1px,transparent_1px),linear-gradient(to_bottom,#00000008_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,#ffffff0a_1px,transparent_1px),linear-gradient(to_bottom,#ffffff0a_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />

      {/* Navbar */}
      <nav className="fixed top-0 w-full border-b border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl z-50">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link href="/" className="font-black text-2xl tracking-tighter flex items-center gap-2 text-gray-900 dark:text-gray-100">
            <Terminal className="text-blue-500 dark:text-blue-400" size={28} />
            <span>beone<span className="text-blue-600 dark:text-blue-400">of</span>us</span>
          </Link>
          <div className="flex items-center gap-4">
            <button
              onClick={() => document.getElementById("courses-directory")?.scrollIntoView({ behavior: "smooth" })}
              className="text-sm font-bold text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors hidden sm:block"
            >
              View Academy
            </button>
            <Link href="/dash" className="text-sm font-bold text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors flex items-center gap-2 bg-gray-100 dark:bg-gray-800 px-4 py-2 rounded-xl">
              <ArrowLeft size={16} /> Back to Dash
            </Link>
          </div>
        </div>
      </nav>

      <main className="pt-32 pb-20 px-6 relative z-10 max-w-3xl mx-auto">

        {/* Page Header */}
        <div className="mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800/50 text-purple-600 dark:text-purple-400 text-xs font-bold uppercase tracking-widest mb-4">
            <LayoutDashboard size={14} /> {isAdmin ? "Admin Terminal" : "Course Directory"}
          </div>
          <h1 className="text-3xl md:text-4xl font-black tracking-tighter mb-2 text-gray-900 dark:text-gray-100">
            {isAdmin ? (isEditing ? "Edit Course" : "Add New Course") : "Available Courses"}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 font-medium">
            {isAdmin
              ? (isEditing
                ? "Update existing learning module details."
                : "Publish a new learning module to the BeOneOfUs Academy.")
              : "Browse and explore the available learning modules."}
          </p>
        </div>

        {/* Quiz Generator Banner */}
        <div className="mb-8 rounded-2xl border border-blue-200 dark:border-blue-800/50 bg-gradient-to-br from-blue-50 to-violet-50 dark:from-blue-900/10 dark:to-violet-900/10 p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4 shadow-sm relative overflow-hidden">
          <div className="absolute inset-0 opacity-5 pointer-events-none bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-400 via-violet-400 to-pink-400"/>
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-600 to-violet-600 flex items-center justify-center shadow-lg shadow-blue-500/30 shrink-0">
            <Brain size={20} className="text-white"/>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-black text-gray-900 dark:text-gray-100 text-sm mb-0.5">AI Quiz Generator</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
              Paste any course material or enter a topic — get 10+ MCQs with recall, application &amp; analysis questions, each with a detailed explanation.
            </p>
            <div className="flex gap-1.5 mt-2 flex-wrap">
              {["Recall", "Application", "Analysis"].map(t => (
                <span key={t} className="text-[9px] font-black bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-500 px-2 py-0.5 rounded-full">{t}</span>
              ))}
              <span className="text-[9px] font-black bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-500 px-2 py-0.5 rounded-full">Explanations</span>
              <span className="text-[9px] font-black bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-500 px-2 py-0.5 rounded-full">5 – 20 Questions</span>
            </div>
          </div>
          <button onClick={() => setShowQuiz(true)}
            className="shrink-0 flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-xl transition-all shadow-lg shadow-blue-500/20 active:scale-95 text-sm whitespace-nowrap">
            <Sparkles size={15}/> Generate Quiz
          </button>
        </div>

        {/* Stats Dashboard */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-4 flex flex-col gap-1 shadow-sm">
            <div className="flex items-center gap-1.5 text-gray-400 dark:text-gray-500 text-xs font-bold uppercase tracking-wider">
              <Layers size={12} /> Total
            </div>
            <span className="text-3xl font-black text-gray-900 dark:text-gray-100">{stats.total}</span>
            <span className="text-xs text-gray-500">courses published</span>
          </div>

          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-4 flex flex-col gap-1 shadow-sm">
            <div className="flex items-center gap-1.5 text-gray-400 dark:text-gray-500 text-xs font-bold uppercase tracking-wider">
              <Star size={12} /> Avg Rating
            </div>
            <span className="text-3xl font-black text-gray-900 dark:text-gray-100">{stats.avgRating}</span>
            <span className="text-xs text-gray-500">across all courses</span>
          </div>

          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-4 flex flex-col gap-1 shadow-sm col-span-2">
            <div className="flex items-center gap-1.5 text-gray-400 dark:text-gray-500 text-xs font-bold uppercase tracking-wider mb-1.5">
              <BarChart2 size={12} /> By Level
            </div>
            <div className="flex gap-2 flex-wrap">
              {LEVELS.map(lvl => (
                <span key={lvl} className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${LEVEL_COLORS[lvl]}`}>
                  {lvl}: {stats.byLevel[lvl]}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Form Card — admin only */}
        {isAdmin && (
          <CourseForm
            formData={formData}
            setFormData={setFormData}
            isEditing={isEditing}
            isLoading={isLoading}
            thumbnailPreview={thumbnailPreview}
            thumbnailFile={thumbnailFile}
            setThumbnailFile={setThumbnailFile}
            setThumbnailPreview={setThumbnailPreview}
            fileInputRef={fileInputRef}
            handleSubmit={handleSubmit}
            handleChange={handleChange}
            handleFileChange={handleFileChange}
            resetForm={resetForm}
          />
        )}

        {/* Manage Courses Section */}
        <div id="courses-directory" className="mt-16 mb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-3 scroll-mt-24">
          <div>
            <h2 className="text-2xl font-black text-gray-900 dark:text-gray-100 mb-1">Manage Courses</h2>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              {visibleCourses.length} of {courses.length} course{courses.length !== 1 ? "s" : ""} shown
              {selectedIds.size > 0 && (
                <span className="ml-2 text-blue-600 dark:text-blue-400 font-bold">· {selectedIds.size} selected</span>
              )}
            </p>
          </div>

          {/* ─── NEW: Toolbar actions ─── */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => fetchCourses()}
              disabled={isRefreshing}
              title="Refresh courses"
              className="p-2 text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
            >
              <RefreshCw size={15} className={isRefreshing ? "animate-spin" : ""} />
            </button>

            <button
              onClick={handleExport}
              title={selectedIds.size > 0 ? `Export ${selectedIds.size} selected` : "Export all courses"}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              <Download size={13} />
              {selectedIds.size > 0 ? `Export (${selectedIds.size})` : "Export JSON"}
            </button>

            {isAdmin && selectedIds.size > 0 && (
              <button
                onClick={handleBulkDelete}
                disabled={isBulkDeleting}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded-xl hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors disabled:opacity-50"
              >
                {isBulkDeleting ? <Loader2 size={13} className="animate-spin" /> : <Trash size={13} />}
                Delete ({selectedIds.size})
              </button>
            )}
          </div>
        </div>

        {/* Search + Filters + Sort */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-4 mb-6 shadow-sm flex flex-col gap-3">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by title, category, or author…"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-9 py-2.5 bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-gray-900 dark:text-gray-100"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <X size={14} />
              </button>
            )}
          </div>

          <div className="flex flex-wrap gap-2 items-center">
            <select
              value={filterCategory}
              onChange={e => setFilterCategory(e.target.value)}
              className="bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl px-3 py-2 text-xs font-bold text-gray-700 dark:text-gray-300 outline-none cursor-pointer"
            >
              <option value="All">All Categories</option>
              {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
            </select>

            <select
              value={filterLevel}
              onChange={e => setFilterLevel(e.target.value)}
              className="bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl px-3 py-2 text-xs font-bold text-gray-700 dark:text-gray-300 outline-none cursor-pointer"
            >
              <option value="All">All Levels</option>
              {LEVELS.map(lvl => <option key={lvl} value={lvl}>{lvl}</option>)}
            </select>

            <select
              value={sortOrder}
              onChange={e => setSortOrder(e.target.value)}
              className="bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl px-3 py-2 text-xs font-bold text-gray-700 dark:text-gray-300 outline-none cursor-pointer ml-auto"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="az">A → Z</option>
              <option value="za">Z → A</option>
            </select>

            {(searchQuery || filterCategory !== "All" || filterLevel !== "All" || sortOrder !== "newest") && (
              <button
                onClick={() => { setSearchQuery(""); setFilterCategory("All"); setFilterLevel("All"); setSortOrder("newest"); }}
                className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline px-1"
              >
                Reset
              </button>
            )}
          </div>
        </div>

        {/* Course List */}
        <CourseList
          courses={courses}
          visibleCourses={visibleCourses}
          isAdmin={isAdmin}
          selectedIds={selectedIds}
          toggleSelect={toggleSelect}
          toggleSelectAll={toggleSelectAll}
          isAllSelected={isAllSelected}
          isPartialSelected={isPartialSelected}
          setSelectedCourse={handleCourseSelect}
          handleEdit={handleEdit}
          handleDuplicate={handleDuplicate}
          handleDelete={handleDelete}
          isDuplicating={isDuplicating}
          onClearFilters={clearFilters}
          userProgress={userProgress}
          isPremium={isPremium}
        />
      </main>

      {/* Course Detail Modal */}
      <CourseDetailModal
        course={selectedCourse}
        onClose={() => setSelectedCourse(null)}
        isAdmin={isAdmin}
        isPremium={isPremium}
        handleEdit={handleEdit}
        handleDelete={handleDelete}
        userId={userId}
        userProgress={userProgress}
      />

      {/* Floating Quiz Button */}
      <button
        onClick={() => setShowQuiz(true)}
        className="fixed bottom-6 right-6 z-[100] flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 text-white font-black rounded-2xl shadow-2xl shadow-blue-500/30 transition-all active:scale-95 text-sm"
        title="Open Quiz Generator"
      >
        <Brain size={18}/> <span className="hidden sm:inline">Quiz Generator</span>
      </button>

      {/* Toast Notification */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-[300] flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl border animate-in slide-in-from-bottom-4 fade-in duration-300 bg-white dark:bg-gray-900 max-w-sm ${toast.type === "error" ? "border-red-200 dark:border-red-800/50" : "border-emerald-200 dark:border-emerald-800/50"}`}>
          {toast.type === "error"
            ? <AlertTriangle size={18} className="text-red-500 shrink-0" />
            : <CheckCircle2 size={18} className="text-emerald-500 shrink-0" />
          }
          <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{toast.message}</span>
          <button onClick={() => { clearTimeout(toastTimerRef.current); setToast(null); }} className="ml-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 shrink-0">
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  );
}