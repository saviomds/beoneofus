"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "../../supabaseClient";
import ReactMarkdown from "react-markdown";
import {
  PenLine, Eye, Trash2, Plus, Save, Send, X, Tag, Image as ImageIcon,
  Loader2, CheckCircle2, AlertTriangle, MessageSquare, Heart, FileText,
  Globe, Lock, Clock, ChevronRight, RefreshCw, BookOpen, ArrowLeft,
  TrendingUp, Hash,
} from "lucide-react";

function slugify(t) {
  return t.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 80);
}
function timeAgo(ts) {
  const s = Math.floor((Date.now() - new Date(ts)) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

const TAG_COLORS = [
  "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800/40",
  "bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400 border-violet-200 dark:border-violet-800/40",
  "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/40",
  "bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800/40",
  "bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-800/40",
];
function tagColor(tag) { let h = 0; for (const c of tag) h = (h * 31 + c.charCodeAt(0)) & 0xff; return TAG_COLORS[h % TAG_COLORS.length]; }

/* ─── Initial editor state ────────────────────────── */
const BLANK = { id: null, title: "", slug: "", excerpt: "", content: "", cover_url: "", tags: [], published: false };

export default function BlogContent() {
  const [profile, setProfile] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [view, setView] = useState("list"); // "list" | "editor" | "preview"
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [toast, setToast] = useState(null); // { type, msg }
  const [form, setForm] = useState(BLANK);
  const [tagInput, setTagInput] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [stats, setStats] = useState({ total: 0, published: 0, totalViews: 0, totalLikes: 0 });
  const channelRef = useRef(null);

  const showToast = (type, msg) => { setToast({ type, msg }); setTimeout(() => setToast(null), 3500); };

  /* auth + profile */
  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setLoading(false); return; }
      const { data: p } = await supabase.from("profiles").select("id, username, avatar_url, is_admin, role").eq("id", session.user.id).single();
      setProfile(p);
      if (p?.is_admin || p?.role === "founder") setIsAdmin(true);
      setLoading(false);
    };
    load();
  }, []);

  const fetchPosts = useCallback(async () => {
    const { data } = await supabase
      .from("blog_posts")
      .select(`id, title, slug, excerpt, cover_url, tags, published, views, created_at, updated_at, blog_likes(count), blog_comments(count)`)
      .order("created_at", { ascending: false });
    if (data) {
      setPosts(data);
      setStats({
        total: data.length,
        published: data.filter((p) => p.published).length,
        totalViews: data.reduce((a, p) => a + (p.views || 0), 0),
        totalLikes: data.reduce((a, p) => a + (p.blog_likes?.[0]?.count || 0), 0),
      });
    }
  }, []);

  useEffect(() => {
    if (!isAdmin) return;
    fetchPosts();
    const name = `blog-admin-${Date.now()}`;
    channelRef.current = supabase
      .channel(name)
      .on("postgres_changes", { event: "*", schema: "public", table: "blog_posts" }, fetchPosts)
      .subscribe();
    return () => { if (channelRef.current) supabase.removeChannel(channelRef.current); };
  }, [isAdmin, fetchPosts]);

  /* slug auto-gen */
  const handleTitleChange = (val) => {
    setForm((f) => ({ ...f, title: val, slug: f.id ? f.slug : slugify(val) }));
  };

  const handleAddTag = (e) => {
    if ((e.key === "Enter" || e.key === ",") && tagInput.trim()) {
      e.preventDefault();
      const t = tagInput.trim().toLowerCase().replace(/\s+/g, "-");
      if (!form.tags.includes(t) && form.tags.length < 6) {
        setForm((f) => ({ ...f, tags: [...f.tags, t] }));
      }
      setTagInput("");
    }
  };

  const handleSave = async (publish = false) => {
    if (!form.title.trim() || !form.content.trim()) { showToast("error", "Title and content are required."); return; }
    if (publish) setPublishing(true); else setSaving(true);

    const payload = {
      title: form.title.trim(),
      slug: form.slug || slugify(form.title),
      excerpt: form.excerpt.trim() || null,
      content: form.content,
      cover_url: form.cover_url.trim() || null,
      tags: form.tags,
      published: publish ? true : form.published,
      author_id: profile.id,
      updated_at: new Date().toISOString(),
    };

    let error;
    if (form.id) {
      ({ error } = await supabase.from("blog_posts").update(payload).eq("id", form.id));
    } else {
      const { data, error: e } = await supabase.from("blog_posts").insert(payload).select("id").single();
      error = e;
      if (data) setForm((f) => ({ ...f, id: data.id }));
    }

    if (publish) setPublishing(false); else setSaving(false);
    if (error) { showToast("error", error.message); }
    else { showToast("success", publish ? "Published!" : "Saved as draft"); fetchPosts(); if (publish) setView("list"); }
  };

  const handleEdit = (post) => {
    setForm({
      id: post.id,
      title: post.title,
      slug: post.slug,
      excerpt: post.excerpt || "",
      content: post.content || "",
      cover_url: post.cover_url || "",
      tags: post.tags || [],
      published: post.published,
    });
    setView("editor");
  };

  const handleNew = () => { setForm(BLANK); setTagInput(""); setView("editor"); };

  const handleDelete = async (id) => {
    await supabase.from("blog_posts").delete().eq("id", id);
    setDeleteConfirm(null);
    showToast("success", "Post deleted.");
    fetchPosts();
  };

  const togglePublish = async (post) => {
    await supabase.from("blog_posts").update({ published: !post.published, updated_at: new Date().toISOString() }).eq("id", post.id);
    showToast("success", post.published ? "Unpublished" : "Published!");
    fetchPosts();
  };

  /* ── Not admin ─── */
  if (!loading && !isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-20 text-center px-4">
        <div className="w-14 h-14 bg-red-50 dark:bg-red-900/20 rounded-2xl flex items-center justify-center mb-4">
          <Lock size={22} className="text-red-500" />
        </div>
        <h2 className="text-xl font-black text-gray-900 dark:text-white mb-2">Admin Access Only</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm">The blog editor is only available to admins and founders.</p>
        <a href="/blog" className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-500 transition-colors">
          <BookOpen size={15} /> Read the Blog
        </a>
      </div>
    );
  }

  if (loading) return <div className="flex items-center justify-center h-40"><Loader2 size={22} className="animate-spin text-gray-400" /></div>;

  return (
    <div className="relative h-full flex flex-col gap-0 overflow-hidden">
      {/* toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2.5 px-4 py-3 rounded-2xl shadow-2xl text-sm font-bold animate-in slide-in-from-top-3 duration-300 ${toast.type === "success" ? "bg-emerald-600 text-white" : "bg-red-600 text-white"}`}>
          {toast.type === "success" ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
          {toast.msg}
        </div>
      )}

      {/* delete confirm */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#0f1723] border border-gray-200 dark:border-white/10 rounded-3xl shadow-2xl p-6 max-w-sm w-full">
            <div className="w-12 h-12 bg-red-50 dark:bg-red-900/20 rounded-2xl flex items-center justify-center mb-4">
              <Trash2 size={20} className="text-red-500" />
            </div>
            <h3 className="font-black text-gray-900 dark:text-white text-lg mb-2">Delete post?</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">This will permanently delete the post and all its comments and likes.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm(null)} className="flex-1 py-2.5 bg-gray-100 dark:bg-white/5 text-gray-700 dark:text-gray-300 rounded-xl font-bold text-sm hover:bg-gray-200 dark:hover:bg-white/10 transition-colors">Cancel</button>
              <button onClick={() => handleDelete(deleteConfirm)} className="flex-1 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-xl font-bold text-sm transition-colors">Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* header */}
      <div className="flex items-center justify-between gap-3 pb-5 border-b border-gray-200 dark:border-white/5 shrink-0">
        <div className="flex items-center gap-3">
          {view !== "list" && (
            <button onClick={() => setView("list")} className="p-2 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/5 rounded-xl transition-all">
              <ArrowLeft size={18} />
            </button>
          )}
          <div>
            <h1 className="text-xl font-black text-gray-900 dark:text-white">
              {view === "list" ? "Blog Manager" : view === "preview" ? "Preview" : form.id ? "Edit Post" : "New Post"}
            </h1>
            {view === "list" && <p className="text-xs text-gray-500 dark:text-gray-400">{stats.published} published · {stats.total} total · {stats.totalViews} views</p>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {view === "list" && (
            <>
              <a href="/blog" target="_blank" className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 rounded-xl transition-all">
                <Globe size={13} /> Public Blog
              </a>
              <button onClick={handleNew} className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-bold transition-all shadow shadow-blue-500/20">
                <Plus size={15} /> New Post
              </button>
            </>
          )}
          {view === "editor" && (
            <>
              <button onClick={() => setView("preview")} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 rounded-xl transition-all">
                <Eye size={13} /> Preview
              </button>
              <button onClick={() => handleSave(false)} disabled={saving || publishing} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 rounded-xl transition-all disabled:opacity-60">
                {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />} Save draft
              </button>
              <button onClick={() => handleSave(true)} disabled={saving || publishing} className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-bold transition-all shadow shadow-blue-500/20 disabled:opacity-60">
                {publishing ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                {form.published ? "Update" : "Publish"}
              </button>
            </>
          )}
          {view === "preview" && (
            <button onClick={() => setView("editor")} className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-bold transition-all">
              <PenLine size={14} /> Back to Editor
            </button>
          )}
        </div>
      </div>

      {/* body */}
      <div className="flex-1 overflow-y-auto custom-scrollbar pt-5">

        {/* ── LIST ── */}
        {view === "list" && (
          <div className="space-y-3">
            {/* Stats row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
              {[
                { label: "Total Posts", val: stats.total, icon: <FileText size={16} />, color: "text-blue-600" },
                { label: "Published", val: stats.published, icon: <Globe size={16} />, color: "text-emerald-600" },
                { label: "Total Views", val: stats.totalViews, icon: <Eye size={16} />, color: "text-violet-600" },
                { label: "Total Likes", val: stats.totalLikes, icon: <Heart size={16} />, color: "text-rose-500" },
              ].map((s) => (
                <div key={s.label} className="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/5 rounded-2xl p-4">
                  <div className={`${s.color} mb-1`}>{s.icon}</div>
                  <p className="text-xl font-black text-gray-900 dark:text-white">{s.val}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{s.label}</p>
                </div>
              ))}
            </div>

            {posts.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-14 h-14 bg-gray-100 dark:bg-white/5 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <PenLine size={20} className="text-gray-400" />
                </div>
                <h3 className="font-black text-gray-900 dark:text-white mb-1">No posts yet</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">Start writing your first blog post.</p>
                <button onClick={handleNew} className="px-5 py-2.5 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-500 transition-colors">
                  Write first post
                </button>
              </div>
            ) : (
              posts.map((p) => (
                <div key={p.id} className="group flex items-start gap-4 bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/5 rounded-2xl p-4 hover:border-gray-300 dark:hover:border-white/10 transition-all">
                  {p.cover_url && (
                    <div className="relative w-16 h-16 rounded-xl overflow-hidden shrink-0 hidden sm:block">
                      <img src={p.cover_url} alt={p.title} className="w-full h-full object-cover" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3 mb-1">
                      <h3 className="font-black text-gray-900 dark:text-white text-sm truncate">{p.title}</h3>
                      <span className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-black uppercase border ${p.published ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/40" : "bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-white/10"}`}>
                        {p.published ? "Live" : "Draft"}
                      </span>
                    </div>
                    {p.excerpt && <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1 mb-2">{p.excerpt}</p>}
                    <div className="flex items-center gap-3 text-xs text-gray-400 dark:text-gray-500 flex-wrap">
                      <span className="flex items-center gap-1"><Clock size={10} />{timeAgo(p.created_at)}</span>
                      <span className="flex items-center gap-1"><Eye size={10} />{p.views || 0}</span>
                      <span className="flex items-center gap-1"><Heart size={10} />{p.blog_likes?.[0]?.count || 0}</span>
                      <span className="flex items-center gap-1"><MessageSquare size={10} />{p.blog_comments?.[0]?.count || 0}</span>
                      {(p.tags || []).slice(0, 2).map((t) => (
                        <span key={t} className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${tagColor(t)}`}>{t}</span>
                      ))}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => handleEdit(p)} className="p-1.5 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-all" title="Edit">
                        <PenLine size={14} />
                      </button>
                      <button onClick={() => togglePublish(p)} className="p-1.5 text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg transition-all" title={p.published ? "Unpublish" : "Publish"}>
                        {p.published ? <Lock size={14} /> : <Globe size={14} />}
                      </button>
                      {p.published && (
                        <a href={`/blog/${p.slug}`} target="_blank" className="p-1.5 text-gray-400 hover:text-violet-600 dark:hover:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/20 rounded-lg transition-all" title="View live">
                          <Eye size={14} />
                        </a>
                      )}
                      <button onClick={() => setDeleteConfirm(p.id)} className="p-1.5 text-gray-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all" title="Delete">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* ── EDITOR ── */}
        {view === "editor" && (
          <div className="space-y-5 pb-10">
            {/* title */}
            <div>
              <label className="text-xs font-black uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1.5 block">Title *</label>
              <input
                value={form.title}
                onChange={(e) => handleTitleChange(e.target.value)}
                placeholder="Post title…"
                className="w-full bg-transparent text-2xl font-black text-gray-900 dark:text-white placeholder-gray-300 dark:placeholder-gray-700 border-b border-gray-200 dark:border-white/10 pb-3 focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>

            {/* slug */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-black uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1.5 block flex items-center gap-1"><Hash size={11} /> Slug</label>
                <input
                  value={form.slug}
                  onChange={(e) => setForm((f) => ({ ...f, slug: slugify(e.target.value) }))}
                  placeholder="auto-generated"
                  className="w-full bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl px-3 py-2 text-sm font-mono text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
              </div>
              <div>
                <label className="text-xs font-black uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1.5 block flex items-center gap-1"><ImageIcon size={11} /> Cover Image URL</label>
                <input
                  value={form.cover_url}
                  onChange={(e) => setForm((f) => ({ ...f, cover_url: e.target.value }))}
                  placeholder="https://…"
                  className="w-full bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl px-3 py-2 text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
              </div>
            </div>

            {/* cover preview */}
            {form.cover_url && (
              <div className="relative h-40 rounded-2xl overflow-hidden border border-gray-200 dark:border-white/10">
                <img src={form.cover_url} alt="cover" className="w-full h-full object-cover" />
                <button onClick={() => setForm((f) => ({ ...f, cover_url: "" }))} className="absolute top-2 right-2 p-1.5 bg-black/50 hover:bg-black/70 text-white rounded-lg transition-all">
                  <X size={14} />
                </button>
              </div>
            )}

            {/* excerpt */}
            <div>
              <label className="text-xs font-black uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1.5 block">Excerpt <span className="text-gray-300 dark:text-gray-600 font-normal">(optional, shown in listing)</span></label>
              <textarea
                value={form.excerpt}
                onChange={(e) => setForm((f) => ({ ...f, excerpt: e.target.value }))}
                placeholder="A short summary of this post…"
                rows={2}
                className="w-full bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl px-3 py-2 text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-none"
              />
            </div>

            {/* tags */}
            <div>
              <label className="text-xs font-black uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1.5 block flex items-center gap-1"><Tag size={11} /> Tags <span className="text-gray-300 dark:text-gray-600 font-normal ml-1">press Enter to add</span></label>
              <div className="flex flex-wrap gap-2 p-3 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl min-h-[44px]">
                {form.tags.map((t) => (
                  <span key={t} className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border ${tagColor(t)}`}>
                    {t}
                    <button onClick={() => setForm((f) => ({ ...f, tags: f.tags.filter((x) => x !== t) }))} className="hover:opacity-70 transition-opacity">
                      <X size={10} />
                    </button>
                  </span>
                ))}
                {form.tags.length < 6 && (
                  <input
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={handleAddTag}
                    placeholder={form.tags.length === 0 ? "Add tags…" : ""}
                    className="flex-1 min-w-[100px] bg-transparent text-sm text-gray-700 dark:text-gray-300 placeholder-gray-400 focus:outline-none"
                  />
                )}
              </div>
            </div>

            {/* content */}
            <div>
              <label className="text-xs font-black uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1.5 block">Content * <span className="text-gray-300 dark:text-gray-600 font-normal">(Markdown supported)</span></label>
              <textarea
                value={form.content}
                onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
                placeholder={"# Your post title\n\nStart writing in **Markdown**...\n\n## Section heading\n\nParagraph text here.\n\n```js\nconsole.log('code blocks work too');\n```"}
                rows={20}
                className="w-full bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl px-4 py-3 text-sm font-mono text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-none leading-relaxed"
              />
              <p className="text-xs text-gray-400 dark:text-gray-600 mt-1">{form.content.length} chars · ~{Math.ceil(form.content.split(/\s+/).length / 200)} min read</p>
            </div>
          </div>
        )}

        {/* ── PREVIEW ── */}
        {view === "preview" && (
          <div className="pb-10">
            {form.cover_url && (
              <div className="relative h-56 sm:h-72 rounded-3xl overflow-hidden mb-8 border border-gray-200 dark:border-white/5">
                <img src={form.cover_url} alt="cover" className="w-full h-full object-cover" />
              </div>
            )}
            {(form.tags || []).length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {form.tags.map((t) => <span key={t} className={`px-3 py-1 rounded-full text-xs font-bold border ${tagColor(t)}`}>{t}</span>)}
              </div>
            )}
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-gray-900 dark:text-white mb-4 leading-tight">{form.title || "Untitled"}</h1>
            {form.excerpt && <p className="text-gray-500 dark:text-gray-400 text-base mb-8 leading-relaxed border-l-4 border-blue-500 pl-4">{form.excerpt}</p>}
            <div className="prose prose-gray dark:prose-invert max-w-none prose-headings:font-black prose-a:text-blue-600 dark:prose-a:text-blue-400 prose-code:bg-gray-100 dark:prose-code:bg-white/10 prose-code:rounded prose-code:px-1 prose-pre:bg-gray-900 dark:prose-pre:bg-black/50 prose-pre:rounded-2xl prose-img:rounded-2xl">
              <ReactMarkdown>{form.content || "*No content yet.*"}</ReactMarkdown>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
