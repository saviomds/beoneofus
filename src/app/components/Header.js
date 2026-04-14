"use client";

import { useState, useEffect, useRef } from 'react';
import { Search, Compass, MessageCircle, X, Loader2 } from 'lucide-react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import { supabase } from '../supabaseClient';
import ProfileContent from '../dash/contect/ProfileContent';

// Dynamically import the modal to keep the Header bundle lightweight for the end user
const QuickViewModal = dynamic(() => import('./QuickViewModal'), { ssr: false });

export default function Header({ setActiveTab }) {
  const [showQuickView, setShowQuickView] = useState(null); // 'discuss' or 'discover'
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState({ posts: [], groups: [], users: [] });
  const [selectedUserId, setSelectedUserId] = useState(null);
  const searchRef = useRef(null);

  const closeQuickView = () => setShowQuickView(null);

  const handleNavigate = (tab) => {
    closeQuickView();
    if (setActiveTab) setActiveTab(tab);
  };

  // Handle click outside to close search dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setSearchQuery('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Real-time debounced search function
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults({ posts: [], groups: [], users: [] });
      return;
    }

    const delayDebounceFn = setTimeout(async () => {
      setIsSearching(true);
      try {
        const [postsRes, groupsRes, usersRes] = await Promise.all([
          supabase.from('posts').select('id, title, content').ilike('title', `%${searchQuery}%`).limit(3),
          supabase.from('groups').select('id, name, description').ilike('name', `%${searchQuery}%`).eq('is_private', false).limit(3),
          supabase.from('profiles').select('id, username, status, avatar_url').ilike('username', `%${searchQuery}%`).limit(3)
        ]);

        setSearchResults({
          posts: postsRes.data || [],
          groups: groupsRes.data || [],
          users: usersRes.data || []
        });
      } catch (error) {
        console.error("Search error:", error);
      } finally {
        setIsSearching(false);
      }
    }, 400); // Wait 400ms after user stops typing to query

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  return (
    <>
      <header className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-black/50 backdrop-blur-md sticky top-0 z-40">
        {/* Left: Search Bar */}
        <div className="relative flex-1 max-w-md" ref={searchRef}>
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Search size={16} className="text-gray-600" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="block w-full pl-10 pr-10 py-2.5 border border-white/5 rounded-2xl bg-[#0D0D0D] text-xs text-white placeholder-gray-700 focus:outline-none focus:border-blue-500/50 transition-all"
            placeholder="Search the BeOneOfUs ecosystem..."
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-500 hover:text-white transition-colors">
              <X size={14} />
            </button>
          )}

          {/* Search Dropdown Results */}
          {searchQuery.trim().length > 0 && (
            <div className="absolute top-full left-0 w-full mt-2 bg-[#0F0F0F] border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 z-50">
              {isSearching ? (
                <div className="p-4 flex justify-center"><Loader2 size={18} className="animate-spin text-blue-500" /></div>
              ) : (searchResults.posts.length === 0 && searchResults.groups.length === 0 && searchResults.users.length === 0) ? (
                <div className="p-4 text-center text-xs text-gray-500 font-medium">No nodes, discussions, or users found.</div>
              ) : (
                <div className="max-h-[60vh] overflow-y-auto custom-scrollbar">
                  {/* Posts Results */}
                  {searchResults.posts.length > 0 && (
                    <div className="p-2">
                      <div className="text-[9px] font-black uppercase text-gray-600 tracking-[2px] px-2 mb-1.5 mt-1">Discussions</div>
                      {searchResults.posts.map(post => (
                        <div key={`post-${post.id}`} onClick={() => { setSearchQuery(''); handleNavigate('feed'); }} className="p-2 hover:bg-white/5 rounded-xl cursor-pointer transition-all group">
                          <p className="text-sm font-bold text-white line-clamp-1 group-hover:text-blue-400 transition-colors">{post.title || 'Untitled Node'}</p>
                          <p className="text-[10px] text-gray-500 line-clamp-1 mt-0.5">{post.content}</p>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {/* Groups Results */}
                  {searchResults.groups.length > 0 && (
                    <div className={`p-2 ${searchResults.posts.length > 0 ? 'border-t border-white/5' : ''}`}>
                      <div className="text-[9px] font-black uppercase text-gray-600 tracking-[2px] px-2 mb-1.5 mt-1">Groups</div>
                      {searchResults.groups.map(group => (
                        <div key={`group-${group.id}`} onClick={() => { setSearchQuery(''); handleNavigate('groups'); }} className="p-2 hover:bg-white/5 rounded-xl cursor-pointer transition-all group">
                          <p className="text-sm font-bold text-white line-clamp-1 group-hover:text-blue-400 transition-colors">{group.name}</p>
                          <p className="text-[10px] text-gray-500 line-clamp-1 mt-0.5">{group.description}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Users Results */}
                  {searchResults.users.length > 0 && (
                    <div className={`p-2 ${(searchResults.posts.length > 0 || searchResults.groups.length > 0) ? 'border-t border-white/5' : ''}`}>
                      <div className="text-[9px] font-black uppercase text-gray-600 tracking-[2px] px-2 mb-1.5 mt-1">Users</div>
                      {searchResults.users.map(user => (
                        <div key={`user-${user.id}`} onClick={() => { setSearchQuery(''); setSelectedUserId(user.id); }} className="flex items-center gap-3 p-2 hover:bg-white/5 rounded-xl cursor-pointer transition-all group">
                          <div className="relative w-8 h-8 rounded-xl bg-black overflow-hidden shrink-0 border border-white/10 flex items-center justify-center text-xs font-bold text-white uppercase">
                            {user.avatar_url ? (
                              <Image src={user.avatar_url} alt="avatar" fill className="object-cover" />
                            ) : (
                              user.username?.substring(0, 2) || '??'
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-white line-clamp-1 group-hover:text-blue-400 transition-colors">@{user.username}</p>
                            <p className="text-[10px] text-gray-500 line-clamp-1 mt-0.5 uppercase tracking-widest font-black">{user.status || 'Active Node'}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right: Nav Links */}
        <nav className="flex items-center gap-6 ml-8">
          <button 
            onClick={() => setShowQuickView('discuss')}
            className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-gray-500 hover:text-white transition-all"
          >
            <MessageCircle size={16} />
            Discuss
          </button>
          <button 
            onClick={() => setShowQuickView('discover')}
            className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-gray-500 hover:text-blue-500 transition-all"
          >
            <Compass size={16} />
            Discover
          </button>
        </nav>
      </header>

      {/* --- QUICK VIEW POP-UP TOGGLE --- */}
      {showQuickView && (
        <QuickViewModal 
          type={showQuickView} 
          onClose={closeQuickView} 
          onNavigate={handleNavigate} 
        />
      )}

      {/* USER PROFILE MODAL */}
      {selectedUserId && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setSelectedUserId(null)} />
          <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto no-scrollbar z-10 bg-[#0A0A0A] rounded-[2rem] border border-white/10 shadow-2xl animate-in zoom-in-95 duration-200">
            <button 
              onClick={() => setSelectedUserId(null)} 
              className="absolute top-6 right-6 z-[250] p-2 bg-white/5 hover:bg-red-500/20 hover:text-red-500 rounded-full text-gray-400 transition-colors"
            >
              <X size={20} />
            </button>
            <div className="p-2 sm:p-6">
              <ProfileContent viewUserId={selectedUserId} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}