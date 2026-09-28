"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  X, Plus, Camera, Type, Loader2, ChevronLeft, ChevronRight, Trash2,
  Info, Globe, Palette, Clock, AlertCircle, Pause,
} from "lucide-react";
import { supabase } from "../../supabaseClient";
import Image from "next/image";

// ── Constants ─────────────────────────────────────────────────────────────────

const STORY_DURATION = 5000;
const VIDEO_DURATION = 60000;
const STORY_TTL_MS   = 24 * 60 * 60 * 1000;
const MAX_IMAGE_MB   = 10;
const TAP_MAX_MS     = 250;   // shorter press = navigate, longer = hold to pause
const MAX_VIEWED_IDS = 500;

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

// Text size is derived from length (it isn't stored), so the creator preview
// and the viewer always match.
function textSizeClass(text = '') {
  const n = text.length;
  if (n <= 40)  return 'text-3xl';
  if (n <= 100) return 'text-2xl';
  return 'text-xl';
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
    const ids = [...getViewedIds()].filter(x => x !== id);
    ids.push(id);
    // Stories expire after 24h, so only recent ids matter — keep the list bounded.
    localStorage.setItem("story_viewed", JSON.stringify(ids.slice(-MAX_VIEWED_IDS)));
  } catch {}
}

// Storage path inside the "stories" bucket from a public URL.
function storagePathFromUrl(url) {
  try {
    const marker = "/object/public/stories/";
    const { pathname } = new URL(url);
    const i = pathname.indexOf(marker);
    return i === -1 ? null : decodeURIComponent(pathname.slice(i + marker.length));
  } catch { return null; }
}

/** Delete a story row and, for media stories, its file in storage. */
export async function deleteStory(story) {
  const { error } = await supabase.from("stories").delete().eq("id", story.id);
  if (error) return error;
  const path = story.media_url && storagePathFromUrl(story.media_url);
  if (path) await supabase.storage.from("stories").remove([path]);
  return null;
}

function latestAt(group) {
  return new Date(group.stories[group.stories.length - 1]?.created_at || 0).getTime();
}

// Your own stories first, then people with unseen stories, newest first.
function groupStoriesByUser(data, currentUserId, viewedIds) {
  const map = {};
  (data || []).forEach(s => {
    if (!s.profiles) return; // author no longer exists
    if (!map[s.user_id]) map[s.user_id] = { user: s.profiles, stories: [] };
    map[s.user_id].stories.push(s);
  });
  const unseen = (g) => g.stories.some(s => !viewedIds.has(s.id));
  return Object.values(map).sort((a, b) => {
    if (a.user.id === currentUserId) return -1;
    if (b.user.id === currentUserId) return 1;
    if (unseen(a) !== unseen(b)) return unseen(a) ? -1 : 1;
    return latestAt(b) - latestAt(a);
  });
}

function Avatar({ user, size, className = "" }) {
  return (
    <div className={`rounded-full overflow-hidden bg-blue-600 text-white flex items-center justify-center font-semibold shrink-0 ${className}`} style={{ width: size, height: size, fontSize: size * 0.4 }}>
      {user?.avatar_url
        ? <Image src={user.avatar_url} alt="" width={size} height={size} className="w-full h-full object-cover" unoptimized />
        : user?.username?.[0]?.toUpperCase()}
    </div>
  );
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
    <Image src={story.media_url} alt="" fill sizes="104px" className="object-cover" unoptimized />
  );
  return <div className="absolute inset-0 bg-gradient-to-b from-gray-700 to-gray-900" />;
}

// ── StoryRing — used around avatars elsewhere ────────────────────────────────

export function StoryRing({ hasStory, viewed = false, onClick, children }) {
  if (!hasStory) return <>{children}</>;
  return (
    <div
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick(); } } : undefined}
      aria-label={onClick ? "View story" : undefined}
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
  const [stories, setStories] = useState([]);
  const [tick, setTick] = useState(0);
  const refresh = useCallback(() => setTick(t => t + 1), []);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    supabase
      .from("stories")
      .select("id, type, media_url, caption, bg_color, created_at, expires_at, user_id")
      .eq("user_id", userId)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: true })
      .then(({ data }) => { if (!cancelled) setStories(data || []); });
    return () => { cancelled = true; };
  }, [userId, tick]);

  const active = userId ? stories : [];
  return { hasStory: active.length > 0, stories: active, refresh };
}

// ── StoryInfoPanel ────────────────────────────────────────────────────────────

function StoryInfoPanel({ story, isOwn, onDelete, onClose }) {
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const msLeft = Math.max(0, new Date(story.expires_at) - new Date());
  const hoursLeft = Math.floor(msLeft / 3600000);
  const minsLeft  = Math.floor((msLeft % 3600000) / 60000);

  const handleDelete = async () => {
    setDeleting(true);
    setError("");
    const err = await onDelete(story);
    if (err) { setError("Couldn't delete this story. Please try again."); setDeleting(false); }
  };

  return (
    <div className="absolute inset-x-3 bottom-6 z-[60] animate-in slide-in-from-bottom-3 duration-200" onPointerDown={e => e.stopPropagation()}>
      <div className="bg-black/60 backdrop-blur-2xl rounded-2xl border border-white/15 overflow-hidden shadow-2xl p-2">
        {confirming ? (
          <div className="p-3 space-y-3">
            <p className="text-sm font-semibold text-white">Delete this story?</p>
            <p className="text-xs text-white/60">It will be removed for everyone right away.</p>
            {error && <p className="text-xs text-red-300">{error}</p>}
            <div className="flex gap-2">
              <button onClick={() => setConfirming(false)} disabled={deleting} className="flex-1 h-10 rounded-xl bg-white/10 hover:bg-white/20 text-white text-sm font-semibold transition-colors">
                Cancel
              </button>
              <button onClick={handleDelete} disabled={deleting} className="flex-1 h-10 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-60 text-white text-sm font-semibold transition-colors flex items-center justify-center gap-2">
                {deleting ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />} Delete
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3 p-2.5">
              <Clock size={16} className="text-white/70 shrink-0" />
              <p className="text-sm text-white">
                Expires in {hoursLeft > 0 ? `${hoursLeft}h ${minsLeft}m` : `${minsLeft}m`}
              </p>
            </div>
            <div className="flex items-center gap-3 p-2.5">
              <Globe size={16} className="text-white/70 shrink-0" />
              <p className="text-sm text-white">Visible to everyone on beoneofus</p>
            </div>
            {isOwn && (
              <button onClick={() => setConfirming(true)} className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-red-500/15 transition-colors text-left">
                <Trash2 size={16} className="text-red-400 shrink-0" />
                <span className="text-sm font-semibold text-red-400">Delete story</span>
              </button>
            )}
            <button onClick={onClose} className="w-full mt-1 h-10 rounded-xl text-sm font-semibold text-white/60 hover:text-white hover:bg-white/10 transition-colors">
              Close
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ── StoryFrame — one story: media, progress and its own timer ────────────────
// Keyed by story id, so every story starts from a clean timer/loading state.

function StoryFrame({ group, storyIdx, paused, onDone }) {
  const story = group.stories[storyIdx];
  const needsLoad = story.type === "image" && !!story.media_url;
  const [ready, setReady]       = useState(!needsLoad);
  const [failed, setFailed]     = useState(false);
  const [progress, setProgress] = useState(0);
  const elapsedRef = useRef(0);
  const onDoneRef  = useRef(onDone);
  const duration = story.type === "video" ? VIDEO_DURATION : STORY_DURATION;

  useEffect(() => { onDoneRef.current = onDone; });
  useEffect(() => { markViewed(story.id); }, [story.id]);

  // The clock only runs once media is shown and nothing is holding it.
  useEffect(() => {
    if (!ready || paused) return;
    let raf;
    let last = performance.now();
    const tick = (now) => {
      elapsedRef.current += now - last;
      last = now;
      const pct = Math.min((elapsedRef.current / duration) * 100, 100);
      setProgress(pct);
      if (pct >= 100) onDoneRef.current();
      else raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [ready, paused, duration]);

  return (
    <>
      {/* Background / media */}
      {story.type === "text" && <div className="absolute inset-0" style={applyBg(story.bg_color)} />}
      {needsLoad && !failed && (
        <Image
          src={story.media_url}
          alt={story.caption || "Story"}
          fill
          sizes="(min-width: 640px) 400px, 100vw"
          className="object-cover"
          unoptimized
          onLoad={() => setReady(true)}
          onError={() => { setFailed(true); setReady(true); }}
        />
      )}
      {(story.type === "image" && (!story.media_url || failed)) && (
        <div className="absolute inset-0 bg-gray-900 flex flex-col items-center justify-center gap-2 text-white/60">
          <AlertCircle size={28} />
          <p className="text-sm">This story couldn&apos;t be loaded</p>
        </div>
      )}
      {!ready && (
        <div className="absolute inset-0 bg-gray-950 flex items-center justify-center">
          <Loader2 size={28} className="animate-spin text-white/50" />
        </div>
      )}

      {story.type === "text" && (
        <div className="absolute inset-0 flex items-center justify-center px-8">
          <p className={`text-white ${textSizeClass(story.caption)} font-bold text-center leading-snug break-words drop-shadow-xl`}>
            {story.caption}
          </p>
        </div>
      )}

      {/* Readability gradients */}
      <div className="absolute inset-x-0 top-0 h-36 bg-gradient-to-b from-black/60 to-transparent pointer-events-none" />
      {story.type === "image" && story.caption && (
        <>
          <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black/75 to-transparent pointer-events-none" />
          <p className="absolute bottom-8 inset-x-5 text-white text-[15px] font-medium text-center leading-snug drop-shadow-lg">{story.caption}</p>
        </>
      )}

      {/* Progress bars */}
      <div className="absolute top-3 inset-x-3 flex gap-1 z-20" aria-hidden="true">
        {group.stories.map((s, i) => (
          <div key={s.id} className="flex-1 h-[3px] bg-white/30 rounded-full overflow-hidden">
            <div className="h-full bg-white rounded-full" style={{ width: i < storyIdx ? "100%" : i === storyIdx ? `${progress}%` : "0%" }} />
          </div>
        ))}
      </div>
    </>
  );
}

// ── StoryViewer ───────────────────────────────────────────────────────────────

export function StoryViewer({ groups, startGroupIdx = 0, currentUserId, onClose, onDelete }) {
  const [groupIdx, setGroupIdx] = useState(Math.min(Math.max(startGroupIdx, 0), Math.max(groups.length - 1, 0)));
  const [storyIdx, setStoryIdx] = useState(0);
  const [showInfo, setShowInfo] = useState(false);
  const [held, setHeld]         = useState(false);
  const [hidden, setHidden]     = useState(false);
  const pressRef = useRef(null);

  const group = groups[groupIdx];
  const story = group?.stories[storyIdx];

  const goToNext = useCallback(() => {
    setShowInfo(false);
    if (!group) return onClose();
    if (storyIdx < group.stories.length - 1) setStoryIdx(i => i + 1);
    else if (groupIdx < groups.length - 1) { setGroupIdx(g => g + 1); setStoryIdx(0); }
    else onClose();
  }, [group, storyIdx, groupIdx, groups.length, onClose]);

  const goToPrev = useCallback(() => {
    setShowInfo(false);
    if (storyIdx > 0) setStoryIdx(i => i - 1);
    else if (groupIdx > 0) {
      setStoryIdx(groups[groupIdx - 1].stories.length - 1);
      setGroupIdx(g => g - 1);
    }
  }, [storyIdx, groupIdx, groups]);

  const jumpGroup = (dir) => {
    const next = groupIdx + dir;
    if (next < 0 || next >= groups.length) return;
    setShowInfo(false);
    setGroupIdx(next);
    setStoryIdx(0);
  };

  // Keyboard: Esc closes, arrows navigate.
  useEffect(() => {
    const fn = (e) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight") goToNext();
      else if (e.key === "ArrowLeft") goToPrev();
    };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [onClose, goToNext, goToPrev]);

  // Pause while the tab is in the background; lock page scroll while open.
  useEffect(() => {
    const onVis = () => setHidden(document.hidden);
    document.addEventListener("visibilitychange", onVis);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      document.body.style.overflow = prevOverflow;
    };
  }, []);

  if (!group || !story) return null;
  const isOwn = story.user_id === currentUserId;

  // Tap left/right to navigate; press and hold anywhere to pause.
  const onPointerDown = (e) => {
    pressRef.current = { t: Date.now(), x: e.clientX, w: e.currentTarget.getBoundingClientRect() };
    setHeld(true);
  };
  const onPointerUp = (e) => {
    setHeld(false);
    const p = pressRef.current;
    pressRef.current = null;
    if (!p || Date.now() - p.t > TAP_MAX_MS) return;
    const leftSide = e.clientX - p.w.left < p.w.width / 3;
    if (leftSide) goToPrev(); else goToNext();
  };
  const cancelPress = () => { pressRef.current = null; setHeld(false); };

  const handleDelete = async (s) => {
    const err = await onDelete?.(s);
    if (!err) onClose();
    return err;
  };

  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center bg-black/95" role="dialog" aria-modal="true" aria-label={`Story by ${group.user?.username || 'user'}`}>
      <div className="absolute inset-0" onClick={onClose} />

      {groupIdx > 0 && (
        <button onClick={() => jumpGroup(-1)} aria-label="Previous person" className="absolute left-4 top-1/2 -translate-y-1/2 z-20 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white hidden sm:flex transition-colors">
          <ChevronLeft size={22} />
        </button>
      )}

      <div className="relative w-full sm:w-[400px] h-full sm:h-[min(700px,92vh)] sm:rounded-3xl overflow-hidden shadow-2xl bg-gray-950 select-none">
        <StoryFrame
          key={story.id}
          group={group}
          storyIdx={storyIdx}
          paused={held || showInfo || hidden}
          onDone={goToNext}
        />

        {/* Tap / hold surface (below the header controls) */}
        {!showInfo && (
          <div
            className="absolute inset-0 z-[15] touch-none"
            onPointerDown={onPointerDown}
            onPointerUp={onPointerUp}
            onPointerCancel={cancelPress}
            onPointerLeave={cancelPress}
            onContextMenu={e => e.preventDefault()}
          />
        )}

        {/* Header */}
        <div className="absolute top-7 inset-x-3 flex items-center justify-between z-30">
          <div className="flex items-center gap-2.5 min-w-0">
            <Avatar user={group.user} size={36} className="border-2 border-white/70" />
            <div className="min-w-0">
              <p className="text-white text-sm font-semibold leading-tight truncate drop-shadow">{group.user?.username}</p>
              <p className="text-white/60 text-xs">{timeAgo(story.created_at)}</p>
            </div>
            {held && <Pause size={14} className="text-white/70 shrink-0" aria-label="Paused" />}
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowInfo(v => !v)}
              aria-label="Story details"
              className={`p-2 rounded-full transition-colors ${showInfo ? 'bg-white/25 text-white' : 'bg-black/25 hover:bg-black/40 text-white/85'}`}
            >
              <Info size={17} />
            </button>
            <button onClick={onClose} aria-label="Close" className="p-2 rounded-full bg-black/25 hover:bg-black/40 text-white/85 transition-colors">
              <X size={17} />
            </button>
          </div>
        </div>

        {showInfo && (
          <StoryInfoPanel
            story={story}
            isOwn={isOwn}
            onDelete={handleDelete}
            onClose={() => setShowInfo(false)}
          />
        )}
      </div>

      {groupIdx < groups.length - 1 && (
        <button onClick={() => jumpGroup(1)} aria-label="Next person" className="absolute right-4 top-1/2 -translate-y-1/2 z-20 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white hidden sm:flex transition-colors">
          <ChevronRight size={22} />
        </button>
      )}
    </div>
  );
}

// ── StoryCreator ──────────────────────────────────────────────────────────────

export function StoryCreator({ currentUserId, onClose, onCreated }) {
  const [mode,        setMode]        = useState("pick"); // "pick" | "image" | "text"
  const [file,        setFile]        = useState(null);
  const [preview,     setPreview]     = useState(null);
  const [caption,     setCaption]     = useState("");
  const [bgPreset,    setBgPreset]    = useState(BG_PRESETS[0].value);
  const [textContent, setTextContent] = useState("");
  const [uploading,   setUploading]   = useState(false);
  const [error,       setError]       = useState("");
  const fileRef = useRef(null);

  // Release the preview's object URL when it's replaced or the creator closes.
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  const resetToPickMode = () => {
    setMode("pick"); setPreview(null); setFile(null);
    setCaption(""); setTextContent(""); setError("");
  };

  const handleFileChange = (e) => {
    const f = e.target.files?.[0];
    e.target.value = ""; // allow picking the same file again
    if (!f) return;
    if (!f.type.startsWith("image/")) { setError("Please choose an image file (JPG, PNG, WEBP or GIF)."); return; }
    if (f.size > MAX_IMAGE_MB * 1024 * 1024) { setError(`That image is too large. The maximum is ${MAX_IMAGE_MB} MB.`); return; }
    setError("");
    setFile(f); setPreview(URL.createObjectURL(f)); setMode("image");
  };

  const handleShare = async () => {
    if (uploading) return;
    if (!currentUserId) { setError("Please sign in to share a story."); return; }
    if (mode === "text" && !textContent.trim()) return;
    setUploading(true);
    setError("");
    try {
      const expiresAt = new Date(Date.now() + STORY_TTL_MS).toISOString();

      if (mode === "image" && file) {
        const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
        const id = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : String(Date.now());
        const path = `${currentUserId}/${id}.${ext}`;
        const { error: upErr } = await supabase.storage.from("stories").upload(path, file, { contentType: file.type, cacheControl: "3600" });
        if (upErr) throw upErr;
        const { data: { publicUrl } } = supabase.storage.from("stories").getPublicUrl(path);
        const { error: insErr } = await supabase.from("stories").insert({
          user_id: currentUserId, type: "image",
          media_url: publicUrl, caption: caption.trim() || null, expires_at: expiresAt,
        });
        if (insErr) {
          await supabase.storage.from("stories").remove([path]); // don't leave an orphaned file
          throw insErr;
        }
      } else if (mode === "text") {
        const { error: insErr } = await supabase.from("stories").insert({
          user_id: currentUserId, type: "text",
          caption: textContent.trim(), bg_color: bgPreset, expires_at: expiresAt,
        });
        if (insErr) throw insErr;
      }

      onCreated?.();
      onClose();
    } catch (err) {
      console.error("Story upload error:", err);
      setError("Your story couldn't be shared. Check your connection and try again.");
    } finally {
      setUploading(false);
    }
  };

  const title = mode === "pick" ? "Create story" : mode === "image" ? "Photo story" : "Text story";
  const shareBtn = (disabled) => (
    <button
      onClick={handleShare}
      disabled={disabled}
      className="w-full h-11 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl text-sm transition-colors"
    >
      {uploading && <Loader2 size={16} className="animate-spin" />}
      {uploading ? "Sharing…" : "Share story"}
    </button>
  );

  return (
    <div className="fixed inset-0 z-[500] flex items-end sm:items-center justify-center" role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={uploading ? undefined : onClose} />
      <div className="relative w-full sm:max-w-sm bg-white dark:bg-gray-900 rounded-t-2xl sm:rounded-2xl overflow-hidden shadow-2xl animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200 max-h-[96vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-4 h-14 border-b border-gray-100 dark:border-gray-800 shrink-0">
          <div className="flex items-center gap-1">
            {mode !== "pick" && (
              <button onClick={resetToPickMode} disabled={uploading} aria-label="Back" className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 transition-colors">
                <ChevronLeft size={18} />
              </button>
            )}
            <h3 className="text-base font-semibold text-gray-900 dark:text-white px-1">{title}</h3>
          </div>
          <button onClick={onClose} disabled={uploading} aria-label="Close" className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="overflow-y-auto custom-scrollbar flex-1">
          {error && (
            <div className="mx-5 mt-4 flex items-start gap-2 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 px-3 py-2.5 text-sm text-red-700 dark:text-red-300">
              <AlertCircle size={16} className="shrink-0 mt-0.5" /> <span>{error}</span>
            </div>
          )}

          {/* ── Pick mode ── */}
          {mode === "pick" && (
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => fileRef.current?.click()}
                  className="flex flex-col items-center gap-3 py-8 rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60 text-gray-700 dark:text-gray-200 hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors"
                >
                  <Camera size={24} className="text-blue-600 dark:text-blue-400" />
                  <span className="text-sm font-semibold">Photo</span>
                </button>
                <button
                  onClick={() => { setError(""); setMode("text"); }}
                  className="flex flex-col items-center gap-3 py-8 rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60 text-gray-700 dark:text-gray-200 hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors"
                >
                  <Type size={24} className="text-blue-600 dark:text-blue-400" />
                  <span className="text-sm font-semibold">Text</span>
                </button>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 text-center">Visible to everyone · disappears after 24 hours</p>
              <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={handleFileChange} />
            </div>
          )}

          {/* ── Image mode ── */}
          {mode === "image" && preview && (
            <div className="p-5 space-y-4">
              <div className="relative w-full rounded-2xl overflow-hidden bg-black" style={{ aspectRatio: "9/14" }}>
                <Image src={preview} alt="Preview" fill sizes="384px" className="object-cover" unoptimized />
                {caption && (
                  <p className="absolute bottom-4 inset-x-3 text-white text-sm font-medium text-center drop-shadow-lg">{caption}</p>
                )}
              </div>
              <input
                type="text" value={caption} onChange={e => setCaption(e.target.value)}
                placeholder="Add a caption (optional)" maxLength={120}
                className="w-full px-4 h-11 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
              />
              {shareBtn(uploading)}
            </div>
          )}

          {/* ── Text mode ── */}
          {mode === "text" && (
            <div className="p-5 space-y-4">
              <div className="relative w-full rounded-2xl overflow-hidden flex items-center justify-center px-6 py-12 min-h-[220px]" style={applyBg(bgPreset)}>
                <p className={`text-white ${textSizeClass(textContent)} font-bold text-center leading-snug break-words drop-shadow-lg`}>
                  {textContent || <span className="opacity-50 text-base font-normal">Your story text…</span>}
                </p>
              </div>

              <div>
                <textarea
                  value={textContent} onChange={e => setTextContent(e.target.value)}
                  placeholder="What do you want to share?" maxLength={200} rows={3}
                  className="w-full px-4 py-3 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
                />
                <p className="text-xs text-gray-400 text-right mt-1 tabular-nums">{textContent.length}/200</p>
              </div>

              <div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-1.5">
                  <Palette size={14} /> Background
                </p>
                <div className="grid grid-cols-9 gap-1.5">
                  {BG_PRESETS.map(preset => (
                    <button
                      key={preset.id}
                      onClick={() => setBgPreset(preset.value)}
                      aria-label={`Background ${preset.id}`}
                      aria-pressed={bgPreset === preset.value}
                      className={`w-full aspect-square rounded-lg transition-transform hover:scale-110 ${
                        bgPreset === preset.value ? 'ring-2 ring-offset-2 dark:ring-offset-gray-900 ring-blue-600' : ''
                      }`}
                      style={applyBg(preset.value)}
                    />
                  ))}
                </div>
              </div>

              {shareBtn(uploading || !textContent.trim())}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── StoriesBar ────────────────────────────────────────────────────────────────
// Tall portrait cards across the top of the feed.

export default function StoriesBar({ currentUserId }) {
  const [rows,        setRows]        = useState([]);
  const [myProfile,   setMyProfile]   = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [viewer,      setViewer]      = useState(null); // { groups, idx } snapshot while open
  const [creatorOpen, setCreatorOpen] = useState(false);
  const [viewedIds,   setViewedIds]   = useState(() => getViewedIds());

  const fetchStories = useCallback(async () => {
    const { data } = await supabase
      .from("stories")
      .select("*, profiles:user_id(id, username, avatar_url)")
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: true })
      .limit(300);
    setRows(data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!currentUserId) return;
    supabase.from("profiles").select("id, username, avatar_url").eq("id", currentUserId).single()
      .then(({ data }) => { if (data) setMyProfile(data); });
  }, [currentUserId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- state is set after the awaited fetch
    fetchStories();
    const ch = supabase.channel(`stories-rt-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "stories" }, fetchStories)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [fetchStories]);

  const groups      = groupStoriesByUser(rows, currentUserId, viewedIds);
  const myGroup     = groups.find(g => g.user.id === currentUserId);
  const otherGroups = groups.filter(g => g.user.id !== currentUserId);

  // Snapshot the list when opening, so live updates can't shift the viewer.
  const openGroup = (group) => {
    const idx = groups.findIndex(g => g.user.id === group.user.id);
    setViewer({ groups, idx: Math.max(0, idx) });
  };

  const handleDelete = async (story) => {
    const err = await deleteStory(story);
    if (!err) fetchStories();
    return err;
  };

  const handleViewerClose = () => {
    setViewer(null);
    setViewedIds(getViewedIds());
  };

  const myAvatar   = myProfile?.avatar_url || myGroup?.user?.avatar_url;
  const myUsername = myProfile?.username   || myGroup?.user?.username;
  const myAllViewed = myGroup?.stories.every(s => viewedIds.has(s.id));

  if (loading && rows.length === 0) return (
    <div className="flex gap-2.5 px-3 py-3 overflow-hidden" aria-hidden="true">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="w-[104px] h-[176px] rounded-2xl bg-gray-100 dark:bg-gray-800 animate-pulse shrink-0" />
      ))}
    </div>
  );

  return (
    <>
      <div className="w-full overflow-x-auto no-scrollbar">
        <div className="flex gap-2.5 px-3 py-3 min-w-max" role="list" aria-label="Stories">

          {/* ── Your story ── */}
          <div role="listitem" className="relative w-[104px] h-[176px] shrink-0">
            <button
              type="button"
              onClick={() => { if (myGroup) openGroup(myGroup); else setCreatorOpen(true); }}
              aria-label={myGroup ? "View your story" : "Add to your story"}
              className="group absolute inset-0 rounded-2xl overflow-hidden text-left border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900"
            >
              <div className="absolute inset-x-0 top-0 h-[62%] bg-gray-100 dark:bg-gray-800 overflow-hidden">
                {myAvatar ? (
                  <Image src={myAvatar} alt="" fill sizes="104px" className="object-cover group-hover:scale-105 transition-transform duration-300" unoptimized />
                ) : (
                  <div className="w-full h-full bg-blue-600 flex items-center justify-center text-white font-semibold text-3xl">
                    {myUsername?.[0]?.toUpperCase() || "?"}
                  </div>
                )}
              </div>
              <span className="absolute inset-x-0 bottom-2.5 text-xs font-semibold text-gray-800 dark:text-gray-100 text-center px-2">
                {myGroup ? "Your story" : "Add story"}
              </span>
              {myGroup && (
                <span className={`absolute inset-0 rounded-2xl pointer-events-none ring-[3px] ring-inset ${myAllViewed ? 'ring-gray-300 dark:ring-gray-600' : 'ring-blue-600'}`} />
              )}
            </button>
            <button
              type="button"
              onClick={() => setCreatorOpen(true)}
              aria-label="Add to your story"
              title="Add to your story"
              className="absolute left-1/2 -translate-x-1/2 z-10 w-8 h-8 bg-blue-600 hover:bg-blue-700 text-white rounded-full flex items-center justify-center border-[3px] border-white dark:border-gray-900 shadow transition-transform hover:scale-110"
              style={{ top: 'calc(62% - 16px)' }}
            >
              <Plus size={15} strokeWidth={2.75} />
            </button>
          </div>

          {/* ── Other people's stories ── */}
          {otherGroups.map(g => {
            const allViewed   = g.stories.every(s => viewedIds.has(s.id));
            const latestStory = g.stories[g.stories.length - 1];
            return (
              <button
                type="button"
                role="listitem"
                key={g.user.id}
                onClick={() => openGroup(g)}
                aria-label={`View ${g.user.username}'s story${allViewed ? '' : ' (new)'}`}
                className="relative w-[104px] h-[176px] rounded-2xl overflow-hidden shrink-0 group text-left"
              >
                <StoryCardBg story={latestStory} />
                <span className="absolute inset-0 bg-black/0 group-hover:bg-black/15 transition-colors" />
                <span className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/80 to-transparent pointer-events-none" />
                <span className="absolute top-2 left-2">
                  <span className={`block rounded-full p-[2px] ${allViewed ? 'bg-white/40' : 'bg-blue-600'}`}>
                    <Avatar user={g.user} size={32} className="border-2 border-white dark:border-gray-900" />
                  </span>
                </span>
                <span className="absolute bottom-2 inset-x-2 text-white text-xs font-semibold truncate leading-tight">{g.user.username}</span>
              </button>
            );
          })}
        </div>
      </div>

      {viewer && viewer.groups.length > 0 && (
        <StoryViewer
          groups={viewer.groups}
          startGroupIdx={viewer.idx}
          currentUserId={currentUserId}
          onClose={handleViewerClose}
          onDelete={handleDelete}
        />
      )}

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
