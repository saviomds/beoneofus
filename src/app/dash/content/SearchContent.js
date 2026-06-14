"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Image from "next/image";
import {
  Search, Users, MessageCircle, Hash, GraduationCap,
  CalendarDays, Briefcase, TrendingUp, MapPin, Building2, Globe,
} from "lucide-react";
import { supabase } from "../../supabaseClient";
import VerifiedBadge from "../../components/VerifiedBadge";

const LIMIT_ALL = 6;
const LIMIT_TAB = 30;

const TABS = [
  { key: "all",      label: "All",      Icon: Search        },
  { key: "people",   label: "People",   Icon: Users         },
  { key: "posts",    label: "Posts",    Icon: MessageCircle },
  { key: "groups",   label: "Groups",   Icon: Hash          },
  { key: "courses",  label: "Courses",  Icon: GraduationCap },
  { key: "events",   label: "Events",   Icon: CalendarDays  },
  { key: "jobs",     label: "Jobs",     Icon: Briefcase     },
  { key: "pathways", label: "Pathways", Icon: TrendingUp    },
];

const EMPTY = { people: [], posts: [], groups: [], courses: [], events: [], jobs: [], pathways: [] };

const HighlightMatch = ({ text, query }) => {
  if (!query || !text) return <>{text || ""}</>;
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const parts = text.toString().split(new RegExp(`(${escaped})`, "gi"));
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === query.toLowerCase() ? (
          <mark key={i} className="bg-yellow-200 dark:bg-yellow-900/50 text-gray-900 dark:text-yellow-100 rounded-sm px-px not-italic">
            {part}
          </mark>
        ) : part
      )}
    </>
  );
};

function Section({ title, Icon, count, isAll, onSeeAll, children }) {
  const showSeeAll = isAll && count >= LIMIT_ALL;
  return (
    <div>
      <div className="flex items-center justify-between mb-2 px-1">
        <div className="flex items-center gap-2">
          <Icon size={12} className="text-gray-500 dark:text-gray-400" />
          <span className="text-[10px] font-black uppercase tracking-[2px] text-gray-500 dark:text-gray-400">{title}</span>
          <span className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-[9px] font-black text-gray-500 dark:text-gray-400">
            {count}{showSeeAll ? "+" : ""}
          </span>
        </div>
        {showSeeAll && (
          <button onClick={onSeeAll} className="text-[11px] font-black text-blue-600 dark:text-blue-400 hover:underline uppercase tracking-wider">
            See all →
          </button>
        )}
      </div>
      <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl overflow-hidden divide-y divide-gray-50 dark:divide-gray-800/50">
        {children}
      </div>
    </div>
  );
}

export default function SearchContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const q = searchParams.get("q") || "";
  const [tab, setTab] = useState("all");
  const [results, setResults] = useState(EMPTY);
  const [loading, setLoading] = useState(false);

  useEffect(() => { setTab("all"); }, [q]);

  useEffect(() => {
    if (!q.trim()) { setResults(EMPTY); return; }

    let cancelled = false;
    const run = async () => {
      setLoading(true);
      const pat = `%${q}%`;
      const lim = tab === "all" ? LIMIT_ALL : LIMIT_TAB;

      const allQueries = {
        people:   () => supabase.from("profiles").select("id, username, full_name, status, work_status, avatar_url, is_verified, is_premium").or(`username.ilike.${pat},full_name.ilike.${pat},status.ilike.${pat}`).limit(lim),
        posts:    () => supabase.from("posts").select("id, title, content, created_at").or(`title.ilike.${pat},content.ilike.${pat}`).order("created_at", { ascending: false }).limit(lim),
        groups:   () => supabase.from("groups").select("id, name, description").ilike("name", pat).eq("is_private", false).limit(lim),
        courses:  () => supabase.from("courses").select("id, title, category, level").or(`title.ilike.${pat},category.ilike.${pat}`).limit(lim),
        events:   () => supabase.from("events").select("id, title, description, event_date, is_online, location").or(`title.ilike.${pat},description.ilike.${pat}`).limit(lim),
        jobs:     () => supabase.from("jobs").select("id, title, company, type, location, salary").or(`title.ilike.${pat},company.ilike.${pat}`).limit(lim),
        pathways: () => supabase.from("pathways").select("id, title, target_role, category").ilike("title", pat).limit(lim),
      };

      const keys = tab === "all" ? Object.keys(allQueries) : [tab];
      const pairs = await Promise.all(
        keys.map(async (k) => {
          const { data } = await allQueries[k]();
          return [k, data || []];
        })
      );

      if (cancelled) return;
      setResults(prev => {
        const next = { ...prev };
        pairs.forEach(([k, d]) => { next[k] = d; });
        return next;
      });
      setLoading(false);
    };

    run();
    return () => { cancelled = true; };
  }, [q, tab]);

  const totalCount = Object.values(results).reduce((sum, arr) => sum + arr.length, 0);
  const isAll = tab === "all";
  const go = (section) => router.push(`/dash/${section}`);

  if (!q.trim()) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/20 rounded-2xl flex items-center justify-center mb-4">
          <Search size={28} className="text-blue-500" />
        </div>
        <h2 className="text-xl font-black text-gray-900 dark:text-gray-100 mb-2">Search the ecosystem</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 font-medium max-w-xs">
          Use the search bar above to find people, posts, groups, courses, events, jobs, and more.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-5">
        <h1 className="text-2xl font-black text-gray-900 dark:text-gray-100 tracking-tight">
          Results for <span className="text-blue-600 dark:text-blue-400">&quot;{q}&quot;</span>
        </h1>
        {!loading && (
          <p className="text-sm text-gray-500 dark:text-gray-400 font-medium mt-0.5">
            {totalCount === 0
              ? "No results found"
              : `${totalCount}${isAll && totalCount >= LIMIT_ALL ? "+" : ""} result${totalCount !== 1 ? "s" : ""}`}
          </p>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pb-1 mb-5 border-b border-gray-100 dark:border-gray-800">
        {TABS.map(({ key, label, Icon }) => {
          const count = key === "all" ? undefined : results[key]?.length;
          return (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-black uppercase tracking-wider whitespace-nowrap transition-all ${
                tab === key
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
              }`}
            >
              <Icon size={12} />
              {label}
              {count !== undefined && count > 0 && (
                <span className={`px-1.5 py-0.5 rounded-md text-[9px] font-black ${tab === key ? "bg-white/20" : "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400"}`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Results */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="flex items-center gap-3 p-4 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl animate-pulse">
              <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-xl shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-3.5 bg-gray-200 dark:bg-gray-700 rounded-lg w-1/3" />
                <div className="h-2.5 bg-gray-100 dark:bg-gray-800 rounded-lg w-2/3" />
              </div>
            </div>
          ))}
        </div>
      ) : totalCount === 0 ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Search size={24} className="text-gray-400" />
          </div>
          <h3 className="text-base font-bold text-gray-900 dark:text-gray-100 mb-1">No results for &quot;{q}&quot;</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">Try different keywords or check your spelling.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {(isAll || tab === "people") && results.people.length > 0 && (
            <Section title="People" Icon={Users} count={results.people.length} isAll={isAll} onSeeAll={() => setTab("people")}>
              {results.people.map(user => (
                <a key={user.id} href={`/u/${user.username}`} className="flex items-center gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group">
                  <div className="relative w-10 h-10 rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800 shrink-0 flex items-center justify-center text-sm font-black text-gray-600 dark:text-gray-400 uppercase">
                    {user.avatar_url
                      ? <Image src={user.avatar_url} alt={user.username || "avatar"} fill sizes="40px" className="object-cover" />
                      : (user.username?.slice(0, 2) || "??")}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-sm font-black text-gray-900 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        @<HighlightMatch text={user.username} query={q} />
                      </span>
                      {user.is_verified && <VerifiedBadge size={14} />}
                      {user.work_status && user.work_status !== "None" && (
                        <span className={`px-1.5 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest border ${user.work_status === "Hiring" ? "bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-800/50" : "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/50"}`}>
                          {user.work_status}
                        </span>
                      )}
                    </div>
                    {(user.full_name || user.status) && (
                      <p className="text-[11px] text-gray-500 dark:text-gray-400 font-medium mt-0.5 truncate">
                        <HighlightMatch text={user.full_name || user.status} query={q} />
                      </p>
                    )}
                  </div>
                </a>
              ))}
            </Section>
          )}

          {(isAll || tab === "posts") && results.posts.length > 0 && (
            <Section title="Posts" Icon={MessageCircle} count={results.posts.length} isAll={isAll} onSeeAll={() => setTab("posts")}>
              {results.posts.map(post => (
                <div key={post.id} onClick={() => go("feed")} className="flex items-start gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group cursor-pointer">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-500 flex items-center justify-center shrink-0 mt-0.5">
                    <MessageCircle size={16} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-gray-900 dark:text-gray-100 line-clamp-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      <HighlightMatch text={post.title || "Untitled post"} query={q} />
                    </p>
                    {post.content && (
                      <p className="text-[11px] text-gray-500 dark:text-gray-400 line-clamp-2 mt-0.5">
                        <HighlightMatch text={post.content} query={q} />
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </Section>
          )}

          {(isAll || tab === "groups") && results.groups.length > 0 && (
            <Section title="Groups" Icon={Hash} count={results.groups.length} isAll={isAll} onSeeAll={() => setTab("groups")}>
              {results.groups.map(group => (
                <div key={group.id} onClick={() => go("groups")} className="flex items-center gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group cursor-pointer">
                  <div className="w-10 h-10 rounded-xl bg-violet-50 dark:bg-violet-900/20 text-violet-500 flex items-center justify-center shrink-0">
                    <Hash size={16} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-gray-900 dark:text-gray-100 line-clamp-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      <HighlightMatch text={group.name} query={q} />
                    </p>
                    {group.description && (
                      <p className="text-[11px] text-gray-500 dark:text-gray-400 line-clamp-1 mt-0.5">
                        <HighlightMatch text={group.description} query={q} />
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </Section>
          )}

          {(isAll || tab === "courses") && results.courses.length > 0 && (
            <Section title="Courses" Icon={GraduationCap} count={results.courses.length} isAll={isAll} onSeeAll={() => setTab("courses")}>
              {results.courses.map(course => (
                <div key={course.id} onClick={() => go("learn")} className="flex items-center gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group cursor-pointer">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                    <GraduationCap size={16} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-gray-900 dark:text-gray-100 line-clamp-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      <HighlightMatch text={course.title} query={q} />
                    </p>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400 font-black uppercase tracking-widest mt-0.5">
                      {course.category}{course.level ? ` · ${course.level}` : ""}
                    </p>
                  </div>
                </div>
              ))}
            </Section>
          )}

          {(isAll || tab === "events") && results.events.length > 0 && (
            <Section title="Events" Icon={CalendarDays} count={results.events.length} isAll={isAll} onSeeAll={() => setTab("events")}>
              {results.events.map(event => (
                <div key={event.id} onClick={() => go("events")} className="flex items-center gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group cursor-pointer">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 text-indigo-500 flex items-center justify-center shrink-0">
                    <CalendarDays size={16} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-gray-900 dark:text-gray-100 line-clamp-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      <HighlightMatch text={event.title} query={q} />
                    </p>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400 font-medium mt-0.5 flex items-center gap-2 flex-wrap">
                      {event.event_date && (
                        <span>{new Date(event.event_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                      )}
                      {event.is_online
                        ? <span className="flex items-center gap-0.5"><Globe size={9} /> Online</span>
                        : event.location
                          ? <span className="flex items-center gap-0.5"><MapPin size={9} /> <HighlightMatch text={event.location} query={q} /></span>
                          : null}
                    </p>
                  </div>
                </div>
              ))}
            </Section>
          )}

          {(isAll || tab === "jobs") && results.jobs.length > 0 && (
            <Section title="Jobs" Icon={Briefcase} count={results.jobs.length} isAll={isAll} onSeeAll={() => setTab("jobs")}>
              {results.jobs.map(job => (
                <div
                  key={job.id}
                  onClick={() => window.dispatchEvent(new CustomEvent("open-header-modal", { detail: "jobs" }))}
                  className="flex items-center gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group cursor-pointer"
                >
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                    <Briefcase size={16} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-gray-900 dark:text-gray-100 line-clamp-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      <HighlightMatch text={job.title} query={q} />
                    </p>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400 font-medium mt-0.5 flex items-center gap-2 flex-wrap">
                      {job.company && <span className="flex items-center gap-0.5"><Building2 size={9} /> <HighlightMatch text={job.company} query={q} /></span>}
                      {job.location && <span className="flex items-center gap-0.5"><MapPin size={9} /> {job.location}</span>}
                      {job.type && <span className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-[9px] font-bold uppercase">{job.type}</span>}
                    </p>
                  </div>
                </div>
              ))}
            </Section>
          )}

          {(isAll || tab === "pathways") && results.pathways.length > 0 && (
            <Section title="Pathways" Icon={TrendingUp} count={results.pathways.length} isAll={isAll} onSeeAll={() => setTab("pathways")}>
              {results.pathways.map(pathway => (
                <div key={pathway.id} onClick={() => go("pathways")} className="flex items-center gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group cursor-pointer">
                  <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                    <TrendingUp size={16} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-gray-900 dark:text-gray-100 line-clamp-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      <HighlightMatch text={pathway.title} query={q} />
                    </p>
                    {(pathway.target_role || pathway.category) && (
                      <p className="text-[11px] text-gray-500 dark:text-gray-400 font-black uppercase tracking-widest mt-0.5">
                        {pathway.target_role && <HighlightMatch text={pathway.target_role} query={q} />}
                        {pathway.target_role && pathway.category && " · "}
                        {pathway.category}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </Section>
          )}
        </div>
      )}
    </div>
  );
}
