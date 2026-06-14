"use client";
import Image from "next/image";
import { useState, useEffect, useRef, useMemo } from "react";
import {
  Building2, Plus, X, Loader2, Globe, Send, ChevronLeft,
  Trash2, Pencil, BadgeCheck, Check, AlertTriangle,
  MapPin, Users, Briefcase, BookOpen, Rss, Search,
  ExternalLink, Heart, Terminal
} from "lucide-react";
import { supabase } from "../../supabaseClient";

const INDUSTRIES = ["All","Technology","Finance","Healthcare","Education","Marketing","Design","Legal","Consulting","Other"];
const SIZES = ["1–10","11–50","51–200","201–500","500+"];
const EMPTY_CD = { tagline:"", industry:"", size:"", website:"", location:"", founded:"" };
const inputCls = "w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl py-2.5 px-3 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition";

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">{label}</label>
      {children}
    </div>
  );
}

export default function PagesContent() {
  const [pages, setPages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState(null);

  // Browse filters
  const [activeIndustry, setActiveIndustry] = useState("All");
  const [searchQ, setSearchQ] = useState("");
  const [myPagesOnly, setMyPagesOnly] = useState(false);

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPage, setEditingPage] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [needsSetup, setNeedsSetup] = useState(false);

  // Form
  const [formTitle, setFormTitle] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formCD, setFormCD] = useState({ ...EMPTY_CD });
  const [formLogo, setFormLogo] = useState(null);
  const [formLogoPreview, setFormLogoPreview] = useState(null);
  const logoRef = useRef(null);

  // Detail view
  const [activePage, setActivePage] = useState(null);
  const [activeTab, setActiveTab] = useState("about");

  // Updates
  const [pagePosts, setPagePosts] = useState([]);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [postInput, setPostInput] = useState("");
  const [editingPostId, setEditingPostId] = useState(null);
  const [editContent, setEditContent] = useState("");

  // Jobs
  const [pageJobs, setPageJobs] = useState([]);
  const [loadingJobs, setLoadingJobs] = useState(false);

  // Local follow state
  const [following, setFollowing] = useState({});

  // Confirm dialogs
  const [pageToDelete, setPageToDelete] = useState(null);
  const [postToDelete, setPostToDelete] = useState(null);

  // Toast
  const [toastMsg, setToastMsg] = useState("");
  const [toastType, setToastType] = useState("success");
  const showToast = (msg, type = "success") => {
    setToastMsg(msg); setToastType(type);
    setTimeout(() => setToastMsg(""), 3000);
  };

  useEffect(() => {
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
  }, []);

  const fetchPages = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("pages").select("*").order("created_at", { ascending: false });
    if (!error && data) setPages(data);
    setLoading(false);
  };

  useEffect(() => {
    if (!activePage || activeTab !== "updates") return;
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
    if (!activePage || activeTab !== "jobs") return;
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
    let list = pages;
    if (myPagesOnly) list = list.filter(p => p.created_by === currentUserId);
    if (activeIndustry !== "All") list = list.filter(p => (p.company_data || {}).industry === activeIndustry);
    if (searchQ.trim()) {
      const q = searchQ.toLowerCase();
      list = list.filter(p => p.title.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q));
    }
    return list;
  }, [pages, myPagesOnly, activeIndustry, searchQ, currentUserId]);

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
    setFormCD({ tagline: cd.tagline||"", industry: cd.industry||"", size: cd.size||"", website: cd.website||"", location: cd.location||"", founded: cd.founded||"" });
    setFormLogo(null); setFormLogoPreview(page.image_url || null); setIsModalOpen(true);
  };

  const handleSavePage = async (e) => {
    e.preventDefault();
    if (!formTitle.trim() || !currentUserId) return;
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
    } finally {
      setIsProcessing(false);
    }
  };

  const confirmDeletePage = async () => {
    if (!pageToDelete) return;
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
    if (!postInput.trim() || !activePage || !currentUserId) return;
    setIsProcessing(true);
    try {
      const { data: np, error } = await supabase.from("page_posts")
        .insert({ page_id: activePage.id, user_id: currentUserId, content: postInput })
        .select("*, profiles(username, avatar_url, is_verified)").single();
      if (error) throw error;
      setPostInput("");
      if (np) setPagePosts(prev => prev.some(p => p.id === np.id) ? prev : [np, ...prev]);
      showToast("Update posted!");
    } catch (err) { showToast("Error: " + err.message, "error"); }
    finally { setIsProcessing(false); }
  };

  const confirmDeletePost = async () => {
    if (!postToDelete) return;
    const { error } = await supabase.from("page_posts").delete().eq("id", postToDelete);
    if (!error) { setPagePosts(prev => prev.filter(p => p.id !== postToDelete)); showToast("Post deleted."); }
    setPostToDelete(null);
  };

  const handleUpdatePost = async (id) => {
    if (!editContent.trim()) return;
    const { error } = await supabase.from("page_posts").update({ content: editContent }).eq("id", id);
    if (!error) {
      setPagePosts(prev => prev.map(p => p.id === id ? { ...p, content: editContent } : p));
      setEditingPostId(null); showToast("Post updated!");
    }
  };

  const openPage = (page) => { setActivePage(page); setActiveTab("about"); setPagePosts([]); setPageJobs([]); };

  // ─── SHARED MODALS ─────────────────────────────────────────────────────────
  const modals = (
    <>
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-gray-900/50 dark:bg-black/60 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
          <div className="relative w-full max-w-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl shadow-xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-5 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center">
              <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">{editingPage ? "Edit Company Page" : "Create Company Page"}</h2>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full text-gray-500 transition"><X size={18} /></button>
            </div>
            <form className="p-5 space-y-4 max-h-[70vh] overflow-y-auto custom-scrollbar" onSubmit={handleSavePage}>
              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Company Logo</label>
                <div onClick={() => logoRef.current?.click()}
                  className={`w-20 h-20 rounded-2xl border-2 flex items-center justify-center cursor-pointer overflow-hidden transition-all ${formLogoPreview ? "border-indigo-500/50" : "border-dashed border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 hover:border-indigo-400"}`}>
                  <input type="file" ref={logoRef} onChange={handleLogoChange} accept="image/*" className="hidden" />
                  {formLogoPreview
                    ? <Image src={formLogoPreview} alt="Logo" width={80} height={80} className="object-cover w-full h-full" />
                    : <div className="text-center text-gray-400"><Building2 size={20} className="mx-auto mb-1" /><p className="text-[9px] font-bold">Logo</p></div>}
                </div>
              </div>
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
                <Field label="Company Size">
                  <select value={formCD.size} onChange={e => setFormCD(p => ({ ...p, size: e.target.value }))} className={inputCls}>
                    <option value="">Select…</option>
                    {SIZES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Location">
                  <input type="text" value={formCD.location} onChange={e => setFormCD(p => ({ ...p, location: e.target.value }))} placeholder="e.g. Nairobi, Kenya" className={inputCls} />
                </Field>
                <Field label="Founded">
                  <input type="text" value={formCD.founded} onChange={e => setFormCD(p => ({ ...p, founded: e.target.value }))} placeholder="e.g. 2021" className={inputCls} />
                </Field>
              </div>
              <Field label="Website">
                <input type="text" value={formCD.website} onChange={e => setFormCD(p => ({ ...p, website: e.target.value }))} placeholder="https://example.com" className={inputCls} />
              </Field>
              <div className="pt-2 flex gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition">Cancel</button>
                <button type="submit" disabled={isProcessing} className="flex-1 flex justify-center py-2.5 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 transition disabled:opacity-50">
                  {isProcessing ? <Loader2 size={18} className="animate-spin" /> : editingPage ? "Save Changes" : "Create Page"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {pageToDelete && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setPageToDelete(null)} />
          <div className="relative w-full max-w-sm bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 shadow-2xl text-center animate-in fade-in zoom-in duration-150">
            <Trash2 size={32} className="text-red-500 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">Delete Company Page?</h3>
            <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">This removes the page and all its updates. Cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setPageToDelete(null)} className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition">Cancel</button>
              <button onClick={confirmDeletePage} disabled={isProcessing} className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-sm font-semibold transition disabled:opacity-50 flex items-center justify-center">
                {isProcessing ? <Loader2 size={16} className="animate-spin" /> : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {postToDelete && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setPostToDelete(null)} />
          <div className="relative w-full max-w-sm bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 shadow-2xl text-center animate-in fade-in zoom-in duration-150">
            <Trash2 size={28} className="text-red-500 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">Delete Post?</h3>
            <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">Remove this update from the company page.</p>
            <div className="flex gap-3">
              <button onClick={() => setPostToDelete(null)} className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition">Cancel</button>
              <button onClick={confirmDeletePost} className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-sm font-semibold transition">Delete</button>
            </div>
          </div>
        </div>
      )}

      {toastMsg && (
        <div className={`fixed bottom-10 right-10 z-[150] flex items-center gap-3 bg-white dark:bg-gray-900 border px-5 py-3 rounded-2xl shadow-xl animate-in fade-in slide-in-from-bottom-8 duration-300 max-w-md ${toastType === "error" ? "border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-500" : "border-green-200 dark:border-green-900/50 text-green-600 dark:text-green-500"}`}>
          {toastType === "error" ? <AlertTriangle size={18} className="shrink-0" /> : <Check size={18} className="shrink-0" />}
          <span className="text-sm font-bold">{toastMsg}</span>
        </div>
      )}
    </>
  );

  // ─── DETAIL VIEW ──────────────────────────────────────────────────────────
  if (activePage) {
    const cd = activePage.company_data || {};
    return (
      <div className="space-y-4 max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
        {/* Company header card */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-[2rem] overflow-hidden shadow-sm">
          <div className="h-28 bg-gradient-to-br from-indigo-500 via-purple-600 to-pink-500 relative">
            <button onClick={() => { setActivePage(null); setActiveTab("about"); }}
              className="absolute top-4 left-4 p-2 bg-white/20 backdrop-blur-sm text-white hover:bg-white/30 rounded-xl transition">
              <ChevronLeft size={18} />
            </button>
            {activePage.created_by === currentUserId && (
              <button onClick={() => openEdit(activePage)}
                className="absolute top-4 right-4 p-2 bg-white/20 backdrop-blur-sm text-white hover:bg-white/30 rounded-xl transition">
                <Pencil size={16} />
              </button>
            )}
          </div>

          <div className="px-6 pb-4">
            <div className="flex items-end justify-between -mt-8 mb-3">
              <div className="w-16 h-16 rounded-2xl border-4 border-white dark:border-gray-900 bg-white dark:bg-gray-800 shadow-md overflow-hidden shrink-0 flex items-center justify-center text-2xl font-black text-indigo-600 dark:text-indigo-400">
                {activePage.image_url
                  ? <Image src={activePage.image_url} alt={activePage.title} width={64} height={64} className="object-cover w-full h-full" />
                  : activePage.title[0]}
              </div>
              <div className="flex items-center gap-2 mb-1">
                {activePage.created_by === currentUserId && (
                  <button onClick={() => setPageToDelete(activePage.id)}
                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition" title="Delete page">
                    <Trash2 size={16} />
                  </button>
                )}
                {cd.website && (
                  <a href={cd.website.startsWith("http") ? cd.website : `https://${cd.website}`} target="_blank" rel="noopener noreferrer"
                    className="p-2 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-xl transition">
                    <ExternalLink size={16} />
                  </a>
                )}
                <button onClick={() => setFollowing(prev => ({ ...prev, [activePage.id]: !prev[activePage.id] }))}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold transition-all ${following[activePage.id] ? "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300" : "bg-indigo-600 hover:bg-indigo-700 text-white"}`}>
                  {following[activePage.id] ? <><Check size={14} /> Following</> : <><Heart size={14} /> Follow</>}
                </button>
              </div>
            </div>

            <h1 className="text-xl font-black text-gray-900 dark:text-gray-100">{activePage.title}</h1>
            {cd.tagline && <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{cd.tagline}</p>}

            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2.5 text-xs text-gray-500 dark:text-gray-400">
              {cd.industry && <span className="flex items-center gap-1"><BookOpen size={11} /> {cd.industry}</span>}
              {cd.size && <span className="flex items-center gap-1"><Users size={11} /> {cd.size} employees</span>}
              {cd.location && <span className="flex items-center gap-1"><MapPin size={11} /> {cd.location}</span>}
              {cd.website && <span className="flex items-center gap-1 max-w-[200px] truncate"><Globe size={11} /> {cd.website.replace(/^https?:\/\//, "").replace(/\/$/, "")}</span>}
            </div>
          </div>

          <div className="border-t border-gray-200 dark:border-gray-800 flex">
            {[
              { id: "about", label: "About", icon: <Building2 size={14} /> },
              { id: "updates", label: "Updates", icon: <Rss size={14} /> },
              { id: "jobs", label: "Jobs", icon: <Briefcase size={14} /> },
            ].map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-5 py-3 text-sm font-bold transition-colors ${activeTab === tab.id ? "text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400" : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"}`}>
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* ABOUT */}
        {activeTab === "about" && (
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-[2rem] p-6 shadow-sm space-y-5 animate-in fade-in">
            {activePage.description ? (
              <div>
                <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">About</h3>
                <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{activePage.description}</p>
              </div>
            ) : (
              <div className="text-center py-10 text-gray-400 dark:text-gray-500">
                <Building2 size={40} className="mx-auto mb-3 opacity-30" />
                <p className="text-sm font-bold">No description yet.</p>
                {activePage.created_by === currentUserId && (
                  <button onClick={() => openEdit(activePage)} className="mt-2 text-indigo-500 hover:underline text-sm">Add one →</button>
                )}
              </div>
            )}
            {[
              { label: "Industry", value: cd.industry },
              { label: "Company size", value: cd.size ? `${cd.size} employees` : null },
              { label: "Location", value: cd.location },
              { label: "Founded", value: cd.founded },
              { label: "Website", value: cd.website ? cd.website.replace(/^https?:\/\//, "").replace(/\/$/, "") : null },
            ].filter(f => f.value).length > 0 && (
              <div className="border-t border-gray-100 dark:border-gray-800 pt-4 grid grid-cols-2 gap-4">
                {[
                  { label: "Industry", value: cd.industry },
                  { label: "Company size", value: cd.size ? `${cd.size} employees` : null },
                  { label: "Location", value: cd.location },
                  { label: "Founded", value: cd.founded },
                  { label: "Website", value: cd.website ? cd.website.replace(/^https?:\/\//, "").replace(/\/$/, "") : null },
                ].filter(f => f.value).map(f => (
                  <div key={f.label}>
                    <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">{f.label}</p>
                    <p className="text-sm text-gray-700 dark:text-gray-300 font-medium mt-0.5 break-words">{f.value}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* UPDATES */}
        {activeTab === "updates" && (
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-[2rem] overflow-hidden shadow-sm animate-in fade-in">
            <div className="p-4 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
              <form onSubmit={handleCreatePost} className="flex items-center gap-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-2xl p-1.5 pl-4 focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500 transition shadow-sm">
                <input type="text" value={postInput} onChange={e => setPostInput(e.target.value)} placeholder="Share a company update…"
                  className="flex-1 bg-transparent border-none focus:outline-none text-sm text-gray-900 dark:text-gray-100 py-2" />
                <button type="submit" disabled={isProcessing || !postInput.trim()} className="bg-indigo-600 hover:bg-indigo-700 text-white p-2.5 rounded-xl transition active:scale-95 disabled:opacity-50">
                  {isProcessing ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} strokeWidth={3} />}
                </button>
              </form>
            </div>
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {loadingPosts ? (
                <div className="p-4 space-y-4">
                  {[1,2,3].map(i => (
                    <div key={i} className="flex gap-3">
                      <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 animate-pulse shrink-0" />
                      <div className="flex-1 space-y-2 py-1">
                        <div className="h-4 bg-gray-100 dark:bg-gray-800 rounded animate-pulse w-1/3" />
                        <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded animate-pulse w-3/4" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : pagePosts.length === 0 ? (
                <div className="py-16 flex flex-col items-center text-gray-400 dark:text-gray-500">
                  <Rss size={40} className="mb-3 opacity-30" />
                  <p className="text-sm font-bold">No updates yet.</p>
                </div>
              ) : pagePosts.map(post => {
                const canMod = post.user_id === currentUserId || activePage.created_by === currentUserId;
                const isEd = editingPostId === post.id;
                return (
                  <div key={post.id} className="relative p-4 flex gap-3 group animate-in fade-in">
                    <div className="relative w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 shrink-0 overflow-hidden flex items-center justify-center text-xs font-bold text-gray-600 dark:text-gray-300">
                      {post.profiles?.avatar_url
                        ? <Image src={post.profiles.avatar_url} alt="avatar" fill sizes="40px" className="object-cover" />
                        : post.profiles?.username?.slice(0,2)}
                    </div>
                    <div className="flex-1 min-w-0 pr-16">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate flex items-center gap-1">
                          @{post.profiles?.username}
                          {post.profiles?.is_verified && <BadgeCheck size={14} className="text-blue-500" />}
                        </span>
                        <span className="text-[9px] text-gray-400 uppercase tracking-widest shrink-0">
                          {new Date(post.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        </span>
                      </div>
                      {isEd ? (
                        <div className="animate-in fade-in">
                          <textarea value={editContent} onChange={e => setEditContent(e.target.value)} rows={3}
                            className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl p-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 mb-2 resize-none" />
                          <div className="flex gap-2">
                            <button onClick={() => handleUpdatePost(post.id)} className="bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-indigo-700 transition">Save</button>
                            <button onClick={() => setEditingPostId(null)} className="bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-gray-200 dark:hover:bg-gray-700 transition">Cancel</button>
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{post.content}</p>
                      )}
                    </div>
                    {canMod && !isEd && (
                      <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                        <button onClick={() => { setEditingPostId(post.id); setEditContent(post.content); }}
                          className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition"><Pencil size={14} /></button>
                        <button onClick={() => setPostToDelete(post.id)}
                          className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition"><Trash2 size={14} /></button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* JOBS */}
        {activeTab === "jobs" && (
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-[2rem] overflow-hidden shadow-sm animate-in fade-in">
            {loadingJobs ? (
              <div className="p-6 space-y-3">
                {[1,2,3].map(i => <div key={i} className="h-16 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />)}
              </div>
            ) : pageJobs.length === 0 ? (
              <div className="py-16 flex flex-col items-center text-gray-400 dark:text-gray-500 px-4 text-center">
                <Briefcase size={40} className="mb-3 opacity-30" />
                <p className="text-sm font-bold">No open roles found.</p>
                <p className="text-xs mt-1 max-w-xs">Jobs posted with company name <span className="font-bold text-gray-500 dark:text-gray-400">&ldquo;{activePage.title}&rdquo;</span> will appear here.</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {pageJobs.map(job => (
                  <div key={job.id}
                    onClick={() => window.dispatchEvent(new CustomEvent("open-header-modal", { detail: "jobs" }))}
                    className="p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition cursor-pointer">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate">{job.title}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {job.location && <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1"><MapPin size={10} /> {job.location}</span>}
                          {job.type && <span className="text-[10px] font-bold uppercase tracking-wide bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded-full">{job.type}</span>}
                        </div>
                      </div>
                      <span className="text-[10px] text-gray-400 shrink-0">{new Date(job.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                    </div>
                    {job.description && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5 line-clamp-2">{job.description}</p>}
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

  // ─── BROWSE VIEW ──────────────────────────────────────────────────────────
  return (
    <div className="space-y-5 max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Company Pages</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Discover companies building the future.</p>
        </div>
        <button onClick={openCreate}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-semibold shadow-sm active:scale-95 transition-all">
          <Plus size={18} /> Create Page
        </button>
      </div>

      {needsSetup && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 rounded-2xl p-4">
          <div className="flex items-start gap-3">
            <Terminal size={18} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-amber-800 dark:text-amber-300 mb-1">Database column missing</p>
              <p className="text-xs text-amber-700 dark:text-amber-400 mb-2">Run this in your Supabase SQL editor, then try again:</p>
              <code className="block text-xs bg-amber-100 dark:bg-amber-900/40 text-amber-900 dark:text-amber-200 rounded-xl px-3 py-2 font-mono break-all">
                ALTER TABLE public.pages ADD COLUMN IF NOT EXISTS company_data JSONB DEFAULT &apos;{'{}'}&apos;;
              </code>
            </div>
            <button onClick={() => setNeedsSetup(false)} className="text-amber-500 hover:text-amber-700 dark:hover:text-amber-300 transition shrink-0"><X size={16} /></button>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" value={searchQ} onChange={e => setSearchQ(e.target.value)} placeholder="Search companies…"
            className="w-full pl-8 pr-4 py-2.5 text-sm bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-gray-900 dark:text-gray-100 transition" />
        </div>
        <button onClick={() => setMyPagesOnly(!myPagesOnly)}
          className={`px-4 py-2.5 rounded-xl text-sm font-bold transition-all border ${myPagesOnly ? "bg-indigo-600 text-white border-indigo-600" : "bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-indigo-400"}`}>
          My Pages
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {INDUSTRIES.map(ind => (
          <button key={ind} onClick={() => setActiveIndustry(ind)}
            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${activeIndustry === ind ? "bg-indigo-600 text-white" : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 hover:text-indigo-600 dark:hover:text-indigo-400"}`}>
            {ind}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1,2,3,4].map(i => (
            <div key={i} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden shadow-sm">
              <div className="h-16 bg-gray-100 dark:bg-gray-800 animate-pulse" />
              <div className="p-4 space-y-2">
                <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-2/3" />
                <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded animate-pulse w-1/3" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredPages.length === 0 ? (
        <div className="py-20 flex flex-col items-center border border-dashed border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 rounded-[2rem]">
          <Building2 size={48} className="text-gray-300 dark:text-gray-600 mb-4" />
          <p className="text-gray-500 dark:text-gray-400 font-bold">No company pages found.</p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Be the first to create one.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredPages.map(page => {
            const pcd = page.company_data || {};
            return (
              <div key={page.id} onClick={() => openPage(page)}
                className="group bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl hover:border-indigo-400/50 hover:shadow-md transition-all cursor-pointer overflow-hidden">
                <div className="h-16 bg-gradient-to-r from-indigo-500 via-purple-600 to-pink-500 relative">
                  {page.created_by === currentUserId && (
                    <button onClick={e => { e.stopPropagation(); setPageToDelete(page.id); }}
                      className="absolute top-2 right-2 p-1.5 bg-white/20 backdrop-blur-sm text-white hover:bg-red-500/80 rounded-lg transition opacity-0 group-hover:opacity-100" title="Delete">
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
                <div className="px-4 pb-4">
                  <div className="flex items-end justify-between -mt-6 mb-3">
                    <div className="w-12 h-12 rounded-xl border-2 border-white dark:border-gray-900 bg-white dark:bg-gray-800 shadow-sm overflow-hidden shrink-0 flex items-center justify-center text-lg font-black text-indigo-600 dark:text-indigo-400">
                      {page.image_url
                        ? <Image src={page.image_url} alt={page.title} width={48} height={48} className="object-cover w-full h-full" />
                        : page.title[0]}
                    </div>
                    {pcd.industry && (
                      <span className="text-[10px] font-bold text-indigo-500 dark:text-indigo-400 uppercase tracking-widest">{pcd.industry}</span>
                    )}
                  </div>
                  <h3 className="text-base font-bold text-gray-900 dark:text-gray-100 truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{page.title}</h3>
                  {pcd.tagline && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">{pcd.tagline}</p>}
                  {page.description && <p className="text-xs text-gray-600 dark:text-gray-300 mt-2 line-clamp-2">{page.description}</p>}
                  {(pcd.location || pcd.size) && (
                    <div className="flex items-center gap-3 mt-2.5 text-xs text-gray-400 dark:text-gray-500">
                      {pcd.location && <span className="flex items-center gap-1"><MapPin size={10} /> {pcd.location}</span>}
                      {pcd.size && <span className="flex items-center gap-1"><Users size={10} /> {pcd.size}</span>}
                    </div>
                  )}
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
