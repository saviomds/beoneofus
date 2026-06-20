"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import {
  Compass, Search, UserPlus, X, Loader2, Filter,
  Briefcase, Code2, Palette, Brain, Globe, TrendingUp,
  CheckCircle2, MessageSquare, Star, Users, Sparkles,
  MapPin, ChevronDown, RefreshCw, Heart, Award, Building2,
} from "lucide-react";
import { supabase } from "../../supabaseClient";
import VerifiedBadge from "../../components/VerifiedBadge";
import PremiumBadge from "../../components/PremiumBadge";
import { getAvatarSrc } from "../../../lib/avatar";

const WORK_STATUS_STYLES = {
  "Open to work":    { bg: "bg-emerald-100 dark:bg-emerald-900/30", text: "text-emerald-700 dark:text-emerald-400", dot: "bg-emerald-500" },
  "Hiring":          { bg: "bg-blue-100 dark:bg-blue-900/30",    text: "text-blue-700 dark:text-blue-400",    dot: "bg-blue-500"    },
  "Freelancing":     { bg: "bg-purple-100 dark:bg-purple-900/30", text: "text-purple-700 dark:text-purple-400", dot: "bg-purple-500"  },
  "Student":         { bg: "bg-amber-100 dark:bg-amber-900/30",  text: "text-amber-700 dark:text-amber-400",  dot: "bg-amber-500"   },
  "Building":        { bg: "bg-orange-100 dark:bg-orange-900/30", text: "text-orange-700 dark:text-orange-400", dot: "bg-orange-500"  },
};

const ROLE_FILTERS = [
  { id: "all",      label: "Everyone",   icon: Users    },
  { id: "tech",     label: "Tech",       icon: Code2    },
  { id: "design",   label: "Design",     icon: Palette  },
  { id: "business", label: "Business",   icon: Briefcase },
  { id: "ai",       label: "AI / ML",    icon: Brain    },
  { id: "growth",   label: "Growth",     icon: TrendingUp },
];

function UserCard({ user, connectionStatus, onConnect, onMessage, onView, processing }) {
  const statusStyle = WORK_STATUS_STYLES[user.work_status] || null;
  const initials = (user.full_name || user.username || "?").substring(0, 2).toUpperCase();

  return (
    <div
      className="group bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden hover:border-blue-300 dark:hover:border-blue-700/50 hover:shadow-lg hover:shadow-blue-500/5 transition-all duration-200 cursor-pointer"
      onClick={() => onView(user.id)}
    >
      {/* Banner */}
      <div className="relative h-16 bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600 overflow-hidden">
        {user.banner_url && (
          <Image src={user.banner_url} alt="" fill className="object-cover opacity-80" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
      </div>

      {/* Avatar */}
      <div className="px-4 pb-4">
        <div className="-mt-7 mb-3 relative w-fit">
          <div className="w-14 h-14 rounded-2xl ring-3 ring-white dark:ring-gray-900 overflow-hidden bg-gradient-to-br from-blue-600 to-indigo-500 shadow-lg">
            {user.avatar_url ? (
              <Image src={user.avatar_url} alt={user.username} fill className="object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-white font-black text-lg">
                {initials}
              </div>
            )}
          </div>
          {user.is_online && (
            <span className="absolute bottom-0.5 right-0.5 w-3 h-3 bg-emerald-400 rounded-full border-2 border-white dark:border-gray-900" />
          )}
        </div>

        <div className="space-y-1 mb-3">
          <div className="flex items-center gap-1.5 flex-wrap">
            <h3 className="font-bold text-gray-900 dark:text-gray-100 text-sm leading-tight">
              {user.full_name || user.username}
            </h3>
            {user.is_verified && <VerifiedBadge size={13} />}
            {user.is_premium && <PremiumBadge size={13} />}
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">@{user.username}</p>
          {user.status && (
            <p className="text-xs text-gray-600 dark:text-gray-300 line-clamp-2 leading-relaxed">{user.status}</p>
          )}
          {user.location && (
            <p className="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500">
              <MapPin size={10} /> {user.location}
            </p>
          )}
        </div>

        {/* Skills */}
        {user.skills?.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
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
          <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold mb-3 ${statusStyle.bg} ${statusStyle.text}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${statusStyle.dot}`} />
            {user.work_status}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 mt-1" onClick={(e) => e.stopPropagation()}>
          {connectionStatus === 'none' && (
            <button
              onClick={() => onConnect(user.id)}
              disabled={processing === user.id}
              className="flex-1 flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white text-xs font-bold py-2 rounded-xl transition-all disabled:opacity-50"
            >
              {processing === user.id ? <Loader2 size={12} className="animate-spin" /> : <UserPlus size={12} />}
              Connect
            </button>
          )}
          {connectionStatus === 'pending' && (
            <button disabled className="flex-1 flex items-center justify-center gap-1.5 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 text-xs font-bold py-2 rounded-xl border border-amber-200 dark:border-amber-800/40 opacity-70">
              Pending
            </button>
          )}
          {connectionStatus === 'accepted' && (
            <button disabled className="flex-1 flex items-center justify-center gap-1.5 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 text-xs font-bold py-2 rounded-xl border border-emerald-200 dark:border-emerald-800/40">
              <CheckCircle2 size={12} /> Connected
            </button>
          )}
          <button
            onClick={() => onMessage(user.id)}
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-600 dark:hover:text-blue-400 transition-all"
          >
            <MessageSquare size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}

function EmptyState({ onReset }) {
  return (
    <div className="col-span-full flex flex-col items-center justify-center py-20 text-center">
      <div className="w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center mb-4">
        <Compass size={28} className="text-blue-500" />
      </div>
      <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-1">No members found</h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 max-w-xs">
        Try adjusting your filters or search query.
      </p>
      <button
        onClick={onReset}
        className="flex items-center gap-2 text-sm font-semibold text-blue-600 dark:text-blue-400 hover:underline"
      >
        <RefreshCw size={14} /> Reset filters
      </button>
    </div>
  );
}

export default function DiscoverContent() {
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
        .select("id, username, full_name, status, avatar_url, banner_url, is_verified, is_premium, work_status, location, skills")
        .neq("id", uid || "00000000-0000-0000-0000-000000000000")
        .limit(80);

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
    if (!conn) return "none";
    return conn.status;
  }, [connections, currentUserId]);

  const handleConnect = async (userId) => {
    if (!currentUserId) { showToast("Sign in to connect", "error"); return; }
    setProcessing(userId);
    const { error } = await supabase
      .from("connections")
      .insert({ sender_id: currentUserId, receiver_id: userId, status: "pending" });
    if (!error) {
      setConnections((prev) => [...prev, { sender_id: currentUserId, receiver_id: userId, status: "pending" }]);
      showToast("Connection request sent!");
    } else {
      showToast("Something went wrong", "error");
    }
    setProcessing(null);
  };

  const handleMessage = (userId) => {
    window.location.href = `/dash/messages?user=${userId}`;
  };

  const filtered = users.filter((u) => {
    const q = searchQuery.toLowerCase();
    if (q && !(
      u.username?.toLowerCase().includes(q) ||
      u.full_name?.toLowerCase().includes(q) ||
      u.status?.toLowerCase().includes(q) ||
      u.skills?.some((s) => s.toLowerCase().includes(q))
    )) return false;
    if (workFilter !== "all" && u.work_status !== workFilter) return false;
    return true;
  });

  if (selectedUserId) {
    const { default: ProfileContent } = require("./ProfileContent");
    return (
      <div>
        <button
          onClick={() => setSelectedUserId(null)}
          className="flex items-center gap-2 text-sm font-semibold text-blue-600 dark:text-blue-400 hover:underline mb-4"
        >
          ← Back to Discover
        </button>
        <ProfileContent viewUserId={selectedUserId} />
      </div>
    );
  }

  return (
    <div className="w-full max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-md shadow-blue-500/25">
            <Compass size={18} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-black text-gray-900 dark:text-gray-100 tracking-tight">Discover</h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">Find people to connect with</p>
          </div>
        </div>
      </div>

      {/* Filters row */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        {/* Search */}
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, skills, bio…"
            className="w-full pl-9 pr-4 py-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
          />
        </div>

        {/* Work status filter */}
        <select
          value={workFilter}
          onChange={(e) => setWorkFilter(e.target.value)}
          className="px-3 py-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:border-blue-500 transition-all"
        >
          <option value="all">All statuses</option>
          <option value="Open to work">Open to work</option>
          <option value="Hiring">Hiring</option>
          <option value="Freelancing">Freelancing</option>
          <option value="Building">Building</option>
          <option value="Student">Student</option>
        </select>
      </div>

      {/* Role filter chips */}
      <div className="flex items-center gap-2 mb-6 overflow-x-auto no-scrollbar pb-1">
        {ROLE_FILTERS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setRoleFilter(id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
              roleFilter === id
                ? "bg-blue-600 text-white shadow-sm shadow-blue-500/30"
                : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
            }`}
          >
            <Icon size={11} />
            {label}
          </button>
        ))}
      </div>

      {/* Stats bar */}
      {!loading && (
        <div className="flex items-center gap-2 mb-5 text-sm text-gray-500 dark:text-gray-400">
          <Users size={13} />
          <span><strong className="text-gray-900 dark:text-gray-100">{filtered.length}</strong> members found</span>
          {(searchQuery || workFilter !== "all" || roleFilter !== "all") && (
            <button
              onClick={() => { setSearchQuery(""); setWorkFilter("all"); setRoleFilter("all"); }}
              className="ml-auto flex items-center gap-1 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
            >
              <X size={11} /> Clear filters
            </button>
          )}
        </div>
      )}

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(9)].map((_, i) => (
            <div key={i} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden animate-pulse">
              <div className="h-16 bg-gray-200 dark:bg-gray-800" />
              <div className="px-4 pb-4 pt-2">
                <div className="w-14 h-14 rounded-2xl bg-gray-200 dark:bg-gray-800 -mt-7 mb-3" />
                <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-3/4 mb-2" />
                <div className="h-3 bg-gray-200 dark:bg-gray-800 rounded w-1/2 mb-3" />
                <div className="h-8 bg-gray-200 dark:bg-gray-800 rounded-xl" />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="grid grid-cols-1">
          <EmptyState onReset={() => { setSearchQuery(""); setWorkFilter("all"); setRoleFilter("all"); }} />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
