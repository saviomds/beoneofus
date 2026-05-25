"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import {
  CheckCircle2, ArrowLeft, ArrowRight, BookOpen,
  Loader2, Award, Share2, X, Menu, ChevronRight, GraduationCap,
  Brain, Sparkles, RotateCcw, ChevronLeft,
} from "lucide-react";
import { supabase } from "../../supabaseClient";
import hljs from "highlight.js";
import "highlight.js/styles/shades-of-purple.css";

// ── Quiz lesson sentinel ───────────────────────────────────────────────────────
const QUIZ_LESSON_ID = -999;

interface QuizQuestion {
  id: number;
  questionType: "recall" | "application" | "analysis";
  question: string;
  options: string[];
  correct: string;
  explanation: string;
}

const QT_COLORS: Record<string, string> = {
  recall:      "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800/50",
  application: "bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 border-violet-200 dark:border-violet-800/50",
  analysis:    "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/50",
};
const QT_LABELS: Record<string, string> = { recall: "Recall", application: "Application", analysis: "Analysis" };

// ── InlineQuiz ─────────────────────────────────────────────────────────────────
function InlineQuiz({
  courseTitle, category, level,
  certificate, courseId, userId,
}: {
  courseTitle: string; category: string; level: string;
  certificate: Cert | null; courseId: string; userId: string | null;
}) {
  const [phase,     setPhase]     = useState<"start"|"generating"|"quiz"|"results">("start");
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [current,   setCurrent]   = useState(0);
  const [answers,   setAnswers]   = useState<Record<number, string>>({});
  const [revealed,  setRevealed]  = useState<Record<number, boolean>>({});
  const [error,     setError]     = useState("");
  const [count,     setCount]     = useState(10);

  const generate = async () => {
    setError(""); setPhase("generating");
    try {
      const res = await fetch("/api/quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: courseTitle, material: `Category: ${category}. Level: ${level}.`, count }),
      });
      const data = await res.json();
      if (data.error) { setError(data.error); setPhase("start"); return; }
      setQuestions(data.questions);
      setAnswers({}); setRevealed({}); setCurrent(0);
      setPhase("quiz");
    } catch {
      setError("Failed to generate quiz. Please try again.");
      setPhase("start");
    }
  };

  const goToResults = async (finalAnswers: Record<number, string>, finalRevealed: Record<number, boolean>) => {
    const finalScore = questions.length
      ? Math.round((questions.filter(x => finalRevealed[x.id] && finalAnswers[x.id] === x.correct).length / questions.length) * 100)
      : 0;
    // Persist quiz grade to the certificate record (silent failure if column missing)
    if (userId && courseId) {
      try {
        await supabase.from("user_certificates")
          .upsert({ user_id: userId, course_id: courseId, quiz_score: finalScore }, { onConflict: "user_id, course_id" });
      } catch { /* column may not exist — ignore */ }
    }
    setPhase("results");
  };

  const pick = (qId: number, opt: string) => {
    if (revealed[qId]) return;
    setAnswers(prev => ({ ...prev, [qId]: opt }));
  };

  const reveal = (qId: number) => {
    if (!answers[qId]) return;
    setRevealed(prev => ({ ...prev, [qId]: true }));
  };

  const q = questions[current];
  const isRevealed = q ? !!revealed[q.id] : false;
  const isCorrect  = q ? answers[q.id] === q.correct : false;
  const totalRevealed = questions.filter(x => revealed[x.id]).length;
  const score = questions.length
    ? Math.round((questions.filter(x => revealed[x.id] && answers[x.id] === x.correct).length / questions.length) * 100)
    : 0;

  // ── Start screen ──
  if (phase === "start") return (
    <div className="flex flex-col items-center text-center py-10 gap-5">
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-violet-600 flex items-center justify-center shadow-2xl shadow-blue-500/30">
        <Brain size={30} className="text-white"/>
      </div>
      <div>
        <h2 className="text-2xl font-black text-gray-900 dark:text-gray-100 mb-1">Practice Quiz</h2>
        <p className="text-gray-500 dark:text-gray-400 text-sm max-w-sm">
          AI-generated quiz based on <strong className="text-gray-700 dark:text-gray-300">{courseTitle}</strong>. Tests recall, application, and analysis — with a detailed explanation for every answer.
        </p>
      </div>
      <div className="flex gap-2">
        {[5,10,15,20].map(n => (
          <button key={n} onClick={() => setCount(n)}
            className={`w-14 py-2 text-sm font-black rounded-xl border transition-all ${count===n?"bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/20":"bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-blue-300"}`}>
            {n}
          </button>
        ))}
      </div>
      <p className="text-xs text-gray-400">questions</p>
      {error && <p className="text-sm text-red-500 flex items-center gap-1">{error}</p>}
      <button onClick={generate}
        className="flex items-center gap-2 px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-xl transition-all shadow-lg shadow-blue-500/20 active:scale-95">
        <Sparkles size={16}/> Start Quiz
      </button>
    </div>
  );

  // ── Generating ──
  if (phase === "generating") return (
    <div className="flex flex-col items-center text-center py-16 gap-4">
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-violet-600 flex items-center justify-center shadow-2xl shadow-blue-500/30">
        <Brain size={28} className="text-white"/>
      </div>
      <Loader2 size={28} className="animate-spin text-blue-500"/>
      <p className="text-base font-black text-gray-900 dark:text-gray-100">Generating {count} questions…</p>
      <p className="text-sm text-gray-400">Recall · Application · Analysis</p>
    </div>
  );

  // ── Results ──
  if (phase === "results") {
    const gradeLabel = score>=90?"A":score>=80?"B":score>=70?"C":score>=60?"D":"F";
    const gradeColor = score>=70?"text-emerald-600 dark:text-emerald-400":score>=50?"text-amber-600 dark:text-amber-400":"text-red-600 dark:text-red-400";
    return (
      <div>
        {/* Score + grade banner */}
        <div className={`rounded-2xl p-6 mb-6 text-center border relative overflow-hidden ${score>=70?"bg-gradient-to-br from-emerald-50 to-green-100 dark:from-emerald-900/20 dark:to-green-900/20 border-emerald-200 dark:border-emerald-800/50":score>=50?"bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border-amber-200 dark:border-amber-800/50":"bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 border-red-200 dark:border-red-800/50"}`}>
          <div className={`absolute top-0 left-0 right-0 h-1 ${score>=70?"bg-gradient-to-r from-emerald-400 to-green-500":score>=50?"bg-gradient-to-r from-amber-400 to-orange-500":"bg-gradient-to-r from-red-400 to-orange-500"}`}/>
          <div className="flex items-center justify-center gap-4 mb-1">
            <div className={`text-5xl font-black ${gradeColor}`}>{score}%</div>
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl font-black border-2 ${score>=70?"border-emerald-400 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300":score>=50?"border-amber-400 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300":"border-red-400 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300"}`}>
              {gradeLabel}
            </div>
          </div>
          <p className={`font-black text-base mb-0.5 ${gradeColor}`}>
            {score>=70?"Quiz Passed! 🎉":score>=50?"Almost there! 💪":"Keep practising! 📚"}
          </p>
          <p className="text-xs text-gray-500">{questions.filter(x=>answers[x.id]===x.correct).length} correct of {questions.length} · Grade {gradeLabel}</p>
          <div className="flex gap-2 justify-center mt-2 flex-wrap">
            {Object.keys(QT_LABELS).map(type => {
              const qs=questions.filter(x=>x.questionType===type);
              const ok=qs.filter(x=>answers[x.id]===x.correct).length;
              if(!qs.length) return null;
              return <span key={type} className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${QT_COLORS[type]}`}>{QT_LABELS[type]}: {ok}/{qs.length}</span>;
            })}
          </div>
        </div>

        {/* ── Certificate / Final Exam CTA ──────────────────────────────── */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-700 p-5 mb-7 shadow-xl shadow-blue-500/20">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.12),transparent)] pointer-events-none"/>
          <div className="relative flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-white/15 flex items-center justify-center shrink-0 border border-white/20">
              <GraduationCap size={22} className="text-white"/>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-0.5">
                <p className="text-white font-black text-sm">You finished all lessons!</p>
                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full bg-white/20 text-white border border-white/30`}>
                  Quiz Grade: {gradeLabel} · {score}%
                </span>
              </div>
              <p className="text-blue-200 text-xs">Take the AI-graded final exam to earn your verified certificate for <strong className="text-white">{courseTitle}</strong>.</p>
            </div>
            <div className="flex flex-col gap-2 shrink-0 w-full sm:w-auto">
              {certificate ? (
                <a href={`/certificate/${certificate.id}`}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-yellow-400 to-amber-500 hover:from-yellow-300 hover:to-amber-400 text-white font-black rounded-xl shadow-lg shadow-amber-500/30 transition-all text-sm whitespace-nowrap">
                  <Award size={15}/> View Certificate
                </a>
              ) : (
                <a href={`/LearnPage/${courseId}/exam`}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 bg-white text-blue-700 hover:bg-blue-50 font-black rounded-xl shadow-lg transition-all text-sm whitespace-nowrap">
                  <GraduationCap size={15}/> Take Final Exam
                </a>
              )}
            </div>
          </div>
        </div>

        <h3 className="text-sm font-black text-gray-900 dark:text-gray-100 mb-3">Question Review</h3>
        <div className="space-y-3 mb-6">
          {questions.map((x,i) => {
            const correct=answers[x.id]===x.correct;
            return (
              <div key={x.id} className={`rounded-xl border p-4 ${correct?"border-emerald-200 dark:border-emerald-800/50 bg-emerald-50/50 dark:bg-emerald-900/10":"border-red-200 dark:border-red-800/50 bg-red-50/50 dark:bg-red-900/10"}`}>
                <div className="flex items-start gap-2.5">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 ${correct?"bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600":"bg-red-100 dark:bg-red-900/30 text-red-600"}`}>{i+1}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex gap-1.5 mb-1 flex-wrap">
                      <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full border ${QT_COLORS[x.questionType]??QT_COLORS.recall}`}>{QT_LABELS[x.questionType]??x.questionType}</span>
                      {correct?<span className="text-[9px] font-black text-emerald-600 flex items-center gap-0.5"><CheckCircle2 size={9}/> Correct</span>:<span className="text-[9px] font-black text-red-500">✗ Incorrect</span>}
                    </div>
                    <p className="text-xs font-bold text-gray-800 dark:text-gray-200 mb-1 leading-snug">{x.question}</p>
                    {!correct&&<p className="text-[10px] text-gray-500 mb-1">Your answer: <span className="text-red-600 dark:text-red-400 font-bold">{answers[x.id]||"(none)"}</span> · Correct: <span className="text-emerald-600 dark:text-emerald-400 font-bold">{x.correct}</span></p>}
                    <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">{x.explanation}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex gap-3">
          <button onClick={()=>{setAnswers({});setRevealed({});setCurrent(0);setPhase("quiz");}} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-bold border border-gray-200 dark:border-gray-700 rounded-xl hover:border-gray-300 transition-all text-gray-600 dark:text-gray-400">
            <RotateCcw size={13}/> Retake
          </button>
          <button onClick={()=>{setPhase("start");setQuestions([]);}} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-black bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition-all shadow-md shadow-blue-500/20">
            <Sparkles size={13}/> New Quiz
          </button>
        </div>
      </div>
    );
  }

  // ── Quiz (question by question) ──
  if (!q) return null;
  return (
    <div>
      {/* Progress bar */}
      <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden mb-6">
        <div className="h-full bg-blue-500 rounded-full transition-all duration-300" style={{width:`${((current+1)/questions.length)*100}%`}}/>
      </div>

      {/* Question header */}
      <div className="flex items-center gap-2.5 mb-4">
        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${revealed[q.id]?(answers[q.id]===q.correct?"bg-emerald-500 text-white":"bg-red-500 text-white"):"bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300"}`}>
          {revealed[q.id]?(answers[q.id]===q.correct?<CheckCircle2 size={13}/>:"✗"):current+1}
        </div>
        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${QT_COLORS[q.questionType]??QT_COLORS.recall}`}>{QT_LABELS[q.questionType]??q.questionType}</span>
        <span className="text-[10px] text-gray-400 font-medium ml-auto">{current+1} / {questions.length} · {totalRevealed} answered</span>
      </div>

      <p className="text-base font-bold text-gray-900 dark:text-gray-100 mb-5 leading-snug">{q.question}</p>

      <div className="space-y-2 mb-5">
        {q.options.map((opt,i) => {
          const isSelected=answers[q.id]===opt;
          const isRight=opt===q.correct;
          let cls="border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/10";
          if(isRevealed){
            if(isRight) cls="border-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300";
            else if(isSelected) cls="border-red-400 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300";
            else cls="border-gray-100 dark:border-gray-800 text-gray-400 opacity-60";
          } else if(isSelected) cls="border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300";
          return (
            <button key={i} onClick={()=>pick(q.id,opt)} disabled={isRevealed}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left text-sm font-medium transition-all disabled:cursor-default ${cls}`}>
              <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center text-[10px] font-black shrink-0 ${isSelected&&!isRevealed?"border-blue-500 bg-blue-500 text-white":isRevealed&&isRight?"border-emerald-500 bg-emerald-500 text-white":isRevealed&&isSelected?"border-red-500 bg-red-500 text-white":"border-current text-current"}`}>
                {String.fromCharCode(65+i)}
              </span>
              {opt}
              {isRevealed&&isRight&&<CheckCircle2 size={14} className="text-emerald-500 ml-auto shrink-0"/>}
              {isRevealed&&isSelected&&!isRight&&<span className="text-red-500 ml-auto shrink-0 text-xs font-black">✗</span>}
            </button>
          );
        })}
      </div>

      {!isRevealed ? (
        <button onClick={()=>reveal(q.id)} disabled={!answers[q.id]}
          className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white font-bold rounded-xl transition-all text-sm active:scale-[.98]">
          Check Answer
        </button>
      ) : (
        <div className={`rounded-xl border p-4 text-sm mb-4 ${isCorrect?"bg-emerald-50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-800/50":"bg-orange-50 dark:bg-orange-900/10 border-orange-200 dark:border-orange-800/50"}`}>
          <p className={`font-black mb-1 ${isCorrect?"text-emerald-700 dark:text-emerald-300":"text-orange-700 dark:text-orange-300"}`}>
            {isCorrect?"✓ Correct!":"✗ Incorrect"}
          </p>
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed">{q.explanation}</p>
        </div>
      )}

      {/* Dot nav + Prev/Next */}
      <div className="flex items-center gap-3 mt-4">
        <button onClick={()=>setCurrent(c=>Math.max(0,c-1))} disabled={current===0}
          className="flex items-center gap-1 px-3 py-2 text-xs font-bold border border-gray-200 dark:border-gray-700 rounded-xl disabled:opacity-30 hover:border-gray-300 transition-all text-gray-600 dark:text-gray-400">
          <ChevronLeft size={13}/> Prev
        </button>
        <div className="flex-1 flex items-center justify-center gap-1 overflow-hidden">
          {questions.map((x,i)=>(
            <button key={x.id} onClick={()=>setCurrent(i)}
              className={`h-2 rounded-full transition-all shrink-0 ${i===current?"bg-blue-600 w-4":revealed[x.id]?(answers[x.id]===x.correct?"bg-emerald-400 w-2":"bg-red-400 w-2"):"bg-gray-200 dark:bg-gray-700 w-2"}`}/>
          ))}
        </div>
        {current<questions.length-1?(
          <button onClick={()=>setCurrent(c=>c+1)}
            className="flex items-center gap-1 px-3 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition-all">
            Next <ChevronRight size={13}/>
          </button>
        ):(
          <button onClick={()=>goToResults(answers, revealed)}
            className="flex items-center gap-1 px-3 py-2 text-xs font-bold bg-violet-600 hover:bg-violet-500 text-white rounded-xl transition-all">
            Results <ChevronRight size={13}/>
          </button>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
async function logActivity(
  userId: string,
  type: string,
  content: string,
  metadata: Record<string, unknown> = {}
) {
  try {
    await supabase.from("user_activity").insert({ user_id: userId, type, content, metadata });
  } catch (_) {}
}

function LessonContentReader({ content }: { content: string }) {
  useEffect(() => {
    hljs.highlightAll();
    document.querySelectorAll("pre").forEach((pre) => {
      if (pre.querySelector(".copy-btn")) return;
      (pre as HTMLElement).style.position = "relative";
      const btn = document.createElement("button");
      btn.className =
        "copy-btn absolute top-3 right-3 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white/70 hover:text-white rounded-lg transition-all text-xs font-bold backdrop-blur-sm border border-white/10";
      btn.innerHTML = "Copy";
      btn.addEventListener("click", async () => {
        const code = pre.querySelector("code")?.innerText ?? "";
        await navigator.clipboard.writeText(code);
        btn.innerHTML = "Copied!";
        btn.classList.add("bg-emerald-500/20", "text-emerald-400", "border-emerald-500/30");
        setTimeout(() => {
          btn.innerHTML = "Copy";
          btn.classList.remove("bg-emerald-500/20", "text-emerald-400", "border-emerald-500/30");
        }, 2000);
      });
      pre.appendChild(btn);
    });
  }, [content]);

  return (
    <div
      className="prose dark:prose-invert max-w-none break-words
                 [&_pre]:rounded-xl [&_pre]:p-4 [&_pre]:my-4 [&_pre]:shadow-lg [&_pre]:pt-12 [&_pre]:overflow-x-auto [&_pre]:max-w-full
                 [&_code]:break-words [&_code]:whitespace-pre-wrap
                 [&_h1]:text-xl [&_h1]:sm:text-2xl [&_h1]:font-black [&_h1]:mb-4 [&_h1]:text-gray-900 dark:[&_h1]:text-gray-100 [&_h1]:leading-tight
                 [&_h2]:text-lg [&_h2]:sm:text-xl [&_h2]:font-bold [&_h2]:mb-3 [&_h2]:text-gray-900 dark:[&_h2]:text-gray-100 [&_h2]:leading-tight
                 [&_h3]:text-base [&_h3]:sm:text-lg [&_h3]:font-bold [&_h3]:mb-2 [&_h3]:text-gray-900 dark:[&_h3]:text-gray-100
                 [&_p]:text-gray-600 [&_p]:dark:text-gray-300 [&_p]:mb-4 [&_p]:leading-relaxed [&_p]:break-words
                 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-4
                 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:mb-4
                 [&_li]:mb-1.5 [&_li]:text-gray-600 [&_li]:dark:text-gray-300 [&_li]:break-words
                 [&_strong]:font-bold [&_strong]:text-gray-900 [&_strong]:dark:text-gray-100
                 [&_blockquote]:border-l-4 [&_blockquote]:border-blue-500 [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-gray-500
                 [&_img]:rounded-xl [&_img]:max-w-full [&_img]:w-full [&_img]:h-auto [&_img]:my-4
                 [&_table]:w-full [&_table]:overflow-x-auto [&_table]:block [&_table]:text-sm
                 [&_td]:px-3 [&_td]:py-2 [&_td]:border [&_td]:border-gray-200 dark:[&_td]:border-gray-700
                 [&_th]:px-3 [&_th]:py-2 [&_th]:border [&_th]:border-gray-200 dark:[&_th]:border-gray-700 [&_th]:font-bold [&_th]:bg-gray-50 dark:[&_th]:bg-gray-800
                 [&_a]:text-blue-600 [&_a]:underline [&_a]:dark:text-blue-400 [&_a]:break-words"
      dangerouslySetInnerHTML={{ __html: content || "" }}
    />
  );
}

interface Cert { id: string }

function CertificateModal({
  cert, courseTitle, onClose,
}: {
  cert: Cert;
  courseTitle: string;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-md" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white dark:bg-gray-900 rounded-[2rem] shadow-2xl border border-yellow-200 dark:border-yellow-800/50 overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-yellow-400 via-amber-500 to-yellow-400" />
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          <X size={18} />
        </button>
        <div className="p-8 text-center">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center mx-auto mb-5 shadow-2xl shadow-amber-500/40">
            <Award size={44} className="text-white" />
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-full text-xs font-bold mb-4">
            <CheckCircle2 size={12} /> All lessons completed
          </div>
          <h2 className="text-2xl font-black text-gray-900 dark:text-gray-100 mb-2">Course Complete!</h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm mb-1">You earned a certificate for</p>
          <p className="text-base font-bold text-gray-800 dark:text-gray-200 mb-6">{courseTitle}</p>
          <div className="flex flex-col gap-3">
            <a
              href={`/certificate/${cert.id}`}
              className="flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-yellow-400 to-amber-500 hover:from-yellow-300 hover:to-amber-400 text-white font-black rounded-xl transition-all shadow-lg shadow-amber-500/30"
            >
              <Award size={18} /> View Certificate
            </a>
            <button
              onClick={() =>
                navigator.clipboard.writeText(`${window.location.origin}/certificate/${cert.id}`)
              }
              className="flex items-center justify-center gap-2 py-3 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-bold rounded-xl transition-colors"
            >
              <Share2 size={16} /> Copy Certificate Link
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

interface Lesson { id: number; title: string; content: string; isQuiz?: boolean }
interface Course { id: string; title: string; category: string; level: string }

export default function LessonViewer() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();

  const courseId = params?.id as string;
  const lessonIdParam = searchParams?.get("lessonId");

  const [userId, setUserId] = useState<string | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [course, setCourse] = useState<Course | null>(null);
  const [currentLesson, setCurrentLesson] = useState<Lesson | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCompleted, setIsCompleted] = useState(false);
  const [isMarking, setIsMarking] = useState(false);
  const [completedLessons, setCompletedLessons] = useState<Set<number>>(new Set());
  const [certificate, setCertificate] = useState<Cert | null>(null);
  const [showCertModal, setShowCertModal] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const lessonsRef = useRef<Lesson[]>([]);
  const currentLessonRef = useRef<Lesson | null>(null);
  lessonsRef.current = lessons;
  currentLessonRef.current = currentLesson;

  // ── Initial load ────────────────────────────────────────────────────────────
  useEffect(() => {
    let isMounted = true;
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push("/auth"); return; }

      const uid = session.user.id;
      if (isMounted) setUserId(uid);

      const [lessonsRes, courseRes] = await Promise.all([
        supabase.from("lessons").select("id, title, content").eq("course_id", courseId).order("id", { ascending: true }),
        supabase.from("courses").select("id, title, category, level").eq("id", courseId).single(),
      ]);

      if (!isMounted) return;

      if (courseRes.data) setCourse(courseRes.data as Course);

      const lessonsData: Lesson[] = (lessonsRes.data ?? []) as Lesson[];
      setLessons(lessonsData);

      // Virtual quiz lesson appended after the last real lesson
      const lastRealId = lessonsData[lessonsData.length - 1]?.id ?? 0;
      const quizLesson: Lesson = { id: QUIZ_LESSON_ID, title: `Lesson ${lessonsData.length + 1} — Practice Quiz`, content: "", isQuiz: true };
      const allLessonsData: Lesson[] = [...lessonsData, quizLesson];

      const targetId = lessonIdParam ? parseInt(lessonIdParam) : allLessonsData[0]?.id;
      const current = allLessonsData.find((l) => l.id === targetId) ?? allLessonsData[0] ?? null;
      setCurrentLesson(current);
      void lastRealId;

      if (current && uid) {
        const [progressRes, allProgressRes, certRes] = await Promise.all([
          supabase.from("user_lesson_progress").select("status").eq("user_id", uid).eq("lesson_id", current.id).maybeSingle(),
          supabase.from("user_lesson_progress").select("lesson_id").eq("user_id", uid).eq("course_id", courseId).eq("status", "completed"),
          supabase.from("user_certificates").select("id").eq("user_id", uid).eq("course_id", courseId).maybeSingle(),
        ]);

        if (isMounted) {
          setIsCompleted((progressRes.data as { status: string } | null)?.status === "completed");
          setCompletedLessons(new Set(((allProgressRes.data ?? []) as { lesson_id: number }[]).map((p) => p.lesson_id)));
          if (certRes.data) setCertificate(certRes.data as Cert);
        }
      }

      if (isMounted) setIsLoading(false);
    };
    init();
    return () => { isMounted = false; };
  }, [courseId, lessonIdParam, router]);

  // ── Real-time subscription ──────────────────────────────────────────────────
  useEffect(() => {
    if (!userId || !courseId) return;
    const channel = supabase
      .channel(`lesson-progress:${userId}:${courseId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "user_lesson_progress", filter: `user_id=eq.${userId}` },
        (payload) => {
          const row = payload.new as { course_id: string; lesson_id: number; status: string } | null;
          if (row?.course_id === courseId && row?.status === "completed") {
            setCompletedLessons((prev) => { const next = new Set(prev); next.add(row.lesson_id); return next; });
          }
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [userId, courseId]);

  // ── Sync completed state when lesson changes ────────────────────────────────
  useEffect(() => {
    if (currentLesson) setIsCompleted(completedLessons.has(currentLesson.id));
  }, [currentLesson, completedLessons]);

  // ── Keyboard navigation ─────────────────────────────────────────────────────
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).tagName === "INPUT" || (e.target as HTMLElement).tagName === "TEXTAREA") return;
      const realLessons = lessonsRef.current;
      const cur = currentLessonRef.current;
      if (!cur || realLessons.length === 0) return;
      // Build allLessons with quiz sentinel for keyboard nav
      const quizLessonKb: Lesson = { id: QUIZ_LESSON_ID, title: "Practice Quiz", content: "", isQuiz: true };
      const ls = [...realLessons, quizLessonKb];
      const idx = ls.findIndex((l) => l.id === cur.id);
      if (e.key === "ArrowRight" && idx < ls.length - 1) router.push(`/LearnPage/${courseId}?lessonId=${ls[idx + 1].id}`);
      if (e.key === "ArrowLeft" && idx > 0) router.push(`/LearnPage/${courseId}?lessonId=${ls[idx - 1].id}`);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [courseId, router]);

  // ── Mark lesson complete ────────────────────────────────────────────────────
  const handleMarkComplete = async () => {
    if (!userId || !currentLesson || !courseId || isMarking) return;
    setIsMarking(true);
    try {
      const { error: progressError } = await supabase.from("user_lesson_progress").upsert(
        { user_id: userId, course_id: courseId, lesson_id: currentLesson.id, status: "completed", completed_at: new Date().toISOString() },
        { onConflict: "user_id, lesson_id" }
      );
      if (progressError) throw progressError;

      const updatedCompleted = new Set([...completedLessons, currentLesson.id]);
      setCompletedLessons(updatedCompleted);
      setIsCompleted(true);

      logActivity(userId, "lesson_completed", `Completed lesson: ${currentLesson.title}`, { course_id: courseId, lesson_id: currentLesson.id });

      // Certificate only when ALL lessons in this course are done
      const allDone = lessons.length > 0 && lessons.every((l) => updatedCompleted.has(l.id));

      if (allDone) {
        await supabase.from("user_course_progress").upsert(
          { user_id: userId, course_id: courseId, status: "completed", completed_at: new Date().toISOString() },
          { onConflict: "user_id, course_id" }
        );

        const { data: newCert, error: certError } = await supabase
          .from("user_certificates")
          .upsert({ user_id: userId, course_id: courseId }, { onConflict: "user_id, course_id" })
          .select("id")
          .single();

        if (!certError && newCert) {
          setCertificate(newCert as Cert);
          setShowCertModal(true);
          logActivity(userId, "certificate_earned", `Earned certificate for: ${course?.title ?? "course"}`, { course_id: courseId, cert_id: (newCert as Cert).id });
        }

        logActivity(userId, "course_completed", `Completed course: ${course?.title ?? "course"}`, { course_id: courseId });
      } else {
        const idx = lessons.findIndex((l) => l.id === currentLesson.id);
        const next = lessons[idx + 1];
        if (next) setTimeout(() => router.push(`/LearnPage/${courseId}?lessonId=${next.id}`), 500);
      }
    } catch (err: unknown) {
      console.error("Failed to mark lesson complete:", (err as Error).message);
      alert("Could not save progress. Try again.");
    } finally {
      setIsMarking(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-black flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="animate-spin text-blue-500" size={32} />
          <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Loading lesson...</p>
        </div>
      </div>
    );
  }

  if (!currentLesson) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-black flex flex-col items-center justify-center p-6 text-center">
        <BookOpen size={48} className="text-gray-400 mb-4" />
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">No lessons found</h1>
        <p className="text-gray-600 dark:text-gray-400 mb-6">This course doesn&apos;t have any lessons yet.</p>
        <button onClick={() => router.push("/LearnPage")} className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-xl font-bold transition-all shadow-lg shadow-blue-500/20">
          Back to Courses
        </button>
      </div>
    );
  }

  // Build allLessons: real lessons + virtual quiz lesson at the end
  const quizLesson: Lesson = {
    id: QUIZ_LESSON_ID,
    title: `Lesson ${lessons.length + 1} — Practice Quiz`,
    content: "",
    isQuiz: true,
  };
  const allLessons: Lesson[] = [...lessons, quizLesson];

  const currentIndex = allLessons.findIndex((l) => l.id === currentLesson.id);
  const prevLesson   = currentIndex > 0 ? allLessons[currentIndex - 1] : null;
  const nextLesson   = currentIndex < allLessons.length - 1 ? allLessons[currentIndex + 1] : null;
  const isQuizLesson = currentLesson.id === QUIZ_LESSON_ID;

  // Progress is still based only on real lessons (not the virtual quiz)
  const progress = lessons.length > 0 ? Math.round((completedLessons.size / lessons.length) * 100) : 0;

  return (
    <>
      {showCertModal && certificate && (
        <CertificateModal cert={certificate} courseTitle={course?.title ?? "this course"} onClose={() => setShowCertModal(false)} />
      )}

      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <div className="min-h-screen bg-white dark:bg-black text-gray-900 dark:text-gray-100 pb-24 overflow-x-hidden">
        {/* Navbar */}
        <nav className="sticky top-0 w-full border-b border-gray-200 dark:border-gray-800 bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl z-50">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden flex items-center justify-center w-9 h-9 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors shrink-0">
              <Menu size={16} />
            </button>
            <button onClick={() => router.push("/LearnPage")} className="flex items-center gap-1.5 text-sm font-bold text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors shrink-0">
              <ArrowLeft size={15} /><span className="hidden sm:inline">Courses</span>
            </button>
            <div className="flex-1 flex items-center gap-2 min-w-0">
              <div className="flex-1 h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all duration-700" style={{ width: `${progress}%` }} />
              </div>
              <span className="text-xs font-black text-gray-500 dark:text-gray-400 shrink-0 tabular-nums">{completedLessons.size}/{lessons.length}+Quiz</span>
            </div>
            {certificate && (
              <a href={`/certificate/${certificate.id}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs font-bold text-amber-600 dark:text-amber-500 bg-amber-50 dark:bg-amber-900/20 px-3 py-1.5 rounded-full border border-amber-200 dark:border-amber-800/50 hover:border-amber-400 transition-colors shrink-0">
                <Award size={13} /><span className="hidden sm:inline">Certificate</span>
              </a>
            )}
          </div>
        </nav>

        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8 grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-6 min-w-0">
          {/* Sidebar */}
          <aside className={`fixed inset-y-0 left-0 z-50 w-72 bg-white dark:bg-gray-950 border-r border-gray-200 dark:border-gray-800 p-4 pt-5 overflow-y-auto transition-transform duration-300 shadow-2xl lg:static lg:w-auto lg:bg-transparent lg:border-0 lg:p-0 lg:shadow-none lg:block lg:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
            <div className="flex items-center justify-between mb-4 lg:hidden">
              <span className="text-sm font-black text-gray-900 dark:text-gray-100 truncate pr-2">{course?.title ?? "Lessons"}</span>
              <button onClick={() => setSidebarOpen(false)} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 shrink-0"><X size={16} /></button>
            </div>
            <div className="sticky top-24 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-800 rounded-2xl p-3">
              <div className="hidden lg:block px-1 mb-3">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider truncate mb-1">{course?.title ?? "Lessons"}</p>
                <p className="text-[10px] text-gray-400 font-bold">{completedLessons.size}/{lessons.length} complete · {progress}%</p>
              </div>
              <div className="space-y-1">
                {allLessons.map((lesson, idx) => {
                  const done   = completedLessons.has(lesson.id);
                  const active = lesson.id === currentLesson.id;
                  const isQz   = lesson.isQuiz;
                  return (
                    <button key={lesson.id} onClick={() => { router.push(`/LearnPage/${courseId}?lessonId=${lesson.id}`); setSidebarOpen(false); }}
                      className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left text-sm font-bold transition-all ${active ? (isQz ? "bg-gradient-to-r from-blue-600 to-violet-600 text-white shadow-lg shadow-blue-500/20" : "bg-blue-600 text-white shadow-lg shadow-blue-500/20") : isQz ? "text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 border border-blue-200 dark:border-blue-800/40" : done ? "text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20" : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"}`}
                    >
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 ${active ? "bg-white/20 text-white" : isQz ? "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400" : done ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400" : "bg-gray-200 dark:bg-gray-700 text-gray-500"}`}>
                        {!isQz && done && !active ? <CheckCircle2 size={11} /> : isQz ? <Brain size={10}/> : idx + 1}
                      </div>
                      <span className="truncate">{lesson.title}</span>
                      {!isQz && done && !active && <span className="ml-auto text-emerald-500 shrink-0 text-xs">✓</span>}
                      {isQz && !active && <span className="ml-auto shrink-0"><Sparkles size={11} className="text-blue-400"/></span>}
                    </button>
                  );
                })}
              </div>
            </div>
          </aside>

          {/* Main content */}
          <main className="min-w-0">
            {isQuizLesson ? (
              /* ── Quiz lesson ──────────────────────────────────────────── */
              <>
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-bold text-gray-400 mb-4">
                  <span className="uppercase tracking-wide truncate max-w-[120px] sm:max-w-none">{course?.category ?? "Course"}</span>
                  <ChevronRight size={12} className="shrink-0" />
                  <span className="shrink-0 text-blue-600 dark:text-blue-400 flex items-center gap-1"><Brain size={11}/> Practice Quiz · Lesson {allLessons.length} of {allLessons.length}</span>
                </div>

                {/* "You finished all lessons!" banner — always visible at top of quiz page */}
                {lessons.length > 0 && completedLessons.size >= lessons.length && (
                  <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-700 p-5 mb-6 shadow-xl shadow-blue-500/20">
                    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.12),transparent)] pointer-events-none"/>
                    <div className="relative flex flex-col sm:flex-row items-start sm:items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-white/15 flex items-center justify-center shrink-0 border border-white/20">
                        <GraduationCap size={22} className="text-white"/>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-black text-sm mb-0.5">You finished all lessons! 🎉</p>
                        <p className="text-blue-200 text-xs">Practice below, then take the AI-graded final exam to earn your verified certificate for <strong className="text-white">{course?.title}</strong>.</p>
                      </div>
                      {certificate ? (
                        <a href={`/certificate/${certificate.id}`}
                          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-yellow-400 to-amber-500 hover:from-yellow-300 hover:to-amber-400 text-white font-black rounded-xl shadow-lg shadow-amber-500/30 transition-all text-sm whitespace-nowrap shrink-0">
                          <Award size={15}/> View Certificate
                        </a>
                      ) : (
                        <a href={`/LearnPage/${courseId}/exam`}
                          className="flex items-center gap-2 px-4 py-2.5 bg-white text-blue-700 hover:bg-blue-50 font-black rounded-xl shadow-lg transition-all text-sm whitespace-nowrap shrink-0">
                          <GraduationCap size={15}/> Take Final Exam
                        </a>
                      )}
                    </div>
                  </div>
                )}

                {/* Quiz header card */}
                <div className="rounded-2xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-5 mb-6 flex items-center gap-4 shadow-sm">
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-600 to-violet-600 flex items-center justify-center shrink-0 shadow-md shadow-blue-500/20">
                    <Brain size={20} className="text-white"/>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-gray-900 dark:text-gray-100 text-sm leading-tight">Practice Quiz</p>
                    <p className="text-gray-500 dark:text-gray-400 text-xs mt-0.5">{course?.title} · AI-generated · Recall · Application · Analysis</p>
                  </div>
                </div>

                <InlineQuiz
                  courseTitle={course?.title ?? "this course"}
                  category={course?.category ?? "General"}
                  level={course?.level ?? "Beginner"}
                  certificate={certificate}
                  courseId={courseId}
                  userId={userId}
                />

                {/* Navigation */}
                <div className="flex items-stretch justify-between mt-12 pt-8 border-t border-gray-200 dark:border-gray-800 gap-3">
                  {prevLesson ? (
                    <button onClick={() => router.push(`/LearnPage/${courseId}?lessonId=${prevLesson.id}`)} className="group flex flex-col items-start gap-1 text-left min-w-0 flex-1 max-w-[48%]">
                      <span className="flex items-center gap-1 text-xs font-bold text-gray-400 uppercase tracking-wider group-hover:text-blue-500 transition-colors shrink-0"><ArrowLeft size={13} className="shrink-0" /> Previous</span>
                      <span className="text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-2 w-full">{prevLesson.title}</span>
                    </button>
                  ) : <div />}
                  <div />
                </div>
              </>
            ) : (
              /* ── Regular lesson ───────────────────────────────────────── */
              <>
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-bold text-gray-400 mb-4">
                  <span className="uppercase tracking-wide truncate max-w-[120px] sm:max-w-none">{course?.category ?? "Course"}</span>
                  <ChevronRight size={12} className="shrink-0" />
                  <span className="shrink-0">Lesson {currentIndex + 1} of {allLessons.length}</span>
                </div>
                <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-black text-gray-900 dark:text-gray-100 tracking-tight leading-tight mb-8 break-words">{currentLesson.title}</h1>
                <LessonContentReader content={currentLesson.content} />

                <div className="mt-12 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <p className="text-xs text-gray-400 dark:text-gray-500 font-medium min-w-0">
                    {isCompleted ? (
                      <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1 flex-wrap"><CheckCircle2 size={13} className="shrink-0" /> Progress saved to your account</span>
                    ) : "Mark as done to save your progress"}
                  </p>
                  <button onClick={handleMarkComplete} disabled={isCompleted || isMarking}
                    className={`flex items-center justify-center gap-2 px-6 py-3 font-bold rounded-xl transition-all shadow-sm shrink-0 w-full sm:w-auto ${isCompleted ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 cursor-default" : "bg-blue-600 hover:bg-blue-500 text-white shadow-blue-500/20 active:scale-95"}`}
                  >
                    {isCompleted ? <><CheckCircle2 size={18} /> Completed</> : isMarking ? <><Loader2 size={18} className="animate-spin" /> Saving...</> : <><CheckCircle2 size={18} /> Mark Complete</>}
                  </button>
                </div>

                <div className="flex items-stretch justify-between mt-12 pt-8 border-t border-gray-200 dark:border-gray-800 gap-3">
                  {prevLesson ? (
                    <button onClick={() => router.push(`/LearnPage/${courseId}?lessonId=${prevLesson.id}`)} className="group flex flex-col items-start gap-1 text-left min-w-0 flex-1 max-w-[48%]">
                      <span className="flex items-center gap-1 text-xs font-bold text-gray-400 uppercase tracking-wider group-hover:text-blue-500 transition-colors shrink-0"><ArrowLeft size={13} className="shrink-0" /> Previous</span>
                      <span className="text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-2 w-full">{prevLesson.title}</span>
                    </button>
                  ) : <div />}
                  {nextLesson ? (
                    <button onClick={() => router.push(`/LearnPage/${courseId}?lessonId=${nextLesson.id}`)} className="group flex flex-col items-end gap-1 text-right min-w-0 flex-1 max-w-[48%]">
                      <span className="flex items-center gap-1 text-xs font-bold text-gray-400 uppercase tracking-wider group-hover:text-blue-500 transition-colors shrink-0">
                        {nextLesson.isQuiz ? <><Brain size={11} className="text-blue-400"/> Practice Quiz</> : <>Next <ArrowRight size={13} className="shrink-0" /></>}
                      </span>
                      <span className="text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-2 w-full">{nextLesson.title}</span>
                    </button>
                  ) : <div />}
                </div>

                <p className="text-center text-[10px] text-gray-300 dark:text-gray-700 mt-6 select-none">Use ← → arrow keys to navigate between lessons</p>

                {/* Final Exam CTA — shows when all real lessons are complete */}
                {lessons.length > 0 && completedLessons.size >= lessons.length && (
                  <div className="mt-10 relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-700 p-6 sm:p-8 shadow-2xl shadow-blue-700/30">
                    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(255,255,255,0.12),_transparent)] pointer-events-none" />
                    <div className="relative flex flex-col sm:flex-row items-start sm:items-center gap-5">
                      <div className="w-14 h-14 rounded-2xl bg-white/15 flex items-center justify-center shrink-0 border border-white/20">
                        <GraduationCap size={26} className="text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-black text-lg mb-1">You finished all lessons!</p>
                        <p className="text-blue-200 text-sm">Take the AI-graded final exam to earn your verified certificate for <strong className="text-white">{course?.title}</strong>.</p>
                      </div>
                      {certificate ? (
                        <a href={`/certificate/${certificate.id}`} className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-yellow-400 to-amber-500 hover:from-yellow-300 hover:to-amber-400 text-white font-black rounded-xl shadow-lg shadow-amber-500/30 transition-all whitespace-nowrap shrink-0">
                          <Award size={16} /> View Certificate
                        </a>
                      ) : (
                        <button onClick={() => router.push(`/LearnPage/${courseId}/exam`)} className="flex items-center gap-2 px-5 py-3 bg-white text-blue-700 hover:bg-blue-50 font-black rounded-xl shadow-lg transition-all whitespace-nowrap shrink-0">
                          <GraduationCap size={16} /> Take Final Exam
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}
          </main>
        </div>
      </div>
    </>
  );
}
