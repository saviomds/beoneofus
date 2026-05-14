"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  MapPin, Globe, GitBranch, Users, BookOpen, Award,
  Terminal, Briefcase, Share2, CheckCircle2, Clock,
  ArrowLeft, Loader2, Copy, Check, MessageSquare,
  Heart, Code, ExternalLink, BadgeCheck, Zap, Star,
  Eye, EyeOff
} from "lucide-react";
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
  work_status: true, certificates: true, posts: true,
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
  const [connectionStatus, setConnectionStatus] = useState("none");
  const [connectionProcessing, setConnectionProcessing] = useState(false);

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) setCurrentUserId(session.user.id);

      const { data: profileData, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("username", username)
        .single();

      if (error || !profileData) { setNotFound(true); setLoading(false); return; }
      setProfile(profileData);

      const [connCountRes, coursesRes, certsRes, postsRes, recentPostsRes] = await Promise.all([
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
      ]);

      setStats({
        connections: connCountRes.count ?? 0,
        coursesCompleted: coursesRes.count ?? 0,
        certificates: certsRes.data?.length ?? 0,
        posts: postsRes.count ?? 0,
      });

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
      setLoading(false);
    };

    if (username) init();
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
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-blue-500 to-indigo-700">
              {/* Grid pattern overlay */}
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
              <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-3xl border-4 border-white dark:border-gray-900 overflow-hidden bg-gray-100 dark:bg-gray-800 shrink-0 shadow-2xl ring-1 ring-black/5">
                {profile.avatar_url ? (
                  <Image src={profile.avatar_url} alt={profile.username} width={128} height={128} className="object-cover w-full h-full" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-3xl font-black text-gray-400 bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30">
                    {profile.username?.[0]?.toUpperCase() || "?"}
                  </div>
                )}
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2 sm:pb-2">
              {isOwnProfile ? (
                <Link
                  href="/dash/profile"
                  className="flex items-center gap-1.5 px-4 py-2 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-bold text-sm rounded-xl transition-all border border-gray-200 dark:border-gray-700 shadow-sm"
                >
                  Edit Profile
                </Link>
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
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-gray-900 dark:text-gray-100">
                {profile.full_name || `@${profile.username}`}
              </h1>
              {profile.is_verified && <VerifiedBadge size={22} />}
              {(profile.is_premium || profile.is_admin) && <PremiumBadge size={20} />}
              {profile.is_admin && (
                <span className="text-[10px] font-black px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full border border-blue-200 dark:border-blue-800/50 uppercase tracking-widest">
                  Admin
                </span>
              )}
              {vis(profile, "work_status") && profile.work_status && profile.work_status !== "None" && (
                <span className={`text-[10px] font-black px-2.5 py-1 rounded-full border uppercase tracking-widest ${
                  profile.work_status === "Hiring"
                    ? "bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-800/50"
                    : "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/50"
                }`}>
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
              <div key={s.label} className={`flex items-center gap-3 p-4 bg-white dark:bg-gray-900 border ${s.border} rounded-2xl shadow-sm hover:shadow-md transition-all`}>
                <div className={`w-10 h-10 rounded-xl ${s.bg} ${s.color} flex items-center justify-center shrink-0`}>
                  {s.icon}
                </div>
                <div className="min-w-0">
                  <div className="text-xl font-black text-gray-900 dark:text-gray-100 leading-none">{s.value}</div>
                  <div className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mt-0.5 truncate">{s.label}</div>
                </div>
              </div>
            ))}
          </div>

          {/* ══ MAIN CONTENT GRID ══ */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 pb-16">

            {/* ── LEFT: Certificates (wider) ── */}
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
              <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5 shadow-sm space-y-3">
                <h3 className="font-black text-gray-900 dark:text-gray-100 text-sm uppercase tracking-widest">About</h3>
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
