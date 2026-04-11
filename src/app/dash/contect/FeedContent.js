'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '../../supabaseClient';
import Image from 'next/image';
import { MessageSquare, Heart, Share2, MoreHorizontal, Code, Trash2, Edit3, X, Save, AlertTriangle } from 'lucide-react';

export default function FeedContent() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [activeMenu, setActiveMenu] = useState(null);

  // Edit State
  const [isEditing, setIsEditing] = useState(false);
  const [editingPost, setEditingPost] = useState(null);
  const [editLoading, setEditLoading] = useState(false);

  // Delete Confirmation State
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [postToDelete, setPostToDelete] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    const initFeed = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setCurrentUserId(session?.user?.id);
      await fetchPosts();
    };

    initFeed();

    const subscription = supabase
      .channel('public:posts')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, () => {
        fetchPosts();
      })
      .subscribe();

    return () => supabase.removeChannel(subscription);
  }, []);

  const fetchPosts = async () => {
    try {
      const { data, error } = await supabase
        .from('posts')
        .select(`
          *,
          profiles:user_id (
            username,
            status
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPosts(data || []);
    } catch (error) {
      console.error('Error fetching posts:', error.message);
    } finally {
      setLoading(false);
    }
  };

  // --- EDIT LOGIC ---
  const openEditModal = (post) => {
    setEditingPost({ ...post });
    setIsEditing(true);
    setActiveMenu(null);
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setEditLoading(true);
    try {
      const { error } = await supabase
        .from('posts')
        .update({
          title: editingPost.title,
          content: editingPost.content,
          code_snippet: editingPost.code_snippet
        })
        .eq('id', editingPost.id);

      if (error) throw error;
      setIsEditing(false);
      setEditingPost(null);
      fetchPosts();
    } catch (error) {
      alert(error.message);
    } finally {
      setEditLoading(false);
    }
  };

  // --- DELETE LOGIC ---
  const openDeleteModal = (post) => {
    setPostToDelete(post);
    setShowDeleteConfirm(true);
    setActiveMenu(null);
  };

  const confirmDelete = async () => {
    if (!postToDelete) return;
    setDeleteLoading(true);
    try {
      const { error } = await supabase
        .from('posts')
        .delete()
        .eq('id', postToDelete.id);

      if (error) throw error;
      setPosts(posts.filter(post => post.id !== postToDelete.id));
      setShowDeleteConfirm(false);
      setPostToDelete(null);
    } catch (error) {
      alert(error.message);
    } finally {
      setDeleteLoading(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center p-10 text-gray-500 animate-pulse">Loading your feed...</div>;
  }

  return (
    <div className="space-y-6">
      
      {/* --- CUSTOM DELETE CONFIRMATION MODAL --- */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
          <div className="bg-[#0D0D0D] border border-white/10 w-full max-w-sm rounded-2xl p-8 shadow-2xl text-center animate-in fade-in zoom-in duration-200">
            <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle size={32} />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Delete Post?</h3>
            <p className="text-gray-500 text-sm mb-8 leading-relaxed">
              This action cannot be undone. This will permanently remove your post from the beoneofus network.
            </p>
            <div className="flex flex-col gap-3">
              <button 
                onClick={confirmDelete}
                disabled={deleteLoading}
                className="w-full bg-red-600 hover:bg-red-500 text-white font-bold py-3 rounded-xl transition flex items-center justify-center gap-2"
              >
                {deleteLoading ? 'Deleting...' : 'Confirm Delete'}
              </button>
              <button 
                onClick={() => setShowDeleteConfirm(false)}
                className="w-full bg-white/5 hover:bg-white/10 text-white font-bold py-3 rounded-xl transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- EDIT MODAL OVERLAY --- */}
      {isEditing && editingPost && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="bg-[#0D0D0D] border border-white/10 w-full max-w-lg rounded-2xl p-6 shadow-2xl relative animate-in fade-in zoom-in duration-200">
            <button 
              onClick={() => setIsEditing(false)}
              className="absolute top-4 right-4 text-gray-500 hover:text-white transition"
            >
              <X size={20} />
            </button>
            
            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <Edit3 size={18} className="text-blue-500" /> Edit Post
            </h2>

            <form onSubmit={handleUpdate} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">Title</label>
                <input 
                  type="text"
                  value={editingPost.title || ''}
                  onChange={(e) => setEditingPost({...editingPost, title: e.target.value})}
                  className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white focus:ring-2 focus:ring-blue-500/50 outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">Content</label>
                <textarea 
                  rows="4"
                  value={editingPost.content || ''}
                  onChange={(e) => setEditingPost({...editingPost, content: e.target.value})}
                  className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white focus:ring-2 focus:ring-blue-500/50 outline-none resize-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">Code Snippet</label>
                <textarea 
                  rows="3"
                  value={editingPost.code_snippet || ''}
                  onChange={(e) => setEditingPost({...editingPost, code_snippet: e.target.value})}
                  className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-blue-300 font-mono text-sm focus:ring-2 focus:ring-blue-500/50 outline-none"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button 
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="flex-1 bg-white/5 hover:bg-white/10 text-white font-bold py-3 rounded-xl transition"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={editLoading}
                  className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl transition flex items-center justify-center gap-2"
                >
                  {editLoading ? 'Saving...' : <><Save size={18} /> Save Changes</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- FEED LIST --- */}
      {posts.length === 0 ? (
        <div className="h-64 border border-dashed border-white/10 rounded-2xl flex items-center justify-center text-gray-600">
          No posts yet. Be the first to share!
        </div>
      ) : (
        posts.map((post) => (
          <div key={post.id} className="bg-[#0D0D0D] border border-white/5 rounded-2xl p-6 shadow-xl relative">
            
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-blue-400 flex items-center justify-center text-xs font-bold text-white uppercase">
                  {post.profiles?.username?.substring(0, 2) || '??'}
                </div>
                <div>
                  <h4 className="text-white font-bold text-sm">{post.profiles?.username || 'Unknown User'}</h4>
                  <p className="text-[10px] text-blue-500 font-bold uppercase tracking-widest">
                    {post.profiles?.status || 'Pro Node'}
                  </p>
                </div>
              </div>

              {currentUserId === post.user_id && (
                <div className="relative">
                  <button 
                    onClick={() => setActiveMenu(activeMenu === post.id ? null : post.id)}
                    className="text-gray-600 hover:text-white transition p-1"
                  >
                    <MoreHorizontal size={20} />
                  </button>

                  {activeMenu === post.id && (
                    <div className="absolute right-0 mt-2 w-36 bg-[#1A1A1A] border border-white/10 rounded-xl shadow-2xl z-50 py-2">
                      <button 
                        className="w-full flex items-center gap-2 px-4 py-2 text-xs text-gray-300 hover:bg-white/5 transition"
                        onClick={() => openEditModal(post)}
                      >
                        <Edit3 size={14} /> Edit Post
                      </button>
                      <button 
                        className="w-full flex items-center gap-2 px-4 py-2 text-xs text-red-400 hover:bg-red-400/10 transition"
                        onClick={() => openDeleteModal(post)}
                      >
                        <Trash2 size={14} /> Delete
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-3">
              {post.title && <h3 className="text-xl font-bold text-white tracking-tight">{post.title}</h3>}
              <p className="text-gray-400 leading-relaxed whitespace-pre-wrap">{post.content}</p>
              
              {post.code_snippet && (
                <div className="bg-black/50 rounded-xl p-4 border border-white/5 font-mono text-sm text-blue-300 overflow-x-auto relative group">
                   <pre><code>{post.code_snippet}</code></pre>
                </div>
              )}

              {post.image_url && (
                <div className="relative w-full aspect-video rounded-xl overflow-hidden border border-white/10">
                  <Image src={post.image_url} alt="Post media" fill className="object-cover" />
                </div>
              )}
            </div>

            <div className="flex items-center gap-6 mt-6 pt-4 border-t border-white/5 text-gray-500">
              <button className="flex items-center gap-2 hover:text-red-500 transition-colors text-sm">
                <Heart size={18} /> <span>0</span>
              </button>
              <button className="flex items-center gap-2 hover:text-blue-500 transition-colors text-sm">
                <MessageSquare size={18} /> <span>0</span>
              </button>
              <button className="flex items-center gap-2 hover:text-green-500 transition-colors text-sm ml-auto">
                <Share2 size={18} />
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  );
}