"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  BookOpen, Pencil, X, Star, PlayCircle, Clock, Code2, Trash2,
  CheckCircle2, Award, ExternalLink, Sparkles, Loader2, Eye, EyeOff,
} from "lucide-react";
import { LEVEL_COLORS } from "./constants";
import { supabase } from "../supabaseClient";

const CODE_LANGS = [
  "javascript", "typescript", "python", "bash", "css", "html",
  "sql", "json", "go", "rust", "java", "c", "cpp",
];

export default function CourseDetailModal({
  course, onClose, isAdmin, handleEdit, handleDelete, userId, userProgress
}) {
  const [lessons, setLessons] = useState([]);
  const [isLoadingLessons, setIsLoadingLessons] = useState(false);
  const [completedLessons, setCompletedLessons] = useState(new Set());
  const [certificate, setCertificate] = useState(null);

  // ─── Lesson form state ────────────────────────────────────────────────────
  const [isLessonModalOpen, setIsLessonModalOpen] = useState(false);
  const [lessonForm, setLessonForm] = useState({ id: null, title: "", content: "" });
  const [isSavingLesson, setIsSavingLesson] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [codeLanguage, setCodeLanguage] = useState("javascript");
  const contentRef = useRef(null);

  const fetchLessonsAndProgress = async (isMounted = true) => {
    setIsLoadingLessons(true);
    try {
      const { data: lessonsData, error: lessonsError } = await supabase
        .from("lessons")
        .select("id, title, content")
        .eq("course_id", course.id)
        .order("id", { ascending: true });

      if (!lessonsError && lessonsData && isMounted) setLessons(lessonsData);

      if (userId) {
        const [progressRes, certRes] = await Promise.all([
          supabase.from("user_lesson_progress").select("lesson_id").eq("user_id", userId).eq("course_id", course.id).eq("status", "completed"),
          supabase.from("user_certificates").select("id").eq("user_id", userId).eq("course_id", course.id).maybeSingle(),
        ]);
        if (!progressRes.error && progressRes.data && isMounted)
          setCompletedLessons(new Set(progressRes.data.map((p) => p.lesson_id)));
        if (certRes.data && isMounted) setCertificate(certRes.data);
      }
    } catch (err) {
      console.error("Failed to fetch lessons:", err);
    } finally {
      if (isMounted) setIsLoadingLessons(false);
    }
  };

  useEffect(() => {
    if (!course) return;
    let isMounted = true;
    fetchLessonsAndProgress(isMounted);
    return () => { isMounted = false; };
  }, [course, userId]);

  // ─── Admin: open lesson form ───────────────────────────────────────────────
  const openAddLesson = () => {
    setLessonForm({ id: null, title: "", content: "" });
    setShowPreview(false);
    setIsLessonModalOpen(true);
  };

  const openEditLesson = (e, lesson) => {
    e.preventDefault();
    e.stopPropagation();
    setLessonForm({ id: lesson.id, title: lesson.title, content: lesson.content || "" });
    setShowPreview(false);
    setIsLessonModalOpen(true);
  };

  // ─── AI: generate lesson content ──────────────────────────────────────────
  const handleAIGenerate = async () => {
    if (!lessonForm.title || !course) return;
    setIsGenerating(true);
    setShowPreview(false);
    try {
      const res = await fetch("/api/generate-lesson", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseTitle: course.title,
          lessonTitle: lessonForm.title,
          category: course.category,
          level: course.level,
          type: "lesson",
        }),
      });
      const data = await res.json();
      if (data.html) {
        setLessonForm((prev) => ({ ...prev, content: data.html }));
      } else {
        alert("AI generation failed: " + (data.error || "Unknown error"));
      }
    } catch (err) {
      alert("Failed to generate content: " + err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  // ─── Insert code block at cursor position ─────────────────────────────────
  const insertCodeBlock = () => {
    const block = `\n<pre><code class="language-${codeLanguage}">\n// your ${codeLanguage} code here\n</code></pre>\n`;
    const el = contentRef.current;
    if (el) {
      const start = el.selectionStart;
      const end = el.selectionEnd;
      const val = lessonForm.content;
      const next = val.slice(0, start) + block + val.slice(end);
      setLessonForm((prev) => ({ ...prev, content: next }));
      setTimeout(() => {
        el.focus();
        el.setSelectionRange(start + block.length, start + block.length);
      }, 0);
    } else {
      setLessonForm((prev) => ({ ...prev, content: prev.content + block }));
    }
  };

  // ─── Save / delete lesson ─────────────────────────────────────────────────
  const handleSaveLesson = async () => {
    if (!lessonForm.title) return alert("Lesson title is required!");
    setIsSavingLesson(true);
    try {
      if (lessonForm.id) {
        const { error } = await supabase
          .from("lessons")
          .update({ title: lessonForm.title, content: lessonForm.content })
          .eq("id", lessonForm.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("lessons")
          .insert({ course_id: course.id, title: lessonForm.title, content: lessonForm.content });
        if (error) throw error;
      }
      fetchLessonsAndProgress(true);
      setIsLessonModalOpen(false);
    } catch (err) {
      alert("Error saving lesson: " + err.message);
    } finally {
      setIsSavingLesson(false);
    }
  };

  const handleDeleteLesson = async (e, id) => {
    e.preventDefault();
    e.stopPropagation();
    if (!window.confirm("Delete this lesson?")) return;
    try {
      const { error } = await supabase.from("lessons").delete().eq("id", id);
      if (error) throw error;
      fetchLessonsAndProgress(true);
    } catch (err) {
      alert("Error deleting lesson: " + err.message);
    }
  };

  if (!course) return null;

  const progress =
    lessons.length > 0 ? Math.round((completedLessons.size / lessons.length) * 100) : 0;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-gray-900/40 dark:bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-full max-w-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-[2rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="p-6 sm:p-8 border-b border-gray-100 dark:border-gray-800 flex items-start justify-between bg-gray-50/50 dark:bg-gray-800/50 shrink-0">
          <div className="flex items-center gap-4">
            {course.thumbnail_url ? (
              <div className="relative w-14 h-14 rounded-2xl overflow-hidden shrink-0 shadow-sm border border-gray-200 dark:border-gray-700">
                {course.thumbnail_url.match(/\.(mp4|webm|ogg)$/i) ? (
                  <video src={course.thumbnail_url} className="object-cover w-full h-full" muted loop playsInline autoPlay />
                ) : (
                  <img src={course.thumbnail_url} alt={course.title} className="object-cover w-full h-full" />
                )}
              </div>
            ) : (
              <div className="w-14 h-14 bg-blue-50 dark:bg-blue-900/20 rounded-2xl flex items-center justify-center text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-800/50 shrink-0">
                <BookOpen size={28} />
              </div>
            )}
            <div>
              <h2 className="text-2xl font-black text-gray-900 dark:text-gray-100 tracking-tight mb-1">{course.title}</h2>
              <p className="text-sm font-bold text-gray-500 dark:text-gray-400">
                by <span className="text-blue-600 dark:text-blue-400">{course.author}</span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {isAdmin && (
              <button
                onClick={() => handleEdit(course)}
                className="p-2 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/40 rounded-full transition-colors border border-blue-100 dark:border-blue-800/50"
              >
                <Pencil size={16} />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 bg-white dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors border border-gray-200 dark:border-gray-700 shadow-sm"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 sm:p-8 overflow-y-auto">
          {/* Badges */}
          <div className="flex flex-wrap items-center gap-3 mb-6">
            <span className="flex items-center gap-1.5 text-sm font-bold text-amber-600 dark:text-amber-500 bg-amber-50 dark:bg-amber-900/20 px-3 py-1.5 rounded-lg border border-amber-200 dark:border-amber-800/50">
              <Star size={16} /> {course.rating} Rating
            </span>
            <span className="flex items-center gap-1.5 text-sm font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-3 py-1.5 rounded-lg border border-blue-200 dark:border-blue-800/50">
              <PlayCircle size={16} /> {course.lessons} Lessons
            </span>
            <span className={`text-xs font-bold px-3 py-1.5 rounded-lg border ${LEVEL_COLORS[course.level] || ""}`}>
              {course.level}
            </span>
            <span className="text-xs font-bold text-gray-500 dark:text-gray-400 ml-auto bg-gray-50 dark:bg-gray-800 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 hidden sm:flex items-center gap-1.5">
              <Clock size={12} /> {course.duration}
            </span>
            {certificate && (
              <a
                href={`/certificate/${certificate.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg border bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800/50 hover:border-yellow-400 transition-colors"
              >
                <Award size={14} /> Certificate <ExternalLink size={11} />
              </a>
            )}
          </div>

          {/* Topics */}
          {course.topics?.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-6">
              {course.topics.map((topic) => (
                <span key={topic} className="text-xs font-bold px-2.5 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700">
                  {topic}
                </span>
              ))}
            </div>
          )}

          {/* Description */}
          <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">Course Overview</h3>
          <div
            className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4 [&_p]:mb-4 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-4 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:mb-4 [&_strong]:font-bold [&_h1]:text-xl [&_h1]:font-black [&_h2]:text-lg [&_h2]:font-bold"
            dangerouslySetInnerHTML={{ __html: course.description || course.desc || "<p>No description provided.</p>" }}
          />

          {/* Progress bar */}
          {userId && lessons.length > 0 && (
            <div className="mt-6 mb-2 border-t border-gray-100 dark:border-gray-800 pt-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Progress</span>
                <span className="text-xs font-black text-gray-700 dark:text-gray-300">
                  {completedLessons.size}/{lessons.length} lessons · {progress}%
                </span>
              </div>
              <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all duration-700"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {/* Lessons list */}
          <div className="flex items-center justify-between mt-4 mb-3">
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">Lessons Included</h3>
            {isAdmin && (
              <button
                onClick={openAddLesson}
                className="text-xs font-bold bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/40 border border-blue-200 dark:border-blue-800/50 text-blue-600 dark:text-blue-400 px-3 py-1.5 rounded-lg transition-colors"
              >
                + Add Lesson
              </button>
            )}
          </div>

          {isLoadingLessons ? (
            <div className="animate-pulse space-y-2 mb-4">
              {[1, 2, 3].map((i) => <div key={i} className="h-12 bg-gray-100 dark:bg-gray-800 rounded-xl w-full" />)}
            </div>
          ) : lessons.length > 0 ? (
            <div className="flex flex-col gap-2 mb-4">
              {lessons.map((lesson, idx) => {
                const done = completedLessons.has(lesson.id);
                return (
                  <Link
                    key={lesson.id}
                    href={userId ? `/LearnPage/${course.id}?lessonId=${lesson.id}` : "/auth"}
                    className="flex items-center gap-3 p-3.5 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700 hover:bg-white dark:hover:bg-gray-800 transition-all cursor-pointer group"
                  >
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black shrink-0 transition-colors ${done ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 group-hover:bg-emerald-600 group-hover:text-white" : "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 group-hover:bg-blue-600 group-hover:text-white"}`}>
                      {done ? <CheckCircle2 size={14} /> : idx + 1}
                    </div>
                    <span className={`text-sm font-bold flex-1 transition-colors ${done ? "text-emerald-700 dark:text-emerald-400" : "text-gray-700 dark:text-gray-300 group-hover:text-blue-600 dark:group-hover:text-blue-400"}`}>
                      {lesson.title}
                    </span>
                    {isAdmin && (
                      <div className="ml-auto flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => openEditLesson(e, lesson)}
                          className="p-1.5 text-blue-600 bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 rounded-md border border-blue-200 dark:border-blue-800/50"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={(e) => handleDeleteLesson(e, lesson.id)}
                          className="p-1.5 text-red-600 bg-red-100 hover:bg-red-200 dark:bg-red-900/30 dark:hover:bg-red-900/50 rounded-md border border-red-200 dark:border-red-800/50"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    )}
                  </Link>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50 p-4 rounded-xl border border-gray-100 dark:border-gray-700 mb-4">
              No lessons yet.
            </p>
          )}

          {/* CTA buttons */}
          <div className="flex flex-col sm:flex-row gap-4 pt-6 mt-4 border-t border-gray-100 dark:border-gray-800">
            {userId ? (
              <Link
                href={`/LearnPage/${course.id}`}
                onClick={() =>
                  supabase.from("user_activity").insert({
                    user_id: userId,
                    type: "course_started",
                    content: `Started course: ${course.title}`,
                    metadata: { course_id: course.id },
                  }).then(() => {})
                }
                className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2 active:scale-95"
              >
                <Code2 size={18} />
                {completedLessons.size > 0 ? "Continue Learning" : "Start Learning"}
              </Link>
            ) : (
              <Link
                href="/auth"
                className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2 active:scale-95"
              >
                <Code2 size={18} /> Login to Start
              </Link>
            )}
            {isAdmin && (
              <button
                onClick={() => handleDelete(course.id)}
                className="flex items-center justify-center gap-2 px-5 py-3.5 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 font-bold rounded-xl hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"
              >
                <Trash2 size={16} /> Delete
              </button>
            )}
          </div>
        </div>

        {/* ─── Lesson form modal (nested) ──────────────────────────────────── */}
        {isLessonModalOpen && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
            <div
              className="absolute inset-0 bg-gray-900/60 dark:bg-black/80 backdrop-blur-md"
              onClick={() => setIsLessonModalOpen(false)}
            />
            <div className="relative w-full max-w-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-2xl animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[92vh]">

              {/* Modal header */}
              <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100 dark:border-gray-800 shrink-0">
                <h3 className="text-xl font-black text-gray-900 dark:text-gray-100">
                  {lessonForm.id ? "Edit Lesson" : "New Lesson"}
                </h3>
                <button
                  onClick={() => setIsLessonModalOpen(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Modal body */}
              <div className="p-6 space-y-5 overflow-y-auto flex-1">

                {/* Title + AI Generate */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                    Lesson Title
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={lessonForm.title}
                      onChange={(e) => setLessonForm({ ...lessonForm, title: e.target.value })}
                      placeholder="e.g. Introduction to Variables"
                      className="flex-1 border rounded-xl px-4 py-2.5 bg-gray-50 dark:bg-gray-950 border-gray-200 dark:border-gray-800 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-gray-900 dark:text-gray-100"
                    />
                    <button
                      type="button"
                      onClick={handleAIGenerate}
                      disabled={isGenerating || !lessonForm.title.trim()}
                      title={lessonForm.title.trim() ? "Generate lesson content with AI" : "Enter a title first"}
                      className="flex items-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-all shrink-0 shadow-lg shadow-purple-500/20"
                    >
                      {isGenerating ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <Sparkles size={16} />
                      )}
                      <span className="hidden sm:inline text-sm">
                        {isGenerating ? "Writing..." : "AI Write"}
                      </span>
                    </button>
                  </div>
                  {isGenerating && (
                    <p className="text-xs text-purple-600 dark:text-purple-400 mt-2 flex items-center gap-1.5 animate-pulse">
                      <Sparkles size={11} /> AI is generating lesson content with code examples…
                    </p>
                  )}
                </div>

                {/* Content area */}
                <div>
                  <div className="flex items-center justify-between mb-1.5 gap-2 flex-wrap">
                    <label className="text-sm font-bold text-gray-700 dark:text-gray-300">
                      Lesson Content <span className="text-gray-400 font-normal">(HTML)</span>
                    </label>
                    <div className="flex items-center gap-2">
                      {/* Code block insert */}
                      <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                        <select
                          value={codeLanguage}
                          onChange={(e) => setCodeLanguage(e.target.value)}
                          className="text-xs bg-transparent px-2 py-1.5 text-gray-600 dark:text-gray-400 outline-none cursor-pointer"
                        >
                          {CODE_LANGS.map((l) => <option key={l} value={l}>{l}</option>)}
                        </select>
                        <button
                          type="button"
                          onClick={insertCodeBlock}
                          className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors border-l border-gray-200 dark:border-gray-700"
                          title="Insert code block at cursor"
                        >
                          <Code2 size={12} /> Insert
                        </button>
                      </div>

                      {/* Preview toggle */}
                      <button
                        type="button"
                        onClick={() => setShowPreview(!showPreview)}
                        className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg border transition-colors ${
                          showPreview
                            ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800/50"
                            : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:bg-gray-200 dark:hover:bg-gray-700"
                        }`}
                      >
                        {showPreview ? <EyeOff size={12} /> : <Eye size={12} />}
                        {showPreview ? "Edit" : "Preview"}
                      </button>
                    </div>
                  </div>

                  {showPreview ? (
                    <div
                      className="min-h-[240px] max-h-[380px] overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-xl p-5 text-sm
                                 prose dark:prose-invert max-w-none
                                 [&_pre]:rounded-xl [&_pre]:p-4 [&_pre]:bg-gray-900 [&_pre]:text-gray-100 [&_pre]:overflow-x-auto [&_pre]:text-xs
                                 [&_h2]:text-lg [&_h2]:font-bold [&_h2]:mb-3 [&_h3]:font-bold [&_h3]:mb-2
                                 [&_p]:text-gray-600 dark:[&_p]:text-gray-300 [&_p]:mb-3
                                 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-3
                                 [&_strong]:font-bold [&_blockquote]:border-l-4 [&_blockquote]:border-blue-500 [&_blockquote]:pl-4 [&_blockquote]:italic"
                      dangerouslySetInnerHTML={{
                        __html: lessonForm.content || "<p class='text-gray-400 dark:text-gray-500 italic'>Nothing to preview yet.</p>",
                      }}
                    />
                  ) : (
                    <textarea
                      ref={contentRef}
                      value={lessonForm.content}
                      onChange={(e) => setLessonForm({ ...lessonForm, content: e.target.value })}
                      rows={12}
                      placeholder={'<h2>Introduction</h2>\n<p>In this lesson, you will learn...</p>\n<pre><code class="language-javascript">\nconsole.log("Hello, World!");\n</code></pre>'}
                      className="w-full border rounded-xl px-4 py-3 bg-gray-50 dark:bg-gray-950 border-gray-200 dark:border-gray-800 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-gray-900 dark:text-gray-100 font-mono resize-y leading-relaxed"
                    />
                  )}
                  <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1.5">
                    Write HTML directly or click <strong>AI Write</strong> to auto-generate from the lesson title.
                    Use <strong>Insert</strong> to add code blocks at the cursor.
                  </p>
                </div>
              </div>

              {/* Modal footer */}
              <div className="flex justify-end gap-3 px-6 pb-6 pt-4 border-t border-gray-100 dark:border-gray-800 shrink-0">
                <button
                  onClick={() => setIsLessonModalOpen(false)}
                  className="px-5 py-2.5 font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveLesson}
                  disabled={isSavingLesson}
                  className="px-6 py-2.5 font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-xl disabled:opacity-50 transition-all shadow-lg shadow-blue-500/20 flex items-center gap-2"
                >
                  {isSavingLesson ? (
                    <><Loader2 size={16} className="animate-spin" /> Saving...</>
                  ) : (
                    lessonForm.id ? "Update Lesson" : "Publish Lesson"
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
