"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import Link from "next/link";
import {
  Zap, HelpCircle, Code2, LogOut, ChevronRight, X, Search, Crown,
  Users, BarChart3, Briefcase, Bell, ArrowUpRight, Clock, ShieldAlert,
  Terminal, Layers, UserCog, Globe, Quote,
} from "lucide-react";
import { supabase } from "../../supabaseClient";
import { useLanguage } from "../../../lib/i18n";
import { signOutEverywhere } from "../../../lib/signOutEverywhere";
import FounderContent from "./FounderContent";
import { Badge } from "./more/shared";
import SystemStatusTool from "./more/SystemStatusTool";
import ApiAccessTool from "./more/ApiAccessTool";
import CommunityHubTool from "./more/CommunityHubTool";
import AdminPanelTool from "./more/AdminPanelTool";
import SupportTool from "./more/SupportTool";
import QuoteTool from "./more/QuoteTool";

// ─── Tool Registry ────────────────────────────────────────────────────────────

const TOOLS = [
  {
    id: "api", labelKey: "more.tools.api.label", icon: Code2,
    descKey: "more.tools.api.desc",
    color: "blue", tagKeys: ["more.tags.rest_api", "more.tags.sdk", "more.tags.keys"], isNew: false,
    category: "developer",
  },
  {
    id: "status", labelKey: "more.tools.status.label", icon: Zap,
    descKey: "more.tools.status.desc",
    color: "emerald", tagKeys: ["more.tags.uptime", "more.tags.latency", "more.tags.incidents"], isNew: false,
    category: "developer",
  },
  {
    id: "community", labelKey: "more.tools.community.label", icon: Globe,
    descKey: "more.tools.community.desc",
    color: "indigo", tagKeys: ["more.tags.chat", "more.tags.channels", "more.tags.live"], isNew: true,
    category: "community",
  },
  {
    id: "support", labelKey: "more.tools.support.label", icon: HelpCircle,
    descKey: "more.tools.support.desc",
    color: "orange", tagKeys: ["more.tags.ai_support", "more.tags.faq", "more.tags.tickets"], isNew: true,
    category: "community",
  },
  {
    id: "quotes", labelKey: "more.tools.quotes.label", icon: Quote,
    descKey: "more.tools.quotes.desc",
    color: "amber", tagKeys: ["more.tags.motivation", "more.tags.coding", "more.tags.career"], isNew: false,
    category: "community",
  },
  {
    id: "admin", labelKey: "more.tools.admin.label", icon: ShieldAlert,
    descKey: "more.tools.admin.desc",
    color: "red", tagKeys: ["more.tags.users", "more.tags.verification", "more.tags.moderation"], isNew: false,
    category: "platform", adminOnly: true, route: "/dash/admin",
  },
];

const TOOL_CATEGORIES = [
  { id: "personal",   labelKey: "more.categories.personal",  icon: UserCog,    accent: "from-violet-500 to-violet-600" },
  { id: "developer",  labelKey: "more.categories.developer", icon: Terminal,   accent: "from-blue-500 to-blue-600"    },
  { id: "community",  labelKey: "more.categories.community", icon: Users,      accent: "from-indigo-500 to-indigo-600" },
  { id: "platform",   labelKey: "more.categories.platform",  icon: ShieldAlert,accent: "from-red-500 to-red-600"      },
];

const TOOL_COLOR_MAP = {
  violet:  { bg: "bg-violet-100 dark:bg-violet-950/50", text: "text-violet-600 dark:text-violet-400", border: "border-violet-200 dark:border-violet-800/40", gradient: "from-violet-600 to-violet-700", tag: "bg-violet-50 dark:bg-violet-950/30 text-violet-600 dark:text-violet-400 border-violet-200 dark:border-violet-800/30", glow: "shadow-violet-500/15" },
  blue:    { bg: "bg-blue-100 dark:bg-blue-950/50",    text: "text-blue-600 dark:text-blue-400",    border: "border-blue-200 dark:border-blue-800/40",    gradient: "from-blue-600 to-blue-700",    tag: "bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800/30",    glow: "shadow-blue-500/15"    },
  emerald: { bg: "bg-emerald-100 dark:bg-emerald-950/50", text: "text-emerald-600 dark:text-emerald-400", border: "border-emerald-200 dark:border-emerald-800/40", gradient: "from-emerald-600 to-emerald-700", tag: "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/30", glow: "shadow-emerald-500/15" },
  indigo:  { bg: "bg-indigo-100 dark:bg-indigo-950/50", text: "text-indigo-600 dark:text-indigo-400", border: "border-indigo-200 dark:border-indigo-800/40", gradient: "from-indigo-600 to-indigo-700", tag: "bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800/30", glow: "shadow-indigo-500/15" },
  orange:  { bg: "bg-orange-100 dark:bg-orange-950/50", text: "text-orange-600 dark:text-orange-400", border: "border-orange-200 dark:border-orange-800/40", gradient: "from-orange-500 to-orange-600", tag: "bg-orange-50 dark:bg-orange-950/30 text-orange-600 dark:text-orange-400 border-orange-200 dark:border-orange-800/30", glow: "shadow-orange-500/15" },
  amber:   { bg: "bg-amber-100 dark:bg-amber-950/50",  text: "text-amber-600 dark:text-amber-400",  border: "border-amber-200 dark:border-amber-800/40",  gradient: "from-amber-500 to-amber-600",  tag: "bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800/30",  glow: "shadow-amber-500/15"  },
  red:     { bg: "bg-red-100 dark:bg-red-950/50",      text: "text-red-600 dark:text-red-400",      border: "border-red-200 dark:border-red-800/40",      gradient: "from-red-600 to-red-700",      tag: "bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800/30",      glow: "shadow-red-500/15"      },
};

// ─── Tool Card ────────────────────────────────────────────────────────────────

function ToolCard({ tool, onClick }) {
  const { t } = useLanguage();
  const tc = TOOL_COLOR_MAP[tool.color] || TOOL_COLOR_MAP.blue;
  return (
    <button
      onClick={onClick}
      className={`group relative flex flex-col p-4 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl hover:border-gray-300 dark:hover:border-gray-700 hover:shadow-lg ${tc.glow} transition-all duration-200 text-left hover:-translate-y-0.5 overflow-hidden w-full`}
    >
      {/* hover accent top bar */}
      <div className={`absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r ${tc.gradient} opacity-0 group-hover:opacity-100 transition-opacity`} />

      <div className="flex items-start justify-between gap-3 mb-3">
        <div className={`w-10 h-10 rounded-xl ${tc.bg} border ${tc.border} flex items-center justify-center shrink-0 transition-transform group-hover:scale-105`}>
          <tool.icon size={18} className={tc.text} />
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {tool.isNew && (
            <span className={`text-[9px] font-black px-2 py-0.5 rounded-full border ${tc.tag}`}>{t('more.updated')}</span>
          )}
          <div className={`w-6 h-6 rounded-lg bg-gray-50 dark:bg-white/[0.03] border border-gray-100 dark:border-white/[0.04] flex items-center justify-center group-hover:${tc.bg} group-hover:border-${tool.color}-200 dark:group-hover:border-${tool.color}-800/40 transition-all`}>
            <ChevronRight size={12} className={`text-gray-300 dark:text-gray-700 group-hover:${tc.text} group-hover:translate-x-0.5 transition-all`} />
          </div>
        </div>
      </div>

      <p className={`text-sm font-black text-gray-900 dark:text-gray-100 group-hover:${tc.text} transition-colors mb-1`}>{t(tool.labelKey)}</p>
      <p className="text-[11px] text-gray-400 dark:text-gray-500 font-medium leading-relaxed line-clamp-2 flex-1">{t(tool.descKey)}</p>

      {/* Tags */}
      <div className="flex gap-1.5 flex-wrap mt-3">
        {tool.tagKeys.map(tagKey => (
          <span key={tagKey} className="text-[9px] font-bold text-gray-400 dark:text-gray-600 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700/50 px-2 py-0.5 rounded-full">
            {t(tagKey)}
          </span>
        ))}
      </div>
    </button>
  );
}

// ─── Main Export ──────────────────────────────────────────────────────────────

export default function MoreContent() {
  const { t } = useLanguage();
  const [currentUserId, setCurrentUserId] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isFounder, setIsFounder] = useState(false);
  const [applicationStatus, setApplicationStatus] = useState(null); // null | 'pending' | 'accepted' | 'declined'
  const [showApplyModal, setShowApplyModal] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const visibleTools = TOOLS.filter(tool => !tool.adminOnly || isAdmin);
  const toolParam = searchParams?.get("tool");
  const activeItem = toolParam ? visibleTools.find(tool => tool.id === toolParam) || null : null;

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.id) {
        const uid = session.user.id;
        setCurrentUserId(uid);
        const { data } = await supabase.from("profiles").select("is_admin").eq("id", uid).single();
        if (data?.is_admin) {
          setIsAdmin(true);
          setIsFounder(true);
          setApplicationStatus('accepted');
        } else {
          // Check if user has a founder application
          const { data: appData } = await supabase
            .from("founder_applications")
            .select("status")
            .eq("user_id", uid)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();
          if (appData?.status === 'accepted') {
            setIsFounder(true);
            setApplicationStatus('accepted');
          } else if (appData?.status === 'pending') {
            setApplicationStatus('pending');
          } else if (appData?.status === 'declined') {
            setApplicationStatus('declined');
          }
        }
      }
    };
    init();
  }, []);

  const openTool = (tool) => {
    // Tools that live on their own route (e.g. the unified Admin Console) navigate there.
    if (tool.route) { router.push(tool.route); return; }
    const params = new URLSearchParams(searchParams?.toString() || "");
    params.set("tool", tool.id);
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const closeTool = () => {
    const params = new URLSearchParams(searchParams?.toString() || "");
    params.delete("tool");
    const url = params.toString() ? `${pathname}?${params.toString()}` : pathname;
    router.push(url, { scroll: false });
  };

  const handleSignOut = async () => {
    await signOutEverywhere();
    window.location.href = "/auth";
  };

  const [toolSearch, setToolSearch] = useState("");

  const q = toolSearch.toLowerCase();
  const searchedTools = visibleTools.filter(tool =>
    !toolSearch
    || t(tool.labelKey).toLowerCase().includes(q)
    || t(tool.descKey).toLowerCase().includes(q)
    || tool.tagKeys.some(tagKey => t(tagKey).toLowerCase().includes(q))
  );

  return (
    <div className="w-full flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-700 pb-12">

      {/* ── Hero banner ── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800 dark:from-[#0a0a12] dark:via-[#0d0d1a] dark:to-[#0f0f1f] border border-white/[0.07] mb-8 p-6 shadow-xl">
        {/* dot-grid texture */}
        <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)", backgroundSize: "22px 22px" }} />
        {/* gradient orbs */}
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-8 -left-8 w-36 h-36 bg-violet-600/15 rounded-full blur-2xl pointer-events-none" />

        <div className="relative flex flex-col sm:flex-row sm:items-end justify-between gap-5">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="flex items-center gap-1.5 bg-white/10 border border-white/10 px-2.5 py-1 rounded-full">
                <Layers size={10} className="text-blue-400" />
                <span className="text-[9px] font-black text-white/60 uppercase tracking-widest">{t('more.badge_workspace')}</span>
              </div>
              {isAdmin && (
                <div className="flex items-center gap-1.5 bg-red-500/20 border border-red-500/20 px-2.5 py-1 rounded-full">
                  <ShieldAlert size={10} className="text-red-400" />
                  <span className="text-[9px] font-black text-red-400 uppercase tracking-widest">{t('more.badge_admin')}</span>
                </div>
              )}
            </div>
            <h1 className="text-3xl font-black text-white tracking-tighter leading-none mb-2">{t('more.hero_title')}</h1>
            <p className="text-sm text-white/50 font-medium leading-relaxed max-w-md">
              {t('more.hero_subtitle')}
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <div className="text-right hidden sm:block">
              <p className="text-xl font-black text-white">{visibleTools.length}</p>
              <p className="text-[10px] text-white/40">{t('more.tools_available')}</p>
            </div>
            <div className="w-px h-10 bg-white/10 hidden sm:block" />
            <div className="text-right hidden sm:block">
              <p className="text-xl font-black text-white">{visibleTools.filter(tool => tool.isNew).length}</p>
              <p className="text-[10px] text-white/40">{t('more.recently_updated')}</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Search ── */}
      <div className="relative mb-6">
        <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          value={toolSearch}
          onChange={e => setToolSearch(e.target.value)}
          placeholder={t('more.search_tools_placeholder')}
          className="w-full pl-10 pr-4 py-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl text-sm text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:border-blue-400 dark:focus:border-blue-600 transition-all shadow-sm"
        />
        {toolSearch && (
          <button onClick={() => setToolSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg transition-colors">
            <X size={13} />
          </button>
        )}
      </div>

      {/* ── Tool grid (categorised) ── */}
      {toolSearch ? (
        /* flat search results */
        <div className="space-y-3 mb-8">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">
            {t(searchedTools.length !== 1 ? 'more.results_for' : 'more.result_for', { n: searchedTools.length, q: toolSearch })}
          </p>
          {searchedTools.length === 0 ? (
            <div className="py-12 text-center">
              <Search size={28} className="text-gray-200 dark:text-gray-700 mx-auto mb-2" />
              <p className="text-sm font-bold text-gray-400">{t('more.no_results')}</p>
            </div>
          ) : searchedTools.map(tool => <ToolCard key={tool.id} tool={tool} onClick={() => openTool(tool)} />)}
        </div>
      ) : (
        TOOL_CATEGORIES.map(cat => {
          const catTools = visibleTools.filter(t => t.category === cat.id);
          if (catTools.length === 0) return null;
          return (
            <div key={cat.id} className="mb-8">
              <div className="flex items-center gap-2.5 mb-3 px-1">
                <div className={`w-5 h-5 rounded-lg bg-gradient-to-br ${cat.accent} flex items-center justify-center shrink-0`}>
                  <cat.icon size={11} className="text-white" />
                </div>
                <p className="text-[11px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest">{t(cat.labelKey)}</p>
                <div className="flex-1 h-px bg-gray-100 dark:bg-gray-800" />
                <span className="text-[10px] text-gray-400 dark:text-gray-600">{t(catTools.length !== 1 ? 'more.tools_count' : 'more.tool_count', { n: catTools.length })}</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {catTools.map(tool => <ToolCard key={tool.id} tool={tool} onClick={() => openTool(tool)} />)}
              </div>
            </div>
          );
        })
      )}

      {/* ── Founder Node ── */}
      <div className="mb-6">
        <div className="flex items-center gap-2.5 mb-3 px-1">
          <div className="w-5 h-5 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shrink-0">
            <Crown size={11} className="text-white" />
          </div>
          <p className="text-[11px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest">{t('more.founder_node')}</p>
          <div className="flex-1 h-px bg-gray-100 dark:bg-gray-800" />
        </div>

        {(isFounder || isAdmin) ? (
          <Link href="/founder-dashboard" className="group relative overflow-hidden flex items-center justify-between p-5 bg-gradient-to-r from-blue-600 via-blue-600 to-blue-700 hover:from-blue-700 hover:via-blue-700 hover:to-blue-800 rounded-2xl shadow-lg shadow-blue-500/20 transition-all">
            <div className="absolute inset-0 opacity-[0.05]" style={{ backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)", backgroundSize: "18px 18px" }} />
            <div className="relative flex items-center gap-4">
              <div className="w-11 h-11 rounded-xl bg-white/20 flex items-center justify-center shrink-0 backdrop-blur-sm">
                <Crown size={20} className="text-white" />
              </div>
              <div>
                <p className="text-sm font-black text-white">{t('more.founder_dashboard')}</p>
                <p className="text-[11px] text-blue-200/80 font-medium mt-0.5">{t('more.founder_dashboard_desc')}</p>
              </div>
            </div>
            <div className="relative flex items-center gap-2">
              <span className="hidden sm:flex items-center gap-1 text-[10px] font-bold bg-white/15 text-white/80 px-2.5 py-1 rounded-full border border-white/10">
                {t('more.open_workspace')} <ArrowUpRight size={10} />
              </span>
              <ChevronRight size={16} className="text-blue-200 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </Link>
        ) : applicationStatus === "pending" ? (
          <div className="relative overflow-hidden flex items-start gap-4 p-5 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 rounded-2xl">
            <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center shrink-0">
              <Clock size={18} className="text-amber-600 dark:text-amber-400" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-black text-amber-700 dark:text-amber-300">{t('more.app_review_title')}</p>
              <p className="text-[11px] text-amber-600/80 dark:text-amber-400/70 font-medium mt-1 leading-relaxed">{t('more.app_review_desc')}</p>
            </div>
            <span className="shrink-0 w-2 h-2 bg-amber-400 rounded-full animate-pulse mt-1" />
          </div>
        ) : (
          <button onClick={() => setShowApplyModal(true)} className="group w-full relative overflow-hidden flex items-center justify-between p-5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-lg hover:shadow-blue-500/5 rounded-2xl transition-all text-left">
            <div className="flex items-center gap-4">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-gray-100 to-gray-50 dark:from-gray-800 dark:to-gray-800/50 border border-gray-200 dark:border-gray-700 group-hover:from-blue-50 group-hover:to-blue-50 dark:group-hover:from-blue-950/30 dark:group-hover:border-blue-800/40 flex items-center justify-center shrink-0 transition-all">
                <Crown size={18} className="text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors" />
              </div>
              <div>
                <p className="text-sm font-black text-gray-900 dark:text-gray-100">
                  {applicationStatus === "declined" ? t('more.reapply_cofounder') : t('more.apply_cofounder')}
                </p>
                <p className="text-[11px] text-gray-500 dark:text-gray-500 font-medium mt-0.5">
                  {applicationStatus === "declined" ? t('more.reapply_desc') : t('more.apply_desc')}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {applicationStatus === "declined" && <Badge color="red">{t('more.reapply_badge')}</Badge>}
              <ChevronRight size={15} className="text-gray-300 group-hover:text-blue-500 transition-all group-hover:translate-x-0.5" />
            </div>
          </button>
        )}
      </div>

      {/* ── Quick links ── */}
      <div className="mb-6">
        <div className="flex items-center gap-2.5 mb-3 px-1">
          <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest">{t('more.quick_links')}</p>
          <div className="flex-1 h-px bg-gray-100 dark:bg-gray-800" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[
            { label: t('more.ql_feed'),          href: "/dash/feed",          icon: <BarChart3 size={14} />,   color: "text-blue-500"   },
            { label: t('more.ql_jobs'),          href: "/dash/jobs",          icon: <Briefcase size={14} />,   color: "text-green-500"  },
            { label: t('more.ql_connections'),   href: "/dash/connections",   icon: <Users size={14} />,       color: "text-violet-500" },
            { label: t('more.ql_notifications'), href: "/dash/notifications", icon: <Bell size={14} />,      color: "text-amber-500"  },
          ].map(item => (
            <Link
              key={item.label}
              href={item.href}
              className="flex items-center gap-2.5 p-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl hover:border-gray-300 dark:hover:border-gray-700 hover:-translate-y-0.5 transition-all group shadow-sm"
            >
              <span className={`${item.color} shrink-0`}>{item.icon}</span>
              <span className="text-xs font-bold text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-gray-100 transition-colors">{item.label}</span>
              <ChevronRight size={10} className="text-gray-300 dark:text-gray-700 ml-auto shrink-0 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          ))}
        </div>
      </div>

      {/* ── Sign out ── */}
      <div className="pt-4 border-t border-gray-100 dark:border-white/[0.04]">
        <button onClick={handleSignOut} className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-gray-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all text-sm font-bold group">
          <LogOut size={14} className="group-hover:-translate-x-0.5 transition-transform" />
          {t('more.sign_out_btn')}
        </button>
      </div>

      {/* ── Co-Founder Apply Modal ── */}
      {showApplyModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => setShowApplyModal(false)} />
          <div className="relative w-full max-w-2xl max-h-[90vh] bg-gray-50 dark:bg-[#0c0c10] border border-gray-200 dark:border-gray-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-gray-900/80 shrink-0 backdrop-blur-sm">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
                  <Crown size={16} className="text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h2 className="text-sm font-black text-gray-900 dark:text-white">{t('more.cofounder_application')}</h2>
                  <p className="text-[10px] text-gray-500 dark:text-gray-500 font-medium">{t('more.cofounder_application_desc')}</p>
                </div>
              </div>
              <button onClick={() => setShowApplyModal(false)} className="p-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 text-gray-500 rounded-xl transition-all">
                <X size={16} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5">
              <FounderContent onSubmitSuccess={() => { setShowApplyModal(false); setApplicationStatus("pending"); }} />
            </div>
          </div>
        </div>
      )}

      {/* ── Tool Modal ── */}
      {activeItem && (() => {
        const tc = TOOL_COLOR_MAP[activeItem.color] || TOOL_COLOR_MAP.blue;
        return (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={closeTool} />
            <div className="relative w-full max-w-4xl h-[88vh] bg-gray-50 dark:bg-[#0c0c10] border border-gray-200 dark:border-gray-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">

              {/* Colored modal header */}
              <div className={`relative overflow-hidden flex items-center justify-between px-5 py-4 bg-gradient-to-r ${tc.gradient} shrink-0`}>
                <div className="absolute inset-0 opacity-[0.06]" style={{ backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)", backgroundSize: "16px 16px" }} />
                <div className="relative flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center shrink-0 backdrop-blur-sm">
                    <activeItem.icon size={16} className="text-white" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-sm font-black text-white">{t(activeItem.labelKey)}</h2>
                      {activeItem.isNew && (
                        <span className="text-[9px] font-black bg-white/20 text-white px-1.5 py-0.5 rounded-full border border-white/20">{t('more.updated')}</span>
                      )}
                    </div>
                    <p className="text-[10px] text-white/60 font-medium">{t(activeItem.descKey)}</p>
                  </div>
                </div>
                <div className="relative flex items-center gap-2">
                  <div className="hidden sm:flex gap-1">
                    {activeItem.tagKeys.slice(0, 2).map(tagKey => (
                      <span key={tagKey} className="text-[9px] font-bold bg-white/15 text-white/80 px-2 py-0.5 rounded-full border border-white/10">{t(tagKey)}</span>
                    ))}
                  </div>
                  <button onClick={closeTool} className="p-2 bg-white/15 hover:bg-white/25 border border-white/10 text-white/80 hover:text-white transition-all rounded-xl backdrop-blur-sm">
                    <X size={15} />
                  </button>
                </div>
              </div>

              {/* Modal body */}
              <div className={`flex-1 overflow-hidden ${activeItem.id === "admin" ? "flex flex-col" : "overflow-y-auto"}`}>
                <div className={activeItem.id === "admin" ? "flex flex-col h-full" : "p-5"}>
                  {activeItem.id === "status"         && <SystemStatusTool />}
                  {activeItem.id === "api"            && <ApiAccessTool />}
                  {activeItem.id === "community"      && <div className="h-full"><CommunityHubTool currentUserId={currentUserId} /></div>}
                  {activeItem.id === "support"        && <SupportTool />}
                  {activeItem.id === "quotes"         && <QuoteTool />}
                  {activeItem.id === "admin"          && <AdminPanelTool currentUserId={currentUserId} />}
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
