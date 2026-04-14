"use client";
import Image from "next/image";
import { useState, useEffect } from "react";
import { 
  FileText, Plus, X, Loader2, Globe, Send, ChevronRight, ChevronLeft, LayoutTemplate
} from "lucide-react";
import { supabase } from "../../supabaseClient";

export default function PagesContent() {
  const [pages, setPages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState(null);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  
  const [activePage, setActivePage] = useState(null);
  const [pagePosts, setPagePosts] = useState([]);
  const [postInput, setPostInput] = useState("");
  
  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) setCurrentUserId(session.user.id);
      await fetchPages();
    };
    init();

    // Listen globally for any newly created Pages
    const channel = supabase.channel('public-pages-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pages' }, () => {
        fetchPages();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const fetchPages = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('pages').select('*').order('created_at', { ascending: false });
      if (!error && data) setPages(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!activePage) return;
    
    const fetchPosts = async () => {
      const { data, error } = await supabase.from('page_posts').select('*, profiles(username, avatar_url)').eq('page_id', activePage.id).order('created_at', { ascending: false });
      if (!error && data) setPagePosts(data);
    };
    fetchPosts();

    // Listen for real-time posts specifically on the active Page
    const channel = supabase.channel(`page-${activePage.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'page_posts', filter: `page_id=eq.${activePage.id}` }, (payload) => {
        const fetchNewPost = async () => {
           const { data } = await supabase.from('page_posts').select('*, profiles(username, avatar_url)').eq('id', payload.new.id).single();
           if (data) {
             setPagePosts(prev => [data, ...prev]);
           }
        };
        fetchNewPost();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [activePage]);

  const handleCreatePage = async (e) => {
    e.preventDefault();
    if (!title.trim() || !currentUserId) return;
    setIsProcessing(true);
    try {
      const { error } = await supabase.from('pages').insert({ title, description, created_by: currentUserId });
      if (error) throw error;
      setIsModalOpen(false);
      setTitle("");
      setDescription("");
    } catch (err) {
      alert(err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCreatePost = async (e) => {
    e.preventDefault();
    if (!postInput.trim() || !activePage || !currentUserId) return;
    setIsProcessing(true);
    try {
      const { error } = await supabase.from('page_posts').insert({
        page_id: activePage.id,
        user_id: currentUserId,
        content: postInput
      });
      if (error) throw error;
      setPostInput("");
    } catch (err) {
      alert(err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto relative animate-in fade-in slide-in-from-bottom-4 duration-700">
      {activePage ? (
        <div className="w-full flex flex-col h-[calc(100vh-180px)] bg-[#0A0A0A] rounded-[2rem] border border-white/5 overflow-hidden relative animate-in fade-in zoom-in-95 duration-300">
          {/* Header */}
          <div className="p-4 border-b border-white/5 bg-[#0F0F0F] flex items-center gap-3 z-10 shrink-0">
            <button onClick={() => setActivePage(null)} className="p-2 bg-white/5 hover:bg-white/10 rounded-xl text-gray-400 hover:text-white transition">
              <ChevronLeft size={20} />
            </button>
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center font-bold uppercase shrink-0">
              <LayoutTemplate size={20} />
            </div>
            <div>
              <h2 className="text-white font-bold text-lg leading-tight">{activePage.title}</h2>
              <p className="text-[10px] font-black tracking-widest text-purple-500 uppercase">Public Page</p>
            </div>
          </div>

          {/* Feed */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar flex flex-col">
            {pagePosts.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center text-gray-500">
                <LayoutTemplate size={48} className="mb-4 opacity-20" />
                <p className="font-bold text-sm uppercase tracking-widest mb-1">No Updates Yet</p>
                <p className="text-xs font-mono">Be the first to post on this page.</p>
              </div>
            ) : (
              pagePosts.map(post => (
                <div key={post.id} className="bg-[#111111] border border-white/5 rounded-2xl p-4 flex gap-3 animate-in fade-in slide-in-from-top-2">
                  <div className="relative w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center font-bold text-xs uppercase shrink-0 overflow-hidden">
                    {post.profiles?.avatar_url ? (
                      <Image src={post.profiles.avatar_url} alt="avatar" fill className="object-cover" />
                    ) : (
                      post.profiles?.username?.substring(0, 2) || "??"
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-bold text-white truncate">@{post.profiles?.username}</span>
                      <span className="text-[9px] text-gray-500 uppercase tracking-widest shrink-0">
                        {new Date(post.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-sm text-gray-300 leading-relaxed">{post.content}</p>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Input */}
          <div className="p-3 bg-[#0F0F0F] border-t border-white/5 z-10 shrink-0">
            <form onSubmit={handleCreatePost} className="flex items-center gap-2 bg-black border border-white/10 rounded-2xl p-1.5 pl-4 focus-within:border-purple-500/30 transition-all">
              <input 
                type="text" 
                value={postInput} 
                onChange={e => setPostInput(e.target.value)} 
                placeholder="Share an update on this page..." 
                className="flex-1 bg-transparent border-none focus:outline-none text-sm text-white py-2" 
              />
              <button type="submit" disabled={isProcessing} className="bg-purple-600 hover:bg-purple-500 text-white p-2.5 rounded-xl transition-all shadow-lg shadow-purple-600/20 active:scale-95 disabled:opacity-50">
                {isProcessing ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} strokeWidth={3} />}
              </button>
            </form>
          </div>
        </div>
      ) : (
        <>
          {/* Header Section */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white">Pages</h1>
              <p className="text-gray-400 text-sm mt-1">Discover and manage public spaces.</p>
            </div>
            <button 
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-5 py-2.5 rounded-xl transition-all font-semibold shadow-lg shadow-purple-500/20 active:scale-95"
            >
              <Plus size={20} />
              Create Page
            </button>
          </div>

          {/* Pages List */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="animate-spin text-purple-500 mb-2" size={32} />
              <p className="text-gray-500 font-mono uppercase text-xs tracking-widest">Loading Pages...</p>
            </div>
          ) : pages.length === 0 ? (
            <div className="py-20 flex flex-col items-center justify-center border border-dashed border-white/10 rounded-[2rem]">
              <FileText size={48} className="text-gray-800 mb-4" />
              <p className="text-gray-600 font-bold">No pages found.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {pages.map((page) => (
                <div 
                  key={page.id} 
                  onClick={() => setActivePage(page)}
                  className="group flex flex-col gap-2 bg-[#0A0A0A] border border-white/5 rounded-2xl p-5 hover:border-purple-500/30 hover:bg-white/[0.02] transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-purple-500/10 rounded-xl text-purple-400 group-hover:bg-purple-500/20 transition-colors">
                      <LayoutTemplate size={24} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-bold text-white truncate">{page.title}</h3>
                      <span className="text-[10px] uppercase font-bold tracking-widest text-gray-500 flex items-center gap-1 mt-0.5">
                        <Globe size={10} /> Public Space
                      </span>
                    </div>
                  </div>
                  <p className="text-gray-400 text-sm line-clamp-2 mt-2">{page.description}</p>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* CREATE PAGE MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
          
          <div className="relative w-full max-w-md bg-[#0F0F0F] border border-white/10 rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-white/5 flex justify-between items-center">
              <h2 className="text-xl font-bold text-white">Create New Page</h2>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-white/5 rounded-full text-gray-400 transition-colors">
                <X size={20} />
              </button>
            </div>

            <form className="p-6 space-y-5" onSubmit={handleCreatePage}>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Page Title</label>
                  <input type="text" required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Next.js Updates" className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white focus:outline-none focus:ring-2 focus:ring-purple-500/40 transition-all" />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Description</label>
                  <textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What is this page about?" className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white focus:outline-none focus:ring-2 focus:ring-purple-500/40 transition-all resize-none" />
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3 px-4 rounded-xl text-gray-400 font-medium hover:bg-white/5 transition-all">
                  Cancel
                </button>
                <button type="submit" disabled={isProcessing} className="flex-1 flex justify-center py-3 px-4 rounded-xl bg-purple-600 text-white font-bold hover:bg-purple-700 shadow-lg shadow-purple-500/20 transition-all disabled:opacity-50">
                  {isProcessing ? <Loader2 size={20} className="animate-spin" /> : "Create Page"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}