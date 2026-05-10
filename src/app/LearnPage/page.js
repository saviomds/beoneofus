"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Terminal, ArrowLeft, Loader2, CheckCircle2, AlertTriangle, LayoutDashboard,
  X, Search, Star, Layers, BarChart2, Download, Trash, RefreshCw
} from "lucide-react";
import { supabase } from "../supabaseClient";
import CourseForm from "../Academy/CourseForm";
import CourseList from "../Academy/CourseList";
import CourseDetailModal from "../Academy/CourseDetailModal";
import { CATEGORIES, LEVELS, LEVEL_COLORS } from "../Academy/constants";


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
  const router = useRouter();
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [userId, setUserId] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
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

  const [userProgress, setUserProgress] = useState({});
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

  const fetchProgress = useCallback(async (uid) => {
    try {
      const { data, error } = await supabase
        .from("user_course_progress")
        .select("*")
        .eq("user_id", uid);
      
      if (data && !error) {
        const progressMap = {};
        data.forEach(p => {
          progressMap[p.course_id] = p;
        });
        setUserProgress(progressMap);
      }
    } catch (err) {
      console.error("Failed to fetch progress", err);
    }
  }, []);

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
        fetchProgress(session.user.id);
        const { data: profile } = await supabase
          .from("profiles")
          .select("is_admin, is_premium, username")
          .eq("id", session.user.id)
          .single();
        if (isMounted) {
          if (profile?.is_admin) setIsAdmin(true);
          if (profile?.is_premium || profile?.is_admin) setIsPremium(true);
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
  }, [fetchCourses, fetchProgress]);

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

  const clearFilters = () => {
    setSearchQuery(""); setFilterCategory("All"); setFilterLevel("All"); setSortOrder("newest");
  }

  const isAllSelected = visibleCourses.length > 0 && selectedIds.size === visibleCourses.length;
  const isPartialSelected = selectedIds.size > 0 && !isAllSelected;

  const handleCourseSelect = (course) => {
    if (!userId) {
      router.push("/auth");
      return;
    }
    setSelectedCourse(course);
  };

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
          <CourseForm
            formData={formData}
            setFormData={setFormData}
            isEditing={isEditing}
            isLoading={isLoading}
            thumbnailPreview={thumbnailPreview}
            thumbnailFile={thumbnailFile}
            setThumbnailFile={setThumbnailFile}
            setThumbnailPreview={setThumbnailPreview}
            fileInputRef={fileInputRef}
            handleSubmit={handleSubmit}
            handleChange={handleChange}
            handleFileChange={handleFileChange}
            resetForm={resetForm}
          />
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

        {/* Course List */}
        <CourseList
          courses={courses}
          visibleCourses={visibleCourses}
          isAdmin={isAdmin}
          selectedIds={selectedIds}
          toggleSelect={toggleSelect}
          toggleSelectAll={toggleSelectAll}
          isAllSelected={isAllSelected}
          isPartialSelected={isPartialSelected}
          setSelectedCourse={handleCourseSelect}
          handleEdit={handleEdit}
          handleDuplicate={handleDuplicate}
          handleDelete={handleDelete}
          isDuplicating={isDuplicating}
          onClearFilters={clearFilters}
          userProgress={userProgress}
          isPremium={isPremium}
        />
      </main>

      {/* Course Detail Modal */}
      <CourseDetailModal
        course={selectedCourse}
        onClose={() => setSelectedCourse(null)}
        isAdmin={isAdmin}
        isPremium={isPremium}
        handleEdit={handleEdit}
        handleDelete={handleDelete}
        userId={userId}
        userProgress={userProgress}
      />

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