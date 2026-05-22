"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  X, Plus, Camera, Type, Loader2, ChevronLeft, ChevronRight, Trash2,
  Sparkles, Settings, Globe, Palette, Clock
} from "lucide-react";
import { supabase } from "../../supabaseClient";

// ── Constants ─────────────────────────────────────────────────────────────────

const STORY_DURATION = 5000;
const VIDEO_DURATION = 60000;

// Background presets: gradients + solids
const BG_PRESETS = [
  { id: 'g1',  value: 'linear-gradient(135deg, #7c3aed 0%, #ec4899 100%)' },
  { id: 'g2',  value: 'linear-gradient(135deg, #f97316 0%, #ec4899 100%)' },
  { id: 'g3',  value: 'linear-gradient(135deg, #0ea5e9 0%, #7c3aed 100%)' },
  { id: 'g4',  value: 'linear-gradient(135deg, #16a34a 0%, #0891b2 100%)' },
  { id: 'g5',  value: 'linear-gradient(135deg, #dc2626 0%, #f97316 100%)' },
  { id: 'g6',  value: 'linear-gradient(135deg, #ca8a04 0%, #b45309 100%)' },
  { id: 'g7',  value: 'linear-gradient(135deg, #4f46e5 0%, #0ea5e9 100%)' },
  { id: 'g8',  value: 'linear-gradient(135deg, #be185d 0%, #7c3aed 100%)' },
  { id: 'g9',  value: 'linear-gradient(180deg, #1a1a2e 0%, #0f3460 100%)'  },
  { id: 'g10', value: 'linear-gradient(135deg, #134e4a 0%, #16a34a 100%)' },
  { id: 's1',  value: '#7c3aed' },
  { id: 's2',  value: '#db2777' },
  { id: 's3',  value: '#ea580c' },
  { id: 's4',  value: '#16a34a' },
  { id: 's5',  value: '#0284c7' },
  { id: 's6',  value: '#dc2626' },
  { id: 's7',  value: '#0891b2' },
  { id: 's8',  value: '#1e293b' },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function applyBg(value) {
  return { background: value || '#7c3aed' };
}

function timeAgo(dateStr) {
  const diff = (Date.now() - new Date(dateStr)) / 1000;
  if (diff < 60)    return "just now";
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
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
  all.sort((a, b) => (a.user?.id === currentUserId ? -1 : b.user?.id === currentUserId ? 1 : 0));
  return all;
}

// ── StoryCardBg — thumbnail background for the bar cards ─────────────────────

function StoryCardBg({ story }) {
  if (!story) return (
    <div className="absolute inset-0 bg-gradient-to-b from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-800" />
  );
  if (story.type === "text") return (
    <>
      <div className="absolute inset-0" style={applyBg(story.bg_color)} />
      <div className="absolute inset-0 flex items-center justify-center p-3">
        <p className="text-white text-[11px] font-bold text-center line-clamp-4 leading-snug drop-shadow">
          {story.caption}
        </p>
      </div>
    </>
  );
  if (story.type === "image" && story.media_url) return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={story.media_url} alt="" className="absolute inset-0 w-full h-full object-cover" />
  );
  return <div className="absolute inset-0 bg-gradient-to-b from-gray-700 to-gray-900" />;
}

// ── StoryRing — kept as-is for use in other components ───────────────────────

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

// ── useUserStories ────────────────────────────────────────────────────────────

export function useUserStories(userId) {
  const [hasStory, setHasStory] = useState(false);
  const [stories,  setStories]  = useState([]);

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

// ── StorySettingsPanel ────────────────────────────────────────────────────────

function StorySettingsPanel({ story, isOwn, onDelete, onClose }) {
  const expiresAt = new Date(story.expires_at);
  const now = Date.now();
  const msLeft = Math.max(0, expiresAt - now);
  const hoursLeft = Math.floor(msLeft / 3600000);
  const minsLeft  = Math.floor((msLeft % 3600000) / 60000);

  return (
    <div className="absolute inset-x-3 bottom-8 z-[60] animate-in slide-in-from-bottom-3 duration-200">
      <div className="bg-black/50 backdrop-blur-2xl rounded-2xl border border-white/15 overflow-hidden shadow-2xl">
        <div className="p-4 space-y-1">
          <p className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-3 px-1">Story Info</p>

          <div className="flex items-center gap-3 p-2.5 rounded-xl">
            <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
              <Clock size={14} className="text-white/70" />
            </div>
            <div>
              <p className="text-xs font-bold text-white leading-tight">Expires in</p>
              <p className="text-[10px] text-white/50">
                {hoursLeft > 0 ? `${hoursLeft}h ${minsLeft}m remaining` : `${minsLeft}m remaining`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-2.5 rounded-xl">
            <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
              <Globe size={14} className="text-white/70" />
            </div>
            <div>
              <p className="text-xs font-bold text-white leading-tight">Visibility</p>
              <p className="text-[10px] text-white/50">Everyone on the network</p>
            </div>
          </div>

          {isOwn && (
            <>
              <div className="h-px bg-white/10 my-1" />
              <button
                onClick={onDelete}
                className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-red-500/15 transition-colors group"
              >
                <div className="w-8 h-8 rounded-xl bg-red-500/20 group-hover:bg-red-500/30 flex items-center justify-center shrink-0">
                  <Trash2 size={14} className="text-red-400" />
                </div>
                <div className="text-left">
                  <p className="text-xs font-bold text-red-400 leading-tight">Delete Story</p>
                  <p className="text-[10px] text-red-400/60">Removes immediately</p>
                </div>
              </button>
            </>
          )}
        </div>
        <div className="border-t border-white/10 px-4 py-3">
          <button onClick={onClose} className="w-full text-center text-xs font-bold text-white/40 hover:text-white/70 transition-colors">
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}

// ── StoryViewer ───────────────────────────────────────────────────────────────

export function StoryViewer({ groups, startGroupIdx, currentUserId, onClose, onDelete }) {
  const [groupIdx,      setGroupIdx]      = useState(startGroupIdx);
  const [storyIdx,      setStoryIdx]      = useState(0);
  const [progress,      setProgress]      = useState(0);
  const [showSettings,  setShowSettings]  = useState(false);
  const rafRef   = useRef(null);
  const startRef = useRef(null);

  const group = groups[groupIdx];
  const story = group?.stories[storyIdx];

  const goToNext = useCallback(() => {
    if (!group) return;
    setShowSettings(false);
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
    setShowSettings(false);
    if (storyIdx > 0) {
      setStoryIdx(i => i - 1);
    } else if (groupIdx > 0) {
      setGroupIdx(g => g - 1);
      setStoryIdx(0);
    }
    setProgress(0);
  }, [storyIdx, groupIdx]);

  useEffect(() => {
    if (!story) return;
    markViewed(story.id);
    setProgress(0);
    cancelAnimationFrame(rafRef.current);
    startRef.current = performance.now();
    const duration = story.type === "video" ? VIDEO_DURATION : STORY_DURATION;

    const tick = (now) => {
      const pct = Math.min(((now - startRef.current) / duration) * 100, 100);
      setProgress(pct);
      if (pct < 100) rafRef.current = requestAnimationFrame(tick);
      else goToNext();
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [story?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const fn = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [onClose]);

  if (!group || !story) return null;
  const isOwn = story.user_id === currentUserId;

  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center bg-black/95">
      {/* Backdrop */}
      <div className="absolute inset-0" onClick={() => { if (showSettings) { setShowSettings(false); return; } onClose(); }} />

      {/* Prev group */}
      {groupIdx > 0 && (
        <button
          onClick={e => { e.stopPropagation(); setGroupIdx(g => g - 1); setStoryIdx(0); setProgress(0); setShowSettings(false); }}
          className="absolute left-4 top-1/2 -translate-y-1/2 z-20 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white hidden sm:flex transition-colors"
        >
          <ChevronLeft size={22} />
        </button>
      )}

      {/* Story card */}
      <div
        className="relative w-full sm:w-[400px] h-full sm:h-[700px] sm:rounded-[2rem] overflow-hidden shadow-2xl flex-shrink-0"
        onClick={e => e.stopPropagation()}
      >
        {/* Background layer */}
        {story.type === "text" && (
          <div className="absolute inset-0 z-0" style={applyBg(story.bg_color)} />
        )}
        {story.type === "image" && story.media_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={story.media_url} alt="story" className="absolute inset-0 w-full h-full object-cover z-0" />
        )}
        {/* Dark bg fallback for image stories without media */}
        {story.type === "image" && !story.media_url && (
          <div className="absolute inset-0 bg-gray-950 z-0" />
        )}

        {/* Text story content */}
        {story.type === "text" && (
          <div className="absolute inset-0 flex items-center justify-center px-8 z-[5]">
            <p className="text-white text-3xl font-black text-center leading-snug drop-shadow-xl">
              {story.caption}
            </p>
          </div>
        )}

        {/* Top + bottom gradients */}
        <div className="absolute inset-x-0 top-0 h-44 bg-gradient-to-b from-black/65 to-transparent z-10 pointer-events-none" />
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black/75 to-transparent z-10 pointer-events-none" />

        {/* Progress bars */}
        <div className="absolute top-3.5 inset-x-3.5 flex gap-1 z-20">
          {group.stories.map((s, i) => (
            <div key={s.id} className="flex-1 h-[3px] bg-white/25 rounded-full overflow-hidden">
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

        {/* Header: avatar + name + actions */}
        <div className="absolute top-9 inset-x-3.5 flex items-center justify-between z-20">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-white/60 bg-gray-700 shrink-0 shadow-md">
              {group.user?.avatar_url
                ? <img src={group.user.avatar_url} alt="" className="w-full h-full object-cover" />
                : <div className="w-full h-full bg-violet-600 flex items-center justify-center text-white text-sm font-black">
                    {group.user?.username?.[0]?.toUpperCase()}
                  </div>
              }
            </div>
            <div>
              <p className="text-white text-sm font-black leading-none drop-shadow">@{group.user?.username}</p>
              <p className="text-white/50 text-[11px] mt-0.5">{timeAgo(story.created_at)}</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowSettings(v => !v)}
              className={`p-2 rounded-full transition-all ${showSettings ? 'bg-white/20 text-white' : 'bg-black/25 hover:bg-black/40 text-white/80 hover:text-white'}`}
              title="Story settings"
            >
              <Settings size={16} />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-full bg-black/25 hover:bg-black/40 text-white/80 hover:text-white transition-all"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Image caption */}
        {story.type === "image" && story.caption && (
          <div className="absolute bottom-8 inset-x-4 z-20">
            <p className="text-white text-sm font-medium text-center leading-snug drop-shadow-lg">{story.caption}</p>
          </div>
        )}

        {/* Settings panel */}
        {showSettings && (
          <StorySettingsPanel
            story={story}
            isOwn={isOwn}
            onDelete={() => { onDelete(story.id); goToNext(); setShowSettings(false); }}
            onClose={() => setShowSettings(false)}
          />
        )}

        {/* Tap zones — left = prev, right = next (only when settings closed) */}
        {!showSettings && (
          <div className="absolute inset-0 flex z-[15]">
            <div className="flex-1 h-full" onPointerDown={goToPrev} />
            <div className="flex-1 h-full" onPointerDown={goToNext} />
          </div>
        )}
      </div>

      {/* Next group */}
      {groupIdx < groups.length - 1 && (
        <button
          onClick={e => { e.stopPropagation(); setGroupIdx(g => g + 1); setStoryIdx(0); setProgress(0); setShowSettings(false); }}
          className="absolute right-4 top-1/2 -translate-y-1/2 z-20 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white hidden sm:flex transition-colors"
        >
          <ChevronRight size={22} />
        </button>
      )}
    </div>
  );
}

// ── StoryCreator ──────────────────────────────────────────────────────────────

export function StoryCreator({ currentUserId, onClose, onCreated }) {
  const [mode,         setMode]         = useState("pick"); // "pick" | "image" | "video" | "text"
  const [file,        setFile]        = useState(null);
  const [preview,     setPreview]     = useState(null);
  const [caption,     setCaption]     = useState("");
  const [bgPreset,    setBgPreset]    = useState(BG_PRESETS[0].value);
  const [textContent, setTextContent] = useState("");
  const [fontSize,    setFontSize]    = useState("text-2xl");
  const [uploading,   setUploading]   = useState(false);
  const fileRef = useRef(null);

  const resetToPickMode = () => {
    setMode("pick"); setPreview(null); setFile(null);
    setCaption(""); setTextContent("");
  };

  const handleFileChange = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f); setPreview(URL.createObjectURL(f)); setMode("image");
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
        const { error } = await supabase.from("stories").insert({
          user_id: currentUserId, type: "image",
          media_url: publicUrl, caption: caption.trim() || null, expires_at: expiresAt,
        });
        if (error) throw error;

      } else if (mode === "text") {
        if (!textContent.trim()) return;
        const { error } = await supabase.from("stories").insert({
          user_id: currentUserId, type: "text",
          caption: textContent.trim(), bg_color: bgPreset, expires_at: expiresAt,
        });
        if (error) throw error;
      }

      onCreated?.();
      onClose();
    } catch (err) {
      console.error("Story upload error:", err);
    } finally {
      setUploading(false);
    }
  };

  const FONT_SIZES = [
    { id: 'text-lg',   label: 'S' },
    { id: 'text-2xl',  label: 'M' },
    { id: 'text-4xl',  label: 'L' },
  ];

  return (
    <div className="fixed inset-0 z-[500] flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full sm:max-w-sm bg-white dark:bg-gray-900 sm:rounded-2xl overflow-hidden shadow-2xl animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200 max-h-[96vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800 shrink-0">
          <div className="flex items-center gap-2">
            {mode !== "pick" && (
              <button onClick={resetToPickMode} className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 transition-colors">
                <ChevronLeft size={16} />
              </button>
            )}
            <h3 className="text-sm font-black text-gray-900 dark:text-white">
              {mode === "pick" ? "Create Story" : mode === "image" ? "Photo Story" : "Text Story"}
            </h3>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto custom-scrollbar flex-1">

          {/* ── Pick mode ── */}
          {mode === "pick" && (
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => fileRef.current?.click()}
                  className="flex flex-col items-center gap-3 py-8 rounded-2xl border-2 border-dashed border-violet-200 dark:border-violet-500/30 bg-violet-50 dark:bg-violet-500/5 text-violet-600 dark:text-violet-400 hover:border-violet-400 hover:bg-violet-100 dark:hover:bg-violet-500/10 transition-all"
                >
                  <Camera size={24} />
                  <span className="text-xs font-bold">Photo</span>
                </button>
                <button
                  onClick={() => setMode("text")}
                  className="flex flex-col items-center gap-3 py-8 rounded-2xl border-2 border-dashed border-pink-200 dark:border-pink-500/30 bg-pink-50 dark:bg-pink-500/5 text-pink-600 dark:text-pink-400 hover:border-pink-400 hover:bg-pink-100 dark:hover:bg-pink-500/10 transition-all"
                >
                  <Type size={24} />
                  <span className="text-xs font-bold">Text</span>
                </button>
              </div>
              <p className="text-[11px] text-gray-400 text-center">Visible to everyone · disappears after 24 hours</p>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
            </div>
          )}

          {/* ── Image mode ── */}
          {mode === "image" && preview && (
            <div className="p-5 space-y-4">
              <div className="relative w-full rounded-2xl overflow-hidden bg-black shadow-lg" style={{ aspectRatio: "9/14" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={preview} alt="preview" className="w-full h-full object-cover" />
                {caption && (
                  <div className="absolute bottom-4 inset-x-3 z-10">
                    <p className="text-white text-sm font-semibold text-center drop-shadow-lg">{caption}</p>
                  </div>
                )}
              </div>
              <input
                type="text" value={caption} onChange={e => setCaption(e.target.value)}
                placeholder="Add a caption… (optional)" maxLength={120}
                className="w-full px-4 py-3 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500/30"
              />
              <button
                onClick={handleShare} disabled={uploading}
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-violet-600 to-pink-600 hover:from-violet-500 hover:to-pink-500 disabled:opacity-50 text-white font-black py-3.5 rounded-xl text-sm transition-all shadow-lg shadow-violet-500/20"
              >
                {uploading ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
                {uploading ? "Sharing…" : "Share to Story"}
              </button>
            </div>
          )}

          {/* ── Text mode ── */}
          {mode === "text" && (
            <div className="p-5 space-y-4">
              {/* Live preview */}
              <div
                className="relative w-full rounded-2xl overflow-hidden flex items-center justify-center px-6 py-12 min-h-[220px] shadow-lg"
                style={applyBg(bgPreset)}
              >
                <p className={`text-white ${fontSize} font-black text-center leading-snug break-words drop-shadow-lg`}>
                  {textContent || <span className="opacity-40 text-base font-normal">Your story text…</span>}
                </p>
              </div>

              {/* Text input */}
              <textarea
                value={textContent} onChange={e => setTextContent(e.target.value)}
                placeholder="Type something…" maxLength={200} rows={3}
                className="w-full px-4 py-3 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-violet-500/30"
              />

              {/* Font size */}
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Text Size</p>
                <div className="flex gap-2">
                  {FONT_SIZES.map(({ id, label }) => (
                    <button
                      key={id}
                      onClick={() => setFontSize(id)}
                      className={`flex-1 py-2.5 rounded-xl text-sm font-black border transition-all ${
                        fontSize === id
                          ? 'bg-violet-600 border-violet-600 text-white shadow-md shadow-violet-500/20'
                          : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-violet-300 dark:hover:border-violet-700/50'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Background color picker */}
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                  <Palette size={11} /> Background
                </p>
                <div className="grid grid-cols-9 gap-1.5">
                  {BG_PRESETS.map(preset => (
                    <button
                      key={preset.id}
                      onClick={() => setBgPreset(preset.value)}
                      className={`w-full aspect-square rounded-xl transition-all hover:scale-110 active:scale-95 ${
                        bgPreset === preset.value
                          ? 'ring-2 ring-offset-2 dark:ring-offset-gray-900 ring-violet-600 scale-110'
                          : ''
                      }`}
                      style={applyBg(preset.value)}
                    />
                  ))}
                </div>
              </div>

              <button
                onClick={handleShare} disabled={uploading || !textContent.trim()}
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-violet-600 to-pink-600 hover:from-violet-500 hover:to-pink-500 disabled:opacity-50 text-white font-black py-3.5 rounded-xl text-sm transition-all shadow-lg shadow-violet-500/20"
              >
                {uploading ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
                {uploading ? "Sharing…" : "Share to Story"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── StoriesBar ────────────────────────────────────────────────────────────────
// Facebook-style tall portrait cards

export default function StoriesBar({ currentUserId }) {
  const [groups,       setGroups]       = useState([]);
  const [myProfile,    setMyProfile]    = useState(null);
  const [loading,      setLoading]      = useState(true);
  const [viewerOpen,   setViewerOpen]   = useState(false);
  const [viewerIdx,    setViewerIdx]    = useState(0);
  const [creatorOpen,  setCreatorOpen]  = useState(false);
  const [viewedIds,    setViewedIds]    = useState(() => getViewedIds());

  const fetchStories = useCallback(async () => {
    const { data } = await supabase
      .from("stories")
      .select("*, profiles:user_id(id, username, avatar_url)")
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: true });
    setGroups(groupStoriesByUser(data, currentUserId));
    setLoading(false);
  }, [currentUserId]);

  useEffect(() => {
    if (!currentUserId) return;
    supabase.from("profiles").select("id, username, avatar_url").eq("id", currentUserId).single()
      .then(({ data }) => { if (data) setMyProfile(data); });
  }, [currentUserId]);

  useEffect(() => {
    fetchStories();
    const ch = supabase.channel("stories-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "stories" }, fetchStories)
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, [fetchStories]);

  const myGroup       = groups.find(g => g.user?.id === currentUserId);
  const otherGroups   = groups.filter(g => g.user?.id !== currentUserId);
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

  const myAvatar   = myProfile?.avatar_url || myGroup?.user?.avatar_url;
  const myUsername = myProfile?.username   || myGroup?.user?.username;

  // Loading skeleton
  if (loading && groups.length === 0) return (
    <div className="flex gap-2.5 px-3 py-3 overflow-hidden border-b border-gray-100 dark:border-gray-800/60">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="w-[104px] h-[176px] rounded-2xl bg-gray-100 dark:bg-gray-800 animate-pulse shrink-0" />
      ))}
    </div>
  );

  return (
    <>
      <div className="w-full overflow-x-auto no-scrollbar border-b border-gray-100 dark:border-gray-800/60">
        <div className="flex gap-2.5 px-3 py-3 min-w-max">

          {/* ── Add / My Story card ── */}
          <div
            className="relative w-[104px] h-[176px] rounded-2xl overflow-hidden cursor-pointer shrink-0 group select-none"
            onClick={() => { if (myGroup) openGroup(myGroup); else setCreatorOpen(true); }}
          >
            {/* Top photo section */}
            <div className="absolute inset-x-0 top-0 h-[62%] bg-gray-100 dark:bg-gray-800 overflow-hidden">
              {myAvatar ? (
                <img
                  src={myAvatar}
                  alt={myUsername}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center text-white font-black text-3xl">
                  {myUsername?.[0]?.toUpperCase() || "?"}
                </div>
              )}
            </div>

            {/* Bottom white section */}
            <div className="absolute inset-x-0 bottom-0 h-[40%] bg-white dark:bg-gray-900 flex flex-col items-center justify-end pb-2.5">
              <span className="text-[10px] font-black text-gray-700 dark:text-gray-200 text-center px-2 leading-tight">
                {myGroup ? "My Story" : "Add Story"}
              </span>
            </div>

            {/* + button at photo/white boundary */}
            <div
              className="absolute left-1/2 -translate-x-1/2 z-10"
              style={{ bottom: 'calc(38% - 14px)' }}
            >
              <button
                onClick={e => { e.stopPropagation(); setCreatorOpen(true); }}
                className="w-7 h-7 bg-violet-600 hover:bg-violet-500 text-white rounded-full flex items-center justify-center border-2 border-white dark:border-gray-900 shadow-md transition-all hover:scale-110 active:scale-95"
                title="Add Story"
              >
                <Plus size={14} strokeWidth={3} />
              </button>
            </div>

            {/* Story ring border */}
            {myGroup && (
              <div className={`absolute inset-0 rounded-2xl pointer-events-none ring-[3px] ${
                myGroup.stories.every(s => viewedIds.has(s.id))
                  ? 'ring-gray-300 dark:ring-gray-600'
                  : 'ring-violet-500'
              }`} />
            )}
          </div>

          {/* ── Other users' story cards ── */}
          {otherGroups.map(g => {
            const allViewed   = g.stories.every(s => viewedIds.has(s.id));
            const latestStory = g.stories[g.stories.length - 1];

            return (
              <div
                key={g.user?.id}
                onClick={() => openGroup(g)}
                className="relative w-[104px] h-[176px] rounded-2xl overflow-hidden cursor-pointer shrink-0 group select-none"
              >
                {/* Story content as background */}
                <StoryCardBg story={latestStory} />

                {/* Hover overlay */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/15 transition-colors z-[5]" />

                {/* Top gradient */}
                <div className="absolute inset-x-0 top-0 h-10 bg-gradient-to-b from-black/40 to-transparent z-[6] pointer-events-none" />

                {/* Bottom gradient */}
                <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/80 to-transparent z-[6] pointer-events-none" />

                {/* Avatar */}
                <div className="absolute bottom-7 left-2 z-10">
                  <div className={`w-9 h-9 rounded-full overflow-hidden border-2 shadow-sm ${allViewed ? 'border-white/50' : 'border-white'}`}>
                    {g.user?.avatar_url
                      ? <img src={g.user.avatar_url} alt="" className="w-full h-full object-cover" />
                      : <div className="w-full h-full bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center text-white font-black text-xs">
                          {g.user?.username?.[0]?.toUpperCase()}
                        </div>
                    }
                  </div>
                </div>

                {/* Username */}
                <div className="absolute bottom-2 inset-x-2 z-10">
                  <p className="text-white text-[9px] font-bold truncate leading-tight">{g.user?.username}</p>
                </div>

                {/* Story ring border */}
                <div className={`absolute inset-0 rounded-2xl pointer-events-none z-20 ring-[3px] ${
                  allViewed ? 'ring-gray-400/30 dark:ring-gray-600/30' : 'ring-violet-500'
                }`} />
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
