"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { Mail, Calendar, Activity, Edit3, Save, Loader2, Check, Shield, User, AlertTriangle, Camera, Users, X, MapPin, GitBranch, Link, Briefcase, Plus, Building, DollarSign, Trash2, FileText, ChevronRight } from "lucide-react";
import Cropper from "react-easy-crop";
import { supabase } from "../../supabaseClient";
import VerifiedBadge from "../../components/VerifiedBadge";

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
  const [formData, setFormData] = useState({ username: "", status: "", location: "", github: "", website: "", work_status: "" });
  const [toast, setToast] = useState({ message: "", type: "success" });
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
  
  // Jobs States
  const [userJobs, setUserJobs] = useState([]);
  const [showJobModal, setShowJobModal] = useState(false);
  const [jobForm, setJobForm] = useState({ title: "", company: "", location: "", type: "Full-time", salary: "", tags: "", external_url: "", description: "", experience_level: "Mid-level" });
  const [isPostingJob, setIsPostingJob] = useState(false);
  const [editingJobId, setEditingJobId] = useState(null);
  const [jobToDelete, setJobToDelete] = useState(null);
  const [viewJob, setViewJob] = useState(null);
  
  // Applications States
  const [showApplicantsModal, setShowApplicantsModal] = useState(false);
  const [jobApplicants, setJobApplicants] = useState([]);
  const [loadingApplicants, setLoadingApplicants] = useState(false);
  const [selectedApplicant, setSelectedApplicant] = useState(null);
  const [activeJobForApplicants, setActiveJobForApplicants] = useState(null);

  useEffect(() => {
    let channel;

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

        // Fetch user's job listings
        const { data: jobsData } = await supabase
          .from('jobs')
          .select('*')
          .eq('user_id', targetUserId)
          .order('created_at', { ascending: false });
        if (jobsData) setUserJobs(jobsData);

        if (own) {
          setFormData({ 
            username: profileData.username || "", 
            status: profileData.status || "",
            location: profileData.location || "",
            github: profileData.github || "",
            website: profileData.website || "",
            work_status: profileData.work_status || ""
          });
        }

        // Set up real-time listener for job opportunities
        channel = supabase.channel(`profile-jobs-${targetUserId}-${Date.now()}`)
          .on('postgres_changes', { event: '*', schema: 'public', table: 'jobs', filter: `user_id=eq.${targetUserId}` }, async () => {
            const { data } = await supabase
              .from('jobs')
              .select('*')
              .eq('user_id', targetUserId)
              .order('created_at', { ascending: false });
            if (data) setUserJobs(data);
          })
          .subscribe();
      } catch (error) {
        console.error("Error fetching profile:", error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
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
      setToast({ message: "Username cannot be empty", type: "error" });
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
          work_status: formData.work_status,
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
        work_status: formData.work_status,
        avatar_url: avatarUrl,
        banner_url: bannerUrl
      });
      setFormData({ 
        username: cleanUsername, 
        status: formData.status.trim(), 
        location: formData.location.trim(), 
        github: formData.github.trim(), 
        website: formData.website.trim(),
        work_status: formData.work_status
      });
      setIsEditing(false);
      setImageFile(null);
      setBannerFile(null);
      setToast({ message: "Profile updated successfully", type: "success" });
      setTimeout(() => setToast({ message: "" }), 3000);
    } catch (error) {
      console.error("Error updating profile:", error.message);
      setToast({ message: error.message, type: "error" });
      setTimeout(() => setToast({ message: "" }), 3000);
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
      website: profile?.website || "",
      work_status: profile?.work_status || ""
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
      if (error) {
        if (error.code === '23503') throw new Error("This profile no longer exists.");
        throw error;
      }
      setConnectionStatus('pending_sent');
      
      await supabase.from('notifications').insert({
        receiver_id: profile.id,
        actor_id: currentUser.id,
        type: 'connection_request',
        content: 'wants to connect'
      });
      
      setToast({ message: "Follow request sent", type: "success" });
      setTimeout(() => setToast({ message: "" }), 3000);
    } catch (err) {
      console.error(err);
      setToast({ message: "Failed to follow", type: "error" });
      setTimeout(() => setToast({ message: "" }), 3000);
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
      setToast({ message: "Unfollowed successfully", type: "success" });
      setTimeout(() => setToast({ message: "" }), 3000);
    } catch (err) {
      console.error(err);
      setToast({ message: "Failed to unfollow", type: "error" });
      setTimeout(() => setToast({ message: "" }), 3000);
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
        const { data: users, error: userErr } = await supabase.from('profiles').select('id, username, avatar_url, status, is_verified').in('id', userIds);
        if (userErr) throw userErr;
        setFollowersData(users || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingFollowers(false);
    }
  };

  // --- JOB POSTING LOGIC ---
  const handlePostJob = async (e) => {
    e.preventDefault();
    if (!currentUser) {
      setToast({ message: "Authentication error. Please log in again.", type: "error" });
      setTimeout(() => setToast({ message: "" }), 3000);
      return;
    }
    setIsPostingJob(true);
    try {
      const jobData = {
        title: jobForm.title,
        company: jobForm.company,
        location: jobForm.location,
        type: jobForm.type,
        salary: jobForm.salary,
        tags: (jobForm.tags || "").toString().split(',').map(t => t.trim()).filter(Boolean),
        external_url: jobForm.external_url,
        description: jobForm.description,
        experience_level: jobForm.experience_level,
        user_id: currentUser.id
      };

      if (editingJobId) {
        const { data, error } = await supabase.from('jobs').update(jobData).eq('id', editingJobId).select().single();
        if (error) throw error;
        setUserJobs(userJobs.map(job => job.id === editingJobId ? data : job));
        setToast({ message: "Opportunity updated successfully!", type: "success" });
      } else {
        const { data, error } = await supabase.from('jobs').insert(jobData).select().single();
        if (error) throw error;
        setUserJobs([data, ...userJobs]);
        setToast({ message: "Opportunity broadcasted to the network!", type: "success" });
      }

      setShowJobModal(false);
      setEditingJobId(null);
      setJobForm({ title: "", company: "", location: "", type: "Full-time", salary: "", tags: "", external_url: "", description: "", experience_level: "Mid-level" });
      setTimeout(() => setToast({ message: "" }), 3000);
    } catch (err) {
      setToast({ message: err.message, type: "error" });
      setTimeout(() => setToast({ message: "" }), 3000);
    } finally {
      setIsPostingJob(false);
    }
  };

  const handleDeleteClick = (e, job) => {
    e.stopPropagation();
    setJobToDelete(job);
  };

  const executeDeleteJob = async () => {
    if (!jobToDelete) return;
    try {
      const { error } = await supabase.from('jobs').delete().eq('id', jobToDelete.id);
      if (error) throw error;
      
      setUserJobs(prev => prev.filter(job => job.id !== jobToDelete.id));
      setToast({ message: "Opportunity deleted.", type: "success" });
    } catch (err) {
      setToast({ message: err.message, type: "error" });
    } finally {
      setJobToDelete(null);
      setTimeout(() => setToast({ message: "" }), 3000);
    }
  };

  const handleViewApplicants = async (job) => {
    setActiveJobForApplicants(job);
    setShowApplicantsModal(true);
    setLoadingApplicants(true);
    setJobApplicants([]);
    try {
      const { data, error } = await supabase
        .from('job_applications')
        .select('*, profiles(username, avatar_url, is_verified, github, website, location, status, work_status)')
        .eq('job_id', job.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setJobApplicants(data || []);
    } catch (err) {
      setToast({ message: err.message, type: "error" });
    } finally {
      setLoadingApplicants(false);
    }
  };

  const handleAppAction = async (appId, newStatus, applicantId) => {
    try {
      const { error } = await supabase
        .from('job_applications')
        .update({ status: newStatus })
        .eq('id', appId);

      if (error) throw error;

      if (applicantId) {
        await supabase.from('notifications').insert({
          receiver_id: applicantId,
          actor_id: currentUser.id,
          type: 'message',
          content: `Your job application was ${newStatus}.`
        });
      }

      setJobApplicants(prev => prev.map(app => 
        app.id === appId ? { ...app, status: newStatus } : app
      ));
      if (selectedApplicant && selectedApplicant.id === appId) {
        setSelectedApplicant(prev => ({...prev, status: newStatus}));
      }
    } catch (err) {
      setToast({ message: "Error updating application: " + err.message, type: "error" });
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-20">
        <Loader2 className="animate-spin text-blue-500 dark:text-blue-400 mb-4" size={32} />
        <p className="text-gray-500 dark:text-gray-400 font-black text-xs uppercase tracking-widest">Decrypting Identity...</p>
      </div>
    );
  }

  const userInitial = profile?.username?.[0]?.toUpperCase() || currentUser?.email?.[0]?.toUpperCase() || "I";
  const displayAvatar = imagePreview || profile?.avatar_url;
  const displayBanner = bannerPreview || profile?.banner_url;

  return (
    <div className="w-full flex flex-col bg-transparent animate-in fade-in slide-in-from-bottom-4 duration-700 pb-10 pt-4 px-2">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-gray-900 dark:text-gray-100 tracking-tighter">Profile</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1 font-medium">{isOwnProfile ? "Manage your professional identity and network status." : "Viewing professional network identity."}</p>
      </div>

      {/* --- BANNER CROPPER MODAL --- */}
      {showBannerCropper && bannerPreview && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-gray-900/80 dark:bg-black/80 backdrop-blur-sm" />
          <div className="relative w-full max-w-3xl bg-white dark:bg-gray-900 rounded-[2rem] shadow-2xl overflow-hidden flex flex-col h-[75vh] animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center bg-gray-50 dark:bg-gray-800 z-10 shrink-0">
              <h3 className="font-bold text-gray-900 dark:text-gray-100">Adjust Cover Image</h3>
              <button onClick={() => { setShowBannerCropper(false); setBannerPreview(profile?.banner_url || null); setBannerFile(null); }} className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700">
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
            <div className="p-5 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-800 z-10 flex flex-col sm:flex-row items-center gap-4 shrink-0">
              <input type="range" value={bannerZoom} min={1} max={3} step={0.1} aria-labelledby="Zoom" onChange={(e) => setBannerZoom(e.target.value)} className="w-full accent-blue-600" />
              <button onClick={handleCropComplete} className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl font-bold transition-all shrink-0">Apply Crop</button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-4xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-[2rem] relative overflow-visible shadow-sm mb-10">
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
            <div className="relative w-24 h-24 sm:w-32 sm:h-32 rounded-full border-4 border-white dark:border-gray-900 bg-white dark:bg-gray-900 flex items-center justify-center text-4xl font-black text-gray-700 dark:text-gray-300 shadow-md shrink-0 overflow-hidden group z-10">
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
                    className="flex items-center gap-2 text-sm font-bold text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 px-6 py-2.5 rounded-full border border-gray-300 dark:border-gray-700 transition-all shadow-sm active:scale-95"
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
                      className="flex items-center gap-2 text-sm font-bold text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-900 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400 hover:border-red-200 dark:hover:border-red-800/50 border border-gray-300 dark:border-gray-700 px-6 py-2.5 rounded-full transition-all active:scale-95 disabled:opacity-50"
                    >
                      {connectionProcessing ? <Loader2 size={16} className="animate-spin" /> : <Users size={16} />} Pending
                    </button>
                  )}
                  {connectionStatus === 'pending_received' && (
                     <button 
                      disabled
                      className="flex items-center gap-2 text-sm font-bold text-amber-600 dark:text-amber-500 bg-amber-50 dark:bg-amber-900/20 px-6 py-2.5 rounded-full border border-amber-200 dark:border-amber-800/50 transition-all cursor-default"
                    >
                      <Users size={16} /> Review Request
                    </button>
                  )}
                  {connectionStatus === 'accepted' && (
                    <button 
                      onClick={handleUnfollow}
                      disabled={connectionProcessing}
                      className="flex items-center gap-2 text-sm font-bold text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-900 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400 hover:border-red-200 dark:hover:border-red-800/50 px-6 py-2.5 rounded-full border border-gray-300 dark:border-gray-700 transition-all active:scale-95 disabled:opacity-50"
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
                  <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">Edit Details</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Update your professional identity.</p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={handleCancel} className="px-4 py-2 text-sm font-bold text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors">Cancel</button>
                  <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-full transition-all shadow-sm disabled:opacity-50">
                    {saving ? <Loader2 size={16} className="animate-spin"/> : <Save size={16}/>} Save
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-gray-50 dark:bg-gray-800/50 p-6 rounded-3xl border border-gray-100 dark:border-gray-800">
                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-2 block pl-1">Username</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 font-bold">@</span>
                      <input 
                        type="text" 
                        value={formData.username} 
                        onChange={(e) => setFormData({...formData, username: e.target.value})}
                        className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl py-3 pl-10 pr-4 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all shadow-sm"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-2 block pl-1">Headline / Bio</label>
                    <input 
                      type="text" 
                      value={formData.status} 
                      onChange={(e) => setFormData({...formData, status: e.target.value})}
                      placeholder="e.g. Senior Software Engineer"
                      className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl py-3 px-4 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all shadow-sm"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-2 block pl-1">Location</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500"><MapPin size={14} /></span>
                      <input 
                        type="text" 
                        value={formData.location} 
                        onChange={(e) => setFormData({...formData, location: e.target.value})}
                        placeholder="City, Country"
                        className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl py-3 pl-10 pr-4 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all shadow-sm"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-2 block pl-1">Work Status</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500"><Briefcase size={14} /></span>
                      <select 
                        value={formData.work_status} 
                        onChange={(e) => setFormData({...formData, work_status: e.target.value})}
                        className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl py-3 pl-10 pr-4 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all shadow-sm appearance-none"
                      >
                        <option value="">Not Specified</option>
                        <option value="Open to work">Open to work</option>
                        <option value="Hiring">Hiring</option>
                      </select>
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-2 block pl-1">GitHub Username</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500"><GitBranch size={14} /></span>
                      <input 
                        type="text" 
                        value={formData.github} 
                        onChange={(e) => setFormData({...formData, github: e.target.value})}
                        placeholder="octocat"
                        className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl py-3 pl-10 pr-4 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all shadow-sm"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-2 block pl-1">Website URL</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500"><Link size={14} /></span>
                      <input 
                        type="text" 
                        value={formData.website} 
                        onChange={(e) => setFormData({...formData, website: e.target.value})}
                        placeholder="https://yourdomain.com"
                        className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl py-3 pl-10 pr-4 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all shadow-sm"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="animate-in fade-in duration-300 pt-2">
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                {profile?.username || 'Unknown User'}
                {profile?.is_verified && <VerifiedBadge size={28} />}
              </h2>
              <p className="text-gray-700 dark:text-gray-300 text-base sm:text-lg mt-1.5 font-medium max-w-2xl">
                {profile?.status || 'Software Engineer'}
              </p>
              
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-3 text-sm text-gray-500 dark:text-gray-400 font-medium">
                {profile?.work_status && profile.work_status !== 'None' && (
                  <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border ${profile.work_status === 'Hiring' ? 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-800/50' : 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/50'}`}>
                    <Briefcase size={12} /> {profile.work_status}
                  </span>
                )}
                {profile?.location && (
                  <span className="flex items-center gap-1.5">
                    <MapPin size={16} className="text-gray-400 dark:text-gray-500" /> {profile.location}
                  </span>
                )}
                <div className="relative">
                  <span 
                    onClick={handleViewFollowers}
                    className={`flex items-center gap-1.5 transition-colors ${followersCount > 0 ? 'cursor-pointer hover:text-blue-600 dark:hover:text-blue-400' : ''}`}
                  >
                    <Users size={16} className="text-gray-400 dark:text-gray-500" /> 
                    <span className={followersCount > 0 ? "font-bold text-blue-600" : ""}>
                      {Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(followersCount)}
                    </span> connections
                  </span>

                  {showFollowersList && (
                    <div className="absolute top-full left-0 mt-2 w-64 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                      <div className="p-3 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                        <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Network Nodes</span>
                        <button onClick={() => setShowFollowersList(false)} className="text-gray-400 dark:text-gray-500 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"><X size={14}/></button>
                      </div>
                      <div className="max-h-[170px] overflow-y-auto custom-scrollbar p-2 space-y-1">
                        {loadingFollowers ? (
                          <div className="flex justify-center py-4"><Loader2 size={16} className="animate-spin text-blue-500" /></div>
                        ) : followersData.map(user => (
                          <div key={`follower-${user.id}`} className="flex items-center gap-3 p-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl transition-colors cursor-pointer group">
                            <div className="relative w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center justify-center text-xs font-bold uppercase text-gray-500 dark:text-gray-400 shrink-0 overflow-hidden">
                              {user.avatar_url ? <Image src={user.avatar_url} alt="avatar" fill sizes="32px" className="object-cover" /> : user.username?.substring(0, 2)}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors flex items-center gap-1">
                                @{user.username}
                                {user.is_verified && <VerifiedBadge size={14} />}
                              </p>
                              <p className="text-[9px] text-gray-500 dark:text-gray-400 truncate uppercase tracking-widest">{user.status || 'Active Node'}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* OPPORTUNITIES (JOBS) SECTION */}
              <div className="mt-8 pt-8 border-t border-gray-100 dark:border-gray-800">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">Opportunities</h3>
                  {isOwnProfile && (
                    <button 
                      onClick={() => {
                        setEditingJobId(null);
                        setJobForm({ title: "", company: "", location: "", type: "Full-time", salary: "", tags: "", external_url: "", description: "", experience_level: "Mid-level" });
                        setShowJobModal(true);
                      }} 
                      className="flex items-center gap-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded-xl transition-all shadow-sm active:scale-95"
                    >
                      <Plus size={14} /> Post a Job
                    </button>
                  )}
                </div>
                {userJobs.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {userJobs.map(job => (
                      <div key={job.id} onClick={() => setViewJob(job)} className="p-5 border border-gray-200 dark:border-gray-800 rounded-2xl bg-white dark:bg-gray-900 shadow-sm hover:border-blue-500/30 transition-all group cursor-pointer">
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex-1 min-w-0 pr-3">
                            <h4 className="font-bold text-gray-900 dark:text-gray-100 group-hover:text-blue-600 transition-colors truncate">{job.title}</h4>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-1.5 truncate"><Building size={12} className="shrink-0" /> <span className="truncate">{job.company}</span></p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {isOwnProfile && (
                          <>
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleViewApplicants(job);
                                }}
                                className="text-gray-400 hover:text-green-500 transition-colors p-1"
                                title="View Applicants"
                              >
                                <Users size={14} />
                              </button>
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingJobId(job.id);
                                  setJobForm({
                                    title: job.title || "", company: job.company || "", location: job.location || "",
                                    type: job.type || "Full-time", salary: job.salary || "", tags: (job.tags || []).join(", "),
                                    external_url: job.external_url || "",
                                    description: job.description || "",
                                    experience_level: job.experience_level || "Mid-level"
                                  });
                                  setShowJobModal(true);
                                }}
                                className="text-gray-400 hover:text-blue-500 transition-colors p-1"
                                title="Edit Job"
                              >
                                <Edit3 size={14} />
                              </button>
                              <button 
                                onClick={(e) => handleDeleteClick(e, job)}
                                className="text-gray-400 hover:text-red-500 transition-colors p-1"
                                title="Delete Job"
                              >
                                <Trash2 size={14} />
                              </button>
                          </>
                            )}
                            <span className="text-[9px] px-2.5 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg font-black uppercase tracking-widest border border-blue-200 dark:border-blue-800/50 shrink-0 whitespace-nowrap">{job.type}</span>
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-gray-500 dark:text-gray-400 font-medium mb-4">
                          <span className="flex items-center gap-1 min-w-0"><MapPin size={12} className="shrink-0" /> <span className="truncate">{job.location}</span></span>
                          {job.salary && <span className="flex items-center gap-1 shrink-0"><DollarSign size={12} className="shrink-0" /> {job.salary}</span>}
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {(job.tags || []).slice(0,3).map(t => <span key={t} className="text-[10px] bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-2 py-0.5 rounded text-gray-600 dark:text-gray-300 font-bold">{t}</span>)}
                          {(job.tags || []).length > 3 && <span className="text-[10px] text-gray-400 font-bold px-1 py-0.5">+{(job.tags.length - 3)}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-10 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700">
                    <Briefcase size={32} className="mx-auto text-gray-300 dark:text-gray-600 mb-3" />
                    <p className="text-sm font-bold text-gray-500 dark:text-gray-400">No active opportunities posted.</p>
                  </div>
                )}
              </div>

              <div className="mt-8 pt-8 border-t border-gray-100 dark:border-gray-800">
                <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-6">Contact & Details</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-6 gap-x-4">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 text-gray-400 dark:text-gray-500"><Mail size={20} /></div>
                    <div>
                      <p className="text-sm font-bold text-gray-900 dark:text-gray-100">{isOwnProfile ? "Email" : "Email Visibility"}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{isOwnProfile ? (currentUser?.email || 'N/A') : 'Protected by User'}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 text-gray-400 dark:text-gray-500"><Calendar size={20} /></div>
                    <div>
                      <p className="text-sm font-bold text-gray-900 dark:text-gray-100">Date Joined</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{isOwnProfile && currentUser?.created_at ? new Date(currentUser.created_at).toLocaleDateString() : 'Active Member'}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 text-gray-400 dark:text-gray-500"><Shield size={20} /></div>
                    <div>
                      <p className="text-sm font-bold text-gray-900 dark:text-gray-100">Security Clearance</p>
                      {profile?.is_verified ? (
                        <p className="text-sm text-blue-600 dark:text-blue-400 font-bold flex items-center gap-1 mt-0.5"><VerifiedBadge size={14} /> Verified Identity</p>
                      ) : (
                        <p className="text-sm text-gray-500 dark:text-gray-400 font-medium mt-0.5">Standard Node</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 text-gray-400 dark:text-gray-500"><User size={20} /></div>
                    <div className="min-w-0 pr-4">
                      <p className="text-sm font-bold text-gray-900 dark:text-gray-100">Account Node ID</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 font-mono truncate" title={profile?.id || 'N/A'}>{profile?.id || 'N/A'}</p>
                    </div>
                  </div>
                  {profile?.github && (
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 text-gray-400 dark:text-gray-500"><GitBranch size={20} /></div>
                      <div className="min-w-0 pr-4">
                        <p className="text-sm font-bold text-gray-900 dark:text-gray-100">GitHub</p>
                        <a href={`https://github.com/${profile.github}`} target="_blank" rel="noreferrer" className="text-sm text-blue-600 dark:text-blue-400 hover:underline truncate block">
                          github.com/{profile.github}
                        </a>
                      </div>
                    </div>
                  )}
                  {profile?.website && (
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 text-gray-400 dark:text-gray-500"><Link size={20} /></div>
                      <div className="min-w-0 pr-4">
                        <p className="text-sm font-bold text-gray-900 dark:text-gray-100">Website</p>
                        <a href={profile.website.startsWith('http') ? profile.website : `https://${profile.website}`} target="_blank" rel="noreferrer" className="text-sm text-blue-600 dark:text-blue-400 hover:underline truncate block">
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

      {/* --- POST JOB MODAL --- */}
      {showJobModal && (
        <div className="fixed inset-0 z-[350] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-gray-900/60 dark:bg-black/60 backdrop-blur-sm" onClick={() => setShowJobModal(false)} />
          <div className="relative w-full max-w-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-[2rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 flex justify-between items-center shrink-0">
              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                  {editingJobId ? 'Edit Opportunity' : 'Post an Opportunity'}
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {editingJobId ? 'Update your job listing details.' : 'Broadcast a job to the BeOneOfUs network.'}
                </p>
              </div>
              <button onClick={() => { setShowJobModal(false); setEditingJobId(null); }} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full text-gray-500 dark:text-gray-400 transition-colors"><X size={20}/></button>
            </div>
            <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-4">
              <div>
                <label className="text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-1.5 block">Job Title</label>
                <input type="text" value={jobForm.title} onChange={e => setJobForm({...jobForm, title: e.target.value})} placeholder="e.g. Senior React Developer" className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl py-3 px-4 text-sm text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all shadow-sm" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-1.5 block">Company</label>
                  <input type="text" value={jobForm.company} onChange={e => setJobForm({...jobForm, company: e.target.value})} placeholder="Company Name" className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl py-3 px-4 text-sm text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all shadow-sm" />
                </div>
                <div>
                  <label className="text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-1.5 block">Location</label>
                  <input type="text" value={jobForm.location} onChange={e => setJobForm({...jobForm, location: e.target.value})} placeholder="Remote, City..." className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl py-3 px-4 text-sm text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all shadow-sm" />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-1.5 block">Job Type</label>
                  <select value={jobForm.type} onChange={e => setJobForm({...jobForm, type: e.target.value})} className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl py-3 px-4 text-sm text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all shadow-sm appearance-none">
                    <option>Full-time</option><option>Part-time</option><option>Contract</option><option>Freelance</option><option>Internship</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-1.5 block">Level</label>
                  <select value={jobForm.experience_level} onChange={e => setJobForm({...jobForm, experience_level: e.target.value})} className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl py-3 px-4 text-sm text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all shadow-sm appearance-none">
                    <option>Junior</option><option>Mid-level</option><option>Senior</option><option>Lead / Manager</option><option>Executive</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-1.5 block">Salary Range</label>
                  <input type="text" value={jobForm.salary} onChange={e => setJobForm({...jobForm, salary: e.target.value})} placeholder="$100k - $150k" className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl py-3 px-4 text-sm text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all shadow-sm" />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-1.5 block">Tags (comma separated)</label>
                <input type="text" value={jobForm.tags} onChange={e => setJobForm({...jobForm, tags: e.target.value})} placeholder="React, Node.js, Remote" className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl py-3 px-4 text-sm text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all shadow-sm" />
              </div>
              <div>
                <label className="text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-1.5 block">External Application Link</label>
                <input type="url" value={jobForm.external_url} onChange={e => setJobForm({...jobForm, external_url: e.target.value})} placeholder="https://..." className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl py-3 px-4 text-sm text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all shadow-sm" />
              </div>
              <div>
                <label className="text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-1.5 block">Job Description</label>
                <textarea rows="4" value={jobForm.description} onChange={e => setJobForm({...jobForm, description: e.target.value})} placeholder="Describe the role, responsibilities, and requirements..." className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl py-3 px-4 text-sm text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all shadow-sm resize-none" />
              </div>
            </div>
            <div className="p-6 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 shrink-0 flex gap-3">
               <button onClick={() => { setShowJobModal(false); setEditingJobId(null); }} className="flex-1 py-3 px-4 rounded-xl text-gray-700 dark:text-gray-300 font-bold bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all shadow-sm">Cancel</button>
               <button onClick={handlePostJob} disabled={isPostingJob || !jobForm.title} className="flex-1 py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold transition-all shadow-md active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2">
                 {isPostingJob ? <Loader2 size={16} className="animate-spin" /> : (editingJobId ? 'Update Job' : 'Publish Job')}
               </button>
            </div>
          </div>
        </div>
      )}

      {/* --- VIEW APPLICANTS MODAL --- */}
      {showApplicantsModal && activeJobForApplicants && (
        <div className="fixed inset-0 z-[350] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-gray-900/60 dark:bg-black/60 backdrop-blur-sm" onClick={() => { setShowApplicantsModal(false); setActiveJobForApplicants(null); }} />
          <div className="relative w-full max-w-3xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-[2rem] shadow-2xl flex flex-col max-h-[85vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 sm:p-8 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 flex justify-between items-start shrink-0">
              <div>
                <h2 className="text-2xl font-black text-gray-900 dark:text-gray-100 tracking-tight">Applicants</h2>
                <p className="text-xs text-gray-500 dark:text-gray-400 font-bold mt-2">
                  Reviewing applications for <span className="text-blue-600 dark:text-blue-400">{activeJobForApplicants.title}</span>
                </p>
              </div>
              <button onClick={() => { setShowApplicantsModal(false); setActiveJobForApplicants(null); }} className="p-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full text-gray-500 dark:text-gray-400 transition-colors shadow-sm">
                <X size={18} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-6 bg-gray-50/50 dark:bg-gray-900/50">
              {loadingApplicants ? (
                <div className="flex justify-center py-12"><Loader2 size={32} className="animate-spin text-blue-500" /></div>
              ) : jobApplicants.length === 0 ? (
                <div className="text-center py-12">
                  <Users size={40} className="mx-auto text-gray-300 dark:text-gray-700 mb-4" />
                  <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">No Applicants Yet</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Applications for this role will appear here.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {jobApplicants.map(app => (
                    <div key={app.id} onClick={() => setSelectedApplicant(app)} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-[1.5rem] p-5 hover:border-blue-500/40 hover:shadow-lg transition-all cursor-pointer group flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                      <div className="flex items-center gap-4 min-w-0">
                        <div className="relative w-12 h-12 rounded-xl bg-gray-100 dark:bg-gray-800 overflow-hidden shrink-0 border border-gray-200 dark:border-gray-700 flex items-center justify-center font-bold text-gray-500 dark:text-gray-400 uppercase">
                          {app.profiles?.avatar_url ? <Image src={app.profiles.avatar_url} alt="avatar" fill sizes="48px" className="object-cover" /> : app.profiles?.username?.substring(0, 2) || "??"}
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-gray-900 dark:text-gray-100 font-bold text-base flex items-center gap-1 truncate">
                            @{app.profiles?.username}
                            {app.profiles?.is_verified && <VerifiedBadge size={16} />}
                          </h4>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">
                            Applied on {new Date(app.created_at).toLocaleDateString()}
                          </p>
                          {app.resume_url && (
                            <span className="inline-flex items-center gap-1 mt-2 text-[10px] font-bold text-blue-600 bg-blue-50 dark:bg-blue-900/20 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-800/50">
                              <FileText size={10} /> Resume Attached
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex flex-col sm:items-end shrink-0 gap-2 mt-2 sm:mt-0 w-full sm:w-auto">
                        <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg border text-center ${
                          app.status === 'accepted' ? 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 border-green-200 dark:border-green-800/50' : 
                          app.status === 'declined' ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800/50' : 
                          app.status === 'external_redirect' ? 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-800/50' :
                          'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800/50'
                        }`}>
                          {app.status === 'external_redirect' ? 'External Redirect' : app.status}
                        </span>
                        
                        {app.status !== 'accepted' && app.status !== 'declined' && app.status !== 'external_redirect' && (
                          <div className="flex items-center gap-2 mt-1 w-full sm:w-auto">
                            <button 
                              onClick={(e) => { e.stopPropagation(); handleAppAction(app.id, 'declined', app.user_id); }} 
                              className="flex-1 sm:flex-none px-4 py-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 rounded-xl font-bold text-xs transition-colors border border-red-200 dark:border-red-800/50 uppercase"
                            >
                              Decline
                            </button>
                            <button 
                              onClick={(e) => { e.stopPropagation(); handleAppAction(app.id, 'accepted', app.user_id); }} 
                              className="flex-1 sm:flex-none px-4 py-2 bg-green-600 text-white hover:bg-green-500 rounded-xl font-bold text-xs transition-colors shadow-sm uppercase"
                            >
                              Accept
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* --- SELECTED APPLICANT DETAILS MODAL --- */}
      {selectedApplicant && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-gray-900/60 dark:bg-black/60 backdrop-blur-sm" onClick={() => setSelectedApplicant(null)} />
          <div className="relative w-full max-w-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-[2rem] p-6 sm:p-8 shadow-2xl animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto custom-scrollbar">
            <button onClick={() => setSelectedApplicant(null)} className="absolute top-6 right-6 p-2 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full text-gray-500 dark:text-gray-400 transition-colors shadow-sm">
              <X size={18} />
            </button>
            
            <h2 className="text-xl font-black text-gray-900 dark:text-gray-100 tracking-tight pr-8 mb-4">Applicant Profile</h2>
            
            <div className="flex items-center gap-4 mb-6 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-800">
              <div className="relative w-14 h-14 rounded-2xl bg-gray-200 dark:bg-gray-700 overflow-hidden shrink-0 flex items-center justify-center font-bold text-gray-500 dark:text-gray-400 uppercase border border-gray-200 dark:border-gray-700">
                {selectedApplicant.profiles?.avatar_url ? <Image src={selectedApplicant.profiles.avatar_url} alt="avatar" fill sizes="56px" className="object-cover" /> : selectedApplicant.profiles?.username?.substring(0, 2) || "??"}
              </div>
              <div>
                <h4 className="text-gray-900 dark:text-gray-100 font-bold text-lg flex items-center gap-1">
                  @{selectedApplicant.profiles?.username}
                  {selectedApplicant.profiles?.is_verified && <VerifiedBadge size={16} />}
                </h4>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  {selectedApplicant.profiles?.status && <span className="block text-gray-700 dark:text-gray-300 mb-0.5 font-medium">{selectedApplicant.profiles.status}</span>}
                </p>
              </div>
            </div>

            <div className="space-y-4 mb-8">
              {(selectedApplicant.cover_letter || selectedApplicant.message || selectedApplicant.notes) && (
                <div className="p-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl">
                  <p className="text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-2">Cover Letter</p>
                  <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{selectedApplicant.cover_letter || selectedApplicant.message || selectedApplicant.notes}</p>
                </div>
              )}

              {selectedApplicant.resume_url && (
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/50 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                  <div>
                    <p className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest mb-0.5">Attached Document</p>
                    <p className="text-sm font-bold text-blue-900 dark:text-blue-100">Candidate{`'`}s CV / Resume File</p>
                  </div>
                  <a href={selectedApplicant.resume_url} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-xs transition-colors shadow-sm shrink-0">
                    <FileText size={16} /> Open Resume
                  </a>
                </div>
              )}

              {(selectedApplicant.resume_url || selectedApplicant.portfolio_url || selectedApplicant.email || selectedApplicant.phone || selectedApplicant.profiles?.github || selectedApplicant.profiles?.website || selectedApplicant.profiles?.location) && (
                <div className="p-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl space-y-3">
                  <p className="text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-2">Contact & Links</p>
                  {selectedApplicant.email && <p className="text-sm flex items-center gap-2"><strong className="text-gray-900 dark:text-gray-100">Email:</strong> <a href={`mailto:${selectedApplicant.email}`} className="text-blue-600 hover:underline">{selectedApplicant.email}</a></p>}
                  {selectedApplicant.phone && <p className="text-sm flex items-center gap-2"><strong className="text-gray-900 dark:text-gray-100">Phone:</strong> {selectedApplicant.phone}</p>}
                  {selectedApplicant.profiles?.location && <p className="text-sm flex items-center gap-2"><strong className="text-gray-900 dark:text-gray-100">Location:</strong> {selectedApplicant.profiles.location}</p>}
                  {selectedApplicant.portfolio_url && <p className="text-sm flex items-center gap-2"><strong className="text-gray-900 dark:text-gray-100">Portfolio:</strong> <a href={selectedApplicant.portfolio_url.startsWith('http') ? selectedApplicant.portfolio_url : `https://${selectedApplicant.portfolio_url}`} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">Portfolio Link</a></p>}
                  {selectedApplicant.profiles?.github && <p className="text-sm flex items-center gap-2"><strong className="text-gray-900 dark:text-gray-100">GitHub:</strong> <a href={`https://github.com/${selectedApplicant.profiles.github}`} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">github.com/{selectedApplicant.profiles.github}</a></p>}
                  {selectedApplicant.profiles?.website && <p className="text-sm flex items-center gap-2"><strong className="text-gray-900 dark:text-gray-100">Website:</strong> <a href={selectedApplicant.profiles.website.startsWith('http') ? selectedApplicant.profiles.website : `https://${selectedApplicant.profiles.website}`} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">{selectedApplicant.profiles.website.replace(/^https?:\/\//, '')}</a></p>}
                </div>
              )}
            </div>

            <div className="flex items-center gap-3 pt-4 border-t border-gray-100 dark:border-gray-800">
              {selectedApplicant.status !== 'accepted' && selectedApplicant.status !== 'declined' && selectedApplicant.status !== 'external_redirect' ? (
                <>
                  <button 
                    onClick={() => { handleAppAction(selectedApplicant.id, 'declined', selectedApplicant.user_id); setSelectedApplicant(prev => ({...prev, status: 'declined'})); }} 
                    className="flex-1 py-3.5 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 rounded-xl font-bold transition-colors border border-red-200 dark:border-red-800/50"
                  >
                    Decline Application
                  </button>
                  <button 
                    onClick={() => { handleAppAction(selectedApplicant.id, 'accepted', selectedApplicant.user_id); setSelectedApplicant(prev => ({...prev, status: 'accepted'})); }} 
                    className="flex-1 py-3.5 bg-green-600 hover:bg-green-500 text-white rounded-xl font-bold transition-colors shadow-sm"
                  >
                    Accept Application
                  </button>
                </>
              ) : (
                <div className="flex-1 text-center py-3.5 bg-gray-50 dark:bg-gray-800 rounded-xl text-gray-500 dark:text-gray-400 font-bold uppercase tracking-widest text-xs border border-gray-200 dark:border-gray-700">
                  Status: {selectedApplicant.status === 'external_redirect' ? 'External Redirect' : selectedApplicant.status}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* --- VIEW JOB DETAILS MODAL --- */}
      {viewJob && (
        <div className="fixed inset-0 z-[350] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-gray-900/60 dark:bg-black/60 backdrop-blur-sm" onClick={() => setViewJob(null)} />
          <div className="relative w-full max-w-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-[2rem] shadow-2xl p-6 sm:p-8 animate-in fade-in zoom-in-95 duration-200">
            <button onClick={() => setViewJob(null)} className="absolute top-6 right-6 p-2 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full text-gray-500 dark:text-gray-400 transition-colors shadow-sm">
              <X size={18} />
            </button>
            <h2 className="text-2xl font-black text-gray-900 dark:text-gray-100 tracking-tight pr-8">{viewJob.title}</h2>
            <p className="text-sm font-bold text-blue-600 dark:text-blue-400 mt-1 mb-6 flex items-center gap-2"><Building size={16}/> {viewJob.company}</p>
            
            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 dark:text-gray-300 font-medium mb-6">
              <span className="flex items-center gap-1.5 bg-gray-50 dark:bg-gray-800 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700"><Briefcase size={16}/> {viewJob.type}</span>
              {viewJob.experience_level && <span className="flex items-center gap-1.5 bg-gray-50 dark:bg-gray-800 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700"><User size={16}/> {viewJob.experience_level}</span>}
              <span className="flex items-center gap-1.5 bg-gray-50 dark:bg-gray-800 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700"><MapPin size={16}/> {viewJob.location}</span>
              {viewJob.salary && <span className="flex items-center gap-1.5 bg-gray-50 dark:bg-gray-800 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700"><DollarSign size={16}/> {viewJob.salary}</span>}
            </div>

            {viewJob.tags && viewJob.tags.length > 0 && (
              <div className="mb-6">
                <p className="text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-2 block pl-1">Tags / Tech Stack</p>
                <div className="flex flex-wrap gap-2">
                  {viewJob.tags.map(t => (
                    <span key={t} className="text-xs bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 px-3 py-1.5 rounded-lg font-bold border border-blue-200 dark:border-blue-800/50">{t}</span>
                  ))}
                </div>
              </div>
            )}
            
            {viewJob.description && (
              <div className="mb-6">
                <p className="text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-2 block pl-1">Description</p>
                <div className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">{viewJob.description}</div>
              </div>
            )}

            {viewJob.external_url && (
              <div className="pt-6 border-t border-gray-100 dark:border-gray-800 mt-6">
                <a 
                  href={viewJob.external_url} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="flex items-center justify-center gap-2 w-full py-3.5 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 font-bold rounded-xl transition-all shadow-md hover:bg-gray-800 dark:hover:bg-white active:scale-95 text-sm"
                >
                  <Link size={16} /> Apply Externally
                </a>
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- DELETE OPPORTUNITY MODAL --- */}
      {jobToDelete && (
        <div className="fixed inset-0 z-[350] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-gray-900/60 dark:bg-black/60 backdrop-blur-sm" onClick={() => setJobToDelete(null)} />
          <div className="relative w-full max-w-sm bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-[2rem] p-8 shadow-2xl text-center animate-in fade-in zoom-in-95 duration-200">
            <div className="w-16 h-16 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-500 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-100 dark:border-red-900/50">
              <AlertTriangle size={32} />
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">Delete Opportunity?</h3>
            <p className="text-gray-500 dark:text-gray-400 text-sm mb-8 leading-relaxed">
              Are you sure you want to permanently remove <span className="font-bold text-gray-700 dark:text-gray-300">{jobToDelete.title}</span>? This action cannot be undone.
            </p>
            <div className="flex flex-col gap-3">
              <button onClick={executeDeleteJob} className="w-full bg-red-600 hover:bg-red-500 text-white font-bold py-3.5 rounded-xl transition-all shadow-md active:scale-95 text-sm">
                Confirm Delete
              </button>
              <button onClick={() => setJobToDelete(null)} className="w-full bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-bold py-3.5 rounded-xl transition-all border border-gray-200 dark:border-gray-700 shadow-sm text-sm">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Toast Popup */}
      {toast.message && (
        <div className={`fixed bottom-10 right-10 z-[150] flex items-center gap-3 bg-white dark:bg-gray-900 border px-5 py-3 rounded-2xl shadow-xl animate-in fade-in slide-in-from-bottom-8 duration-300 ${toast.type === 'error' ? 'border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-500' : 'border-green-200 dark:border-green-900/50 text-green-600 dark:text-green-500'}`}>
          {toast.type === 'error' ? <AlertTriangle size={18} className="text-red-500" /> : <Check size={18} className="text-green-500" />}
          <span className="text-sm font-bold tracking-tight">{toast.message}</span>
        </div>
      )}
    </div>
  );
}