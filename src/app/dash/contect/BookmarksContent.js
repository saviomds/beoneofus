"use client";

import { useState, useEffect } from "react";
import { 
  Search, Bookmark, ExternalLink, Trash2, Tag, MessageSquare, Clock, Loader2, Send, Check
} from "lucide-react";
import { supabase } from "../../supabaseClient";
import Link from "next/link";

// Lightweight helper to replace date-fns
function formatDistanceToNow(date) {
  const seconds = Math.floor((new Date() - date) / 1000);
  const intervals = [
    { label: 'year', seconds: 31536000 },
    { label: 'month', seconds: 2592000 },
    { label: 'day', seconds: 86400 },
    { label: 'hour', seconds: 3600 },
    { label: 'minute', seconds: 60 }
  ];
  for (let i = 0; i < intervals.length; i++) {
    const count = Math.floor(seconds / intervals[i].seconds);
    if (count >= 1) return `${count} ${intervals[i].label}${count !== 1 ? 's' : ''}`;
  }
  return 'a few seconds';
}

export default function BookmarksContent() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [toastMessage, setToastMessage] = useState("");

  // Comments and User states
  const [currentUserId, setCurrentUserId] = useState(null);
  const [expandedComments, setExpandedComments] = useState({});
  const [newComments, setNewComments] = useState({});
  const [commentsData, setCommentsData] = useState({});

  const fetchComments = async (postId, bookmarkId) => {
    const { data, error } = await supabase
      .from('comments')
      .select('id, content, created_at, user_id, profiles:user_id (username)')
      .eq('post_id', postId)
      .order('created_at', { ascending: true });
    if (!error) setCommentsData(prev => ({ ...prev, [bookmarkId]: data }));
  };

  // 1. Fetch Bookmarks and Set up Realtime
  useEffect(() => {
    const initBookmarks = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setCurrentUserId(session?.user?.id);

      const { data, error } = await supabase
        .from('bookmarks')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error) setItems(data);
      setLoading(false);
    };

    initBookmarks();

    // Listen for real-time changes (Inserts or Deletes)
    const channel = supabase
      .channel('realtime_bookmarks')
      .on('postgres_changes', { event: '*', table: 'bookmarks', schema: 'public' }, 
      (payload) => {
        if (payload.eventType === 'INSERT') {
          setItems((prev) => [payload.new, ...prev]);
        } else if (payload.eventType === 'DELETE') {
          setItems((prev) => prev.filter(item => item.id !== payload.old.id));
        }
      })
      .on('postgres_changes', { event: '*', table: 'comments', schema: 'public' }, 
      () => {
        // Signal a refetch for any expanded comment sections
        setExpandedComments((prevExpanded) => {
          Object.keys(prevExpanded).forEach(bookmarkId => {
            if (prevExpanded[bookmarkId]) {
              window.dispatchEvent(new CustomEvent('refetch_bookmark_comments', { detail: bookmarkId }));
            }
          });
          return prevExpanded;
        });
      })
      .subscribe();

    const handleRefetch = (e) => {
      const bId = e.detail;
      setItems(currItems => {
         const bookmark = currItems.find(i => i.id === bId);
         const pId = bookmark?.url?.split('/').pop();
         if (pId) fetchComments(pId, bId);
         return currItems;
      });
    };
    window.addEventListener('refetch_bookmark_comments', handleRefetch);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener('refetch_bookmark_comments', handleRefetch);
    };
  }, []);

  // --- COMMENTS LOGIC FOR BOOKMARKS ---
  const toggleComments = (item) => {
    const postId = item.url?.split('/').pop();
    if (!postId) return;

    if (expandedComments[item.id]) {
      setExpandedComments(prev => ({ ...prev, [item.id]: false }));
    } else {
      setExpandedComments(prev => ({ ...prev, [item.id]: true }));
      fetchComments(postId, item.id);
    }
  };

  const handleAddComment = async (item) => {
    const commentText = newComments[item.id];
    const postId = item.url?.split('/').pop();
    
    if (!commentText?.trim() || !currentUserId || !postId) return;

    try {
      const { error } = await supabase.from('comments').insert({
        post_id: postId,
        user_id: currentUserId,
        content: commentText
      });
      if (error) throw error;
      
      setNewComments(prev => ({...prev, [item.id]: ""}));
    } catch (err) {
      alert("Error adding comment: " + err.message);
    }
  };

  // 2. Remove Bookmark Handler (Supabase Delete)
  const handleRemoveBookmark = async (id) => {
    // Optimistically remove the item for an instant UI refresh
    setItems((prevItems) => prevItems.filter(item => item.id !== id));

    const { error } = await supabase
      .from('bookmarks')
      .delete()
      .eq('id', id);

    if (error) {
      console.error("Error deleting:", error.message);
      setToastMessage("Failed to delete bookmark");
    } else {
      setToastMessage("Bookmark removed successfully");
    }
    
    // Auto-hide the popup after 3 seconds
    setTimeout(() => setToastMessage(""), 3000);
  };

  const filteredItems = items.filter(item => 
    item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.category?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="w-full flex flex-col min-h-screen bg-transparent animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tighter">Bookmarks</h1>
          <p className="text-gray-500 text-sm mt-1 font-medium">Your saved snippets and discussions.</p>
        </div>
        
        <div className="relative w-full md:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" size={16} />
          <input 
            type="text" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search bookmarks..." 
            className="w-full bg-white border border-gray-300 rounded-xl py-2.5 pl-10 pr-4 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="animate-spin text-blue-500 mb-2" />
          <p className="text-gray-500 text-xs">Syncing with database...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 no-scrollbar">
          {filteredItems.map((item) => (
            <div 
              key={item.id} 
              className="group relative bg-white border border-gray-200 rounded-[1.5rem] p-5 hover:border-blue-500/30 hover:shadow-md transition-all cursor-pointer overflow-hidden shadow-sm"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

              <div className="relative flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-blue-500 bg-blue-500/10 px-2 py-0.5 rounded-md">
                      <Tag size={10} />
                      {item.category || "General"}
                    </span>
                    <span className="flex items-center gap-1 text-[10px] text-gray-600 font-bold">
                      <Clock size={10} />
                      {formatDistanceToNow(new Date(item.created_at))} ago
                    </span>
                  </div>
                  
                  <h3 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors truncate">
                    {item.title}
                  </h3>
                  <p className="text-sm text-gray-500 line-clamp-2 leading-relaxed mb-4">
                    {item.preview}
                  </p>

                  <div className="flex items-center gap-4 pt-4 border-t border-gray-100">
                <button 
                  onClick={() => toggleComments(item)}
                  className="flex items-center gap-1.5 text-xs text-gray-500 font-bold hover:text-blue-600 transition-colors"
                >
                      <MessageSquare size={14} />
                  {commentsData[item.id] ? commentsData[item.id].length : (item.replies || 0)} Comments
                </button>
                <Link 
                      href={item.url || "#"} 
                      target="_blank" 
                      className="flex items-center gap-1.5 text-xs text-gray-500 font-bold hover:text-gray-900 transition-colors"
                    >
                      <ExternalLink size={14} />
                      View Original
                </Link>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <button 
                    onClick={() => handleRemoveBookmark(item.id)}
                    className="p-2.5 bg-gray-50 hover:bg-red-50 text-gray-500 hover:text-red-600 rounded-xl border border-gray-200 transition-all"
                  >
                    <Trash2 size={18} />
                  </button>
          <button 
            onClick={() => handleRemoveBookmark(item.id)}
            className="p-2.5 bg-gray-50 hover:bg-blue-50 text-gray-500 hover:text-blue-600 rounded-xl border border-gray-200 transition-all"
          >
            <Bookmark size={18} fill="currentColor" className="text-blue-500" />
          </button>
                </div>
              </div>
            </div>
          ))}

          {filteredItems.length === 0 && (
            <div className="py-20 flex flex-col items-center justify-center border border-dashed border-gray-300 rounded-[2rem] bg-gray-50">
              <Bookmark size={48} className="text-gray-300 mb-4" />
              <p className="text-gray-500 font-bold">
                {searchQuery ? "No matches found" : "No saved bookmarks yet"}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Custom Toast Popup */}
      {toastMessage && (
        <div className="fixed bottom-10 right-10 z-[100] flex items-center gap-3 bg-white border border-green-200 text-green-600 px-5 py-3 rounded-2xl shadow-xl animate-in fade-in slide-in-from-bottom-8 duration-300">
          <Check size={18} className="text-green-500" />
          <span className="text-sm font-bold tracking-tight">{toastMessage}</span>
        </div>
      )}
    </div>
  );
}