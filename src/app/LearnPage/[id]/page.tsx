"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  Terminal, ArrowLeft, Loader2, BookOpen, Star,
  Clock, PlayCircle, Code2, ChevronRight, CheckCircle2,
  Share2, Copy, Check, AlertTriangle, LayoutDashboard,
  Tag, User, Calendar,
} from "lucide-react";
import { supabase } from "../../supabaseClient";

// ─── Types ───────────────────────────────────────────────────────────────────

interface Course {
  id: string;
  title: string;
  category: string;
  level: "Beginner" | "Intermediate" | "Advanced";
  duration: string;
  lessons: number;
  rating: number;
  description: string;
  desc?: string; // legacy field — fallback only
  topics: string[];
  author: string;
  thumbnail_url: string;
  created_at: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const LEVEL_COLORS: Record<string, string> = {
  Beginner:
    "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/50",
  Intermediate:
    "bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800/50",
  Advanced:
    "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800/50",
};

const CATEGORY_COLORS: Record<string, string> = {
  Frontend: "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400",
  Backend: "bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400",
  "Artificial Intelligence": "bg-pink-50 dark:bg-pink-900/20 text-pink-600 dark:text-pink-400",
  Networking: "bg-cyan-50 dark:bg-cyan-900/20 text-cyan-600 dark:text-cyan-400",
  Security: "bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400",
  Other: "bg-gray-50 dark:bg-gray-900/20 text-gray-600 dark:text-gray-400",
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function isVideoUrl(url: string) {
  return /\.(mp4|webm|ogg)$/i.test(url);
}

// ─── Related course card ─────────────────────────────────────────────────────

function RelatedCard({ course }: { course: Course }) {
  const searchParams = useSearchParams();
  const userId = searchParams.get("user_id") || searchParams.get("userId");
  return (
    <Link
      href={`/LearnPage/${course.id}${userId ? `?user_id=${userId}` : ''}`}
      className="group flex items-start gap-3 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/60 transition-colors border border-transparent hover:border-gray-200 dark:hover:border-gray-700"
    >
      <div className="w-14 h-10 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800 shrink-0 border border-gray-200 dark:border-gray-700">
        {course.thumbnail_url ? (
          isVideoUrl(course.thumbnail_url) ? (
            <video src={course.thumbnail_url} className="object-cover w-full h-full" muted playsInline />
          ) : (
            <img src={course.thumbnail_url} alt={course.title} className="object-cover w-full h-full" />
          )
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400">
            <BookOpen size={14} />
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
          {course.title}
        </p>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full border ${LEVEL_COLORS[course.level] || ""}`}>
            {course.level}
          </span>
          <span className="text-[10px] text-gray-400 dark:text-gray-500 flex items-center gap-0.5">
            <Clock size={9} /> {course.duration}
          </span>
        </div>
      </div>
      <ChevronRight size={14} className="text-gray-300 dark:text-gray-600 group-hover:text-blue-500 mt-1.5 shrink-0 transition-colors" />
    </Link>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

function LearnPageContent() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = params?.id as string;
  const userId = searchParams.get("user_id") || searchParams.get("userId");

  const [course, setCourse] = useState<Course | null>(null);
  const [related, setRelated] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  // Track which lesson indexes have been "completed" (client-only, no DB)
  const [completed, setCompleted] = useState<Set<number>>(new Set());

  // ─── Fetch course ─────────────────────────────────────────────────────────
  const fetchCourse = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from("courses")
        .select("*")
        .eq("id", id)
        .single();

      if (fetchError || !data) {
        setError("Course not found.");
        return;
      }
      setCourse(data as Course);

      // Fetch related courses — same category, exclude current
      const { data: relatedData } = await supabase
        .from("courses")
        .select("*")
        .eq("category", data.category)
        .neq("id", id)
        .order("created_at", { ascending: false })
        .limit(4);

      setRelated((relatedData as Course[]) || []);
    } catch (err) {
      console.error(err);
      setError("Failed to load course.");
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchCourse(); }, [fetchCourse]);

  // ─── Share / copy link ────────────────────────────────────────────────────
  const handleShare = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: course?.title ?? "Course", url });
      } else {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch {
      // user cancelled or clipboard denied
    }
  };

  // ─── Lesson completion toggle (UI-only, stateless) ────────────────────────
  const toggleLesson = (i: number) => {
    setCompleted(prev => {
      const next = new Set(prev);
      next.has(i) ? next.delete(i) : next.add(i);
      return next;
    });
  };

  const progressPct = course
    ? Math.round((completed.size / Math.max(course.lessons, 1)) * 100)
    : 0;

  // ─── Loading ──────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-black flex items-center justify-center">
        <Loader2 className="animate-spin text-blue-500" size={32} />
      </div>
    );
  }

  // ─── Error ────────────────────────────────────────────────────────────────
  if (error || !course) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-black flex flex-col items-center justify-center gap-4 p-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 flex items-center justify-center">
          <AlertTriangle size={28} className="text-red-500" />
        </div>
        <h1 className="text-2xl font-black text-gray-900 dark:text-gray-100">Course Not Found</h1>
        <p className="text-gray-500 dark:text-gray-400 max-w-xs">{error ?? "This course does not exist or has been removed."}</p>
        <button
          onClick={() => router.push(`/Academy${userId ? `?user_id=${userId}` : ''}`)}
          className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all"
        >
          <ArrowLeft size={16} /> Go Back
        </button>
      </div>
    );
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  const descriptionHtml = course.description || course.desc || "<p>No description provided.</p>";
  // Build a placeholder lessons array (1 per lesson count)
  const lessonList = Array.from({ length: course.lessons }, (_, i) => i);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black text-gray-900 dark:text-gray-100 overflow-x-hidden relative">
      {/* Grid background */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#00000008_1px,transparent_1px),linear-gradient(to_bottom,#00000008_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,#ffffff0a_1px,transparent_1px),linear-gradient(to_bottom,#ffffff0a_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />

      {/* Navbar */}
      <nav className="fixed top-0 w-full border-b border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-20 flex items-center justify-between gap-2 sm:gap-4">
          <Link href="/" className="font-black text-xl sm:text-2xl tracking-tighter flex items-center gap-2 text-gray-900 dark:text-gray-100 shrink-0">
            <Terminal className="text-blue-500 dark:text-blue-400" size={24} />
            <span className="hidden sm:inline">beone<span className="text-blue-600 dark:text-blue-400">of</span>us</span>
          </Link>

          {/* Breadcrumb */}
          <div className="hidden md:flex items-center gap-1.5 text-sm text-gray-400 dark:text-gray-500 min-w-0">
            <Link href={`/Academy${userId ? `?user_id=${userId}` : ''}`} className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors font-medium flex items-center gap-1">
              <LayoutDashboard size={13} /> Academy
            </Link>
            <ChevronRight size={13} />
            <span className={`font-bold px-2 py-0.5 rounded-full text-xs ${CATEGORY_COLORS[course.category] || CATEGORY_COLORS.Other}`}>
              {course.category}
            </span>
            <ChevronRight size={13} />
            <span className="font-semibold text-gray-700 dark:text-gray-300 truncate max-w-[120px] sm:max-w-[180px]">{course.title}</span>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <button
              onClick={handleShare}
              title="Share this course"
              className="flex items-center gap-1.5 text-xs font-bold text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 px-3 py-2 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              {copied ? <Check size={14} className="text-emerald-500" /> : <Share2 size={14} />}
              <span className="hidden sm:inline">{copied ? "Copied!" : "Share"}</span>
            </button>
            <button
              onClick={() => router.push(`/Academy${userId ? `?user_id=${userId}` : ''}`)}
              className="flex items-center gap-2 text-sm font-bold text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors bg-gray-100 dark:bg-gray-800 px-3 sm:px-4 py-2 rounded-xl"
            >
              <ArrowLeft size={16} /> <span className="hidden sm:inline">Back</span>
            </button>
          </div>
        </div>
      </nav>

      <main className="pt-28 pb-20 px-4 sm:px-6 relative z-10">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 sm:gap-8 items-start">

            {/* ─── Left: Main content ─────────────────────────────────────── */}
            <div className="space-y-6 sm:space-y-8 min-w-0">

              {/* Hero card */}
              <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl sm:rounded-[2rem] overflow-hidden shadow-xl">
                {/* Thumbnail */}
                {course.thumbnail_url && (
                  <div className="w-full aspect-video overflow-hidden bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-800">
                    {isVideoUrl(course.thumbnail_url) ? (
                      <video
                        src={course.thumbnail_url}
                        className="w-full h-full object-cover"
                        controls
                        muted
                        playsInline
                      />
                    ) : (
                      <img src={course.thumbnail_url} alt={course.title} className="w-full h-full object-cover" />
                    )}
                  </div>
                )}

                <div className="p-5 sm:p-8">
                  {/* Badge row */}
                  <div className="flex flex-wrap items-center gap-2 mb-4">
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${CATEGORY_COLORS[course.category] || CATEGORY_COLORS.Other}`}>
                      {course.category}
                    </span>
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${LEVEL_COLORS[course.level] || ""}`}>
                      {course.level}
                    </span>
                  </div>

                  <h1 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tighter text-gray-900 dark:text-gray-100 mb-3 leading-tight break-words">
                    {course.title}
                  </h1>

                  {/* Meta row */}
                  <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs sm:text-sm text-gray-500 dark:text-gray-400 mb-6">
                    <span className="flex items-center gap-1.5">
                      <User size={13} className="shrink-0" /> <span className="truncate max-w-[150px]">{course.author}</span>
                    </span>
                    <span className="flex items-center gap-1.5 shrink-0">
                      <Star size={13} className="text-amber-400" /> {course.rating} rating
                    </span>
                    <span className="flex items-center gap-1.5 shrink-0">
                      <Clock size={13} /> {course.duration}
                    </span>
                    <span className="flex items-center gap-1.5 shrink-0">
                      <PlayCircle size={13} /> {course.lessons} lesson{course.lessons !== 1 ? "s" : ""}
                    </span>
                    {course.created_at && (
                      <span className="flex items-center gap-1.5 shrink-0">
                        <Calendar size={13} /> {formatDate(course.created_at)}
                      </span>
                    )}
                  </div>

                  {/* Topics */}
                  {course.topics?.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-6">
                      {course.topics.map(topic => (
                        <span
                          key={topic}
                          className="flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700"
                        >
                          <Tag size={9} /> {topic}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Description */}
                  <div className="prose prose-sm dark:prose-invert max-w-none text-gray-600 dark:text-gray-300 leading-relaxed break-words overflow-hidden [&_p]:mb-4 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-4 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:mb-4 [&_strong]:font-bold [&_h1]:text-xl [&_h1]:font-black [&_h1]:text-gray-900 dark:[&_h1]:text-gray-100 [&_h2]:text-lg [&_h2]:font-bold [&_h2]:text-gray-900 dark:[&_h2]:text-gray-100 [&_h3]:font-bold [&_h3]:text-gray-900 dark:[&_h3]:text-gray-100 [&_pre]:overflow-x-auto [&_pre]:max-w-full [&_img]:max-w-full [&_img]:h-auto">
                    <div dangerouslySetInnerHTML={{ __html: descriptionHtml }} className="w-full min-w-0" />
                  </div>
                </div>
              </div>

              {/* ─── Lesson tracker ─────────────────────────────────────── */}
              <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl sm:rounded-[2rem] p-5 sm:p-8 shadow-xl">
                <div className="flex items-center justify-between gap-4 mb-5">
                  <div className="min-w-0">
                    <h2 className="text-lg sm:text-xl font-black text-gray-900 dark:text-gray-100 mb-0.5 truncate">Lesson Progress</h2>
                    <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 truncate">
                      {completed.size} of {course.lessons} lesson{course.lessons !== 1 ? "s" : ""} completed
                    </p>
                  </div>
                  <div className="relative w-12 h-12 sm:w-14 sm:h-14 shrink-0">
                    <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                      <circle cx="18" cy="18" r="15.9" fill="none" stroke="currentColor" strokeWidth="3" className="text-gray-100 dark:text-gray-800" />
                      <circle
                        cx="18" cy="18" r="15.9" fill="none" strokeWidth="3"
                        strokeDasharray={`${progressPct} ${100 - progressPct}`}
                        strokeLinecap="round"
                        className="text-blue-500 transition-all duration-500"
                        stroke="currentColor"
                      />
                    </svg>
                    <span className="absolute inset-0 flex items-center justify-center text-[10px] font-black text-gray-900 dark:text-gray-100">
                      {progressPct}%
                    </span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full mb-6 overflow-hidden">
                  <div
                    className="h-full bg-blue-500 rounded-full transition-all duration-500"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>

                {/* Lesson list */}
                <div className="space-y-2">
                  {lessonList.map(i => {
                    const done = completed.has(i);
                    return (
                      <button
                        key={i}
                        onClick={() => toggleLesson(i)}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-all text-left ${
                          done
                            ? "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800/50"
                            : "bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700"
                        }`}
                      >
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                          done
                            ? "bg-emerald-500 border-emerald-500"
                            : "border-gray-300 dark:border-gray-600"
                        }`}>
                          {done && <Check size={11} className="text-white" strokeWidth={3} />}
                        </div>
                        <span className={`text-sm font-semibold transition-colors truncate ${
                          done
                            ? "text-emerald-700 dark:text-emerald-300 line-through decoration-emerald-400/60"
                            : "text-gray-700 dark:text-gray-300"
                        }`}>
                          Lesson {i + 1}
                        </span>
                        {done && (
                          <span className="ml-auto text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider shrink-0">
                            Done
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {completed.size > 0 && (
                  <button
                    onClick={() => setCompleted(new Set())}
                    className="mt-4 w-full text-xs font-bold text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 transition-colors py-2"
                  >
                    Reset progress
                  </button>
                )}
              </div>

              {/* ─── CTA ─────────────────────────────────────────────────── */}
              <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl sm:rounded-[2rem] p-6 sm:p-8 text-white shadow-2xl shadow-blue-500/20">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6">
                  <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center shrink-0">
                    <Code2 size={24} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg sm:text-xl font-black mb-1">Ready to dive in?</h3>
                    <p className="text-blue-200 text-xs sm:text-sm mb-4 leading-relaxed">
                      Work through all {course.lessons} lesson{course.lessons !== 1 ? "s" : ""} and master {course.title}.
                    </p>
                    <div className="flex flex-wrap gap-2 sm:gap-3">
                      <button
                        onClick={() => toggleLesson(0)}
                        className="flex items-center justify-center gap-2 px-4 sm:px-5 py-2.5 bg-white text-blue-600 text-sm font-bold rounded-xl hover:bg-blue-50 transition-all active:scale-95 shadow-lg w-full sm:w-auto"
                      >
                        <PlayCircle size={16} />
                        {completed.has(0) ? "Continue" : "Start Lesson 1"}
                      </button>
                      <button
                        onClick={handleShare}
                        className="flex items-center justify-center gap-2 px-4 sm:px-5 py-2.5 bg-white/10 hover:bg-white/20 text-white text-sm font-bold rounded-xl transition-all active:scale-95 border border-white/20 w-full sm:w-auto mt-2 sm:mt-0"
                      >
                        {copied ? <><Check size={16} /> Copied!</> : <><Share2 size={16} /> Share</>}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ─── Right: Sidebar ────────────────────────────────────────── */}
            <div className="space-y-6 lg:sticky lg:top-28">

              {/* Quick stats card */}
              <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5 shadow-sm">
                <h3 className="text-sm font-black text-gray-900 dark:text-gray-100 mb-4 uppercase tracking-wider">Course Details</h3>
                <dl className="space-y-3">
                  {[
                    { label: "Level", value: course.level, badge: LEVEL_COLORS[course.level] },
                    { label: "Category", value: course.category, badge: CATEGORY_COLORS[course.category] || CATEGORY_COLORS.Other },
                    { label: "Duration", value: course.duration },
                    { label: "Lessons", value: `${course.lessons} lesson${course.lessons !== 1 ? "s" : ""}` },
                    { label: "Rating", value: `⭐ ${course.rating} / 5.0` },
                    { label: "Author", value: course.author },
                    { label: "Published", value: formatDate(course.created_at) },
                  ].map(({ label, value, badge }) => (
                    <div key={label} className="flex items-center justify-between gap-3 text-sm">
                      <dt className="text-gray-500 dark:text-gray-400 font-medium shrink-0">{label}</dt>
                      {badge ? (
                        <dd>
                          <span className={`text-[10px] sm:text-xs font-bold px-2 py-0.5 rounded-full border ${badge}`}>{value}</span>
                        </dd>
                      ) : (
                        <dd className="font-semibold text-gray-900 dark:text-gray-100 truncate text-right max-w-[160px] sm:max-w-[200px]">{value}</dd>
                      )}
                    </div>
                  ))}
                </dl>
              </div>

              {/* Progress summary (sidebar) */}
              {course.lessons > 0 && (
                <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-black text-gray-900 dark:text-gray-100 uppercase tracking-wider">Your Progress</h3>
                    <span className="text-xs font-black text-blue-600 dark:text-blue-400">{progressPct}%</span>
                  </div>
                  <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden mb-2">
                    <div
                      className="h-full bg-blue-500 rounded-full transition-all duration-500"
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-400 dark:text-gray-500">
                    {completed.size}/{course.lessons} completed
                  </p>
                  {progressPct === 100 && (
                    <div className="mt-3 flex items-center gap-2 text-emerald-600 dark:text-emerald-400 text-xs font-bold">
                      <CheckCircle2 size={14} /> Course complete! 🎉
                    </div>
                  )}
                </div>
              )}

              {/* Related courses */}
              {related.length > 0 && (
                <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5 shadow-sm">
                  <h3 className="text-sm font-black text-gray-900 dark:text-gray-100 mb-4 uppercase tracking-wider">
                    More in {course.category}
                  </h3>
                  <div className="space-y-2">
                    {related.map(r => <RelatedCard key={r.id} course={r} />)}
                  </div>
                  <Link
                    href={`/Academy${userId ? `?user_id=${userId}` : ''}`}
                    className="mt-4 flex items-center justify-center gap-1.5 w-full py-2.5 text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 rounded-xl hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors border border-blue-100 dark:border-blue-800/50"
                  >
                    Browse all courses <ChevronRight size={12} />
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function LearnPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 dark:bg-black flex items-center justify-center text-gray-500 font-medium">Loading...</div>}>
      <LearnPageContent />
    </Suspense>
  );
}
