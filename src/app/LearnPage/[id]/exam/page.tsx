"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  Award, ArrowLeft, Loader2, CheckCircle2, XCircle, Clock,
  ChevronRight, BookOpen, Terminal, AlertTriangle, RotateCcw,
} from "lucide-react";
import { supabase } from "../../../supabaseClient";

interface MCQQuestion {
  id: number;
  type: "mcq";
  question: string;
  options: string[];
  correct: string;
}

interface WrittenQuestion {
  id: number;
  type: "written";
  question: string;
}

type Question = MCQQuestion | WrittenQuestion;

interface QuestionFeedback {
  id: number;
  correct?: boolean;
  points: number;
  max_points?: number;
  feedback: string;
}

interface GradeResult {
  score: number;
  passed: boolean;
  overall_feedback: string;
  question_feedback: QuestionFeedback[];
  certificateId?: string;
}

const EXAM_MINUTES = 30;

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60).toString().padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

export default function ExamPage() {
  const router = useRouter();
  const params = useParams();
  const courseId = params?.id as string;

  const [userId, setUserId] = useState<string | null>(null);
  const [course, setCourse] = useState<{ title: string; category: string; level: string } | null>(null);
  const [totalLessons, setTotalLessons] = useState(0);
  const [completedCount, setCompletedCount] = useState(0);

  const [phase, setPhase] = useState<"loading" | "ineligible" | "already_passed" | "generating" | "exam" | "submitting" | "result">("loading");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [result, setResult] = useState<GradeResult | null>(null);
  const [existingCertId, setExistingCertId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const [timeLeft, setTimeLeft] = useState(EXAM_MINUTES * 60);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const hasSubmittedRef = useRef(false);

  // ── Auth + eligibility check ─────────────────────────────────────────────
  useEffect(() => {
    let mounted = true;
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push("/auth"); return; }
      const uid = session.user.id;
      if (mounted) setUserId(uid);

      const [courseRes, lessonsRes, progressRes, certRes] = await Promise.all([
        supabase.from("courses").select("title, category, level").eq("id", courseId).single(),
        supabase.from("lessons").select("id").eq("course_id", courseId),
        supabase.from("user_lesson_progress").select("lesson_id").eq("user_id", uid).eq("course_id", courseId).eq("status", "completed"),
        supabase.from("user_certificates").select("id, exam_passed").eq("user_id", uid).eq("course_id", courseId).maybeSingle(),
      ]);

      if (!mounted) return;
      if (courseRes.data) setCourse(courseRes.data as { title: string; category: string; level: string });

      const total = (lessonsRes.data ?? []).length;
      const completed = (progressRes.data ?? []).length;
      setTotalLessons(total);
      setCompletedCount(completed);

      if (certRes.data?.exam_passed) {
        setExistingCertId(certRes.data.id);
        setPhase("already_passed");
        return;
      }

      if (total > 0 && completed < total) {
        setPhase("ineligible");
        return;
      }

      setPhase("generating");
    };
    init();
    return () => { mounted = false; };
  }, [courseId, router]);

  // ── Generate questions when phase becomes "generating" ───────────────────
  useEffect(() => {
    if (phase !== "generating" || !course) return;
    let mounted = true;
    const generate = async () => {
      try {
        const res = await fetch("/api/exam", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "generate", courseTitle: course.title, category: course.category, level: course.level }),
        });
        const data = await res.json();
        if (!mounted) return;
        if (data.error) { setError(data.error); setPhase("ineligible"); return; }
        setQuestions(data.questions);
        setPhase("exam");
      } catch {
        if (mounted) { setError("Failed to generate exam. Please try again."); setPhase("ineligible"); }
      }
    };
    generate();
    return () => { mounted = false; };
  }, [phase, course]);

  // ── Countdown timer ──────────────────────────────────────────────────────
  const handleSubmit = useCallback(async (auto = false) => {
    if (hasSubmittedRef.current) return;
    hasSubmittedRef.current = true;
    if (timerRef.current) clearInterval(timerRef.current);
    setPhase("submitting");
    try {
      const res = await fetch("/api/exam", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "grade",
          courseTitle: course?.title,
          questions,
          answers,
          userId,
          courseId,
        }),
      });
      const data: GradeResult = await res.json();
      setResult(data);
      setPhase("result");
    } catch {
      setError("Grading failed. Please try again.");
      hasSubmittedRef.current = false;
      setPhase("exam");
    }
  }, [course, questions, answers, userId, courseId]);

  useEffect(() => {
    if (phase !== "exam") return;
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(timerRef.current!);
          handleSubmit(true);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [phase, handleSubmit]);

  const setAnswer = (id: number, value: string) => {
    setAnswers((prev) => ({ ...prev, [id]: value }));
  };

  const answeredCount = Object.keys(answers).filter((k) => answers[Number(k)]?.trim()).length;
  const timerDanger = timeLeft < 120;

  // ─────────────────────────────────────────────────────────────────────────
  // Loading
  if (phase === "loading") {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-black flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="animate-spin text-blue-500" size={32} />
          <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Checking eligibility…</p>
        </div>
      </div>
    );
  }

  // Already passed
  if (phase === "already_passed") {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-black flex flex-col items-center justify-center p-6 text-center">
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center mb-5 shadow-2xl shadow-amber-500/30">
          <Award size={38} className="text-white" />
        </div>
        <h1 className="text-2xl font-black text-gray-900 dark:text-gray-100 mb-2">Already Certified!</h1>
        <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-sm">You already passed the exam for <strong>{course?.title}</strong> and earned your certificate.</p>
        <div className="flex flex-col sm:flex-row gap-3">
          <a href={`/certificate/${existingCertId}`} className="flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-yellow-400 to-amber-500 text-white font-black rounded-xl shadow-lg shadow-amber-500/20">
            <Award size={16} /> View Certificate
          </a>
          <button onClick={() => router.push(`/LearnPage/${courseId}`)} className="flex items-center justify-center gap-2 px-6 py-3 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-bold rounded-xl">
            <ArrowLeft size={16} /> Back to Course
          </button>
        </div>
      </div>
    );
  }

  // Not eligible
  if (phase === "ineligible") {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-black flex flex-col items-center justify-center p-6 text-center">
        <BookOpen size={48} className="text-gray-300 dark:text-gray-700 mb-4" />
        <h1 className="text-2xl font-black text-gray-900 dark:text-gray-100 mb-2">Complete all lessons first</h1>
        <p className="text-gray-500 dark:text-gray-400 mb-2 max-w-sm">
          You've completed <strong>{completedCount}</strong> of <strong>{totalLessons}</strong> lessons.
          {error && <span className="block text-red-500 text-xs mt-2">{error}</span>}
        </p>
        <button onClick={() => router.push(`/LearnPage/${courseId}`)} className="mt-4 flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all">
          <ArrowLeft size={16} /> Back to Course
        </button>
      </div>
    );
  }

  // Generating questions
  if (phase === "generating") {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-black flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 max-w-xs text-center">
          <div className="w-16 h-16 rounded-2xl bg-blue-600 flex items-center justify-center shadow-2xl shadow-blue-500/30">
            <Terminal size={28} className="text-white" />
          </div>
          <Loader2 className="animate-spin text-blue-500" size={28} />
          <p className="text-base font-black text-gray-900 dark:text-gray-100">AI is preparing your exam…</p>
          <p className="text-sm text-gray-400">Generating questions tailored to <strong>{course?.title}</strong></p>
        </div>
      </div>
    );
  }

  // Results screen
  if (phase === "result" && result) {
    const passed = result.passed;
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-black pb-20">
        <nav className="sticky top-0 w-full border-b border-gray-200 dark:border-gray-800 bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl z-50">
          <div className="max-w-2xl mx-auto px-4 h-14 flex items-center gap-3">
            <button onClick={() => router.push(`/LearnPage/${courseId}`)} className="flex items-center gap-1.5 text-sm font-bold text-gray-600 dark:text-gray-300 hover:text-blue-600 transition-colors">
              <ArrowLeft size={15} /> Back to Course
            </button>
            <span className="ml-auto text-xs font-bold text-gray-400">{course?.title}</span>
          </div>
        </nav>

        <main className="max-w-2xl mx-auto px-4 py-8">
          {/* Score banner */}
          <div className={`relative rounded-3xl p-8 mb-8 text-center overflow-hidden ${passed ? "bg-gradient-to-br from-emerald-50 to-green-100 dark:from-emerald-900/20 dark:to-green-900/20 border border-emerald-200 dark:border-emerald-800/50" : "bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 border border-red-200 dark:border-red-800/50"}`}>
            <div className={`absolute top-0 left-0 right-0 h-1 ${passed ? "bg-gradient-to-r from-emerald-400 to-green-500" : "bg-gradient-to-r from-red-400 to-orange-500"}`} />
            <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 shadow-xl ${passed ? "bg-gradient-to-br from-emerald-400 to-green-500 shadow-emerald-500/30" : "bg-gradient-to-br from-red-400 to-orange-500 shadow-red-500/30"}`}>
              {passed ? <CheckCircle2 size={36} className="text-white" /> : <XCircle size={36} className="text-white" />}
            </div>
            <div className={`text-6xl font-black mb-1 ${passed ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
              {result.score}%
            </div>
            <p className={`text-lg font-black mb-2 ${passed ? "text-emerald-700 dark:text-emerald-300" : "text-red-700 dark:text-red-300"}`}>
              {passed ? "Exam Passed! 🎉" : "Not Passed — Try Again"}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-300 max-w-md mx-auto">{result.overall_feedback}</p>
            {!passed && <p className="text-xs text-gray-400 mt-2">You need 70% or higher to pass.</p>}
          </div>

          {/* Certificate CTA if passed */}
          {passed && result.certificateId && (
            <div className="bg-gradient-to-br from-yellow-50 to-amber-50 dark:from-yellow-900/20 dark:to-amber-900/20 border border-yellow-200 dark:border-yellow-800/50 rounded-2xl p-6 mb-8 flex flex-col sm:flex-row items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center shadow-lg shadow-amber-500/30 shrink-0">
                <Award size={26} className="text-white" />
              </div>
              <div className="text-center sm:text-left">
                <p className="font-black text-gray-900 dark:text-gray-100 mb-0.5">Your certificate is ready!</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">AI-verified · Score: {result.score}%</p>
              </div>
              <a href={`/certificate/${result.certificateId}`} className="sm:ml-auto flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-yellow-400 to-amber-500 hover:from-yellow-300 hover:to-amber-400 text-white font-black rounded-xl shadow-lg shadow-amber-500/20 transition-all whitespace-nowrap">
                <Award size={16} /> View Certificate
              </a>
            </div>
          )}

          {/* Per-question feedback */}
          <h2 className="text-lg font-black text-gray-900 dark:text-gray-100 mb-4">Question Review</h2>
          <div className="space-y-4">
            {result.question_feedback.map((qf) => {
              const q = questions.find((x) => x.id === qf.id);
              const isMcq = q?.type === "mcq";
              const isCorrect = isMcq ? qf.correct : null;
              return (
                <div key={qf.id} className={`rounded-2xl border p-5 ${isMcq ? (isCorrect ? "border-emerald-200 dark:border-emerald-800/50 bg-emerald-50/50 dark:bg-emerald-900/10" : "border-red-200 dark:border-red-800/50 bg-red-50/50 dark:bg-red-900/10") : "border-blue-200 dark:border-blue-800/50 bg-blue-50/50 dark:bg-blue-900/10"}`}>
                  <div className="flex items-start gap-3 mb-2">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${isMcq ? (isCorrect ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400" : "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400") : "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"}`}>
                      {qf.id}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-gray-900 dark:text-gray-100 mb-0.5">{q?.question}</p>
                      <p className="text-xs text-gray-400 font-medium mb-2">
                        Your answer: <span className="text-gray-700 dark:text-gray-300 font-bold">{answers[qf.id] || "(no answer)"}</span>
                        {isMcq && (q as MCQQuestion).correct && (
                          <> · Correct: <span className="text-emerald-600 dark:text-emerald-400 font-bold">{(q as MCQQuestion).correct}</span></>
                        )}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-300">{qf.feedback}</p>
                    </div>
                    <div className={`ml-auto text-xs font-black shrink-0 ${isMcq ? (isCorrect ? "text-emerald-600" : "text-red-500") : "text-blue-600 dark:text-blue-400"}`}>
                      {isMcq ? `${qf.points ?? 0}/15` : `${qf.points ?? 0}/${qf.max_points ?? 27}`}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Retry if failed */}
          {!passed && (
            <button
              onClick={() => { hasSubmittedRef.current = false; setAnswers({}); setResult(null); setPhase("generating"); setTimeLeft(EXAM_MINUTES * 60); }}
              className="mt-8 w-full flex items-center justify-center gap-2 py-4 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-2xl transition-all shadow-lg shadow-blue-500/20"
            >
              <RotateCcw size={18} /> Retake Exam
            </button>
          )}
        </main>
      </div>
    );
  }

  // ── Main Exam UI ─────────────────────────────────────────────────────────
  const isSubmitting = phase === "submitting";

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black pb-32 overflow-x-hidden">
      {/* Sticky header with timer */}
      <nav className="sticky top-0 w-full border-b border-gray-200 dark:border-gray-800 bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl z-50 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center gap-3">
          <button onClick={() => router.push(`/LearnPage/${courseId}`)} className="flex items-center gap-1.5 text-sm font-bold text-gray-500 dark:text-gray-400 hover:text-blue-600 transition-colors shrink-0">
            <ArrowLeft size={15} />
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-black text-gray-900 dark:text-gray-100 truncate">{course?.title}</p>
            <p className="text-[10px] text-gray-400 font-bold">Final Exam · {questions.length} questions</p>
          </div>
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-black text-sm tabular-nums ${timerDanger ? "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 animate-pulse" : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300"}`}>
            <Clock size={13} className="shrink-0" /> {formatTime(timeLeft)}
          </div>
        </div>
        {/* Progress bar */}
        <div className="h-1 bg-gray-100 dark:bg-gray-800">
          <div className="h-full bg-blue-500 transition-all duration-300" style={{ width: `${(answeredCount / questions.length) * 100}%` }} />
        </div>
      </nav>

      <main className="max-w-2xl mx-auto px-4 py-6">
        {/* Intro banner */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/50 rounded-2xl p-4 mb-8 flex items-start gap-3">
          <AlertTriangle size={16} className="text-blue-500 shrink-0 mt-0.5" />
          <p className="text-xs text-blue-700 dark:text-blue-300 font-medium">
            You have <strong>{EXAM_MINUTES} minutes</strong>. Answer all questions then click <strong>Submit Exam</strong>. Score <strong>70%+</strong> to earn your AI-verified certificate.
          </p>
        </div>

        {/* Questions */}
        <div className="space-y-6">
          {questions.map((q, idx) => {
            const answered = !!answers[q.id]?.trim();
            return (
              <div key={q.id} className={`bg-white dark:bg-gray-900 rounded-2xl border shadow-sm overflow-hidden transition-all ${answered ? "border-blue-300 dark:border-blue-700" : "border-gray-200 dark:border-gray-800"}`}>
                {/* Question header */}
                <div className="flex items-center gap-3 px-5 pt-5 pb-3 border-b border-gray-100 dark:border-gray-800">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${answered ? "bg-blue-600 text-white" : "bg-gray-100 dark:bg-gray-800 text-gray-500"}`}>
                    {answered ? <CheckCircle2 size={14} /> : idx + 1}
                  </div>
                  <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${q.type === "mcq" ? "bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400" : "bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400"}`}>
                    {q.type === "mcq" ? "Multiple Choice · 15 pts" : "Written · 27 pts"}
                  </span>
                </div>

                <div className="px-5 py-4">
                  <p className="text-base font-bold text-gray-900 dark:text-gray-100 mb-4 leading-snug">{q.question}</p>

                  {q.type === "mcq" ? (
                    <div className="space-y-2">
                      {(q as MCQQuestion).options.map((opt, i) => {
                        const selected = answers[q.id] === opt;
                        return (
                          <button
                            key={i}
                            onClick={() => setAnswer(q.id, opt)}
                            disabled={isSubmitting}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left text-sm font-medium transition-all ${selected ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300" : "border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"}`}
                          >
                            <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 text-[10px] font-black ${selected ? "border-blue-500 bg-blue-500 text-white" : "border-gray-300 dark:border-gray-600 text-gray-400"}`}>
                              {selected ? <CheckCircle2 size={10} /> : String.fromCharCode(65 + i)}
                            </span>
                            {opt}
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <textarea
                      value={answers[q.id] ?? ""}
                      onChange={(e) => setAnswer(q.id, e.target.value)}
                      disabled={isSubmitting}
                      placeholder="Write your answer here… Be detailed and clear."
                      rows={5}
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-none font-medium leading-relaxed"
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </main>

      {/* Fixed submit footer */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border-t border-gray-200 dark:border-gray-800 p-4 z-50">
        <div className="max-w-2xl mx-auto flex items-center gap-4">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-gray-400">{answeredCount}/{questions.length} answered</p>
            <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full mt-1 overflow-hidden">
              <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${(answeredCount / questions.length) * 100}%` }} />
            </div>
          </div>
          <button
            onClick={() => handleSubmit(false)}
            disabled={isSubmitting || answeredCount === 0}
            className={`flex items-center gap-2 px-6 py-3 font-black rounded-xl transition-all shadow-lg shrink-0 ${answeredCount < questions.length ? "bg-orange-500 hover:bg-orange-400 shadow-orange-500/20 text-white" : "bg-blue-600 hover:bg-blue-500 shadow-blue-500/20 text-white"} disabled:opacity-50`}
          >
            {isSubmitting ? <><Loader2 size={18} className="animate-spin" /> Grading…</> : <><ChevronRight size={18} /> {answeredCount < questions.length ? "Submit Anyway" : "Submit Exam"}</>}
          </button>
        </div>
      </div>
    </div>
  );
}
