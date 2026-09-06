"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Image from "next/image";
import {
  Compass, Search, UserPlus, X, Loader2,
  Briefcase, Code2, Palette, Brain, TrendingUp,
  CheckCircle2, MessageSquare, Users, MapPin, RefreshCw,
} from "lucide-react";
import { supabase } from "../../supabaseClient";
import VerifiedBadge from "../../components/VerifiedBadge";
import PremiumBadge from "../../components/PremiumBadge";
import { useLanguage } from "../../../lib/i18n";

function wsLabel(v, t) {
  if (!v) return "";
  return t(`discover.ws.${String(v).toLowerCase().replace(/ /g, "_")}`);
}

const WORK_STATUS_STYLES = {
  "Open to work": { bg: "bg-emerald-50 dark:bg-emerald-500/10", text: "text-emerald-700 dark:text-emerald-400", dot: "bg-emerald-500" },
  "Hiring":       { bg: "bg-blue-50 dark:bg-blue-500/10",       text: "text-blue-700 dark:text-blue-400",       dot: "bg-blue-500" },
  "Freelancing":  { bg: "bg-violet-50 dark:bg-violet-500/10",   text: "text-violet-700 dark:text-violet-400",   dot: "bg-violet-500" },
  "Student":      { bg: "bg-amber-50 dark:bg-amber-500/10",     text: "text-amber-700 dark:text-amber-400",     dot: "bg-amber-500" },
  "Building":     { bg: "bg-orange-50 dark:bg-orange-500/10",   text: "text-orange-700 dark:text-orange-400",   dot: "bg-orange-500" },
};

const ROLE_FILTERS = [
  { id: "all",      labelKey: "discover.roles.all",      icon: Users },
  { id: "tech",     labelKey: "discover.roles.tech",     icon: Code2 },
  { id: "design",   labelKey: "discover.roles.design",   icon: Palette },
  { id: "business", labelKey: "discover.roles.business", icon: Briefcase },
  { id: "ai",       labelKey: "discover.roles.ai",       icon: Brain },
  { id: "growth",   labelKey: "discover.roles.growth",   icon: TrendingUp },
];

// Keyword sets used to bucket a member into a role filter, matched against
// their skills, headline/status and name.
const ROLE_KEYWORDS = {
  tech:     ["develop", "engineer", "react", "node", "python", "java", "typescript", "golang", " go ", "rust", "backend", "frontend", "full-stack", "fullstack", "devops", "software", "programmer", "mobile", "android", "ios", "cloud"],
  design:   ["design", "ux", "ui", "figma", "graphic", "illustrat", "brand", "typograph", "motion", "product design"],
  business: ["business", "manager", "founder", "ceo", "coo", "operations", "strategy", "consult", "analyst", "finance", "account", "sales", "product manager"],
  ai:       ["ai", "a.i", "ml", "machine learning", "data scien", "nlp", "deep learning", "llm", "pytorch", "tensorflow", "computer vision"],
  growth:   ["growth", "marketing", "seo", "content", "social media", "demand gen", "community", "copywrit", "paid ads"],
};

function matchesRole(user, role) {
  if (role === "all") return true;
  const kws = ROLE_KEYWORDS[role] || [];
  const hay = [
    ...(Array.isArray(user.skills) ? user.skills : []),
    user.status || "",
    user.full_name || "",
    user.username || "",
  ].join(" ").toLowerCase();
  return kws.some((k) => hay.includes(k));
}

function UserCard({ user, connectionStatus, onConnect, onMessage, onView, processing }) {
  const { t } = useLanguage();
  const statusStyle = WORK_STATUS_STYLES[user.work_status] || null;
  const initials = (user.full_name || user.username || "?").substring(0, 2).toUpperCase();

  return (
    <div
      onClick={() => onView(user.id)}
      className="group flex flex-col bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-4 hover:border-blue-300 dark:hover:border-blue-700/60 hover:shadow-md hover:shadow-blue-500/5 transition-all duration-200 cursor-pointer"
    >
      {/* Identity */}
      <div className="flex items-start gap-3">
        <div className="relative w-12 h-12 rounded-xl overflow-hidden shrink-0 bg-gradient-to-br from-blue-600 to-indigo-500 flex items-center justify-center text-white font-black text-sm">
          {user.avatar_url ? (
            <Image src={user.avatar_url} alt={user.username} fill sizes="48px" className="object-cover" />
          ) : (
            initials
          )}
          {user.is_online && (
            <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-400 rounded-full border-2 border-white dark:border-gray-900" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <h3 className="font-bold text-gray-900 dark:text-gray-100 text-sm leading-tight truncate">
              {user.full_name || user.username}
            </h3>
            {user.is_verified && <VerifiedBadge size={13} />}
            {user.is_premium && <PremiumBadge size={13} />}
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">@{user.username}</p>
          {user.location && (
            <p className="flex items-center gap-1 text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">
              <MapPin size={10} /> {user.location}
            </p>
          )}
        </div>
      </div>

      {/* Bio */}
      {user.status && (
        <p className="text-xs text-gray-600 dark:text-gray-300 line-clamp-2 leading-relaxed mt-3">{user.status}</p>
      )}

      {/* Skills */}
      {user.skills?.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-3">
          {user.skills.slice(0, 3).map((s) => (
            <span key={s} className="text-[10px] font-semibold bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-full">
              {s}
            </span>
          ))}
          {user.skills.length > 3 && (
            <span className="text-[10px] font-semibold bg-gray-100 dark:bg-gray-800 text-gray-500 px-2 py-0.5 rounded-full">
              +{user.skills.length - 3}
            </span>
          )}
        </div>
      )}

      {/* Work status */}
      {statusStyle && (
        <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold mt-3 w-fit ${statusStyle.bg} ${statusStyle.text}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${statusStyle.dot}`} />
          {wsLabel(user.work_status, t)}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 mt-4 pt-3 border-t border-gray-100 dark:border-gray-800" onClick={(e) => e.stopPropagation()}>
        {connectionStatus === "none" && (
          <button
            onClick={() => onConnect(user.id)}
            disabled={processing === user.id}
            className="flex-1 flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white text-xs font-bold py-2 rounded-xl transition-all disabled:opacity-50"
          >
            {processing === user.id ? <Loader2 size={12} className="animate-spin" /> : <UserPlus size={12} />}
            {t("discover.connect")}
          </button>
        )}
        {connectionStatus === "pending" && (
          <span className="flex-1 flex items-center justify-center gap-1.5 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 text-xs font-bold py-2 rounded-xl border border-amber-200 dark:border-amber-800/40">
            {t("discover.pending")}
          </span>
        )}
        {connectionStatus === "accepted" && (
          <span className="flex-1 flex items-center justify-center gap-1.5 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 text-xs font-bold py-2 rounded-xl border border-emerald-200 dark:border-emerald-800/40">
            <CheckCircle2 size={12} /> {t("discover.connected")}
          </span>
        )}
        <button
          onClick={() => onMessage(user.id)}
          aria-label="Message"
          className="w-9 h-9 shrink-0 flex items-center justify-center rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-600 dark:hover:text-blue-400 transition-all"
        >
          <MessageSquare size={14} />
        </button>
      </div>
    </div>
  );
}

function EmptyState({ onReset }) {
  const { t } = useLanguage();
  return (
    <div className="col-span-full flex flex-col items-center justify-center py-20 text-center">
      <div className="w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center mb-4">
        <Compass size={28} className="text-blue-500" />
      </div>
      <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-1">{t("discover.no_members")}</h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 max-w-xs">{t("discover.no_members_hint")}</p>
      <button onClick={onReset} className="flex items-center gap-2 text-sm font-semibold text-blue-600 dark:text-blue-400 hover:underline">
        <RefreshCw size={14} /> {t("discover.reset_filters")}
      </button>
    </div>
  );
}

export default function DiscoverContent() {
  const { t } = useLanguage();
  const [currentUserId, setCurrentUserId] = useState(null);
  const [users, setUsers] = useState([]);
  const [connections, setConnections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [workFilter, setWorkFilter] = useState("all");
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      const uid = session?.user?.id;
      setCurrentUserId(uid);

      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, username, full_name, status, avatar_url, is_verified, is_premium, work_status, location, skills")
        .neq("id", uid || "00000000-0000-0000-0000-000000000000")
        .limit(120);

      if (uid) {
        const { data: conns } = await supabase
          .from("connections")
          .select("sender_id, receiver_id, status")
          .or(`sender_id.eq.${uid},receiver_id.eq.${uid}`);
        setConnections(conns || []);
      }

      setUsers(profiles || []);
      setLoading(false);
    };
    load();
  }, []);

  const getConnectionStatus = useCallback((userId) => {
    if (!currentUserId) return "none";
    const conn = connections.find(
      (c) =>
        (c.sender_id === currentUserId && c.receiver_id === userId) ||
        (c.receiver_id === currentUserId && c.sender_id === userId)
    );
    return conn ? conn.status : "none";
  }, [connections, currentUserId]);

  const handleConnect = async (userId) => {
    if (!currentUserId) { showToast(t("discover.toast_signin"), "error"); return; }
    setProcessing(userId);
    const { error } = await supabase
      .from("connections")
      .insert({ sender_id: currentUserId, receiver_id: userId, status: "pending" });
    if (!error) {
      setConnections((prev) => [...prev, { sender_id: currentUserId, receiver_id: userId, status: "pending" }]);
      showToast(t("discover.toast_sent"));
    } else {
      showToast(t("discover.toast_error"), "error");
    }
    setProcessing(null);
  };

  const handleMessage = (userId) => {
    window.location.href = `/dash/messages?user=${userId}`;
  };

  const resetFilters = () => { setSearchQuery(""); setWorkFilter("all"); setRoleFilter("all"); };
  const hasFilters = searchQuery || workFilter !== "all" || roleFilter !== "all";

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return users.filter((u) => {
      if (q && !(
        u.username?.toLowerCase().includes(q) ||
        u.full_name?.toLowerCase().includes(q) ||
        u.status?.toLowerCase().includes(q) ||
        u.skills?.some((s) => s.toLowerCase().includes(q))
      )) return false;
      if (workFilter !== "all" && u.work_status !== workFilter) return false;
      if (!matchesRole(u, roleFilter)) return false;
      return true;
    });
  }, [users, searchQuery, workFilter, roleFilter]);

  if (selectedUserId) {
    const { default: ProfileContent } = require("./ProfileContent");
    return (
      <div className="w-full max-w-4xl mx-auto">
        <button
          onClick={() => setSelectedUserId(null)}
          className="flex items-center gap-2 text-sm font-semibold text-blue-600 dark:text-blue-400 hover:underline mb-4"
        >
          ← {t("discover.back")}
        </button>
        <ProfileContent viewUserId={selectedUserId} />
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-md shadow-blue-500/25 shrink-0">
          <Compass size={19} className="text-white" />
        </div>
        <div className="min-w-0">
          <h1 className="text-xl font-black text-gray-900 dark:text-gray-100 tracking-tight leading-tight">{t("discover.title")}</h1>
          <p className="text-xs text-gray-500 dark:text-gray-400">{t("discover.subtitle")}</p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-2 mb-3">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t("discover.search_ph")}
            className="w-full pl-9 pr-4 py-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
          />
        </div>
        <select
          value={workFilter}
          onChange={(e) => setWorkFilter(e.target.value)}
          className="px-3 py-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:border-blue-500 transition-all sm:w-48"
        >
          <option value="all">{t("discover.all_statuses")}</option>
          <option value="Open to work">{t("discover.ws.open_to_work")}</option>
          <option value="Hiring">{t("discover.ws.hiring")}</option>
          <option value="Freelancing">{t("discover.ws.freelancing")}</option>
          <option value="Building">{t("discover.ws.building")}</option>
          <option value="Student">{t("discover.ws.student")}</option>
        </select>
      </div>

      {/* Role chips */}
      <div className="flex items-center gap-2 mb-5 overflow-x-auto no-scrollbar pb-1 -mx-1 px-1">
        {ROLE_FILTERS.map(({ id, labelKey, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setRoleFilter(id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap shrink-0 transition-all ${
              roleFilter === id
                ? "bg-blue-600 text-white shadow-sm shadow-blue-500/30"
                : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
            }`}
          >
            <Icon size={11} />
            {t(labelKey)}
          </button>
        ))}
      </div>

      {/* Count */}
      {!loading && (
        <div className="flex items-center gap-2 mb-4 text-sm text-gray-500 dark:text-gray-400">
          <Users size={13} />
          <span><strong className="text-gray-900 dark:text-gray-100">{filtered.length}</strong> {t("discover.members_found")}</span>
          {hasFilters && (
            <button
              onClick={resetFilters}
              className="ml-auto flex items-center gap-1 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
            >
              <X size={11} /> {t("discover.clear_filters")}
            </button>
          )}
        </div>
      )}

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {[...Array(9)].map((_, i) => (
            <div key={i} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-4 animate-pulse">
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-xl bg-gray-200 dark:bg-gray-800 shrink-0" />
                <div className="flex-1 space-y-2 pt-1">
                  <div className="h-3.5 bg-gray-200 dark:bg-gray-800 rounded w-3/4" />
                  <div className="h-3 bg-gray-200 dark:bg-gray-800 rounded w-1/2" />
                </div>
              </div>
              <div className="h-8 bg-gray-200 dark:bg-gray-800 rounded-xl mt-4" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="grid grid-cols-1">
          <EmptyState onReset={resetFilters} />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((user) => (
            <UserCard
              key={user.id}
              user={user}
              connectionStatus={getConnectionStatus(user.id)}
              onConnect={handleConnect}
              onMessage={handleMessage}
              onView={setSelectedUserId}
              processing={processing}
            />
          ))}
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-24 md:bottom-6 left-1/2 -translate-x-1/2 z-[300] px-4 py-3 rounded-2xl text-sm font-semibold shadow-2xl animate-in slide-in-from-bottom-4 duration-300 ${
          toast.type === "error"
            ? "bg-red-600 text-white"
            : "bg-gray-900 dark:bg-white text-white dark:text-gray-900"
        }`}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}
