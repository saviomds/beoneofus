"use client";
import { useState } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import { Loader2, BookOpen, Upload, Sparkles } from "lucide-react";
import { CATEGORIES, LEVELS } from "./constants";
import { supabase } from "../supabaseClient";

const ReactQuill = dynamic(() => import("react-quill-new"), { ssr: false });
import "react-quill-new/dist/quill.snow.css";

export default function CourseForm({
  formData, setFormData, isEditing, isLoading, thumbnailPreview, thumbnailFile,
  setThumbnailFile, setThumbnailPreview, fileInputRef, handleSubmit, handleChange,
  handleFileChange, resetForm
}) {
  const [isGeneratingDesc, setIsGeneratingDesc] = useState(false);

  const handleAIDescription = async () => {
    if (!formData.title) {
      alert("Enter a course title first so AI knows what to write about.");
      return;
    }
    setIsGeneratingDesc(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/generate-lesson", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(session ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({
          courseTitle: formData.title,
          category: formData.category,
          level: formData.level,
          type: "description",
        }),
      });
      const data = await res.json();
      if (data.html) {
        setFormData((prev) => ({ ...prev, description: data.html }));
      } else {
        alert("AI generation failed: " + (data.error || "Unknown error"));
      }
    } catch (err) {
      alert("Failed to generate description: " + err.message);
    } finally {
      setIsGeneratingDesc(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-[2rem] p-6 sm:p-10 shadow-xl">
      <form onSubmit={handleSubmit} className="space-y-6">

        {/* Thumbnail */}
        <div>
          <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
            Course Thumbnail (Image / Video)
          </label>
          <div className="flex items-center gap-4">
            <div
              className="relative w-32 h-20 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-700 flex items-center justify-center bg-gray-50 dark:bg-gray-900 overflow-hidden cursor-pointer hover:border-blue-500 transition-colors shrink-0"
              onClick={() => fileInputRef.current?.click()}
            >
              {thumbnailPreview ? (
                thumbnailPreview.startsWith("data:video") ? (
                  <video src={thumbnailPreview} className="object-cover w-full h-full" muted loop playsInline />
                ) : (
                  <Image src={thumbnailPreview} alt="Preview" fill unoptimized className="object-cover w-full h-full" />
                )
              ) : formData.thumbnail_url ? (
                formData.thumbnail_url.match(/\.(mp4|webm|ogg)$/i) ? (
                  <video src={formData.thumbnail_url} className="object-cover w-full h-full" muted loop playsInline />
                ) : (
                  <Image src={formData.thumbnail_url} alt="Preview" fill unoptimized className="object-cover w-full h-full" />
                )
              ) : (
                <div className="text-gray-400 flex flex-col items-center">
                  <Upload size={20} />
                  <span className="text-[10px] font-bold mt-1">Upload</span>
                </div>
              )}
            </div>
            <div className="flex-1">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Upload a 16:9 image or short video. Max 50MB.</p>
              {thumbnailFile && (
                <button
                  type="button"
                  onClick={() => { setThumbnailFile(null); setThumbnailPreview(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}
                  className="text-xs text-red-500 hover:text-red-600 font-bold"
                >
                  Remove File
                </button>
              )}
            </div>
            <input ref={fileInputRef} type="file" accept="image/*,video/mp4,video/webm,video/ogg" className="hidden" onChange={handleFileChange} />
          </div>
        </div>

        {/* Title */}
        <div>
          <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Course Title</label>
          <input
            type="text" required name="title" value={formData.title} onChange={handleChange}
            placeholder="e.g. Next.js App Router Masterclass"
            className="w-full bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-gray-900 dark:text-gray-100 shadow-sm"
          />
        </div>

        {/* Category + Level */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Category</label>
            <select name="category" value={formData.category} onChange={handleChange}
              className="w-full bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-gray-900 dark:text-gray-100 shadow-sm cursor-pointer">
              {CATEGORIES.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Level</label>
            <select name="level" value={formData.level} onChange={handleChange}
              className="w-full bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-gray-900 dark:text-gray-100 shadow-sm cursor-pointer">
              {LEVELS.map((lvl) => <option key={lvl} value={lvl}>{lvl}</option>)}
            </select>
          </div>
        </div>

        {/* Duration + Lessons + Rating */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Duration</label>
            <input type="text" required name="duration" value={formData.duration} onChange={handleChange} placeholder="e.g. 4h 30m"
              className="w-full bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-gray-900 dark:text-gray-100 shadow-sm" />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Lessons</label>
            <input type="number" required min="1" name="lessons" value={formData.lessons} onChange={handleChange}
              className="w-full bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-gray-900 dark:text-gray-100 shadow-sm" />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Rating (1–5)</label>
            <input type="number" required step="0.1" min="1" max="5" name="rating" value={formData.rating} onChange={handleChange}
              className="w-full bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-gray-900 dark:text-gray-100 shadow-sm" />
          </div>
        </div>

        {/* Topics + Author */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Topics (comma-separated)</label>
            <input type="text" required name="topics" value={formData.topics} onChange={handleChange} placeholder="e.g. React, Next.js, API"
              className="w-full bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-gray-900 dark:text-gray-100 shadow-sm" />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Author</label>
            <input type="text" required name="author" value={formData.author} onChange={handleChange} placeholder="e.g. @system"
              className="w-full bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-gray-900 dark:text-gray-100 shadow-sm" />
          </div>
        </div>

        {/* Description with AI generate */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Course Description</label>
            <button
              type="button"
              onClick={handleAIDescription}
              disabled={isGeneratingDesc || !formData.title}
              title={formData.title ? "Generate description with AI" : "Enter a course title first"}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold rounded-lg transition-all shadow-md shadow-purple-500/20"
            >
              {isGeneratingDesc ? (
                <><Loader2 size={13} className="animate-spin" /> Writing…</>
              ) : (
                <><Sparkles size={13} /> AI Write</>
              )}
            </button>
          </div>
          {isGeneratingDesc && (
            <p className="text-xs text-purple-600 dark:text-purple-400 mb-2 flex items-center gap-1 animate-pulse">
              <Sparkles size={11} /> AI is generating course description…
            </p>
          )}
          <div className="bg-white dark:bg-gray-950 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden [&_.ql-toolbar]:border-none [&_.ql-toolbar]:border-b [&_.ql-toolbar]:border-gray-200 dark:[&_.ql-toolbar]:border-gray-800 [&_.ql-container]:border-none [&_.ql-editor]:min-h-[150px] [&_.ql-editor]:text-gray-900 dark:[&_.ql-editor]:text-gray-100 [&_.ql-editor]:text-sm">
            <ReactQuill
              theme="snow"
              value={formData.description}
              onChange={(value) => setFormData((prev) => ({ ...prev, description: value }))}
              placeholder="Brief summary of the course, or click AI Write to generate one…"
            />
          </div>
        </div>

        {/* Submit */}
        <div className="pt-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between gap-4">
          {isEditing && (
            <button type="button" onClick={resetForm}
              className="px-6 py-4 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-bold rounded-xl transition-all">
              Cancel
            </button>
          )}
          <button type="submit" disabled={isLoading}
            className="flex-1 flex justify-center items-center gap-2 py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-blue-500/20 active:scale-95 disabled:opacity-50">
            {isLoading
              ? <Loader2 size={18} className="animate-spin" />
              : <><BookOpen size={18} /> {isEditing ? "Update Course" : "Publish Course"}</>
            }
          </button>
        </div>
      </form>
    </div>
  );
}
