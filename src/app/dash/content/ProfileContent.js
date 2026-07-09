"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { Mail, Calendar, Activity, Edit3, Save, Loader2, Check, Shield, User, AlertTriangle, Camera, Users, X, MapPin, GitBranch, Globe, Link, Briefcase, Plus, Building, DollarSign, Trash2, FileText, ChevronRight, ChevronLeft, Share2, ExternalLink, Award, Eye, EyeOff, Lock, Heart, MessageSquare, Code2, Video, Trash, BookOpen } from "lucide-react";
import Cropper from "react-easy-crop";
import { supabase } from "../../supabaseClient";
import VerifiedBadge from "../../components/VerifiedBadge";
import PremiumBadge from "../../components/PremiumBadge";
import GitHubStats from "../../components/GitHubStats";
import { StoryRing, useUserStories, StoryViewer, StoryCreator } from "./Stories";
import { useLanguage } from "../../../lib/i18n";

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
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [isOwnProfile, setIsOwnProfile] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({ username: "", status: "", location: "", github: "", website: "", work_status: "", full_name: "", headline: "" });
  const [skillsInput, setSkillsInput] = useState("");
  const [editSkills, setEditSkills] = useState([]);
  const [editExperience, setEditExperience] = useState([]);
  const [editEducation, setEditEducation] = useState([]);
  const [editCerts, setEditCerts] = useState([]);
  const [toast, setToast] = useState({ message: "", type: "success" });
  const [visibility, setVisibility] = useState({ bio: true, location: true, github: true, website: true, work_status: true, certificates: true, posts: true, premium_badge: true });
  const [savingVisibility, setSavingVisibility] = useState(false);
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

  useEffect(() => {
    if (!showJobModal) return;
    const onKey = (e) => { if (e.key === "Escape") { setShowJobModal(false); setEditingJobId(null); } };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [showJobModal]);

  // Applications States
  const [showApplicantsModal, setShowApplicantsModal] = useState(false);
  const [jobApplicants, setJobApplicants] = useState([]);
  const [loadingApplicants, setLoadingApplicants] = useState(false);
  const [selectedApplicant, setSelectedApplicant] = useState(null);
  const [activeJobForApplicants, setActiveJobForApplicants] = useState(null);

  // Interview room creation state
  const [showInterviewModal, setShowInterviewModal] = useState(false);
  const [interviewTarget, setInterviewTarget] = useState(null); // { applicant, job }
  const [interviewQuestions, setInterviewQuestions] = useState([{ text: '', context: '' }]);
  const [creatingInterview, setCreatingInterview] = useState(false);
  const [interviewToast, setInterviewToast] = useState('');

  // Story viewer state
  const [storyViewerOpen, setStoryViewerOpen] = useState(false);

  // Posts & Liked posts
  const [profilePosts, setProfilePosts] = useState([]);
  const [likedPosts, setLikedPosts] = useState([]);
  const postsScrollRef = useRef(null);
  const likedScrollRef = useRef(null);
  const [postsEdge, setPostsEdge] = useState({ left: false, right: true });
  const [likedEdge, setLikedEdge] = useState({ left: false, right: true });

  // Stories for the profile being viewed (profile?.id = null while loading → hook handles it)
  const { hasStory, stories: profileStories } = useUserStories(profile?.id);

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

        // Fetch connections count via API to bypass RLS (RLS filters to viewer's rows only)
        const countData = await fetch(`/api/connections/count?user_id=${targetUserId}`)
          .then(r => r.ok ? r.json() : { count: 0 })
          .catch(() => ({ count: 0 }));
        setFollowersCount(countData.count || 0);

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

        setPostsEdge({ left: false, right: true });
        setLikedEdge({ left: false, right: true });

        // Fetch user's posts
        const { data: postsData } = await supabase
          .from('posts')
          .select('id, title, content, image_url, image_fit, code_snippet, created_at, likes(user_id), comments(id)')
          .eq('user_id', targetUserId)
          .order('created_at', { ascending: false })
          .limit(20);
        if (postsData) setProfilePosts(postsData);

        // Fetch posts this user liked
        const { data: likedData } = await supabase
          .from('likes')
          .select('posts(id, title, content, image_url, image_fit, code_snippet, created_at, profiles:user_id(username, avatar_url), likes(user_id), comments(id))')
          .eq('user_id', targetUserId)
          .limit(20);
        if (likedData) setLikedPosts(likedData.map(l => l.posts).filter(Boolean));

        if (own) {
          setFormData({
            username: profileData.username || "",
            status: profileData.status || "",
            location: profileData.location || "",
            github: profileData.github || "",
            website: profileData.website || "",
            work_status: profileData.work_status || "",
            full_name: profileData.full_name || "",
            headline: profileData.headline || "",
          });
          setEditSkills(Array.isArray(profileData.skills) ? profileData.skills : []);
          setEditExperience(Array.isArray(profileData.experience) ? profileData.experience : []);
          setEditEducation(Array.isArray(profileData.education) ? profileData.education : []);
          setEditCerts(Array.isArray(profileData.certifications) ? profileData.certifications : []);
          if (profileData.profile_visibility) {
            setVisibility({ bio: true, location: true, github: true, website: true, work_status: true, certificates: true, posts: true, premium_badge: true, ...profileData.profile_visibility });
          }
        } else {
          // Apply viewed user's visibility settings when viewing another profile
          if (profileData.profile_visibility) {
            setVisibility({ bio: true, location: true, github: true, website: true, work_status: true, certificates: true, posts: true, premium_badge: true, ...profileData.profile_visibility });
          }
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

  // Upload an image and persist it to the profile IMMEDIATELY — no need to enter
  // edit mode or press the big Save (which also gates on username). Mirrors the
  // org-console flow. Returns true on success.
  const commitImage = async (kind, file) => {
    if (!file || !currentUser) return false;
    if (!file.type?.startsWith('image/')) { setToast({ message: t('profile.err_choose_image'), type: 'error' }); setTimeout(() => setToast({ message: '' }), 3000); return false; }
    if (file.size > 6 * 1024 * 1024) { setToast({ message: t('profile.err_image_size'), type: 'error' }); setTimeout(() => setToast({ message: '' }), 3000); return false; }
    setSaving(true);
    try {
      const ext = (file.name?.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
      const fileName = `${kind}-${currentUser.id}-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from('avatars').upload(fileName, file, { upsert: true, contentType: file.type || 'image/jpeg' });
      if (upErr) throw upErr;
      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(fileName);
      const col = kind === 'avatar' ? 'avatar_url' : 'banner_url';
      const { error: updErr } = await supabase.from('profiles').update({ [col]: urlData.publicUrl }).eq('id', currentUser.id);
      if (updErr) throw updErr;
      setProfile((prev) => ({ ...prev, [col]: urlData.publicUrl }));
      if (kind === 'avatar') { setImageFile(null); setImagePreview(null); } else { setBannerFile(null); setBannerPreview(null); }
      setToast({ message: kind === 'avatar' ? t('profile.photo_updated') : t('profile.cover_updated'), type: 'success' });
      setTimeout(() => setToast({ message: '' }), 2500);
      return true;
    } catch (err) {
      console.error('Image upload error:', err?.message || err);
      setToast({ message: err?.message || t('profile.err_upload'), type: 'error' });
      setTimeout(() => setToast({ message: '' }), 3500);
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result);
      reader.readAsDataURL(file);
      // Persist immediately so the photo saves without the full-form Save.
      commitImage('avatar', file);
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
      const croppedFile = new File([croppedImageBlob], "banner.jpg", { type: "image/jpeg" });
      setBannerPreview(URL.createObjectURL(croppedImageBlob));
      setShowBannerCropper(false);
      // Persist the cover immediately — no need to press the form Save afterwards.
      await commitImage('banner', croppedFile);
    } catch (e) {
      console.error(e);
      setToast({ message: t('profile.err_crop'), type: "error" });
      setTimeout(() => setToast({ message: "" }), 3000);
    }
  };

  const handleSave = async () => {
    const cleanUsername = formData.username.trim().replace(/\s+/g, '_').toLowerCase();
    if (!cleanUsername) {
      setToast({ message: t('profile.err_username_empty'), type: "error" });
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
          full_name: formData.full_name.trim(),
          headline: formData.headline?.trim() || null,
          status: formData.status.trim(),
          location: formData.location.trim(),
          github: formData.github.trim(),
          website: formData.website.trim(),
          work_status: formData.work_status,
          skills: editSkills,
          experience: editExperience,
          education: editEducation,
          certifications: editCerts,
          avatar_url: avatarUrl,
          banner_url: bannerUrl
        })
        .eq('id', currentUser.id);

      if (error) {
        if (error.code === '23505') throw new Error(t('profile.err_username_taken'));
        throw error;
      }

      setProfile({
        ...profile,
        username: cleanUsername,
        full_name: formData.full_name.trim(),
        headline: formData.headline?.trim() || null,
        status: formData.status.trim(),
        location: formData.location.trim(),
        github: formData.github.trim(),
        website: formData.website.trim(),
        work_status: formData.work_status,
        skills: editSkills,
        experience: editExperience,
        education: editEducation,
        certifications: editCerts,
        avatar_url: avatarUrl,
        banner_url: bannerUrl
      });
      setFormData({
        username: cleanUsername,
        full_name: formData.full_name.trim(),
        status: formData.status.trim(),
        location: formData.location.trim(),
        github: formData.github.trim(),
        website: formData.website.trim(),
        work_status: formData.work_status
      });
      setIsEditing(false);
      setImageFile(null);
      setBannerFile(null);
      setToast({ message: t('profile.profile_updated'), type: "success" });
      setTimeout(() => setToast({ message: "" }), 3000);
    } catch (error) {
      console.error("Error updating profile:", error.message);
      setToast({ message: error.message, type: "error" });
      setTimeout(() => setToast({ message: "" }), 3000);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveVisibility = async () => {
    if (!currentUser) return;
    setSavingVisibility(true);
    try {
      const { error, data } = await supabase
        .from('profiles')
        .update({ profile_visibility: visibility })
        .eq('id', currentUser.id)
        .select('profile_visibility')
        .single();
      console.log('Visibility update result:', { data, error });
      if (error) throw error;
      setProfile(prev => ({ ...prev, profile_visibility: visibility }));
      setToast({ message: t('profile.visibility_saved'), type: "success" });
      setTimeout(() => setToast({ message: "" }), 3000);
    } catch (err) {
      const msg = err?.message || err?.details || err?.hint || err?.code || JSON.stringify(err);
      console.error('Visibility save error:', msg, err);
      setToast({ message: msg || t('profile.err_visibility'), type: "error" });
      setTimeout(() => setToast({ message: "" }), 3000);
    } finally {
      setSavingVisibility(false);
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
      work_status: profile?.work_status || "",
      full_name: profile?.full_name || ""
    });
    setEditSkills(Array.isArray(profile?.skills) ? profile.skills : []);
    setSkillsInput("");
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
        if (error.code === '23503') throw new Error(t('profile.err_profile_gone'));
        throw error;
      }
      setConnectionStatus('pending_sent');
      
      await supabase.from('notifications').insert({
        receiver_id: profile.id,
        actor_id: currentUser.id,
        type: 'connection_request',
        content: 'wants to connect'
      });
      
      setToast({ message: t('profile.follow_sent'), type: "success" });
      setTimeout(() => setToast({ message: "" }), 3000);
    } catch (err) {
      console.error(err);
      setToast({ message: t('profile.err_follow'), type: "error" });
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
      setToast({ message: t('profile.unfollowed'), type: "success" });
      setTimeout(() => setToast({ message: "" }), 3000);
    } catch (err) {
      console.error(err);
      setToast({ message: t('profile.err_unfollow'), type: "error" });
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
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`/api/connections/list?user_id=${profile.id}`, {
        headers: session ? { Authorization: `Bearer ${session.access_token}` } : {},
      });
      const data = await res.json();
      setFollowersData(data.users || []);
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
      setToast({ message: t('profile.err_auth'), type: "error" });
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
        tags: (jobForm.tags || "").toString().split(',').map(tag => tag.trim()).filter(Boolean),
        external_url: jobForm.external_url,
        description: jobForm.description,
        experience_level: jobForm.experience_level,
        user_id: currentUser.id
      };

      if (editingJobId) {
        const { data, error } = await supabase.from('jobs').update(jobData).eq('id', editingJobId).select().single();
        if (error) throw error;
        setUserJobs(userJobs.map(job => job.id === editingJobId ? data : job));
        setToast({ message: t('profile.job_updated'), type: "success" });
      } else {
        const { data, error } = await supabase.from('jobs').insert(jobData).select().single();
        if (error) throw error;
        setUserJobs([data, ...userJobs]);
        setToast({ message: t('profile.job_posted'), type: "success" });
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
      setToast({ message: t('profile.job_deleted'), type: "success" });
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

  const handleAppAction = async (appId, newStatus, applicantId, jobTitle) => {
    const customMessage = window.prompt(t('profile.app_message_prompt'));
    if (customMessage === null) return; // Cancel if the user clicks 'Cancel' on the prompt

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

        // Trigger email notification
        try {
          const { data: { session } } = await supabase.auth.getSession();
          const emailRes = await fetch('/api/send-app-email', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(session ? { Authorization: `Bearer ${session.access_token}` } : {}),
            },
            body: JSON.stringify({
              applicationId: appId,
              status: newStatus,
              jobTitle: jobTitle || 'a recent role',
              customMessage
            })
          });
          if (!emailRes.ok) {
            const errData = await emailRes.json().catch(() => ({}));
            console.error('Failed to send email notification:', errData.error || emailRes.statusText);
          }
        } catch (emailErr) {
          console.error('Email API error:', emailErr);
        }
      }

      setJobApplicants(prev => prev.map(app => 
        app.id === appId ? { ...app, status: newStatus } : app
      ));
      if (selectedApplicant && selectedApplicant.id === appId) {
        setSelectedApplicant(prev => ({...prev, status: newStatus}));
      }
      setToast({ message: t('profile.app_action_success', { status: newStatus }), type: "success" });
    } catch (err) {
      setToast({ message: t('profile.err_app_update') + err.message, type: "error" });
    }
  };

  const openInterviewModal = (applicant, job) => {
    setInterviewTarget({ applicant, job });
    setInterviewQuestions([{ text: '', context: '' }]);
    setShowInterviewModal(true);
  };

  const handleCreateInterview = async () => {
    const validQuestions = interviewQuestions.filter(q => q.text.trim());
    if (!validQuestions.length) return;
    if (!currentUser || !interviewTarget) return;
    setCreatingInterview(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/interview/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({
          applicantId: interviewTarget.applicant.user_id,
          jobId: interviewTarget.job?.id || null,
          applicationId: interviewTarget.applicant.id,
          jobTitle: interviewTarget.job?.title || 'Position',
          company: interviewTarget.job?.company || null,
          questions: validQuestions,
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || t('profile.err_create_room'));
      setShowInterviewModal(false);
      setInterviewToast(t('profile.interview_created'));
      setTimeout(() => setInterviewToast(''), 4000);
    } catch (err) {
      setInterviewToast(t('profile.error_prefix') + err.message);
      setTimeout(() => setInterviewToast(''), 4000);
    } finally {
      setCreatingInterview(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-20">
        <Loader2 className="animate-spin text-blue-500 dark:text-blue-400 mb-4" size={32} />
        <p className="text-gray-500 dark:text-gray-400 font-black text-xs uppercase tracking-widest">{t('profile.loading')}</p>
      </div>
    );
  }

  const scrollRow = (ref, dir) => {
    if (ref.current) ref.current.scrollBy({ left: dir === 'right' ? 290 : -290, behavior: 'smooth' });
  };
  const syncEdge = (ref, setState) => {
    const el = ref.current;
    if (!el) return;
    setState({ left: el.scrollLeft > 8, right: el.scrollLeft < el.scrollWidth - el.clientWidth - 8 });
  };

  const userInitial = profile?.username?.[0]?.toUpperCase() || currentUser?.email?.[0]?.toUpperCase() || "I";
  const displayAvatar = imagePreview || profile?.avatar_url;
  const displayBanner = bannerPreview || profile?.banner_url;


  return (
    <div className="w-full flex flex-col bg-transparent animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10 pt-4 px-2 sm:px-4 md:px-6">
      <div className="mb-6 max-w-6xl w-full mx-auto">
        <h1 className="text-2xl font-black text-gray-900 dark:text-gray-100 tracking-tighter">{t('profile.page_title')}</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1 font-medium">{isOwnProfile ? t('profile.subtitle_own') : t('profile.subtitle_other')}</p>
      </div>


      {/* --- BANNER CROPPER MODAL --- */}
      {showBannerCropper && bannerPreview && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-gray-900/80 dark:bg-black/80 backdrop-blur-sm" />
          <div className="relative w-full max-w-3xl bg-white dark:bg-gray-900 rounded-[2rem] shadow-2xl overflow-hidden flex flex-col h-[75vh] animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center bg-gray-50 dark:bg-gray-800 z-10 shrink-0">
              <h3 className="font-bold text-gray-900 dark:text-gray-100">{t('profile.adjust_cover')}</h3>
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
              <button onClick={handleCropComplete} className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl font-bold transition-all shrink-0">{t('profile.apply_crop')}</button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-6xl w-full mx-auto bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl sm:rounded-[2.5rem] relative overflow-visible shadow-lg sm:shadow-xl shadow-gray-200/50 dark:shadow-black/50 mb-10 transition-all duration-300">
        {/* Banner Section */}
        <div className="h-28 sm:h-40 md:h-48 w-full bg-gradient-to-tr from-brand-500 via-brand-600 to-trust-500 rounded-t-2xl sm:rounded-t-[2.5rem] relative overflow-hidden group">
          {displayBanner ? (
            <Image src={displayBanner} alt={t('profile.banner_alt')} fill priority quality={75} className="object-cover object-center" />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-tr from-blue-500/20 to-purple-500/20 mix-blend-overlay"></div>
          )}
          
          {isOwnProfile && (
            <div
              onClick={() => bannerInputRef.current?.click()}
              className="absolute inset-0 bg-gray-900/40 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer z-10"
            >
              <Camera size={32} className="text-white mb-2" />
              <span className="text-xs font-bold uppercase tracking-widest text-white bg-black/50 px-4 py-1.5 rounded-full backdrop-blur-sm border border-white/20">{t('profile.change_cover')}</span>
            </div>
          )}
          {/* Always-visible cover button (mobile has no hover) */}
          {isOwnProfile && (
            <button
              onClick={() => bannerInputRef.current?.click()}
              disabled={saving}
              className="absolute top-3 right-3 z-20 inline-flex items-center gap-1.5 text-xs font-bold text-white bg-black/45 hover:bg-black/60 backdrop-blur-sm border border-white/20 px-3 py-1.5 rounded-full transition-colors disabled:opacity-60"
            >
              {saving ? <Loader2 size={13} className="animate-spin" /> : <Camera size={13} />} {t('profile.cover')}
            </button>
          )}
        </div>
        <input type="file" ref={bannerInputRef} onChange={handleBannerFileChange} accept="image/*" className="hidden" />
        
        <div className="px-4 sm:px-8 md:px-12 relative pb-10 sm:pb-12">
          {/* Header Area with Avatar and Actions */}
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4 sm:gap-6 -mt-12 sm:-mt-16 md:-mt-20 mb-6 sm:mb-8">
            {/* Avatar + Story Ring */}
            <StoryRing
              hasStory={hasStory}
              viewed={false}
              onClick={hasStory && !isEditing ? () => setStoryViewerOpen(true) : undefined}
            >
              <div className="relative w-20 h-20 sm:w-28 sm:h-28 md:w-36 md:h-36 rounded-full border-4 sm:border-[5px] md:border-[6px] border-white dark:border-gray-900 bg-white dark:bg-gray-900 flex items-center justify-center text-3xl sm:text-4xl font-black text-gray-700 dark:text-gray-300 shadow-xl shrink-0 overflow-hidden group z-10 transition-transform hover:scale-105 duration-300">
                {displayAvatar ? (
                  <Image src={displayAvatar} alt={t('profile.avatar_alt_main')} fill sizes="128px" className="object-cover object-center" />
                ) : (
                  userInitial
                )}

                {isEditing && (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute inset-0 bg-gray-900/60 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer z-10"
                  >
                    <Camera size={24} className="text-white mb-1" />
                    <span className="text-[9px] font-bold uppercase tracking-widest text-white">{t('profile.change')}</span>
                  </div>
                )}
              </div>
            </StoryRing>
            <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />

            {/* Action Buttons */}
            <div className="flex items-center gap-2 pt-4 sm:pt-0 z-10 pb-2 sm:pb-4 flex-wrap">
              {isOwnProfile ? (
                !isEditing && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={saving}
                      title={t('profile.change_photo_title')}
                      className="flex items-center gap-1.5 text-sm font-bold text-gray-700 dark:text-gray-200 bg-white/90 dark:bg-gray-800/90 backdrop-blur-md hover:bg-gray-50 dark:hover:bg-gray-700 px-3 sm:px-4 py-2.5 rounded-full border border-gray-200 dark:border-gray-700 transition-all shadow-sm hover:shadow-md active:scale-95 disabled:opacity-60"
                    >
                      {saving ? <Loader2 size={16} className="animate-spin" /> : <Camera size={16} />} <span className="hidden sm:inline">{t('profile.photo')}</span>
                    </button>
                    <button
                      onClick={() => setIsEditing(true)}
                      className="flex items-center gap-1.5 text-sm font-bold text-gray-700 dark:text-gray-200 bg-white/90 dark:bg-gray-800/90 backdrop-blur-md hover:bg-gray-50 dark:hover:bg-gray-700 px-3 sm:px-5 py-2.5 rounded-full border border-gray-200 dark:border-gray-700 transition-all shadow-sm hover:shadow-md active:scale-95"
                    >
                      <Edit3 size={16} /> <span className="hidden xs:inline sm:inline">{t('profile.edit_profile')}</span>
                    </button>
                    <button
                      onClick={() => setStoryViewerOpen("create")}
                      className="flex items-center gap-1.5 text-sm font-bold text-white bg-gradient-to-r from-violet-600 to-pink-600 hover:from-violet-500 hover:to-pink-500 px-3 sm:px-4 py-2.5 rounded-full transition-all shadow-sm hover:shadow-md active:scale-95"
                    >
                      <Plus size={15} /> <span className="hidden sm:inline">{t('profile.story')}</span>
                    </button>
                    {profile?.username && (
                      <>
                        <a
                          href={`/u/${profile.username}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          title={t('profile.view_public')}
                          className="flex items-center gap-1.5 text-sm font-bold text-gray-700 dark:text-gray-200 bg-white/90 dark:bg-gray-800/90 backdrop-blur-md hover:bg-gray-50 dark:hover:bg-gray-700 px-3 sm:px-4 py-2.5 rounded-full border border-gray-200 dark:border-gray-700 transition-all shadow-sm hover:shadow-md active:scale-95"
                        >
                          <ExternalLink size={15} /> <span className="hidden sm:inline">{t('profile.public')}</span>
                        </a>
                        <a
                          href={`/resume/${profile.username}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          title={t('profile.generate_resume')}
                          className="flex items-center gap-1.5 text-sm font-bold text-white bg-blue-600/90 hover:bg-blue-500 backdrop-blur-md px-3 sm:px-4 py-2.5 rounded-full transition-all shadow-sm hover:shadow-md active:scale-95"
                        >
                          <FileText size={15} /> <span className="hidden sm:inline">{t('profile.resume')}</span>
                        </a>
                      </>
                    )}
                  </div>
                )
              ) : (
                <>
                  {connectionStatus === 'none' && (
                    <button 
                      onClick={handleFollow}
                      disabled={connectionProcessing}
                      className="flex items-center gap-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 px-8 py-3 rounded-full transition-all shadow-md hover:shadow-lg active:scale-95 disabled:opacity-50"
                    >
                      {connectionProcessing ? <Loader2 size={18} className="animate-spin" /> : <Users size={18} />} {t('profile.follow')}
                    </button>
                  )}
                  {connectionStatus === 'pending_sent' && (
                    <button 
                      onClick={handleUnfollow}
                      disabled={connectionProcessing}
                      className="flex items-center gap-2 text-sm font-bold text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-900 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400 hover:border-red-200 dark:hover:border-red-800/50 border border-gray-300 dark:border-gray-700 px-8 py-3 rounded-full transition-all active:scale-95 disabled:opacity-50"
                    >
                      {connectionProcessing ? <Loader2 size={18} className="animate-spin" /> : <Users size={18} />} {t('profile.pending')}
                    </button>
                  )}
                  {connectionStatus === 'pending_received' && (
                     <button 
                      disabled
                      className="flex items-center gap-2 text-sm font-bold text-amber-600 dark:text-amber-500 bg-amber-50 dark:bg-amber-900/20 px-8 py-3 rounded-full border border-amber-200 dark:border-amber-800/50 transition-all cursor-default shadow-sm"
                    >
                      <Users size={18} /> {t('profile.review_request')}
                    </button>
                  )}
                  {connectionStatus === 'accepted' && (
                    <button 
                      onClick={handleUnfollow}
                      disabled={connectionProcessing}
                      className="flex items-center gap-2 text-sm font-bold text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-900 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400 hover:border-red-200 dark:hover:border-red-800/50 px-8 py-3 rounded-full border border-gray-300 dark:border-gray-700 transition-all active:scale-95 disabled:opacity-50"
                    >
                      {connectionProcessing ? <Loader2 size={18} className="animate-spin" /> : <Users size={18} />} {t('profile.unfollow')}
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
                  <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">{t('profile.edit_details')}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{t('profile.edit_details_desc')}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={handleCancel} className="px-4 py-2 text-sm font-bold text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors">{t('profile.cancel')}</button>
                  <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-full transition-all shadow-sm disabled:opacity-50">
                    {saving ? <Loader2 size={16} className="animate-spin"/> : <Save size={16}/>} {t('profile.save')}
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-gray-50 dark:bg-gray-800/50 p-6 rounded-3xl border border-gray-100 dark:border-gray-800">
                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-2 block pl-1">{t('profile.full_name')}</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500"><User size={14} /></span>
                      <input
                        type="text"
                        value={formData.full_name}
                        onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                        placeholder={t('profile.full_name_ph')}
                        className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl py-3 pl-10 pr-4 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all shadow-sm"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-2 block pl-1">{t('profile.username')}</label>
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
                    <label className="text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-2 block pl-1">{t('profile.headline_bio')}</label>
                    <input 
                      type="text" 
                      value={formData.status} 
                      onChange={(e) => setFormData({...formData, status: e.target.value})}
                      placeholder={t('profile.headline_ph')}
                      className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl py-3 px-4 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all shadow-sm"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-2 block pl-1">{t('profile.location')}</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500"><MapPin size={14} /></span>
                      <input 
                        type="text" 
                        value={formData.location} 
                        onChange={(e) => setFormData({...formData, location: e.target.value})}
                        placeholder={t('profile.location_ph')}
                        className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl py-3 pl-10 pr-4 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all shadow-sm"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-2 block pl-1">{t('profile.work_status')}</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500"><Briefcase size={14} /></span>
                      <select 
                        value={formData.work_status} 
                        onChange={(e) => setFormData({...formData, work_status: e.target.value})}
                        className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl py-3 pl-10 pr-4 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all shadow-sm appearance-none"
                      >
                        <option value="">{t('profile.ws_not_specified')}</option>
                        <option value="Open to Work">{t('profile.ws_open')}</option>
                        <option value="Hiring">{t('profile.ws_hiring')}</option>
                        <option value="Freelancing">{t('profile.ws_freelancing')}</option>
                        <option value="Employed">{t('profile.ws_employed')}</option>
                      </select>
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-2 block pl-1">{t('profile.github')}</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500"><GitBranch size={14} /></span>
                      <input 
                        type="text" 
                        value={formData.github} 
                        onChange={(e) => setFormData({...formData, github: e.target.value})}
                        placeholder={t('profile.github_ph')}
                        className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl py-3 pl-10 pr-4 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all shadow-sm"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-2 block pl-1">{t('profile.website')}</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500"><Link size={14} /></span>
                      <input
                        type="text"
                        value={formData.website}
                        onChange={(e) => setFormData({...formData, website: e.target.value})}
                        placeholder={t('profile.website_ph')}
                        className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl py-3 pl-10 pr-4 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all shadow-sm"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-2 block pl-1">{t('profile.skills')}</label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500"><Code2 size={14} /></span>
                        <input
                          type="text"
                          value={skillsInput}
                          onChange={(e) => setSkillsInput(e.target.value)}
                          onKeyDown={(e) => {
                            if ((e.key === "Enter" || e.key === ",") && skillsInput.trim()) {
                              e.preventDefault();
                              const s = skillsInput.trim().replace(/,$/, "");
                              if (s && !editSkills.includes(s) && editSkills.length < 20) {
                                setEditSkills(prev => [...prev, s]);
                              }
                              setSkillsInput("");
                            }
                          }}
                          placeholder={t('profile.skills_ph')}
                          className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl py-3 pl-10 pr-4 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all shadow-sm"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const s = skillsInput.trim().replace(/,$/, "");
                          if (s && !editSkills.includes(s) && editSkills.length < 20) {
                            setEditSkills(prev => [...prev, s]);
                          }
                          setSkillsInput("");
                        }}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all shrink-0"
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                    {editSkills.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {editSkills.map((skill, i) => (
                          <span key={i} className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-500/20 rounded-lg text-[11px] font-bold">
                            {skill}
                            <button type="button" onClick={() => setEditSkills(prev => prev.filter((_, idx) => idx !== i))} className="hover:text-red-500 transition-colors"><X size={10} /></button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* ── Experience ── */}
              <div className="mt-6 border-t border-gray-100 dark:border-gray-800 pt-5">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('profile.experience')}</h4>
                  <button type="button" onClick={() => setEditExperience(prev => [...prev, { title: "", company: "", period: "", description: "" }])} className="flex items-center gap-1 text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline">
                    <Plus size={12} /> {t('profile.add')}
                  </button>
                </div>
                {editExperience.map((exp, i) => (
                  <div key={i} className="mb-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700 space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <input value={exp.title} onChange={e => { const n=[...editExperience]; n[i]={...n[i],title:e.target.value}; setEditExperience(n); }} placeholder={t('profile.job_title')} className="text-xs bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1.5 text-gray-900 dark:text-gray-100 focus:outline-none focus:border-blue-500" />
                      <input value={exp.company} onChange={e => { const n=[...editExperience]; n[i]={...n[i],company:e.target.value}; setEditExperience(n); }} placeholder={t('profile.company')} className="text-xs bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1.5 text-gray-900 dark:text-gray-100 focus:outline-none focus:border-blue-500" />
                    </div>
                    <input value={exp.period} onChange={e => { const n=[...editExperience]; n[i]={...n[i],period:e.target.value}; setEditExperience(n); }} placeholder={t('profile.exp_period_ph')} className="w-full text-xs bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1.5 text-gray-900 dark:text-gray-100 focus:outline-none focus:border-blue-500" />
                    <div className="flex gap-2">
                      <input value={exp.description} onChange={e => { const n=[...editExperience]; n[i]={...n[i],description:e.target.value}; setEditExperience(n); }} placeholder={t('profile.exp_desc_ph')} className="flex-1 text-xs bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1.5 text-gray-900 dark:text-gray-100 focus:outline-none focus:border-blue-500" />
                      <button type="button" onClick={() => setEditExperience(prev => prev.filter((_,idx)=>idx!==i))} className="text-red-400 hover:text-red-600 transition-colors"><Trash size={14} /></button>
                    </div>
                  </div>
                ))}
              </div>

              {/* ── Education ── */}
              <div className="mt-4 border-t border-gray-100 dark:border-gray-800 pt-5">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('profile.education')}</h4>
                  <button type="button" onClick={() => setEditEducation(prev => [...prev, { degree: "", school: "", period: "", field: "" }])} className="flex items-center gap-1 text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline">
                    <Plus size={12} /> {t('profile.add')}
                  </button>
                </div>
                {editEducation.map((edu, i) => (
                  <div key={i} className="mb-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700 space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <input value={edu.degree} onChange={e => { const n=[...editEducation]; n[i]={...n[i],degree:e.target.value}; setEditEducation(n); }} placeholder={t('profile.edu_degree_ph')} className="text-xs bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1.5 text-gray-900 dark:text-gray-100 focus:outline-none focus:border-blue-500" />
                      <input value={edu.school} onChange={e => { const n=[...editEducation]; n[i]={...n[i],school:e.target.value}; setEditEducation(n); }} placeholder={t('profile.edu_school_ph')} className="text-xs bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1.5 text-gray-900 dark:text-gray-100 focus:outline-none focus:border-blue-500" />
                    </div>
                    <div className="flex gap-2">
                      <input value={edu.period} onChange={e => { const n=[...editEducation]; n[i]={...n[i],period:e.target.value}; setEditEducation(n); }} placeholder={t('profile.edu_period_ph')} className="flex-1 text-xs bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1.5 text-gray-900 dark:text-gray-100 focus:outline-none focus:border-blue-500" />
                      <button type="button" onClick={() => setEditEducation(prev => prev.filter((_,idx)=>idx!==i))} className="text-red-400 hover:text-red-600 transition-colors"><Trash size={14} /></button>
                    </div>
                  </div>
                ))}
              </div>

            </div>
          ) : (
            <div className="animate-in fade-in duration-500 pt-4">
              <h2 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white flex items-center gap-2 tracking-tight">
                {profile?.full_name || profile?.username || t('profile.unknown_user')}
                {profile?.is_verified && <VerifiedBadge size={26} />}
                {(profile?.is_premium || profile?.is_admin) && visibility.premium_badge !== false && <PremiumBadge size={22} isTrial={!!profile?.is_trial_premium} />}
              </h2>
              {profile?.full_name && (
                <p className="text-sm font-bold text-gray-400 dark:text-gray-500 mt-1">@{profile.username}</p>
              )}
              <p className="text-gray-600 dark:text-gray-300 text-base sm:text-lg mt-2 font-medium max-w-2xl leading-relaxed">
                {profile?.status || t('profile.default_headline')}
              </p>
              
              <div className="flex flex-wrap items-center gap-3 mt-6 text-sm text-gray-600 dark:text-gray-400 font-medium">
                {visibility.work_status && profile?.work_status && profile.work_status !== 'None' && (
                  <span className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest border shadow-sm transition-transform hover:-translate-y-0.5 ${profile.work_status === 'Hiring' ? 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-800/50' : profile.work_status === 'Open to Work' ? 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 border-green-200 dark:border-green-800/50' : 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/50'}`}>
                    <Briefcase size={14} /> {profile.work_status}
                  </span>
                )}
                {visibility.location && profile?.location && (
                  <span className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800/50 px-4 py-2 rounded-xl border border-gray-100 dark:border-gray-800 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-default">
                    <MapPin size={16} className="text-gray-400 dark:text-gray-500" /> {profile.location}
                  </span>
                )}
                {visibility.github && profile?.github && (
                  <a
                    href={`https://github.com/${profile.github.replace(/^@/, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800/50 px-4 py-2 rounded-xl border border-gray-100 dark:border-gray-800 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
                  >
                    <GitBranch size={16} className="text-gray-400 dark:text-gray-500" /> @{profile.github.replace(/^@/, '')}
                  </a>
                )}
                {visibility.website && profile?.website && (
                  <a
                    href={profile.website.startsWith('http') ? profile.website : `https://${profile.website}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800/50 px-4 py-2 rounded-xl border border-gray-100 dark:border-gray-800 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-blue-200 dark:hover:border-blue-800/50 hover:text-blue-600 dark:hover:text-blue-400 transition-colors text-gray-600 dark:text-gray-400"
                  >
                    <Globe size={16} className="text-gray-400 dark:text-gray-500" /> {profile.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                  </a>
                )}
              </div>

              {/* Premium insights — unified into the profile: strength, reputation, analytics, featured */}
              {isOwnProfile && (
                <ProfileInsights
                  profile={profile}
                  followersCount={followersCount}
                  profilePosts={profilePosts}
                  onEdit={() => setIsEditing(true)}
                />
              )}

              {Array.isArray(profile?.skills) && profile.skills.length > 0 && (
                <div className="mt-4">
                  <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2">{t('profile.skills')}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {profile.skills.map((skill, i) => (
                      <span key={i} className="px-2.5 py-1 bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-500/20 rounded-lg text-[11px] font-bold">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {/* Experience */}
              {Array.isArray(profile?.experience) && profile.experience.length > 0 && (
                <div className="mt-5 border-t border-gray-100 dark:border-gray-800 pt-4">
                  <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3">{t('profile.experience')}</p>
                  <div className="space-y-3">
                    {profile.experience.map((exp, i) => (
                      <div key={i} className="flex gap-3">
                        <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0 mt-0.5">
                          <Briefcase size={14} className="text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-gray-900 dark:text-gray-100">{exp.title}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">{exp.company}{exp.period ? ` · ${exp.period}` : ''}</p>
                          {exp.description && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{exp.description}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Education */}
              {Array.isArray(profile?.education) && profile.education.length > 0 && (
                <div className="mt-5 border-t border-gray-100 dark:border-gray-800 pt-4">
                  <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3">{t('profile.education')}</p>
                  <div className="space-y-3">
                    {profile.education.map((edu, i) => (
                      <div key={i} className="flex gap-3">
                        <div className="w-8 h-8 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center shrink-0 mt-0.5">
                          <BookOpen size={14} className="text-purple-600 dark:text-purple-400" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-gray-900 dark:text-gray-100">{edu.degree}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">{edu.school}{edu.period ? ` · ${edu.period}` : ''}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex flex-wrap items-center gap-3 mt-4 text-sm text-gray-600 dark:text-gray-400 font-medium">
                <div className="relative">
                  <span
                    onClick={handleViewFollowers}
                    className={`flex items-center gap-2 bg-gray-50 dark:bg-gray-800/50 px-4 py-2 rounded-xl border border-gray-100 dark:border-gray-800 transition-colors ${followersCount > 0 ? 'cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-blue-200 dark:hover:border-blue-800/50 hover:text-blue-600 dark:hover:text-blue-400' : 'cursor-default'}`}
                  >
                    <Users size={16} className={followersCount > 0 ? "text-blue-500" : "text-gray-400 dark:text-gray-500"} /> 
                    <span className={followersCount > 0 ? "font-bold text-blue-600 dark:text-blue-400" : "font-bold"}>
                      {Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(followersCount)}
                    </span> {t('profile.connections_lc')}
                  </span>

                  {showFollowersList && (
                    <div className="absolute top-full left-0 mt-2 w-64 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                      <div className="p-3 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                        <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">{t('profile.network_nodes')}</span>
                        <button onClick={() => setShowFollowersList(false)} className="text-gray-400 dark:text-gray-500 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"><X size={14}/></button>
                      </div>
                      <div className="max-h-[170px] overflow-y-auto custom-scrollbar p-2 space-y-1">
                        {loadingFollowers ? (
                          <div className="flex justify-center py-4"><Loader2 size={16} className="animate-spin text-blue-500" /></div>
                        ) : followersData.map(user => (
                          <div key={`follower-${user.id}`} className="flex items-center gap-3 p-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl transition-colors cursor-pointer group">
                            <div className="relative w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center justify-center text-xs font-bold uppercase text-gray-500 dark:text-gray-400 shrink-0 overflow-hidden">
                              {user.avatar_url ? <Image src={user.avatar_url} alt={t('profile.avatar_alt')} fill sizes="32px" className="object-cover" /> : user.username?.substring(0, 2)}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors flex items-center gap-1">
                                @{user.username}
                                {user.is_verified && <VerifiedBadge size={14} />}
                              </p>
                              <p className="text-[9px] text-gray-500 dark:text-gray-400 truncate uppercase tracking-widest">{user.status || t('profile.active_node')}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* GITHUB STATS */}
              {visibility.github && profile?.github && (
                <div className="mt-8">
                  <GitHubStats githubField={profile.github} />
                </div>
              )}

              {/* POSTS & LIKED ACTIVITY SECTION */}
              <div className="mt-12 pt-10 border-t border-gray-100 dark:border-gray-800/80">
                {/* My Posts */}
                <div className="mb-10">
                  <h3 className="text-xl font-black text-gray-900 dark:text-gray-100 tracking-tight mb-5">{t('profile.posts')}</h3>
                  {profilePosts.length > 0 ? (
                    <div className="relative">
                      {postsEdge.left && (
                        <button
                          onClick={() => scrollRow(postsScrollRef, 'left')}
                          className="absolute left-1 top-1/2 -translate-y-1/2 z-10 w-8 h-8 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm border border-gray-200 dark:border-gray-700 rounded-full shadow-md flex items-center justify-center text-gray-600 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-700 transition-all"
                        >
                          <ChevronLeft size={16} />
                        </button>
                      )}
                      {postsEdge.right && (
                        <button
                          onClick={() => scrollRow(postsScrollRef, 'right')}
                          className="absolute right-1 top-1/2 -translate-y-1/2 z-10 w-8 h-8 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm border border-gray-200 dark:border-gray-700 rounded-full shadow-md flex items-center justify-center text-gray-600 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-700 transition-all"
                        >
                          <ChevronRight size={16} />
                        </button>
                      )}
                    <div
                      ref={postsScrollRef}
                      onScroll={() => syncEdge(postsScrollRef, setPostsEdge)}
                      className="flex gap-4 overflow-x-auto pb-3 -mx-1 px-1 snap-x snap-mandatory scrollbar-track-x"
                    >
                      {profilePosts.map(post => (
                        <a
                          key={post.id}
                          href={`/posts/${post.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="snap-start shrink-0 w-56 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl overflow-hidden hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 flex flex-col group"
                        >
                          {post.image_url ? (
                            <div className="relative h-32 w-full bg-gray-100 dark:bg-gray-700 shrink-0">
                              <Image
                                src={post.image_url}
                                alt={post.title || t('profile.post_image_alt')}
                                fill
                                sizes="224px"
                                className={(post.image_fit || 'cover') === 'contain' ? 'object-contain' : 'object-cover'}
                              />
                            </div>
                          ) : post.code_snippet ? (
                            <div className="h-32 w-full bg-gray-900 dark:bg-gray-950 flex items-center justify-center shrink-0 border-b border-gray-700">
                              <Code2 size={28} className="text-blue-400 opacity-60" />
                            </div>
                          ) : (
                            <div className="h-20 w-full bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 shrink-0" />
                          )}
                          <div className="p-3 flex-1 flex flex-col justify-between min-h-0">
                            <div>
                              {post.title && (
                                <p className="text-xs font-black text-gray-900 dark:text-gray-100 truncate mb-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{post.title}</p>
                              )}
                              {post.content && (
                                <p className="text-[11px] text-gray-500 dark:text-gray-400 line-clamp-2 leading-relaxed">{post.content.replace(/[#*`_]/g, '')}</p>
                              )}
                            </div>
                            <div className="flex items-center gap-3 mt-2 pt-2 border-t border-gray-100 dark:border-gray-700 text-[11px] text-gray-400 dark:text-gray-500 font-semibold">
                              <span className="flex items-center gap-1"><Heart size={11} /> {post.likes?.length || 0}</span>
                              <span className="flex items-center gap-1"><MessageSquare size={11} /> {post.comments?.length || 0}</span>
                              <span className="ml-auto">{new Date(post.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                            </div>
                          </div>
                        </a>
                      ))}
                    </div>
                    </div>
                  ) : (
                    <div className="text-center py-8 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700">
                      <Activity size={28} className="mx-auto text-gray-300 dark:text-gray-600 mb-2" />
                      <p className="text-sm font-bold text-gray-500 dark:text-gray-400">{t('profile.no_posts')}</p>
                    </div>
                  )}
                </div>

                {/* Liked Posts */}
                <div>
                  <h3 className="text-xl font-black text-gray-900 dark:text-gray-100 tracking-tight mb-5">{t('profile.liked')}</h3>
                  {likedPosts.length > 0 ? (
                    <div className="relative">
                      {likedEdge.left && (
                        <button
                          onClick={() => scrollRow(likedScrollRef, 'left')}
                          className="absolute left-1 top-1/2 -translate-y-1/2 z-10 w-8 h-8 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm border border-gray-200 dark:border-gray-700 rounded-full shadow-md flex items-center justify-center text-gray-600 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-700 transition-all"
                        >
                          <ChevronLeft size={16} />
                        </button>
                      )}
                      {likedEdge.right && (
                        <button
                          onClick={() => scrollRow(likedScrollRef, 'right')}
                          className="absolute right-1 top-1/2 -translate-y-1/2 z-10 w-8 h-8 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm border border-gray-200 dark:border-gray-700 rounded-full shadow-md flex items-center justify-center text-gray-600 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-700 transition-all"
                        >
                          <ChevronRight size={16} />
                        </button>
                      )}
                    <div
                      ref={likedScrollRef}
                      onScroll={() => syncEdge(likedScrollRef, setLikedEdge)}
                      className="flex gap-4 overflow-x-auto pb-3 -mx-1 px-1 snap-x snap-mandatory scrollbar-track-x"
                    >
                      {likedPosts.map(post => (
                        <a
                          key={post.id}
                          href={`/posts/${post.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="snap-start shrink-0 w-56 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl overflow-hidden hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 flex flex-col group"
                        >
                          {post.image_url ? (
                            <div className="relative h-32 w-full bg-gray-100 dark:bg-gray-700 shrink-0">
                              <Image
                                src={post.image_url}
                                alt={post.title || t('profile.post_image_alt')}
                                fill
                                sizes="224px"
                                className={(post.image_fit || 'cover') === 'contain' ? 'object-contain' : 'object-cover'}
                              />
                            </div>
                          ) : post.code_snippet ? (
                            <div className="h-32 w-full bg-gray-900 dark:bg-gray-950 flex items-center justify-center shrink-0 border-b border-gray-700">
                              <Code2 size={28} className="text-blue-400 opacity-60" />
                            </div>
                          ) : (
                            <div className="h-20 w-full bg-gradient-to-br from-red-50 to-pink-50 dark:from-red-900/20 dark:to-pink-900/20 shrink-0" />
                          )}
                          <div className="p-3 flex-1 flex flex-col justify-between min-h-0">
                            <div>
                              {post.profiles?.username && (
                                <p className="text-[10px] font-black text-blue-600 dark:text-blue-400 mb-1 truncate">@{post.profiles.username}</p>
                              )}
                              {post.title && (
                                <p className="text-xs font-black text-gray-900 dark:text-gray-100 truncate mb-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{post.title}</p>
                              )}
                              {post.content && (
                                <p className="text-[11px] text-gray-500 dark:text-gray-400 line-clamp-2 leading-relaxed">{post.content.replace(/[#*`_]/g, '')}</p>
                              )}
                            </div>
                            <div className="flex items-center gap-3 mt-2 pt-2 border-t border-gray-100 dark:border-gray-700 text-[11px] text-gray-400 dark:text-gray-500 font-semibold">
                              <span className="flex items-center gap-1 text-red-500"><Heart size={11} fill="currentColor" /> {post.likes?.length || 0}</span>
                              <span className="flex items-center gap-1"><MessageSquare size={11} /> {post.comments?.length || 0}</span>
                              <span className="ml-auto">{new Date(post.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                            </div>
                          </div>
                        </a>
                      ))}
                    </div>
                    </div>
                  ) : (
                    <div className="text-center py-8 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700">
                      <Heart size={28} className="mx-auto text-gray-300 dark:text-gray-600 mb-2" />
                      <p className="text-sm font-bold text-gray-500 dark:text-gray-400">{t('profile.no_liked')}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* OPPORTUNITIES (JOBS) SECTION */}
              <div className="mt-12 pt-10 border-t border-gray-100 dark:border-gray-800/80">
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-xl font-black text-gray-900 dark:text-gray-100 tracking-tight">{t('profile.opportunities')}</h3>
                  {isOwnProfile && (
                    <button 
                      onClick={() => {
                        setEditingJobId(null);
                        setJobForm({ title: "", company: "", location: "", type: "Full-time", salary: "", tags: "", external_url: "", description: "", experience_level: "Mid-level" });
                        setShowJobModal(true);
                      }} 
                      className="flex items-center gap-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-500 px-5 py-2.5 rounded-full transition-all shadow-md hover:shadow-lg active:scale-95"
                    >
                      <Plus size={16} /> {t('profile.post_job')}
                    </button>
                  )}
                </div>
                {userJobs.length > 0 ? (
                  <div className="flex flex-col gap-6">
                    {userJobs.map(job => (
                      <div key={job.id} onClick={() => setViewJob(job)} className="p-6 border border-gray-100 dark:border-gray-800 rounded-3xl bg-white dark:bg-gray-900 shadow-sm hover:shadow-xl hover:-translate-y-1 hover:border-blue-500/30 transition-all duration-300 group cursor-pointer relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 to-transparent dark:from-blue-900/10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                        <div className="relative z-10">
                          <div className="flex justify-between items-start mb-4">
                            <div className="flex-1 min-w-0 pr-4">
                              <h4 className="font-black text-lg text-gray-900 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate">{job.title}</h4>
                              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1.5 flex items-center gap-1.5 truncate"><Building size={14} className="shrink-0 text-gray-400" /> <span className="truncate font-medium">{job.company}</span></p>
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
                                title={t('profile.view_applicants_title')}
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
                                title={t('profile.edit_job_title')}
                              >
                                <Edit3 size={14} />
                              </button>
                              <button 
                                onClick={(e) => handleDeleteClick(e, job)}
                                className="text-gray-400 hover:text-red-500 transition-colors p-1"
                                title={t('profile.delete_job_title')}
                              >
                                <Trash2 size={14} />
                              </button>
                          </>
                            )}
                            <span className="text-[10px] px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg font-black uppercase tracking-widest border border-blue-200 dark:border-blue-800/50 shrink-0 whitespace-nowrap">{job.type}</span>
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-gray-500 dark:text-gray-400 font-medium mb-5">
                          <span className="flex items-center gap-1 min-w-0"><MapPin size={12} className="shrink-0" /> <span className="truncate">{job.location}</span></span>
                          {job.salary && <span className="flex items-center gap-1 shrink-0"><DollarSign size={12} className="shrink-0" /> {job.salary}</span>}
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {(job.tags || []).slice(0,3).map(tag => <span key={tag} className="text-xs bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 px-3 py-1 rounded-md text-gray-600 dark:text-gray-300 font-bold">{tag}</span>)}
                          {(job.tags || []).length > 3 && <span className="text-xs text-gray-400 font-bold px-1 py-1">+{(job.tags.length - 3)}</span>}
                        </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-10 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700">
                    <Briefcase size={32} className="mx-auto text-gray-300 dark:text-gray-600 mb-3" />
                    <p className="text-sm font-bold text-gray-500 dark:text-gray-400">{t('profile.no_opportunities')}</p>
                  </div>
                )}
              </div>

              <div className="mt-12 pt-10 border-t border-gray-100 dark:border-gray-800/80">
                <h3 className="text-xl font-black text-gray-900 dark:text-gray-100 tracking-tight mb-8">{t('profile.contact_details')}</h3>
                <div className="flex flex-col gap-4">
                  <div className="flex items-start gap-4 p-5 rounded-2xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800 hover:bg-white dark:hover:bg-gray-800 hover:shadow-md transition-all group">
                    <div className="p-3 bg-white dark:bg-gray-700 rounded-xl shadow-sm text-gray-400 dark:text-gray-500 group-hover:text-blue-500 transition-colors"><Mail size={20} /></div>
                    <div>
                      <p className="text-xs font-black uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-1">{isOwnProfile ? t('profile.email') : t('profile.email_visibility')}</p>
                      <p className="text-sm font-bold text-gray-900 dark:text-gray-100">{isOwnProfile ? (currentUser?.email || t('profile.na')) : t('profile.protected')}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4 p-5 rounded-2xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800 hover:bg-white dark:hover:bg-gray-800 hover:shadow-md transition-all group">
                    <div className="p-3 bg-white dark:bg-gray-700 rounded-xl shadow-sm text-gray-400 dark:text-gray-500 group-hover:text-emerald-500 transition-colors"><Calendar size={20} /></div>
                    <div>
                      <p className="text-xs font-black uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-1">{t('profile.date_joined')}</p>
                      <p className="text-sm font-bold text-gray-900 dark:text-gray-100">{isOwnProfile && currentUser?.created_at ? new Date(currentUser.created_at).toLocaleDateString() : t('profile.active_member')}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4 p-5 rounded-2xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800 hover:bg-white dark:hover:bg-gray-800 hover:shadow-md transition-all group">
                    <div className="p-3 bg-white dark:bg-gray-700 rounded-xl shadow-sm text-gray-400 dark:text-gray-500 group-hover:text-purple-500 transition-colors"><Shield size={20} /></div>
                    <div>
                      <p className="text-xs font-black uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-1">{t('profile.security_clearance')}</p>
                      {profile?.is_verified ? (
                        <p className="text-sm text-blue-600 dark:text-blue-400 font-bold flex items-center gap-1.5"><VerifiedBadge size={16} /> {t('profile.verified_identity')}</p>
                      ) : (
                        <p className="text-sm text-gray-700 dark:text-gray-300 font-bold">{t('profile.standard_node')}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-start gap-4 p-5 rounded-2xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800 hover:bg-white dark:hover:bg-gray-800 hover:shadow-md transition-all group">
                    <div className="p-3 bg-white dark:bg-gray-700 rounded-xl shadow-sm text-gray-400 dark:text-gray-500 group-hover:text-amber-500 transition-colors"><User size={20} /></div>
                    <div className="min-w-0 pr-4 flex flex-col justify-center">
                      <p className="text-xs font-black uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-1">{t('profile.account_node_id')}</p>
                      <p className="text-xs text-gray-900 dark:text-gray-100 font-mono truncate font-bold" title={profile?.id || t('profile.na')}>{profile?.id || t('profile.na')}</p>
                    </div>
                  </div>
                  {profile?.github && (
                    <div className="flex items-start gap-4 p-5 rounded-2xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800 hover:bg-white dark:hover:bg-gray-800 hover:shadow-md transition-all group">
                      <div className="p-3 bg-white dark:bg-gray-700 rounded-xl shadow-sm text-gray-400 dark:text-gray-500 group-hover:text-gray-900 dark:group-hover:text-white transition-colors"><GitBranch size={20} /></div>
                      <div className="min-w-0 pr-4 flex flex-col justify-center">
                        <p className="text-xs font-black uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-1">{t('profile.visibility_github')}</p>
                        <a href={`https://github.com/${profile.github}`} target="_blank" rel="noreferrer" className="text-sm font-bold text-blue-600 dark:text-blue-400 hover:underline truncate block">
                          github.com/{profile.github}
                        </a>
                      </div>
                    </div>
                  )}
                  {profile?.website && (
                    <div className="flex items-start gap-4 p-5 rounded-2xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800 hover:bg-white dark:hover:bg-gray-800 hover:shadow-md transition-all group">
                      <div className="p-3 bg-white dark:bg-gray-700 rounded-xl shadow-sm text-gray-400 dark:text-gray-500 group-hover:text-pink-500 transition-colors"><Link size={20} /></div>
                      <div className="min-w-0 pr-4 flex flex-col justify-center">
                        <p className="text-xs font-black uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-1">{t('profile.visibility_website')}</p>
                        <a href={profile.website.startsWith('http') ? profile.website : `https://${profile.website}`} target="_blank" rel="noreferrer" className="text-sm font-bold text-blue-600 dark:text-blue-400 hover:underline truncate block">
                          {profile.website.replace(/^https?:\/\//, '')}
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* PUBLIC PROFILE VISIBILITY CONTROLS */}
              {isOwnProfile && (
                <div className="mt-12 pt-10 border-t border-gray-100 dark:border-gray-800/80">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-xl text-blue-600 dark:text-blue-400">
                      <Lock size={18} />
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-gray-900 dark:text-gray-100 tracking-tight">{t('profile.public_visibility')}</h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mt-0.5">{t('profile.visibility_control')} <span className="font-bold text-blue-600 dark:text-blue-400">/u/{profile?.username}</span></p>
                    </div>
                  </div>

                  <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {[
                      { key: 'bio',         label: t('profile.visibility_bio'),         desc: t('profile.vis_bio_desc'),           icon: FileText },
                      { key: 'location',    label: t('profile.visibility_location'),    desc: t('profile.vis_location_desc'),    icon: MapPin },
                      { key: 'github',      label: t('profile.visibility_github'),      desc: t('profile.vis_github_desc'),      icon: GitBranch },
                      { key: 'website',     label: t('profile.visibility_website'),     desc: t('profile.vis_website_desc'),   icon: Link },
                      { key: 'work_status', label: t('profile.visibility_work_status'), desc: t('profile.vis_work_desc'),     icon: Briefcase },
                      { key: 'certificates',label: t('profile.visibility_certificates'), desc: t('profile.vis_certs_desc'),   icon: Award },
                      { key: 'posts',       label: t('profile.recent_posts'), desc: t('profile.vis_posts_desc'),    icon: Activity },
                      ...((profile?.is_premium || profile?.is_admin) ? [{
                        key: 'premium_badge',
                        label: profile?.is_trial_premium ? t('profile.freemium_badge') : t('profile.premium_badge'),
                        desc: profile?.is_trial_premium ? t('profile.vis_freemium_desc') : t('profile.vis_premium_desc'),
                        icon: Award,
                      }] : []),
                    ].map(({ key, label, desc, icon: Icon }) => {
                      const on = visibility[key] !== false;
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => setVisibility(prev => ({ ...prev, [key]: !prev[key] }))}
                          className={`flex items-center gap-4 p-4 rounded-2xl border transition-all text-left w-full group
                            ${on
                              ? 'bg-blue-50 dark:bg-blue-900/15 border-blue-200 dark:border-blue-800/50 hover:bg-blue-100 dark:hover:bg-blue-900/25'
                              : 'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800'
                            }`}
                        >
                          <div className={`p-2.5 rounded-xl shrink-0 transition-colors ${on ? 'bg-blue-500 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500'}`}>
                            <Icon size={16} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-bold truncate transition-colors ${on ? 'text-blue-700 dark:text-blue-300' : 'text-gray-600 dark:text-gray-400'}`}>{label}</p>
                            <p className="text-[11px] text-gray-400 dark:text-gray-500 truncate font-medium">{desc}</p>
                          </div>
                          <div className={`shrink-0 flex items-center gap-1.5 text-xs font-black uppercase tracking-widest transition-colors ${on ? 'text-blue-500' : 'text-gray-400'}`}>
                            {on ? <Eye size={14} /> : <EyeOff size={14} />}
                            <span className="hidden sm:inline">{on ? t('profile.public') : t('profile.hidden')}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  <div className="mt-5 flex items-center gap-3">
                    <button
                      onClick={handleSaveVisibility}
                      disabled={savingVisibility}
                      className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white font-bold py-2.5 px-6 rounded-xl transition-all text-sm shadow-sm active:scale-95"
                    >
                      {savingVisibility ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
                      {savingVisibility ? t('profile.saving') : t('profile.save_visibility')}
                    </button>
                    <p className="text-xs text-gray-400 dark:text-gray-500 font-medium">{t('profile.visibility_instant')}</p>
                  </div>
                </div>
              )}
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
                  {editingJobId ? t('profile.edit_opportunity') : t('profile.post_opportunity')}
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {editingJobId ? t('profile.edit_opp_desc') : t('profile.post_opp_desc')}
                </p>
              </div>
              <button onClick={() => { setShowJobModal(false); setEditingJobId(null); }} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full text-gray-500 dark:text-gray-400 transition-colors"><X size={20}/></button>
            </div>
            <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-4">
              <div>
                <label className="text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-1.5 block">{t('profile.job_title')}</label>
                <input type="text" value={jobForm.title} onChange={e => setJobForm({...jobForm, title: e.target.value})} placeholder={t('profile.job_title_ph')} className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl py-3 px-4 text-sm text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all shadow-sm" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-1.5 block">{t('profile.company')}</label>
                  <input type="text" value={jobForm.company} onChange={e => setJobForm({...jobForm, company: e.target.value})} placeholder={t('profile.company_ph')} className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl py-3 px-4 text-sm text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all shadow-sm" />
                </div>
                <div>
                  <label className="text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-1.5 block">{t('profile.job_location')}</label>
                  <input type="text" value={jobForm.location} onChange={e => setJobForm({...jobForm, location: e.target.value})} placeholder={t('profile.job_location_ph')} className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl py-3 px-4 text-sm text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all shadow-sm" />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-1.5 block">{t('profile.job_type')}</label>
                  <select value={jobForm.type} onChange={e => setJobForm({...jobForm, type: e.target.value})} className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl py-3 px-4 text-sm text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all shadow-sm appearance-none">
                    <option>Full-time</option><option>Part-time</option><option>Contract</option><option>Freelance</option><option>Internship</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-1.5 block">{t('profile.level')}</label>
                  <select value={jobForm.experience_level} onChange={e => setJobForm({...jobForm, experience_level: e.target.value})} className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl py-3 px-4 text-sm text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all shadow-sm appearance-none">
                    <option>Junior</option><option>Mid-level</option><option>Senior</option><option>Lead / Manager</option><option>Executive</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-1.5 block">{t('profile.salary_range')}</label>
                  <input type="text" value={jobForm.salary} onChange={e => setJobForm({...jobForm, salary: e.target.value})} placeholder={t('profile.salary_ph')} className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl py-3 px-4 text-sm text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all shadow-sm" />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-1.5 block">{t('profile.tags_label')}</label>
                <input type="text" value={jobForm.tags} onChange={e => setJobForm({...jobForm, tags: e.target.value})} placeholder={t('profile.tags_ph')} className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl py-3 px-4 text-sm text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all shadow-sm" />
              </div>
              <div>
                <label className="text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-1.5 block">{t('profile.external_link')}</label>
                <input type="url" value={jobForm.external_url} onChange={e => setJobForm({...jobForm, external_url: e.target.value})} placeholder={t('profile.external_link_ph')} className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl py-3 px-4 text-sm text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all shadow-sm" />
              </div>
              <div>
                <label className="text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-1.5 block">{t('profile.job_description')}</label>
                <textarea rows="4" value={jobForm.description} onChange={e => setJobForm({...jobForm, description: e.target.value})} placeholder={t('profile.job_desc_ph')} className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl py-3 px-4 text-sm text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all shadow-sm resize-none" />
              </div>
            </div>
            <div className="p-6 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 shrink-0 flex gap-3">
               <button onClick={() => { setShowJobModal(false); setEditingJobId(null); }} className="flex-1 py-3 px-4 rounded-xl text-gray-700 dark:text-gray-300 font-bold bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all shadow-sm">{t('profile.cancel')}</button>
               <button onClick={handlePostJob} disabled={isPostingJob || !jobForm.title} className="flex-1 py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold transition-all shadow-md active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2">
                 {isPostingJob ? <Loader2 size={16} className="animate-spin" /> : (editingJobId ? t('profile.update_job') : t('profile.publish_job'))}
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
                <h2 className="text-xl font-black text-gray-900 dark:text-gray-100 tracking-tight">{t('profile.applicants')}</h2>
                <p className="text-xs text-gray-500 dark:text-gray-400 font-bold mt-2">
                  {t('profile.reviewing_for')} <span className="text-blue-600 dark:text-blue-400">{activeJobForApplicants.title}</span>
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
                  <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">{t('profile.no_applicants')}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('profile.no_applicants_desc')}</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {jobApplicants.map(app => (
                    <div key={app.id} onClick={() => setSelectedApplicant(app)} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-[1.5rem] p-5 hover:border-blue-500/40 hover:shadow-lg transition-all cursor-pointer group flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                      <div className="flex items-center gap-4 min-w-0">
                        <div className="relative w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden shrink-0 border border-gray-200 dark:border-gray-700 flex items-center justify-center font-bold text-gray-500 dark:text-gray-400 uppercase">
                          {app.profiles?.avatar_url ? <Image src={app.profiles.avatar_url} alt={t('profile.avatar_alt')} fill sizes="48px" className="object-cover" /> : app.profiles?.username?.substring(0, 2) || "??"}
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-gray-900 dark:text-gray-100 font-bold text-base flex items-center gap-1 truncate">
                            @{app.profiles?.username}
                            {app.profiles?.is_verified && <VerifiedBadge size={16} />}
                          </h4>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">
                            {t('profile.applied_on')} {new Date(app.created_at).toLocaleDateString()}
                          </p>
                          {app.resume_url && (
                            <span className="inline-flex items-center gap-1 mt-2 text-[10px] font-bold text-blue-600 bg-blue-50 dark:bg-blue-900/20 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-800/50">
                              <FileText size={10} /> {t('profile.resume_attached')}
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
                          {app.status === 'external_redirect' ? t('profile.external_redirect') : (app.status || 'pending')}
                        </span>
                        
                        {app.status !== 'accepted' && app.status !== 'declined' && app.status !== 'external_redirect' && (
                          <div className="flex items-center gap-2 mt-1 w-full sm:w-auto">
                            <button
                              onClick={(e) => { e.stopPropagation(); handleAppAction(app.id, 'declined', app.user_id, activeJobForApplicants?.title); }}
                              className="flex-1 sm:flex-none px-4 py-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 rounded-xl font-bold text-xs transition-colors border border-red-200 dark:border-red-800/50 uppercase"
                            >
                              {t('profile.decline')}
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleAppAction(app.id, 'accepted', app.user_id, activeJobForApplicants?.title); }}
                              className="flex-1 sm:flex-none px-4 py-2 bg-green-600 text-white hover:bg-green-500 rounded-xl font-bold text-xs transition-colors shadow-sm uppercase"
                            >
                              {t('profile.accept')}
                            </button>
                          </div>
                        )}
                        {app.status === 'accepted' && (
                          <button
                            onClick={(e) => { e.stopPropagation(); openInterviewModal(app, activeJobForApplicants); }}
                            className="flex items-center gap-1.5 mt-1 px-3 py-2 bg-blue-600 text-white hover:bg-blue-500 rounded-xl font-bold text-xs transition-colors shadow-sm"
                          >
                            <Video size={12} /> {t('profile.interview_room')}
                          </button>
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
            
            <h2 className="text-xl font-black text-gray-900 dark:text-gray-100 tracking-tight pr-8 mb-4">{t('profile.applicant_profile')}</h2>
            
            <div className="flex items-center gap-4 mb-6 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-800">
              <div className="relative w-14 h-14 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden shrink-0 flex items-center justify-center font-bold text-gray-500 dark:text-gray-400 uppercase border border-gray-200 dark:border-gray-700">
                {selectedApplicant.profiles?.avatar_url ? <Image src={selectedApplicant.profiles.avatar_url} alt={t('profile.avatar_alt')} fill sizes="56px" className="object-cover" /> : selectedApplicant.profiles?.username?.substring(0, 2) || "??"}
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
                  <p className="text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-2">{t('profile.cover_letter')}</p>
                  <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{selectedApplicant.cover_letter || selectedApplicant.message || selectedApplicant.notes}</p>
                </div>
              )}

              {selectedApplicant.resume_url && (
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/50 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                  <div>
                    <p className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest mb-0.5">{t('profile.attached_document')}</p>
                    <p className="text-sm font-bold text-blue-900 dark:text-blue-100">{t('profile.candidate_cv')}</p>
                  </div>
                  <a href={selectedApplicant.resume_url} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-xs transition-colors shadow-sm shrink-0">
                    <FileText size={16} /> {t('profile.open_resume')}
                  </a>
                </div>
              )}

              {(selectedApplicant.resume_url || selectedApplicant.portfolio_url || selectedApplicant.email || selectedApplicant.phone || selectedApplicant.profiles?.github || selectedApplicant.profiles?.website || selectedApplicant.profiles?.location) && (
                <div className="p-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl space-y-3">
                  <p className="text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-2">{t('profile.contact_links')}</p>
                  {selectedApplicant.email && <p className="text-sm flex items-center gap-2"><strong className="text-gray-900 dark:text-gray-100">{t('profile.field_email')}</strong> <a href={`mailto:${selectedApplicant.email}`} className="text-blue-600 hover:underline">{selectedApplicant.email}</a></p>}
                  {selectedApplicant.phone && <p className="text-sm flex items-center gap-2"><strong className="text-gray-900 dark:text-gray-100">{t('profile.field_phone')}</strong> {selectedApplicant.phone}</p>}
                  {selectedApplicant.profiles?.location && <p className="text-sm flex items-center gap-2"><strong className="text-gray-900 dark:text-gray-100">{t('profile.field_location')}</strong> {selectedApplicant.profiles.location}</p>}
                  {selectedApplicant.portfolio_url && <p className="text-sm flex items-center gap-2"><strong className="text-gray-900 dark:text-gray-100">{t('profile.field_portfolio')}</strong> <a href={selectedApplicant.portfolio_url.startsWith('http') ? selectedApplicant.portfolio_url : `https://${selectedApplicant.portfolio_url}`} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">{t('profile.portfolio_link')}</a></p>}
                  {selectedApplicant.profiles?.github && <p className="text-sm flex items-center gap-2"><strong className="text-gray-900 dark:text-gray-100">{t('profile.field_github')}</strong> <a href={`https://github.com/${selectedApplicant.profiles.github}`} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">github.com/{selectedApplicant.profiles.github}</a></p>}
                  {selectedApplicant.profiles?.website && <p className="text-sm flex items-center gap-2"><strong className="text-gray-900 dark:text-gray-100">{t('profile.field_website')}</strong> <a href={selectedApplicant.profiles.website.startsWith('http') ? selectedApplicant.profiles.website : `https://${selectedApplicant.profiles.website}`} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">{selectedApplicant.profiles.website.replace(/^https?:\/\//, '')}</a></p>}
                </div>
              )}
            </div>

            <div className="flex flex-col gap-3 pt-4 border-t border-gray-100 dark:border-gray-800">
              {selectedApplicant.status !== 'accepted' && selectedApplicant.status !== 'declined' && selectedApplicant.status !== 'external_redirect' ? (
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => { handleAppAction(selectedApplicant.id, 'declined', selectedApplicant.user_id, activeJobForApplicants?.title); setSelectedApplicant(prev => ({...prev, status: 'declined'})); }}
                    className="flex-1 py-3.5 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 rounded-xl font-bold transition-colors border border-red-200 dark:border-red-800/50"
                  >
                    {t('profile.decline_application')}
                  </button>
                  <button
                    onClick={() => { handleAppAction(selectedApplicant.id, 'accepted', selectedApplicant.user_id, activeJobForApplicants?.title); setSelectedApplicant(prev => ({...prev, status: 'accepted'})); }}
                    className="flex-1 py-3.5 bg-green-600 hover:bg-green-500 text-white rounded-xl font-bold transition-colors shadow-sm"
                  >
                    {t('profile.accept_application')}
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <div className="flex-1 text-center py-3.5 bg-gray-50 dark:bg-gray-800 rounded-xl text-gray-500 dark:text-gray-400 font-bold uppercase tracking-widest text-xs border border-gray-200 dark:border-gray-700">
                    {t('profile.status_colon')} {selectedApplicant.status === 'external_redirect' ? t('profile.external_redirect') : (selectedApplicant.status || 'pending')}
                  </div>
                </div>
              )}
              {selectedApplicant.status === 'accepted' && (
                <button
                  onClick={() => { setSelectedApplicant(null); openInterviewModal(selectedApplicant, activeJobForApplicants); }}
                  className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold transition-colors shadow-md shadow-blue-500/20 flex items-center justify-center gap-2"
                >
                  <Video size={18} /> {t('profile.create_interview_room')}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* --- INTERVIEW TOAST --- */}
      {interviewToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[500] bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 px-5 py-3 rounded-xl text-sm font-bold shadow-xl animate-in slide-in-from-bottom-4 duration-300 max-w-sm text-center">
          {interviewToast}
        </div>
      )}

      {/* --- CREATE INTERVIEW ROOM MODAL --- */}
      {showInterviewModal && interviewTarget && (
        <div className="fixed inset-0 z-[450] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-gray-900/60 dark:bg-black/60 backdrop-blur-sm" onClick={() => setShowInterviewModal(false)} />
          <div className="relative w-full max-w-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-[2rem] shadow-2xl flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="p-6 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 flex justify-between items-start shrink-0 rounded-t-[2rem]">
              <div>
                <h3 className="text-xl font-black text-gray-900 dark:text-gray-100 flex items-center gap-2">
                  <Video size={20} className="text-blue-500" /> {t('profile.create_interview_room')}
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {t('profile.for_label')} <span className="font-bold text-blue-600 dark:text-blue-400">@{interviewTarget.applicant.profiles?.username}</span> · {interviewTarget.job?.title}
                </p>
              </div>
              <button onClick={() => setShowInterviewModal(false)} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full text-gray-500 dark:text-gray-400 transition-colors">
                <X size={18} />
              </button>
            </div>

            {/* Questions list */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-4">
              <p className="text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest">
                {t('profile.interview_questions', { n: interviewQuestions.filter(q => q.text.trim()).length })}
              </p>
              {interviewQuestions.map((q, i) => (
                <div key={i} className="space-y-2 p-4 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-2xl">
                  <div className="flex items-start gap-2">
                    <span className="shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-black mt-0.5">{i + 1}</span>
                    <div className="flex-1 space-y-2">
                      <input
                        type="text"
                        value={q.text}
                        onChange={e => {
                          const next = [...interviewQuestions];
                          next[i] = { ...next[i], text: e.target.value };
                          setInterviewQuestions(next);
                        }}
                        placeholder={t('profile.question_ph')}
                        className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                      />
                      <input
                        type="text"
                        value={q.context}
                        onChange={e => {
                          const next = [...interviewQuestions];
                          next[i] = { ...next[i], context: e.target.value };
                          setInterviewQuestions(next);
                        }}
                        placeholder={t('profile.context_ph')}
                        className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 text-xs text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                      />
                    </div>
                    {interviewQuestions.length > 1 && (
                      <button
                        onClick={() => setInterviewQuestions(prev => prev.filter((_, idx) => idx !== i))}
                        className="shrink-0 p-1.5 text-gray-400 hover:text-red-500 transition-colors mt-0.5"
                      >
                        <Trash size={14} />
                      </button>
                    )}
                  </div>
                </div>
              ))}

              <button
                onClick={() => setInterviewQuestions(prev => [...prev, { text: '', context: '' }])}
                className="w-full py-2.5 border-2 border-dashed border-gray-300 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-blue-400 dark:hover:border-blue-600 hover:text-blue-600 dark:hover:text-blue-400 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2"
              >
                <Plus size={16} /> {t('profile.add_question')}
              </button>
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 shrink-0 flex gap-3 rounded-b-[2rem]">
              <button onClick={() => setShowInterviewModal(false)} className="flex-1 py-3 px-4 rounded-xl text-gray-700 dark:text-gray-300 font-bold bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all">
                {t('profile.cancel')}
              </button>
              <button
                onClick={handleCreateInterview}
                disabled={creatingInterview || !interviewQuestions.some(q => q.text.trim())}
                className="flex-1 py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold transition-all shadow-md active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {creatingInterview ? <Loader2 size={16} className="animate-spin" /> : <Video size={16} />}
                {creatingInterview ? t('profile.creating') : t('profile.send_interview')}
              </button>
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
                <p className="text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-2 block pl-1">{t('profile.tags_tech')}</p>
                <div className="flex flex-wrap gap-2">
                  {viewJob.tags.map(tag => (
                    <span key={tag} className="text-xs bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 px-3 py-1.5 rounded-lg font-bold border border-blue-200 dark:border-blue-800/50">{tag}</span>
                  ))}
                </div>
              </div>
            )}
            
            {viewJob.description && (
              <div className="mb-6">
                <p className="text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-2 block pl-1">{t('profile.job_description')}</p>
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
                  <Link size={16} /> {t('profile.apply_externally')}
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
            <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">{t('profile.delete_opportunity_q')}</h3>
            <p className="text-gray-500 dark:text-gray-400 text-sm mb-8 leading-relaxed">
              {t('profile.remove_confirm_pre')} <span className="font-bold text-gray-700 dark:text-gray-300">{jobToDelete.title}</span>{t('profile.remove_confirm_post')}
            </p>
            <div className="flex flex-col gap-3">
              <button onClick={executeDeleteJob} className="w-full bg-red-600 hover:bg-red-500 text-white font-bold py-3.5 rounded-xl transition-all shadow-md active:scale-95 text-sm">
                {t('profile.confirm_delete')}
              </button>
              <button onClick={() => setJobToDelete(null)} className="w-full bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-bold py-3.5 rounded-xl transition-all border border-gray-200 dark:border-gray-700 shadow-sm text-sm">
                {t('profile.cancel')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Story Viewer — view this profile's stories */}
      {storyViewerOpen === true && profileStories.length > 0 && (
        <StoryViewer
          groups={[{ user: profile, stories: profileStories }]}
          startGroupIdx={0}
          currentUserId={currentUser?.id}
          onClose={() => setStoryViewerOpen(false)}
          onDelete={async (id) => {
            await supabase.from("stories").delete().eq("id", id);
            setStoryViewerOpen(false);
          }}
        />
      )}

      {/* Story Creator — own profile only */}
      {storyViewerOpen === "create" && isOwnProfile && (
        <StoryCreator
          currentUserId={currentUser?.id}
          onClose={() => setStoryViewerOpen(false)}
        />
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

/* ───────────────────────── Premium command center ───────────────────────── */

const fmtNum = (n) => Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(n || 0);

function StatTile({ icon: Icon, label, value }) {
  return (
    <div className="min-w-0 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 px-3 py-2">
      <div className="flex items-center gap-1.5 text-white/70"><Icon size={12} className="shrink-0" /><span className="text-[10px] font-bold uppercase tracking-wider truncate">{label}</span></div>
      <p className="text-lg font-black text-white mt-0.5 tabular-nums">{value}</p>
    </div>
  );
}

function FeaturedCard({ post }) {
  const { t } = useLanguage();
  return (
    <div className="rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden bg-gray-50 dark:bg-gray-800/40">
      {post.image_url && <div className="h-24 w-full overflow-hidden relative"><Image src={post.image_url} alt="" fill className="object-cover" referrerPolicy="no-referrer" unoptimized /></div>}
      <div className="p-3">
        <p className="text-sm font-bold text-gray-900 dark:text-gray-100 line-clamp-1">{post.title || t('profile.post_fallback')}</p>
        {post.content && <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mt-0.5">{post.content}</p>}
        <div className="flex items-center gap-3 mt-2 text-[11px] text-gray-400">
          <span className="inline-flex items-center gap-1"><Heart size={11} />{post.likes?.length || 0}</span>
          <span className="inline-flex items-center gap-1"><MessageSquare size={11} />{post.comments?.length || 0}</span>
        </div>
      </div>
    </div>
  );
}

function ProfileInsights({ profile, followersCount, profilePosts, onEdit }) {
  const { t } = useLanguage();
  const [manageFeatured, setManageFeatured] = useState(false);
  const [pinned, setPinned] = useState(() => Array.isArray(profile?.preferences?.pinned_posts) ? profile.preferences.pinned_posts : []);
  const [savingPins, setSavingPins] = useState(false);

  const postCount = profilePosts.length;
  const totalLikes = profilePosts.reduce((s, p) => s + (p.likes?.length || 0), 0);
  const totalComments = profilePosts.reduce((s, p) => s + (p.comments?.length || 0), 0);
  const views = profile?.profile_views || 0;

  const checks = [
    { key: 'avatar',     label: t('profile.chk_avatar'),   done: !!profile?.avatar_url },
    { key: 'banner',     label: t('profile.chk_banner'),    done: !!profile?.banner_url },
    { key: 'headline',   label: t('profile.chk_headline'),      done: !!profile?.headline },
    { key: 'bio',        label: t('profile.chk_bio'),        done: !!profile?.bio },
    { key: 'location',   label: t('profile.chk_location'),     done: !!profile?.location },
    { key: 'skills',     label: t('profile.chk_skills'),      done: Array.isArray(profile?.skills) && profile.skills.length > 0 },
    { key: 'experience', label: t('profile.chk_experience'),   done: Array.isArray(profile?.experience) && profile.experience.length > 0 },
    { key: 'links',      label: t('profile.chk_links'),done: !!(profile?.github || profile?.website) },
  ];
  const doneCount = checks.filter((c) => c.done).length;
  const pct = Math.round((doneCount / checks.length) * 100);

  let rep = (profile?.is_verified ? 25 : 0)
    + Math.min(20, followersCount * 2)
    + Math.min(20, postCount * 3)
    + Math.min(15, totalLikes)
    + Math.round((pct / 100) * 20);
  rep = Math.min(100, Math.round(rep));
  const repTier = rep >= 80 ? t('profile.tier_excellent') : rep >= 60 ? t('profile.tier_strong') : rep >= 35 ? t('profile.tier_building') : t('profile.tier_new');

  const togglePin = async (id) => {
    const next = pinned.includes(id) ? pinned.filter((x) => x !== id) : [...pinned, id].slice(-6);
    setPinned(next); setSavingPins(true);
    try {
      const prefs = { ...(profile.preferences || {}), pinned_posts: next };
      await supabase.from('profiles').update({ preferences: prefs }).eq('id', profile.id);
    } catch { /* non-fatal */ }
    setSavingPins(false);
  };
  const pinnedPosts = pinned.map((id) => profilePosts.find((p) => p.id === id)).filter(Boolean);

  const R = 26, CIRC = 2 * Math.PI * R;

  return (
    <div className="w-full mt-6 space-y-4">
      {/* Gradient stats band — reputation summary + key metrics (no avatar/name; merged with the card above) */}
      <div className="relative overflow-hidden rounded-3xl p-4 sm:p-5 bg-gradient-to-br from-brand-500 via-brand-600 to-trust-500 shadow-lg shadow-brand-500/20">
        <div className="absolute -top-16 -right-10 w-48 h-48 rounded-full bg-white/10 blur-2xl pointer-events-none" />
        <div className="relative flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex items-center gap-2.5 shrink-0">
            <div className="w-11 h-11 rounded-2xl bg-white/15 flex items-center justify-center shrink-0"><Award size={20} className="text-white" /></div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-wider text-white/70">{t('profile.reputation')}</p>
              <p className="text-lg font-black text-white leading-none mt-0.5 truncate">{repTier} <span className="text-white/70 font-bold">· {rep}</span></p>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 w-full sm:w-auto sm:ml-auto sm:max-w-md">
            <StatTile icon={Users} label={t('profile.stat_network')} value={fmtNum(followersCount)} />
            <StatTile icon={Eye} label={t('profile.stat_views')} value={fmtNum(views)} />
            <StatTile icon={Heart} label={t('profile.stat_likes')} value={fmtNum(totalLikes)} />
            <StatTile icon={FileText} label={t('profile.stat_posts')} value={fmtNum(postCount)} />
          </div>
        </div>
      </div>

      {/* Strength · Reputation · Analytics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Profile strength */}
        <div className="rounded-3xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-5">
          <div className="flex items-center gap-4">
            <div className="relative w-16 h-16 shrink-0">
              <svg viewBox="0 0 64 64" className="w-16 h-16 -rotate-90">
                <circle cx="32" cy="32" r={R} fill="none" strokeWidth="7" className="stroke-gray-200 dark:stroke-gray-800" />
                <circle cx="32" cy="32" r={R} fill="none" strokeWidth="7" strokeLinecap="round" className="stroke-brand-500" strokeDasharray={CIRC} strokeDashoffset={CIRC - (pct / 100) * CIRC} />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-sm font-black text-gray-900 dark:text-gray-100">{pct}%</span>
            </div>
            <div>
              <p className="text-sm font-black text-gray-900 dark:text-gray-100">{t('profile.profile_strength')}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{doneCount}/{checks.length} {t('profile.completed')}</p>
            </div>
          </div>
          <div className="mt-3 space-y-1.5">
            {checks.filter((c) => !c.done).slice(0, 3).map((c) => (
              <button key={c.key} onClick={onEdit} className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                <Plus size={12} /> {c.label}
              </button>
            ))}
            {doneCount === checks.length && <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1"><Check size={13} /> {t('profile.all_set')}</p>}
          </div>
        </div>

        {/* Reputation */}
        <div className="rounded-3xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm font-black text-gray-900 dark:text-gray-100 flex items-center gap-1.5"><Award size={15} className="text-amber-500" /> {t('profile.reputation')}</p>
            <span className="text-2xl font-black text-gray-900 dark:text-gray-100 tabular-nums">{rep}</span>
          </div>
          <div className="mt-2 h-2 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
            <div className="h-full rounded-full bg-gradient-to-r from-amber-400 to-emerald-500 transition-all" style={{ width: `${rep}%` }} />
          </div>
          <ul className="mt-3 space-y-1.5 text-xs text-gray-600 dark:text-gray-300">
            <li className="flex items-center gap-2"><Shield size={12} className={profile?.is_verified ? 'text-emerald-500' : 'text-gray-400'} /> {profile?.is_verified ? t('profile.verified_id') : t('profile.not_verified')}</li>
            <li className="flex items-center gap-2"><Users size={12} className="text-blue-500" /> {fmtNum(followersCount)} {t('profile.connections_lc')}</li>
            <li className="flex items-center gap-2"><FileText size={12} className="text-violet-500" /> {postCount} {t('profile.contributions')}</li>
            <li className="flex items-center gap-2"><Heart size={12} className="text-rose-500" /> {fmtNum(totalLikes)} {t('profile.likes_earned')}</li>
          </ul>
        </div>

        {/* Analytics */}
        <div className="rounded-3xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-5">
          <p className="text-sm font-black text-gray-900 dark:text-gray-100 flex items-center gap-1.5 mb-3"><Activity size={15} className="text-brand-500" /> {t('profile.analytics_label')}</p>
          <div className="grid grid-cols-2 gap-2.5">
            {[[t('profile.stat_views'), views, Eye], [t('profile.stat_posts'), postCount, FileText], [t('profile.stat_likes'), totalLikes, Heart], [t('profile.stat_comments'), totalComments, MessageSquare]].map(([l, v, Ic]) => (
              <div key={l} className="rounded-xl bg-gray-50 dark:bg-gray-800/50 p-2.5">
                <div className="flex items-center gap-1 text-gray-400"><Ic size={11} /><span className="text-[9px] font-bold uppercase tracking-wide">{l}</span></div>
                <p className="text-lg font-black text-gray-900 dark:text-gray-100 tabular-nums">{fmtNum(v)}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Featured / pinned */}
      <div className="rounded-3xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-5">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-black text-gray-900 dark:text-gray-100 flex items-center gap-1.5"><Award size={15} className="text-premium-500" /> {t('profile.featured')}</p>
          {profilePosts.length > 0 && (
            <button onClick={() => setManageFeatured((v) => !v)} className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline">{manageFeatured ? t('profile.done') : t('profile.manage')}</button>
          )}
        </div>
        {pinnedPosts.length === 0 && !manageFeatured && (
          <p className="text-sm text-gray-400 dark:text-gray-500">{t('profile.featured_empty')} {profilePosts.length > 0 ? t('profile.tap_manage') : t('profile.create_first')}</p>
        )}
        {pinnedPosts.length > 0 && !manageFeatured && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {pinnedPosts.map((p) => <FeaturedCard key={p.id} post={p} />)}
          </div>
        )}
        {manageFeatured && (
          <div className="space-y-1.5 max-h-72 overflow-y-auto">
            {profilePosts.map((p) => {
              const on = pinned.includes(p.id);
              return (
                <button key={p.id} onClick={() => togglePin(p.id)} className={`w-full flex items-center gap-3 p-2.5 rounded-xl border text-left transition-colors ${on ? 'border-indigo-400 bg-indigo-50 dark:bg-indigo-900/20' : 'border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50'}`}>
                  <span className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 ${on ? 'bg-brand-500 text-white' : 'border border-gray-300 dark:border-gray-700'}`}>{on && <Check size={12} />}</span>
                  <span className="text-sm text-gray-700 dark:text-gray-200 truncate flex-1">{p.title || p.content?.slice(0, 60) || t('profile.untitled_post')}</span>
                  <span className="text-[10px] text-gray-400 shrink-0 inline-flex items-center gap-1"><Heart size={10} />{p.likes?.length || 0}</span>
                </button>
              );
            })}
            <p className="text-[11px] text-gray-400 pt-1">{t('profile.up_to_6')}{savingPins ? ' ' + t('profile.saving') : ''}</p>
          </div>
        )}
      </div>
    </div>
  );
}