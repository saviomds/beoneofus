'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '../../supabaseClient';
import Image from 'next/image';
import { 
  MessageSquare, Heart, Share2, MoreHorizontal, 
  Code, Trash2, Edit3, X, Save, AlertTriangle, Send, Copy, Check, Bookmark, GitBranch, Link as LinkIcon
} from 'lucide-react';
import ProfileContent from "./ProfileContent";
import VerifiedBadge from "../../components/VerifiedBadge";

export default function FeedContent() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [activeMenu, setActiveMenu] = useState(null);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [activeTab, setActiveTab] = useState('following');

  // Interaction States
  const [expandedComments, setExpandedComments] = useState({});
  const [newComments, setNewComments] = useState({});

  // Edit State
  const [isEditing, setIsEditing] = useState(false);
  const [editingPost, setEditingPost] = useState(null);
  const [editLoading, setEditLoading] = useState(false);

  // Delete State
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [postToDelete, setPostToDelete] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Share State
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareLink, setShareLink] = useState("");
  const [copied, setCopied] = useState(false);

  // Toast State
  const [toastMessage, setToastMessage] = useState("");

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 3000);
  };

  useEffect(() => {
    const initFeed = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setCurrentUserId(session?.user?.id);
      await fetchPosts();
    };

    initFeed();

    // Set up real-time listeners for everything
    const subscription = supabase.channel('feed-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, () => fetchPosts())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'likes' }, () => fetchPosts())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'comments' }, () => fetchPosts())
      .subscribe();

    return () => supabase.removeChannel(subscription);
  }, []);

  const fetchPosts = async () => {
    try {
      const { data, error } = await supabase
        .from('posts')
        .select(`
          *,
          profiles:user_id (username, status, avatar_url, github, website, is_verified),
          likes (user_id),
          comments (
            id, content, created_at, user_id,
            profiles:user_id (username, avatar_url, is_verified)
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPosts(data || []);
    } catch (error) {
      console.error('Error fetching:', error.message);
    } finally {
      setLoading(false);
    }
  };

  // --- SORTING LOGIC ---
  const displayedPosts = React.useMemo(() => {
    const sorted = [...posts];
    if (activeTab === 'following' || activeTab === 'latest') {
      return sorted.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    } else if (activeTab === 'featured') {
      return sorted.sort((a, b) => (b.likes?.length || 0) - (a.likes?.length || 0));
    } else if (activeTab === 'rising') {
      const now = new Date();
      return sorted.sort((a, b) => {
        const aScore = (a.likes?.length || 0) * 2 + (a.comments?.length || 0) * 3;
        const bScore = (b.likes?.length || 0) * 2 + (b.comments?.length || 0) * 3;
        const aAge = Math.max(1, (now - new Date(a.created_at)) / 3600000); 
        const bAge = Math.max(1, (now - new Date(b.created_at)) / 3600000);
        const aVelocity = aScore / Math.pow(aAge, 1.5);
        const bVelocity = bScore / Math.pow(bAge, 1.5);
        return bVelocity - aVelocity;
      });
    }
    return sorted;
  }, [posts, activeTab]);

  // --- SHARE LOGIC ---
  const handleShareClick = (postId) => {
    const baseUrl = window.location.origin;
    setShareLink(`${baseUrl}/posts/${postId}`);
    setShowShareModal(true);
    setCopied(false);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(shareLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // --- LIKES LOGIC ---
  const handleLike = async (postId, hasLiked) => {
    if (!currentUserId) return;
    try {
      if (hasLiked) {
        await supabase.from('likes').delete().eq('post_id', postId).eq('user_id', currentUserId);
      } else {
        await supabase.from('likes').insert({ post_id: postId, user_id: currentUserId });
      }
      fetchPosts();
    } catch (err) { console.error(err); }
  };

  // --- COMMENTS LOGIC ---
  const handleAddComment = async (postId) => {
    const commentText = newComments[postId];
    if (!commentText?.trim() || !currentUserId) return;
    try {
      const { error } = await supabase.from('comments').insert({
        post_id: postId,
        user_id: currentUserId,
        content: commentText
      });
      if (error) throw error;
      setNewComments({...newComments, [postId]: ""});
      fetchPosts();
      showToast("Comment added");
    } catch (err) { alert("Error adding comment: " + err.message); }
  };

  // --- BOOKMARK LOGIC ---
  const handleBookmark = async (post) => {
    if (!currentUserId) return;
    try {
      const postUrl = `${window.location.origin}/posts/${post.id}`;
      
      // 1. Check if already bookmarked (Toggle behavior)
      const { data: existing } = await supabase
        .from('bookmarks')
        .select('id')
        .eq('user_id', currentUserId)
        .eq('url', postUrl)
        .maybeSingle();

      if (existing) {
        await supabase.from('bookmarks').delete().eq('id', existing.id);
        showToast("Removed from Bookmarks");
        return;
      }

      // 2. If not bookmarked, save it
      const { error } = await supabase.from('bookmarks').insert({
        user_id: currentUserId,
        title: post.title || 'Untitled Snippet',
        preview: post.content || post.code_snippet || 'No preview available',
        category: post.code_snippet ? 'Code' : 'General',
        replies: post.comments?.length || 0,
        url: postUrl
      });
      if (error) throw error;
      showToast("Snippet saved to Bookmarks");
    } catch (err) { alert("Error saving bookmark: " + err.message); }
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
      fetchPosts();
      showToast("Post updated successfully");
    } catch (err) { alert("Error saving: " + err.message); }
    finally { setEditLoading(false); }
  };

  // --- DELETE LOGIC ---
  const openDeleteModal = (post) => {
    setPostToDelete(post);
    setShowDeleteConfirm(true);
    setActiveMenu(null);
  };

  const confirmDelete = async () => {
    setDeleteLoading(true);
    try {
      const { error } = await supabase.from('posts').delete().eq('id', postToDelete.id);
      if (error) throw error;
      
      setShowDeleteConfirm(false);
      fetchPosts();
      showToast("Post deleted successfully");
    } catch (err) { alert("Error deleting: " + err.message); }
    finally { setDeleteLoading(false); }
  };

  if (loading) return (
    <div className="space-y-6">
      {[1, 2, 3].map((i) => (
        <div key={i} className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
          <div className="flex justify-between items-start mb-4">
            <div className="flex items-center gap-3 w-full">
              <div className="w-10 h-10 rounded-xl bg-gray-200 animate-pulse shrink-0"></div>
              <div className="space-y-2 flex-1">
                <div className="h-3 bg-gray-200 rounded animate-pulse w-32"></div>
                <div className="h-2 bg-gray-200 rounded animate-pulse w-20"></div>
              </div>
            </div>
          </div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded animate-pulse w-full"></div>
            <div className="h-4 bg-gray-200 rounded animate-pulse w-5/6"></div>
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="space-y-6">
      
      {/* --- FEED TABS --- */}
      <div className="flex items-center gap-6 border-b border-gray-200 px-2 sm:px-4 mb-2">
        {['Following', 'Featured', 'Rising'].map((tab) => {
          const isActive = activeTab === tab.toLowerCase();
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab.toLowerCase())}
              className={`pb-3 text-sm font-bold transition-all relative ${
                isActive ? 'text-gray-900' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab}
              {isActive && (
                <div className="absolute bottom-0 left-0 w-full h-1 bg-blue-600 rounded-t-full shadow-md shadow-gray-900/60" />
              )}
            </button>
          );
        })}
      </div>
      
      {/* --- SHARE MODAL --- */}
      {showShareModal && (
        <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-[120] flex items-center justify-center p-4">
          <div className="bg-white border border-gray-200 w-full max-w-sm rounded-2xl p-6 shadow-xl animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-gray-900">Share Entry</h3>
              <button onClick={() => setShowShareModal(false)} className="text-gray-400 hover:text-gray-900"><X size={20}/></button>
            </div>
            <p className="text-xs text-gray-500 mb-4 uppercase font-black tracking-widest">Post Protocol Link</p>
            <div className="flex gap-2 items-center bg-gray-50 rounded-xl p-2 border border-gray-200 mb-6">
              <input 
                readOnly 
                value={shareLink} 
                className="flex-1 bg-transparent border-none text-xs text-blue-600 outline-none truncate px-2"
              />
              <button 
                onClick={copyToClipboard}
                className="bg-blue-600 hover:bg-blue-500 text-white p-2 rounded-lg transition-all"
              >
                {copied ? <Check size={16}/> : <Copy size={16}/>}
              </button>
            </div>
            <button 
              onClick={() => setShowShareModal(false)}
              className="w-full bg-gray-50 hover:bg-gray-100 text-gray-700 font-bold py-3 rounded-xl transition border border-gray-200"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* --- CUSTOM DELETE CONFIRMATION MODAL --- */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
          <div className="bg-white border border-gray-200 w-full max-w-sm rounded-2xl p-8 shadow-xl text-center animate-in fade-in zoom-in duration-200">
            <div className="w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-100">
              <AlertTriangle size={32} />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Delete Post?</h3>
            <p className="text-gray-500 text-sm mb-8 leading-relaxed">
              This action cannot be undone. This will permanently remove your post from the beoneofus network.
            </p>
            <div className="flex flex-col gap-3">
              <button onClick={confirmDelete} disabled={deleteLoading} className="w-full bg-red-600 hover:bg-red-500 text-white font-bold py-3 rounded-xl transition flex items-center justify-center gap-2">
                {deleteLoading ? 'Deleting...' : 'Confirm Delete'}
              </button>
              <button onClick={() => setShowDeleteConfirm(false)} className="w-full bg-gray-50 hover:bg-gray-100 text-gray-700 font-bold py-3 rounded-xl transition border border-gray-200">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* --- EDIT MODAL OVERLAY --- */}
      {isEditing && editingPost && (
        <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="bg-white border border-gray-200 w-full max-w-lg rounded-2xl p-6 shadow-xl relative animate-in fade-in zoom-in duration-200">
            <button onClick={() => setIsEditing(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-900 transition"><X size={20} /></button>
            <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2"><Edit3 size={18} className="text-blue-600" /> Edit Post</h2>
            <form onSubmit={handleUpdate} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">Title</label>
                <input type="text" value={editingPost.title || ''} onChange={(e) => setEditingPost({...editingPost, title: e.target.value})} className="w-full bg-white border border-gray-300 rounded-xl p-3 text-gray-900 focus:ring-2 focus:ring-blue-500/50 outline-none" />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">Content</label>
                <textarea rows="4" value={editingPost.content || ''} onChange={(e) => setEditingPost({...editingPost, content: e.target.value})} className="w-full bg-white border border-gray-300 rounded-xl p-3 text-gray-900 focus:ring-2 focus:ring-blue-500/50 outline-none resize-none" />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">Code Snippet</label>
                <textarea rows="3" value={editingPost.code_snippet || ''} onChange={(e) => setEditingPost({...editingPost, code_snippet: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-blue-600 font-mono text-sm focus:ring-2 focus:ring-blue-500/50 outline-none" />
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setIsEditing(false)} className="flex-1 bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200 font-bold py-3 rounded-xl transition">Cancel</button>
                <button type="submit" disabled={editLoading} className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl transition flex items-center justify-center gap-2">
                  {editLoading ? 'Saving...' : <><Save size={18} /> Save Changes</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- FEED LIST --- */}
      {displayedPosts.length === 0 ? (
        <div className="h-64 border border-dashed border-gray-300 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-500">No posts yet. Be the first to share!</div>
      ) : (
        displayedPosts.map((post) => {
          const hasLiked = post.likes?.some(l => l.user_id === currentUserId);
          return (
            <div key={post.id} className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm relative">
              
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div 
                    className="relative w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-700 uppercase cursor-pointer hover:opacity-80 hover:shadow-lg transition-all overflow-hidden shrink-0 border border-gray-200"
                    onClick={() => setSelectedUserId(post.user_id)}
                    title={`View @${post.profiles?.username}'s Profile`}
                  >
                    {post.profiles?.avatar_url ? (
                      <Image src={post.profiles.avatar_url} alt="avatar" fill sizes="40px" className="object-cover" />
                    ) : (
                      post.profiles?.username?.substring(0, 2) || '??'
                    )}
                  </div>
                  <div className="cursor-pointer group" onClick={() => setSelectedUserId(post.user_id)}>
                    <div className="flex items-center gap-2">
                      <h4 className="text-gray-900 font-bold text-sm group-hover:text-blue-600 transition-colors">{post.profiles?.username || 'Unknown User'}</h4>
                      {post.profiles?.is_verified && <VerifiedBadge size={16} />}
                      {post.profiles?.github && (
                        <a href={`https://github.com/${post.profiles.github}`} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="text-gray-400 hover:text-gray-900 transition-colors" title="GitHub Profile">
                          <GitBranch size={14} />
                        </a>
                      )}
                      {post.profiles?.website && (
                        <a href={post.profiles.website.startsWith('http') ? post.profiles.website : `https://${post.profiles.website}`} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="text-gray-400 hover:text-gray-900 transition-colors" title="Personal Website">
                          <LinkIcon size={14} />
                        </a>
                      )}
                    </div>
                    <p className="text-[10px] text-blue-600 font-bold uppercase tracking-widest">{post.profiles?.status || 'Active Node'}</p>
                  </div>
                </div>

                {currentUserId === post.user_id && (
                  <div className="relative">
                    <button onClick={() => setActiveMenu(activeMenu === post.id ? null : post.id)} className="text-gray-400 hover:text-gray-900 transition p-1"><MoreHorizontal size={20} /></button>
                    {activeMenu === post.id && (
                      <div className="absolute right-0 mt-2 w-36 bg-white border border-gray-200 rounded-xl shadow-xl z-50 py-2">
                        <button className="w-full flex items-center gap-2 px-4 py-2 text-xs text-gray-700 hover:bg-gray-50 transition" onClick={() => openEditModal(post)}><Edit3 size={14} /> Edit Post</button>
                        <button className="w-full flex items-center gap-2 px-4 py-2 text-xs text-red-600 hover:bg-red-50 transition" onClick={() => openDeleteModal(post)}><Trash2 size={14} /> Delete</button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="space-y-3">
                {post.title && <h3 className="text-xl font-bold text-gray-900 tracking-tight">{post.title}</h3>}
                <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{post.content}</p>
                {post.code_snippet && (
                  <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 font-mono text-sm text-blue-600 overflow-x-auto relative">
                    <pre><code>{post.code_snippet}</code></pre>
                  </div>
                )}
                {post.image_url && (
                  <div className="relative w-full aspect-video rounded-xl overflow-hidden border border-gray-200">
                    <Image src={post.image_url} alt="Post media" fill sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw" className="object-cover" />
                  </div>
                )}
              </div>

              {/* Interaction Bar */}
              <div className="flex items-center gap-6 mt-6 pt-4 border-t border-gray-100 text-gray-500">
                <button onClick={() => handleLike(post.id, hasLiked)} className={`flex items-center gap-2 transition-colors text-sm ${hasLiked ? 'text-red-500' : 'hover:text-red-500'}`}>
                  <Heart size={18} fill={hasLiked ? "currentColor" : "none"} />
                  <span>{post.likes?.length || 0}</span>
                </button>
                <button onClick={() => setExpandedComments({...expandedComments, [post.id]: !expandedComments[post.id]})} className="flex items-center gap-2 hover:text-blue-600 transition-colors text-sm">
                  <MessageSquare size={18} />
                  <span>{post.comments?.length || 0}</span>
                </button>
            
            <div className="flex items-center gap-4 ml-auto">
              <button onClick={() => handleBookmark(post)} className="flex items-center gap-2 hover:text-amber-500 transition-colors text-sm" title="Save to Bookmarks">
                <Bookmark size={18} />
              </button>
              <button onClick={() => handleShareClick(post.id)} className="flex items-center gap-2 hover:text-green-500 transition-colors text-sm" title="Share Post">
                <Share2 size={18} />
              </button>
            </div>
              </div>

              {/* Comments Section */}
              {expandedComments[post.id] && (
                <div className="mt-4 pt-4 border-t border-gray-100 space-y-4 animate-in slide-in-from-top-2 duration-200">
                  <div className="space-y-3 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                    {post.comments?.map((comment) => (
                      <div key={comment.id} className="bg-gray-50 p-3 rounded-xl border border-gray-200">
                        <div className="flex items-center gap-1 mb-1">
                          <p className="text-[10px] font-bold text-blue-600">@{comment.profiles?.username}</p>
                          {comment.profiles?.is_verified && <VerifiedBadge size={12} />}
                        </div>
                        <p className="text-xs text-gray-700">{comment.content}</p>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2 items-center bg-gray-50 rounded-xl px-3 py-1 border border-gray-200">
            <input type="text" placeholder="Write a comment..." value={newComments[post.id] || ""} onChange={(e) => setNewComments({...newComments, [post.id]: e.target.value})} className="flex-1 bg-transparent border-none py-2 text-sm text-gray-900 focus:ring-0 outline-none" onKeyDown={(e) => e.key === 'Enter' && handleAddComment(post.id)} />
                    <button onClick={() => handleAddComment(post.id)} className="text-blue-600 hover:text-blue-700 p-1"><Send size={16} /></button>
                  </div>
                </div>
              )}
            </div>
          );
        })
      )}

      {/* USER PROFILE MODAL */}
      {selectedUserId && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-gray-900/50 backdrop-blur-sm" onClick={() => setSelectedUserId(null)} />
          <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto no-scrollbar z-10 bg-white rounded-[2rem] border border-gray-200 shadow-xl">
            <button 
              onClick={() => setSelectedUserId(null)} 
              className="absolute top-6 right-6 z-[250] p-2 bg-gray-100 hover:bg-red-50 hover:text-red-600 rounded-full text-gray-500 transition-colors"
            >
              <X size={20} />
            </button>
            <div className="p-2 sm:p-6">
              <ProfileContent viewUserId={selectedUserId} />
            </div>
          </div>
        </div>
      )}

      {/* Custom Toast Popup */}
      {toastMessage && (
        <div className="fixed bottom-10 right-10 z-[150] flex items-center gap-3 bg-white border border-green-200 text-green-600 px-5 py-3 rounded-2xl shadow-xl animate-in fade-in slide-in-from-bottom-8 duration-300">
          <Check size={18} className="text-green-500" />
          <span className="text-sm font-bold tracking-tight">{toastMessage}</span>
        </div>
      )}
    </div>
  );
}