"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createPortal } from "react-dom";
import { supabase } from "../supabaseClient";
import {
  Users, X, Loader2, Sparkles, UserPlus, Check, Globe, Lock, ChevronRight, Zap, BookOpen, Copy, Plus, Mail, BadgeCheck, Terminal, Briefcase, MessageCircle, Compass,
  Clock, TrendingUp, Bell, RefreshCw, ShieldCheck, Flame, Crown, Star, Rocket, Lightbulb, BarChart2,
  Calendar, FileText, Newspaper, GraduationCap, MapPin, ExternalLink
} from 'lucide-react';
import ProfileContent from "../dash/contect/ProfileContent";
import NewPost from "./NewPost";

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  return `${d}d`;
}


const SectionHeader = ({ title, icon: Icon, isCollapsible, isOpen, onToggle, badge }) => (
  <div 
    className={`flex items-center justify-between mb-3 py-1.5 px-2 -mx-2 rounded-lg select-none transition-colors ${
      isCollapsible ? 'cursor-pointer group hover:bg-gray-50 dark:hover:bg-gray-800/40' : ''
    }`} 
    onClick={isCollapsible ? onToggle : undefined}
  >
    <div className="flex items-center gap-2.5">
      {Icon && <Icon size={14} className={`text-gray-500 dark:text-gray-400 ${isCollapsible ? 'group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors' : ''}`} />}
      <h3 className={`text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest ${isCollapsible ? 'group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors' : ''}`}>
        {title}
      </h3>
    </div>
    <div className="flex items-center gap-1.5">
      {badge > 0 && (
        <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 bg-blue-600 text-white text-[9px] font-black rounded-full animate-pulse">
          {badge}
        </span>
      )}
      {isCollapsible && (
        <ChevronRight
          size={14}
          className={`text-gray-400 dark:text-gray-500 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-all duration-200 ${isOpen ? 'rotate-90' : ''}`}
        />
      )}
    </div>
  </div>
);

export default function RightSidebar({ onSectionChange, setActiveTab, onClose }) {
  const router = useRouter();
  const [suggestions, setSuggestions] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [followedIds, setFollowedIds] = useState([]);
  const [showBroadcastModal, setShowBroadcastModal] = useState(false);
  const [isSuggestedConnectionsOpen, setIsSuggestedConnectionsOpen] = useState(true);
  const [isSpotlightsOpen, setIsSpotlightsOpen] = useState(true);
  const [spotlights, setSpotlights] = useState([]);
  const [isDiscoverChannelsOpen, setIsDiscoverChannelsOpen] = useState(true);
  const [isInviteDevelopersOpen, setIsInviteDevelopersOpen] = useState(true);
  const [isWhatsNewOpen, setIsWhatsNewOpen] = useState(true);

  const [newsItems, setNewsItems] = useState([]);
  const [newsLoaded, setNewsLoaded] = useState(false);
  const [isWhatsHappeningOpen, setIsWhatsHappeningOpen] = useState(true);
  const [refreshingFeed, setRefreshingFeed] = useState(false);

  const [isPremium, setIsPremium] = useState(false);
  const [isPremiumOpen, setIsPremiumOpen] = useState(true);
  const [premiumPosts, setPremiumPosts] = useState([]);
  const [premiumStats, setPremiumStats] = useState({ members: 0, posts: 0 });

  const [isCopied, setIsCopied] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailSuccess, setEmailSuccess] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [activeModals, setActiveModals] = useState({ jobs: false, network: false, discuss: false, discover: false });

  useEffect(() => {
    const handleSync = (e) => setActiveModals(e.detail);
    window.addEventListener('sync-header-modals', handleSync);
    // Request initial state just in case Header mounted first
    window.dispatchEvent(new CustomEvent('request-header-modals-sync'));
    return () => window.removeEventListener('sync-header-modals', handleSync);
  }, []);

  const handleCopyInvite = () => {
    const link = `${window.location.origin}/auth`;
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(link).catch(() => {
        const el = document.createElement('textarea');
        el.value = link;
        document.body.appendChild(el);
        el.select();
        document.execCommand('copy');
        document.body.removeChild(el);
      });
    } else {
      const el = document.createElement('textarea');
      el.value = link;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
    }
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleEmailInvite = async (e) => {
    e.preventDefault();
    if (!inviteEmail) return;
    setSendingEmail(true);
    setEmailError('');

    try {
      const inviteLink = `${window.location.origin}/auth`;
      const response = await fetch('/api/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail, inviteLink })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to send invite');

      setEmailSuccess(true);
      setInviteEmail('');
      setTimeout(() => setEmailSuccess(false), 3000);
    } catch (error) {
      setEmailError(error.message);
      setTimeout(() => setEmailError(''), 4000);
    } finally {
      setSendingEmail(false);
    }
  };

  // Foolproof handler to trigger the exact modals from the Header component
  const handleMobileNav = (type) => {
    if (type === 'marketplace') {
      router.push('/dash/marketplace');
      onClose?.();
      return;
    }
    if (type === 'premium') {
      setIsPremiumOpen(true);
      setTimeout(() => {
        document.getElementById('sidebar-premium-insights')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 80);
      return;
    }
    const btn = document.getElementById(`header-btn-${type}`);
    if (btn) {
      btn.click();
    } else {
      window.dispatchEvent(new CustomEvent('open-header-modal', { detail: type }));
    }

    setTimeout(() => {
      if (onClose) onClose();
    }, 50);
  };

  useEffect(() => {
    let isMounted = true;

    const RS_CACHE_KEY = 'rightsidebar_v1';
    const RS_CACHE_TTL = 3 * 60 * 1000; // 3 minutes

    const loadCache = () => {
      try {
        const raw = sessionStorage.getItem(RS_CACHE_KEY);
        if (!raw) return null;
        const { data, ts } = JSON.parse(raw);
        if (Date.now() - ts > RS_CACHE_TTL) return null;
        return data;
      } catch { return null; }
    };

    const saveCache = (data) => {
      try { sessionStorage.setItem(RS_CACHE_KEY, JSON.stringify({ data, ts: Date.now() })); } catch {}
    };

    const fetchSidebarData = async (showLoader = true) => {
      try {
        // Serve from cache immediately so the sidebar renders without waiting
        const cached = loadCache();
        if (cached && isMounted) {
          if (cached.suggestions) setSuggestions(cached.suggestions);
          if (cached.groups) setGroups(cached.groups);
          if (cached.spotlights) setSpotlights(cached.spotlights);
          if (cached.followedIds) setFollowedIds(cached.followedIds);
          if (showLoader) setLoading(false);
          showLoader = false; // don't show loader, but still refresh in background
        }

        if (showLoader) setLoading(true);
        const { data: { session } } = await supabase.auth.getSession();
        if (!session || !isMounted) return;
        const uid = session.user.id;

        // Run connections, groups, and spotlights in parallel — groups/spotlights don't depend on connections
        const [{ data: connections }, { data: activeGroups }, { data: spotlightProfiles }] = await Promise.all([
          supabase.from('connections')
            .select('sender_id, receiver_id')
            .or(`sender_id.eq.${uid},receiver_id.eq.${uid}`),
          supabase.from('groups')
            .select('id, name, description, is_private')
            .order('created_at', { ascending: false })
            .limit(3),
          supabase.from('profiles')
            .select('id, username, avatar_url, bio, is_verified, is_premium, status')
            .eq('is_verified', true)
            .limit(6),
        ]);

        let connectedIds = [];
        if (connections) {
          connectedIds = connections.map(c => c.sender_id === uid ? c.receiver_id : c.sender_id);
          if (isMounted) setFollowedIds(connectedIds);
        }

        // Fetch suggested users — limited to 50 to avoid fetching entire user table
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, username, status, avatar_url, is_verified')
          .neq('id', uid)
          .limit(50);

        if (!isMounted) return;

        let newSuggestions = [];
        if (profiles) {
          const unassociated = profiles.filter(p => !connectedIds.includes(p.id));
          newSuggestions = unassociated.sort(() => 0.5 - Math.random()).slice(0, 15);
          setSuggestions(newSuggestions);
        }

        const newGroups = activeGroups || [];
        if (isMounted) setGroups(newGroups);

        let newSpotlights = [];
        if (spotlightProfiles) {
          newSpotlights = spotlightProfiles.sort(() => 0.5 - Math.random()).slice(0, 3);
          if (isMounted) setSpotlights(newSpotlights);
        }

        saveCache({ suggestions: newSuggestions, groups: newGroups, spotlights: newSpotlights, followedIds: connectedIds });
      } catch (error) {
        console.error("RightSidebar fetch error:", error);
      } finally {
        if (showLoader && isMounted) setLoading(false);
      }
    };

    const fetchNewsItems = async () => {
      try {
        const [postsRes, eventsRes, pagesRes, jobsRes] = await Promise.all([
          supabase
            .from('posts')
            .select('id, title, content, created_at, profiles:user_id(id, username, avatar_url, is_admin, role)')
            .order('created_at', { ascending: false })
            .limit(30),
          supabase
            .from('events')
            .select('id, title, description, event_date, location, is_online, event_url')
            .gte('event_date', new Date().toISOString())
            .order('event_date', { ascending: true })
            .limit(3),
          supabase
            .from('pages')
            .select('id, name, description, created_at')
            .order('created_at', { ascending: false })
            .limit(3),
          supabase
            .from('jobs')
            .select('id, title, company, location, type, created_at, profiles:user_id(id, username, avatar_url, is_admin, role)')
            .order('created_at', { ascending: false })
            .limit(3),
        ]);

        if (!isMounted) return;

        const combined = [];

        // Admin/founder posts only
        const adminPosts = (postsRes.data || [])
          .filter(p => p.profiles?.is_admin || p.profiles?.role === 'founder')
          .slice(0, 3);
        adminPosts.forEach(p => combined.push({ type: 'post', id: p.id, label: 'News', icon: 'Newspaper', title: p.title || p.content?.slice(0, 60), sub: `@${p.profiles?.username}`, date: p.created_at, authorId: p.profiles?.id, avatar: p.profiles?.avatar_url }));

        // Events
        (eventsRes.data || []).forEach(e => combined.push({ type: 'event', id: e.id, label: 'Event', icon: 'Calendar', title: e.title, sub: e.location || (e.is_online ? 'Online' : ''), date: e.event_date, url: e.event_url }));

        // Pages
        (pagesRes.data || []).forEach(p => combined.push({ type: 'page', id: p.id, label: 'Page', icon: 'FileText', title: p.name, sub: p.description?.slice(0, 40) || '', date: p.created_at }));

        // Jobs — all recent, not admin-filtered
        (jobsRes.data || []).forEach(j => combined.push({ type: 'job', id: j.id, label: 'Job', icon: 'Briefcase', title: j.title, sub: [j.company, j.location].filter(Boolean).join(' · '), date: j.created_at, authorId: j.profiles?.id }));

        // Sort: events by event_date asc first, rest by created_at desc
        combined.sort((a, b) => {
          if (a.type === 'event' && b.type !== 'event') return -1;
          if (b.type === 'event' && a.type !== 'event') return 1;
          return new Date(b.date) - new Date(a.date);
        });

        setNewsItems(combined);
        setNewsLoaded(true);
      } catch (e) {
        console.error('fetchNewsItems:', e);
        if (isMounted) setNewsLoaded(true);
      }
    };

    const fetchPremiumContent = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session || !isMounted) return;

        // Check if current user is premium
        const { data: profile } = await supabase
          .from('profiles')
          .select('is_premium')
          .eq('id', session.user.id)
          .single();

        if (!isMounted) return;
        const userIsPremium = profile?.is_premium === true;
        setIsPremium(userIsPremium);

        if (!userIsPremium) return;

        // Fetch premium member count
        const { count: memberCount } = await supabase
          .from('profiles')
          .select('id', { count: 'exact', head: true })
          .eq('is_premium', true);

        // Fetch latest posts from premium members (premium-exclusive feed)
        const { data: pPosts } = await supabase
          .from('posts')
          .select('id, title, content, created_at, image_url, profiles:user_id(id, username, avatar_url, is_verified, is_premium)')
          .order('created_at', { ascending: false })
          .limit(20);

        if (!isMounted) return;

        // Filter to only premium authors
        const filtered = (pPosts || []).filter(p => p.profiles?.is_premium).slice(0, 4);
        setPremiumPosts(filtered);
        setPremiumStats({ members: memberCount || 0, posts: filtered.length });
      } catch (e) {
        console.error('premium sidebar fetch:', e);
      }
    };

    fetchSidebarData();
    fetchNewsItems();
    fetchPremiumContent();

    const channel = supabase.channel('right-sidebar-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'connections' }, () => fetchSidebarData(false))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'groups' }, () => fetchSidebarData(false))
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles' }, () => fetchSidebarData(false))
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'posts' }, () => { fetchNewsItems(); fetchPremiumContent(); })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'events' }, () => fetchNewsItems())
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'jobs' }, () => fetchNewsItems())
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'pages' }, () => fetchNewsItems())
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, []);

  const handleFollowToggle = async (e, receiverId, isFollowed) => {
    e.stopPropagation();
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      
      if (isFollowed) {
        // Optimistically unfollow
        setFollowedIds(prev => prev.filter(id => id !== receiverId));
        const { data, error } = await supabase.from('connections')
          .delete()
          .or(`and(sender_id.eq.${session.user.id},receiver_id.eq.${receiverId}),and(sender_id.eq.${receiverId},receiver_id.eq.${session.user.id})`)
          .select();
  
        if (error || !data || data.length === 0) {
          console.error("Unfollow error:", error?.message || "Missing DELETE policy");
          setFollowedIds(prev => [...prev, receiverId]); // Revert UI
          alert("Error unfollowing: Database blocked the action. Ensure you added the SQL DELETE policy.");
        }
      } else {
        // Optimistically follow
        setFollowedIds(prev => [...prev, receiverId]);
        
        const { error } = await supabase.from('connections').insert({
          sender_id: session.user.id,
          receiver_id: receiverId,
          status: 'pending'
        });
  
        if (error) {
          console.error("Connection error:", error.message);
          setFollowedIds(prev => prev.filter(id => id !== receiverId)); // Revert UI
          alert("Error sending request: " + error.message);
          return;
        }
  
        const { error: notifError } = await supabase.from('notifications').insert({
          receiver_id: receiverId,
          actor_id: session.user.id,
          type: 'connection_request',
          content: 'wants to connect'
        });
  
        if (notifError) {
          console.error("Notification error:", notifError.message);
        }
      }
    } catch (error) {
      console.error("Follow toggle error:", error);
    }
  };

  const handleRefreshFeed = async () => {
    setRefreshingFeed(true);
    try {
      const [postsRes, eventsRes, pagesRes, jobsRes] = await Promise.all([
        supabase.from('posts').select('id, title, content, created_at, profiles:user_id(id, username, avatar_url, is_admin, role)').order('created_at', { ascending: false }).limit(30),
        supabase.from('events').select('id, title, description, event_date, location, is_online, event_url').gte('event_date', new Date().toISOString()).order('event_date', { ascending: true }).limit(3),
        supabase.from('pages').select('id, name, description, created_at').order('created_at', { ascending: false }).limit(3),
        supabase.from('jobs').select('id, title, company, location, type, created_at, profiles:user_id(id, username, avatar_url, is_admin, role)').order('created_at', { ascending: false }).limit(3),
      ]);
      const combined = [];
      (postsRes.data || []).filter(p => p.profiles?.is_admin || p.profiles?.role === 'founder').slice(0, 3)
        .forEach(p => combined.push({ type: 'post', id: p.id, label: 'News', icon: 'Newspaper', title: p.title || p.content?.slice(0, 60), sub: `@${p.profiles?.username}`, date: p.created_at, authorId: p.profiles?.id, avatar: p.profiles?.avatar_url }));
      (eventsRes.data || []).forEach(e => combined.push({ type: 'event', id: e.id, label: 'Event', icon: 'Calendar', title: e.title, sub: e.location || (e.is_online ? 'Online' : ''), date: e.event_date, url: e.event_url }));
      (pagesRes.data || []).forEach(p => combined.push({ type: 'page', id: p.id, label: 'Page', icon: 'FileText', title: p.name, sub: p.description?.slice(0, 40) || '', date: p.created_at }));
      (jobsRes.data || []).forEach(j => combined.push({ type: 'job', id: j.id, label: 'Job', icon: 'Briefcase', title: j.title, sub: [j.company, j.location].filter(Boolean).join(' · '), date: j.created_at, authorId: j.profiles?.id }));
      combined.sort((a, b) => {
        if (a.type === 'event' && b.type !== 'event') return -1;
        if (b.type === 'event' && a.type !== 'event') return 1;
        return new Date(b.date) - new Date(a.date);
      });
      setNewsItems(combined);
      setNewsLoaded(true);
    } catch (e) {
      console.error('handleRefreshFeed:', e);
    }
    setRefreshingFeed(false);
  };

  const handleDocsClick = () => {
    router.push('/dash/docs');
    onClose?.();
  };

  return (
    <aside className="w-full flex flex-col p-4 xl:p-6 space-y-6 h-screen sticky top-0 overflow-y-auto custom-scrollbar bg-transparent border-l border-gray-200 dark:border-gray-800 relative animate-in fade-in slide-in-from-right-8 duration-300 md:animate-none">
      
      {/* Mobile-Only Quick Links */}
      <div className="lg:hidden flex flex-col shrink-0 gap-3">
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => handleMobileNav('jobs')} className={`flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest px-3 py-2 rounded-xl border transition-all ${activeModals.jobs ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 border-blue-200 dark:border-blue-800' : 'bg-gray-50 dark:bg-gray-800/50 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:text-emerald-600 hover:border-emerald-200'}`}>
            <Briefcase size={13} /> Jobs
          </button>
          <button onClick={() => handleMobileNav('network')} className={`flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest px-3 py-2 rounded-xl border transition-all ${activeModals.network ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 border-blue-200 dark:border-blue-800' : 'bg-gray-50 dark:bg-gray-800/50 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:text-gray-900 dark:hover:text-gray-100'}`}>
            <Users size={13} /> Network
          </button>
          <button onClick={() => handleMobileNav('discuss')} className={`flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest px-3 py-2 rounded-xl border transition-all ${activeModals.discuss ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 border-blue-200 dark:border-blue-800' : 'bg-gray-50 dark:bg-gray-800/50 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:text-gray-900 dark:hover:text-gray-100'}`}>
            <MessageCircle size={13} /> Discuss
          </button>
          <button onClick={() => handleMobileNav('discover')} className={`flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest px-3 py-2 rounded-xl border transition-all ${activeModals.discover ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 border-blue-200 dark:border-blue-800' : 'bg-gray-50 dark:bg-gray-800/50 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:text-blue-600 hover:border-blue-200'}`}>
            <Compass size={13} /> Discover
          </button>
          <button onClick={() => handleMobileNav('marketplace')} className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest px-3 py-2 rounded-xl border bg-gray-50 dark:bg-gray-800/50 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:text-violet-600 hover:border-violet-200 dark:hover:text-violet-400 dark:hover:border-violet-800 transition-all">
            <Rocket size={13} /> Market
          </button>
          <button onClick={() => handleMobileNav('premium')} className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest px-3 py-2 rounded-xl border bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800/50 hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-all">
            <Crown size={13} /> Premium
          </button>
        </div>
        <div className="w-full h-px bg-gray-200 dark:bg-gray-800" />
      </div>

      {/* Primary Action Button */}
      <div className="shrink-0 pt-1">
        <button 
          onClick={() => setShowBroadcastModal(true)}
          className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm py-3.5 rounded-xl transition-all shadow-md shadow-blue-500/20 flex items-center justify-center gap-2 active:scale-95"
        >
          <Plus size={18} strokeWidth={3} /> Create Broadcast
        </button>
      </div>

      {/* 1. Suggested Connections */}
      <div>
        <SectionHeader 
          title="Suggested Connections" 
          icon={Users} 
          isCollapsible 
          isOpen={isSuggestedConnectionsOpen} 
          onToggle={() => setIsSuggestedConnectionsOpen(!isSuggestedConnectionsOpen)} 
        />
        {isSuggestedConnectionsOpen && (
          <div className="animate-in fade-in slide-in-from-top-2 duration-200">
            {loading ? (
              <div className="space-y-3 max-h-[190px] overflow-hidden pr-2">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex items-center justify-between p-2 -mx-2">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-gray-200 dark:bg-gray-800 animate-pulse shrink-0"></div>
                      <div className="flex flex-col gap-2 flex-1">
                        <div className="h-3.5 bg-gray-200 dark:bg-gray-800 rounded animate-pulse w-24"></div>
                        <div className="h-2 bg-gray-200 dark:bg-gray-800 rounded animate-pulse w-16"></div>
                      </div>
                    </div>
                    <div className="w-8 h-8 rounded-xl bg-gray-200 dark:bg-gray-800 animate-pulse shrink-0 ml-2"></div>
                  </div>
                ))}
              </div>
            ) : suggestions.length === 0 ? (
              <div className="text-xs text-gray-600 dark:text-gray-400 font-medium">No suggestions right now.</div>
            ) : (
              <div className="space-y-1 max-h-[210px] overflow-y-auto custom-scrollbar">
                {suggestions.map((user) => {
                  const isFollowed = followedIds.includes(user.id);
                  return (
                    <div
                      key={user.id}
                      onClick={() => setSelectedUserId(user.id)}
                      className="flex items-center justify-between gap-2 group cursor-pointer p-2 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-all"
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <div className="relative w-9 h-9 rounded-xl bg-gray-100 dark:bg-gray-800 overflow-hidden shrink-0 border border-gray-200 dark:border-gray-700">
                          {user.avatar_url ? (
                            <Image src={user.avatar_url} alt="avatar" fill sizes="36px" className="object-cover" />
                          ) : (
                            <div className="w-full h-full bg-blue-500/10 flex items-center justify-center text-blue-400 font-bold text-xs uppercase">
                              {user.username?.[0]}
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="text-xs font-bold text-gray-900 dark:text-gray-100 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors flex items-center gap-1 max-w-full">
                            <span className="truncate">@{user.username}</span>
                            {user.is_verified && <BadgeCheck size={12} className="text-blue-500 shrink-0" fill="currentColor" stroke="white" />}
                          </span>
                          <span className="text-[9px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-widest truncate">{user.status || 'Active Node'}</span>
                        </div>
                      </div>
                      <button 
                        onClick={(e) => handleFollowToggle(e, user.id, isFollowed)}
                        className={`group/btn shrink-0 p-2 rounded-xl transition-all border ${isFollowed ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800/50 text-green-600 dark:text-green-500 hover:bg-red-50 dark:hover:bg-red-900/20 hover:border-red-200 dark:hover:border-red-800/50 hover:text-red-600 dark:hover:text-red-500' : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                        title={isFollowed ? "Unfollow" : "Follow"}
                      >
                        {isFollowed ? (
                          <>
                            <Check size={14} className="group-hover/btn:hidden block" />
                            <X size={14} className="group-hover/btn:block hidden" />
                          </>
                        ) : (
                          <UserPlus size={14} />
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 2. Community Spotlights */}
      {spotlights.length > 0 && (
        <div>
          <SectionHeader
            title="Community Spotlights"
            icon={Star}
            isCollapsible
            isOpen={isSpotlightsOpen}
            onToggle={() => setIsSpotlightsOpen(!isSpotlightsOpen)}
          />
          {isSpotlightsOpen && (
            <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
              {spotlights.map(user => (
                <div
                  key={user.id}
                  className="flex items-center gap-2.5 p-2.5 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 hover:border-amber-300 dark:hover:border-amber-700/50 hover:shadow-sm transition-all group"
                >
                  <div className="relative w-9 h-9 rounded-xl bg-gray-100 dark:bg-gray-800 overflow-hidden shrink-0 border border-gray-200 dark:border-gray-700">
                    {user.avatar_url ? (
                      <Image src={user.avatar_url} alt="avatar" fill sizes="36px" className="object-cover" />
                    ) : (
                      <div className="w-full h-full bg-amber-500/10 flex items-center justify-center text-amber-500 font-bold text-xs uppercase">
                        {user.username?.[0]}
                      </div>
                    )}
                    {user.is_premium && (
                      <div className="absolute -top-1 -right-1 w-4 h-4 bg-amber-400 rounded-full flex items-center justify-center border border-white dark:border-gray-900">
                        <Crown size={8} className="text-white" />
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col min-w-0 flex-1">
                    <span className="text-xs font-bold text-gray-900 dark:text-gray-100 truncate flex items-center gap-1">
                      <span className="truncate">@{user.username}</span>
                      {user.is_verified && <BadgeCheck size={12} className="text-blue-500 shrink-0" fill="currentColor" stroke="white" />}
                    </span>
                    {user.bio && (
                      <span className="text-[10px] text-gray-500 dark:text-gray-400 truncate">{user.bio}</span>
                    )}
                  </div>
                  <button
                    onClick={() => setSelectedUserId(user.id)}
                    className="shrink-0 text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-amber-300 dark:hover:border-amber-700/50 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-all whitespace-nowrap"
                  >
                    View
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 3. Discover Channels */}
      <div>
        <SectionHeader
          title="Discover Channels"
          icon={Globe}
          isCollapsible 
          isOpen={isDiscoverChannelsOpen} 
          onToggle={() => setIsDiscoverChannelsOpen(!isDiscoverChannelsOpen)} 
        />
        {isDiscoverChannelsOpen && (
          <div className="animate-in fade-in slide-in-from-top-2 duration-200">
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex flex-col p-3 rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2 flex-1">
                        <div className="h-3.5 bg-gray-200 dark:bg-gray-800 rounded animate-pulse w-24"></div>
                        <div className="w-2.5 h-2.5 bg-gray-200 dark:bg-gray-800 rounded-full animate-pulse"></div>
                      </div>
                      <div className="w-3 h-3 bg-gray-200 dark:bg-gray-800 rounded animate-pulse"></div>
                    </div>
                    <div className="space-y-1.5 mt-1">
                        <div className="h-2 bg-gray-200 dark:bg-gray-800 rounded animate-pulse w-full"></div>
                        <div className="h-2 bg-gray-200 dark:bg-gray-800 rounded animate-pulse w-4/5"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : groups.length === 0 ? (
              <div className="text-xs text-gray-600 dark:text-gray-400 font-medium">No active channels.</div>
            ) : (
              <div className="space-y-2">
                {groups.map((group) => (
                  <div
                    key={group.id}
                    onClick={() => router.push('/dash/groups')}
                    className="flex items-center gap-3 group cursor-pointer p-3 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 hover:border-blue-500/40 dark:hover:border-blue-500/40 hover:shadow-sm transition-all min-w-0"
                  >
                    <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/50 text-blue-500 flex items-center justify-center shrink-0">
                      {group.is_private ? <Lock size={14} /> : <Globe size={14} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-gray-900 dark:text-gray-100 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{group.name}</p>
                      <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate">
                        {group.description || (group.is_private ? 'Private Channel' : 'Public Channel')}
                      </p>
                    </div>
                    <ChevronRight size={12} className="text-gray-400 group-hover:text-blue-500 transition-colors shrink-0" />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 3. Invite Users */}
      <div>
        <SectionHeader 
          title="Invite Developers" 
          icon={UserPlus} 
          isCollapsible 
          isOpen={isInviteDevelopersOpen} 
          onToggle={() => setIsInviteDevelopersOpen(!isInviteDevelopersOpen)} 
        />
        {isInviteDevelopersOpen && (
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5 hover:shadow-md hover:border-blue-500/30 transition-all group space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
            <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
              Know someone who belongs here? Share your unique invite link or send them an email to grow the network.
            </p>
            <button 
              onClick={handleCopyInvite}
              className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all ${
                isCopied 
                  ? 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-500 border border-green-200 dark:border-green-800/50' 
                  : 'bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-100 group-hover:border-blue-200 dark:group-hover:border-blue-800/50 group-hover:bg-blue-50 dark:group-hover:bg-blue-900/20 group-hover:text-blue-600 dark:group-hover:text-blue-400'
              }`}
            >
              {isCopied ? <Check size={14} /> : <Copy size={14} />}
              {isCopied ? 'Link Copied!' : 'Copy Invite Link'}
            </button>

            <div className="relative flex items-center gap-2">
              <div className="flex-grow border-t border-gray-100 dark:border-gray-800"></div>
              <span className="text-[9px] uppercase font-black text-gray-300 dark:text-gray-600 tracking-[2px]">OR</span>
              <div className="flex-grow border-t border-gray-100 dark:border-gray-800"></div>
            </div>

            <form onSubmit={handleEmailInvite} className="flex gap-2 min-w-0">
              <input
                type="email"
                placeholder="dev@example.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                required
                className={`flex-1 min-w-0 bg-gray-50 dark:bg-gray-800 border text-gray-900 dark:text-gray-100 text-xs rounded-xl px-3 py-2.5 focus:outline-none focus:ring-1 transition-all ${emailError ? 'border-red-400 focus:border-red-400 focus:ring-red-400/20' : 'border-gray-200 dark:border-gray-700 focus:border-blue-500 focus:ring-blue-500'}`}
              />
              <button type="submit" disabled={sendingEmail} className="bg-gray-900 dark:bg-gray-700 hover:bg-blue-600 text-white w-9 h-9 rounded-xl transition-colors flex items-center justify-center shrink-0 disabled:opacity-50" title="Send Email">
                {sendingEmail ? <Loader2 size={13} className="animate-spin" /> : emailSuccess ? <Check size={13} className="text-green-400" /> : <Mail size={13} />}
              </button>
            </form>
            {emailError && (
              <p className="text-[10px] text-red-500 dark:text-red-400 font-medium leading-snug">{emailError}</p>
            )}
            {emailSuccess && (
              <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">Invite sent successfully!</p>
            )}
          </div>
        )}
      </div>

      {/* 4. What's Happening — platform news */}
      <div>
        <div
          className="flex items-center justify-between mb-3 py-1.5 px-2 -mx-2 rounded-lg cursor-pointer group hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors select-none"
          onClick={() => setIsWhatsHappeningOpen(v => !v)}
        >
          <div className="flex items-center gap-2.5">
            <Flame size={14} className="text-orange-500 dark:text-orange-400" />
            <h3 className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
              What's Happening
            </h3>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={e => { e.stopPropagation(); handleRefreshFeed(); }}
              title="Refresh"
              className="p-1 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors rounded"
            >
              <RefreshCw size={12} className={refreshingFeed ? 'animate-spin' : ''} />
            </button>
            <ChevronRight size={14} className={`text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-all duration-200 ${isWhatsHappeningOpen ? 'rotate-90' : ''}`} />
          </div>
        </div>

        {isWhatsHappeningOpen && (
          <div className="space-y-1 animate-in fade-in slide-in-from-top-2 duration-200">
            {!newsLoaded ? (
              <div className="space-y-2">
                {[1,2,3,4].map(i => (
                  <div key={i} className="flex gap-2.5 p-2 rounded-xl animate-pulse">
                    <div className="w-6 h-6 rounded-lg bg-gray-200 dark:bg-gray-700 shrink-0 mt-0.5" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-2.5 bg-gray-200 dark:bg-gray-700 rounded w-5/6" />
                      <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded w-2/5" />
                    </div>
                  </div>
                ))}
              </div>
            ) : newsItems.length === 0 ? (
              <p className="text-[11px] text-gray-400 dark:text-gray-500 px-1 py-2 text-center">Nothing yet — check back soon.</p>
            ) : (
              <div className="space-y-1">
                {newsItems.map((item, idx) => {
                  const typeConfig = {
                    post:  { color: 'text-blue-600 dark:text-blue-400',  bg: 'bg-blue-50 dark:bg-blue-900/20',  Icon: Newspaper,    nav: () => { if (item.authorId) setSelectedUserId(item.authorId); } },
                    event: { color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/20', Icon: Calendar, nav: () => { router.push('/dash/events'); onClose?.(); } },
                    page:  { color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-50 dark:bg-purple-900/20', Icon: FileText, nav: () => { router.push('/dash/pages'); onClose?.(); } },
                    job:   { color: 'text-amber-600 dark:text-amber-400',  bg: 'bg-amber-50 dark:bg-amber-900/20',  Icon: Briefcase,    nav: () => { if (item.authorId) setSelectedUserId(item.authorId); else { router.push('/dash'); onClose?.(); } } },
                  }[item.type] || { color: 'text-gray-500', bg: 'bg-gray-100', Icon: Newspaper, nav: () => {} };

                  const dateLabel = item.type === 'event'
                    ? new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                    : timeAgo(item.date);

                  return (
                    <div
                      key={`${item.type}-${item.id}-${idx}`}
                      onClick={typeConfig.nav}
                      className="flex gap-2.5 p-2 rounded-xl cursor-pointer group hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-all"
                    >
                      {/* Type icon */}
                      <div className={`w-6 h-6 rounded-lg ${typeConfig.bg} flex items-center justify-center shrink-0 mt-0.5`}>
                        <typeConfig.Icon size={12} className={typeConfig.color} />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-1">
                          <p className="text-[11px] font-semibold text-gray-800 dark:text-gray-200 leading-tight line-clamp-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                            {item.title || 'Untitled'}
                          </p>
                          <span className={`shrink-0 text-[8px] font-black uppercase tracking-wider px-1 py-0.5 rounded ${typeConfig.bg} ${typeConfig.color}`}>
                            {item.label}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 mt-0.5">
                          {item.sub && (
                            <span className="text-[9px] text-gray-400 dark:text-gray-500 truncate flex items-center gap-0.5">
                              {item.type === 'event' && item.sub && <MapPin size={8} />}
                              {item.sub}
                            </span>
                          )}
                          <span className="ml-auto text-[9px] text-gray-400 dark:text-gray-500 shrink-0 flex items-center gap-0.5">
                            <Clock size={8} /> {dateLabel}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 5. Premium Insights — only shown to premium members */}
      {isPremium && (
        <div className="relative" id="sidebar-premium-insights">
          {/* Gold gradient border wrapper */}
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-yellow-400/30 via-amber-400/20 to-orange-400/30 dark:from-yellow-500/20 dark:via-amber-500/15 dark:to-orange-500/20 blur-[2px] -z-10" />
          <div className="bg-gradient-to-br from-yellow-50/80 via-white to-amber-50/60 dark:from-yellow-900/10 dark:via-gray-900 dark:to-amber-900/10 border border-yellow-300/60 dark:border-yellow-700/40 rounded-2xl overflow-hidden">

            {/* Section header */}
            <div
              className="flex items-center justify-between px-4 pt-4 pb-3 cursor-pointer select-none"
              onClick={() => setIsPremiumOpen(v => !v)}
            >
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center shadow-sm">
                  <Crown size={13} className="text-white" strokeWidth={2.5} />
                </div>
                <h3 className="text-[11px] font-black text-amber-700 dark:text-amber-400 uppercase tracking-widest">
                  Premium Insights
                </h3>
                <span className="text-[8px] font-black uppercase tracking-wider text-white bg-gradient-to-r from-yellow-500 to-amber-500 px-1.5 py-0.5 rounded-full shadow-sm">
                  EXCLUSIVE
                </span>
              </div>
              <ChevronRight size={14} className={`text-amber-500 transition-all duration-200 ${isPremiumOpen ? 'rotate-90' : ''}`} />
            </div>

            {isPremiumOpen && (
              <div className="px-4 pb-4 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">

                {/* Premium perks quick list */}
                <div className="space-y-1.5">
                  {[
                    { icon: Rocket, label: 'Priority feed placement', desc: 'Your posts reach more people' },
                    { icon: Star, label: 'Premium badge on profile', desc: 'Stand out in the network' },
                    { icon: Lightbulb, label: 'Exclusive channels access', desc: 'Premium-only discussions' },
                  ].map(({ icon: Icon, label, desc }) => (
                    <div key={label} className="flex items-start gap-2.5 p-2 rounded-lg bg-white/60 dark:bg-gray-800/40 border border-yellow-100/80 dark:border-yellow-900/30">
                      <div className="w-6 h-6 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shrink-0 mt-0.5">
                        <Icon size={12} className="text-amber-600 dark:text-amber-400" />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-gray-800 dark:text-gray-200 leading-tight">{label}</p>
                        <p className="text-[9px] text-gray-500 dark:text-gray-400">{desc}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Latest posts by premium members */}
                {premiumPosts.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-[9px] font-black uppercase tracking-widest text-amber-600 dark:text-amber-400 px-0.5">From Premium Members</p>
                    {premiumPosts.map(post => (
                      <div
                        key={post.id}
                        className="flex gap-2 p-2 rounded-xl bg-white/60 dark:bg-gray-800/40 border border-yellow-100/80 dark:border-yellow-900/30 cursor-pointer hover:border-amber-300/60 dark:hover:border-amber-700/40 transition-all group"
                        onClick={() => setSelectedUserId(post.profiles?.id)}
                      >
                        <div className="relative w-7 h-7 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden shrink-0 mt-0.5 border border-yellow-300/50 dark:border-yellow-700/40">
                          {post.profiles?.avatar_url ? (
                            <Image src={post.profiles.avatar_url} alt="" fill sizes="28px" className="object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-[9px] font-bold text-amber-600 uppercase">
                              {post.profiles?.username?.[0] || '?'}
                            </div>
                          )}
                          <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-gradient-to-br from-yellow-400 to-amber-500 rounded-full flex items-center justify-center">
                            <Crown size={6} className="text-white" strokeWidth={3} />
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] font-semibold text-gray-800 dark:text-gray-200 leading-tight line-clamp-1 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                            {post.title || post.content?.slice(0, 55) || 'Untitled'}
                          </p>
                          <div className="flex items-center gap-1 mt-0.5">
                            <span className="text-[9px] text-amber-600 dark:text-amber-400 font-medium truncate">
                              @{post.profiles?.username || 'unknown'}
                            </span>
                            {post.profiles?.is_verified && (
                              <BadgeCheck size={9} className="text-blue-500 shrink-0" fill="currentColor" stroke="white" />
                            )}
                            <span className="ml-auto text-[9px] text-gray-400 dark:text-gray-500 shrink-0 flex items-center gap-0.5">
                              <Clock size={8} /> {timeAgo(post.created_at)}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Footer CTA */}
                <p className="text-center text-[9px] text-amber-600/70 dark:text-amber-400/50 font-medium pt-0.5">
                  You have full premium access ✦
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Premium upsell — only for non-premium users */}
      {!isPremium && (
        <div
          className="relative overflow-hidden rounded-2xl border border-yellow-300/50 dark:border-yellow-700/30 cursor-pointer group"
          onClick={() => router.push('/dash/premium')}
        >
          {/* Blurred gold background */}
          <div className="absolute inset-0 bg-gradient-to-br from-yellow-50 via-amber-50 to-orange-50 dark:from-yellow-900/10 dark:via-amber-900/10 dark:to-orange-900/10" />
          <div className="absolute -top-4 -right-4 w-24 h-24 bg-gradient-to-br from-yellow-300/30 to-amber-400/20 rounded-full blur-xl" />
          <div className="relative p-4 space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center shadow-md shadow-amber-400/30">
                <Crown size={16} className="text-white" strokeWidth={2} />
              </div>
              <div>
                <p className="text-xs font-black text-amber-700 dark:text-amber-400 leading-tight">Go Premium</p>
                <p className="text-[9px] text-amber-600/70 dark:text-amber-500/70">Unlock exclusive network features</p>
              </div>
            </div>
            <div className="space-y-1.5">
              {['Priority feed placement', 'Exclusive premium channels', 'Premium badge + recognition'].map(perk => (
                <div key={perk} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-amber-400/30 flex items-center justify-center shrink-0">
                    <Star size={7} className="text-amber-600" fill="currentColor" />
                  </div>
                  <span className="text-[10px] text-gray-700 dark:text-gray-300 font-medium">{perk}</span>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between pt-0.5">
              <span className="text-[9px] text-gray-500 dark:text-gray-400">Join premium members</span>
              <div className="flex items-center gap-1 text-[10px] font-black text-amber-600 dark:text-amber-400 group-hover:gap-2 transition-all">
                Upgrade <ChevronRight size={11} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 6. Platform Documentation Link */}
      <div>
        <SectionHeader title="Resources" icon={BookOpen} />
        <div
          onClick={handleDocsClick}
          className="flex items-center justify-between group cursor-pointer p-4 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 hover:shadow-md hover:border-blue-500/30 dark:hover:border-blue-500/30 transition-all"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shrink-0">
              <BookOpen size={16} />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">Platform Docs</span>
              <span className="text-[10px] text-gray-500 dark:text-gray-400 line-clamp-1">Read the network reference manual</span>
            </div>
          </div>
          <ChevronRight size={14} className="text-gray-700 dark:text-gray-400 group-hover:text-blue-500 dark:group-hover:text-blue-400 transition-all shrink-0" />
        </div>
      </div>

      {/* USER PROFILE MODAL */}
      {selectedUserId && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-gray-900/50 dark:bg-black/60 backdrop-blur-sm" onClick={() => setSelectedUserId(null)} />
          <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto custom-scrollbar z-10 bg-white dark:bg-gray-900 rounded-[2rem] border border-gray-200 dark:border-gray-800 shadow-xl">
            <button 
              onClick={() => setSelectedUserId(null)} 
              className="absolute top-6 right-6 z-[250] p-2 bg-gray-100 dark:bg-gray-800 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400 rounded-full text-gray-500 dark:text-gray-400 transition-colors"
            >
              <X size={20} />
            </button>
            <div className="p-2 sm:p-6">
              <ProfileContent viewUserId={selectedUserId} />
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* CREATE BROADCAST MODAL */}
      {showBroadcastModal && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-gray-900/50 dark:bg-black/60 backdrop-blur-sm" onClick={() => setShowBroadcastModal(false)} />
          <div className="relative w-full max-w-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-[2rem] shadow-xl animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 rounded-t-[2rem] shrink-0">
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Create Broadcast</h2>
              <button onClick={() => setShowBroadcastModal(false)} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full text-gray-500 dark:text-gray-400 transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="p-4 sm:p-6 overflow-y-auto custom-scrollbar bg-gray-50 dark:bg-gray-800/50 rounded-b-[2rem]">
              <NewPost onPostCreated={() => setShowBroadcastModal(false)} />
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Footer/About Section */}
      <div className="mt-auto pt-8 text-center">
        <p className="text-[10px] text-gray-500 dark:text-gray-400 font-mono">
          beoneofus network v1.0<br/>
          All systems operational.
        </p>
      </div>
    </aside>
  );
}