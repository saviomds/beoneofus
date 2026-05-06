"use client";
import { CheckSquare, Square, BookOpen, Clock, Star, PlayCircle, Eye, Copy, Pencil, Trash2, Search } from "lucide-react";
import { CATEGORY_COLORS, LEVEL_COLORS } from "./constants";

export default function CourseList({
  courses, visibleCourses, isAdmin, selectedIds, toggleSelect, toggleSelectAll, isAllSelected, isPartialSelected,
  setSelectedCourse, handleEdit, handleDuplicate, handleDelete, isDuplicating,
  onClearFilters
}) {
  const isNewCourse = (course) => {
    if (!course.created_at) return false;
    return Date.now() - new Date(course.created_at).getTime() < 7 * 24 * 60 * 60 * 1000;
  };

  const stripHtml = (html) => {
    if (!html) return "";
    return html.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
  };

  return (
    <>
      {isAdmin && visibleCourses.length > 0 && (
        <div className="flex items-center gap-3 px-1 mb-3">
          <button
            onClick={toggleSelectAll}
            className="flex items-center gap-2 text-xs font-bold text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
          >
            {isAllSelected
              ? <CheckSquare size={15} className="text-blue-500" />
              : isPartialSelected
                ? <CheckSquare size={15} className="text-blue-300 dark:text-blue-600" />
                : <Square size={15} />
            }
            {isAllSelected ? "Deselect all" : `Select all (${visibleCourses.length})`}
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4">
        {visibleCourses.map(course => {
          const isSelected = selectedIds.has(course.id);
          return (
            <div
              key={course.id}
              onClick={() => setSelectedCourse(course)}
              className={`bg-white dark:bg-gray-900 border rounded-2xl p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-blue-300 dark:hover:border-blue-700 transition-colors cursor-pointer ${
                isSelected
                  ? "border-blue-400 dark:border-blue-600 ring-2 ring-blue-500/20"
                  : "border-gray-200 dark:border-gray-800"
              }`}
            >
              <div className="flex items-start gap-4 min-w-0">
                {isAdmin && (
                  <button
                    onClick={e => { e.stopPropagation(); toggleSelect(course.id); }}
                    className="shrink-0 mt-0.5"
                    title={isSelected ? "Deselect" : "Select"}
                  >
                    {isSelected
                      ? <CheckSquare size={17} className="text-blue-500" />
                      : <Square size={17} className="text-gray-300 dark:text-gray-600 hover:text-gray-500 dark:hover:text-gray-400" />
                    }
                  </button>
                )}

                <div className="w-16 h-10 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800 shrink-0 border border-gray-200 dark:border-gray-700">
                  {course.thumbnail_url ? (
                    course.thumbnail_url.match(/\.(mp4|webm|ogg)$/i) ? (
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

                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <h3 className="font-bold text-gray-900 dark:text-gray-100 truncate">{course.title}</h3>
                    {isNewCourse(course) && (
                      <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800/50 uppercase tracking-wider shrink-0">
                        New
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${CATEGORY_COLORS[course.category] || CATEGORY_COLORS.Other}`}>
                      {course.category}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${LEVEL_COLORS[course.level] || ""}`}>
                      {course.level}
                    </span>
                    <span className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1">
                      <Clock size={11} /> {course.duration}
                    </span>
                    <span className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1">
                      <Star size={11} /> {course.rating}
                    </span>
                    <span className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1">
                      <PlayCircle size={11} /> {course.lessons} lesson{course.lessons !== 1 ? "s" : ""}
                    </span>
                  </div>

                  {course.description && (
                    <p className="mt-1.5 text-xs text-gray-400 dark:text-gray-500 line-clamp-1 max-w-sm">
                      {stripHtml(course.description)}
                    </p>
                  )}
                </div>
              </div>

              {isAdmin && (
                <div className="flex items-center gap-2 shrink-0" onClick={e => e.stopPropagation()}>
                  <button onClick={() => setSelectedCourse(course)} title="Preview course" className="p-2 text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                    <Eye size={16} />
                  </button>
                  <button onClick={() => handleDuplicate(course)} disabled={isDuplicating} title="Duplicate course" className="p-2 text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-50">
                    <Copy size={16} />
                  </button>
                  <button onClick={() => handleEdit(course)} title="Edit course" className="p-2 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 rounded-xl hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors">
                    <Pencil size={16} />
                  </button>
                  <button onClick={() => handleDelete(course.id)} title="Delete course" className="p-2 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-xl hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors">
                    <Trash2 size={16} />
                  </button>
                </div>
              )}
            </div>
          );
        })}

        {visibleCourses.length === 0 && (
          <div className="text-center p-12 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl">
            <Search size={32} className="mx-auto text-gray-300 dark:text-gray-700 mb-3" />
            <p className="text-gray-500 dark:text-gray-400 font-medium">
              {courses.length === 0
                ? "No courses yet. Publish your first one above!"
                : "No courses match your filters."}
            </p>
            {courses.length > 0 && (
              <button
                onClick={onClearFilters}
                className="mt-3 text-sm text-blue-600 dark:text-blue-400 font-bold hover:underline"
              >
                Clear filters
              </button>
            )}
          </div>
        )}
      </div>
    </>
  );
}