"use client";

import { useState, useEffect } from "react";
import { Trophy, Award, Star, Loader2, Medal, Crown, Users, TrendingUp, BookOpen } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { supabase } from "../../supabaseClient";

const MEDAL_COLORS = ["text-yellow-500", "text-gray-400", "text-orange-600"];
const MEDAL_BG    = ["bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800/30",
                      "bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700",
                      "bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800/30"];

function timeAgo(d) {
  if (!d) return "";
  const days = Math.floor((Date.now() - new Date(d).getTime()) / 86400000);
  if (days === 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 30) return `${days}d ago`;
  return new Date(d).toLocaleDateString("en", { month: "short", year: "numeric" });
}

export default function LeaderboardContent() {
  const [tab, setTab] = useState("pathways");
  const [pathwayLeaders, setPathwayLeaders] = useState([]);
  const [topUsers, setTopUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const [pathwayRes, usersRes] = await Promise.all([
        fetch("/api/pathways?leaderboard=true").then(r => r.json()),
        supabase
          .from("profiles")
          .select("id, username, full_name, avatar_url, is_verified, is_premium")
          .order("id", { ascending: true })
          .limit(50)
          .then(async ({ data: users }) => {
            if (!users) return [];
            // Attach cert counts
            const withCerts = await Promise.all(
              users.map(async u => {
                const { count } = await supabase
                  .from("user_certificates")
                  .select("id", { count: "exact", head: true })
                  .eq("user_id", u.id);
                return { ...u, certCount: count || 0 };
              })
            );
            return withCerts.sort((a, b) => b.certCount - a.certCount).slice(0, 20);
          }),
      ]);
      setPathwayLeaders(pathwayRes.leaderboard || []);
      setTopUsers(usersRes);
      setLoading(false);
    };
    load();
  }, []);

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12 animate-in fade-in duration-300">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-3xl border border-amber-200 dark:border-amber-800/50 bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 dark:from-amber-950/20 dark:via-orange-950/20 dark:to-transparent p-8">
        <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-amber-200/30 dark:bg-amber-500/10" />
        <div className="relative flex items-center gap-4">
          <div className="w-14 h-14 bg-amber-500 rounded-2xl flex items-center justify-center shadow-lg shadow-amber-500/30 shrink-0">
            <Trophy size={26} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">Leaderboard</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 font-medium mt-0.5">
              Top members by pathways completed and certificates earned.
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {[
          { id: "pathways", label: "Pathway Completions", icon: TrendingUp },
          { id: "certificates", label: "Top Certificates", icon: Award },
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              tab === id
                ? "bg-amber-500 text-white shadow-md shadow-amber-500/20"
                : "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
            }`}
          >
            <Icon size={13} /> {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 size={24} className="animate-spin text-amber-500" />
        </div>
      ) : tab === "pathways" ? (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden shadow-sm">
          <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800">
            <h2 className="font-black text-sm text-gray-900 dark:text-white">Pathway Completions</h2>
            <p className="text-xs text-gray-500 mt-0.5">{pathwayLeaders.length} recorded completions</p>
          </div>
          {pathwayLeaders.length === 0 ? (
            <div className="py-16 text-center text-gray-400 dark:text-gray-600">
              <Trophy size={32} className="mx-auto mb-3 opacity-30" />
              <p className="font-bold text-sm">No completions yet</p>
              <p className="text-xs mt-1">Be the first to finish a pathway!</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {pathwayLeaders.map((entry, i) => {
                const profile = entry.profiles;
                const initial = profile?.username?.[0]?.toUpperCase() || "U";
                return (
                  <div key={entry.id || i} className={`flex items-center gap-4 px-5 py-4 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50 ${i < 3 ? MEDAL_BG[i] + " border-l-4" : ""}`}>
                    <div className="w-8 text-center shrink-0">
                      {i < 3 ? (
                        <Medal size={20} className={MEDAL_COLORS[i]} fill="currentColor" strokeWidth={0} />
                      ) : (
                        <span className="text-sm font-black text-gray-400">#{i + 1}</span>
                      )}
                    </div>
                    <div className="relative w-9 h-9 rounded-xl overflow-hidden bg-gradient-to-br from-blue-500 to-indigo-500 shrink-0 flex items-center justify-center">
                      {profile?.avatar_url ? (
                        <Image src={profile.avatar_url} alt="" fill sizes="36px" className="object-cover" />
                      ) : (
                        <span className="text-white font-black text-sm">{initial}</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <Link href={`/u/${profile?.username}`} className="font-black text-sm text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                        @{profile?.username}
                      </Link>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{entry.pathways?.title}</p>
                    </div>
                    <span className="text-[10px] font-bold text-gray-400 shrink-0">{timeAgo(entry.completed_at)}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden shadow-sm">
          <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800">
            <h2 className="font-black text-sm text-gray-900 dark:text-white">Top Certificate Earners</h2>
          </div>
          {topUsers.length === 0 ? (
            <div className="py-16 text-center text-gray-400 dark:text-gray-600">
              <Award size={32} className="mx-auto mb-3 opacity-30" />
              <p className="font-bold text-sm">No data yet</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {topUsers.map((u, i) => {
                const initial = u.username?.[0]?.toUpperCase() || "U";
                return (
                  <div key={u.id} className={`flex items-center gap-4 px-5 py-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors ${i < 3 ? MEDAL_BG[i] + " border-l-4" : ""}`}>
                    <div className="w-8 text-center shrink-0">
                      {i < 3 ? (
                        <Medal size={20} className={MEDAL_COLORS[i]} fill="currentColor" strokeWidth={0} />
                      ) : (
                        <span className="text-sm font-black text-gray-400">#{i + 1}</span>
                      )}
                    </div>
                    <div className="relative w-9 h-9 rounded-xl overflow-hidden bg-gradient-to-br from-amber-500 to-orange-500 shrink-0 flex items-center justify-center">
                      {u.avatar_url ? (
                        <Image src={u.avatar_url} alt="" fill sizes="36px" className="object-cover" />
                      ) : (
                        <span className="text-white font-black text-sm">{initial}</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <Link href={`/u/${u.username}`} className="font-black text-sm text-gray-900 dark:text-white hover:text-amber-600 dark:hover:text-amber-400 transition-colors">
                        @{u.username}
                      </Link>
                      {u.full_name && <p className="text-xs text-gray-500 truncate">{u.full_name}</p>}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Award size={13} className="text-amber-500" />
                      <span className="text-sm font-black text-gray-700 dark:text-gray-300">{u.certCount}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
