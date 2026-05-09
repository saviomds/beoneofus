"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import {
  CheckCircle2, ArrowLeft, ArrowRight, BookOpen,
  Loader2, Award, Share2, X, Menu, ChevronRight,
} from "lucide-react";
import { supabase } from "../../supabaseClient";
import hljs from "highlight.js";
import "highlight.js/styles/shades-of-purple.css";

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

interface Lesson { id: number; title: string; content: string }
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

      const targetId = lessonIdParam ? parseInt(lessonIdParam) : lessonsData[0]?.id;
      const current = lessonsData.find((l) => l.id == targetId) ?? lessonsData[0] ?? null;
      setCurrentLesson(current);

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
      const ls = lessonsRef.current;
      const cur = currentLessonRef.current;
      if (!cur || ls.length === 0) return;
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

  const currentIndex = lessons.findIndex((l) => l.id === currentLesson.id);
  const prevLesson = currentIndex > 0 ? lessons[currentIndex - 1] : null;
  const nextLesson = currentIndex < lessons.length - 1 ? lessons[currentIndex + 1] : null;
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
              <span className="text-xs font-black text-gray-500 dark:text-gray-400 shrink-0 tabular-nums">{completedLessons.size}/{lessons.length}</span>
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
                {lessons.map((lesson, idx) => {
                  const done = completedLessons.has(lesson.id);
                  const active = lesson.id === currentLesson.id;
                  return (
                    <button key={lesson.id} onClick={() => { router.push(`/LearnPage/${courseId}?lessonId=${lesson.id}`); setSidebarOpen(false); }}
                      className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left text-sm font-bold transition-all ${active ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20" : done ? "text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20" : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"}`}
                    >
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 ${active ? "bg-white/20 text-white" : done ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400" : "bg-gray-200 dark:bg-gray-700 text-gray-500"}`}>
                        {done && !active ? <CheckCircle2 size={11} /> : idx + 1}
                      </div>
                      <span className="truncate">{lesson.title}</span>
                      {done && !active && <span className="ml-auto text-emerald-500 shrink-0 text-xs">✓</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          </aside>

          {/* Main content */}
          <main className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-bold text-gray-400 mb-4">
              <span className="uppercase tracking-wide truncate max-w-[120px] sm:max-w-none">{course?.category ?? "Course"}</span>
              <ChevronRight size={12} className="shrink-0" />
              <span className="shrink-0">Lesson {currentIndex + 1} of {lessons.length}</span>
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
                  <span className="flex items-center gap-1 text-xs font-bold text-gray-400 uppercase tracking-wider group-hover:text-blue-500 transition-colors shrink-0">Next <ArrowRight size={13} className="shrink-0" /></span>
                  <span className="text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-2 w-full">{nextLesson.title}</span>
                </button>
              ) : <div />}
            </div>

            <p className="text-center text-[10px] text-gray-300 dark:text-gray-700 mt-6 select-none">Use ← → arrow keys to navigate between lessons</p>
          </main>
        </div>
      </div>
    </>
  );
}
