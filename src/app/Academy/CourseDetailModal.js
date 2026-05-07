"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { BookOpen, Pencil, X, Star, PlayCircle, Clock, Code2, Trash2, CheckCircle2 } from "lucide-react";
import { LEVEL_COLORS } from "./constants";
import { supabase } from "../supabaseClient";

export default function CourseDetailModal({
  course, onClose, isAdmin, handleEdit, handleDelete, userId, userProgress
}) {
  const [lessons, setLessons] = useState([]);
  const [isLoadingLessons, setIsLoadingLessons] = useState(false);
  const [completedLessons, setCompletedLessons] = useState(new Set());

  // ─── Admin Lesson Management State ───
  const [isLessonModalOpen, setIsLessonModalOpen] = useState(false);
  const [lessonForm, setLessonForm] = useState({ id: null, title: "", content: "" });
  const [isSavingLesson, setIsSavingLesson] = useState(false);

  const fetchLessonsAndProgress = async (isMounted = true) => {
    setIsLoadingLessons(true);
    try {
      // Fetch lessons
      const { data: lessonsData, error: lessonsError } = await supabase
        .from("lessons")
        .select("id, title, content")
        .eq("course_id", course.id)
        .order("id", { ascending: true });
      
      if (!lessonsError && lessonsData && isMounted) {
        setLessons(lessonsData);
      }

      // Fetch individual lesson progress if user is logged in
      if (userId) {
        const { data: progData, error: progError } = await supabase
          .from("user_lesson_progress")
          .select("lesson_id")
          .eq("user_id", userId)
          .eq("course_id", course.id)
          .eq("status", "completed");
          
        if (!progError && progData && isMounted) {
          setCompletedLessons(new Set(progData.map(p => p.lesson_id)));
        }
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

  // ─── Admin Lesson Handlers ───
  const handleOpenAddLesson = () => {
    setLessonForm({ id: null, title: "", content: "" });
    setIsLessonModalOpen(true);
  };

  const handleOpenEditLesson = (e, lesson) => {
    e.preventDefault();
    e.stopPropagation();
    setLessonForm({ id: lesson.id, title: lesson.title, content: lesson.content || "" });
    setIsLessonModalOpen(true);
  };

  const handleSaveLesson = async () => {
    if (!lessonForm.title) return alert("Lesson title is required!");
    setIsSavingLesson(true);
    try {
      if (lessonForm.id) {
        const { error } = await supabase.from("lessons").update({
          title: lessonForm.title,
          content: lessonForm.content
        }).eq("id", lessonForm.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("lessons").insert({
          course_id: course.id,
          title: lessonForm.title,
          content: lessonForm.content
        });
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
    if (!window.confirm("Are you sure you want to delete this lesson?")) return;
    try {
      const { error } = await supabase.from("lessons").delete().eq("id", id);
      if (error) throw error;
      fetchLessonsAndProgress(true);
    } catch (err) {
      alert("Error deleting lesson: " + err.message);
    }
  };

  if (!course) return null;
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-gray-900/40 dark:bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-[2rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
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
              <div className="w-14 h-14 bg-blue-50 dark:bg-blue-900/20 rounded-2xl flex items-center justify-center text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-800/50 shrink-0 shadow-sm">
                <BookOpen size={28} />
              </div>
            )}
            <div>
              <h2 className="text-2xl font-black text-gray-900 dark:text-gray-100 tracking-tight mb-1">{course.title}</h2>
              <p className="text-sm font-bold text-gray-500 dark:text-gray-400">
                Instructed by <span className="text-blue-600 dark:text-blue-400">{course.author}</span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {isAdmin && (
              <button onClick={() => handleEdit(course)} title="Edit this course" className="p-2 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/40 rounded-full transition-colors border border-blue-100 dark:border-blue-800/50">
                <Pencil size={16} />
              </button>
            )}
            <button onClick={onClose} className="p-2 text-gray-400 dark:text-gray-500 hover:text-gray-900 dark:hover:text-gray-100 bg-white dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors border border-gray-200 dark:border-gray-700 shadow-sm">
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="p-6 sm:p-8 overflow-y-auto">
          <div className="flex flex-wrap items-center gap-3 mb-6">
            <span className="flex items-center gap-1.5 text-sm font-bold text-amber-600 dark:text-amber-500 bg-amber-50 dark:bg-amber-900/20 px-3 py-1.5 rounded-lg border border-amber-200 dark:border-amber-800/50"><Star size={16} /> {course.rating} Rating</span>
            <span className="flex items-center gap-1.5 text-sm font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-3 py-1.5 rounded-lg border border-blue-200 dark:border-blue-800/50"><PlayCircle size={16} /> {course.lessons} Interactive Lessons</span>
            <span className={`text-xs font-bold px-3 py-1.5 rounded-lg border ${LEVEL_COLORS[course.level] || ""}`}>{course.level}</span>
            <span className="text-xs font-bold text-gray-500 dark:text-gray-400 ml-auto bg-gray-50 dark:bg-gray-800 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 hidden sm:flex items-center gap-1.5"><Clock size={12} /> {course.duration}</span>
            {userProgress && userProgress[course.id] && (
              <span className={`text-xs font-bold px-3 py-1.5 rounded-lg border ${
                userProgress[course.id].status === 'completed'
                  ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/50'
                  : 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800/50'
              }`}>
                {userProgress[course.id].status === 'completed' ? 'Course Completed' : 'In Progress'}
              </span>
            )}
          </div>
          {course.topics?.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-6">
              {course.topics.map(topic => (
                <span key={topic} className="text-xs font-bold px-2.5 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700">{topic}</span>
              ))}
            </div>
          )}
          <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">Course Overview</h3>
          <div
            className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4 [&_p]:mb-4 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-4 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:mb-4 [&_strong]:font-bold [&_h1]:text-xl [&_h1]:font-black [&_h2]:text-lg [&_h2]:font-bold"
            dangerouslySetInnerHTML={{ __html: course.description || course.desc || "<p>No description provided.</p>" }}
          />

          <div className="flex items-center justify-between mt-6 mb-3 border-t border-gray-100 dark:border-gray-800 pt-6">
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">Lessons Included</h3>
            {isAdmin && (
              <button onClick={handleOpenAddLesson} className="text-xs font-bold bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/40 border border-blue-200 dark:border-blue-800/50 text-blue-600 dark:text-blue-400 px-3 py-1.5 rounded-lg transition-colors">
                + Add Lesson
              </button>
            )}
          </div>

          {isLoadingLessons ? (
            <div className="animate-pulse space-y-2 mb-4">
              <div className="h-12 bg-gray-100 dark:bg-gray-800 rounded-xl w-full"></div>
              <div className="h-12 bg-gray-100 dark:bg-gray-800 rounded-xl w-full"></div>
              <div className="h-12 bg-gray-100 dark:bg-gray-800 rounded-xl w-full"></div>
            </div>
          ) : lessons.length > 0 ? (
            <div className="flex flex-col gap-2 mb-4">
              {lessons.map((lesson, idx) => {
                const isCompleted = completedLessons.has(lesson.id);
                return (
                <Link 
                  key={lesson.id} 
                  href={userId ? `/LearnPage/${course.id}?lessonId=${lesson.id}` : "/auth"}
                  className="flex items-center gap-3 p-3.5 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700 hover:bg-white dark:hover:bg-gray-800 transition-all cursor-pointer group"
                >
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black shrink-0 transition-colors ${
                    isCompleted ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 group-hover:bg-emerald-600 group-hover:text-white" : "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 group-hover:bg-blue-600 group-hover:text-white"
                  }`}>
                    {isCompleted ? <CheckCircle2 size={14} /> : idx + 1}
                  </div>
                  <span className={`text-sm font-bold transition-colors ${isCompleted ? "text-emerald-700 dark:text-emerald-400 group-hover:text-emerald-600" : "text-gray-700 dark:text-gray-300 group-hover:text-blue-600 dark:group-hover:text-blue-400"}`}>{lesson.title}</span>
                  {isAdmin && (
                    <div className="ml-auto flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={(e) => handleOpenEditLesson(e, lesson)} className="p-1.5 text-blue-600 bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 rounded-md border border-blue-200 dark:border-blue-800/50"><Pencil size={14}/></button>
                      <button onClick={(e) => handleDeleteLesson(e, lesson.id)} className="p-1.5 text-red-600 bg-red-100 hover:bg-red-200 dark:bg-red-900/30 dark:hover:bg-red-900/50 rounded-md border border-red-200 dark:border-red-800/50"><Trash2 size={14}/></button>
                    </div>
                  )}
                </Link>
              )})}
            </div>
          ) : (
            <p className="text-sm text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50 p-4 rounded-xl border border-gray-100 dark:border-gray-700 mb-4">No lessons found for this course.</p>
          )}

          <div className="flex flex-col sm:flex-row gap-4 pt-6 mt-4 border-t border-gray-100 dark:border-gray-800">
            {userId ? (
              <Link href={`/LearnPage/${course.id}`} className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2 active:scale-95"><Code2 size={18} /> Start Reading Code</Link>
            ) : (
              <Link href="/auth" className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2 active:scale-95"><Code2 size={18} /> Login to Start Reading</Link>
            )}
            {isAdmin && (
              <button onClick={() => handleDelete(course.id)} className="flex items-center justify-center gap-2 px-5 py-3.5 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 font-bold rounded-xl hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"><Trash2 size={16} /> Delete</button>
            )}
          </div>
        </div>

        {/* Nested Admin Form Modal for Adding/Editing Lessons */}
        {isLessonModalOpen && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-gray-900/60 dark:bg-black/80 backdrop-blur-md" onClick={() => setIsLessonModalOpen(false)} />
            <div className="relative w-full max-w-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-2xl p-6 sm:p-8 animate-in fade-in zoom-in-95 duration-200">
              <h3 className="text-xl font-black text-gray-900 dark:text-gray-100 mb-6">{lessonForm.id ? "Edit Lesson" : "Add New Lesson"}</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5">Lesson Title</label>
                  <input type="text" value={lessonForm.title} onChange={e => setLessonForm({...lessonForm, title: e.target.value})} placeholder="e.g. Introduction to Variables" className="w-full border rounded-xl px-4 py-3 bg-gray-50 dark:bg-gray-950 border-gray-200 dark:border-gray-800 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-gray-900 dark:text-gray-100" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5">Lesson Content (HTML supported)</label>
                  <textarea value={lessonForm.content} onChange={e => setLessonForm({...lessonForm, content: e.target.value})} rows={6} placeholder="<p>Write your lesson here...</p>" className="w-full border rounded-xl px-4 py-3 bg-gray-50 dark:bg-gray-950 border-gray-200 dark:border-gray-800 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-gray-900 dark:text-gray-100" />
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-8">
                <button onClick={() => setIsLessonModalOpen(false)} className="px-5 py-2.5 font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors">Cancel</button>
                <button onClick={handleSaveLesson} disabled={isSavingLesson} className="px-5 py-2.5 font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-xl disabled:opacity-50 transition-all shadow-lg shadow-blue-500/20">
                  {isSavingLesson ? "Saving..." : (lessonForm.id ? "Update Lesson" : "Publish Lesson")}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}