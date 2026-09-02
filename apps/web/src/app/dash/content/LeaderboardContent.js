"use client";

import { useState, useEffect } from "react";
import { Trophy, Loader2, Medal } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useLanguage } from "../../../lib/i18n";

const MEDAL_COLORS = ["text-yellow-500", "text-gray-400", "text-orange-600"];
const MEDAL_BG    = ["bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800/30",
                      "bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700",
                      "bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800/30"];

function timeAgo(d, t) {
  if (!d) return "";
  const days = Math.floor((Date.now() - new Date(d).getTime()) / 86400000);
  if (days === 0) return t("leaderboard.today");
  if (days === 1) return t("leaderboard.yesterday");
  if (days < 30) return t("leaderboard.days_ago", { n: days });
  return new Date(d).toLocaleDateString("en", { month: "short", year: "numeric" });
}

export default function LeaderboardContent() {
  const { t } = useLanguage();
  const [pathwayLeaders, setPathwayLeaders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/pathways?leaderboard=true").then(r => r.json());
        setPathwayLeaders(res.leaderboard || []);
      } catch {
        setPathwayLeaders([]);
      }
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
            <h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">{t("leaderboard.title")}</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 font-medium mt-0.5">
              {t("leaderboard.subtitle")}
            </p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 size={24} className="animate-spin text-amber-500" />
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden shadow-sm">
          <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800">
            <h2 className="font-black text-sm text-gray-900 dark:text-white">{t("leaderboard.tab_pathways")}</h2>
            <p className="text-xs text-gray-500 mt-0.5">{t("leaderboard.recorded_completions", { n: pathwayLeaders.length })}</p>
          </div>
          {pathwayLeaders.length === 0 ? (
            <div className="py-16 text-center text-gray-400 dark:text-gray-600">
              <Trophy size={32} className="mx-auto mb-3 opacity-30" />
              <p className="font-bold text-sm">{t("leaderboard.empty_pathways_title")}</p>
              <p className="text-xs mt-1">{t("leaderboard.empty_pathways_subtitle")}</p>
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
                    <span className="text-[10px] font-bold text-gray-400 shrink-0">{timeAgo(entry.completed_at, t)}</span>
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
