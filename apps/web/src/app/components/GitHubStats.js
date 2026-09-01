"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { Star, ExternalLink } from "lucide-react";

const LANG_COLORS = {
  JavaScript: "#f1e05a", TypeScript: "#2b7489", Python: "#3572A5",
  Go: "#00ADD8", Rust: "#dea584", Java: "#b07219", "C++": "#f34b7d",
  "C#": "#178600", Ruby: "#701516", PHP: "#4F5D95", Swift: "#ffac45",
  Kotlin: "#A97BFF", Dart: "#00B4AB", HTML: "#e34c26", CSS: "#563d7c",
  Shell: "#89e051", Vue: "#41b883", Svelte: "#ff3e00",
};

function parseGithubUsername(raw) {
  if (!raw) return null;
  const s = raw.trim().replace(/^@/, "");
  const m = s.match(/github\.com\/([a-zA-Z0-9_-]+)/);
  if (m) return m[1];
  if (/^[a-zA-Z0-9_-]+$/.test(s)) return s;
  return null;
}

export default function GitHubStats({ githubField }) {
  const [user, setUser] = useState(null);
  const [repos, setRepos] = useState([]);
  const [languages, setLanguages] = useState([]);
  const [loading, setLoading] = useState(() => Boolean(parseGithubUsername(githubField)));
  const [error, setError] = useState(null);

  const username = parseGithubUsername(githubField);

  useEffect(() => {
    if (!username) return;

    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [userRes, reposRes] = await Promise.all([
          fetch(`https://api.github.com/users/${username}`),
          fetch(`https://api.github.com/users/${username}/repos?sort=stars&per_page=6`),
        ]);
        if (!userRes.ok) throw new Error("GitHub user not found");
        const userData = await userRes.json();
        const reposData = reposRes.ok ? await reposRes.json() : [];
        setUser(userData);

        const top = Array.isArray(reposData) ? reposData.filter(r => !r.fork).slice(0, 4) : [];
        setRepos(top);

        const langMap = {};
        top.forEach(r => { if (r.language) langMap[r.language] = (langMap[r.language] || 0) + 1; });
        const sorted = Object.entries(langMap).sort((a, b) => b[1] - a[1]);
        const total = sorted.reduce((s, [, c]) => s + c, 0) || 1;
        setLanguages(sorted.map(([lang, count]) => ({ lang, pct: Math.round((count / total) * 100) })));
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [username]);

  if (!username) return null;

  if (loading) return (
    <div className="rounded-2xl border border-gray-200 dark:border-gray-800 p-5 bg-white dark:bg-gray-900 animate-pulse">
      <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-28 mb-3" />
      <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded w-40 mb-2" />
      <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded w-32" />
    </div>
  );

  if (error || !user) return null;

  return (
    <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden shadow-sm">
      {/* Header */}
      <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <svg viewBox="0 0 16 16" className="w-4 h-4 fill-current text-gray-700 dark:text-gray-300" aria-hidden="true">
            <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
          </svg>
          <span className="text-sm font-bold text-gray-700 dark:text-gray-300">GitHub</span>
        </div>
        <a
          href={`https://github.com/${username}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 font-bold hover:underline"
        >
          @{username} <ExternalLink size={11} />
        </a>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 divide-x divide-gray-100 dark:divide-gray-800 border-b border-gray-100 dark:border-gray-800">
        {[
          { label: "Repos", value: user.public_repos },
          { label: "Followers", value: user.followers },
          { label: "Stars", value: repos.reduce((s, r) => s + (r.stargazers_count || 0), 0) },
        ].map(({ label, value }) => (
          <div key={label} className="p-3 text-center">
            <div className="text-base font-black text-gray-900 dark:text-gray-100">{(value || 0).toLocaleString()}</div>
            <div className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">{label}</div>
          </div>
        ))}
      </div>

      {/* Contribution graph */}
      <div className="px-4 pt-4 pb-2">
        <Image
          src={`https://ghchart.rshah.org/2563eb/${username}`}
          alt={`${username}'s contributions`}
          width={720}
          height={112}
          className="w-full h-auto rounded-lg"
          loading="lazy"
          unoptimized
          onError={(e) => { e.currentTarget.style.display = "none"; }}
        />
      </div>

      {/* Language bar */}
      {languages.length > 0 && (
        <div className="px-4 pb-3">
          <div className="flex gap-0.5 rounded-full overflow-hidden h-1.5 mb-2">
            {languages.map(({ lang, pct }) => (
              <div key={lang} style={{ width: `${pct}%`, backgroundColor: LANG_COLORS[lang] || "#6b7280" }} />
            ))}
          </div>
          <div className="flex flex-wrap gap-x-3 gap-y-1">
            {languages.slice(0, 5).map(({ lang, pct }) => (
              <span key={lang} className="flex items-center gap-1 text-[10px] text-gray-600 dark:text-gray-400 font-medium">
                <span className="w-2 h-2 rounded-full inline-block shrink-0" style={{ backgroundColor: LANG_COLORS[lang] || "#6b7280" }} />
                {lang} <span className="text-gray-400">{pct}%</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Top repos */}
      {repos.length > 0 && (
        <div className="px-4 pb-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
          {repos.map(repo => (
            <a
              key={repo.id}
              href={repo.html_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col gap-1 p-2.5 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 hover:border-blue-300 dark:hover:border-blue-700 transition-all group"
            >
              <div className="flex items-center justify-between gap-1">
                <span className="text-xs font-bold text-gray-800 dark:text-gray-200 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{repo.name}</span>
                <span className="flex items-center gap-0.5 text-[10px] text-amber-500 font-bold shrink-0">
                  <Star size={9} fill="currentColor" /> {repo.stargazers_count}
                </span>
              </div>
              {repo.description && (
                <p className="text-[10px] text-gray-500 dark:text-gray-400 line-clamp-1">{repo.description}</p>
              )}
              {repo.language && (
                <span className="text-[9px] font-black uppercase tracking-widest" style={{ color: LANG_COLORS[repo.language] || "#6b7280" }}>
                  {repo.language}
                </span>
              )}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
