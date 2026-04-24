"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { Mail, Calendar, Activity, Edit3, Save, Loader2, Check, Shield, User, AlertTriangle, Camera, Users, X, MapPin, GitBranch, Link } from "lucide-react";
import Cropper from "react-easy-crop";
import { supabase } from "../../supabaseClient";

// --- Image Cropping Helper ---
const createImage = (url) =>
  new Promise((resolve, reject) => {
    const image = new window.Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', (error) => reject(error));
    image.setAttribute('crossOrigin', 'anonymous');
    image.src = url;
  });

async function getCroppedImg(imageSrc, pixelCrop) {
  const image = await createImage(imageSrc);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;

  ctx.drawImage(
    image,
    pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height,
    0, 0, pixelCrop.width, pixelCrop.height
  );

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.9);
  });
}

export default function ProfileContent({ viewUserId }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [isOwnProfile, setIsOwnProfile] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({ username: "", status: "", location: "", github: "", website: "" });
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

  const [bannerFile, setBannerFile] = useState(null);
  const [bannerPreview, setBannerPreview] = useState(null);
  const bannerInputRef = useRef(null);

  // Cropper States
  const [showBannerCropper, setShowBannerCropper] = useState(false);
  const [bannerCrop, setBannerCrop] = useState({ x: 0, y: 0 });
  const [bannerZoom, setBannerZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

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
            status: profileData.status || "",
            location: profileData.location || "",
            github: profileData.github || "",
            website: profileData.website || ""
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

  const handleBannerFileChange = (event) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setBannerPreview(reader.result);
        setShowBannerCropper(true);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCropComplete = async () => {
    try {
      const croppedImageBlob = await getCroppedImg(bannerPreview, croppedAreaPixels);
      setBannerFile(new File([croppedImageBlob], "banner.jpg", { type: "image/jpeg" }));
      setBannerPreview(URL.createObjectURL(croppedImageBlob));
      setShowBannerCropper(false);
    } catch (e) {
      console.error(e);
      setToast("Failed to crop image");
      setTimeout(() => setToast(""), 3000);
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
      let bannerUrl = profile?.banner_url;

      // Upload new image if selected
      if (imageFile) {
        const fileExt = imageFile.name.split('.').pop();
        const fileName = `avatar-${currentUser.id}-${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage.from('avatars').upload(fileName, imageFile);
        if (uploadError) throw uploadError;
        
        const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(fileName);
        avatarUrl = urlData.publicUrl;
      }

      // Upload new banner if selected
      if (bannerFile) {
        const fileExt = bannerFile.name.split('.').pop();
        const fileName = `banner-${currentUser.id}-${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage.from('avatars').upload(fileName, bannerFile);
        if (uploadError) throw uploadError;
        
        const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(fileName);
        bannerUrl = urlData.publicUrl;
      }

      const { error } = await supabase
        .from('profiles')
        .update({
          username: cleanUsername,
          status: formData.status.trim(),
          location: formData.location.trim(),
          github: formData.github.trim(),
          website: formData.website.trim(),
          avatar_url: avatarUrl,
          banner_url: bannerUrl
        })
        .eq('id', currentUser.id);

      if (error) {
        if (error.code === '23505') throw new Error("Username is already taken.");
        throw error;
      }

      setProfile({ 
        ...profile, 
        username: cleanUsername, 
        status: formData.status.trim(), 
        location: formData.location.trim(), 
        github: formData.github.trim(), 
        website: formData.website.trim(), 
        avatar_url: avatarUrl,
        banner_url: bannerUrl
      });
      setFormData({ 
        username: cleanUsername, 
        status: formData.status.trim(), 
        location: formData.location.trim(), 
        github: formData.github.trim(), 
        website: formData.website.trim() 
      });
      setIsEditing(false);
      setImageFile(null);
      setBannerFile(null);
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
    setFormData({ 
      username: profile?.username || "", 
      status: profile?.status || "",
      location: profile?.location || "",
      github: profile?.github || "",
      website: profile?.website || ""
    });
    setImageFile(null);
    setImagePreview(null);
    setBannerFile(null);
    setBannerPreview(null);
    setShowBannerCropper(false);
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
  const displayBanner = bannerPreview || profile?.banner_url;
  
  const isError = toast && !toast.includes("successfully");

  return (
    <div className="w-full flex flex-col bg-transparent animate-in fade-in slide-in-from-bottom-4 duration-700 pb-10 pt-4 px-2">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-gray-900 tracking-tighter">Profile</h1>
        <p className="text-gray-500 text-sm mt-1 font-medium">{isOwnProfile ? "Manage your professional identity and network status." : "Viewing professional network identity."}</p>
      </div>

      {/* --- BANNER CROPPER MODAL --- */}
      {showBannerCropper && bannerPreview && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-gray-900/80 backdrop-blur-sm" />
          <div className="relative w-full max-w-3xl bg-white rounded-[2rem] shadow-2xl overflow-hidden flex flex-col h-[75vh] animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-gray-200 flex justify-between items-center bg-gray-50 z-10 shrink-0">
              <h3 className="font-bold text-gray-900">Adjust Cover Image</h3>
              <button onClick={() => { setShowBannerCropper(false); setBannerPreview(profile?.banner_url || null); setBannerFile(null); }} className="text-gray-500 hover:text-gray-900 transition-colors p-1 rounded-full hover:bg-gray-200">
                <X size={20} />
              </button>
            </div>
            <div className="relative flex-1 bg-black">
              <Cropper
                image={bannerPreview}
                crop={bannerCrop}
                zoom={bannerZoom}
                aspect={4 / 1} 
                onCropChange={setBannerCrop}
                onZoomChange={setBannerZoom}
                onCropComplete={(croppedArea, croppedAreaPixels) => setCroppedAreaPixels(croppedAreaPixels)}
              />
            </div>
            <div className="p-5 bg-gray-50 border-t border-gray-200 z-10 flex flex-col sm:flex-row items-center gap-4 shrink-0">
              <input type="range" value={bannerZoom} min={1} max={3} step={0.1} aria-labelledby="Zoom" onChange={(e) => setBannerZoom(e.target.value)} className="w-full accent-blue-600" />
              <button onClick={handleCropComplete} className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl font-bold transition-all shrink-0">Apply Crop</button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-4xl bg-white border border-gray-200 rounded-[2rem] relative overflow-visible shadow-sm mb-10">
        {/* Banner Section */}
        <div className="h-32 sm:h-48 w-full bg-gradient-to-r from-slate-800 via-blue-900 to-slate-900 rounded-t-[2rem] relative overflow-hidden group">
          {displayBanner ? (
            <Image src={displayBanner} alt="Profile Banner" fill priority quality={75} className="object-cover object-center" />
          ) : (
            <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] mix-blend-overlay"></div>
          )}
          
          {isEditing && (
            <div 
              onClick={() => bannerInputRef.current?.click()}
              className="absolute inset-0 bg-gray-900/40 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer z-10"
            >
              <Camera size={32} className="text-white mb-2" />
              <span className="text-xs font-bold uppercase tracking-widest text-white bg-black/50 px-4 py-1.5 rounded-full backdrop-blur-sm border border-white/20">Change Cover</span>
            </div>
          )}
        </div>
        <input type="file" ref={bannerInputRef} onChange={handleBannerFileChange} accept="image/*" className="hidden" />
        
        <div className="px-6 sm:px-10 relative pb-10">
          {/* Header Area with Avatar and Actions */}
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4 -mt-12 sm:-mt-16 mb-6">
            {/* Avatar */}
            <div className="relative w-24 h-24 sm:w-32 sm:h-32 rounded-full border-4 border-white bg-white flex items-center justify-center text-4xl font-black text-gray-700 shadow-md shrink-0 overflow-hidden group z-10">
              {displayAvatar ? (
                <Image src={displayAvatar} alt="Profile Avatar" fill sizes="128px" className="object-cover object-center" />
              ) : (
                userInitial
              )}
              
              {isEditing && (
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute inset-0 bg-gray-900/60 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer z-10"
                >
                  <Camera size={24} className="text-white mb-1" />
                  <span className="text-[9px] font-bold uppercase tracking-widest text-white">Change</span>
                </div>
              )}
            </div>
            <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />

            {/* Action Buttons */}
            <div className="flex items-center gap-3 pt-2 sm:pt-0 z-10">
              {isOwnProfile ? (
                !isEditing && (
                  <button 
                    onClick={() => setIsEditing(true)} 
                    className="flex items-center gap-2 text-sm font-bold text-gray-700 bg-white hover:bg-gray-50 px-6 py-2.5 rounded-full border border-gray-300 transition-all shadow-sm active:scale-95"
                  >
                    <Edit3 size={16} /> Edit Profile
                  </button>
                )
              ) : (
                <>
                  {connectionStatus === 'none' && (
                    <button 
                      onClick={handleFollow}
                      disabled={connectionProcessing}
                      className="flex items-center gap-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 px-6 py-2.5 rounded-full transition-all shadow-sm active:scale-95 disabled:opacity-50"
                    >
                      {connectionProcessing ? <Loader2 size={16} className="animate-spin" /> : <Users size={16} />} Follow
                    </button>
                  )}
                  {connectionStatus === 'pending_sent' && (
                    <button 
                      onClick={handleUnfollow}
                      disabled={connectionProcessing}
                      className="flex items-center gap-2 text-sm font-bold text-gray-600 bg-white hover:bg-red-50 hover:text-red-600 hover:border-red-200 border border-gray-300 px-6 py-2.5 rounded-full transition-all active:scale-95 disabled:opacity-50"
                    >
                      {connectionProcessing ? <Loader2 size={16} className="animate-spin" /> : <Users size={16} />} Pending
                    </button>
                  )}
                  {connectionStatus === 'pending_received' && (
                     <button 
                      disabled
                      className="flex items-center gap-2 text-sm font-bold text-amber-600 bg-amber-50 px-6 py-2.5 rounded-full border border-amber-200 transition-all cursor-default"
                    >
                      <Users size={16} /> Review Request
                    </button>
                  )}
                  {connectionStatus === 'accepted' && (
                    <button 
                      onClick={handleUnfollow}
                      disabled={connectionProcessing}
                      className="flex items-center gap-2 text-sm font-bold text-gray-600 bg-white hover:bg-red-50 hover:text-red-600 hover:border-red-200 px-6 py-2.5 rounded-full border border-gray-300 transition-all active:scale-95 disabled:opacity-50"
                    >
                      {connectionProcessing ? <Loader2 size={16} className="animate-spin" /> : <Users size={16} />} Unfollow
                    </button>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Content Area */}
          {isEditing ? (
            <div className="pt-2 pb-6 animate-in fade-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Edit Details</h3>
                  <p className="text-sm text-gray-500">Update your professional identity.</p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={handleCancel} className="px-4 py-2 text-sm font-bold text-gray-600 hover:text-gray-900 transition-colors">Cancel</button>
                  <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-full transition-all shadow-sm disabled:opacity-50">
                    {saving ? <Loader2 size={16} className="animate-spin"/> : <Save size={16}/>} Save
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-gray-50 p-6 rounded-3xl border border-gray-100">
                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 block pl-1">Username</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">@</span>
                      <input 
                        type="text" 
                        value={formData.username} 
                        onChange={(e) => setFormData({...formData, username: e.target.value})}
                        className="w-full bg-white border border-gray-300 rounded-xl py-3 pl-10 pr-4 text-gray-900 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all shadow-sm"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 block pl-1">Headline / Bio</label>
                    <input 
                      type="text" 
                      value={formData.status} 
                      onChange={(e) => setFormData({...formData, status: e.target.value})}
                      placeholder="e.g. Senior Software Engineer"
                      className="w-full bg-white border border-gray-300 rounded-xl py-3 px-4 text-gray-900 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all shadow-sm"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 block pl-1">Location</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"><MapPin size={14} /></span>
                      <input 
                        type="text" 
                        value={formData.location} 
                        onChange={(e) => setFormData({...formData, location: e.target.value})}
                        placeholder="City, Country"
                        className="w-full bg-white border border-gray-300 rounded-xl py-3 pl-10 pr-4 text-gray-900 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all shadow-sm"
                      />
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 block pl-1">GitHub Username</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"><GitBranch size={14} /></span>
                      <input 
                        type="text" 
                        value={formData.github} 
                        onChange={(e) => setFormData({...formData, github: e.target.value})}
                        placeholder="octocat"
                        className="w-full bg-white border border-gray-300 rounded-xl py-3 pl-10 pr-4 text-gray-900 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all shadow-sm"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 block pl-1">Website URL</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"><Link size={14} /></span>
                      <input 
                        type="text" 
                        value={formData.website} 
                        onChange={(e) => setFormData({...formData, website: e.target.value})}
                        placeholder="https://yourdomain.com"
                        className="w-full bg-white border border-gray-300 rounded-xl py-3 pl-10 pr-4 text-gray-900 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all shadow-sm"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="animate-in fade-in duration-300 pt-2">
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">
                {profile?.username || 'Unknown User'}
              </h2>
              <p className="text-gray-700 text-base sm:text-lg mt-1.5 font-medium max-w-2xl">
                {profile?.status || 'Software Engineer'}
              </p>
              
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-3 text-sm text-gray-500 font-medium">
                {profile?.location && (
                  <span className="flex items-center gap-1.5">
                    <MapPin size={16} className="text-gray-400" /> {profile.location}
                  </span>
                )}
                <div className="relative">
                  <span 
                    onClick={handleViewFollowers}
                    className={`flex items-center gap-1.5 transition-colors ${followersCount > 0 ? 'cursor-pointer hover:text-blue-600' : ''}`}
                  >
                    <Users size={16} className="text-gray-400" /> 
                    <span className={followersCount > 0 ? "font-bold text-blue-600" : ""}>
                      {Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(followersCount)}
                    </span> connections
                  </span>

                  {showFollowersList && (
                    <div className="absolute top-full left-0 mt-2 w-64 bg-white border border-gray-200 rounded-2xl shadow-xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                      <div className="p-3 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
                        <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Network Nodes</span>
                        <button onClick={() => setShowFollowersList(false)} className="text-gray-400 hover:text-gray-900 transition-colors"><X size={14}/></button>
                      </div>
                      <div className="max-h-[170px] overflow-y-auto custom-scrollbar p-2 space-y-1">
                        {loadingFollowers ? (
                          <div className="flex justify-center py-4"><Loader2 size={16} className="animate-spin text-blue-500" /></div>
                        ) : followersData.map(user => (
                          <div key={`follower-${user.id}`} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-xl transition-colors cursor-pointer group">
                            <div className="relative w-8 h-8 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center text-xs font-bold uppercase text-gray-500 shrink-0 overflow-hidden">
                              {user.avatar_url ? <Image src={user.avatar_url} alt="avatar" fill sizes="32px" className="object-cover" /> : user.username?.substring(0, 2)}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-bold text-gray-900 truncate group-hover:text-blue-600 transition-colors">@{user.username}</p>
                              <p className="text-[9px] text-gray-500 truncate uppercase tracking-widest">{user.status || 'Active Node'}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-8 pt-8 border-t border-gray-100">
                <h3 className="text-lg font-bold text-gray-900 mb-6">Contact & Details</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-6 gap-x-4">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 text-gray-400"><Mail size={20} /></div>
                    <div>
                      <p className="text-sm font-bold text-gray-900">{isOwnProfile ? "Email" : "Email Visibility"}</p>
                      <p className="text-sm text-gray-600">{isOwnProfile ? (currentUser?.email || 'N/A') : 'Protected by User'}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 text-gray-400"><Calendar size={20} /></div>
                    <div>
                      <p className="text-sm font-bold text-gray-900">Date Joined</p>
                      <p className="text-sm text-gray-600">{isOwnProfile && currentUser?.created_at ? new Date(currentUser.created_at).toLocaleDateString() : 'Active Member'}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 text-gray-400"><Shield size={20} /></div>
                    <div>
                      <p className="text-sm font-bold text-gray-900">Security Clearance</p>
                      <p className="text-sm text-green-600 font-medium">Verified Identity</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 text-gray-400"><User size={20} /></div>
                    <div className="min-w-0 pr-4">
                      <p className="text-sm font-bold text-gray-900">Account Node ID</p>
                      <p className="text-xs text-gray-500 font-mono truncate" title={profile?.id || 'N/A'}>{profile?.id || 'N/A'}</p>
                    </div>
                  </div>
                  {profile?.github && (
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 text-gray-400"><GitBranch size={20} /></div>
                      <div className="min-w-0 pr-4">
                        <p className="text-sm font-bold text-gray-900">GitHub</p>
                        <a href={`https://github.com/${profile.github}`} target="_blank" rel="noreferrer" className="text-sm text-blue-600 hover:underline truncate block">
                          github.com/{profile.github}
                        </a>
                      </div>
                    </div>
                  )}
                  {profile?.website && (
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 text-gray-400"><Link size={20} /></div>
                      <div className="min-w-0 pr-4">
                        <p className="text-sm font-bold text-gray-900">Website</p>
                        <a href={profile.website.startsWith('http') ? profile.website : `https://${profile.website}`} target="_blank" rel="noreferrer" className="text-sm text-blue-600 hover:underline truncate block">
                          {profile.website.replace(/^https?:\/\//, '')}
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Custom Toast Popup */}
      {toast && (
        <div className={`fixed bottom-10 right-10 z-[150] flex items-center gap-3 bg-white border px-5 py-3 rounded-2xl shadow-xl animate-in fade-in slide-in-from-bottom-8 duration-300 ${isError ? 'border-red-200 text-red-600' : 'border-green-200 text-green-600'}`}>
          {isError ? <AlertTriangle size={18} className="text-red-500" /> : <Check size={18} className="text-green-500" />}
          <span className="text-sm font-bold tracking-tight">{toast}</span>
        </div>
      )}
    </div>
  );
}