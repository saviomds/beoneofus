"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  MapPin, Globe, GitBranch, Users, BookOpen, Award,
  Activity, Terminal, ExternalLink, Briefcase, Share2,
  CheckCircle2, Clock, Star, ArrowLeft, Loader2, Copy, Check
} from "lucide-react";
import { supabase } from "../../supabaseClient";

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
  return new Date(dateStr).toLocaleDateString();
}

const ACTIVITY_ICONS = {
  course_started: <BookOpen size={14} className="text-blue-500" />,
  course_completed: <CheckCircle2 size={14} className="text-emerald-500" />,
  lesson_completed: <CheckCircle2 size={14} className="text-emerald-400" />,
  post_liked: <Star size={14} className="text-amber-500" />,
  connection_made: <Users size={14} className="text-purple-500" />,
  certificate_earned: <Award size={14} className="text-yellow-500" />,
  project_created: <Terminal size={14} className="text-gray-500" />,
  default: <Activity size={14} className="text-gray-400" />,
};

export default function PublicProfilePage() {
  const params = useParams();
  const router = useRouter();
  const username = params.username;

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [copied, setCopied] = useState(false);

  const [stats, setStats] = useState({
    connections: 0,
    coursesCompleted: 0,
    certificates: 0,
    posts: 0,
  });
  const [certificates, setCertificates] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
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

      if (error || !profileData) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      setProfile(profileData);

      const [
        connectionsRes,
        coursesRes,
        certsRes,
        postsRes,
        activityRes,
      ] = await Promise.all([
        supabase
          .from("connections")
          .select("id", { count: "exact", head: true })
          .eq("status", "accepted")
          .or(`requester_id.eq.${profileData.id},receiver_id.eq.${profileData.id}`),
        supabase
          .from("user_course_progress")
          .select("id", { count: "exact", head: true })
          .eq("user_id", profileData.id)
          .eq("status", "completed"),
        supabase
          .from("user_certificates")
          .select("id, issued_at, courses(title, category, level)")
          .eq("user_id", profileData.id)
          .order("issued_at", { ascending: false })
          .limit(6),
        supabase
          .from("posts")
          .select("id", { count: "exact", head: true })
          .eq("user_id", profileData.id),
        supabase
          .from("user_activity")
          .select("*")
          .eq("user_id", profileData.id)
          .order("created_at", { ascending: false })
          .limit(12),
      ]);

      setStats({
        connections: connectionsRes.count ?? 0,
        coursesCompleted: coursesRes.count ?? 0,
        certificates: certsRes.data?.length ?? 0,
        posts: postsRes.count ?? 0,
      });

      if (certsRes.data) setCertificates(certsRes.data);
      if (activityRes.data) setRecentActivity(activityRes.data);

      if (session && profileData.id !== session.user.id) {
        const { data: conn } = await supabase
          .from("connections")
          .select("id, status, requester_id")
          .or(
            `and(requester_id.eq.${session.user.id},receiver_id.eq.${profileData.id}),and(requester_id.eq.${profileData.id},receiver_id.eq.${session.user.id})`
          )
          .maybeSingle();

        if (conn) {
          setConnectionStatus(
            conn.status === "accepted"
              ? "connected"
              : conn.requester_id === session.user.id
              ? "pending_sent"
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
      await supabase.from("connections").insert({
        requester_id: currentUserId,
        receiver_id: profile.id,
        status: "pending",
      });
      await supabase.from("notifications").insert({
        receiver_id: profile.id,
        actor_id: currentUserId,
        type: "connection_request",
        content: "sent you a connection request",
      });
      setConnectionStatus("pending_sent");
    } catch (_) {}
    setConnectionProcessing(false);
  };

  const copyProfileUrl = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-black flex items-center justify-center">
        <Loader2 className="animate-spin text-blue-500" size={32} />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-black flex flex-col items-center justify-center p-6 text-center">
        <Terminal size={48} className="text-gray-300 dark:text-gray-700 mb-4" />
        <h1 className="text-2xl font-black text-gray-900 dark:text-gray-100 mb-2">
          Profile not found
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mb-6">
          @{username} doesn&apos;t exist on beoneofus.
        </p>
        <Link
          href="/"
          className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-xl font-bold transition-all shadow-lg shadow-blue-500/20"
        >
          Go to beoneofus
        </Link>
      </div>
    );
  }

  const isOwnProfile = currentUserId === profile?.id;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black text-gray-900 dark:text-gray-100">
      {/* Topbar */}
      <nav className="fixed top-0 w-full border-b border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl z-50">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link
            href="/"
            className="font-black text-xl tracking-tighter flex items-center gap-2 text-gray-900 dark:text-gray-100"
          >
            <Terminal className="text-blue-500" size={22} />
            beone<span className="text-blue-600">of</span>us
          </Link>
          <div className="flex items-center gap-3">
            <button
              onClick={copyProfileUrl}
              className="flex items-center gap-2 text-sm font-bold text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 bg-gray-100 dark:bg-gray-800 px-3 py-2 rounded-xl transition-colors"
            >
              {copied ? <Check size={15} className="text-emerald-500" /> : <Copy size={15} />}
              {copied ? "Copied!" : "Share"}
            </button>
            {currentUserId ? (
              <Link
                href="/dash"
                className="text-sm font-bold text-white bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded-xl transition-colors"
              >
                Dashboard
              </Link>
            ) : (
              <Link
                href="/auth"
                className="text-sm font-bold text-white bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded-xl transition-colors"
              >
                Join beoneofus
              </Link>
            )}
          </div>
        </div>
      </nav>

      <main className="pt-16 max-w-4xl mx-auto px-4 pb-20">
        {/* Banner */}
        <div className="relative h-40 sm:h-52 rounded-b-3xl overflow-hidden bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-700">
          {profile.banner_url && (
            <Image
              src={profile.banner_url}
              alt="Profile banner"
              fill
              className="object-cover"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
        </div>

        {/* Avatar + Info */}
        <div className="px-4 sm:px-6 -mt-14 relative z-10">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6">
            <div className="flex items-end gap-4">
              <div className="w-24 h-24 rounded-3xl border-4 border-white dark:border-gray-900 overflow-hidden bg-gray-200 dark:bg-gray-700 shrink-0 shadow-xl">
                {profile.avatar_url ? (
                  <Image
                    src={profile.avatar_url}
                    alt={profile.username}
                    width={96}
                    height={96}
                    className="object-cover w-full h-full"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-2xl font-black text-gray-500 dark:text-gray-400">
                    {profile.username?.[0]?.toUpperCase() || "?"}
                  </div>
                )}
              </div>
              <div className="mb-1">
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-black text-gray-900 dark:text-gray-100">
                    @{profile.username}
                  </h1>
                  {profile.is_admin && (
                    <span className="text-[10px] font-bold px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full border border-blue-200 dark:border-blue-800/50">
                      Admin
                    </span>
                  )}
                </div>
                {profile.work_status && (
                  <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800/50">
                    {profile.work_status}
                  </span>
                )}
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2 sm:mb-1">
              {isOwnProfile ? (
                <Link
                  href="/dash/profile"
                  className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-bold text-sm rounded-xl transition-colors border border-gray-200 dark:border-gray-700"
                >
                  Edit Profile
                </Link>
              ) : currentUserId ? (
                connectionStatus === "connected" ? (
                  <span className="flex items-center gap-1.5 px-4 py-2 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 font-bold text-sm rounded-xl border border-emerald-200 dark:border-emerald-800/50">
                    <CheckCircle2 size={15} /> Connected
                  </span>
                ) : connectionStatus === "pending_sent" ? (
                  <span className="flex items-center gap-1.5 px-4 py-2 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 font-bold text-sm rounded-xl border border-amber-200 dark:border-amber-800/50">
                    <Clock size={15} /> Request Sent
                  </span>
                ) : (
                  <button
                    onClick={handleConnect}
                    disabled={connectionProcessing}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white font-bold text-sm rounded-xl transition-all shadow-lg shadow-blue-500/20"
                  >
                    {connectionProcessing ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Users size={14} />
                    )}
                    Connect
                  </button>
                )
              ) : (
                <Link
                  href="/auth"
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm rounded-xl transition-all shadow-lg shadow-blue-500/20"
                >
                  <Users size={14} /> Connect
                </Link>
              )}
              <button
                onClick={copyProfileUrl}
                title="Share profile"
                className="p-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-xl transition-colors border border-gray-200 dark:border-gray-700"
              >
                <Share2 size={16} />
              </button>
            </div>
          </div>

          {/* Bio */}
          {profile.status && (
            <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed mb-4 max-w-2xl">
              {profile.status}
            </p>
          )}

          {/* Meta info */}
          <div className="flex flex-wrap gap-3 text-xs font-medium text-gray-500 dark:text-gray-400 mb-6">
            {profile.location && (
              <span className="flex items-center gap-1.5">
                <MapPin size={13} /> {profile.location}
              </span>
            )}
            {profile.website && (
              <a
                href={profile.website.startsWith("http") ? profile.website : `https://${profile.website}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 hover:text-blue-500 transition-colors"
              >
                <Globe size={13} /> {profile.website.replace(/^https?:\/\//, "")}
              </a>
            )}
            {profile.github && (
              <a
                href={`https://github.com/${profile.github.replace(/^@/, "")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 hover:text-blue-500 transition-colors"
              >
                <GitBranch size={13} /> {profile.github}
              </a>
            )}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-3 mb-8">
            {[
              { label: "Connections", value: stats.connections, icon: <Users size={16} className="text-purple-500" /> },
              { label: "Courses", value: stats.coursesCompleted, icon: <BookOpen size={16} className="text-blue-500" /> },
              { label: "Certificates", value: stats.certificates, icon: <Award size={16} className="text-yellow-500" /> },
              { label: "Posts", value: stats.posts, icon: <Briefcase size={16} className="text-emerald-500" /> },
            ].map((s) => (
              <div
                key={s.label}
                className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-3 sm:p-4 text-center shadow-sm"
              >
                <div className="flex justify-center mb-1">{s.icon}</div>
                <div className="text-xl sm:text-2xl font-black text-gray-900 dark:text-gray-100">
                  {s.value}
                </div>
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  {s.label}
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Certificates */}
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <Award size={18} className="text-yellow-500" />
                <h2 className="font-black text-gray-900 dark:text-gray-100 text-base">
                  Certificates
                </h2>
                <span className="ml-auto text-xs font-bold text-gray-400">
                  {certificates.length}
                </span>
              </div>
              {certificates.length === 0 ? (
                <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-4">
                  No certificates yet.
                </p>
              ) : (
                <div className="space-y-2">
                  {certificates.map((cert) => (
                    <Link
                      key={cert.id}
                      href={`/certificate/${cert.id}`}
                      className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-yellow-50 to-amber-50 dark:from-yellow-900/10 dark:to-amber-900/10 border border-yellow-200/60 dark:border-yellow-800/30 hover:border-yellow-400 dark:hover:border-yellow-600 transition-all group"
                    >
                      <Award size={18} className="text-yellow-500 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-gray-800 dark:text-gray-200 truncate">
                          {cert.courses?.title ?? "Course"}
                        </p>
                        <p className="text-[10px] text-gray-400">
                          {cert.courses?.category} · {new Date(cert.issued_at).toLocaleDateString()}
                        </p>
                      </div>
                      <ExternalLink
                        size={14}
                        className="ml-auto text-gray-300 group-hover:text-yellow-500 shrink-0 transition-colors"
                      />
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Recent Activity */}
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <Activity size={18} className="text-blue-500" />
                <h2 className="font-black text-gray-900 dark:text-gray-100 text-base">
                  Recent Activity
                </h2>
              </div>
              {recentActivity.length === 0 ? (
                <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-4">
                  No recent activity.
                </p>
              ) : (
                <div className="space-y-3">
                  {recentActivity.map((act) => (
                    <div key={act.id} className="flex items-start gap-3">
                      <div className="mt-0.5 w-6 h-6 rounded-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center justify-center shrink-0">
                        {ACTIVITY_ICONS[act.type] ?? ACTIVITY_ICONS.default}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-gray-700 dark:text-gray-300 leading-snug">
                          {act.content}
                        </p>
                        <p className="text-[10px] text-gray-400 mt-0.5">
                          {timeAgo(act.created_at)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* CTA for non-members */}
          {!currentUserId && (
            <div className="mt-8 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl p-6 text-center text-white shadow-xl shadow-blue-500/20">
              <Terminal size={32} className="mx-auto mb-3 text-white/80" />
              <h3 className="text-xl font-black mb-2">Join beoneofus</h3>
              <p className="text-sm text-white/80 mb-4">
                The developer network. Connect with @{profile.username} and thousands of developers.
              </p>
              <Link
                href="/auth"
                className="inline-block bg-white text-blue-700 font-black px-6 py-3 rounded-xl hover:bg-blue-50 transition-colors shadow-lg"
              >
                Create Free Account
              </Link>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
