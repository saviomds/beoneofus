'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from '../../supabaseClient';
import Image from 'next/image';
import {
  MessageSquare, Heart, Share2, MoreHorizontal,
  Code, Trash2, Edit3, X, Save, AlertTriangle, Send, Copy, Check, Bookmark, GitBranch, Link as LinkIcon, ExternalLink,
  Sparkles, Loader2, ShieldAlert,
  Play, Pause, Volume2, VolumeX, Maximize, List, LayoutGrid
} from 'lucide-react';
import ProfileContent from "./ProfileContent";
import VerifiedBadge from "../../components/VerifiedBadge";
import PremiumBadge from "../../components/PremiumBadge";
import ReactMarkdown from "react-markdown";
import StoriesBar from "./Stories";

// Stable seeded hash: consistent within a session, different across page loads
function feedHash(id, seed) {
  const s = id + seed;
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h) ^ s.charCodeAt(i);
  return (h >>> 0) / 4294967296;
}

// Normalize post media: supports new media_items array and old image_url fallback
function getMediaItems(post) {
  if (post.media_items?.length > 0) return post.media_items;
  if (post.image_url) return [{ type: 'image', url: post.image_url, fit: post.image_fit || 'cover', quality: null }];
  return [];
}

function qualityBadgeColor(q) {
  if (q === '4K') return 'bg-blue-600';
  if (q === '1080p') return 'bg-green-600';
  if (q === '720p') return 'bg-yellow-600';
  return 'bg-gray-500';
}

function VideoPlayer({ src, quality: propQuality, urlType }) {
  const isEmbed = urlType === 'youtube' || urlType === 'vimeo';

  // All hooks must be declared unconditionally before any early return
  const videoRef = useRef(null);
  const wrapRef  = useRef(null);
  const [detQ, setDetQ] = useState(propQuality || null);
  const [selQ, setSelQ] = useState('auto');
  const [qMenu, setQMenu] = useState(false);

  const onMeta = () => {
    const v = videoRef.current;
    if (!v || propQuality) return;
    const p = Math.max(v.videoWidth, v.videoHeight);
    if      (p >= 3840) setDetQ('4K');
    else if (p >= 1920) setDetQ('1080p');
    else if (p >= 1280) setDetQ('720p');
    else if (p >= 854)  setDetQ('480p');
    else if (p >  0)    setDetQ('360p');
  };

  useEffect(() => {
    if (isEmbed) return;
    const el = wrapRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(([entry]) => {
      const v = videoRef.current;
      if (!v) return;
      if (entry.isIntersecting) {
        v.muted = true;
        v.play().catch(() => {});
      } else if (!v.paused) {
        v.requestPictureInPicture?.().catch(() => v.pause());
      }
    }, { threshold: 0.5 });
    obs.observe(el);
    return () => obs.disconnect();
  }, [isEmbed]);

  const qualityOptions = React.useMemo(() => {
    if (isEmbed) return [];
    const ladder = ['4K','1080p','720p','480p','360p'];
    const idx = ladder.indexOf(detQ);
    const below = idx >= 0 ? ladder.slice(idx) : [];
    return [
      { v: 'auto', l: detQ ? `Auto (${detQ})` : 'Auto' },
      ...below.map(q => ({ v: q, l: q === '4K' ? '4K Ultra HD' : q === '1080p' ? '1080p HD' : q === '720p' ? '720p HD' : q })),
    ];
  }, [detQ, isEmbed]);

  const qFilter = selQ === '480p' ? 'contrast(0.93)' : selQ === '360p' ? 'blur(0.5px) contrast(0.87) saturate(0.88)' : 'none';
  const dispQ   = selQ === 'auto' ? detQ : selQ;

  if (isEmbed) {
    return (
      <div className="relative w-full aspect-video bg-black rounded-xl overflow-hidden">
        <iframe
          src={src}
          className="w-full h-full border-0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          loading="lazy"
        />
        <div className="absolute top-3 left-3 bg-black/70 text-white text-[9px] font-black px-2 py-0.5 rounded-md pointer-events-none z-10">
          {urlType === 'youtube' ? 'YouTube' : 'Vimeo'}
        </div>
      </div>
    );
  }

  return (
    <div ref={wrapRef} className="relative w-full aspect-video bg-black rounded-xl overflow-hidden">
      <video
        ref={videoRef}
        src={src}
        controls
        playsInline
        preload="metadata"
        onLoadedMetadata={onMeta}
        onClick={(e) => e.stopPropagation()}
        className="w-full h-full object-contain"
        style={{ filter: qFilter }}
      />

      {dispQ && (
        <div className={`absolute top-3 left-3 ${qualityBadgeColor(dispQ)} text-white text-[10px] font-black px-2 py-0.5 rounded-md pointer-events-none z-10`}>
          {dispQ}
        </div>
      )}

      <div className="absolute top-3 right-3 z-10">
        <button
          onClick={(e) => { e.stopPropagation(); setQMenu(v => !v); }}
          className={`text-[10px] font-black px-2 py-0.5 rounded shadow ${dispQ ? qualityBadgeColor(dispQ) + ' text-white' : 'bg-black/60 text-white/80'}`}
        >
          {dispQ || 'HD'} ▾
        </button>
        {qMenu && (
          <div
            className="absolute top-7 right-0 bg-gray-950/95 border border-white/10 rounded-xl overflow-hidden shadow-2xl min-w-[140px] animate-in fade-in zoom-in-95 duration-100"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-white/40 text-[9px] font-black uppercase tracking-widest px-3 pt-2 pb-1 border-b border-white/10">Quality</p>
            {qualityOptions.map(o => (
              <button
                key={o.v}
                onClick={(e) => { e.stopPropagation(); setSelQ(o.v); setQMenu(false); }}
                className={`w-full text-left px-3 py-2 text-xs font-semibold flex items-center justify-between gap-3 transition-colors ${selQ === o.v ? 'bg-white/15 text-white' : 'text-white/65 hover:bg-white/10 hover:text-white'}`}
              >
                {o.l} {selQ === o.v && <Check size={11} />}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Multi-media grid display for post cards
function MediaGrid({ items }) {
  const count = items.length;
  if (count === 0) return null;

  const MediaItem = ({ item, className }) => (
    <div className={`relative overflow-hidden bg-gray-100 dark:bg-gray-900 ${className}`}>
      {item.type === 'video' ? (
        <VideoPlayer src={item.url} quality={item.quality} urlType={item.videoUrlType} />
      ) : (
        <Image
          src={item.url}
          alt="Post media"
          fill
          sizes="(max-width: 768px) 100vw, 600px"
          className={item.fit === 'contain' ? 'object-contain' : 'object-cover'}
        />
      )}
    </div>
  );

  if (count === 1) {
    const item = items[0];
    return (
      <div className="rounded-xl overflow-hidden border border-gray-200 dark:border-gray-800">
        {item.type === 'video' ? (
          <VideoPlayer src={item.url} quality={item.quality} urlType={item.videoUrlType} />
        ) : (
          <div className={`relative w-full aspect-video ${item.fit === 'contain' ? 'bg-gray-50 dark:bg-gray-900' : ''}`}>
            <Image src={item.url} alt="Post media" fill sizes="(max-width: 768px) 100vw, 600px" className={item.fit === 'contain' ? 'object-contain' : 'object-cover'} />
          </div>
        )}
      </div>
    );
  }

  if (count === 2) {
    return (
      <div className="grid grid-cols-2 gap-0.5 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-800">
        {items.map(item => <MediaItem key={item.url} item={item} className="aspect-square" />)}
      </div>
    );
  }

  if (count === 3) {
    return (
      <div className="flex gap-0.5 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-800" style={{ height: '300px' }}>
        <div className="flex-1 relative overflow-hidden bg-gray-100 dark:bg-gray-900">
          {items[0].type === 'video' ? (
            <VideoPlayer src={items[0].url} quality={items[0].quality} urlType={items[0].videoUrlType} />
          ) : (
            <Image src={items[0].url} alt="" fill sizes="300px" className={items[0].fit === 'contain' ? 'object-contain' : 'object-cover'} />
          )}
        </div>
        <div className="w-5/12 flex flex-col gap-0.5">
          {items.slice(1).map(item => <MediaItem key={item.url} item={item} className="flex-1" />)}
        </div>
      </div>
    );
  }

  // 4+ items: 2×2 grid with overflow badge
  const visible = items.slice(0, 4);
  const overflow = count - 4;
  return (
    <div className="grid grid-cols-2 gap-0.5 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-800">
      {visible.map((item, i) => (
        <div key={item.url + i} className="relative aspect-square overflow-hidden bg-gray-100 dark:bg-gray-900">
          {item.type === 'video' ? (
            <VideoPlayer src={item.url} quality={item.quality} urlType={item.videoUrlType} />
          ) : (
            <Image src={item.url} alt="" fill sizes="200px" className="object-cover" />
          )}
          {item.type === 'video' && item.quality && (
            <span className={`absolute top-2 left-2 text-white text-[9px] font-black px-1.5 py-0.5 rounded z-10 ${qualityBadgeColor(item.quality)}`}>{item.quality}</span>
          )}
          {i === 3 && overflow > 0 && (
            <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
              <span className="text-white font-black text-3xl">+{overflow}</span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export default function FeedContent() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [activeMenu, setActiveMenu] = useState(null);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [activeTab, setActiveTab] = useState('following');
  const [feedLayout, setFeedLayout] = useState(() => {
    if (typeof window !== 'undefined') return localStorage.getItem('beoneofus_feed_layout') || 'list';
    return 'list';
  });
  // Seed regenerated on manual refresh or page mount → different feed order each time
  const [feedSeed, setFeedSeed] = useState(() => Math.random());
  const [newPostBanner, setNewPostBanner] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Pull-to-refresh tracking
  const pullStartY = useRef(0);
  const pullDistance = useRef(0);
  const [pullIndicator, setPullIndicator] = useState(0); // 0-100 px visual pull

  // Interaction States
  const [expandedComments, setExpandedComments] = useState({});
  const [newComments, setNewComments] = useState({});
  const [isSuggesting, setIsSuggesting] = useState({});
  const [postSummaries, setPostSummaries] = useState({});
  const [isSummarizing, setIsSummarizing] = useState({});
  const [postAnalyses, setPostAnalyses] = useState({});
  const [isAnalyzing, setIsAnalyzing] = useState({});

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

  // Member Spotlight
  const [memberSpotlight, setMemberSpotlight] = useState([]);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3000);
  };

  const toggleLayout = (layout) => {
    setFeedLayout(layout);
    if (typeof window !== 'undefined') localStorage.setItem('beoneofus_feed_layout', layout);
  };

  const fetchPosts = useCallback(async (silent = false) => {
    try {
      const { data, error } = await supabase
        .from('posts')
        .select(`
          *,
          profiles:user_id (username, status, avatar_url, github, website, is_verified, is_premium, is_trial_premium, is_admin, profile_visibility),
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
      if (!silent) setLoading(false);
    }
  }, []);

  const handleManualRefresh = useCallback(async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    setNewPostBanner(false);
    setFeedSeed(Math.random());
    await fetchPosts(true);
    setIsRefreshing(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [isRefreshing, fetchPosts]);

  // Touch handlers for pull-to-refresh (mobile)
  const onTouchStart = useCallback((e) => {
    if (window.scrollY > 10) return;
    pullStartY.current = e.touches[0].clientY;
    pullDistance.current = 0;
  }, []);

  const onTouchMove = useCallback((e) => {
    if (pullStartY.current === 0) return;
    const delta = e.touches[0].clientY - pullStartY.current;
    if (delta < 0) { pullDistance.current = 0; setPullIndicator(0); return; }
    pullDistance.current = Math.min(delta, 90);
    setPullIndicator(Math.min(delta, 90));
  }, []);

  const onTouchEnd = useCallback(() => {
    if (pullDistance.current > 65) handleManualRefresh();
    pullStartY.current = 0;
    pullDistance.current = 0;
    setPullIndicator(0);
  }, [handleManualRefresh]);

  useEffect(() => {
    const initFeed = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setCurrentUserId(session?.user?.id);
      await fetchPosts();

      // Build member spotlight: one card per user showing their first post
      const { data: oldestPosts } = await supabase
        .from('posts')
        .select('id, title, content, image_url, image_fit, created_at, user_id, profiles:user_id(username, avatar_url, status, is_verified, is_premium, is_trial_premium, is_admin, profile_visibility)')
        .order('created_at', { ascending: true })
        .limit(300);
      if (oldestPosts) {
        const seen = new Set();
        const spotlight = [];
        for (const post of oldestPosts) {
          if (!seen.has(post.user_id) && post.profiles) {
            seen.add(post.user_id);
            spotlight.push(post);
          }
          if (spotlight.length >= 24) break;
        }
        // Verified first, then premium, then rest
        spotlight.sort((a, b) => {
          const score = (p) => (p?.is_verified ? 4 : 0) + (p?.is_premium || p?.is_admin ? 2 : 0);
          return score(b.profiles) - score(a.profiles);
        });
        setMemberSpotlight(spotlight);
      }
    };

    initFeed();

    // Real-time: new posts show a banner; likes/comments update silently
    const subscription = supabase.channel('feed-updates')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'posts' }, () => {
        setNewPostBanner(true);
        fetchPosts(true);
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'posts' }, () => fetchPosts(true))
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'posts' }, () => fetchPosts(true))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'likes' }, () => fetchPosts(true))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'comments' }, () => fetchPosts(true))
      .subscribe();

    return () => supabase.removeChannel(subscription);
  }, [fetchPosts]);

  // --- SORTING LOGIC ---
  const displayedPosts = React.useMemo(() => {
    const sorted = [...posts];

    // Premium+verified always float to top across all tabs
    // premium+verified=300, premium-only=200, verified-only=100, everyone else=0
    const statusBoost = (p) => {
      const isPremium = p.profiles?.is_premium || p.profiles?.is_admin;
      const isVerified = p.profiles?.is_verified;
      if (isPremium && isVerified) return 300;
      if (isPremium) return 200;
      if (isVerified) return 100;
      return 0;
    };

    if (activeTab === 'code review') {
      return sorted
        .filter(p => p.code_snippet && p.code_snippet.trim().length > 0)
        .sort((a, b) => {
          const boost = statusBoost(b) - statusBoost(a);
          if (boost !== 0) return boost;
          return new Date(b.created_at) - new Date(a.created_at);
        });
    }
    if (activeTab === 'featured') {
      return sorted.sort((a, b) => {
        const boost = statusBoost(b) - statusBoost(a);
        if (boost !== 0) return boost;
        return (b.likes?.length || 0) - (a.likes?.length || 0);
      });
    }
    if (activeTab === 'rising') {
      const now = new Date();
      return sorted.sort((a, b) => {
        const boost = statusBoost(b) - statusBoost(a);
        if (boost !== 0) return boost;
        const aScore = (a.likes?.length || 0) * 2 + (a.comments?.length || 0) * 3;
        const bScore = (b.likes?.length || 0) * 2 + (b.comments?.length || 0) * 3;
        const aAge = Math.max(1, (now - new Date(a.created_at)) / 3600000);
        const bAge = Math.max(1, (now - new Date(b.created_at)) / 3600000);
        return (bScore / Math.pow(bAge, 1.5)) - (aScore / Math.pow(aAge, 1.5));
      });
    }
    // 'following' — status boost baked into base score so it dominates recency/engagement variance
    const now = Date.now();
    return sorted.sort((a, b) => {
      const aHours = Math.max(0, (now - new Date(a.created_at)) / 3600000);
      const bHours = Math.max(0, (now - new Date(b.created_at)) / 3600000);
      const aBase = statusBoost(a) * 2 + Math.max(0, 100 - aHours * 1.1) + (a.likes?.length || 0) * 5 + (a.comments?.length || 0) * 8;
      const bBase = statusBoost(b) * 2 + Math.max(0, 100 - bHours * 1.1) + (b.likes?.length || 0) * 5 + (b.comments?.length || 0) * 8;
      // ±20 pts variance never overrides the 200-600 pt status gap
      const aVar = (feedHash(a.id, feedSeed) - 0.5) * 40;
      const bVar = (feedHash(b.id, feedSeed) - 0.5) * 40;
      return (bBase + bVar) - (aBase + aVar);
    });
  }, [posts, activeTab, feedSeed]);

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

    // Optimistically update the UI instantly
    setPosts(prevPosts => prevPosts.map(post => {
      if (post.id === postId) {
        return {
          ...post,
          likes: hasLiked
            ? (post.likes || []).filter(l => l.user_id !== currentUserId)
            : [...(post.likes || []), { user_id: currentUserId }]
        };
      }
      return post;
    }));

    try {
      if (hasLiked) {
        await supabase.from('likes').delete().eq('post_id', postId).eq('user_id', currentUserId);
      } else {
        await supabase.from('likes').insert({ post_id: postId, user_id: currentUserId });
        // Notify the post author (skip if liking own post)
        const post = posts.find(p => p.id === postId);
        if (post?.user_id && post.user_id !== currentUserId) {
          await supabase.from('notifications').insert({
            receiver_id: post.user_id,
            actor_id: currentUserId,
            type: 'like',
            content: 'liked your post',
          });
        }
      }
    } catch (err) {
      console.error(err);
      fetchPosts();
    }
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
      // Notify the post author (skip if commenting on own post)
      const post = posts.find(p => p.id === postId);
      if (post?.user_id && post.user_id !== currentUserId) {
        await supabase.from('notifications').insert({
          receiver_id: post.user_id,
          actor_id: currentUserId,
          type: 'comment',
          content: commentText.length > 100 ? commentText.slice(0, 100) + '…' : commentText,
        });
      }
    } catch (err) { alert("Error adding comment: " + err.message); }
  };

  const aiErrorMessage = (error) =>
    error instanceof TypeError
      ? 'AI unavailable — check your connection or restart the dev server.'
      : error.message;

  // --- AI SUGGEST REPLY LOGIC ---
  const handleSuggestReply = async (post) => {
    if (isSuggesting[post.id]) return;
    setIsSuggesting(prev => ({ ...prev, [post.id]: true }));
    try {
      const prompt = `Draft a very brief, friendly, and insightful reply (1-2 sentences maximum) to this developer's post. Return ONLY the exact comment text, without any quotes, filler, or intro. Post content: "${post.title ? post.title + ' - ' : ''}${post.content || post.code_snippet || 'Media post'}"`;

      const res = await fetch("/api/chats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [{ role: "user", content: prompt }] }),
      });

      const text = await res.text();
      let data;
      try { data = JSON.parse(text); } catch (e) { throw new Error("AI API not active. Please restart your dev server."); }
      if (!res.ok) throw new Error(data.error || "Failed to get AI response");

      // Strip any accidental quotes from the start/end of the AI response
      const cleanReply = data.message.content.replace(/^["']|["']$/g, '').trim();
      setNewComments(prev => ({ ...prev, [post.id]: cleanReply }));

    } catch (error) {
      showToast(aiErrorMessage(error));
    } finally {
      setIsSuggesting(prev => ({ ...prev, [post.id]: false }));
    }
  };

  // --- AI SUMMARIZE LOGIC ---
  const handleSummarize = async (post) => {
    if (isSummarizing[post.id]) return;
    
    // Toggle summary off if it's already generated
    if (postSummaries[post.id]) {
      const newSummaries = { ...postSummaries };
      delete newSummaries[post.id];
      setPostSummaries(newSummaries);
      return;
    }

    setIsSummarizing(prev => ({ ...prev, [post.id]: true }));
    try {
      const prompt = `Analyze and summarize the following developer post in 1-2 short, concise bullet points. Return ONLY the summary without any conversational filler. Post content: "${post.title ? post.title + ' - ' : ''}${post.content || post.code_snippet || 'Media post'}"`;

      const res = await fetch("/api/chats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [{ role: "user", content: prompt }] }),
      });

      const text = await res.text();
      let data;
      try { data = JSON.parse(text); } catch (e) { throw new Error("AI API not active. Please restart your dev server."); }
      if (!res.ok) throw new Error(data.error || "Failed to get AI response");

      setPostSummaries(prev => ({ ...prev, [post.id]: data.message.content.trim() }));
    } catch (error) {
      showToast(aiErrorMessage(error));
    } finally {
      setIsSummarizing(prev => ({ ...prev, [post.id]: false }));
    }
  };

  // --- AI ANALYZE CODE LOGIC ---
  const handleAnalyzeCode = async (post) => {
    if (isAnalyzing[post.id]) return;
    
    // Toggle analysis off if it's already generated
    if (postAnalyses[post.id]) {
      const newAnalyses = { ...postAnalyses };
      delete newAnalyses[post.id];
      setPostAnalyses(newAnalyses);
      return;
    }

    setIsAnalyzing(prev => ({ ...prev, [post.id]: true }));
    try {
      const prompt = `Analyze this code snippet for potential bugs, performance issues, or security vulnerabilities. Return ONLY a concise bulleted list of findings. If it looks perfectly fine, just say "No obvious issues found." Code:\n\n${post.code_snippet}`;

      const res = await fetch("/api/chats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [{ role: "user", content: prompt }] }),
      });

      const text = await res.text();
      let data;
      try { data = JSON.parse(text); } catch (e) { throw new Error("AI API not active. Please restart your dev server."); }
      if (!res.ok) throw new Error(data.error || "Failed to get AI response");

      setPostAnalyses(prev => ({ ...prev, [post.id]: data.message.content.trim() }));
    } catch (error) {
      showToast(aiErrorMessage(error));
    } finally {
      setIsAnalyzing(prev => ({ ...prev, [post.id]: false }));
    }
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
        <div key={i} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 shadow-sm">
          <div className="flex justify-between items-start mb-4">
            <div className="flex items-center gap-3 w-full">
                <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-800 animate-pulse shrink-0"></div>
              <div className="space-y-2 flex-1">
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-32"></div>
                <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-20"></div>
              </div>
            </div>
          </div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-3/4"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-full"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-5/6"></div>
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div
      className="space-y-4"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >

      {/* Pull-to-refresh indicator (mobile) */}
      {pullIndicator > 0 && (
        <div
          className="flex items-center justify-center gap-2 text-blue-600 dark:text-blue-400 text-sm font-bold overflow-hidden transition-all"
          style={{ height: `${pullIndicator}px`, opacity: pullIndicator / 90 }}
        >
          <Loader2 size={16} className={pullIndicator > 65 ? 'animate-spin' : ''} />
          {pullIndicator > 65 ? 'Release to refresh' : 'Pull to refresh'}
        </div>
      )}

      {/* Refreshing overlay */}
      {isRefreshing && (
        <div className="flex items-center justify-center gap-2 py-3 text-blue-600 dark:text-blue-400 text-sm font-bold animate-pulse">
          <Loader2 size={16} className="animate-spin" /> Refreshing feed…
        </div>
      )}

      {/* --- STORIES BAR --- */}
      {currentUserId && <StoriesBar currentUserId={currentUserId} />}

      {/* --- MEMBER SPOTLIGHT --- */}
      {memberSpotlight.length > 0 && (
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-3 px-0.5">Network Members</p>
          <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1 snap-x snap-mandatory">
            {memberSpotlight.map((post) => {
              const p = post.profiles;
              const isPremium = p?.is_premium || p?.is_admin;
              const isVerified = p?.is_verified;
              const initial = p?.username?.[0]?.toUpperCase() || '?';
              return (
                <div
                  key={post.user_id}
                  onClick={() => setSelectedUserId(post.user_id)}
                  className={`snap-start shrink-0 cursor-pointer rounded-2xl overflow-hidden transition-all duration-200 hover:shadow-xl hover:-translate-y-0.5 flex flex-col ${
                    isPremium
                      ? 'w-52 border-2 border-yellow-400/70 dark:border-yellow-500/50 bg-gradient-to-b from-yellow-50 to-white dark:from-yellow-900/10 dark:to-gray-900 shadow-yellow-100 dark:shadow-yellow-900/10 shadow-md'
                      : 'w-44 border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900'
                  }`}
                >
                  {/* Image or color header */}
                  {post.image_url ? (
                    <div className="relative h-20 w-full shrink-0">
                      <Image src={post.image_url} alt="" fill sizes="208px" className={(post.image_fit || 'cover') === 'contain' ? 'object-contain' : 'object-cover'} />
                      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/30" />
                    </div>
                  ) : (
                    <div className={`h-10 w-full shrink-0 ${isPremium ? 'bg-gradient-to-r from-yellow-400 via-amber-400 to-yellow-500' : isVerified ? 'bg-gradient-to-r from-blue-500 to-indigo-600' : 'bg-gradient-to-r from-slate-600 to-slate-800'}`} />
                  )}

                  {/* Avatar + info */}
                  <div className={`px-3 pb-3 flex flex-col flex-1 ${post.image_url ? '-mt-5' : '-mt-4'}`}>
                    <div className={`relative w-9 h-9 rounded-full border-2 ${isPremium ? 'border-yellow-400 dark:border-yellow-500' : 'border-white dark:border-gray-900'} bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-xs font-black uppercase overflow-hidden shrink-0 mb-1.5 shadow-sm`}>
                      {p?.avatar_url ? (
                        <Image src={p.avatar_url} alt="" fill sizes="36px" className="object-cover" />
                      ) : (
                        <span className="text-gray-600 dark:text-gray-300">{initial}</span>
                      )}
                    </div>

                    <div className="flex items-center gap-1 min-w-0">
                      <span className="text-[11px] font-black text-gray-900 dark:text-gray-100 truncate">@{p?.username}</span>
                      {isVerified && <VerifiedBadge size={11} />}
                      {isPremium && p?.profile_visibility?.premium_badge !== false && <PremiumBadge size={11} isTrial={!!p?.is_trial_premium} />}
                    </div>

                    <p className="text-[9px] text-gray-400 dark:text-gray-500 truncate font-medium mt-0.5">{p?.status || 'Network Member'}</p>

                    {isPremium && p?.profile_visibility?.premium_badge !== false && (
                      <span className={`mt-1.5 self-start text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border ${p?.is_trial_premium ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800/50' : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800/50'}`}>
                        {p?.is_trial_premium ? 'Freemium' : 'Premium'}
                      </span>
                    )}

                    {(post.title || post.content) && (
                      <p className={`text-[10px] text-gray-500 dark:text-gray-400 leading-relaxed mt-2 ${isPremium ? 'line-clamp-3' : 'line-clamp-2'}`}>
                        {(post.title || post.content || '').replace(/[#*`_[\]()]/g, '').slice(0, isPremium ? 80 : 55)}
                      </p>
                    )}

                    {isVerified && (
                      <div className="flex items-center gap-1 mt-2">
                        <span className="text-[8px] font-black uppercase tracking-widest text-blue-600 dark:text-blue-400">Verified Member</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* --- FEED TABS + REFRESH BUTTON --- */}
      <div className="flex items-center gap-4 sm:gap-6 border-b border-gray-200 dark:border-gray-800 overflow-x-auto no-scrollbar -mx-1 px-1">
        {['Following', 'Featured', 'Rising', 'Code Review'].map((tab) => {
          const isActive = activeTab === tab.toLowerCase();
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab.toLowerCase())}
              className={`pb-3 text-sm font-bold transition-all relative whitespace-nowrap ${
                isActive ? 'text-gray-900 dark:text-gray-100' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              {tab}
              {isActive && (
                <div className="absolute bottom-0 left-0 w-full h-1 bg-blue-600 rounded-t-full shadow-md shadow-gray-900/60" />
              )}
            </button>
          );
        })}

        {/* Right side: layout toggle + refresh */}
        <div className="ml-auto flex items-center gap-1 pb-3 shrink-0">
          <button
            onClick={() => toggleLayout('list')}
            title="List view"
            className={`p-1.5 rounded-md transition-colors ${feedLayout === 'list' ? 'text-blue-600 bg-blue-50 dark:bg-blue-900/20' : 'text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
          >
            <List size={15} />
          </button>
          <button
            onClick={() => toggleLayout('grid')}
            title="Grid view"
            className={`p-1.5 rounded-md transition-colors ${feedLayout === 'grid' ? 'text-blue-600 bg-blue-50 dark:bg-blue-900/20' : 'text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
          >
            <LayoutGrid size={15} />
          </button>
          <div className="w-px h-4 bg-gray-200 dark:bg-gray-700 mx-1" />
          <button
            onClick={handleManualRefresh}
            disabled={isRefreshing}
            title="Refresh feed"
            className="p-1.5 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors disabled:opacity-40"
          >
            <Loader2 size={15} className={isRefreshing ? 'animate-spin text-blue-600 dark:text-blue-400' : ''} />
          </button>
        </div>
      </div>

      {/* --- SHARE MODAL --- */}
      {showShareModal && (
        <div className="fixed inset-0 bg-gray-900/50 dark:bg-black/60 backdrop-blur-sm z-[120] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 w-full max-w-sm rounded-2xl p-6 shadow-xl animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">Share Entry</h3>
              <button onClick={() => setShowShareModal(false)} className="text-gray-400 hover:text-gray-900"><X size={20}/></button>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-4 uppercase font-black tracking-widest">Post Protocol Link</p>
            <div className="flex gap-2 items-center bg-gray-50 dark:bg-gray-800 rounded-xl p-2 border border-gray-200 dark:border-gray-700 mb-6">
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
              className="w-full bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-bold py-3 rounded-xl transition border border-gray-200 dark:border-gray-700"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* --- CUSTOM DELETE CONFIRMATION MODAL --- */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-gray-900/50 dark:bg-black/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 w-full max-w-sm rounded-2xl p-8 shadow-xl text-center animate-in fade-in zoom-in duration-200">
            <div className="w-16 h-16 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-500 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-100 dark:border-red-900/50">
              <AlertTriangle size={32} />
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">Delete Post?</h3>
            <p className="text-gray-500 dark:text-gray-400 text-sm mb-8 leading-relaxed">
              This action cannot be undone. This will permanently remove your post from the beoneofus network.
            </p>
            <div className="flex flex-col gap-3">
              <button onClick={confirmDelete} disabled={deleteLoading} className="w-full bg-red-600 hover:bg-red-500 text-white font-bold py-3 rounded-xl transition flex items-center justify-center gap-2">
                {deleteLoading ? 'Deleting...' : 'Confirm Delete'}
              </button>
              <button onClick={() => setShowDeleteConfirm(false)} className="w-full bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-bold py-3 rounded-xl transition border border-gray-200 dark:border-gray-700">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* --- EDIT MODAL OVERLAY --- */}
      {isEditing && editingPost && (
        <div className="fixed inset-0 bg-gray-900/50 dark:bg-black/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 w-full max-w-lg rounded-2xl p-6 shadow-xl relative animate-in fade-in zoom-in duration-200">
            <button onClick={() => setIsEditing(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-900 transition"><X size={20} /></button>
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-6 flex items-center gap-2"><Edit3 size={18} className="text-blue-600" /> Edit Post</h2>
            <form onSubmit={handleUpdate} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">Title</label>
                <input type="text" value={editingPost.title || ''} onChange={(e) => setEditingPost({...editingPost, title: e.target.value})} className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl p-3 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500/50 outline-none" />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">Content</label>
                <textarea rows="4" value={editingPost.content || ''} onChange={(e) => setEditingPost({...editingPost, content: e.target.value})} className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl p-3 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500/50 outline-none resize-none" />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">Code Snippet</label>
                <textarea rows="3" value={editingPost.code_snippet || ''} onChange={(e) => setEditingPost({...editingPost, code_snippet: e.target.value})} className="w-full bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl p-3 text-blue-600 dark:text-blue-400 font-mono text-sm focus:ring-2 focus:ring-blue-500/50 outline-none" />
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setIsEditing(false)} className="flex-1 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 font-bold py-3 rounded-xl transition">Cancel</button>
                <button type="submit" disabled={editLoading} className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl transition flex items-center justify-center gap-2">
                  {editLoading ? 'Saving...' : <><Save size={18} /> Save Changes</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- NEW POSTS BANNER (real-time) --- */}
      {newPostBanner && (
        <button
          onClick={handleManualRefresh}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold rounded-xl shadow-lg transition-all animate-in slide-in-from-top-2 duration-300"
        >
          <Sparkles size={15} /> New posts available — tap to refresh
        </button>
      )}

      {/* --- FEED LIST / GRID --- */}
      {displayedPosts.length === 0 ? (
        <div className="h-64 border border-dashed border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 rounded-2xl flex items-center justify-center text-gray-500 dark:text-gray-400">No posts yet. Be the first to share!</div>
      ) : (
        <div className={feedLayout === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 gap-4' : 'space-y-4'}>
        {displayedPosts.map((post) => {
          const hasLiked = post.likes?.some(l => l.user_id === currentUserId);
          return (
            <div key={post.id} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-4 sm:p-5 shadow-sm card-hover relative overflow-hidden">

              {/* Author row */}
              <div className="flex items-start gap-3 mb-4 min-w-0">
                <div
                  className="relative w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-xs font-bold text-gray-700 dark:text-gray-300 uppercase cursor-pointer hover:opacity-80 transition-all overflow-hidden shrink-0 border border-gray-200 dark:border-gray-700"
                  onClick={() => setSelectedUserId(post.user_id)}
                  title={`View @${post.profiles?.username}'s Profile`}
                >
                  {post.profiles?.avatar_url ? (
                    <Image src={post.profiles.avatar_url} alt="avatar" fill sizes="40px" className="object-cover" />
                  ) : (
                    post.profiles?.username?.substring(0, 2) || '??'
                  )}
                </div>

                <div className="flex-1 min-w-0 cursor-pointer group" onClick={() => setSelectedUserId(post.user_id)}>
                  <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
                    <span className="text-sm font-bold text-gray-900 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate max-w-[140px] sm:max-w-[200px]">
                      {post.profiles?.username || 'Unknown User'}
                    </span>
                    {post.profiles?.is_verified && <VerifiedBadge size={14} />}
                    {(post.profiles?.is_premium || post.profiles?.is_admin) && post.profiles?.profile_visibility?.premium_badge !== false && <PremiumBadge size={14} isTrial={!!post.profiles?.is_trial_premium} />}
                    {post.profiles?.github && (
                      <a href={`https://github.com/${post.profiles.github}`} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors shrink-0" title="GitHub">
                        <GitBranch size={13} />
                      </a>
                    )}
                    {post.profiles?.website && (
                      <a href={post.profiles.website.startsWith('http') ? post.profiles.website : `https://${post.profiles.website}`} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors shrink-0" title="Website">
                        <LinkIcon size={13} />
                      </a>
                    )}
                  </div>
                  <p className="text-[10px] text-blue-500 dark:text-blue-400 font-bold uppercase tracking-widest truncate">
                    {post.profiles?.status || 'Active Node'}
                  </p>
                </div>

                {currentUserId === post.user_id && (
                  <div className="relative shrink-0">
                    <button onClick={() => setActiveMenu(activeMenu === post.id ? null : post.id)} className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all">
                      <MoreHorizontal size={17} />
                    </button>
                    {activeMenu === post.id && (
                      <div className="absolute right-0 mt-1 w-36 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-xl z-50 py-1.5 animate-in fade-in zoom-in-95 duration-100">
                        <button className="w-full flex items-center gap-2 px-4 py-2 text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors" onClick={() => openEditModal(post)}>
                          <Edit3 size={13} /> Edit Post
                        </button>
                        <button className="w-full flex items-center gap-2 px-4 py-2 text-xs text-red-600 dark:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors" onClick={() => openDeleteModal(post)}>
                          <Trash2 size={13} /> Delete
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="space-y-3">
                {post.title && (
                  <a href={`/posts/${post.id}`} target="_blank" rel="noopener noreferrer" className="group/title block">
                    <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-gray-100 group-hover/title:text-blue-600 dark:group-hover/title:text-blue-400 tracking-tight leading-snug break-words transition-colors">
                      {post.title}
                    </h3>
                  </a>
                )}
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap break-words text-sm">
                  {post.content}
                </p>
                {post.code_snippet && (
                  <div className="bg-gray-50 dark:bg-gray-950 rounded-xl p-4 border border-gray-200 dark:border-gray-800 font-mono text-sm text-blue-600 overflow-x-auto relative">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        navigator.clipboard.writeText(post.code_snippet);
                        showToast("Code copied to clipboard");
                      }}
                      className="absolute top-3 right-3 p-1.5 text-gray-500 dark:text-gray-400 hover:text-blue-600 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-blue-200 dark:hover:border-blue-500/50 rounded-lg transition-all shadow-sm"
                      title="Copy Code"
                    >
                      <Copy size={14} />
                    </button>
                    <pre><code>{post.code_snippet}</code></pre>
                  </div>
                )}
                <MediaGrid items={getMediaItems(post)} />
              </div>

              {/* AI Summary Box */}
              {postSummaries[post.id] && (
                <div className="mt-4 p-4 bg-purple-50 dark:bg-purple-900/20 border border-purple-100 dark:border-purple-800/50 rounded-xl animate-in fade-in slide-in-from-top-2">
                  <div className="flex items-center gap-2 mb-2 text-purple-700 dark:text-purple-400 font-bold text-xs uppercase tracking-widest">
                    <Sparkles size={14} /> AI Summary
                  </div>
                  <div className="text-sm text-purple-900 dark:text-purple-100 leading-relaxed">
                    <ReactMarkdown
                      components={{
                        p: ({ node, ...props }) => <p className="mb-2 last:mb-0" {...props} />,
                        ul: ({ node, ...props }) => <ul className="list-disc ml-4 mb-2 space-y-1" {...props} />,
                        ol: ({ node, ...props }) => <ol className="list-decimal ml-4 mb-2 space-y-1" {...props} />,
                        li: ({ node, ...props }) => <li className="pl-1" {...props} />,
                        strong: ({ node, ...props }) => <strong className="font-bold text-purple-950 dark:text-purple-50" {...props} />,
                        code: ({ node, inline, ...props }) => (
                          <code className={`${inline ? 'bg-purple-200/50 dark:bg-purple-800/50 px-1 py-0.5 rounded' : 'block bg-purple-200/50 dark:bg-purple-800/50 p-2 rounded-lg my-2'} font-mono text-[11px]`} {...props} />
                        )
                      }}
                    >{postSummaries[post.id]}</ReactMarkdown>
                  </div>
                </div>
              )}

              {/* AI Analysis Box */}
              {postAnalyses[post.id] && (
                <div className="mt-4 p-4 bg-orange-50 dark:bg-orange-900/20 border border-orange-100 dark:border-orange-800/50 rounded-xl animate-in fade-in slide-in-from-top-2">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 text-orange-700 dark:text-orange-400 font-bold text-xs uppercase tracking-widest">
                      <ShieldAlert size={14} /> Security & Bug Analysis
                    </div>
                    <button 
                      onClick={() => {
                        navigator.clipboard.writeText(postAnalyses[post.id]);
                        showToast("Analysis copied to clipboard");
                      }}
                      className="p-1.5 text-orange-600 dark:text-orange-400 hover:text-orange-800 dark:hover:text-orange-300 bg-orange-100/50 dark:bg-orange-800/50 hover:bg-orange-100 dark:hover:bg-orange-800 rounded-lg transition-colors"
                      title="Copy Analysis"
                    >
                      <Copy size={14} />
                    </button>
                  </div>
                  <div className="text-sm text-orange-900 dark:text-orange-100 leading-relaxed">
                    <ReactMarkdown
                      components={{
                        p: ({ node, ...props }) => <p className="mb-2 last:mb-0" {...props} />,
                        ul: ({ node, ...props }) => <ul className="list-disc ml-4 mb-2 space-y-1" {...props} />,
                        ol: ({ node, ...props }) => <ol className="list-decimal ml-4 mb-2 space-y-1" {...props} />,
                        li: ({ node, ...props }) => <li className="pl-1" {...props} />,
                        strong: ({ node, ...props }) => <strong className="font-bold text-orange-950 dark:text-orange-50" {...props} />,
                        code: ({ node, inline, ...props }) => (
                          <code className={`${inline ? 'bg-orange-200/50 dark:bg-orange-800/50 px-1 py-0.5 rounded' : 'block bg-orange-200/50 dark:bg-orange-800/50 p-2 rounded-lg my-2'} font-mono text-[11px]`} {...props} />
                        )
                      }}
                    >{postAnalyses[post.id]}</ReactMarkdown>
                  </div>
                </div>
              )}

              {/* Interaction Bar — responsive, never overflows */}
              <div className="flex items-center gap-1 sm:gap-2 mt-5 pt-4 border-t border-gray-100 dark:border-gray-800/50 text-gray-400 dark:text-gray-500 flex-wrap">
                {/* Left: social actions */}
                <button onClick={() => handleLike(post.id, hasLiked)} className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${hasLiked ? 'text-red-500 bg-red-50 dark:bg-red-900/20' : 'hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10'}`}>
                  <Heart size={15} fill={hasLiked ? "currentColor" : "none"} />
                  <span>{post.likes?.length || 0}</span>
                </button>
                <button onClick={() => setExpandedComments({...expandedComments, [post.id]: !expandedComments[post.id]})} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-all">
                  <MessageSquare size={15} />
                  <span>{post.comments?.length || 0}</span>
                </button>

                {/* Right: utility actions */}
                <div className="flex items-center gap-1 ml-auto">
                  <button onClick={() => handleAnalyzeCode(post)} className={`p-1.5 rounded-lg transition-all ${postAnalyses[post.id] ? 'text-orange-600 bg-orange-50 dark:bg-orange-900/20' : 'hover:text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-900/10'}`} title="Analyze Code">
                    {isAnalyzing[post.id] ? <Loader2 size={15} className="animate-spin text-orange-500" /> : <ShieldAlert size={15} />}
                  </button>
                  <button onClick={() => handleSummarize(post)} className={`p-1.5 rounded-lg transition-all ${postSummaries[post.id] ? 'text-purple-600 bg-purple-50 dark:bg-purple-900/20' : 'hover:text-purple-500 hover:bg-purple-50 dark:hover:bg-purple-900/10'}`} title="Summarize Post">
                    {isSummarizing[post.id] ? <Loader2 size={15} className="animate-spin text-purple-500" /> : <Sparkles size={15} />}
                  </button>
                  <button onClick={() => handleBookmark(post)} className="p-1.5 rounded-lg hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/10 transition-all" title="Save to Bookmarks">
                    <Bookmark size={15} />
                  </button>
                  <button onClick={() => handleShareClick(post.id)} className="p-1.5 rounded-lg hover:text-green-500 hover:bg-green-50 dark:hover:bg-green-900/10 transition-all" title="Share Post">
                    <Share2 size={15} />
                  </button>
                  <a href={`/posts/${post.id}`} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded-lg hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-all" title="Open post in new tab">
                    <ExternalLink size={15} />
                  </a>
                </div>
              </div>

              {/* Comments Section */}
              {expandedComments[post.id] && (
                <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800/50 space-y-4 animate-in slide-in-from-top-2 duration-200">
                  <div className="space-y-3 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                    {post.comments?.map((comment) => (
                      <div key={comment.id} className="bg-gray-50 dark:bg-gray-800 p-3 rounded-xl border border-gray-200 dark:border-gray-700">
                        <div className="flex items-center gap-1 mb-1">
                          <p className="text-[10px] font-bold text-blue-600">@{comment.profiles?.username}</p>
                          {comment.profiles?.is_verified && <VerifiedBadge size={12} />}
                        </div>
                        <p className="text-xs text-gray-700 dark:text-gray-300">{comment.content}</p>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2 items-center bg-gray-50 dark:bg-gray-800 rounded-xl px-3 py-1 border border-gray-200 dark:border-gray-700">
                    <button onClick={() => handleSuggestReply(post)} disabled={isSuggesting[post.id]} className="text-gray-400 hover:text-blue-600 transition-colors p-1 disabled:opacity-50" title="Suggest AI Reply">
                      {isSuggesting[post.id] ? <Loader2 size={16} className="animate-spin text-blue-500" /> : <Sparkles size={16} />}
                    </button>
                    <input type="text" placeholder="Write a comment..." value={newComments[post.id] || ""} onChange={(e) => setNewComments({...newComments, [post.id]: e.target.value})} className="flex-1 bg-transparent border-none py-2 text-sm text-gray-900 dark:text-gray-100 focus:ring-0 outline-none" onKeyDown={(e) => e.key === 'Enter' && handleAddComment(post.id)} />
                    <button onClick={() => handleAddComment(post.id)} className="text-blue-600 hover:text-blue-700 p-1"><Send size={16} /></button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
        </div>
      )}

      {/* USER PROFILE MODAL */}
      {selectedUserId && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-gray-900/50 dark:bg-black/60 backdrop-blur-sm" onClick={() => setSelectedUserId(null)} />
          <div className="relative w-full max-w-6xl max-h-[90vh] overflow-y-auto popup-scrollbar z-10 bg-white dark:bg-gray-900 rounded-[2rem] border border-gray-200 dark:border-gray-800 shadow-xl">
            <button 
              onClick={() => setSelectedUserId(null)} 
              className="absolute top-6 right-6 z-[250] p-2 bg-gray-100 dark:bg-gray-800 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 rounded-full text-gray-500 dark:text-gray-400 transition-colors"
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
        <div className="fixed bottom-10 right-10 z-[150] flex items-center gap-3 bg-white dark:bg-gray-900 border border-green-200 dark:border-green-900/50 text-green-600 dark:text-green-500 px-5 py-3 rounded-2xl shadow-xl animate-in fade-in slide-in-from-bottom-8 duration-300">
          <Check size={18} className="text-green-500" />
          <span className="text-sm font-bold tracking-tight">{toastMessage}</span>
        </div>
      )}
    </div>
  );
}