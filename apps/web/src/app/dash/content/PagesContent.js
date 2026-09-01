"use client";
import Image from "next/image";
import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  Building2, Plus, X, Loader2, Globe, Send, ChevronLeft,
  Trash2, Pencil, BadgeCheck, Check, AlertTriangle,
  MapPin, Users, Briefcase, BookOpen, Rss, Search,
  ExternalLink, Heart, Terminal, Share2, Link2,
  AtSign, SortAsc, Sparkles, Calendar, ChevronDown,
} from "lucide-react";
import { supabase } from "../../supabaseClient";

const COVER_GRADIENTS = [
  "from-indigo-500 via-purple-600 to-pink-500",
  "from-blue-600 via-blue-500 to-cyan-400",
  "from-emerald-500 via-teal-500 to-cyan-500",
  "from-orange-500 via-red-500 to-pink-600",
  "from-violet-600 via-purple-600 to-indigo-600",
  "from-slate-700 via-slate-800 to-slate-900",
];
const COVER_LABELS = ["Cosmic","Ocean","Forest","Sunset","Violet","Dark"];
const INDUSTRIES = ["All","Technology","Finance","Healthcare","Education","Marketing","Design","Legal","Consulting","Other"];
const SIZES = ["1–10","11–50","51–200","201–500","500+"];
const COMPANY_TYPES = ["Startup","SME","Enterprise","Nonprofit","Government","Agency","Other"];
const SORT_OPTIONS = [{ id:"newest", label:"Newest" }, { id:"az", label:"A–Z" }, { id:"oldest", label:"Oldest" }];
const POST_LIMIT = 280;
const EMPTY_CD = { tagline:"", industry:"", size:"", website:"", location:"", founded:"", linkedin:"", twitter:"", type:"", coverIndex:0 };

const inputCls = "w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl py-2.5 px-3 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition placeholder-gray-400 dark:placeholder-gray-500";

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1.5">{label}</label>
      {children}
    </div>
  );
}

function isNewPage(createdAt) {
  return Date.now() - new Date(createdAt).getTime() < 14 * 24 * 60 * 60 * 1000;
}

function coverGrad(cd) {
  return COVER_GRADIENTS[cd?.coverIndex ?? 0] ?? COVER_GRADIENTS[0];
}

export default function PagesContent() {
  const [pages, setPages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState(null);

  const [activeIndustry, setActiveIndustry] = useState("All");
  const [searchQ, setSearchQ] = useState("");
  const [myPagesOnly, setMyPagesOnly] = useState(false);
  const [sortBy, setSortBy] = useState("newest");
  const [showSort, setShowSort] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPage, setEditingPage] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [needsSetup, setNeedsSetup] = useState(false);

  const [formTitle, setFormTitle] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formCD, setFormCD] = useState({ ...EMPTY_CD });
  const [formLogo, setFormLogo] = useState(null);
  const [formLogoPreview, setFormLogoPreview] = useState(null);
  const logoRef = useRef(null);

  const [activePage, setActivePage] = useState(null);
  const [activeTab, setActiveTab] = useState("about");

  const [pagePosts, setPagePosts] = useState([]);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [postInput, setPostInput] = useState("");
  const [editingPostId, setEditingPostId] = useState(null);
  const [editContent, setEditContent] = useState("");

  const [pageJobs, setPageJobs] = useState([]);
  const [loadingJobs, setLoadingJobs] = useState(false);

  const [following, setFollowing] = useState({});

  const [pageToDelete, setPageToDelete] = useState(null);
  const [postToDelete, setPostToDelete] = useState(null);

  const [toastMsg, setToastMsg] = useState("");
  const [toastType, setToastType] = useState("success");
  const showToast = (msg, type = "success") => {
    setToastMsg(msg); setToastType(type);
    setTimeout(() => setToastMsg(""), 3200);
  };

  useEffect(() => {
    const handler = (e) => {
      if (e.key === "Escape") {
        if (activePage) { setActivePage(null); setActiveTab("about"); }
        else if (isModalOpen) setIsModalOpen(false);
        else if (showSort) setShowSort(false);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [activePage, isModalOpen, showSort]);

  const fetchPages = useCallback(async () => {
    if (!supabase) return;
    setLoading(true);
    const { data, error } = await supabase.from("pages").select("*").order("created_at", { ascending: false });
    if (!error && data) setPages(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!supabase) return;
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) setCurrentUserId(session.user.id);
      await fetchPages();
    };
    init();
    const ch = supabase.channel("public-pages-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "pages" }, fetchPages)
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, [fetchPages]);

  useEffect(() => {
    if (!activePage || activeTab !== "updates" || !supabase) return;
    let cancelled = false;
    const run = async () => {
      setLoadingPosts(true);
      setPagePosts([]);
      const { data } = await supabase
        .from("page_posts")
        .select("*, profiles(username, avatar_url, is_verified)")
        .eq("page_id", activePage.id)
        .order("created_at", { ascending: false });
      if (!cancelled) {
        setPagePosts((data || []).filter((p, i, a) => a.findIndex(x => x.id === p.id) === i));
        setLoadingPosts(false);
      }
    };
    run();
    const ch = supabase.channel(`page-${activePage.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "page_posts", filter: `page_id=eq.${activePage.id}` }, async (payload) => {
        const { data } = await supabase.from("page_posts").select("*, profiles(username, avatar_url, is_verified)").eq("id", payload.new.id).single();
        if (data) setPagePosts(prev => prev.some(p => p.id === data.id) ? prev : [data, ...prev]);
      })
      .subscribe();
    return () => { cancelled = true; supabase.removeChannel(ch); };
  }, [activePage, activeTab]);

  useEffect(() => {
    if (!activePage || activeTab !== "jobs" || !supabase) return;
    let cancelled = false;
    const run = async () => {
      setLoadingJobs(true);
      const { data } = await supabase.from("jobs").select("*").ilike("company", activePage.title).order("created_at", { ascending: false }).limit(20);
      if (!cancelled) { setPageJobs(data || []); setLoadingJobs(false); }
    };
    run();
    return () => { cancelled = true; };
  }, [activePage, activeTab]);

  const filteredPages = useMemo(() => {
    let list = [...pages];
    if (myPagesOnly) list = list.filter(p => p.created_by === currentUserId);
    if (activeIndustry !== "All") list = list.filter(p => (p.company_data || {}).industry === activeIndustry);
    if (searchQ.trim()) {
      const q = searchQ.toLowerCase();
      list = list.filter(p => p.title.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q));
    }
    if (sortBy === "az") list.sort((a, b) => a.title.localeCompare(b.title));
    else if (sortBy === "oldest") list.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    return list;
  }, [pages, myPagesOnly, activeIndustry, searchQ, currentUserId, sortBy]);

  const handleLogoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { showToast("Image must be under 5MB", "error"); return; }
    setFormLogo(file);
    const reader = new FileReader();
    reader.onloadend = () => setFormLogoPreview(reader.result);
    reader.readAsDataURL(file);
  };

  const openCreate = () => {
    setEditingPage(null); setFormTitle(""); setFormDesc(""); setFormCD({ ...EMPTY_CD });
    setFormLogo(null); setFormLogoPreview(null); setIsModalOpen(true);
  };

  const openEdit = (page) => {
    setEditingPage(page); setFormTitle(page.title || ""); setFormDesc(page.description || "");
    const cd = page.company_data || {};
    setFormCD({
      tagline: cd.tagline||"", industry: cd.industry||"", size: cd.size||"",
      website: cd.website||"", location: cd.location||"", founded: cd.founded||"",
      linkedin: cd.linkedin||"", twitter: cd.twitter||"", type: cd.type||"",
      coverIndex: cd.coverIndex ?? 0,
    });
    setFormLogo(null); setFormLogoPreview(page.image_url || null); setIsModalOpen(true);
  };

  const handleSavePage = async (e) => {
    e.preventDefault();
    if (!formTitle.trim() || !currentUserId || !supabase) return;
    setIsProcessing(true);
    try {
      let imageUrl = editingPage?.image_url || null;
      if (formLogo) {
        const ext = formLogo.name.split(".").pop();
        const fileName = `page-${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage.from("pages").upload(fileName, formLogo);
        if (upErr) throw upErr;
        const { data: urlData } = supabase.storage.from("pages").getPublicUrl(fileName);
        imageUrl = urlData.publicUrl;
      }
      const payload = { title: formTitle, description: formDesc, image_url: imageUrl, company_data: formCD };
      if (editingPage) {
        const { error } = await supabase.from("pages").update(payload).eq("id", editingPage.id);
        if (error) throw error;
        setPages(prev => prev.map(p => p.id === editingPage.id ? { ...p, ...payload } : p));
        if (activePage?.id === editingPage.id) setActivePage(prev => ({ ...prev, ...payload }));
        showToast("Company page updated!");
      } else {
        const { data, error } = await supabase.from("pages").insert({ ...payload, created_by: currentUserId }).select("*").single();
        if (error) throw error;
        if (data) setPages(prev => [data, ...prev]);
        showToast("Company page created!");
      }
      setIsModalOpen(false);
    } catch (err) {
      if (err.code === "PGRST204" || err.code === "42703" || err.message?.toLowerCase().includes("company_data")) {
        setNeedsSetup(true); setIsModalOpen(false);
      } else {
        showToast("Error: " + err.message, "error");
      }
    } finally { setIsProcessing(false); }
  };

  const confirmDeletePage = async () => {
    if (!pageToDelete || !supabase) return;
    setIsProcessing(true);
    try {
      await supabase.from("page_posts").delete().eq("page_id", pageToDelete);
      const { error } = await supabase.from("pages").delete().eq("id", pageToDelete);
      if (error) throw error;
      setPages(prev => prev.filter(p => p.id !== pageToDelete));
      if (activePage?.id === pageToDelete) setActivePage(null);
      setPageToDelete(null); showToast("Page deleted.");
    } catch (err) { showToast("Error: " + err.message, "error"); }
    finally { setIsProcessing(false); }
  };

  const handleCreatePost = async (e) => {
    e.preventDefault();
    if (!postInput.trim() || !activePage || !currentUserId || !supabase) return;
    setIsProcessing(true);
    try {
      const { data: np, error } = await supabase.from("page_posts")
        .insert({ page_id: activePage.id, user_id: currentUserId, content: postInput.slice(0, POST_LIMIT) })
        .select("*, profiles(username, avatar_url, is_verified)").single();
      if (error) throw error;
      setPostInput("");
      if (np) setPagePosts(prev => prev.some(p => p.id === np.id) ? prev : [np, ...prev]);
      showToast("Update posted!");
    } catch (err) { showToast("Error: " + err.message, "error"); }
    finally { setIsProcessing(false); }
  };

  const confirmDeletePost = async () => {
    if (!postToDelete || !supabase) return;
    const { error } = await supabase.from("page_posts").delete().eq("id", postToDelete);
    if (!error) { setPagePosts(prev => prev.filter(p => p.id !== postToDelete)); showToast("Post deleted."); }
    setPostToDelete(null);
  };

  const handleUpdatePost = async (id) => {
    if (!editContent.trim() || !supabase) return;
    const { error } = await supabase.from("page_posts").update({ content: editContent }).eq("id", id);
    if (!error) {
      setPagePosts(prev => prev.map(p => p.id === id ? { ...p, content: editContent } : p));
      setEditingPostId(null); showToast("Post updated!");
    }
  };

  const openPage = (page) => { setActivePage(page); setActiveTab("about"); setPagePosts([]); setPageJobs([]); };

  const handleShare = async (page) => {
    const url = `${window.location.origin}/dash/pages`;
    const text = `${page.title} — company page on beoneofus`;
    if (navigator.share) {
      try { await navigator.share({ title: page.title, text, url }); } catch {}
    } else {
      await navigator.clipboard.writeText(url).catch(() => {});
      showToast("Link copied to clipboard!");
    }
  };

  // ─── MODALS ────────────────────────────────────────────────────────────────
  const modals = (
    <>
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
          <div className="relative w-full sm:max-w-lg bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200">
            {/* Drag handle on mobile */}
            <div className="sm:hidden w-10 h-1 bg-gray-300 dark:bg-gray-700 rounded-full mx-auto mt-3 mb-1" />
            <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center">
              <h2 className="text-base font-black text-gray-900 dark:text-gray-100">
                {editingPage ? "Edit Company Page" : "Create Company Page"}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full text-gray-400 transition">
                <X size={17} />
              </button>
            </div>

            <form className="p-5 space-y-4 max-h-[80vh] sm:max-h-[72vh] overflow-y-auto popup-scrollbar" onSubmit={handleSavePage}>
              {/* Cover color */}
              <Field label="Cover Color">
                <div className="flex gap-2">
                  {COVER_GRADIENTS.map((g, i) => (
                    <button type="button" key={i} title={COVER_LABELS[i]} onClick={() => setFormCD(p => ({ ...p, coverIndex: i }))}
                      className={`w-8 h-8 rounded-xl bg-gradient-to-br ${g} transition-all duration-150 ${formCD.coverIndex === i ? "ring-2 ring-offset-2 ring-indigo-500 dark:ring-offset-gray-950 scale-110" : "opacity-60 hover:opacity-90 hover:scale-105"}`} />
                  ))}
                </div>
              </Field>

              {/* Logo */}
              <Field label="Company Logo">
                <div className="flex items-center gap-4">
                  <div onClick={() => logoRef.current?.click()}
                    className={`w-16 h-16 rounded-2xl border-2 flex items-center justify-center cursor-pointer overflow-hidden transition-all ${formLogoPreview ? "border-indigo-400" : "border-dashed border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 hover:border-indigo-400"}`}>
                    <input type="file" ref={logoRef} onChange={handleLogoChange} accept="image/*" className="hidden" />
                    {formLogoPreview
                      ? <Image src={formLogoPreview} alt="Logo" width={64} height={64} className="object-cover w-full h-full" />
                      : <div className="text-center text-gray-400"><Building2 size={18} className="mx-auto mb-0.5" /><p className="text-[9px] font-bold">Upload</p></div>}
                  </div>
                  {formLogoPreview && (
                    <button type="button" onClick={() => { setFormLogo(null); setFormLogoPreview(null); }}
                      className="text-xs text-red-500 hover:underline font-bold">Remove</button>
                  )}
                </div>
              </Field>

              <Field label="Company Name *">
                <input type="text" required value={formTitle} onChange={e => setFormTitle(e.target.value)} placeholder="e.g. Acme Corp" className={inputCls} />
              </Field>
              <Field label="Tagline">
                <input type="text" value={formCD.tagline} onChange={e => setFormCD(p => ({ ...p, tagline: e.target.value }))} placeholder="e.g. Building the future of work" className={inputCls} />
              </Field>
              <Field label="About">
                <textarea rows={3} value={formDesc} onChange={e => setFormDesc(e.target.value)} placeholder="What does this company do?" className={`${inputCls} resize-none`} />
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Industry">
                  <select value={formCD.industry} onChange={e => setFormCD(p => ({ ...p, industry: e.target.value }))} className={inputCls}>
                    <option value="">Select…</option>
                    {INDUSTRIES.filter(i => i !== "All").map(i => <option key={i} value={i}>{i}</option>)}
                  </select>
                </Field>
                <Field label="Company Type">
                  <select value={formCD.type} onChange={e => setFormCD(p => ({ ...p, type: e.target.value }))} className={inputCls}>
                    <option value="">Select…</option>
                    {COMPANY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Company Size">
                  <select value={formCD.size} onChange={e => setFormCD(p => ({ ...p, size: e.target.value }))} className={inputCls}>
                    <option value="">Select…</option>
                    {SIZES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </Field>
                <Field label="Founded">
                  <input type="text" value={formCD.founded} onChange={e => setFormCD(p => ({ ...p, founded: e.target.value }))} placeholder="e.g. 2021" className={inputCls} />
                </Field>
              </div>

              <Field label="Location">
                <input type="text" value={formCD.location} onChange={e => setFormCD(p => ({ ...p, location: e.target.value }))} placeholder="e.g. Nairobi, Kenya" className={inputCls} />
              </Field>
              <Field label="Website">
                <input type="text" value={formCD.website} onChange={e => setFormCD(p => ({ ...p, website: e.target.value }))} placeholder="https://example.com" className={inputCls} />
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="LinkedIn">
                  <input type="text" value={formCD.linkedin} onChange={e => setFormCD(p => ({ ...p, linkedin: e.target.value }))} placeholder="company/acme" className={inputCls} />
                </Field>
                <Field label="X / Twitter">
                  <input type="text" value={formCD.twitter} onChange={e => setFormCD(p => ({ ...p, twitter: e.target.value }))} placeholder="@acmecorp" className={inputCls} />
                </Field>
              </div>

              <div className="pt-1 flex gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition">Cancel</button>
                <button type="submit" disabled={isProcessing} className="flex-1 flex justify-center items-center gap-2 py-2.5 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 active:scale-[0.98] transition disabled:opacity-50 text-sm">
                  {isProcessing ? <Loader2 size={16} className="animate-spin" /> : editingPage ? "Save Changes" : "Create Page"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {pageToDelete && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setPageToDelete(null)} />
          <div className="relative w-full max-w-sm bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 shadow-2xl text-center animate-in zoom-in-95 duration-150">
            <div className="w-11 h-11 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-3">
              <Trash2 size={20} className="text-red-500" />
            </div>
            <h3 className="text-base font-black text-gray-900 dark:text-gray-100 mb-1.5">Delete Company Page?</h3>
            <p className="text-gray-500 dark:text-gray-400 text-sm mb-5">This removes the page and all its updates. Cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setPageToDelete(null)} className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition">Cancel</button>
              <button onClick={confirmDeletePage} disabled={isProcessing} className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-sm font-bold transition disabled:opacity-50 flex items-center justify-center gap-1.5">
                {isProcessing ? <Loader2 size={15} className="animate-spin" /> : <><Trash2 size={13} /> Delete</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {postToDelete && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setPostToDelete(null)} />
          <div className="relative w-full max-w-sm bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 shadow-2xl text-center animate-in zoom-in-95 duration-150">
            <h3 className="text-base font-black text-gray-900 dark:text-gray-100 mb-1.5">Delete Post?</h3>
            <p className="text-gray-500 dark:text-gray-400 text-sm mb-5">Remove this update from the company page.</p>
            <div className="flex gap-3">
              <button onClick={() => setPostToDelete(null)} className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition">Cancel</button>
              <button onClick={confirmDeletePost} className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-sm font-bold transition">Delete</button>
            </div>
          </div>
        </div>
      )}

      {toastMsg && (
        <div className={`fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:bottom-8 sm:w-auto sm:max-w-xs z-[300] flex items-center gap-3 bg-white dark:bg-gray-900 border px-4 py-3 rounded-2xl shadow-2xl animate-in slide-in-from-bottom-4 duration-300 ${toastType === "error" ? "border-red-200 dark:border-red-800 text-red-600 dark:text-red-400" : "border-green-200 dark:border-green-800 text-green-600 dark:text-green-400"}`}>
          {toastType === "error" ? <AlertTriangle size={15} className="shrink-0" /> : <Check size={15} className="shrink-0" />}
          <span className="text-sm font-bold">{toastMsg}</span>
        </div>
      )}
    </>
  );

  // ─── DETAIL VIEW ───────────────────────────────────────────────────────────
  if (activePage) {
    const cd = activePage.company_data || {};
    const grad = coverGrad(cd);
    const isOwner = activePage.created_by === currentUserId;
    const isFollowing = following[activePage.id];

    const linkedinUrl = cd.linkedin
      ? (cd.linkedin.startsWith("http") ? cd.linkedin : `https://linkedin.com/company/${cd.linkedin.replace(/^\//, "")}`)
      : null;
    const twitterUrl = cd.twitter
      ? (cd.twitter.startsWith("http") ? cd.twitter : `https://x.com/${cd.twitter.replace(/^@/, "")}`)
      : null;

    const infoFields = [
      { label: "Industry",     value: cd.industry,                                    icon: <BookOpen size={12} />,  href: null },
      { label: "Type",         value: cd.type,                                         icon: <Building2 size={12} />, href: null },
      { label: "Company size", value: cd.size ? `${cd.size} employees` : null,         icon: <Users size={12} />,     href: null },
      { label: "Location",     value: cd.location,                                     icon: <MapPin size={12} />,    href: null },
      { label: "Founded",      value: cd.founded,                                      icon: <Calendar size={12} />,  href: null },
      { label: "Website",      value: cd.website?.replace(/^https?:\/\//, "").replace(/\/$/, "") || null,
                                                                                        icon: <Globe size={12} />,     href: cd.website ? (cd.website.startsWith("http") ? cd.website : `https://${cd.website}`) : null },
      { label: "LinkedIn",     value: cd.linkedin || null,                             icon: <Link2 size={12} />,  href: linkedinUrl },
      { label: "X / Twitter",  value: cd.twitter || null,                              icon: <AtSign size={12} />,   href: twitterUrl },
    ].filter(f => f.value);

    return (
      <div className="space-y-3 max-w-3xl mx-auto animate-in fade-in slide-in-from-bottom-3 duration-300">
        {/* Header card */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-[2rem] shadow-sm">
          {/* Cover banner */}
          <div className={`h-24 sm:h-32 bg-gradient-to-br ${grad} relative rounded-t-[calc(2rem-1px)] overflow-hidden`}>
            <button onClick={() => { setActivePage(null); setActiveTab("about"); }}
              className="absolute top-3 left-3 flex items-center gap-1 px-3 py-1.5 bg-black/25 backdrop-blur-sm text-white hover:bg-black/40 rounded-xl text-xs font-bold transition">
              <ChevronLeft size={13} /> Back
            </button>
            <div className="absolute top-3 right-3 flex gap-1.5">
              <button onClick={() => handleShare(activePage)}
                className="p-2 bg-black/25 backdrop-blur-sm text-white hover:bg-black/40 rounded-xl transition" title="Share page">
                <Share2 size={14} />
              </button>
              {isOwner && (
                <button onClick={() => openEdit(activePage)}
                  className="p-2 bg-black/25 backdrop-blur-sm text-white hover:bg-black/40 rounded-xl transition" title="Edit page">
                  <Pencil size={14} />
                </button>
              )}
            </div>
          </div>

          {/* Identity */}
          <div className="px-4 sm:px-6 pb-4 relative z-10">
            <div className="flex items-end justify-between -mt-7 sm:-mt-8 mb-3">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl border-4 border-white dark:border-gray-900 bg-white dark:bg-gray-800 shadow-md overflow-hidden shrink-0 flex items-center justify-center text-xl font-black text-indigo-600 dark:text-indigo-400">
                {activePage.image_url
                  ? <Image src={activePage.image_url} alt={activePage.title} width={64} height={64} className="object-cover w-full h-full" />
                  : activePage.title[0]}
              </div>
              <div className="flex items-center gap-1 mb-1 flex-wrap justify-end">
                {isOwner && (
                  <button onClick={() => setPageToDelete(activePage.id)}
                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition" title="Delete page">
                    <Trash2 size={14} />
                  </button>
                )}
                {cd.website && (
                  <a href={cd.website.startsWith("http") ? cd.website : `https://${cd.website}`} target="_blank" rel="noopener noreferrer"
                    className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-xl transition" title="Website">
                    <Globe size={14} />
                  </a>
                )}
                {linkedinUrl && (
                  <a href={linkedinUrl} target="_blank" rel="noopener noreferrer"
                    className="p-2 text-gray-400 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition" title="LinkedIn">
                    <Link2 size={14} />
                  </a>
                )}
                {twitterUrl && (
                  <a href={twitterUrl} target="_blank" rel="noopener noreferrer"
                    className="p-2 text-gray-400 hover:text-sky-500 hover:bg-sky-50 dark:hover:bg-sky-900/20 rounded-xl transition" title="X / Twitter">
                    <AtSign size={14} />
                  </a>
                )}
                <button onClick={() => setFollowing(prev => ({ ...prev, [activePage.id]: !prev[activePage.id] }))}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-bold transition-all ${isFollowing ? "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300" : "bg-indigo-600 hover:bg-indigo-700 text-white"}`}>
                  {isFollowing ? <><Check size={13} /><span className="hidden sm:inline">Following</span></> : <><Heart size={13} /><span className="hidden sm:inline">Follow</span></>}
                </button>
              </div>
            </div>

            <div className="flex items-start gap-2 flex-wrap">
              <h1 className="text-lg sm:text-xl font-black text-gray-900 dark:text-gray-100 leading-tight">{activePage.title}</h1>
              {cd.type && (
                <span className="mt-0.5 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400">
                  {cd.type}
                </span>
              )}
            </div>
            {cd.tagline && <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-0.5">{cd.tagline}</p>}

            <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2.5 text-xs text-gray-500 dark:text-gray-400">
              {cd.industry && <span className="flex items-center gap-1"><BookOpen size={10} /> {cd.industry}</span>}
              {cd.size && <span className="flex items-center gap-1"><Users size={10} /> {cd.size}</span>}
              {cd.location && <span className="flex items-center gap-1"><MapPin size={10} /> {cd.location}</span>}
              {cd.founded && <span className="flex items-center gap-1"><Calendar size={10} /> Est. {cd.founded}</span>}
            </div>
          </div>

          {/* Tabs — scrollable on mobile */}
          <div className="border-t border-gray-100 dark:border-gray-800 flex overflow-x-auto no-scrollbar">
            {[
              { id:"about",   label:"About",   icon:<Building2 size={13} /> },
              { id:"updates", label:"Updates", icon:<Rss size={13} /> },
              { id:"jobs",    label:"Jobs",    icon:<Briefcase size={13} /> },
            ].map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-5 sm:px-7 py-3 text-xs sm:text-sm font-bold whitespace-nowrap border-b-2 transition-colors ${activeTab === tab.id ? "text-indigo-600 dark:text-indigo-400 border-indigo-600 dark:border-indigo-400" : "text-gray-500 dark:text-gray-400 border-transparent hover:text-gray-800 dark:hover:text-gray-200"}`}>
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* ABOUT TAB */}
        {activeTab === "about" && (
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-[2rem] p-5 sm:p-6 shadow-sm space-y-5 animate-in fade-in duration-200">
            {activePage.description ? (
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-2">About</p>
                <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-line">{activePage.description}</p>
              </div>
            ) : (
              <div className="text-center py-10">
                <Building2 size={36} className="mx-auto mb-3 text-gray-300 dark:text-gray-700" />
                <p className="text-sm font-bold text-gray-400 dark:text-gray-500">No description yet.</p>
                {isOwner && <button onClick={() => openEdit(activePage)} className="mt-2 text-indigo-500 hover:underline text-sm font-bold">Add one →</button>}
              </div>
            )}

            {infoFields.length > 0 && (
              <div className="border-t border-gray-100 dark:border-gray-800 pt-4 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {infoFields.map(f => (
                  <div key={f.label} className="flex items-start gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                    <span className="text-gray-400 dark:text-gray-500 shrink-0 mt-0.5">{f.icon}</span>
                    <div className="min-w-0">
                      <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500">{f.label}</p>
                      {f.href ? (
                        <a href={f.href} target="_blank" rel="noopener noreferrer"
                          className="text-sm text-indigo-600 dark:text-indigo-400 font-medium mt-0.5 flex items-center gap-1 hover:underline break-all">
                          <span className="truncate">{f.value}</span><ExternalLink size={10} className="shrink-0" />
                        </a>
                      ) : (
                        <p className="text-sm text-gray-700 dark:text-gray-300 font-medium mt-0.5 break-words">{f.value}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* UPDATES TAB */}
        {activeTab === "updates" && (
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-[2rem] overflow-hidden shadow-sm animate-in fade-in duration-200">
            {currentUserId && (
              <div className="p-4 sm:p-5 border-b border-gray-100 dark:border-gray-800">
                <form onSubmit={handleCreatePost} className="space-y-2.5">
                  <textarea
                    value={postInput}
                    onChange={e => setPostInput(e.target.value.slice(0, POST_LIMIT))}
                    placeholder="Share a company update…"
                    rows={3}
                    className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-3.5 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 resize-none transition placeholder-gray-400 dark:placeholder-gray-500"
                  />
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-medium tabular-nums ${postInput.length >= POST_LIMIT ? "text-red-500" : postInput.length > POST_LIMIT * 0.85 ? "text-amber-500" : "text-gray-400"}`}>
                      {postInput.length}/{POST_LIMIT}
                    </span>
                    <button type="submit" disabled={isProcessing || !postInput.trim()}
                      className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white px-4 py-2 rounded-xl text-sm font-bold transition active:scale-95">
                      {isProcessing ? <Loader2 size={14} className="animate-spin" /> : <><Send size={13} strokeWidth={3} /> Post</>}
                    </button>
                  </div>
                </form>
              </div>
            )}

            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {loadingPosts ? (
                <div className="p-5 space-y-4">
                  {[1,2,3].map(i => (
                    <div key={i} className="flex gap-3">
                      <div className="w-9 h-9 rounded-full bg-gray-100 dark:bg-gray-800 animate-pulse shrink-0" />
                      <div className="flex-1 space-y-2 pt-1">
                        <div className="h-3.5 bg-gray-100 dark:bg-gray-800 rounded animate-pulse w-1/3" />
                        <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded animate-pulse w-4/5" />
                        <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded animate-pulse w-3/5" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : pagePosts.length === 0 ? (
                <div className="py-14 flex flex-col items-center text-gray-400 dark:text-gray-500 px-4 text-center">
                  <Rss size={36} className="mb-3 opacity-30" />
                  <p className="text-sm font-bold">No updates yet.</p>
                  {isOwner && <p className="text-xs mt-1">Post the first company update above.</p>}
                </div>
              ) : pagePosts.map(post => {
                const canMod = post.user_id === currentUserId || isOwner;
                const isEd = editingPostId === post.id;
                return (
                  <div key={post.id} className="relative p-4 sm:p-5 flex gap-3 group hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors animate-in fade-in">
                    <div className="relative w-9 h-9 rounded-full bg-gray-100 dark:bg-gray-800 shrink-0 overflow-hidden flex items-center justify-center text-xs font-bold text-gray-600 dark:text-gray-300">
                      {post.profiles?.avatar_url
                        ? <Image src={post.profiles.avatar_url} alt="avatar" fill sizes="36px" className="object-cover" />
                        : post.profiles?.username?.slice(0,2)?.toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0 pr-14 sm:pr-16">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-sm font-bold text-gray-900 dark:text-gray-100 flex items-center gap-1">
                          @{post.profiles?.username}
                          {post.profiles?.is_verified && <BadgeCheck size={13} className="text-blue-500" />}
                        </span>
                        <span className="text-[10px] text-gray-400 uppercase tracking-wide">
                          {new Date(post.created_at).toLocaleDateString("en-US", { month:"short", day:"numeric" })}
                        </span>
                      </div>
                      {isEd ? (
                        <div className="animate-in fade-in">
                          <textarea value={editContent} onChange={e => setEditContent(e.target.value)} rows={3}
                            className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-2.5 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 mb-2 resize-none" />
                          <div className="flex gap-2">
                            <button onClick={() => handleUpdatePost(post.id)} className="bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-indigo-700 transition">Save</button>
                            <button onClick={() => setEditingPostId(null)} className="bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-gray-200 dark:hover:bg-gray-700 transition">Cancel</button>
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-line break-words">{post.content}</p>
                      )}
                    </div>
                    {canMod && !isEd && (
                      <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => { setEditingPostId(post.id); setEditContent(post.content); }}
                          className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition"><Pencil size={13} /></button>
                        <button onClick={() => setPostToDelete(post.id)}
                          className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition"><Trash2 size={13} /></button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* JOBS TAB */}
        {activeTab === "jobs" && (
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-[2rem] overflow-hidden shadow-sm animate-in fade-in duration-200">
            {loadingJobs ? (
              <div className="p-5 space-y-3">
                {[1,2,3].map(i => <div key={i} className="h-16 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />)}
              </div>
            ) : pageJobs.length === 0 ? (
              <div className="py-14 flex flex-col items-center text-gray-400 dark:text-gray-500 px-4 text-center">
                <Briefcase size={36} className="mb-3 opacity-30" />
                <p className="text-sm font-bold">No open roles found.</p>
                <p className="text-xs mt-1 max-w-xs">Jobs posted with company name <strong className="text-gray-500 dark:text-gray-400">&ldquo;{activePage.title}&rdquo;</strong> will appear here.</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {pageJobs.map(job => (
                  <div key={job.id}
                    onClick={() => window.dispatchEvent(new CustomEvent("open-header-modal", { detail: "jobs" }))}
                    className="p-4 sm:p-5 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition cursor-pointer group">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{job.title}</p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          {job.location && <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1"><MapPin size={10} /> {job.location}</span>}
                          {job.type && <span className="text-[10px] font-bold uppercase tracking-wide bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded-full">{job.type}</span>}
                        </div>
                      </div>
                      <span className="text-[10px] text-gray-400 shrink-0 pt-0.5">{new Date(job.created_at).toLocaleDateString("en-US", { month:"short", day:"numeric" })}</span>
                    </div>
                    {job.description && <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 line-clamp-2">{job.description}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {modals}
      </div>
    );
  }

  // ─── BROWSE VIEW ───────────────────────────────────────────────────────────
  return (
    <div className="space-y-4 max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-3 duration-400">
      {/* Header */}
      <div className="flex items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-gray-100">Company Pages</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-0.5">Discover companies building the future.</p>
        </div>
        <button onClick={openCreate}
          className="shrink-0 flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 sm:px-5 py-2.5 rounded-xl font-bold shadow-sm active:scale-95 transition-all text-sm">
          <Plus size={16} />
          <span className="hidden xs:inline sm:inline">Create Page</span>
        </button>
      </div>

      {needsSetup && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 rounded-2xl p-4">
          <div className="flex items-start gap-3">
            <Terminal size={17} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-amber-800 dark:text-amber-300 mb-1">Database column missing</p>
              <p className="text-xs text-amber-700 dark:text-amber-400 mb-2">Run this in your Supabase SQL editor:</p>
              <code className="block text-xs bg-amber-100 dark:bg-amber-900/40 text-amber-900 dark:text-amber-200 rounded-xl px-3 py-2 font-mono break-all">
                ALTER TABLE public.pages ADD COLUMN IF NOT EXISTS company_data JSONB DEFAULT &apos;{'{}'}&apos;;
              </code>
            </div>
            <button onClick={() => setNeedsSetup(false)} className="text-amber-400 hover:text-amber-600 shrink-0"><X size={15} /></button>
          </div>
        </div>
      )}

      {/* Search + controls */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            type="text" value={searchQ} onChange={e => setSearchQ(e.target.value)}
            placeholder="Search companies…"
            className="w-full pl-9 pr-4 py-2.5 text-sm bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-gray-900 dark:text-gray-100 transition"
          />
        </div>
        <div className="flex gap-2 shrink-0">
          <button onClick={() => setMyPagesOnly(!myPagesOnly)}
            className={`px-4 py-2.5 rounded-xl text-sm font-bold transition-all border ${myPagesOnly ? "bg-indigo-600 text-white border-indigo-600" : "bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-indigo-400"}`}>
            Mine
          </button>
          <div className="relative">
            <button onClick={() => setShowSort(!showSort)}
              className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-sm font-bold bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-indigo-400 transition">
              <SortAsc size={14} />
              <span className="hidden sm:inline">{SORT_OPTIONS.find(s => s.id === sortBy)?.label}</span>
              <ChevronDown size={12} className={`transition-transform ${showSort ? "rotate-180" : ""}`} />
            </button>
            {showSort && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowSort(false)} />
                <div className="absolute right-0 top-full mt-1.5 w-32 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-xl z-20 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                  {SORT_OPTIONS.map(opt => (
                    <button key={opt.id} onClick={() => { setSortBy(opt.id); setShowSort(false); }}
                      className={`w-full text-left px-3.5 py-2.5 text-sm transition-colors ${sortBy === opt.id ? "bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 font-bold" : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 font-medium"}`}>
                      {opt.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Industry chips — horizontal scroll on mobile */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-0.5">
        {INDUSTRIES.map(ind => (
          <button key={ind} onClick={() => setActiveIndustry(ind)}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${activeIndustry === ind ? "bg-indigo-600 text-white" : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 hover:text-indigo-600 dark:hover:text-indigo-400"}`}>
            {ind}
          </button>
        ))}
      </div>

      {/* Result count */}
      {!loading && pages.length > 0 && (
        <p className="text-xs text-gray-400 dark:text-gray-500">
          {filteredPages.length === pages.length
            ? `${pages.length} ${pages.length === 1 ? "company" : "companies"}`
            : `${filteredPages.length} of ${pages.length}`}
          {activeIndustry !== "All" && ` · ${activeIndustry}`}
        </p>
      )}

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[1,2,3,4].map(i => (
            <div key={i} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden">
              <div className="h-14 bg-gray-100 dark:bg-gray-800 animate-pulse" />
              <div className="p-4 space-y-2.5">
                <div className="h-5 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse w-2/3" />
                <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded animate-pulse w-1/2" />
                <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded animate-pulse w-3/4" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredPages.length === 0 ? (
        <div className="py-16 flex flex-col items-center border border-dashed border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/20 rounded-[2rem] px-4 text-center">
          <Building2 size={40} className="text-gray-300 dark:text-gray-600 mb-3" />
          <p className="text-gray-500 dark:text-gray-400 font-bold text-sm">
            {searchQ || activeIndustry !== "All" || myPagesOnly ? "No matches found." : "No company pages yet."}
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
            {searchQ || activeIndustry !== "All" || myPagesOnly ? "Try adjusting your filters." : "Be the first to create one."}
          </p>
          {(searchQ || activeIndustry !== "All" || myPagesOnly) && (
            <button onClick={() => { setSearchQ(""); setActiveIndustry("All"); setMyPagesOnly(false); }}
              className="mt-4 text-xs font-bold text-indigo-500 hover:text-indigo-700 dark:hover:text-indigo-300 hover:underline transition-colors">
              Clear all filters
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {filteredPages.map(page => {
            const pcd = page.company_data || {};
            const grad = coverGrad(pcd);
            const newBadge = isNewPage(page.created_at);
            return (
              <div key={page.id} onClick={() => openPage(page)}
                className="group bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl hover:border-indigo-400/60 hover:shadow-lg dark:hover:shadow-indigo-900/10 transition-all duration-200 cursor-pointer">
                {/* Cover */}
                <div className={`h-14 bg-gradient-to-r ${grad} relative rounded-t-2xl overflow-hidden`}>
                  {newBadge && (
                    <span className="absolute top-2 left-2 flex items-center gap-1 px-2 py-0.5 bg-black/25 backdrop-blur-sm text-white text-[9px] font-black uppercase tracking-widest rounded-full">
                      <Sparkles size={8} /> New
                    </span>
                  )}
                  {page.created_by === currentUserId && (
                    <button onClick={e => { e.stopPropagation(); setPageToDelete(page.id); }}
                      className="absolute top-1.5 right-1.5 p-1.5 bg-black/20 backdrop-blur-sm text-white hover:bg-red-600/80 rounded-lg transition-all opacity-0 group-hover:opacity-100">
                      <Trash2 size={11} />
                    </button>
                  )}
                </div>

                <div className="px-3.5 pb-3.5 relative z-10">
                  <div className="flex items-end justify-between -mt-5 mb-2.5">
                    <div className="w-11 h-11 rounded-xl border-[3px] border-white dark:border-gray-900 bg-white dark:bg-gray-800 shadow-sm overflow-hidden shrink-0 flex items-center justify-center text-sm font-black text-indigo-600 dark:text-indigo-400">
                      {page.image_url
                        ? <Image src={page.image_url} alt={page.title} width={44} height={44} className="object-cover w-full h-full" />
                        : page.title[0]}
                    </div>
                    <div className="flex flex-col items-end gap-0.5 mb-0.5">
                      {pcd.type && <span className="text-[9px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500">{pcd.type}</span>}
                      {pcd.industry && <span className="text-[9px] font-black text-indigo-500 dark:text-indigo-400 uppercase tracking-widest">{pcd.industry}</span>}
                    </div>
                  </div>

                  <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{page.title}</h3>
                  {pcd.tagline && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">{pcd.tagline}</p>}
                  {page.description && !pcd.tagline && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">{page.description}</p>}

                  <div className="flex items-center gap-3 mt-2.5 text-[10px] text-gray-400 dark:text-gray-500 flex-wrap">
                    {pcd.location && <span className="flex items-center gap-1"><MapPin size={9} /> {pcd.location}</span>}
                    {pcd.size && <span className="flex items-center gap-1"><Users size={9} /> {pcd.size}</span>}
                    {pcd.founded && <span className="flex items-center gap-1"><Calendar size={9} /> {pcd.founded}</span>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {modals}
    </div>
  );
}
