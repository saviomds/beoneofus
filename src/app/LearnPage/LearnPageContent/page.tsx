"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Plus, Lock, Globe, Trash2, Settings, Send, Smile,
  Code2, Paperclip, X, Users, Loader2, Copy, Check,
  FileText, Download, ArrowLeft, Crown, Menu,
  Image as ImageIcon, BookOpen, Shield, UserPlus,
  Hash, Eye, EyeOff,
} from "lucide-react";
import Image from "next/image";
import { supabase } from "../../supabaseClient";
import hljs from "highlight.js";
import "highlight.js/styles/shades-of-purple.css";

// ── Types ──────────────────────────────────────────────────────────────────────
interface PageItem {
  id: string;
  title: string;
  description: string;
  icon: string;
  created_by: string | null;
  visibility: "public" | "members" | "private";
  created_at: string;
}
interface Msg {
  id: string;
  page_id: string;
  user_id: string;
  content: string;
  type: "text" | "image" | "code" | "file";
  metadata: Record<string, string | number>;
  created_at: string;
  profiles?: { username: string; avatar_url: string | null } | null;
}
interface Member {
  id: string;
  page_id: string;
  user_id: string;
  role: "viewer" | "editor" | "admin";
  profiles?: { username: string; avatar_url: string | null } | null;
}

// ── Constants ──────────────────────────────────────────────────────────────────
const EMOJIS = [
  "😀","😂","😍","🤔","👍","👏","🔥","💡","⭐","🎉",
  "🚀","💻","📚","✅","❌","⚡","🌟","💪","🤝","🙌",
  "😎","🤩","🥳","😅","🤦","🙈","👀","💯","🎯","🔑",
  "📝","📌","🔔","💬","🌈","🏆","🎓","⚙️","🔧","❤️",
];
const CODE_LANGS = [
  "javascript","typescript","python","bash","css","html",
  "sql","json","go","rust","java","c","cpp","php","ruby",
];
const PAGE_ICONS = [
  "📄","📋","📝","📌","📎","🗒️","📔","📕","📗","📘",
  "📙","🗂️","💡","🚀","⭐","🔥","💻","🎯","🌟","🔬",
];
const ROLES = [
  { value: "viewer",  label: "Viewer",  desc: "Can read messages" },
  { value: "editor",  label: "Editor",  desc: "Can read & post" },
  { value: "admin",   label: "Admin",   desc: "Full access" },
] as const;

// ── Helpers ────────────────────────────────────────────────────────────────────
function relTime(iso: string) {
  const d = Date.now() - new Date(iso).getTime();
  if (d < 60000) return "just now";
  if (d < 3600000) return `${Math.floor(d / 60000)}m`;
  if (d < 86400000) return `${Math.floor(d / 3600000)}h`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
function avatar(seed: string) {
  return seed[0]?.toUpperCase() ?? "?";
}

// ── CodeBlock ──────────────────────────────────────────────────────────────────
function CodeBlock({ content, language }: { content: string; language: string }) {
  const [copied, setCopied] = useState(false);
  const codeRef = useRef<HTMLElement>(null);
  useEffect(() => {
    if (codeRef.current) { codeRef.current.removeAttribute("data-highlighted"); hljs.highlightElement(codeRef.current); }
  }, [content]);
  const copy = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="mt-2 rounded-xl overflow-hidden border border-gray-700 bg-gray-900 max-w-2xl">
      <div className="flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700">
        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{language}</span>
        <button onClick={copy} className="flex items-center gap-1 text-xs text-gray-400 hover:text-white transition-colors">
          {copied ? <><Check size={11} className="text-emerald-400" /> Copied</> : <><Copy size={11} /> Copy</>}
        </button>
      </div>
      <pre className="p-4 overflow-x-auto text-sm m-0 leading-relaxed">
        <code ref={codeRef} className={`language-${language}`}>{content}</code>
      </pre>
    </div>
  );
}

// ── MessageBubble ──────────────────────────────────────────────────────────────
function MessageBubble({
  msg, userId, isAdmin, onDelete, grouped,
}: { msg: Msg; userId: string | null; isAdmin: boolean; onDelete: (id: string) => void; grouped: boolean }) {
  const canDelete = msg.user_id === userId || isAdmin;
  return (
    <div className={`group flex items-start gap-3 px-4 hover:bg-gray-50 dark:hover:bg-gray-800/20 transition-colors ${grouped ? "py-0.5" : "pt-4 pb-0.5"}`}>
      {/* Avatar */}
      {!grouped ? (
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center text-white text-xs font-black shrink-0 mt-0.5 overflow-hidden">
          {msg.profiles?.avatar_url
            ? <Image src={msg.profiles.avatar_url} alt="" width={36} height={36} unoptimized className="w-full h-full object-cover" />
            : avatar(msg.profiles?.username ?? "?")}
        </div>
      ) : <div className="w-9 shrink-0" />}

      <div className="flex-1 min-w-0">
        {!grouped && (
          <div className="flex items-baseline gap-2 mb-0.5">
            <span className="text-sm font-bold text-gray-900 dark:text-gray-100">{msg.profiles?.username ?? "Unknown"}</span>
            <span className="text-[10px] text-gray-400">{relTime(msg.created_at)}</span>
          </div>
        )}

        {msg.type === "text" && (
          <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-words leading-relaxed">{msg.content}</p>
        )}
        {msg.type === "image" && (
          <Image
            src={(msg.metadata?.url as string) || msg.content}
            alt="shared"
            width={0}
            height={0}
            sizes="100vw"
            unoptimized
            style={{ width: "auto", height: "auto" }}
            className="mt-1 max-w-xs max-h-64 rounded-xl object-cover border border-gray-200 dark:border-gray-700 cursor-pointer hover:opacity-90 transition-opacity"
            onClick={() => window.open((msg.metadata?.url as string) || msg.content, "_blank")}
          />
        )}
        {msg.type === "code" && (
          <CodeBlock content={msg.content} language={(msg.metadata?.language as string) || "javascript"} />
        )}
        {msg.type === "file" && (
          <a
            href={(msg.metadata?.url as string) || msg.content}
            download={msg.metadata?.filename as string}
            target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-3 mt-1 px-4 py-3 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 rounded-xl transition-colors"
          >
            <div className="w-9 h-9 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <FileText size={18} className="text-blue-600 dark:text-blue-400" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate max-w-[200px]">{msg.metadata?.filename as string || "File"}</p>
              {msg.metadata?.filesize && <p className="text-[10px] text-gray-500">{((msg.metadata.filesize as number) / 1024).toFixed(1)} KB</p>}
            </div>
            <Download size={15} className="text-gray-400 ml-auto shrink-0" />
          </a>
        )}
      </div>

      {canDelete && (
        <button
          onClick={() => onDelete(msg.id)}
          className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all shrink-0 mt-0.5"
        >
          <Trash2 size={13} />
        </button>
      )}
    </div>
  );
}

// ── PageSettingsModal ──────────────────────────────────────────────────────────
function PageSettingsModal({
  page, userId, isAdmin, onClose, onUpdate, onDelete,
}: {
  page: PageItem; userId: string | null; isAdmin: boolean;
  onClose: () => void;
  onUpdate: (updates: Partial<PageItem>) => Promise<void>;
  onDelete: () => void;
}) {
  const [tab, setTab] = useState<"general" | "members">("general");
  const [form, setForm] = useState({ title: page.title, description: page.description, icon: page.icon, visibility: page.visibility });
  const [isSaving, setIsSaving] = useState(false);
  const [members, setMembers] = useState<Member[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<{ id: string; username: string; avatar_url: string | null }[]>([]);
  const [addRole, setAddRole] = useState<"viewer" | "editor" | "admin">("editor");
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    supabase.from("page_members").select("*, profiles(username, avatar_url)").eq("page_id", page.id)
      .then(({ data }) => { if (data) setMembers(data as Member[]); });
  }, [page.id]);

  const save = async () => {
    setIsSaving(true);
    await onUpdate(form);
    setIsSaving(false);
  };

  const searchUsers = async (q: string) => {
    if (q.length < 2) { setSearchResults([]); return; }
    setIsSearching(true);
    const { data } = await supabase.from("profiles").select("id, username, avatar_url")
      .ilike("username", `%${q}%`).limit(5);
    setSearchResults((data ?? []) as { id: string; username: string; avatar_url: string | null }[]);
    setIsSearching(false);
  };

  const addMember = async (profile: { id: string; username: string; avatar_url: string | null }) => {
    if (members.some((m) => m.user_id === profile.id)) return;
    const { data, error } = await supabase.from("page_members")
      .insert({ page_id: page.id, user_id: profile.id, role: addRole })
      .select("*, profiles(username, avatar_url)").single();
    if (!error && data) { setMembers((p) => [...p, data as Member]); setSearchQuery(""); setSearchResults([]); }
  };

  const removeMember = async (memberId: string) => {
    await supabase.from("page_members").delete().eq("id", memberId);
    setMembers((p) => p.filter((m) => m.id !== memberId));
  };

  const changeRole = async (memberId: string, role: "viewer" | "editor" | "admin") => {
    await supabase.from("page_members").update({ role }).eq("id", memberId);
    setMembers((p) => p.map((m) => m.id === memberId ? { ...m, role } : m));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800 shrink-0">
          <h3 className="text-lg font-black text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <Settings size={18} /> Page Settings
          </h3>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100 dark:border-gray-800 shrink-0">
          {(["general", "members"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`flex-1 py-3 text-sm font-bold capitalize transition-colors ${tab === t ? "text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400" : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"}`}
            >{t === "members" ? "Members & Privileges" : "General"}</button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {tab === "general" ? (
            <div className="space-y-4">
              {/* Icon */}
              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Icon</label>
                <div className="flex flex-wrap gap-1.5">
                  {PAGE_ICONS.map((ic) => (
                    <button key={ic} onClick={() => setForm((p) => ({ ...p, icon: ic }))}
                      className={`text-xl p-2 rounded-xl transition-all ${form.icon === ic ? "bg-blue-100 dark:bg-blue-900/30 ring-2 ring-blue-500" : "hover:bg-gray-100 dark:hover:bg-gray-800"}`}>
                      {ic}
                    </button>
                  ))}
                </div>
              </div>
              {/* Title */}
              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5">Title</label>
                <input value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                  className="w-full bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-gray-900 dark:text-gray-100" />
              </div>
              {/* Description */}
              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5">Description</label>
                <input value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                  className="w-full bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-gray-900 dark:text-gray-100" />
              </div>
              {/* Visibility */}
              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5">Visibility</label>
                <div className="space-y-2">
                  {[
                    { value: "public" as const, icon: Globe, label: "Public", desc: "Anyone can view and post" },
                    { value: "members" as const, icon: Users, label: "Members only", desc: "Only invited members" },
                    { value: "private" as const, icon: Lock, label: "Private", desc: "Only you" },
                  ].map(({ value, icon: Icon, label, desc }) => (
                    <button key={value} type="button" onClick={() => setForm((p) => ({ ...p, visibility: value }))}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${form.visibility === value ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20" : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"}`}>
                      <Icon size={16} className={form.visibility === value ? "text-blue-600 dark:text-blue-400" : "text-gray-400"} />
                      <div className="flex-1">
                        <p className={`text-sm font-bold ${form.visibility === value ? "text-blue-700 dark:text-blue-300" : "text-gray-700 dark:text-gray-300"}`}>{label}</p>
                        <p className="text-xs text-gray-500">{desc}</p>
                      </div>
                      {form.visibility === value && <Check size={14} className="text-blue-600 dark:text-blue-400" />}
                    </button>
                  ))}
                </div>
                
              </div>
              {/* Danger zone */}
              <div className="pt-4 border-t border-gray-100 dark:border-gray-800">
                <button onClick={onDelete}
                  className="w-full flex items-center justify-center gap-2 py-2.5 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 font-bold rounded-xl hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors text-sm">
                  <Trash2 size={15} /> Delete Page
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              {/* Add member */}
              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Add Member</label>
                <div className="flex gap-2 mb-2">
                  <div className="flex-1 relative">
                    <input value={searchQuery}
                      onChange={(e) => { setSearchQuery(e.target.value); searchUsers(e.target.value); }}
                      placeholder="Search by username…"
                      className="w-full bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-gray-900 dark:text-gray-100" />
                    {isSearching && <Loader2 size={14} className="absolute right-3 top-3 animate-spin text-gray-400" />}
                  </div>
                  <select value={addRole} onChange={(e) => setAddRole(e.target.value as typeof addRole)}
                    className="bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl px-3 py-2.5 text-sm outline-none text-gray-700 dark:text-gray-300">
                    {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                  </select>
                </div>
                {searchResults.length > 0 && (
                  <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                    {searchResults.map((u) => (
                      <button key={u.id} onClick={() => addMember(u)}
                        className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors text-left border-b border-gray-100 dark:border-gray-800 last:border-0">
                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center text-white text-xs font-black shrink-0">
                          {avatar(u.username)}
                        </div>
                        <span className="text-sm font-bold text-gray-800 dark:text-gray-200">{u.username}</span>
                        <UserPlus size={14} className="text-blue-500 ml-auto" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {/* Members list */}
              <div>
                <p className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                  Current Members <span className="text-gray-400 font-normal">({members.length})</span>
                </p>
                {members.length === 0 ? (
                  <p className="text-sm text-gray-400 italic">No members added yet.</p>
                ) : (
                  <div className="space-y-2">
                    {members.map((m) => (
                      <div key={m.id} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-700">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center text-white text-xs font-black shrink-0 overflow-hidden">
                          {m.profiles?.avatar_url ? <Image src={m.profiles.avatar_url} alt="" width={32} height={32} unoptimized className="w-full h-full object-cover" /> : avatar(m.profiles?.username ?? "?")}
                        </div>
                        <span className="text-sm font-bold text-gray-800 dark:text-gray-200 flex-1">{m.profiles?.username ?? "Unknown"}</span>
                        <select value={m.role} onChange={(e) => changeRole(m.id, e.target.value as typeof m.role)}
                          className="text-xs bg-transparent border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1 text-gray-600 dark:text-gray-400 outline-none cursor-pointer">
                          {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                        </select>
                        <button onClick={() => removeMember(m.id)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {tab === "general" && (
          <div className="flex gap-3 px-6 pb-6 pt-4 border-t border-gray-100 dark:border-gray-800 shrink-0">
            <button onClick={onClose} className="flex-1 py-2.5 font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors text-sm">Cancel</button>
            <button onClick={save} disabled={isSaving || !form.title.trim()}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold rounded-xl transition-all text-sm shadow-lg shadow-blue-500/20">
              {isSaving ? <><Loader2 size={15} className="animate-spin" /> Saving…</> : <><Check size={15} /> Save Changes</>}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function PagesHub() {
  const router = useRouter();

  const [userId, setUserId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [pages, setPages] = useState<PageItem[]>([]);
  const [selected, setSelected] = useState<PageItem | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [isLoadingPages, setIsLoadingPages] = useState(true);
  const [isLoadingMsgs, setIsLoadingMsgs] = useState(false);
  const [isSending, setIsSending] = useState(false);

  // Input
  const [text, setText] = useState("");
  const [showEmoji, setShowEmoji] = useState(false);
  const [showCode, setShowCode] = useState(false);
  const [codeForm, setCodeForm] = useState({ language: "javascript", content: "" });
  const [showCodePreview, setShowCodePreview] = useState(false);

  // UI
  const [showSidebar, setShowSidebar] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [createForm, setCreateForm] = useState({ title: "", description: "", icon: "📄", visibility: "public" });
  const [isCreating, setIsCreating] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const imgInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Auth ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) return;
      setUserId(session.user.id);
      // Mark as admin if the user's email matches the site owner or has an admin profile role
      supabase.from("profiles").select("role").eq("id", session.user.id).maybeSingle()
        .then(({ data }) => { if (data?.role === "admin") setIsAdmin(true); });
    });
  }, []);

  // ── Load pages ────────────────────────────────────────────────────────────
  const loadPages = useCallback(async () => {
    setIsLoadingPages(true);
    const { data } = await supabase.from("pages").select("*").order("created_at", { ascending: false });
    if (data) setPages(data as PageItem[]);
    setIsLoadingPages(false);
  }, []);

  useEffect(() => { (async () => { await loadPages(); })(); }, [loadPages]);

  // ── Real-time: pages ──────────────────────────────────────────────────────
  useEffect(() => {
    const ch = supabase.channel("hub-pages")
      .on("postgres_changes", { event: "*", schema: "public", table: "pages" }, () => loadPages())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [loadPages]);

  // ── Load messages ─────────────────────────────────────────────────────────
  const loadMessages = useCallback(async (pageId: string) => {
    setIsLoadingMsgs(true);
    const { data } = await supabase.from("page_messages")
      .select("*, profiles(username, avatar_url)")
      .eq("page_id", pageId)
      .order("created_at", { ascending: true })
      .limit(200);
    if (data) setMessages(data as Msg[]);
    setIsLoadingMsgs(false);
  }, []);

  useEffect(() => {
    (async () => {
      if (selected) await loadMessages(selected.id);
      else setMessages([]);
    })();
  }, [selected, loadMessages]);

  // ── Auto scroll ───────────────────────────────────────────────────────────
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  // ── Real-time: messages ───────────────────────────────────────────────────
  useEffect(() => {
    if (!selected) return;
    const ch = supabase.channel(`msgs:${selected.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "page_messages", filter: `page_id=eq.${selected.id}` },
        async (payload) => {
          const { data: prof } = await supabase.from("profiles").select("username, avatar_url").eq("id", payload.new.user_id).single();
          setMessages((prev) => [...prev, { ...payload.new, profiles: prof } as Msg]);
        }
      )
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "page_messages", filter: `page_id=eq.${selected.id}` },
        (payload) => setMessages((prev) => prev.filter((m) => m.id !== payload.old.id))
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [selected]);

  // ── Send helpers ──────────────────────────────────────────────────────────
  const sendMsg = async (type: string, content: string, metadata: Record<string, string | number> = {}) => {
    if (!userId || !selected) return;
    setIsSending(true);
    await supabase.from("page_messages").insert({ page_id: selected.id, user_id: userId, content, type, metadata });
    setIsSending(false);
  };

  const handleSendText = async () => {
    if (!text.trim()) return;
    const t = text; setText("");
    if (textareaRef.current) { textareaRef.current.style.height = "auto"; }
    await sendMsg("text", t);
  };

  const handleSendCode = async () => {
    if (!codeForm.content.trim()) return;
    await sendMsg("code", codeForm.content, { language: codeForm.language });
    setCodeForm({ language: "javascript", content: "" });
    setShowCode(false); setShowCodePreview(false);
  };

  const handleUpload = async (file: File, type: "image" | "file") => {
    if (!userId || !selected) return;
    if (file.size > 10 * 1024 * 1024) { alert("Max file size is 10MB."); return; }
    const ext = file.name.split(".").pop();
    const path = `${selected.id}/${userId}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("page-files").upload(path, file, { upsert: false });
    if (error) { alert("Upload failed — ensure the 'page-files' bucket exists in Supabase Storage."); return; }
    const { data: { publicUrl } } = supabase.storage.from("page-files").getPublicUrl(path);
    await sendMsg(type, publicUrl, { url: publicUrl, filename: file.name, filesize: file.size });
  };

  const deleteMsg = async (id: string) => {
    await supabase.from("page_messages").delete().eq("id", id);
  };

  // ── Create page ───────────────────────────────────────────────────────────
  const createPage = async () => {
    if (!createForm.title.trim() || !userId) return;
    setIsCreating(true);
    const { data: newPage, error } = await supabase.from("pages").insert({
      title: createForm.title, description: createForm.description,
      icon: createForm.icon, created_by: userId, visibility: createForm.visibility,
    }).select().single();
    if (!error && newPage) {
      await supabase.from("page_members").insert({
        page_id: newPage.id,
        user_id: userId,
        role: "admin",
      });
      setCreateForm({ title: "", description: "", icon: "📄", visibility: "public" });
      setShowCreate(false);
      // Optimistically add to list and select it; real-time will deduplicate
      setPages((prev) => [newPage as PageItem, ...prev]);
      setSelected(newPage as PageItem);
    } else if (error) {
      alert("Failed to create page: " + error.message);
    }
    setIsCreating(false);
  };

  // ── Delete page ───────────────────────────────────────────────────────────
  const deletePage = async (page: PageItem) => {
    if (!window.confirm(`Delete "${page.title}"? All messages will be lost.`)) return;
    setPages((prev) => prev.filter((p) => p.id !== page.id));
    if (selected?.id === page.id) setSelected(null);
    await supabase.from("pages").delete().eq("id", page.id);
  };

  // ── Update page ───────────────────────────────────────────────────────────
  const updatePage = async (updates: Partial<PageItem>) => {
    if (!selected) return;
    await supabase.from("pages").update(updates).eq("id", selected.id);
    setSelected((prev) => prev ? { ...prev, ...updates } : null);
    setPages((prev) => prev.map((p) => p.id === selected.id ? { ...p, ...updates } : p));
    setShowSettings(false);
  };

  // ── Textarea auto-resize ──────────────────────────────────────────────────
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    const el = e.target;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 120) + "px";
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendText(); }
  };

  const canManage = selected && (userId === selected.created_by || isAdmin);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="h-screen flex flex-col bg-white dark:bg-black overflow-hidden text-gray-900 dark:text-gray-100">

      {/* ── Top Nav ─────────────────────────────────────────────────────────── */}
      <nav className="shrink-0 h-14 border-b border-gray-200 dark:border-gray-800 bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl z-40 flex items-center gap-3 px-4">
        <button onClick={() => setShowSidebar(!showSidebar)} className="lg:hidden p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
          <Menu size={18} />
        </button>
        <button onClick={() => router.push("/LearnPage")} className="flex items-center gap-1.5 text-sm font-bold text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors shrink-0">
          <ArrowLeft size={15} /> Learn
        </button>
        <div className="w-px h-4 bg-gray-200 dark:bg-gray-700 shrink-0" />
        {selected ? (
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span className="text-lg">{selected.icon}</span>
            <span className="font-bold truncate">{selected.title}</span>
            {selected.visibility === "private" && <Lock size={12} className="text-gray-400 shrink-0" />}
            {selected.visibility === "members" && <Users size={12} className="text-gray-400 shrink-0" />}
          </div>
        ) : (
          <span className="text-sm font-bold text-gray-400 flex-1">Pages</span>
        )}
        {canManage && (
          <button onClick={() => setShowSettings(true)} className="p-2 text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors shrink-0">
            <Settings size={16} />
          </button>
        )}
      </nav>

      <div className="flex flex-1 overflow-hidden">

        {/* ── Sidebar ─────────────────────────────────────────────────────── */}
        {showSidebar && <div className="fixed inset-0 z-30 bg-black/50 lg:hidden" onClick={() => setShowSidebar(false)} />}
        <aside className={`fixed inset-y-0 left-0 z-40 w-64 flex flex-col bg-gray-50 dark:bg-gray-950 border-r border-gray-200 dark:border-gray-800 transition-transform duration-300 pt-14 lg:static lg:translate-x-0 lg:pt-0 ${showSidebar ? "translate-x-0" : "-translate-x-full"}`}>
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-800 shrink-0">
            <span className="text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
              <Hash size={11} /> Pages
            </span>
            {userId && (
              <button onClick={() => setShowCreate(true)} className="flex items-center gap-1 text-xs font-bold text-blue-600 dark:text-blue-400 hover:text-blue-500 transition-colors">
                <Plus size={13} /> New
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto py-2 px-2">
            {isLoadingPages ? (
              <div className="flex justify-center py-10"><Loader2 size={20} className="animate-spin text-gray-400" /></div>
            ) : pages.length === 0 ? (
              <div className="text-center py-10 px-3">
                <BookOpen size={22} className="text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                <p className="text-xs text-gray-400 mb-3">No pages yet</p>
                {userId && <button onClick={() => setShowCreate(true)} className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline">Create the first page</button>}
              </div>
            ) : pages.map((page) => {
              const active = selected?.id === page.id;
              return (
                <div key={page.id} onClick={() => { setSelected(page); setShowSidebar(false); }}
                  className={`group flex items-center gap-2.5 px-3 py-2.5 rounded-xl cursor-pointer transition-all mb-0.5 ${active ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20" : "text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100"}`}>
                  <span className="text-base shrink-0">{page.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold truncate">{page.title}</p>
                  </div>
                  {page.visibility !== "public" && (
                    <Lock size={11} className={active ? "text-blue-200 shrink-0" : "text-gray-400 shrink-0"} />
                  )}
                  {(userId === page.created_by || isAdmin) && (
                    <button onClick={(e) => { e.stopPropagation(); deletePage(page); }}
                      className={`opacity-0 group-hover:opacity-100 p-1 rounded-md transition-all shrink-0 ${active ? "hover:bg-blue-500 text-blue-200 hover:text-white" : "hover:bg-red-100 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-500"}`}>
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </aside>

        {/* ── Main ────────────────────────────────────────────────────────── */}
        <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {!selected ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
              <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center mb-5 shadow-2xl shadow-blue-500/30">
                <Hash size={36} className="text-white" />
              </div>
              <h2 className="text-2xl font-black mb-2">Pages Hub</h2>
              <p className="text-gray-500 dark:text-gray-400 text-sm mb-6 max-w-xs">Pick a page from the sidebar to view its content and start posting.</p>
              {userId ? (
                <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-blue-500/20">
                  <Plus size={16} /> Create First Page
                </button>
              ) : (
                <button onClick={() => router.push("/auth")} className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-blue-500/20">
                  Login to Get Started
                </button>
              )}
            </div>
          ) : (
            <>
              {/* Messages feed */}
              <div className="flex-1 overflow-y-auto">
                {isLoadingMsgs ? (
                  <div className="flex items-center justify-center h-full">
                    <Loader2 size={24} className="animate-spin text-blue-500" />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center p-8">
                    <span className="text-6xl mb-4">{selected.icon}</span>
                    <h3 className="text-xl font-black mb-2">{selected.title}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs">{selected.description || "No messages yet. Be the first to post!"}</p>
                  </div>
                ) : (
                  <div className="py-4">
                    {messages.map((msg, idx) => {
                      const prev = messages[idx - 1];
                      const grouped = !!(prev && prev.user_id === msg.user_id &&
                        new Date(msg.created_at).getTime() - new Date(prev.created_at).getTime() < 300000);
                      return <MessageBubble key={msg.id} msg={msg} userId={userId} isAdmin={isAdmin} onDelete={deleteMsg} grouped={grouped} />;
                    })}
                    <div ref={bottomRef} />
                  </div>
                )}
              </div>

              {/* Input area */}
              {userId ? (
                <div className="shrink-0 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-black">
                  {/* Emoji panel */}
                  {showEmoji && (
                    <div className="border-b border-gray-100 dark:border-gray-800 p-3 bg-gray-50 dark:bg-gray-900/50">
                      <div className="flex flex-wrap gap-1">
                        {EMOJIS.map((e) => (
                          <button key={e} onClick={() => { setText((p) => p + e); setShowEmoji(false); textareaRef.current?.focus(); }}
                            className="text-xl p-1.5 rounded-lg hover:bg-white dark:hover:bg-gray-800 hover:scale-125 transition-all">
                            {e}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex items-end gap-2 p-3">
                    {/* Tool buttons */}
                    <div className="flex items-center shrink-0 pb-0.5">
                      <button onClick={() => setShowEmoji(!showEmoji)} title="Emoji"
                        className={`p-2 rounded-lg transition-colors ${showEmoji ? "bg-yellow-100 dark:bg-yellow-900/20 text-yellow-600" : "text-gray-400 hover:text-yellow-600 hover:bg-yellow-50 dark:hover:bg-yellow-900/20"}`}>
                        <Smile size={18} />
                      </button>
                      <button onClick={() => { setShowCode(true); setShowEmoji(false); }} title="Code snippet"
                        className="p-2 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors">
                        <Code2 size={18} />
                      </button>
                      <button onClick={() => imgInputRef.current?.click()} title="Send image"
                        className="p-2 rounded-lg text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors">
                        <ImageIcon size={18} />
                      </button>
                      <button onClick={() => fileInputRef.current?.click()} title="Attach file"
                        className="p-2 rounded-lg text-gray-400 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors">
                        <Paperclip size={18} />
                      </button>
                    </div>

                    {/* Text input */}
                    <textarea ref={textareaRef} value={text} onChange={handleTextChange} onKeyDown={handleKeyDown}
                      rows={1}
                      placeholder={`Message ${selected.title}… (Enter to send, Shift+Enter for newline)`}
                      className="flex-1 resize-none rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 px-4 py-2.5 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all leading-relaxed"
                      style={{ maxHeight: "120px" }} />

                    <button onClick={handleSendText} disabled={!text.trim() || isSending}
                      className="p-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl transition-all shrink-0 active:scale-95 shadow-lg shadow-blue-500/20">
                      {isSending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                    </button>
                  </div>

                  <input ref={imgInputRef} type="file" accept="image/*" className="hidden"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f, "image"); e.target.value = ""; }} />
                  <input ref={fileInputRef} type="file" className="hidden"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f, "file"); e.target.value = ""; }} />
                </div>
              ) : (
                <div className="shrink-0 border-t border-gray-200 dark:border-gray-800 p-4 text-center">
                  <button onClick={() => router.push("/auth")} className="text-sm font-bold text-blue-600 dark:text-blue-400 hover:underline">
                    Login to post messages
                  </button>
                </div>
              )}
            </>
          )}
        </main>
      </div>

      {/* ── Create Page Modal ────────────────────────────────────────────────── */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowCreate(false)} />
          <div className="relative w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 p-6 animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-xl font-black text-gray-900 dark:text-gray-100">Create Page</h3>
              <button onClick={() => setShowCreate(false)} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"><X size={18} /></button>
            </div>
            <div className="space-y-4">
              {/* Icon */}
              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Icon</label>
                <div className="flex flex-wrap gap-1.5">
                  {PAGE_ICONS.map((ic) => (
                    <button key={ic} onClick={() => setCreateForm((p) => ({ ...p, icon: ic }))}
                      className={`text-xl p-2 rounded-xl transition-all ${createForm.icon === ic ? "bg-blue-100 dark:bg-blue-900/30 ring-2 ring-blue-500" : "hover:bg-gray-100 dark:hover:bg-gray-800"}`}>
                      {ic}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5">Title *</label>
                <input value={createForm.title} onChange={(e) => setCreateForm((p) => ({ ...p, title: e.target.value }))}
                  placeholder="e.g. JavaScript Resources"
                  className="w-full bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-gray-900 dark:text-gray-100" />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5">Description</label>
                <input value={createForm.description} onChange={(e) => setCreateForm((p) => ({ ...p, description: e.target.value }))}
                  placeholder="What is this page about?"
                  className="w-full bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-gray-900 dark:text-gray-100" />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5">Visibility</label>
                <div className="space-y-2">
                  {[
                    { value: "public", icon: Globe, label: "Public", desc: "Anyone can view and post" },
                    { value: "members", icon: Users, label: "Members only", desc: "Only invited members" },
                    { value: "private", icon: Lock, label: "Private", desc: "Only you" },
                  ].map(({ value, icon: Icon, label, desc }) => (
                    <button key={value} type="button" onClick={() => setCreateForm((p) => ({ ...p, visibility: value }))}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${createForm.visibility === value ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20" : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"}`}>
                      <Icon size={16} className={createForm.visibility === value ? "text-blue-600 dark:text-blue-400" : "text-gray-400"} />
                      <div className="flex-1">
                        <p className={`text-sm font-bold ${createForm.visibility === value ? "text-blue-700 dark:text-blue-300" : "text-gray-700 dark:text-gray-300"}`}>{label}</p>
                        <p className="text-xs text-gray-500">{desc}</p>
                      </div>
                      {createForm.visibility === value && <Check size={14} className="text-blue-600 dark:text-blue-400 shrink-0" />}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowCreate(false)} className="flex-1 py-2.5 font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors text-sm">Cancel</button>
              <button onClick={createPage} disabled={isCreating || !createForm.title.trim()}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold rounded-xl transition-all text-sm shadow-lg shadow-blue-500/20">
                {isCreating ? <><Loader2 size={15} className="animate-spin" /> Creating…</> : <><Plus size={15} /> Create Page</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Code Snippet Modal ───────────────────────────────────────────────── */}
      {showCode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowCode(false)} />
          <div className="relative w-full max-w-2xl bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 p-6 animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between mb-4 shrink-0">
              <h3 className="text-xl font-black text-gray-900 dark:text-gray-100 flex items-center gap-2"><Code2 size={20} /> Code Snippet</h3>
              <button onClick={() => setShowCode(false)} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"><X size={18} /></button>
            </div>
            <div className="flex items-center gap-3 mb-3 shrink-0">
              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">Language</label>
                <select value={codeForm.language} onChange={(e) => setCodeForm((p) => ({ ...p, language: e.target.value }))}
                  className="bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 text-gray-900 dark:text-gray-100">
                  {CODE_LANGS.map((l) => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
              <button onClick={() => setShowCodePreview(!showCodePreview)}
                className={`flex items-center gap-1.5 mt-5 px-3 py-2 text-xs font-bold rounded-xl border transition-colors ${showCodePreview ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600 border-blue-200 dark:border-blue-800/50" : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700"}`}>
                {showCodePreview ? <><EyeOff size={13} /> Edit</> : <><Eye size={13} /> Preview</>}
              </button>
            </div>
            <div className="flex-1 overflow-hidden min-h-0">
              {showCodePreview ? (
                <CodeBlock content={codeForm.content || "// Your code will appear here"} language={codeForm.language} />
              ) : (
                <textarea value={codeForm.content} onChange={(e) => setCodeForm((p) => ({ ...p, content: e.target.value }))}
                  rows={12}
                  placeholder={`Write your ${codeForm.language} code here…`}
                  className="w-full h-full bg-gray-900 text-gray-100 font-mono text-sm border border-gray-700 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 resize-none" />
              )}
            </div>
            <div className="flex gap-3 mt-4 shrink-0">
              <button onClick={() => setShowCode(false)} className="flex-1 py-2.5 font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors text-sm">Cancel</button>
              <button onClick={handleSendCode} disabled={!codeForm.content.trim() || isSending}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold rounded-xl transition-all text-sm shadow-lg shadow-blue-500/20">
                <Send size={15} /> Send Snippet
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Page Settings Modal ──────────────────────────────────────────────── */}
      {showSettings && selected && (
        <PageSettingsModal
          page={selected} userId={userId} isAdmin={isAdmin}
          onClose={() => setShowSettings(false)}
          onUpdate={updatePage}
          onDelete={() => { deletePage(selected); setShowSettings(false); }}
        />
      )}
    </div>
  );
}
