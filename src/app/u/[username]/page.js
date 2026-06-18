"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  MapPin, Globe, GitBranch, Users, BookOpen, Award,
  Terminal, Briefcase, Share2, CheckCircle2, Clock,
  ArrowLeft, Loader2, Copy, Check, MessageSquare,
  Heart, Code, ExternalLink, BadgeCheck, Zap, Star,
  Eye, EyeOff, Wifi, FolderGit2, Tag, Link2,
  Crown, ShieldCheck, Sparkles
} from "lucide-react";
import GitHubStats from "../../components/GitHubStats";
import { supabase } from "../../supabaseClient";
import VerifiedBadge from "../../components/VerifiedBadge";
import PremiumBadge from "../../components/PremiumBadge";

/* ── helpers ─────────────────────────────────────────────── */
function timeAgo(dateStr) {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString("en", { month: "short", day: "numeric", year: "numeric" });
}

/* visibility defaults — all public if not set */
const DEFAULT_VIS = {
  bio: true, location: true, github: true, website: true,
  work_status: true, certificates: true, posts: true, premium_badge: true,
};

function vis(profile, key) {
  const settings = profile?.profile_visibility ?? DEFAULT_VIS;
  return settings[key] !== false; // default = true
}

/* ── cert level badge colour ─────────────────────────────── */
function levelColor(level = "") {
  const l = level.toLowerCase();
  if (l.includes("adv") || l.includes("expert")) return "from-purple-500 to-violet-600";
  if (l.includes("inter")) return "from-blue-500 to-cyan-600";
  return "from-emerald-500 to-teal-600";
}

export default function PublicProfilePage() {
  const { username } = useParams();
  const router = useRouter();

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [copied, setCopied] = useState(false);

  const [stats, setStats] = useState({ connections: 0, coursesCompleted: 0, certificates: 0, posts: 0 });
  const [certificates, setCertificates] = useState([]);
  const [recentPosts, setRecentPosts] = useState([]);
  const [portfolioProjects, setPortfolioProjects] = useState([]);
  const [endorsements, setEndorsements] = useState({});
  const [endorsing, setEndorsing] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState("none");
  const [connectionProcessing, setConnectionProcessing] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (cancelled) return;
      if (session) setCurrentUserId(session.user.id);

      const { data: profileData, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("username", username)
        .single();

      if (error || !profileData) { setNotFound(true); setLoading(false); return; }
      setProfile(profileData);

      const [connCountRes, coursesRes, certsRes, postsRes, recentPostsRes, projectsRes, endorsementsRes] = await Promise.all([
        fetch(`/api/connections/count?user_id=${profileData.id}`)
          .then(r => r.ok ? r.json() : { count: 0 })
          .catch(() => ({ count: 0 })),
        supabase.from("user_course_progress").select("id", { count: "exact", head: true })
          .eq("user_id", profileData.id).eq("status", "completed"),
        supabase.from("user_certificates")
          .select("id, issued_at, course_id, courses!user_certificates_course_id_fkey(title, category, level)")
          .eq("user_id", profileData.id)
          .order("issued_at", { ascending: false }).limit(6),
        supabase.from("posts").select("id", { count: "exact", head: true })
          .eq("user_id", profileData.id),
        supabase.from("posts")
          .select("id, title, content, code_snippet, image_url, created_at, likes(user_id), comments(id)")
          .eq("user_id", profileData.id)
          .order("created_at", { ascending: false }).limit(4),
        supabase.from("projects")
          .select("id, title, description, tags, status, github_url, live_url, created_at")
          .eq("user_id", profileData.id)
          .eq("is_public", true)
          .order("created_at", { ascending: false })
          .limit(6),
        supabase.from("skill_endorsements")
          .select("skill, endorser_id")
          .eq("endorsee_id", profileData.id),
      ]);

      setStats({
        connections: connCountRes.count ?? 0,
        coursesCompleted: coursesRes.count ?? 0,
        certificates: certsRes.data?.length ?? 0,
        posts: postsRes.count ?? 0,
      });

      if (projectsRes.data) setPortfolioProjects(projectsRes.data);
      if (endorsementsRes.data) {
        const map = {};
        endorsementsRes.data.forEach(e => {
          if (!map[e.skill]) map[e.skill] = [];
          map[e.skill].push(e.endorser_id);
        });
        setEndorsements(map);
      }

      if (certsRes.data && !certsRes.error) {
        setCertificates(certsRes.data);
      } else if (certsRes.error) {
        // FK name mismatch — fall back to plain join
        const { data: certsRetry } = await supabase.from("user_certificates")
          .select("id, issued_at, course_id, courses(title, category, level)")
          .eq("user_id", profileData.id)
          .order("issued_at", { ascending: false }).limit(6);
        if (certsRetry) setCertificates(certsRetry);
      }
      if (recentPostsRes.data) setRecentPosts(recentPostsRes.data);

      if (session && profileData.id !== session.user.id) {
        const { data: conn } = await supabase.from("connections")
          .select("id, status, sender_id")
          .or(`and(sender_id.eq.${session.user.id},receiver_id.eq.${profileData.id}),and(sender_id.eq.${profileData.id},receiver_id.eq.${session.user.id})`)
          .maybeSingle();

        if (conn) {
          setConnectionStatus(
            conn.status === "accepted" ? "connected"
            : conn.sender_id === session.user.id ? "pending_sent"
            : "pending_received"
          );
        }
      }

      // Record profile view (fire-and-forget)
      fetch('/api/analytics/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          viewed_id: profileData.id,
          viewer_id: session?.user?.id || null,
        }),
      }).catch(() => {});

      if (!cancelled) setLoading(false);
    };

    if (username) init();
    return () => { cancelled = true; };
  }, [username]);

  const handleConnect = async () => {
    if (!currentUserId) { router.push("/auth"); return; }
    if (!profile) return;
    setConnectionProcessing(true);
    try {
      await supabase.from("connections").insert({ sender_id: currentUserId, receiver_id: profile.id, status: "pending" });
      await supabase.from("notifications").insert({ receiver_id: profile.id, actor_id: currentUserId, type: "connection_request", content: "sent you a connection request" });
      setConnectionStatus("pending_sent");
    } catch (_) {}
    setConnectionProcessing(false);
  };

  const copyProfileUrl = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Stable reference — only rebuilds when the identity of the viewer or profile changes.
  const handleEndorse = useCallback(async (skill) => {
    if (!currentUserId || !profile || currentUserId === profile.id) return;
    setEndorsing(skill);
    try {
      const alreadyEndorsed = endorsements[skill]?.includes(currentUserId);
      if (alreadyEndorsed) {
        await supabase.from("skill_endorsements")
          .delete()
          .eq("endorsee_id", profile.id)
          .eq("endorser_id", currentUserId)
          .eq("skill", skill);
        setEndorsements(prev => ({ ...prev, [skill]: prev[skill].filter(id => id !== currentUserId) }));
      } else {
        await supabase.from("skill_endorsements")
          .insert({ endorsee_id: profile.id, endorser_id: currentUserId, skill });
        setEndorsements(prev => ({ ...prev, [skill]: [...(prev[skill] || []), currentUserId] }));
      }
    } catch (err) {
      console.error('[profile] endorse error:', err.message);
    } finally {
      setEndorsing(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUserId, profile?.id, endorsements]);

  /* ── loading ─────────────────────────────────────────── */
  if (loading) return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0D0D0D] flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-[3px] border-blue-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs text-gray-400 font-mono uppercase tracking-widest">Loading profile…</p>
      </div>
    </div>
  );

  /* ── not found ───────────────────────────────────────── */
  if (notFound) return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0D0D0D] flex flex-col items-center justify-center p-6 text-center">
      <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
        <Terminal size={32} className="text-gray-400" />
      </div>
      <h1 className="text-2xl font-black text-gray-900 dark:text-gray-100 mb-2">Profile not found</h1>
      <p className="text-gray-500 dark:text-gray-400 mb-6 text-sm">@{username} doesn&apos;t exist on beoneofus.</p>
      <Link href="/" className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2.5 rounded-xl font-bold transition-all text-sm shadow-lg shadow-blue-500/20">
        Go home
      </Link>
    </div>
  );

  const isOwnProfile = currentUserId === profile?.id;
  const visibility = profile?.profile_visibility ?? DEFAULT_VIS;

  const isFounder = profile?.role === "founder";
  const isAdmin   = profile?.is_admin && !isFounder;

  // Accent palette — founder gets gold, admin gets violet, regular gets blue
  const accent = isFounder
    ? { ring: "ring-amber-400/60", border: "border-amber-400/50", glow: "shadow-amber-400/30", text: "text-amber-500", bg: "bg-amber-500", bgMuted: "bg-amber-50 dark:bg-amber-900/20", banner: "from-[#0f0c02] via-amber-950 to-[#1a1200]", strip: "from-amber-500/10 via-amber-400/5 to-transparent border-amber-500/20", badgeBg: "bg-amber-500/10 border-amber-500/30 text-amber-400", statBorder: "border-amber-200 dark:border-amber-800/40" }
    : isAdmin
    ? { ring: "ring-violet-500/60", border: "border-violet-500/50", glow: "shadow-violet-500/30", text: "text-violet-500", bg: "bg-violet-500", bgMuted: "bg-violet-50 dark:bg-violet-900/20", banner: "from-[#0a0010] via-violet-950 to-[#0d0018]", strip: "from-violet-500/10 via-violet-400/5 to-transparent border-violet-500/20", badgeBg: "bg-violet-500/10 border-violet-500/30 text-violet-400", statBorder: "border-violet-200 dark:border-violet-800/40" }
    : null;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0D0D0D] text-gray-900 dark:text-gray-100">

      {/* ══ TOP NAV ══ */}
      <nav className="fixed top-0 w-full z-50 border-b border-gray-200/80 dark:border-gray-800/80 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between gap-3">
          <Link href="/" className="font-black text-lg tracking-tighter flex items-center gap-2 text-gray-900 dark:text-gray-100 shrink-0">
            <Terminal className="text-blue-500" size={20} />
            <span>beone<span className="text-blue-600">of</span>us</span>
          </Link>

          <div className="flex items-center gap-2">
            <button
              onClick={copyProfileUrl}
              className="flex items-center gap-1.5 text-xs font-bold text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 px-3 py-1.5 rounded-lg transition-all"
            >
              {copied ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
              {copied ? "Copied!" : "Share"}
            </button>
            {currentUserId ? (
              <Link href="/dash" className="text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 px-3 py-1.5 rounded-lg transition-all">
                Dashboard
              </Link>
            ) : (
              <Link href="/auth" className="text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 px-3 py-1.5 rounded-lg transition-all shadow-md shadow-blue-500/20">
                Join Free
              </Link>
            )}
          </div>
        </div>
      </nav>

      <main className="pt-14">

        {/* ══ HERO BANNER ══ */}
        <div className="relative h-48 sm:h-64 md:h-72 overflow-hidden">
          {profile.banner_url ? (
            <Image src={profile.banner_url} alt="Banner" fill className="object-cover" />
          ) : accent ? (
            <div className={`absolute inset-0 bg-gradient-to-br ${accent.banner}`}>
              {/* Noise texture */}
              <div className="absolute inset-0 opacity-[0.07]" style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`
              }} />
              {/* Radial glow */}
              <div className={`absolute inset-0 opacity-30 bg-radial-gradient`} style={{
                background: isFounder
                  ? "radial-gradient(ellipse 70% 60% at 50% 100%, rgba(251,191,36,0.25) 0%, transparent 70%)"
                  : "radial-gradient(ellipse 70% 60% at 50% 100%, rgba(139,92,246,0.25) 0%, transparent 70%)"
              }} />
              {/* Dot grid */}
              <div className="absolute inset-0 opacity-10" style={{
                backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255,255,255,0.6) 1px, transparent 0)`,
                backgroundSize: `28px 28px`
              }} />
            </div>
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-blue-500 to-indigo-700">
              <div className="absolute inset-0 opacity-20" style={{
                backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255,255,255,0.4) 1px, transparent 0)`,
                backgroundSize: `24px 24px`
              }} />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
        </div>

        {/* ══ PROFILE HEADER ══ */}
        <div className="max-w-5xl mx-auto px-4 sm:px-6">

          {/* Avatar + actions row */}
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 -mt-16 mb-5 relative z-10">

            {/* Avatar */}
            <div className="flex items-end gap-4">
              <div className={`relative w-28 h-28 sm:w-32 sm:h-32 shrink-0 ${accent ? `p-[3px] rounded-3xl bg-gradient-to-br ${isFounder ? "from-amber-400 via-yellow-300 to-amber-600" : "from-violet-500 via-purple-400 to-violet-700"} shadow-2xl ${accent.glow}` : ""}`}>
                <div className={`w-full h-full rounded-[20px] border-4 ${accent ? "border-transparent" : "border-white dark:border-gray-900"} overflow-hidden bg-gray-100 dark:bg-gray-800 shadow-xl`}>
                  {profile.avatar_url ? (
                    <Image src={profile.avatar_url} alt={profile.username} width={128} height={128} className="object-cover w-full h-full" />
                  ) : (
                    <div className={`w-full h-full flex items-center justify-center text-3xl font-black ${accent ? `${accent.text} bg-gradient-to-br ${isFounder ? "from-amber-950 to-yellow-900" : "from-violet-950 to-purple-900"}` : "text-gray-400 bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30"}`}>
                      {profile.username?.[0]?.toUpperCase() || "?"}
                    </div>
                  )}
                </div>
                {/* Role icon badge on avatar */}
                {accent && (
                  <div className={`absolute -bottom-1.5 -right-1.5 w-7 h-7 rounded-full ${isFounder ? "bg-amber-500" : "bg-violet-600"} flex items-center justify-center shadow-lg border-2 border-white dark:border-gray-900`}>
                    {isFounder ? <Crown size={13} className="text-white" /> : <ShieldCheck size={13} className="text-white" />}
                  </div>
                )}
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2 sm:pb-2">
              {isOwnProfile ? (
                <>
                  <Link
                    href="/dash/profile"
                    className="flex items-center gap-1.5 px-4 py-2 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-bold text-sm rounded-xl transition-all border border-gray-200 dark:border-gray-700 shadow-sm"
                  >
                    Edit Profile
                  </Link>
                  <Link
                    href={`/resume/${profile.username}`}
                    target="_blank"
                    className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm rounded-xl transition-all shadow-md shadow-blue-500/20"
                  >
                    <Star size={13} /> Resume
                  </Link>
                </>
              ) : currentUserId ? (
                connectionStatus === "connected" ? (
                  <span className="flex items-center gap-1.5 px-4 py-2 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 font-bold text-sm rounded-xl border border-emerald-200 dark:border-emerald-800/50">
                    <CheckCircle2 size={14} /> Connected
                  </span>
                ) : connectionStatus === "pending_sent" ? (
                  <span className="flex items-center gap-1.5 px-4 py-2 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 font-bold text-sm rounded-xl border border-amber-200 dark:border-amber-800/50">
                    <Clock size={14} /> Request Sent
                  </span>
                ) : (
                  <button
                    onClick={handleConnect}
                    disabled={connectionProcessing}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 active:scale-95 disabled:opacity-60 text-white font-bold text-sm rounded-xl transition-all shadow-lg shadow-blue-500/20"
                  >
                    {connectionProcessing ? <Loader2 size={13} className="animate-spin" /> : <Users size={13} />}
                    Connect
                  </button>
                )
              ) : (
                <Link
                  href="/auth"
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm rounded-xl transition-all shadow-lg shadow-blue-500/20"
                >
                  <Users size={13} /> Connect
                </Link>
              )}
              <button
                onClick={copyProfileUrl}
                title="Share profile"
                className="p-2 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 rounded-xl transition-all border border-gray-200 dark:border-gray-700 shadow-sm"
              >
                <Share2 size={15} />
              </button>
            </div>
          </div>

          {/* Name + bio */}
          <div className="mb-5">

            {/* Admin / Founder identity strip */}
            {accent && (
              <div className={`flex items-center gap-2.5 mb-3 px-3 py-2 rounded-xl border bg-gradient-to-r ${accent.strip} w-fit`}>
                {isFounder
                  ? <Crown size={13} className="text-amber-400 shrink-0" />
                  : <ShieldCheck size={13} className="text-violet-400 shrink-0" />
                }
                <span className={`text-xs font-black uppercase tracking-widest ${accent.text}`}>
                  {isFounder ? "Platform Founder" : "Platform Admin"}
                </span>
                <Sparkles size={11} className={`${accent.text} opacity-60`} />
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h1 className={`text-2xl sm:text-3xl font-black tracking-tight ${accent ? `bg-gradient-to-r ${isFounder ? "from-amber-300 via-yellow-200 to-amber-400" : "from-violet-300 via-purple-200 to-violet-400"} bg-clip-text text-transparent` : "text-gray-900 dark:text-gray-100"}`}>
                {profile.full_name || `@${profile.username}`}
              </h1>
              {profile.is_verified && <VerifiedBadge size={22} />}
              {(profile.is_premium || profile.is_admin) && vis(profile, 'premium_badge') && <PremiumBadge size={20} isTrial={!!profile.is_trial_premium} />}
              {vis(profile, "work_status") && profile.work_status && profile.work_status !== "None" && (
                <span className={`text-[10px] font-black px-2.5 py-1 rounded-full border uppercase tracking-widest flex items-center gap-1 ${
                  profile.work_status === "Hiring"
                    ? "bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-800/50"
                    : (profile.work_status === "Open to Work" || profile.work_status === "Open to work")
                    ? "bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 border-green-200 dark:border-green-800/50"
                    : "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/50"
                }`}>
                  {(profile.work_status === "Open to Work" || profile.work_status === "Open to work") && <Wifi size={10} />}
                  {profile.work_status}
                </span>
              )}
            </div>

            {profile.full_name && (
              <p className="text-sm font-bold text-gray-400 dark:text-gray-500 mb-1">@{profile.username}</p>
            )}

            {vis(profile, "bio") && profile.status && (
              <p className="text-gray-600 dark:text-gray-400 text-sm sm:text-base leading-relaxed max-w-2xl mb-3">
                {profile.status}
              </p>
            )}

            {/* Meta pills */}
            <div className="flex flex-wrap gap-2 text-xs font-medium text-gray-500 dark:text-gray-400">
              {vis(profile, "location") && profile.location && (
                <span className="flex items-center gap-1.5 bg-gray-100 dark:bg-gray-800 px-2.5 py-1 rounded-lg border border-gray-200 dark:border-gray-700">
                  <MapPin size={11} className="text-gray-400" /> {profile.location}
                </span>
              )}
              {vis(profile, "website") && profile.website && (
                <a
                  href={profile.website.startsWith("http") ? profile.website : `https://${profile.website}`}
                  target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 bg-gray-100 dark:bg-gray-800 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-600 dark:hover:text-blue-400 px-2.5 py-1 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-blue-200 dark:hover:border-blue-800/50 transition-all"
                >
                  <Globe size={11} /> {profile.website.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                </a>
              )}
              {vis(profile, "github") && profile.github && (
                <a
                  href={`https://github.com/${profile.github.replace(/^@/, "")}`}
                  target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 px-2.5 py-1 rounded-lg border border-gray-200 dark:border-gray-700 transition-all"
                >
                  <GitBranch size={11} /> @{profile.github.replace(/^@/, "")}
                </a>
              )}
            </div>
          </div>

          {/* ══ STATS STRIP ══ */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
            {[
              { label: "Connections", value: stats.connections, icon: <Users size={18} />, color: "text-purple-500", bg: "bg-purple-50 dark:bg-purple-900/20", border: "border-purple-200 dark:border-purple-800/30" },
              { label: "Courses Done", value: stats.coursesCompleted, icon: <BookOpen size={18} />, color: "text-blue-500", bg: "bg-blue-50 dark:bg-blue-900/20", border: "border-blue-200 dark:border-blue-800/30" },
              { label: "Certificates", value: stats.certificates, icon: <Award size={18} />, color: "text-amber-500", bg: "bg-amber-50 dark:bg-amber-900/20", border: "border-amber-200 dark:border-amber-800/30" },
              { label: "Posts", value: stats.posts, icon: <MessageSquare size={18} />, color: "text-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-900/20", border: "border-emerald-200 dark:border-emerald-800/30" },
            ].map((s) => (
              <div key={s.label} className={`flex items-center gap-3 p-4 bg-white dark:bg-gray-900 border ${accent ? accent.statBorder : s.border} rounded-2xl shadow-sm hover:shadow-md transition-all ${accent ? `hover:${accent.glow}` : ""}`}>
                <div className={`w-10 h-10 rounded-xl ${accent ? accent.bgMuted : s.bg} ${accent ? accent.text : s.color} flex items-center justify-center shrink-0`}>
                  {s.icon}
                </div>
                <div className="min-w-0">
                  <div className={`text-xl font-black leading-none ${accent ? `bg-gradient-to-r ${isFounder ? "from-amber-400 to-yellow-300" : "from-violet-400 to-purple-300"} bg-clip-text text-transparent` : "text-gray-900 dark:text-gray-100"}`}>{s.value}</div>
                  <div className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mt-0.5 truncate">{s.label}</div>
                </div>
              </div>
            ))}
          </div>

          {/* ══ SKILLS CLOUD ══ */}
          {profile.skills?.length > 0 && (
            <div className="mb-8">
              <h2 className="font-black text-xs uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-3">Skills</h2>
              <div className="flex flex-wrap gap-2">
                {profile.skills.map(skill => {
                  const count = endorsements[skill]?.length || 0;
                  const endorsed = endorsements[skill]?.includes(currentUserId);
                  return (
                    <button
                      key={skill}
                      onClick={() => handleEndorse(skill)}
                      disabled={!currentUserId || isOwnProfile || endorsing === skill}
                      title={currentUserId && !isOwnProfile ? (endorsed ? "Remove endorsement" : "Endorse this skill") : undefined}
                      className={`group flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl border transition-all ${
                        endorsed
                          ? "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800/50 text-blue-700 dark:text-blue-400"
                          : "bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300 hover:border-blue-200 dark:hover:border-blue-800/50 hover:text-blue-600 dark:hover:text-blue-400"
                      } ${!currentUserId || isOwnProfile ? "cursor-default" : "cursor-pointer"}`}
                    >
                      {endorsing === skill ? <Loader2 size={10} className="animate-spin" /> : null}
                      {skill}
                      {count > 0 && (
                        <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${endorsed ? "bg-blue-100 dark:bg-blue-800/50 text-blue-600 dark:text-blue-300" : "bg-gray-100 dark:bg-gray-800 text-gray-500"}`}>
                          {count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
              {currentUserId && !isOwnProfile && (
                <p className="text-[10px] text-gray-400 dark:text-gray-600 mt-2">Click a skill to endorse it</p>
              )}
            </div>
          )}

          {/* ══ MAIN CONTENT GRID ══ */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 pb-16">

            {/* ── LEFT: Certificates + Portfolio ── */}
            {vis(profile, "certificates") && (
              <div className="lg:col-span-3 space-y-6">
                <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden shadow-sm">
                  {/* Section header */}
                  <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/30 flex items-center justify-center">
                        <Award size={16} className="text-amber-500" />
                      </div>
                      <h2 className="font-black text-gray-900 dark:text-gray-100 text-base">Certificates</h2>
                    </div>
                    <span className="text-xs font-black text-gray-400 bg-gray-100 dark:bg-gray-800 px-2.5 py-1 rounded-full">
                      {certificates.length}
                    </span>
                  </div>

                  {certificates.length === 0 ? (
                    <div className="flex flex-col items-center py-12 text-center px-6">
                      <div className="w-12 h-12 rounded-2xl bg-gray-50 dark:bg-gray-800 flex items-center justify-center mb-3">
                        <Award size={24} className="text-gray-300 dark:text-gray-600" />
                      </div>
                      <p className="text-sm font-medium text-gray-400 dark:text-gray-500">No certificates yet</p>
                    </div>
                  ) : (
                    <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {certificates.map((cert) => (
                        <Link
                          key={cert.id}
                          href={`/certificate/${cert.id}`}
                          className="group relative overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700 hover:border-amber-400 dark:hover:border-amber-500/60 transition-all hover:shadow-lg hover:shadow-amber-500/10 bg-gradient-to-br from-white to-gray-50 dark:from-gray-900 dark:to-gray-800"
                        >
                          {/* Decorative top band */}
                          <div className={`h-1.5 w-full bg-gradient-to-r ${levelColor(cert.courses?.level)}`} />
                          <div className="p-4">
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-yellow-500 flex items-center justify-center shadow-sm shrink-0">
                                <Award size={15} className="text-white" />
                              </div>
                              <ExternalLink size={13} className="text-gray-300 dark:text-gray-600 group-hover:text-amber-500 transition-colors mt-1 shrink-0" />
                            </div>
                            <p className="text-sm font-bold text-gray-800 dark:text-gray-200 leading-snug mb-1 line-clamp-2">
                              {cert.courses?.title ?? "Course Certificate"}
                            </p>
                            <div className="flex items-center gap-2 flex-wrap">
                              {cert.courses?.category && (
                                <span className="text-[9px] font-black uppercase tracking-widest text-blue-500 bg-blue-50 dark:bg-blue-900/20 px-2 py-0.5 rounded-md border border-blue-100 dark:border-blue-800/30">
                                  {cert.courses.category}
                                </span>
                              )}
                              {cert.courses?.level && (
                                <span className="text-[9px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500">
                                  {cert.courses.level}
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-2 font-medium">
                              Issued {new Date(cert.issued_at).toLocaleDateString("en", { month: "short", day: "numeric", year: "numeric" })}
                            </p>
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>

                {/* Portfolio Projects */}
                {portfolioProjects.length > 0 && (
                  <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden shadow-sm">
                    <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-800/30 flex items-center justify-center">
                          <FolderGit2 size={15} className="text-violet-500" />
                        </div>
                        <h2 className="font-black text-gray-900 dark:text-gray-100 text-base">Portfolio</h2>
                      </div>
                      <span className="text-xs font-black text-gray-400 bg-gray-100 dark:bg-gray-800 px-2.5 py-1 rounded-full">{portfolioProjects.length}</span>
                    </div>
                    <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {portfolioProjects.map(proj => (
                        <div key={proj.id} className="group rounded-xl border border-gray-200 dark:border-gray-700 hover:border-violet-300 dark:hover:border-violet-700/50 transition-all bg-gradient-to-br from-white to-gray-50 dark:from-gray-900 dark:to-gray-800 p-4 hover:shadow-md">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <p className="text-sm font-bold text-gray-800 dark:text-gray-200 leading-snug line-clamp-1">{proj.title}</p>
                            <div className="flex items-center gap-1 shrink-0">
                              {proj.github_url && (
                                <a href={proj.github_url} target="_blank" rel="noreferrer" className="p-1 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors">
                                  <GitBranch size={12} />
                                </a>
                              )}
                              {proj.live_url && (
                                <a href={proj.live_url} target="_blank" rel="noreferrer" className="p-1 text-gray-400 hover:text-blue-500 transition-colors">
                                  <ExternalLink size={12} />
                                </a>
                              )}
                            </div>
                          </div>
                          {proj.description && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed line-clamp-2 mb-2">{proj.description}</p>
                          )}
                          {proj.tags?.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {proj.tags.slice(0, 3).map(tag => (
                                <span key={tag} className="text-[9px] font-black uppercase tracking-widest text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-900/20 px-2 py-0.5 rounded-md border border-violet-100 dark:border-violet-800/30">
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── RIGHT: Posts + Info ── */}
            <div className={`space-y-6 ${vis(profile, "certificates") ? "lg:col-span-2" : "lg:col-span-5"}`}>

              {/* Recent Posts */}
              {vis(profile, "posts") && (
                <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden shadow-sm">
                  <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/30 flex items-center justify-center">
                        <MessageSquare size={15} className="text-blue-500" />
                      </div>
                      <h2 className="font-black text-gray-900 dark:text-gray-100 text-base">Recent Posts</h2>
                    </div>
                    <span className="text-xs font-black text-gray-400 bg-gray-100 dark:bg-gray-800 px-2.5 py-1 rounded-full">{stats.posts}</span>
                  </div>

                  {recentPosts.length === 0 ? (
                    <div className="flex flex-col items-center py-10 text-center px-6">
                      <MessageSquare size={22} className="text-gray-300 dark:text-gray-600 mb-2" />
                      <p className="text-sm font-medium text-gray-400 dark:text-gray-500">No posts yet</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-100 dark:divide-gray-800">
                      {recentPosts.map((post) => (
                        <div key={post.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group cursor-pointer">
                          {post.code_snippet && (
                            <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-blue-500 bg-blue-50 dark:bg-blue-900/20 px-2 py-0.5 rounded-md border border-blue-100 dark:border-blue-800/30 mb-2">
                              <Code size={9} /> Code
                            </span>
                          )}
                          {post.title && (
                            <p className="text-sm font-bold text-gray-900 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-1 mb-1">
                              {post.title}
                            </p>
                          )}
                          {post.content && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 leading-relaxed mb-2">
                              {post.content}
                            </p>
                          )}
                          <div className="flex items-center gap-3 text-[10px] text-gray-400 dark:text-gray-500 font-medium">
                            <span className="flex items-center gap-1">
                              <Heart size={10} /> {post.likes?.length || 0}
                            </span>
                            <span className="flex items-center gap-1">
                              <MessageSquare size={10} /> {post.comments?.length || 0}
                            </span>
                            <span className="ml-auto">{timeAgo(post.created_at)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* About card */}
              <div className={`bg-white dark:bg-gray-900 border ${accent ? accent.statBorder : "border-gray-200 dark:border-gray-800"} rounded-2xl p-5 shadow-sm space-y-3`}>
                <h3 className={`font-black text-sm uppercase tracking-widest ${accent ? accent.text : "text-gray-900 dark:text-gray-100"}`}>About</h3>
                <div className="space-y-2.5 text-sm text-gray-600 dark:text-gray-400">
                  {vis(profile, "work_status") && profile.work_status && profile.work_status !== "None" && (
                    <div className="flex items-center gap-2">
                      <Briefcase size={14} className="text-gray-400 shrink-0" />
                      <span className="font-medium">{profile.work_status}</span>
                    </div>
                  )}
                  {vis(profile, "location") && profile.location && (
                    <div className="flex items-center gap-2">
                      <MapPin size={14} className="text-gray-400 shrink-0" />
                      <span className="truncate">{profile.location}</span>
                    </div>
                  )}
                  {vis(profile, "website") && profile.website && (
                    <div className="flex items-center gap-2 min-w-0">
                      <Globe size={14} className="text-gray-400 shrink-0" />
                      <a
                        href={profile.website.startsWith("http") ? profile.website : `https://${profile.website}`}
                        target="_blank" rel="noopener noreferrer"
                        className="text-blue-500 hover:text-blue-600 transition-colors truncate font-medium text-xs"
                      >
                        {profile.website.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                      </a>
                    </div>
                  )}
                  {vis(profile, "github") && profile.github && (
                    <div className="flex items-center gap-2 min-w-0">
                      <GitBranch size={14} className="text-gray-400 shrink-0" />
                      <a
                        href={`https://github.com/${profile.github.replace(/^@/, "")}`}
                        target="_blank" rel="noopener noreferrer"
                        className="text-gray-700 dark:text-gray-300 hover:text-blue-600 transition-colors truncate font-medium text-xs"
                      >
                        github.com/{profile.github.replace(/^@/, "")}
                      </a>
                    </div>
                  )}
                  {!vis(profile, "location") && !vis(profile, "website") && !vis(profile, "github") && !vis(profile, "work_status") && (
                    <p className="text-xs text-gray-400 italic">No details shared publicly.</p>
                  )}
                </div>
              </div>

              {/* GitHub Stats Card */}
              {vis(profile, "github") && profile.github && (
                <GitHubStats githubField={profile.github} />
              )}
            </div>
          </div>

          {/* ══ CTA for guests ══ */}
          {!currentUserId && (
            <div className="mb-16 bg-gradient-to-br from-blue-600 via-blue-600 to-indigo-700 rounded-3xl p-8 text-center text-white shadow-2xl shadow-blue-500/25 overflow-hidden relative">
              <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
              <div className="absolute bottom-0 left-0 w-28 h-28 bg-black/10 rounded-full translate-y-1/2 -translate-x-1/2" />
              <div className="relative z-10">
                <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center mx-auto mb-4">
                  <Terminal size={24} className="text-white" />
                </div>
                <h3 className="text-xl font-black mb-2">Join beoneofus</h3>
                <p className="text-sm text-white/80 mb-5 max-w-sm mx-auto">
                  Connect with @{profile.username} and thousands of developers building the future.
                </p>
                <Link
                  href="/auth"
                  className="inline-block bg-white text-blue-700 font-black px-6 py-3 rounded-xl hover:bg-blue-50 active:scale-95 transition-all shadow-lg text-sm"
                >
                  Create Free Account
                </Link>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
