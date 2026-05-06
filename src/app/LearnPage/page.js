"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import {
  Terminal, ArrowLeft, Loader2, CheckCircle2,
  AlertTriangle, BookOpen, LayoutDashboard, Pencil, Trash2, Upload,
  X, Search, Copy, Clock, Star, Layers, BarChart2, Code2, PlayCircle,
  Download, CheckSquare, Square, Trash, RefreshCw, Eye
} from "lucide-react";
import { supabase } from "../supabaseClient";

const ReactQuill = dynamic(() => import("react-quill-new"), { ssr: false });
import "react-quill-new/dist/quill.snow.css";

const CATEGORIES = ["Frontend", "Backend", "Artificial Intelligence", "Networking", "Security", "Other"];
const LEVELS = ["Beginner", "Intermediate", "Advanced"];

const LEVEL_COLORS = {
  Beginner: "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/50",
  Intermediate: "bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800/50",
  Advanced: "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800/50",
};

const CATEGORY_COLORS = {
  Frontend: "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400",
  Backend: "bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400",
  "Artificial Intelligence": "bg-pink-50 dark:bg-pink-900/20 text-pink-600 dark:text-pink-400",
  Networking: "bg-cyan-50 dark:bg-cyan-900/20 text-cyan-600 dark:text-cyan-400",
  Security: "bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400",
  Other: "bg-gray-50 dark:bg-gray-900/20 text-gray-600 dark:text-gray-400",
};

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
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [userId, setUserId] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
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

  const fetchCourses = useCallback(async (silent = false) => {
    if (!silent) setIsRefreshing(true);
    try {
      const { data, error } = await supabase
        .from("courses")
        .select("*")
        .order("created_at", { ascending: false });
      if (!error && data) {
        setCourses(data);
        // Sync selectedCourse if modal is open
        setSelectedCourse(prev => prev ? (data.find(d => d.id === prev.id) ?? null) : null);
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
        const { data: profile } = await supabase
          .from("profiles")
          .select("is_admin, username")
          .eq("id", session.user.id)
          .single();
        if (isMounted) {
          if (profile?.is_admin) setIsAdmin(true);
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
  }, [fetchCourses]);

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
      // eslint-disable-next-line no-unused-vars
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

  // ─── "New" badge — courses added in last 7 days ───
  const isNewCourse = (course) => {
    if (!course.created_at) return false;
    return Date.now() - new Date(course.created_at).getTime() < 7 * 24 * 60 * 60 * 1000;
  };

  // ─── FIX: strip HTML tags for plain-text preview in modal meta row ───
  const stripHtml = (html) => {
    if (!html) return "";
    return html.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
  };

  const isAllSelected = visibleCourses.length > 0 && selectedIds.size === visibleCourses.length;
  const isPartialSelected = selectedIds.size > 0 && !isAllSelected;

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-black flex items-center justify-center">
        <Loader2 className="animate-spin text-blue-500" size={32} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black text-gray-900 dark:text-gray-100 selection:bg-blue-500/30 overflow-x-hidden relative">
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
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-[2rem] p-6 sm:p-10 shadow-xl">
            <form onSubmit={handleSubmit} className="space-y-6">

              {/* Thumbnail Upload */}
              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Course Thumbnail (Image/Video)</label>
                <div className="flex items-center gap-4">
                  <div
                    className="relative w-32 h-20 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-700 flex items-center justify-center bg-gray-50 dark:bg-gray-900 overflow-hidden cursor-pointer hover:border-blue-500 transition-colors shrink-0"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {thumbnailPreview ? (
                      thumbnailPreview.startsWith("data:video") ? (
                        <video src={thumbnailPreview} className="object-cover w-full h-full" muted loop playsInline />
                      ) : (
                        <img src={thumbnailPreview} alt="Preview" className="object-cover w-full h-full" />
                      )
                    ) : formData.thumbnail_url ? (
                      formData.thumbnail_url.match(/\.(mp4|webm|ogg)$/i) ? (
                        <video src={formData.thumbnail_url} className="object-cover w-full h-full" muted loop playsInline />
                      ) : (
                        <img src={formData.thumbnail_url} alt="Preview" className="object-cover w-full h-full" />
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

              {/* Category & Level */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Category</label>
                  <select name="category" value={formData.category} onChange={handleChange} className="w-full bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-gray-900 dark:text-gray-100 shadow-sm cursor-pointer">
                    {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Level</label>
                  <select name="level" value={formData.level} onChange={handleChange} className="w-full bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-gray-900 dark:text-gray-100 shadow-sm cursor-pointer">
                    {LEVELS.map(lvl => <option key={lvl} value={lvl}>{lvl}</option>)}
                  </select>
                </div>
              </div>

              {/* Duration, Lessons, Rating */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Duration</label>
                  <input
                    type="text" required name="duration" value={formData.duration} onChange={handleChange} placeholder="e.g. 4h 30m"
                    className="w-full bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-gray-900 dark:text-gray-100 shadow-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Lessons</label>
                  <input
                    type="number" required min="1" name="lessons" value={formData.lessons} onChange={handleChange}
                    className="w-full bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-gray-900 dark:text-gray-100 shadow-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Rating (1–5)</label>
                  <input
                    type="number" required step="0.1" min="1" max="5" name="rating" value={formData.rating} onChange={handleChange}
                    className="w-full bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-gray-900 dark:text-gray-100 shadow-sm"
                  />
                </div>
              </div>

              {/* Topics & Author */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Topics (comma-separated)</label>
                  <input
                    type="text" required name="topics" value={formData.topics} onChange={handleChange} placeholder="e.g. React, Next.js, API"
                    className="w-full bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-gray-900 dark:text-gray-100 shadow-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Author</label>
                  <input
                    type="text" required name="author" value={formData.author} onChange={handleChange} placeholder="e.g. @system"
                    className="w-full bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-gray-900 dark:text-gray-100 shadow-sm"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Course Description</label>
                <div className="bg-white dark:bg-gray-950 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden [&_.ql-toolbar]:border-none [&_.ql-toolbar]:border-b [&_.ql-toolbar]:border-gray-200 dark:[&_.ql-toolbar]:border-gray-800 [&_.ql-container]:border-none [&_.ql-editor]:min-h-[150px] [&_.ql-editor]:text-gray-900 dark:[&_.ql-editor]:text-gray-100 [&_.ql-editor]:text-sm">
                  <ReactQuill
                    theme="snow"
                    value={formData.description}
                    onChange={(value) => setFormData(prev => ({ ...prev, description: value }))}
                    placeholder="Brief summary of the course..."
                  />
                </div>
              </div>

              {/* Submit */}
              <div className="pt-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between gap-4">
                {isEditing && (
                  <button
                    type="button"
                    onClick={resetForm}
                    className="px-6 py-4 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-bold rounded-xl transition-all"
                  >
                    Cancel
                  </button>
                )}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 flex justify-center items-center gap-2 py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-blue-500/20 active:scale-95 disabled:opacity-50"
                >
                  {isLoading
                    ? <Loader2 size={18} className="animate-spin" />
                    : <><BookOpen size={18} /> {isEditing ? "Update Course" : "Publish Course"}</>
                  }
                </button>
              </div>
            </form>
          </div>
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

        {/* ─── NEW: Select-all row ─── */}
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

        {/* Course List */}
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
                  {/* ─── NEW: Checkbox (admin only) ─── */}
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

                  {/* Thumbnail */}
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
                      {/* ─── NEW: Lesson count badge ─── */}
                      <span className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1">
                        <PlayCircle size={11} /> {course.lessons} lesson{course.lessons !== 1 ? "s" : ""}
                      </span>
                    </div>

                    {/* ─── NEW: Description snippet ─── */}
                    {course.description && (
                      <p className="mt-1.5 text-xs text-gray-400 dark:text-gray-500 line-clamp-1 max-w-sm">
                        {stripHtml(course.description)}
                      </p>
                    )}
                  </div>
                </div>

                {/* Actions */}
                {isAdmin && (
                  <div className="flex items-center gap-2 shrink-0" onClick={e => e.stopPropagation()}>
                    {/* Quick preview */}
                    <button
                      onClick={() => setSelectedCourse(course)}
                      title="Preview course"
                      className="p-2 text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                      <Eye size={16} />
                    </button>
                    <button
                      onClick={() => handleDuplicate(course)}
                      disabled={isDuplicating}
                      title="Duplicate course"
                      className="p-2 text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
                    >
                      <Copy size={16} />
                    </button>
                    <button
                      onClick={() => handleEdit(course)}
                      title="Edit course"
                      className="p-2 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 rounded-xl hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(course.id)}
                      title="Delete course"
                      className="p-2 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-xl hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"
                    >
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
                  onClick={() => { setSearchQuery(""); setFilterCategory("All"); setFilterLevel("All"); setSortOrder("newest"); }}
                  className="mt-3 text-sm text-blue-600 dark:text-blue-400 font-bold hover:underline"
                >
                  Clear filters
                </button>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Course Detail Modal */}
      {selectedCourse && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-gray-900/40 dark:bg-black/60 backdrop-blur-sm" onClick={() => setSelectedCourse(null)} />
          <div className="relative w-full max-w-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-[2rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            <div className="p-6 sm:p-8 border-b border-gray-100 dark:border-gray-800 flex items-start justify-between bg-gray-50/50 dark:bg-gray-800/50 shrink-0">
              <div className="flex items-center gap-4">
                {selectedCourse.thumbnail_url ? (
                  <div className="relative w-14 h-14 rounded-2xl overflow-hidden shrink-0 shadow-sm border border-gray-200 dark:border-gray-700">
                    {selectedCourse.thumbnail_url.match(/\.(mp4|webm|ogg)$/i) ? (
                      <video src={selectedCourse.thumbnail_url} className="object-cover w-full h-full" muted loop playsInline autoPlay />
                    ) : (
                      <img src={selectedCourse.thumbnail_url} alt={selectedCourse.title} className="object-cover w-full h-full" />
                    )}
                  </div>
                ) : (
                  <div className="w-14 h-14 bg-blue-50 dark:bg-blue-900/20 rounded-2xl flex items-center justify-center text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-800/50 shrink-0 shadow-sm">
                    <BookOpen size={28} />
                  </div>
                )}
                <div>
                  <h2 className="text-2xl font-black text-gray-900 dark:text-gray-100 tracking-tight mb-1">{selectedCourse.title}</h2>
                  <p className="text-sm font-bold text-gray-500 dark:text-gray-400">
                    Instructed by <span className="text-blue-600 dark:text-blue-400">{selectedCourse.author}</span>
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {/* ─── NEW: Edit shortcut inside modal ─── */}
                {isAdmin && (
                  <button
                    onClick={() => handleEdit(selectedCourse)}
                    title="Edit this course"
                    className="p-2 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/40 rounded-full transition-colors border border-blue-100 dark:border-blue-800/50"
                  >
                    <Pencil size={16} />
                  </button>
                )}
                <button
                  onClick={() => setSelectedCourse(null)}
                  className="p-2 text-gray-400 dark:text-gray-500 hover:text-gray-900 dark:hover:text-gray-100 bg-white dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors border border-gray-200 dark:border-gray-700 shadow-sm"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="p-6 sm:p-8 overflow-y-auto">
              <div className="flex flex-wrap items-center gap-3 mb-6">
                <span className="flex items-center gap-1.5 text-sm font-bold text-amber-600 dark:text-amber-500 bg-amber-50 dark:bg-amber-900/20 px-3 py-1.5 rounded-lg border border-amber-200 dark:border-amber-800/50">
                  <Star size={16} /> {selectedCourse.rating} Rating
                </span>
                <span className="flex items-center gap-1.5 text-sm font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-3 py-1.5 rounded-lg border border-blue-200 dark:border-blue-800/50">
                  <PlayCircle size={16} /> {selectedCourse.lessons} Interactive Lessons
                </span>
                <span className={`text-xs font-bold px-3 py-1.5 rounded-lg border ${LEVEL_COLORS[selectedCourse.level] || ""}`}>
                  {selectedCourse.level}
                </span>
                <span className="text-xs font-bold text-gray-500 dark:text-gray-400 ml-auto bg-gray-50 dark:bg-gray-800 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 hidden sm:flex items-center gap-1.5">
                  <Clock size={12} /> {selectedCourse.duration}
                </span>
              </div>

              {/* Topics */}
              {selectedCourse.topics?.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-6">
                  {selectedCourse.topics.map(topic => (
                    <span key={topic} className="text-xs font-bold px-2.5 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700">
                      {topic}
                    </span>
                  ))}
                </div>
              )}

              <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">Course Overview</h3>
              {/* FIX: always read `description`; fall back to `desc` for legacy rows */}
              <div
                className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4 [&_p]:mb-4 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-4 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:mb-4 [&_strong]:font-bold [&_h1]:text-xl [&_h1]:font-black [&_h2]:text-lg [&_h2]:font-bold"
                dangerouslySetInnerHTML={{ __html: selectedCourse.description || selectedCourse.desc || "<p>No description provided.</p>" }}
              />

              <div className="flex flex-col sm:flex-row gap-4 pt-6 mt-4 border-t border-gray-100 dark:border-gray-800">
                <Link
                  href={`/LearnPage/${selectedCourse.id}`}
                  className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2 active:scale-95"
                >
                  <Code2 size={18} /> Start Reading Code
                </Link>
                {isAdmin && (
                  <button
                    onClick={() => handleDelete(selectedCourse.id)}
                    className="flex items-center justify-center gap-2 px-5 py-3.5 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 font-bold rounded-xl hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"
                  >
                    <Trash2 size={16} /> Delete
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

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