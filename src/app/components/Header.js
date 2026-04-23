"use client";

import { useState, useEffect, useRef } from 'react';
import { Search, Compass, MessageCircle, X, Loader2, Users, Hash } from 'lucide-react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import { supabase } from '../supabaseClient';
import ProfileContent from '../dash/contect/ProfileContent';
import { useDashboard } from '../dash/contect/DashboardContext';

// Dynamically import the modal to keep the Header bundle lightweight for the end user
const QuickViewModal = dynamic(() => import('./QuickViewModal'), { ssr: false });

export default function Header({ setActiveTab }) {
  const { setActiveSection, setTargetChatUser } = useDashboard();
  const [showQuickView, setShowQuickView] = useState(null); // 'discuss' or 'discover'
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState({ posts: [], groups: [], users: [] });
  const [selectedUserId, setSelectedUserId] = useState(null);
  const searchRef = useRef(null);
  const [showNetworkModal, setShowNetworkModal] = useState(false);
  const [networkData, setNetworkData] = useState({ connections: [], groups: [] });
  const [isNetworkLoading, setIsNetworkLoading] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [networkTab, setNetworkTab] = useState('connections'); // 'connections' or 'groups'

  const closeQuickView = () => setShowQuickView(null);

  const handleNavigate = (tab) => {
    closeQuickView();
    setShowNetworkModal(false);
    if (setActiveSection) {
      setActiveSection(tab);
    } else if (setActiveTab) { // Fallback for the prop
      setActiveTab(tab);
    }
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

  // Get current user ID
  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setCurrentUserId(session.user.id);
      }
    };
    getSession();
  }, []);

  // Fetch network data when modal opens
  useEffect(() => {
    if (showNetworkModal && currentUserId) {
      const fetchNetworkData = async () => {
        setIsNetworkLoading(true);
        try {
          // Fetch Connections
          const { data: connectionsData } = await supabase.from('connections').select('sender_id, receiver_id').or(`sender_id.eq.${currentUserId},receiver_id.eq.${currentUserId}`).eq('status', 'accepted');
          const connectedIds = connectionsData ? connectionsData.map(c => c.sender_id === currentUserId ? c.receiver_id : c.sender_id) : [];
          const { data: profiles } = connectedIds.length > 0 ? await supabase.from('profiles').select('id, username, status, avatar_url').in('id', connectedIds) : { data: [] };

          // Fetch Groups
          const { data: groupMemberships } = await supabase.from('group_members').select('group_id').eq('user_id', currentUserId);
          const groupIds = groupMemberships ? groupMemberships.map(gm => gm.group_id) : [];
          const { data: groups } = groupIds.length > 0 ? await supabase.from('groups').select('id, name, description, is_private').in('id', groupIds) : { data: [] };

          setNetworkData({
            connections: profiles || [],
            groups: groups || []
          });

        } catch (error) {
          console.error("Error fetching network data:", error);
        } finally {
          setIsNetworkLoading(false);
        }
      };
      fetchNetworkData();
    }
  }, [showNetworkModal, currentUserId]);


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
      <header className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-white/80 backdrop-blur-md sticky top-0 z-40">
        {/* Left: Search Bar */}
        <div className="relative flex-1 max-w-md" ref={searchRef}>
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Search size={16} className="text-gray-400" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="block w-full pl-10 pr-10 py-2.5 border border-gray-300 rounded-2xl bg-white text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            placeholder="Search the BeOneOfUs ecosystem..."
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-900 transition-colors">
              <X size={14} />
            </button>
          )}

          {/* Search Dropdown Results */}
          {searchQuery.trim().length > 0 && (
            <div className="absolute top-full left-0 w-full mt-2 bg-white border border-gray-200 rounded-2xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 z-50">
              {isSearching ? (
                <div className="p-4 flex justify-center"><Loader2 size={18} className="animate-spin text-blue-500" /></div>
              ) : (searchResults.posts.length === 0 && searchResults.groups.length === 0 && searchResults.users.length === 0) ? (
                <div className="p-4 text-center text-xs text-gray-500 font-medium">No nodes, discussions, or users found.</div>
              ) : (
                <div className="max-h-[60vh] overflow-y-auto custom-scrollbar">
                  {/* Posts Results */}
                  {searchResults.posts.length > 0 && (
                    <div className="p-2">
                      <div className="text-[9px] font-black uppercase text-gray-500 tracking-[2px] px-2 mb-1.5 mt-1">Discussions</div>
                      {searchResults.posts.map(post => (
                        <div key={`post-${post.id}`} onClick={() => { setSearchQuery(''); handleNavigate('feed'); }} className="p-2 hover:bg-gray-50 rounded-xl cursor-pointer transition-all group">
                          <p className="text-sm font-bold text-gray-900 line-clamp-1 group-hover:text-blue-600 transition-colors">{post.title || 'Untitled Node'}</p>
                          <p className="text-[10px] text-gray-500 line-clamp-1 mt-0.5">{post.content}</p>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {/* Groups Results */}
                  {searchResults.groups.length > 0 && (
                    <div className={`p-2 ${searchResults.posts.length > 0 ? 'border-t border-gray-100' : ''}`}>
                      <div className="text-[9px] font-black uppercase text-gray-500 tracking-[2px] px-2 mb-1.5 mt-1">Groups</div>
                      {searchResults.groups.map(group => (
                        <div key={`group-${group.id}`} onClick={() => { setSearchQuery(''); handleNavigate('groups'); }} className="p-2 hover:bg-gray-50 rounded-xl cursor-pointer transition-all group">
                          <p className="text-sm font-bold text-gray-900 line-clamp-1 group-hover:text-blue-600 transition-colors">{group.name}</p>
                          <p className="text-[10px] text-gray-500 line-clamp-1 mt-0.5">{group.description}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Users Results */}
                  {searchResults.users.length > 0 && (
                    <div className={`p-2 ${(searchResults.posts.length > 0 || searchResults.groups.length > 0) ? 'border-t border-gray-100' : ''}`}>
                      <div className="text-[9px] font-black uppercase text-gray-500 tracking-[2px] px-2 mb-1.5 mt-1">Users</div>
                      {searchResults.users.map(user => (
                        <div key={`user-${user.id}`} onClick={() => { setSearchQuery(''); setSelectedUserId(user.id); }} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-xl cursor-pointer transition-all group">
                          <div className="relative w-8 h-8 rounded-xl bg-gray-100 overflow-hidden shrink-0 border border-gray-200 flex items-center justify-center text-xs font-bold text-gray-600 uppercase">
                            {user.avatar_url ? (
                              <Image src={user.avatar_url} alt="avatar" fill sizes="32px" className="object-cover" />
                            ) : (
                              user.username?.substring(0, 2) || '??'
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-gray-900 line-clamp-1 group-hover:text-blue-600 transition-colors">@{user.username}</p>
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
            onClick={() => setShowNetworkModal(true)}
            className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-gray-500 hover:text-gray-900 transition-all"
          >
            <Users size={16} />
            My Network
          </button>
          <button 
            onClick={() => setShowQuickView('discuss')}
            className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-gray-500 hover:text-gray-900 transition-all"
          >
            <MessageCircle size={16} />
            Discuss
          </button>
          <button 
            onClick={() => setShowQuickView('discover')}
            className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-gray-500 hover:text-blue-600 transition-all"
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

      {/* --- MY NETWORK MODAL --- */}
      {showNetworkModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-gray-900/50 backdrop-blur-sm" onClick={() => setShowNetworkModal(false)} />
          <div className="relative w-full max-w-md bg-white border border-gray-200 rounded-3xl shadow-2xl flex flex-col max-h-[70vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="p-6 border-b border-gray-200 bg-gray-50 flex justify-between items-center shrink-0">
              <h2 className="text-xl font-bold text-gray-900">My Network</h2>
              <button onClick={() => setShowNetworkModal(false)} className="p-2 hover:bg-gray-200 rounded-full text-gray-500 transition-colors">
                <X size={20} />
              </button>
            </div>
            {/* Tabs */}
            <div className="flex gap-4 border-b border-gray-200 px-6 shrink-0">
              <button 
                onClick={() => setNetworkTab('connections')}
                className={`py-3 text-sm font-bold flex items-center gap-2 transition-all ${networkTab === 'connections' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-900 border-b-2 border-transparent'}`}
              >
                <Users size={14} /> Connections ({networkData.connections.length})
              </button>
              <button 
                onClick={() => setNetworkTab('groups')}
                className={`py-3 text-sm font-bold flex items-center gap-2 transition-all ${networkTab === 'groups' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-900 border-b-2 border-transparent'}`}
              >
                <Hash size={14} /> Channels ({networkData.groups.length})
              </button>
            </div>
            {/* Content */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
              {isNetworkLoading ? (
                <div className="flex justify-center items-center h-full p-10"><Loader2 size={24} className="animate-spin text-blue-500" /></div>
              ) : (
                <>
                  {networkTab === 'connections' && (
                    networkData.connections.length > 0 ? (
                      <div className="space-y-1 p-2">
                        {networkData.connections.map(user => (
                          <div key={`net-user-${user.id}`} onClick={() => { 
                            if (setTargetChatUser) setTargetChatUser(user); 
                            handleNavigate('messages'); 
                          }} 
                          className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-xl cursor-pointer transition-all group">
                            <div className="relative w-8 h-8 rounded-xl bg-gray-100 overflow-hidden shrink-0 border border-gray-200 flex items-center justify-center text-xs font-bold text-gray-600 uppercase">
                              {user.avatar_url ? <Image src={user.avatar_url} alt="avatar" fill sizes="32px" className="object-cover" /> : (user.username?.substring(0, 2) || '??')}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-bold text-gray-900 line-clamp-1 group-hover:text-blue-600 transition-colors">@{user.username}</p>
                              <p className="text-[10px] text-gray-500 line-clamp-1 mt-0.5 uppercase tracking-widest font-black">{user.status || 'Active'}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center text-xs text-gray-500 font-medium p-10">No active connections.</div>
                    )
                  )}
                  {networkTab === 'groups' && (
                    networkData.groups.length > 0 ? (
                      <div className="space-y-1 p-2">
                        {networkData.groups.map(group => (
                          <div key={`net-group-${group.id}`} onClick={() => handleNavigate('groups')} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-xl cursor-pointer transition-all group">
                            <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center shrink-0">
                              <Hash size={16} />
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-bold text-gray-900 line-clamp-1 group-hover:text-blue-600 transition-colors">{group.name}</p>
                              <p className="text-[10px] text-gray-500 line-clamp-1 mt-0.5">{group.description || (group.is_private ? 'Private Channel' : 'Public Channel')}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center text-xs text-gray-500 font-medium p-10">You are not a member of any channels.</div>
                    )
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* USER PROFILE MODAL */}
      {selectedUserId && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-gray-900/50 backdrop-blur-sm" onClick={() => setSelectedUserId(null)} />
          <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto no-scrollbar z-10 bg-white rounded-[2rem] border border-gray-200 shadow-2xl animate-in zoom-in-95 duration-200">
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
    </>
  );
}