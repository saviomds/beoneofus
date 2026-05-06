"use client";
import Link from "next/link";
import { BookOpen, Pencil, X, Star, PlayCircle, Clock, Code2, Trash2 } from "lucide-react";
import { LEVEL_COLORS } from "./constants";

export default function CourseDetailModal({
  course, onClose, isAdmin, handleEdit, handleDelete
}) {
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
          <div className="flex flex-col sm:flex-row gap-4 pt-6 mt-4 border-t border-gray-100 dark:border-gray-800">
            <Link href={`/LearnPage/${course.id}`} className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2 active:scale-95"><Code2 size={18} /> Start Reading Code</Link>
            {isAdmin && (
              <button onClick={() => handleDelete(course.id)} className="flex items-center justify-center gap-2 px-5 py-3.5 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 font-bold rounded-xl hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"><Trash2 size={16} /> Delete</button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}