"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { X, Plus, Camera, Type, Loader2, ChevronLeft, ChevronRight, Trash2, Sparkles, Video } from "lucide-react";
import { supabase } from "../../supabaseClient";

// ── Constants ─────────────────────────────────────────────────────────────────

const STORY_DURATION = 5000;  // ms per photo/text slide
const VIDEO_DURATION  = 30000; // ms max for video slide (onEnded fires first)

const BG_COLORS = [
  "#7c3aed", "#db2777", "#ea580c", "#16a34a",
  "#0284c7", "#dc2626", "#0891b2", "#be185d",
  "#ca8a04", "#4f46e5",
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function timeAgo(dateStr) {
  const diff = (Date.now() - new Date(dateStr)) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function getViewedIds() {
  try { return new Set(JSON.parse(localStorage.getItem("story_viewed") || "[]")); }
  catch { return new Set(); }
}

function markViewed(id) {
  try {
    const s = getViewedIds();
    s.add(id);
    localStorage.setItem("story_viewed", JSON.stringify([...s]));
  } catch {}
}

function groupStoriesByUser(data, currentUserId) {
  const map = {};
  (data || []).forEach(s => {
    if (!map[s.user_id]) map[s.user_id] = { user: s.profiles, stories: [] };
    map[s.user_id].stories.push(s);
  });
  const all = Object.values(map);
  // own stories first
  all.sort((a, b) => (a.user?.id === currentUserId ? -1 : b.user?.id === currentUserId ? 1 : 0));
  return all;
}

// ── StoryRing ─────────────────────────────────────────────────────────────────
// Wraps any child in a gradient ring when the user has active stories.

export function StoryRing({ hasStory, viewed = false, onClick, children }) {
  if (!hasStory) return <>{children}</>;
  return (
    <div
      onClick={onClick}
      role={onClick ? "button" : undefined}
      className={`rounded-full shrink-0 ${onClick ? "cursor-pointer" : ""} ${
        viewed
          ? "p-[2px] bg-gray-300 dark:bg-gray-600"
          : "p-[2.5px] bg-gradient-to-tr from-violet-500 via-pink-500 to-amber-400"
      }`}
    >
      <div className="rounded-full bg-white dark:bg-gray-900 p-[2px]">
        {children}
      </div>
    </div>
  );
}

// ── useUserStories ─────────────────────────────────────────────────────────────
// Hook: check whether a given user has any active stories.

export function useUserStories(userId) {
  const [hasStory, setHasStory] = useState(false);
  const [stories, setStories] = useState([]);

  useEffect(() => {
    if (!userId) return;
    supabase
      .from("stories")
      .select("id, type, media_url, caption, bg_color, created_at, expires_at, user_id")
      .eq("user_id", userId)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: true })
      .then(({ data }) => {
        setStories(data || []);
        setHasStory((data?.length ?? 0) > 0);
      });
  }, [userId]);

  return { hasStory, stories };
}

// ── StoryViewer ───────────────────────────────────────────────────────────────

export function StoryViewer({ groups, startGroupIdx, currentUserId, onClose, onDelete }) {
  const [groupIdx, setGroupIdx]   = useState(startGroupIdx);
  const [storyIdx, setStoryIdx]   = useState(0);
  const [progress, setProgress]   = useState(0);
  const rafRef                    = useRef(null);
  const startRef                  = useRef(null);

  const group = groups[groupIdx];
  const story = group?.stories[storyIdx];

  const goToNext = useCallback(() => {
    if (!group) return;
    if (storyIdx < group.stories.length - 1) {
      setStoryIdx(i => i + 1);
    } else if (groupIdx < groups.length - 1) {
      setGroupIdx(g => g + 1);
      setStoryIdx(0);
    } else {
      onClose();
    }
    setProgress(0);
  }, [group, storyIdx, groupIdx, groups.length, onClose]);

  const goToPrev = useCallback(() => {
    if (storyIdx > 0) {
      setStoryIdx(i => i - 1);
    } else if (groupIdx > 0) {
      setGroupIdx(g => g - 1);
      setStoryIdx(0);
    }
    setProgress(0);
  }, [storyIdx, groupIdx]);

  // Auto-advance
  useEffect(() => {
    if (!story) return;
    markViewed(story.id);
    setProgress(0);
    cancelAnimationFrame(rafRef.current);
    startRef.current = performance.now();
    const duration = story.type === "video" ? VIDEO_DURATION : STORY_DURATION;

    const tick = (now) => {
      const elapsed = now - startRef.current;
      const pct = Math.min((elapsed / duration) * 100, 100);
      setProgress(pct);
      if (pct < 100) rafRef.current = requestAnimationFrame(tick);
      else goToNext();
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [story?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Escape key
  useEffect(() => {
    const fn = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [onClose]);

  if (!group || !story) return null;

  const isOwn = story.user_id === currentUserId;

  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center bg-black/90">
      {/* Backdrop click to close */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Prev group arrow */}
      {groupIdx > 0 && (
        <button
          onClick={(e) => { e.stopPropagation(); setGroupIdx(g => g - 1); setStoryIdx(0); setProgress(0); }}
          className="absolute left-4 top-1/2 -translate-y-1/2 z-20 p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white hidden sm:flex"
        >
          <ChevronLeft size={22} />
        </button>
      )}

      {/* Story card */}
      <div
        className="relative w-full sm:w-[360px] h-full sm:h-[640px] sm:rounded-2xl overflow-hidden shadow-2xl"
        style={{ background: story.type === "text" ? (story.bg_color || "#7c3aed") : "#000" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Media */}
        {story.type === "image" && story.media_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={story.media_url}
            alt="story"
            className="absolute inset-0 w-full h-full object-cover"
          />
        )}
        {story.type === "video" && story.media_url && (
          <video
            key={story.id}
            src={story.media_url}
            className="absolute inset-0 w-full h-full object-cover"
            autoPlay
            playsInline
            onEnded={goToNext}
          />
        )}
        {story.type === "text" && (
          <div className="absolute inset-0 flex items-center justify-center px-8">
            <p className="text-white text-2xl font-black text-center leading-snug drop-shadow-lg">
              {story.caption}
            </p>
          </div>
        )}

        {/* Top gradient */}
        <div className="absolute inset-x-0 top-0 h-36 bg-gradient-to-b from-black/60 to-transparent z-10 pointer-events-none" />
        {/* Bottom gradient */}
        <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-black/60 to-transparent z-10 pointer-events-none" />

        {/* Progress bars */}
        <div className="absolute top-3 inset-x-3 flex gap-1 z-20">
          {group.stories.map((s, i) => (
            <div key={s.id} className="flex-1 h-[3px] bg-white/30 rounded-full overflow-hidden">
              <div
                className="h-full bg-white rounded-full"
                style={{
                  width: i < storyIdx ? "100%" : i === storyIdx ? `${progress}%` : "0%",
                  transition: i === storyIdx ? "none" : undefined,
                }}
              />
            </div>
          ))}
        </div>

        {/* Header: avatar + name + close */}
        <div className="absolute top-8 inset-x-3 flex items-center justify-between z-20">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full overflow-hidden border-2 border-white/60 bg-gray-600 shrink-0">
              {group.user?.avatar_url
                ? <img src={group.user.avatar_url} alt="" className="w-full h-full object-cover" />
                : <div className="w-full h-full bg-violet-500 flex items-center justify-center text-white text-sm font-black">
                    {group.user?.username?.[0]?.toUpperCase()}
                  </div>
              }
            </div>
            <div>
              <p className="text-white text-sm font-black leading-none drop-shadow">@{group.user?.username}</p>
              <p className="text-white/60 text-[11px] mt-0.5">{timeAgo(story.created_at)}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            {isOwn && (
              <button
                onClick={() => { onDelete(story.id); goToNext(); }}
                className="p-1.5 rounded-full bg-black/30 hover:bg-black/50 text-white/80 hover:text-red-400 transition-colors"
              >
                <Trash2 size={15} />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-full bg-black/30 hover:bg-black/50 text-white transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Caption for image stories */}
        {story.type === "image" && story.caption && (
          <div className="absolute bottom-5 inset-x-4 z-20">
            <p className="text-white text-sm font-medium text-center drop-shadow-lg">{story.caption}</p>
          </div>
        )}

        {/* Tap zones: left = back, right = forward */}
        <div className="absolute inset-0 flex z-[15]">
          <div className="flex-1 h-full" onPointerDown={goToPrev} />
          <div className="flex-1 h-full" onPointerDown={goToNext} />
        </div>
      </div>

      {/* Next group arrow */}
      {groupIdx < groups.length - 1 && (
        <button
          onClick={(e) => { e.stopPropagation(); setGroupIdx(g => g + 1); setStoryIdx(0); setProgress(0); }}
          className="absolute right-4 top-1/2 -translate-y-1/2 z-20 p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white hidden sm:flex"
        >
          <ChevronRight size={22} />
        </button>
      )}
    </div>
  );
}

// ── StoryCreator ──────────────────────────────────────────────────────────────

export function StoryCreator({ currentUserId, onClose, onCreated }) {
  const [mode, setMode]           = useState("pick"); // "pick" | "image" | "text"
  const [file, setFile]           = useState(null);
  const [preview, setPreview]     = useState(null);
  const [caption, setCaption]     = useState("");
  const [bgColor, setBgColor]     = useState(BG_COLORS[0]);
  const [textContent, setTextContent] = useState("");
  const [uploading, setUploading]     = useState(false);
  const [videoFile, setVideoFile]     = useState(null);
  const [videoPreview, setVideoPreview] = useState(null);
  const fileRef                       = useRef(null);
  const videoRef                      = useRef(null);

  const handleFileChange = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setMode("image");
  };

  const handleVideoChange = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 50 * 1024 * 1024) {
      alert("Video must be under 50 MB");
      return;
    }
    setVideoFile(f);
    setVideoPreview(URL.createObjectURL(f));
    setMode("video");
  };

  const handleShare = async () => {
    setUploading(true);
    try {
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

      if (mode === "image" && file) {
        const ext = file.name.split(".").pop() || "jpg";
        const path = `${currentUserId}/${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage.from("stories").upload(path, file);
        if (upErr) throw upErr;
        const { data: { publicUrl } } = supabase.storage.from("stories").getPublicUrl(path);
        const { error: dbErr } = await supabase.from("stories").insert({
          user_id: currentUserId, type: "image",
          media_url: publicUrl, caption: caption.trim() || null, expires_at: expiresAt,
        });
        if (dbErr) throw dbErr;
      } else if (mode === "video" && videoFile) {
        const ext = videoFile.name.split(".").pop() || "mp4";
        const path = `${currentUserId}/${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("stories")
          .upload(path, videoFile, { contentType: videoFile.type });
        if (upErr) throw upErr;
        const { data: { publicUrl } } = supabase.storage.from("stories").getPublicUrl(path);
        const { error: dbErr } = await supabase.from("stories").insert({
          user_id: currentUserId, type: "video",
          media_url: publicUrl, caption: caption.trim() || null, expires_at: expiresAt,
        });
        if (dbErr) throw dbErr;
      } else if (mode === "text") {
        if (!textContent.trim()) return;
        const { error: dbErr } = await supabase.from("stories").insert({
          user_id: currentUserId, type: "text",
          caption: textContent.trim(), bg_color: bgColor, expires_at: expiresAt,
        });
        if (dbErr) throw dbErr;
      }

      onCreated?.();
      onClose();
    } catch (err) {
      console.error("Story upload error:", err);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[500] flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full sm:max-w-sm bg-white dark:bg-gray-900 sm:rounded-2xl overflow-hidden shadow-2xl animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-2">
            {mode !== "pick" && (
              <button
                onClick={() => { setMode("pick"); setPreview(null); setFile(null); setCaption(""); setTextContent(""); setVideoFile(null); setVideoPreview(null); }}
                className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 transition-colors"
              >
                <ChevronLeft size={17} />
              </button>
            )}
            <h3 className="text-sm font-black text-gray-900 dark:text-white">
              {mode === "pick" ? "Create Story" : mode === "image" ? "Photo Story" : mode === "video" ? "Video Story" : "Text Story"}
            </h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500">
            <X size={17} />
          </button>
        </div>

        {/* Pick mode */}
        {mode === "pick" && (
          <div className="p-5 grid grid-cols-3 gap-3">
            <button
              onClick={() => fileRef.current?.click()}
              className="flex flex-col items-center gap-3 p-5 rounded-2xl border-2 border-dashed border-violet-200 dark:border-violet-500/30 bg-violet-50 dark:bg-violet-500/5 text-violet-600 dark:text-violet-400 hover:border-violet-400 transition-all"
            >
              <Camera size={24} />
              <span className="text-xs font-bold">Photo</span>
            </button>
            <button
              onClick={() => videoRef.current?.click()}
              className="flex flex-col items-center gap-3 p-5 rounded-2xl border-2 border-dashed border-blue-200 dark:border-blue-500/30 bg-blue-50 dark:bg-blue-500/5 text-blue-600 dark:text-blue-400 hover:border-blue-400 transition-all"
            >
              <Video size={24} />
              <span className="text-xs font-bold">Video</span>
            </button>
            <button
              onClick={() => setMode("text")}
              className="flex flex-col items-center gap-3 p-5 rounded-2xl border-2 border-dashed border-pink-200 dark:border-pink-500/30 bg-pink-50 dark:bg-pink-500/5 text-pink-600 dark:text-pink-400 hover:border-pink-400 transition-all"
            >
              <Type size={24} />
              <span className="text-xs font-bold">Text</span>
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
            <input ref={videoRef} type="file" accept="video/*" className="hidden" onChange={handleVideoChange} />
          </div>
        )}

        {/* Image preview mode */}
        {mode === "image" && preview && (
          <div className="p-5 space-y-4">
            <div className="relative w-full rounded-xl overflow-hidden bg-black" style={{ aspectRatio: "9/14" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={preview} alt="preview" className="w-full h-full object-cover" />
            </div>
            <input
              type="text"
              value={caption}
              onChange={e => setCaption(e.target.value)}
              placeholder="Add a caption… (optional)"
              maxLength={120}
              className="w-full px-3 py-2.5 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500/30"
            />
            <button
              onClick={handleShare}
              disabled={uploading}
              className="w-full flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white font-black py-3 rounded-xl text-sm transition-all"
            >
              {uploading ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
              {uploading ? "Sharing…" : "Share to Story"}
            </button>
          </div>
        )}

        {/* Video preview mode */}
        {mode === "video" && videoPreview && (
          <div className="p-5 space-y-4">
            <div className="relative w-full rounded-xl overflow-hidden bg-black" style={{ aspectRatio: "9/16" }}>
              <video
                src={videoPreview}
                className="w-full h-full object-cover"
                controls
                playsInline
              />
            </div>
            <input
              type="text"
              value={caption}
              onChange={e => setCaption(e.target.value)}
              placeholder="Add a caption… (optional)"
              maxLength={120}
              className="w-full px-3 py-2.5 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            />
            <p className="text-[11px] text-gray-400 text-center">Max 50 MB · visible for 24 hours</p>
            <button
              onClick={handleShare}
              disabled={uploading}
              className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-black py-3 rounded-xl text-sm transition-all"
            >
              {uploading ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
              {uploading ? "Uploading…" : "Share to Story"}
            </button>
          </div>
        )}

        {/* Text mode */}
        {mode === "text" && (
          <div className="p-5 space-y-4">
            {/* Live preview */}
            <div
              className="relative w-full rounded-xl overflow-hidden flex items-center justify-center px-6 py-8 min-h-[200px]"
              style={{ backgroundColor: bgColor }}
            >
              <p className="text-white text-xl font-black text-center leading-snug break-words">
                {textContent || <span className="opacity-40 text-base font-medium">Your story text…</span>}
              </p>
            </div>
            <textarea
              value={textContent}
              onChange={e => setTextContent(e.target.value)}
              placeholder="Type something…"
              maxLength={200}
              rows={3}
              className="w-full px-3 py-2.5 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-violet-500/30"
            />
            {/* Color swatches */}
            <div className="flex gap-2 flex-wrap">
              {BG_COLORS.map(c => (
                <button
                  key={c}
                  onClick={() => setBgColor(c)}
                  className={`w-7 h-7 rounded-full transition-all ${bgColor === c ? "ring-2 ring-offset-2 dark:ring-offset-gray-900 ring-gray-900 dark:ring-white scale-110" : "hover:scale-105"}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
            <button
              onClick={handleShare}
              disabled={uploading || !textContent.trim()}
              className="w-full flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white font-black py-3 rounded-xl text-sm transition-all"
            >
              {uploading ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
              {uploading ? "Sharing…" : "Share to Story"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── StoriesBar ────────────────────────────────────────────────────────────────

export default function StoriesBar({ currentUserId }) {
  console.log("StoriesBar rendering with currentUserId:", currentUserId);
  const [groups, setGroups]         = useState([]);
  const [myProfile, setMyProfile]   = useState(null);
  const [loading, setLoading]       = useState(true);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerIdx, setViewerIdx]   = useState(0);
  const [creatorOpen, setCreatorOpen] = useState(false);
  const [viewedIds, setViewedIds]   = useState(() => getViewedIds());

  const fetchStories = useCallback(async () => {
    const { data } = await supabase
      .from("stories")
      .select("*, profiles:user_id(id, username, avatar_url)")
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: true });
    setGroups(groupStoriesByUser(data, currentUserId));
    setLoading(false);
  }, [currentUserId]);

  // Fetch current user profile (for "My Story" avatar when no story exists)
  useEffect(() => {
    if (!currentUserId) return;
    supabase.from("profiles").select("id, username, avatar_url").eq("id", currentUserId).single()
      .then(({ data }) => { if (data) setMyProfile(data); });
  }, [currentUserId]);

  useEffect(() => {
    fetchStories();
    const ch = supabase
      .channel("stories-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "stories" }, fetchStories)
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, [fetchStories]);

  const myGroup    = groups.find(g => g.user?.id === currentUserId);
  const otherGroups = groups.filter(g => g.user?.id !== currentUserId);
  const displayGroups = myGroup ? [myGroup, ...otherGroups] : otherGroups;

  const openGroup = (group) => {
    const idx = displayGroups.findIndex(g => g.user?.id === group.user?.id);
    setViewerIdx(Math.max(0, idx));
    setViewerOpen(true);
  };

  const handleDelete = async (storyId) => {
    await supabase.from("stories").delete().eq("id", storyId);
    fetchStories();
  };

  const handleViewerClose = () => {
    setViewerOpen(false);
    setViewedIds(getViewedIds());
  };

  const myAvatar = myProfile?.avatar_url || myGroup?.user?.avatar_url;
  const myUsername = myProfile?.username || myGroup?.user?.username;

  // Don't render bar if no stories and still loading
  if (loading && groups.length === 0) return (
    <div className="flex gap-4 px-1 py-3 overflow-hidden">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex flex-col items-center gap-1.5 shrink-0">
          <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 animate-pulse" />
          <div className="w-10 h-2 rounded-full bg-gray-100 dark:bg-gray-800 animate-pulse" />
        </div>
      ))}
    </div>
  );

  return (
    <>
      <div className="w-full overflow-x-auto no-scrollbar border-b border-gray-100 dark:border-gray-800/60 pb-1">
        <div className="flex gap-3 px-1 py-3 min-w-max">

          {/* ── My Story ── */}
          <div className="flex flex-col items-center gap-1.5 shrink-0">
            <div className="relative">
              <StoryRing
                hasStory={!!myGroup}
                viewed={myGroup?.stories.every(s => viewedIds.has(s.id))}
                onClick={myGroup ? () => openGroup(myGroup) : undefined}
              >
                <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                  {myAvatar
                    ? <img src={myAvatar} alt={myUsername} className="w-full h-full object-cover" />
                    : <div className="w-full h-full bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center text-white font-black text-xl">
                        {myUsername?.[0]?.toUpperCase() || "?"}
                      </div>
                  }
                </div>
              </StoryRing>

              {/* + add button */}
              <button
                onClick={() => setCreatorOpen(true)}
                className="absolute -bottom-1 -right-1 w-8 h-8 bg-violet-600 hover:bg-violet-500 text-white rounded-full flex items-center justify-center shadow-lg border-3 border-white dark:border-gray-900 transition-all hover:scale-110 z-10"
                title="Add Story"
              >
                <Plus size={16} strokeWidth={3} />
              </button>
            </div>
            <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 truncate max-w-[68px] text-center">
              {myGroup ? "My Story" : "Add Story"}
            </span>
          </div>

          {/* ── Others ── */}
          {otherGroups.map((g) => {
            const allViewed = g.stories.every(s => viewedIds.has(s.id));
            return (
              <div key={g.user?.id} className="flex flex-col items-center gap-1.5 shrink-0">
                <StoryRing hasStory viewed={allViewed} onClick={() => openGroup(g)}>
                  <div className="w-16 h-16 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700">
                    {g.user?.avatar_url
                      ? <img src={g.user.avatar_url} alt={g.user.username} className="w-full h-full object-cover" />
                      : <div className="w-full h-full bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center text-white font-black text-xl">
                          {g.user?.username?.[0]?.toUpperCase()}
                        </div>
                    }
                  </div>
                </StoryRing>
                <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 truncate max-w-[68px] text-center">
                  {g.user?.username}
                </span>
              </div>
            );
          })}

        </div>
      </div>

      {/* Story Viewer */}
      {viewerOpen && displayGroups.length > 0 && (
        <StoryViewer
          groups={displayGroups}
          startGroupIdx={viewerIdx}
          currentUserId={currentUserId}
          onClose={handleViewerClose}
          onDelete={handleDelete}
        />
      )}

      {/* Story Creator */}
      {creatorOpen && (
        <StoryCreator
          currentUserId={currentUserId}
          onClose={() => setCreatorOpen(false)}
          onCreated={fetchStories}
        />
      )}
    </>
  );
}
