"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { Search, UserPlus, X, Loader2, Compass, Users, CheckCircle2, Grid, List, Briefcase } from "lucide-react";
import { supabase } from "../../supabaseClient";
import VerifiedBadge from "../../components/VerifiedBadge";
import ProfileContent from "./ProfileContent";

export default function ConnectionsContent() {
  const [currentUserId, setCurrentUserId] = useState(null);
  const [users, setUsers] = useState([]);
  const [connections, setConnections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("discover"); // 'discover' or 'connected'
  const [viewMode, setViewMode] = useState("grid"); // 'grid' or 'list'
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [processingId, setProcessingId] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const uid = session.user.id;
      setCurrentUserId(uid);

      // Fetch all profiles (exclude current user)
      const { data: allProfiles } = await supabase
        .from('profiles')
        .select('id, username, status, avatar_url, banner_url, is_verified, work_status')
        .neq('id', uid);

      // Fetch current user's connections (sent or received)
      const { data: myConnections } = await supabase
        .from('connections')
        .select('sender_id, receiver_id, status')
        .or(`sender_id.eq.${uid},receiver_id.eq.${uid}`);

      if (allProfiles) setUsers(allProfiles);
      if (myConnections) setConnections(myConnections);
      
      setLoading(false);
    };

    fetchData();
  }, []);

  const handleFollow = async (e, receiverId, isFollowing) => {
    e.stopPropagation();
    if (!currentUserId || processingId) return;
    setProcessingId(receiverId);

    try {
      if (isFollowing) {
        // Unfollow / Disconnect
        await supabase.from('connections')
          .delete()
          .or(`and(sender_id.eq.${currentUserId},receiver_id.eq.${receiverId}),and(sender_id.eq.${receiverId},receiver_id.eq.${currentUserId})`);
          
        setConnections(prev => prev.filter(c => 
          !(c.sender_id === currentUserId && c.receiver_id === receiverId) &&
          !(c.sender_id === receiverId && c.receiver_id === currentUserId)
        ));
      } else {
        // Follow / Send Request
        const { data, error } = await supabase.from('connections').insert({
          sender_id: currentUserId,
          receiver_id: receiverId,
          status: 'pending' 
        }).select().single();

        if (!error && data) {
          setConnections(prev => [...prev, data]);
          
          // Trigger notification for the receiver
          await supabase.from('notifications').insert({
            receiver_id: receiverId,
            actor_id: currentUserId,
            type: 'connection_request',
            content: 'wants to connect'
          });
        }
      }
    } catch (error) {
      console.error("Connection error:", error);
    } finally {
      setProcessingId(null);
    }
  };

  const getConnectionStatus = (targetId) => {
    const conn = connections.find(c => 
      (c.sender_id === currentUserId && c.receiver_id === targetId) ||
      (c.sender_id === targetId && c.receiver_id === currentUserId)
    );
    return conn ? conn.status : null; // returns 'pending', 'accepted', 'blocked', or null
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.username?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (user.status || "").toLowerCase().includes(searchQuery.toLowerCase());
    
    const status = getConnectionStatus(user.id);
    const isConnected = status === 'accepted' || status === 'pending';

    if (activeTab === 'discover') {
      return matchesSearch && !isConnected;
    } else {
      return matchesSearch && isConnected;
    }
  });

  return (
    <div className="w-full flex h-[calc(100dvh-130px)] md:h-[calc(100vh-180px)] bg-transparent overflow-hidden relative flex-col">
      {/* Header & Tabs */}
      <div className="flex flex-col gap-4 mb-6 px-2 shrink-0">
        <div>
          <h2 className="text-3xl font-black tracking-tighter text-gray-900 dark:text-gray-100">Network</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 font-medium mt-1">Discover developers and manage your connections.</p>
        </div>

        <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
          <div className="flex p-1 bg-gray-100 dark:bg-gray-800 rounded-xl w-full sm:w-auto shrink-0">
            <button 
              onClick={() => setActiveTab('discover')}
              className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-2.5 text-xs font-bold rounded-lg transition-all ${activeTab === 'discover' ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'}`}
            >
              <Compass size={16} /> Discover
            </button>
            <button 
              onClick={() => setActiveTab('connected')}
              className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-2.5 text-xs font-bold rounded-lg transition-all ${activeTab === 'connected' ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'}`}
            >
              <Users size={16} /> My Connections
            </button>
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto flex-grow md:flex-grow-0">
            <div className="relative w-full flex-grow group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors" size={16} />
              <input 
                type="text" 
                placeholder="Search developers..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl py-3 pl-11 pr-4 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
              />
            </div>
            <div className="flex p-1 bg-gray-100 dark:bg-gray-800 rounded-xl shrink-0">
              <button onClick={() => setViewMode('grid')} className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'}`} title="Grid View">
                <Grid size={16} />
              </button>
              <button onClick={() => setViewMode('list')} className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'}`} title="List View">
                <List size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Grid Content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar px-2 pb-10">
        {loading ? (
          <div className={viewMode === 'grid' ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" : "space-y-3"}>
            {Array.from({ length: 6 }).map((_, i) => (
              viewMode === 'grid' ? (
                <div key={i} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden animate-pulse">
                  <div className="h-20 bg-gray-100 dark:bg-gray-800"></div>
                  <div className="p-4 relative">
                    <div className="absolute -top-10 left-4 w-16 h-16 rounded-full border-4 border-white dark:border-gray-900 bg-gray-200 dark:bg-gray-700"></div>
                    <div className="h-8 w-8 rounded-lg bg-gray-100 dark:bg-gray-800 ml-auto mt-1"></div>
                    <div className="mt-4 space-y-2">
                      <div className="h-4 bg-gray-100 dark:bg-gray-800 rounded w-3/4"></div>
                      <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded w-1/2"></div>
                    </div>
                  </div>
                </div>
              ) : (
                <div key={i} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-3 flex items-center gap-4 animate-pulse">
                  <div className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-gray-800 shrink-0"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded w-1/2"></div>
                    <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded w-1/3"></div>
                  </div>
                  <div className="w-20 h-6 rounded-lg bg-gray-100 dark:bg-gray-800 shrink-0"></div>
                  <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-800 shrink-0"></div>
                </div>
              )
            ))}
          </div>
        ) : filteredUsers.length > 0 ? (
          viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredUsers.map((user, index) => {
                const status = getConnectionStatus(user.id);
                const isFollowing = status === 'accepted' || status === 'pending';
                const workStatusColor = user.work_status === 'Hiring' 
                  ? 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-800/50' 
                  : 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/50';

                return (
                  <div 
                    key={user.id} 
                    className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group cursor-pointer animate-in fade-in"
                    style={{ animationDelay: `${index * 50}ms`, animationFillMode: 'both' }}
                    onClick={() => setSelectedUserId(user.id)}
                  >
                    <div className="h-20 bg-gray-100 dark:bg-gray-800 relative">
                      {user.banner_url && <Image src={user.banner_url} alt="banner" layout="fill" objectFit="cover" />}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                    </div>
                    <div className="p-4 pt-0 relative">
                      <div className="flex justify-between items-start">
                        <div className="relative -mt-8">
                          <div className="w-16 h-16 rounded-full border-4 border-white dark:border-gray-900 bg-gray-200 dark:bg-gray-700 overflow-hidden flex items-center justify-center text-xl font-black text-gray-400 uppercase">
                            {user.avatar_url ? <Image src={user.avatar_url} alt="avatar" layout="fill" objectFit="cover" /> : (user.username?.substring(0, 2) || '??')}
                          </div>
                        </div>
                        <button
                          onClick={(e) => handleFollow(e, user.id, isFollowing)}
                          disabled={processingId === user.id}
                          className={`-mt-5 shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-all border disabled:opacity-50 ${
                            isFollowing 
                              ? 'bg-green-500 border-green-600 text-white hover:bg-red-500 hover:border-red-600' 
                              : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-blue-200 dark:hover:border-blue-800/50'
                          }`}
                          title={isFollowing ? "Unfollow" : "Follow"}
                        >
                          {processingId === user.id ? <Loader2 size={18} className="animate-spin" /> : isFollowing ? <CheckCircle2 size={18} /> : <UserPlus size={18} />}
                        </button>
                      </div>
                      <div className="mt-2">
                        <h3 className="text-base font-bold text-gray-900 dark:text-gray-100 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors flex items-center gap-1.5">
                          @{user.username}
                          {user.is_verified && <VerifiedBadge size={16} />}
                        </h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400 font-medium truncate mt-0.5">
                          {user.status || 'Active Node'}
                        </p>
                      </div>
                      {user.work_status && user.work_status !== 'Not looking' && (
                        <div className={`mt-4 inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg border ${workStatusColor}`}>
                          <Briefcase size={12} />
                          {user.work_status}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredUsers.map((user, index) => {
                const status = getConnectionStatus(user.id);
                const isFollowing = status === 'accepted' || status === 'pending';
                const workStatusColor = user.work_status === 'Hiring' 
                  ? 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-800/50' 
                  : 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/50';

                return (
                  <div 
                    key={user.id} 
                    className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-3 flex items-center gap-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-all group cursor-pointer animate-in fade-in"
                    style={{ animationDelay: `${index * 30}ms`, animationFillMode: 'both' }}
                    onClick={() => setSelectedUserId(user.id)}
                  >
                    <div className="relative w-12 h-12 rounded-xl bg-gray-100 dark:bg-gray-800 overflow-hidden shrink-0 border border-gray-200 dark:border-gray-700 flex items-center justify-center text-lg font-black text-gray-400 uppercase">
                      {user.avatar_url ? <Image src={user.avatar_url} alt="avatar" fill sizes="48px" className="object-cover" /> : (user.username?.substring(0, 2) || '??')}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors flex items-center gap-1.5">
                        @{user.username}
                        {user.is_verified && <VerifiedBadge size={14} />}
                      </h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400 font-medium truncate mt-0.5">
                        {user.status || 'Active Node'}
                      </p>
                    </div>
                    {user.work_status && user.work_status !== 'Not looking' && (
                      <div className={`hidden md:inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg border ${workStatusColor} shrink-0`}>
                        <Briefcase size={12} />
                        {user.work_status}
                      </div>
                    )}
                    <button
                      onClick={(e) => handleFollow(e, user.id, isFollowing)}
                      disabled={processingId === user.id}
                      className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-all border disabled:opacity-50 ${
                        isFollowing 
                          ? 'bg-green-500 border-green-600 text-white hover:bg-red-500 hover:border-red-600' 
                          : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-blue-200 dark:hover:border-blue-800/50'
                      }`}
                      title={isFollowing ? "Unfollow" : "Follow"}
                    >
                      {processingId === user.id ? <Loader2 size={18} className="animate-spin" /> : isFollowing ? <CheckCircle2 size={18} /> : <UserPlus size={18} />}
                    </button>
                  </div>
                );
              })}
            </div>
          )
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center animate-in fade-in zoom-in duration-500">
            <div className="w-20 h-20 bg-gray-50 dark:bg-gray-800/50 rounded-full flex items-center justify-center mb-4 border border-gray-200 dark:border-gray-700">
              <Search size={32} className="text-gray-400 dark:text-gray-500" />
            </div>
            <h3 className="text-xl font-black text-gray-900 dark:text-gray-100 tracking-tight">No developers found</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 max-w-sm">
              {activeTab === 'discover' 
                ? 'Try adjusting your search query or check back later for new network nodes.'
                : 'You haven\'t connected with any developers yet. Switch to Discover to find peers.'}
            </p>
            {activeTab === 'connected' && (
              <button 
                onClick={() => setActiveTab('discover')}
                className="mt-6 bg-blue-600 hover:bg-blue-500 text-white font-bold px-6 py-2.5 rounded-xl transition-all shadow-lg shadow-blue-500/20"
              >
                Find Developers
              </button>
            )}
          </div>
        )}
      </div>

      {/* User Profile Modal */}
      {selectedUserId && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-gray-900/50 dark:bg-black/60 backdrop-blur-sm" onClick={() => setSelectedUserId(null)} />
          <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto no-scrollbar z-10 bg-white dark:bg-gray-900 rounded-[2rem] border border-gray-200 dark:border-gray-800 shadow-xl animate-in zoom-in-95 duration-200">
            <button 
              onClick={() => setSelectedUserId(null)} 
              className="absolute top-6 right-6 z-[260] p-2 bg-gray-100 dark:bg-gray-800 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 rounded-full text-gray-500 dark:text-gray-400 transition-colors"
            >
              <X size={20} />
            </button>
            <div className="p-2 sm:p-6">
              <ProfileContent viewUserId={selectedUserId} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}