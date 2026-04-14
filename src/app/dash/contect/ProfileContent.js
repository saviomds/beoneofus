"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { Mail, Calendar, Activity, Edit3, Save, Loader2, Check, Shield, User, AlertTriangle, Camera, Users, X } from "lucide-react";
import { supabase } from "../../supabaseClient";

export default function ProfileContent({ viewUserId }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [isOwnProfile, setIsOwnProfile] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({ username: "", status: "" });
  const [toast, setToast] = useState("");
  const [followersCount, setFollowersCount] = useState(0);
  const [connectionStatus, setConnectionStatus] = useState('none');
  const [connectionProcessing, setConnectionProcessing] = useState(false);
  
  const [showFollowersList, setShowFollowersList] = useState(false);
  const [followersData, setFollowersData] = useState([]);
  const [loadingFollowers, setLoadingFollowers] = useState(false);

  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        const loggedInUserId = session.user.id;
        const targetUserId = viewUserId || loggedInUserId;
        const own = loggedInUserId === targetUserId;
        setIsOwnProfile(own);

        setCurrentUser(session.user);

        const { data: profileData, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', targetUserId)
          .single();

        if (error) throw error;
        setProfile(profileData);

        // Fetch followers count (accepted connections)
        const { count } = await supabase
          .from('connections')
          .select('*', { count: 'exact', head: true })
          .or(`receiver_id.eq.${targetUserId},sender_id.eq.${targetUserId}`)
          .eq('status', 'accepted');
          
        setFollowersCount(count || 0);

        if (!own) {
          const { data: connection } = await supabase
            .from('connections')
            .select('*')
            .or(`and(sender_id.eq.${loggedInUserId},receiver_id.eq.${targetUserId}),and(sender_id.eq.${targetUserId},receiver_id.eq.${loggedInUserId})`)
            .maybeSingle();

          if (connection) {
            if (connection.status === 'accepted') {
              setConnectionStatus('accepted');
            } else if (connection.status === 'pending') {
              setConnectionStatus(connection.sender_id === loggedInUserId ? 'pending_sent' : 'pending_received');
            }
          } else {
            setConnectionStatus('none');
          }
        }

        if (own) {
          setFormData({ 
            username: profileData.username || "", 
            status: profileData.status || "" 
          });
        }
      } catch (error) {
        console.error("Error fetching profile:", error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [viewUserId]);

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    const cleanUsername = formData.username.trim().replace(/\s+/g, '_').toLowerCase();
    if (!cleanUsername) {
      setToast("Username cannot be empty");
      return;
    }

    setSaving(true);
    try {
      let avatarUrl = profile?.avatar_url;

      // Upload new image if selected
      if (imageFile) {
        const fileExt = imageFile.name.split('.').pop();
        const fileName = `avatar-${currentUser.id}-${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage.from('avatars').upload(fileName, imageFile);
        if (uploadError) throw uploadError;
        
        const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(fileName);
        avatarUrl = urlData.publicUrl;
      }

      const { error } = await supabase
        .from('profiles')
        .update({
          username: cleanUsername,
          status: formData.status.trim(),
          avatar_url: avatarUrl
        })
        .eq('id', currentUser.id);

      if (error) {
        if (error.code === '23505') throw new Error("Username is already taken.");
        throw error;
      }

      setProfile({ ...profile, username: cleanUsername, status: formData.status.trim(), avatar_url: avatarUrl });
      setFormData({ username: cleanUsername, status: formData.status.trim() });
      setIsEditing(false);
      setImageFile(null);
      setToast("Profile updated successfully");
      setTimeout(() => setToast(""), 3000);
    } catch (error) {
      console.error("Error updating profile:", error.message);
      setToast(error.message);
      setTimeout(() => setToast(""), 3000);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setFormData({ username: profile?.username || "", status: profile?.status || "" });
    setImageFile(null);
    setImagePreview(null);
  };

  const handleFollow = async () => {
    setConnectionProcessing(true);
    try {
      const { error } = await supabase.from('connections').insert({
        sender_id: currentUser.id,
        receiver_id: profile.id,
        status: 'pending'
      });
      if (error) throw error;
      setConnectionStatus('pending_sent');
      
      await supabase.from('notifications').insert({
        receiver_id: profile.id,
        actor_id: currentUser.id,
        type: 'connection_request',
        content: 'wants to connect'
      });
      
      setToast("Follow request sent");
      setTimeout(() => setToast(""), 3000);
    } catch (err) {
      console.error(err);
      setToast("Failed to follow");
      setTimeout(() => setToast(""), 3000);
    } finally {
      setConnectionProcessing(false);
    }
  };

  const handleUnfollow = async () => {
    setConnectionProcessing(true);
    try {
      const { data, error } = await supabase.from('connections')
        .delete()
        .or(`and(sender_id.eq.${currentUser.id},receiver_id.eq.${profile.id}),and(sender_id.eq.${profile.id},receiver_id.eq.${currentUser.id})`)
        .select();
        
      if (error) throw error;
      
      if (!data || data.length === 0) {
        throw new Error("Action blocked by database. Missing DELETE policy.");
      }

      if (connectionStatus === 'accepted') {
        setFollowersCount(prev => Math.max(0, prev - 1));
      }
      setConnectionStatus('none');
      setToast("Unfollowed successfully");
      setTimeout(() => setToast(""), 3000);
    } catch (err) {
      console.error(err);
      setToast("Failed to unfollow");
      setTimeout(() => setToast(""), 3000);
    } finally {
      setConnectionProcessing(false);
    }
  };

  const handleViewFollowers = async () => {
    if (showFollowersList) {
      setShowFollowersList(false);
      return;
    }
    if (followersCount === 0) return;
    
    setShowFollowersList(true);
    if (followersData.length > 0) return;
    
    setLoadingFollowers(true);
    try {
      const { data: connections, error: connErr } = await supabase
        .from('connections')
        .select('sender_id, receiver_id')
        .or(`receiver_id.eq.${profile.id},sender_id.eq.${profile.id}`)
        .eq('status', 'accepted');
        
      if (connErr) throw connErr;
      if (connections && connections.length > 0) {
        const userIds = connections.map(c => c.sender_id === profile.id ? c.receiver_id : c.sender_id);
        const { data: users, error: userErr } = await supabase.from('profiles').select('id, username, avatar_url, status').in('id', userIds);
        if (userErr) throw userErr;
        setFollowersData(users || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingFollowers(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-20">
        <Loader2 className="animate-spin text-blue-500 mb-4" size={32} />
        <p className="text-gray-500 font-black text-xs uppercase tracking-widest">Decrypting Identity...</p>
      </div>
    );
  }

  const userInitial = profile?.username?.[0]?.toUpperCase() || currentUser?.email?.[0]?.toUpperCase() || "I";
  const displayAvatar = imagePreview || profile?.avatar_url;
  
  const isError = toast && !toast.includes("successfully");

  return (
    <div className="w-full flex flex-col bg-transparent animate-in fade-in slide-in-from-bottom-4 duration-700 pb-10 pt-4 px-2">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-white tracking-tighter">Identity Profile</h1>
        <p className="text-gray-500 text-sm mt-1 font-medium">{isOwnProfile ? "Manage your personal information and network status." : "Viewing network identity data."}</p>
      </div>

      <div className="max-w-4xl bg-[#0A0A0A] border border-white/5 rounded-[2rem] p-6 sm:p-10 relative overflow-hidden shadow-2xl">
        {/* Background Accents */}
        <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-br from-blue-600/10 to-purple-600/10" />
        <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-blue-500/50 to-transparent" />
        
        <div className="relative flex flex-col md:flex-row gap-8 items-start md:items-center pt-4">
          {/* Avatar Section */}
          <div className="relative w-24 h-24 rounded-3xl bg-gradient-to-br from-blue-600 to-blue-400 flex items-center justify-center text-4xl font-black text-white shadow-xl shadow-blue-500/20 shrink-0 border border-white/10 overflow-hidden group">
            {displayAvatar ? (
              <Image src={displayAvatar} alt="Profile Avatar" fill className="object-cover" />
            ) : (
              userInitial
            )}
            
            {isEditing && (
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer z-10"
              >
                <Camera size={24} className="text-white mb-1" />
                <span className="text-[9px] font-bold uppercase tracking-widest text-white">Change</span>
              </div>
            )}
          </div>
          <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />

          <div className="flex-1 w-full">
            {isEditing ? (
              <div className="space-y-4 max-w-md animate-in fade-in zoom-in-95 duration-200">
                <div>
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 block pl-1">Username</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-bold">@</span>
                    <input 
                      type="text" 
                      value={formData.username} 
                      onChange={(e) => setFormData({...formData, username: e.target.value})}
                      className="w-full bg-[#0F0F0F] border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white text-sm focus:border-blue-500/50 focus:bg-white/5 outline-none transition-all"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 block pl-1">Status / Bio</label>
                  <input 
                    type="text" 
                    value={formData.status} 
                    onChange={(e) => setFormData({...formData, status: e.target.value})}
                    placeholder="e.g. Maintenance & Limited"
                    className="w-full bg-[#0F0F0F] border border-white/10 rounded-xl py-3 px-4 text-white text-sm focus:border-blue-500/50 focus:bg-white/5 outline-none transition-all"
                  />
                </div>
                <div className="flex gap-3 pt-4">
                  <button onClick={handleSave} disabled={saving} className="flex-1 bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-500/20">
                    {saving ? <Loader2 size={16} className="animate-spin"/> : <Save size={16}/>} Save
                  </button>
                  <button onClick={handleCancel} className="flex-1 bg-white/5 hover:bg-white/10 text-white py-3 rounded-xl font-bold transition-all border border-white/5">
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="animate-in fade-in duration-300">
                <h2 className="text-2xl font-black text-white mb-1 flex items-center gap-2">
                  @{profile?.username || 'I am robot'}
                </h2>
                <div className="flex items-center gap-4 mb-6">
                  <p className="text-blue-400 font-mono text-sm flex items-center gap-2">
                    <Activity size={14} className="animate-pulse" />
                    {profile?.status || 'Bio not set'}
                  </p>
                  <div className="w-1.5 h-1.5 bg-white/10 rounded-full" />
                  
                  <div className="relative">
                    <p 
                      onClick={handleViewFollowers}
                      className={`text-gray-400 text-sm font-bold flex items-center gap-1.5 transition-colors ${followersCount > 0 ? 'cursor-pointer hover:text-white' : ''}`}
                    >
                      <Users size={14} className="text-gray-500" />
                      <span className="text-white">
                        {Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(followersCount)}
                      </span> Followers
                    </p>

                    {showFollowersList && (
                      <div className="absolute top-full left-0 mt-2 w-64 bg-[#111111] border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                        <div className="p-3 bg-white/5 border-b border-white/5 flex justify-between items-center">
                          <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Network Nodes</span>
                          <button onClick={() => setShowFollowersList(false)} className="text-gray-500 hover:text-white transition-colors"><X size={14}/></button>
                        </div>
                        {/* max-h-[170px] perfectly fits 3 items of ~50px height before initiating the scrollbar */}
                        <div className="max-h-[170px] overflow-y-auto custom-scrollbar p-2 space-y-1">
                          {loadingFollowers ? (
                            <div className="flex justify-center py-4"><Loader2 size={16} className="animate-spin text-blue-500" /></div>
                          ) : followersData.map(user => (
                            <div key={`follower-${user.id}`} className="flex items-center gap-3 p-2 hover:bg-white/5 rounded-xl transition-colors cursor-pointer group">
                              <div className="relative w-8 h-8 rounded-full bg-black border border-white/10 flex items-center justify-center text-xs font-bold uppercase text-white shrink-0 overflow-hidden">
                                {user.avatar_url ? <Image src={user.avatar_url} alt="avatar" fill className="object-cover" /> : user.username?.substring(0, 2)}
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-bold text-white truncate group-hover:text-blue-400 transition-colors">@{user.username}</p>
                                <p className="text-[9px] text-gray-500 truncate uppercase tracking-widest">{user.status || 'Active Node'}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                  <div className="flex items-center gap-4 bg-[#0F0F0F] p-4 rounded-2xl border border-white/5 hover:border-white/10 transition-colors">
                    <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-gray-400 shrink-0"><Mail size={18} /></div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-0.5">{isOwnProfile ? "Email Address" : "Email Visibility"}</p>
                      <p className="text-sm text-gray-300 truncate font-medium">{isOwnProfile ? (currentUser?.email || 'N/A') : 'Protected by User'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 bg-[#0F0F0F] p-4 rounded-2xl border border-white/5 hover:border-white/10 transition-colors">
                    <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-gray-400 shrink-0"><Calendar size={18} /></div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-0.5">Node Registered</p>
                      <p className="text-sm text-gray-300 font-medium">{isOwnProfile && currentUser?.created_at ? new Date(currentUser.created_at).toLocaleDateString() : 'Active Member'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 bg-[#0F0F0F] p-4 rounded-2xl border border-white/5 hover:border-white/10 transition-colors">
                    <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center text-green-500 shrink-0"><Shield size={18} /></div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-0.5">Security Clearance</p>
                      <p className="text-sm text-green-400 font-bold tracking-tight">Verified Member</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 bg-[#0F0F0F] p-4 rounded-2xl border border-white/5 hover:border-white/10 transition-colors">
                    <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-gray-400 shrink-0"><User size={18} /></div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-0.5">Account ID</p>
                      <p className="text-xs text-gray-500 font-mono truncate">{profile?.id || 'N/A'}</p>
                    </div>
                  </div>
                </div>

                {isOwnProfile ? (
                  <div className="mt-8 pt-6 border-t border-white/5 flex">
                    <button 
                      onClick={() => setIsEditing(true)} 
                      className="flex items-center gap-2 text-sm font-bold text-white bg-white/5 hover:bg-white/10 px-6 py-3 rounded-xl border border-white/5 transition-all shadow-sm active:scale-95"
                    >
                      <Edit3 size={16} /> Edit Identity
                    </button>
                  </div>
                ) : (
                  <div className="mt-8 pt-6 border-t border-white/5 flex">
                    {connectionStatus === 'none' && (
                      <button 
                        onClick={handleFollow}
                        disabled={connectionProcessing}
                        className="flex items-center gap-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-500 px-6 py-3 rounded-xl transition-all shadow-lg shadow-blue-500/20 active:scale-95 disabled:opacity-50"
                      >
                        {connectionProcessing ? <Loader2 size={16} className="animate-spin" /> : <Users size={16} />} Follow
                      </button>
                    )}
                    {connectionStatus === 'pending_sent' && (
                      <button 
                        onClick={handleUnfollow}
                        disabled={connectionProcessing}
                        className="flex items-center gap-2 text-sm font-bold text-gray-400 bg-white/5 hover:bg-red-500/10 hover:text-red-400 px-6 py-3 rounded-xl border border-white/5 transition-all active:scale-95 disabled:opacity-50"
                      >
                        {connectionProcessing ? <Loader2 size={16} className="animate-spin" /> : <Users size={16} />} Cancel Request
                      </button>
                    )}
                    {connectionStatus === 'pending_received' && (
                       <button 
                        disabled
                        className="flex items-center gap-2 text-sm font-bold text-amber-500 bg-amber-500/10 px-6 py-3 rounded-xl border border-amber-500/20 transition-all cursor-default"
                      >
                        <Users size={16} /> Review in Notifications
                      </button>
                    )}
                    {connectionStatus === 'accepted' && (
                      <button 
                        onClick={handleUnfollow}
                        disabled={connectionProcessing}
                        className="flex items-center gap-2 text-sm font-bold text-gray-400 bg-white/5 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20 px-6 py-3 rounded-xl border border-white/5 transition-all active:scale-95 disabled:opacity-50"
                      >
                        {connectionProcessing ? <Loader2 size={16} className="animate-spin" /> : <Users size={16} />} Unfollow
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Custom Toast Popup */}
      {toast && (
        <div className={`fixed bottom-10 right-10 z-[150] flex items-center gap-3 bg-[#0D0D0D] border px-5 py-3 rounded-2xl shadow-2xl animate-in fade-in slide-in-from-bottom-8 duration-300 ${isError ? 'border-red-500/30 text-red-400' : 'border-green-500/30 text-green-400'}`}>
          {isError ? <AlertTriangle size={18} className="text-red-500" /> : <Check size={18} className="text-green-500" />}
          <span className="text-sm font-bold tracking-tight">{toast}</span>
        </div>
      )}
    </div>
  );
}