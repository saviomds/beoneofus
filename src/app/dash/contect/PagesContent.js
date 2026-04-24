"use client";
import Image from "next/image";
import { useState, useEffect } from "react";
import { 
  FileText, Plus, X, Loader2, Globe, Send, ChevronRight, ChevronLeft, LayoutTemplate, Trash2, Pencil
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
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [postInput, setPostInput] = useState("");
  const [editingPostId, setEditingPostId] = useState(null);
  const [editContent, setEditContent] = useState("");
  
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
      setLoadingPosts(true);
      setPagePosts([]);
      const { data, error } = await supabase.from('page_posts').select('*, profiles(username, avatar_url)').eq('page_id', activePage.id).order('created_at', { ascending: false });
      if (!error && data) setPagePosts(data);
      setLoadingPosts(false);
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

  const handleDeletePost = async (postId) => {
    if (!confirm("Are you sure you want to delete this post?")) return;
    try {
      const { error } = await supabase.from('page_posts').delete().eq('id', postId);
      if (error) throw error;
      setPagePosts(prev => prev.filter(p => p.id !== postId));
    } catch (err) {
      alert(err.message);
    }
  };

  const handleUpdatePost = async (postId) => {
    if (!editContent.trim()) return;
    try {
      const { error } = await supabase.from('page_posts').update({ content: editContent }).eq('id', postId);
      if (error) throw error;
      
      setPagePosts(prev => prev.map(p => p.id === postId ? { ...p, content: editContent } : p));
      setEditingPostId(null);
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto relative animate-in fade-in slide-in-from-bottom-4 duration-700">
      {activePage ? (
        <div className="w-full flex flex-col h-[calc(100vh-180px)] bg-white rounded-[2rem] border border-gray-200 overflow-hidden relative animate-in fade-in zoom-in-95 duration-300 shadow-sm">
          {/* Header */}
          <div className="p-4 border-b border-gray-200 bg-gray-50 flex items-center gap-3 z-10 shrink-0">
            <button onClick={() => setActivePage(null)} className="p-2 bg-white border border-gray-200 hover:bg-gray-100 rounded-xl text-gray-500 hover:text-gray-900 transition">
              <ChevronLeft size={20} />
            </button>
            <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-200 text-purple-600 flex items-center justify-center font-bold uppercase shrink-0">
              <LayoutTemplate size={20} />
            </div>
            <div>
              <h2 className="text-gray-900 font-bold text-lg leading-tight">{activePage.title}</h2>
              <p className="text-[10px] font-black tracking-widest text-purple-500 uppercase">Public Page</p>
            </div>
          </div>

          {/* Feed */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar flex flex-col">
            {loadingPosts ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="bg-gray-50 border border-gray-200 rounded-2xl p-4 flex gap-3 shadow-sm">
                    <div className="w-10 h-10 rounded-xl bg-gray-200 animate-pulse shrink-0"></div>
                    <div className="flex-1 space-y-2 py-1">
                      <div className="h-4 bg-gray-200 rounded animate-pulse w-1/3"></div>
                      <div className="h-3 bg-gray-200 rounded animate-pulse w-3/4"></div>
                      <div className="h-3 bg-gray-200 rounded animate-pulse w-1/2"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : pagePosts.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center text-gray-500">
                <LayoutTemplate size={48} className="mb-4 opacity-30 text-purple-500" />
                <p className="font-bold text-sm uppercase tracking-widest mb-1">No Updates Yet</p>
                <p className="text-xs font-mono">Be the first to post on this page.</p>
              </div>
            ) : (
              pagePosts.map(post => {
                const canDelete = post.user_id === currentUserId || activePage?.created_by === currentUserId;
                const isEditing = editingPostId === post.id;
                return (
                <div key={post.id} className="bg-gray-50 border border-gray-200 rounded-2xl p-4 flex gap-3 animate-in fade-in slide-in-from-top-2 relative group">
                  <div className="relative w-10 h-10 rounded-xl bg-gray-200 text-gray-700 flex items-center justify-center font-bold text-xs uppercase shrink-0 overflow-hidden">
                    {post.profiles?.avatar_url ? (
                      <Image src={post.profiles.avatar_url} alt="avatar" fill sizes="40px" className="object-cover" />
                    ) : (
                      post.profiles?.username?.substring(0, 2) || "??"
                    )}
                  </div>
                  <div className="flex-1 min-w-0 pr-16">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-bold text-gray-900 truncate">@{post.profiles?.username}</span>
                      <span className="text-[9px] text-gray-500 uppercase tracking-widest shrink-0">
                        {new Date(post.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    {isEditing ? (
                      <div className="mt-2 animate-in fade-in">
                        <textarea
                          value={editContent}
                          onChange={(e) => setEditContent(e.target.value)}
                          className="w-full bg-white border border-gray-300 rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 mb-2 resize-none"
                          rows={3}
                        />
                        <div className="flex gap-2">
                          <button onClick={() => handleUpdatePost(post.id)} className="bg-purple-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-purple-700 transition">Save</button>
                          <button onClick={() => setEditingPostId(null)} className="bg-gray-200 text-gray-700 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-gray-300 transition">Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-700 leading-relaxed">{post.content}</p>
                    )}
                  </div>
                  {canDelete && !isEditing && (
                    <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                      <button 
                        onClick={() => { setEditingPostId(post.id); setEditContent(post.content); }}
                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                        title="Edit Post"
                      >
                        <Pencil size={16} />
                      </button>
                      <button 
                        onClick={() => handleDeletePost(post.id)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                        title="Delete Post"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  )}
                </div>
                );
              })
            )}
          </div>

          {/* Input */}
          <div className="p-3 bg-gray-50 border-t border-gray-200 z-10 shrink-0">
            <form onSubmit={handleCreatePost} className="flex items-center gap-2 bg-white border border-gray-300 rounded-2xl p-1.5 pl-4 focus-within:ring-2 focus-within:ring-purple-500/20 focus-within:border-purple-500 transition-all shadow-sm">
              <input 
                type="text" 
                value={postInput} 
                onChange={e => setPostInput(e.target.value)} 
                placeholder="Share an update on this page..." 
                className="flex-1 bg-transparent border-none focus:outline-none text-sm text-gray-900 py-2" 
              />
              <button type="submit" disabled={isProcessing} className="bg-purple-600 hover:bg-purple-700 text-white p-2.5 rounded-xl transition-all shadow-sm active:scale-95 disabled:opacity-50">
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
              <h1 className="text-3xl font-bold text-gray-900">Pages</h1>
              <p className="text-gray-600 text-sm mt-1">Discover and manage public spaces.</p>
            </div>
            <button 
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-5 py-2.5 rounded-xl transition-all font-semibold shadow-sm active:scale-95"
            >
              <Plus size={20} />
              Create Page
            </button>
          </div>

          {/* Pages List */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex flex-col gap-2 bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-gray-200 animate-pulse shrink-0"></div>
                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="h-5 bg-gray-200 rounded animate-pulse w-3/4"></div>
                      <div className="h-3 bg-gray-200 rounded animate-pulse w-1/3"></div>
                    </div>
                  </div>
                  <div className="mt-2 space-y-2">
                    <div className="h-4 bg-gray-200 rounded animate-pulse w-full"></div>
                    <div className="h-4 bg-gray-200 rounded animate-pulse w-4/5"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : pages.length === 0 ? (
            <div className="py-20 flex flex-col items-center justify-center border border-dashed border-gray-300 bg-gray-50 rounded-[2rem]">
              <FileText size={48} className="text-gray-400 mb-4" />
              <p className="text-gray-600 font-bold">No pages found.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {pages.map((page) => (
                <div 
                  key={page.id} 
                  onClick={() => setActivePage(page)}
                  className="group flex flex-col gap-2 bg-white border border-gray-200 rounded-2xl p-5 hover:border-purple-500/30 hover:shadow-md transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-purple-50 border border-purple-100 rounded-xl text-purple-600 group-hover:bg-purple-100 transition-colors">
                      <LayoutTemplate size={24} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-bold text-gray-900 truncate">{page.title}</h3>
                      <span className="text-[10px] uppercase font-bold tracking-widest text-gray-500 flex items-center gap-1 mt-0.5">
                        <Globe size={10} /> Public Space
                      </span>
                    </div>
                  </div>
                  <p className="text-gray-600 text-sm line-clamp-2 mt-2">{page.description}</p>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* CREATE PAGE MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-gray-900/50 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
          
          <div className="relative w-full max-w-md bg-white border border-gray-200 rounded-3xl shadow-xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900">Create New Page</h2>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-gray-200 rounded-full text-gray-500 transition-colors">
                <X size={20} />
              </button>
            </div>

            <form className="p-6 space-y-5" onSubmit={handleCreatePage}>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">Page Title</label>
                  <input type="text" required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Next.js Updates" className="w-full bg-white border border-gray-300 rounded-xl py-3 px-4 text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all" />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">Description</label>
                  <textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What is this page about?" className="w-full bg-white border border-gray-300 rounded-xl py-3 px-4 text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all resize-none" />
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3 px-4 rounded-xl text-gray-700 bg-gray-50 border border-gray-200 font-bold hover:bg-gray-100 transition-all">
                  Cancel
                </button>
                <button type="submit" disabled={isProcessing} className="flex-1 flex justify-center py-3 px-4 rounded-xl bg-purple-600 text-white font-bold hover:bg-purple-700 shadow-sm transition-all disabled:opacity-50">
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