"use client";

import { useState, useEffect, useCallback } from "react";
import { Map, CheckCircle2, Circle, ChevronRight, Loader2, Zap,
  Target, BookOpen, Code2, Briefcase, Camera, PenTool, TrendingUp,
  Award, Lock, Unlock, RefreshCw, X, AlertCircle, Check,
  Star, ChevronDown, ChevronUp, Sparkles, ArrowRight,
  BarChart3, Brain, Search,
} from "lucide-react";
import { supabase } from "../../supabaseClient";

const CATEGORY_ICONS = {
  tech: Code2,
  design: PenTool,
  business: Briefcase,
  marketing: TrendingUp,
  photography: Camera,
  default: BookOpen,
};

const LEVEL_COLORS = {
  beginner:     "text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800/30",
  intermediate: "text-blue-500 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800/30",
  advanced:     "text-purple-500 bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800/30",
};

// ── Gap Analysis panel ─────────────────────────────────────────────────────
function GapAnalysisPanel({ token }) {
  const [targetRole, setTargetRole] = useState("");
  const [jobDesc, setJobDesc] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [expanded, setExpanded] = useState(false);

  const run = async () => {
    if (!targetRole.trim() && !jobDesc.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/skill-gap", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ targetRole: targetRole.trim(), jobDescription: jobDesc.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Analysis failed");
      setResult(data.gap);
      setExpanded(true);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const scoreColor = (s) =>
    s >= 70 ? "text-emerald-500" : s >= 40 ? "text-amber-500" : "text-red-500";
  const scoreLabel = (s) =>
    s >= 70 ? "Strong Match" : s >= 40 ? "Developing" : "Large Gap";

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden shadow-sm">
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center justify-between p-5 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-800/30 flex items-center justify-center">
            <Brain size={16} className="text-violet-500" />
          </div>
          <div className="text-left">
            <p className="font-black text-gray-900 dark:text-white text-sm">AI Skill Gap Analysis</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Paste a job description — see exactly what you need</p>
          </div>
        </div>
        {expanded ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
      </button>

      {expanded && (
        <div className="px-5 pb-5 space-y-4 border-t border-gray-100 dark:border-gray-800 pt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1.5">Target Role</label>
              <input
                value={targetRole}
                onChange={e => setTargetRole(e.target.value)}
                placeholder="e.g. Senior Product Manager"
                className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500/30"
              />
            </div>
            <div>
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1.5">Job Description (optional)</label>
              <textarea
                value={jobDesc}
                onChange={e => setJobDesc(e.target.value)}
                placeholder="Paste the JD here for a precise analysis…"
                rows={2}
                className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500/30 resize-none"
              />
            </div>
          </div>
          <button
            onClick={run}
            disabled={loading || (!targetRole.trim() && !jobDesc.trim())}
            className="flex items-center gap-2 px-5 py-2.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-violet-500/20 active:scale-95"
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
            {loading ? "Analyzing…" : "Analyze My Gap"}
          </button>

          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/30 rounded-xl text-red-600 dark:text-red-400 text-xs font-bold">
              <AlertCircle size={13} /> {error}
            </div>
          )}

          {result && (
            <div className="space-y-4">
              {/* Score */}
              <div className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
                <div className="text-center">
                  <p className={`text-4xl font-black ${scoreColor(result.score)}`}>{result.score}</p>
                  <p className="text-[10px] text-gray-400 font-bold">/100</p>
                </div>
                <div>
                  <p className={`font-black text-sm ${scoreColor(result.score)}`}>{scoreLabel(result.score)}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-relaxed">{result.summary}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Have */}
                {result.have?.length > 0 && (
                  <div>
                    <p className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest mb-2 flex items-center gap-1">
                      <Check size={10} /> You Have ({result.have.length})
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {result.have.map(s => (
                        <span key={s} className="text-[10px] font-bold px-2 py-0.5 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 rounded-lg border border-emerald-200 dark:border-emerald-800/30">
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Weak */}
                {result.weak?.length > 0 && (
                  <div>
                    <p className="text-[10px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-widest mb-2 flex items-center gap-1">
                      <AlertCircle size={10} /> Needs Deepening ({result.weak.length})
                    </p>
                    <div className="space-y-1.5">
                      {result.weak.map(w => (
                        <div key={w.skill} className="text-[10px] bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/30 rounded-lg px-2 py-1">
                          <p className="font-bold text-amber-700 dark:text-amber-400">{w.skill}</p>
                          <p className="text-amber-600/70 dark:text-amber-400/70">{w.reason}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Missing */}
                {result.missing?.length > 0 && (
                  <div>
                    <p className="text-[10px] font-black text-red-600 dark:text-red-400 uppercase tracking-widest mb-2 flex items-center gap-1">
                      <X size={10} /> Missing ({result.missing.length})
                    </p>
                    <div className="space-y-1.5">
                      {result.missing.map(m => (
                        <div key={m.skill} className={`text-[10px] rounded-lg px-2 py-1 border ${
                          m.priority === "high"
                            ? "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800/30"
                            : m.priority === "medium"
                            ? "bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800/30"
                            : "bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                        }`}>
                          <div className="flex items-center justify-between">
                            <p className="font-bold text-gray-800 dark:text-gray-200">{m.skill}</p>
                            <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded ${
                              m.priority === "high" ? "bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400" :
                              m.priority === "medium" ? "bg-orange-100 dark:bg-orange-900/40 text-orange-600 dark:text-orange-400" :
                              "bg-gray-100 dark:bg-gray-700 text-gray-500"
                            }`}>{m.priority}</span>
                          </div>
                          <p className="text-gray-500 dark:text-gray-400">{m.reason}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Pathway Card ───────────────────────────────────────────────────────────
function PathwayCard({ pathway, progress, onEnroll, onOpen, enrolling }) {
  const CatIcon = CATEGORY_ICONS[pathway.category?.toLowerCase()] || CATEGORY_ICONS.default;
  const stages = pathway.stages || [];
  const completedCount = progress?.completed_stages?.length || 0;
  const pct = stages.length > 0 ? Math.round((completedCount / stages.length) * 100) : 0;
  const isEnrolled = !!progress;
  const isDone = !!progress?.completed_at;

  return (
    <div
      onClick={() => onOpen(pathway)}
      className="group bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5 cursor-pointer hover:border-blue-300 dark:hover:border-blue-700/50 hover:shadow-lg transition-all flex flex-col gap-3"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shrink-0 shadow-md shadow-blue-500/20 text-2xl">
            {pathway.cover_emoji || "🚀"}
          </div>
          <div className="min-w-0">
            <p className="font-black text-gray-900 dark:text-white text-sm leading-tight line-clamp-2">{pathway.title}</p>
            <p className="text-[10px] text-gray-500 dark:text-gray-400 font-medium mt-0.5">{pathway.target_role}</p>
          </div>
        </div>
        {isDone ? (
          <span className="shrink-0 flex items-center gap-1 text-[10px] font-black text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1 rounded-xl border border-emerald-200 dark:border-emerald-800/30">
            <Award size={10} /> Done
          </span>
        ) : isEnrolled ? (
          <span className="shrink-0 text-[10px] font-black text-blue-500 bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded-xl border border-blue-200 dark:border-blue-800/30">
            Enrolled
          </span>
        ) : null}
      </div>

      {pathway.description && (
        <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed line-clamp-2">{pathway.description}</p>
      )}

      <div className="flex items-center gap-2 flex-wrap">
        {pathway.level && (
          <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-lg border ${LEVEL_COLORS[pathway.level] || LEVEL_COLORS.beginner}`}>
            {pathway.level}
          </span>
        )}
        <span className="text-[10px] text-gray-400 font-medium flex items-center gap-1">
          <BookOpen size={10} /> {stages.length} stages
        </span>
        {pathway.estimated_weeks && (
          <span className="text-[10px] text-gray-400 font-medium flex items-center gap-1">
            <Target size={10} /> ~{pathway.estimated_weeks}w
          </span>
        )}
      </div>

      {isEnrolled && !isDone && (
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-[10px] text-gray-400 font-bold">{pct}% complete</p>
            <p className="text-[10px] text-gray-400">{completedCount}/{stages.length}</p>
          </div>
          <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      )}

      {!isEnrolled && (
        <button
          onClick={e => { e.stopPropagation(); onEnroll(pathway.id); }}
          disabled={enrolling === pathway.id}
          className="w-full flex items-center justify-center gap-2 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-blue-500/20 active:scale-95 mt-auto"
        >
          {enrolling === pathway.id ? <Loader2 size={12} className="animate-spin" /> : <ArrowRight size={12} />}
          Start Pathway
        </button>
      )}
    </div>
  );
}

// ── Pathway Detail (stage-by-stage view) ──────────────────────────────────
function PathwayDetail({ pathway, progress, userId, onClose, onStageComplete }) {
  const stages = pathway.stages || [];
  const completed = progress?.completed_stages || [];
  const [completing, setCompleting] = useState(null);

  const handleComplete = async (stageIdx) => {
    setCompleting(stageIdx);
    await onStageComplete(pathway.id, stageIdx);
    setCompleting(null);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 p-6 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-3xl shadow-lg shadow-blue-500/20 shrink-0">
              {pathway.cover_emoji || "🚀"}
            </div>
            <div>
              <h2 className="font-black text-gray-900 dark:text-white text-lg leading-tight">{pathway.title}</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">{pathway.target_role}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-all shrink-0">
            <X size={18} />
          </button>
        </div>

        {/* Progress bar */}
        {progress && stages.length > 0 && (
          <div className="px-6 py-3 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-xs font-bold text-gray-600 dark:text-gray-400">
                {completed.length}/{stages.length} stages complete
              </p>
              <p className="text-xs font-black text-blue-600 dark:text-blue-400">
                {Math.round((completed.length / stages.length) * 100)}%
              </p>
            </div>
            <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-700"
                style={{ width: `${(completed.length / stages.length) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* Stages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {pathway.description && (
            <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed mb-4">{pathway.description}</p>
          )}
          {stages.map((stage, idx) => {
            const isDone = completed.includes(idx);
            const isNext = !isDone && (idx === 0 || completed.includes(idx - 1));
            return (
              <div
                key={idx}
                className={`rounded-2xl border p-5 transition-all ${
                  isDone
                    ? "bg-emerald-50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-800/30"
                    : isNext
                    ? "bg-blue-50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800/30"
                    : "bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 opacity-60"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                      isDone ? "bg-emerald-500" : isNext ? "bg-blue-500" : "bg-gray-300 dark:bg-gray-600"
                    }`}>
                      {isDone ? (
                        <Check size={13} className="text-white" />
                      ) : (
                        <span className="text-[10px] font-black text-white">{idx + 1}</span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className={`font-black text-sm ${isDone ? "text-emerald-800 dark:text-emerald-300" : isNext ? "text-blue-900 dark:text-blue-200" : "text-gray-600 dark:text-gray-400"}`}>
                        {stage.title}
                      </p>
                      {stage.description && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed mt-1">{stage.description}</p>
                      )}
                      {stage.skills?.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {stage.skills.map(s => (
                            <span key={s} className="text-[10px] font-bold px-2 py-0.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-600 dark:text-gray-400">
                              {s}
                            </span>
                          ))}
                        </div>
                      )}
                      {stage.project_prompt && (
                        <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-2 flex items-start gap-1.5">
                          <Target size={11} className="shrink-0 mt-0.5" />
                          <span><strong>Project:</strong> {stage.project_prompt}</span>
                        </p>
                      )}
                    </div>
                  </div>

                  {!isDone && isNext && progress && (
                    <button
                      onClick={() => handleComplete(idx)}
                      disabled={completing === idx}
                      className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-blue-500/20 active:scale-95"
                    >
                      {completing === idx ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />}
                      Mark Done
                    </button>
                  )}
                  {isDone && (
                    <CheckCircle2 size={18} className="text-emerald-500 shrink-0 mt-0.5" />
                  )}
                  {!isNext && !isDone && (
                    <Lock size={14} className="text-gray-400 shrink-0 mt-0.5" />
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {!progress && (
          <div className="p-6 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
            <p className="text-xs text-gray-500 text-center">Enroll from the pathways list to start tracking your progress.</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────
export default function PathwaysContent() {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [pathways, setPathways] = useState([]);
  const [enrolled, setEnrolled] = useState({});
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(null);
  const [selected, setSelected] = useState(null);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const load = useCallback(async (uid) => {
    const [pathRes, enrollRes] = await Promise.all([
      fetch("/api/pathways").then(r => r.json()),
      uid ? fetch(`/api/pathways?userId=${uid}`).then(r => r.json()) : Promise.resolve({ enrolled: [] }),
    ]);
    setPathways(pathRes.pathways || []);
    const map = {};
    (enrollRes.enrolled || []).forEach(e => { map[e.pathway_id] = e; });
    setEnrolled(map);
  }, []);

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUser(session.user);
        setToken(session.access_token);
        await load(session.user.id);
      } else {
        await load(null);
      }
      setLoading(false);
    };
    init();
  }, [load]);

  const handleEnroll = async (pathwayId) => {
    if (!user) return showToast("Sign in to enroll in pathways", "error");
    setEnrolling(pathwayId);
    try {
      const res = await fetch("/api/pathways", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, pathwayId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setEnrolled(prev => ({ ...prev, [pathwayId]: data.enrolled }));
      showToast("Enrolled! Your progress is now tracked.");
    } catch (e) {
      showToast(e.message, "error");
    } finally {
      setEnrolling(null);
    }
  };

  const handleStageComplete = async (pathwayId, stageIndex) => {
    if (!user) return;
    const res = await fetch("/api/pathways", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: user.id, pathwayId, stageIndex }),
    });
    const data = await res.json();
    if (res.ok) {
      setEnrolled(prev => ({ ...prev, [pathwayId]: data.progress }));
      if (data.completed) showToast("Pathway complete! You did it.", "success");
      else showToast("Stage marked done! Keep going.", "success");
    }
  };

  const categories = ["all", ...new Set(pathways.map(p => p.category).filter(Boolean))];

  const visible = pathways.filter(p => {
    const matchCat = filter === "all" || p.category === filter;
    const matchSearch = !search.trim() || p.title.toLowerCase().includes(search.toLowerCase()) || p.target_role?.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const myPathways = pathways.filter(p => enrolled[p.id]);

  if (loading) return (
    <div className="flex items-center justify-center h-52">
      <Loader2 size={24} className="animate-spin text-blue-500" />
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12 animate-in fade-in duration-300">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-bold text-white animate-in fade-in slide-in-from-top-2 duration-200 ${toast.type === "error" ? "bg-red-600" : "bg-emerald-600"}`}>
          {toast.msg}
        </div>
      )}

      {/* Pathway detail modal */}
      {selected && (
        <PathwayDetail
          pathway={selected}
          progress={enrolled[selected.id]}
          userId={user?.id}
          onClose={() => setSelected(null)}
          onStageComplete={handleStageComplete}
        />
      )}

      {/* Hero */}
      <div className="relative overflow-hidden rounded-3xl border border-blue-200 dark:border-blue-800/50 bg-gradient-to-br from-blue-50 via-indigo-50 to-violet-50 dark:from-blue-950/20 dark:via-indigo-950/20 dark:to-transparent p-8">
        <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-blue-200/30 dark:bg-blue-500/10" />
        <div className="absolute -bottom-6 -left-6 w-24 h-24 rounded-full bg-indigo-200/30 dark:bg-indigo-500/10" />
        <div className="relative flex items-center gap-4">
          <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/30 shrink-0">
            <Map size={26} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">Career Pathways</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 font-medium mt-0.5">
              Structured roadmaps to reach your target role — step by step.
            </p>
          </div>
        </div>
      </div>

      {/* Skill Gap Analysis */}
      {user && token && <GapAnalysisPanel token={token} />}

      {/* My enrolled pathways summary */}
      {myPathways.length > 0 && (
        <div>
          <h2 className="font-black text-xs uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-3">Your Pathways</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {myPathways.map(p => (
              <PathwayCard
                key={p.id}
                pathway={p}
                progress={enrolled[p.id]}
                onEnroll={handleEnroll}
                onOpen={setSelected}
                enrolling={enrolling}
              />
            ))}
          </div>
        </div>
      )}

      {/* Browse all */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <h2 className="font-black text-xs uppercase tracking-widest text-gray-400 dark:text-gray-500">
            {myPathways.length > 0 ? "Explore More" : "Browse Pathways"}
          </h2>
          {/* Search */}
          <div className="relative sm:w-56">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search pathways…"
              className="w-full pl-9 pr-3 py-2 text-xs bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            />
          </div>
        </div>

        {/* Category filter */}
        <div className="flex gap-2 flex-wrap mb-4">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold capitalize transition-all ${
                filter === cat
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {visible.length === 0 ? (
          <div className="py-16 text-center border border-dashed border-gray-200 dark:border-gray-700 rounded-3xl text-gray-400 dark:text-gray-600">
            <Map size={32} className="mx-auto mb-3" />
            <p className="font-bold text-sm">No pathways yet</p>
            <p className="text-xs mt-1">Pathways will appear here once published by the admin.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {visible.map(p => (
              <PathwayCard
                key={p.id}
                pathway={p}
                progress={enrolled[p.id]}
                onEnroll={handleEnroll}
                onOpen={setSelected}
                enrolling={enrolling}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
