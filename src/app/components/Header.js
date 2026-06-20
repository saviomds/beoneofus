"use client";

import { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Search, Compass, MessageCircle, X, Loader2, Users, User, Hash, Sun, Moon, Briefcase, ChevronRight, TrendingUp, ShoppingBag, GraduationCap, Package, Wrench, FileText, CalendarDays, Zap, Star, ArrowRight } from 'lucide-react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { supabase } from '../supabaseClient';
import ProfileContent from '../dash/content/ProfileContent';
import { useDashboard } from '../dash/content/DashboardContext';
import { useTheme } from 'next-themes';
import VerifiedBadge from './VerifiedBadge';
import { useLanguage } from '../../lib/i18n';

const HighlightMatch = ({ text, query }) => {
  if (!query || !text) return text || null;
  const parts = text.toString().split(new RegExp(`(${query})`, 'gi'));
  return (
    <>
      {parts.map((part, i) => 
        part.toLowerCase() === query.toLowerCase() ? 
          <span key={i} className="bg-yellow-200 dark:bg-yellow-900/50 text-gray-900 dark:text-yellow-100 rounded-sm px-[2px]">{part}</span> : part
      )}
    </>
  );
};

// Dynamically import the modal to keep the Header bundle lightweight for the end user
const QuickViewModal = dynamic(() => import('./QuickViewModal'), { ssr: false });

export default function Header({ setActiveTab }) {
  const { t, lang, setLang } = useLanguage();
  const { setTargetChatUser } = useDashboard();
  const router = useRouter();
  const [showQuickView, setShowQuickView] = useState(null); // 'discuss' or 'discover'
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState({ posts: [], groups: [], users: [], courses: [], events: [], jobs: [], pathways: [] });
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const searchRef = useRef(null);
  const searchInputRef = useRef(null);
  const [showNetworkModal, setShowNetworkModal] = useState(false);
  const [keyboardShortcut, setKeyboardShortcut] = useState(null);
  const [networkData, setNetworkData] = useState({ connections: [], groups: [] });
  const [isNetworkLoading, setIsNetworkLoading] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [networkTab, setNetworkTab] = useState('connections');
  const [networkSearch, setNetworkSearch] = useState('');
  const [networkFilter, setNetworkFilter] = useState('all');
  const { theme, setTheme, systemTheme } = useTheme();
  const [showMarketplacePopup, setShowMarketplacePopup] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [showHeader, setShowHeader] = useState(true);
  const lastScrollY = useRef(0);

  const closeQuickView = () => setShowQuickView(null);

  const handleNavigate = (tab) => {
    closeQuickView();
    setShowNetworkModal(false);
    setNetworkSearch('');
    setNetworkFilter('all');
    router.push('/dash/' + tab);
  };

  // Listen for custom events to open modals from other components (like RightSidebar on mobile)
  useEffect(() => {
    const handleOpenModal = (e) => {
      const type = e.detail;
      if (type === 'jobs') router.push('/dash/jobs');
      else if (type === 'network') setShowNetworkModal(true);
      else if (type === 'discuss') setShowQuickView('discuss');
      else if (type === 'discover') setShowQuickView('discover');
      else if (type === 'marketplace') setShowMarketplacePopup(true);
    };
    
    window.addEventListener('open-header-modal', handleOpenModal);
    return () => window.removeEventListener('open-header-modal', handleOpenModal);
  }, []);

  // Broadcast active modal states to sync with external mobile menus
  useEffect(() => {
    const sync = () => {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('sync-header-modals', {
          detail: { jobs: false, network: showNetworkModal, discuss: showQuickView === 'discuss', discover: showQuickView === 'discover' }
        }));
      }
    };
    sync();
    window.addEventListener('request-header-modals-sync', sync);
    return () => window.removeEventListener('request-header-modals-sync', sync);
  }, [showNetworkModal, showQuickView]);

  // Handle click outside to close search dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setSearchQuery('');
        setIsMobileSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle keyboard shortcut (Ctrl+K / Cmd+K) to focus main search + Escape to close modals
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsMobileSearchOpen(true);
        searchInputRef.current?.focus();
      }
      if (e.key === 'Escape') {
        if (showNetworkModal) setShowNetworkModal(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [showNetworkModal]);

  // Update keyboard shortcut string based on OS and screen size
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const shortcut = isMac ? '⌘K' : 'Ctrl+K';
      
      const updateShortcut = () => {
        if (window.innerWidth >= 640) {
          setKeyboardShortcut(shortcut);
        } else {
          setKeyboardShortcut(null);
        }
      };
      
      updateShortcut();
      window.addEventListener('resize', updateShortcut);
      return () => window.removeEventListener('resize', updateShortcut);
    }
  }, []);

  useEffect(() => setMounted(true), []);

  // Get current user ID
  useEffect(() => {
    const getSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          setCurrentUserId(session.user.id);
        }
      } catch (error) {
        console.error("Header getSession error:", error);
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
          const { data: profiles } = connectedIds.length > 0 ? await supabase.from('profiles').select('id, username, status, avatar_url, is_verified, work_status, is_premium, is_trial_premium, profile_visibility').in('id', connectedIds) : { data: [] };

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
    setFocusedIndex(-1);
    if (!searchQuery.trim()) {
      setSearchResults({ posts: [], groups: [], users: [], courses: [], events: [], jobs: [], pathways: [] });
      setIsSearching(false);
      return;
    }

    setIsSearching(true);

    const delayDebounceFn = setTimeout(async () => {
      try {
        const [postsRes, groupsRes, usersRes, coursesRes, eventsRes, jobsRes, pathwaysRes] = await Promise.all([
          supabase.from('posts').select('id, title, content').ilike('title', `%${searchQuery}%`).limit(3),
          supabase.from('groups').select('id, name, description').ilike('name', `%${searchQuery}%`).eq('is_private', false).limit(3),
          supabase.from('profiles').select('id, username, status, avatar_url, is_verified, work_status').or(`username.ilike.%${searchQuery}%,status.ilike.%${searchQuery}%,work_status.ilike.%${searchQuery}%`).limit(3),
          supabase.from('courses').select('id, title, category, level').or(`title.ilike.%${searchQuery}%,category.ilike.%${searchQuery}%`).limit(3),
          supabase.from('events').select('id, title, event_date, is_online').ilike('title', `%${searchQuery}%`).order('event_date', { ascending: true }).limit(2),
          supabase.from('jobs').select('id, title, company, type').ilike('title', `%${searchQuery}%`).limit(2),
          supabase.from('pathways').select('id, title, target_role').ilike('title', `%${searchQuery}%`).limit(2),
        ]);

        setSearchResults({
          posts: postsRes.data || [],
          groups: groupsRes.data || [],
          users: usersRes.data || [],
          courses: coursesRes.data || [],
          events: eventsRes.data || [],
          jobs: jobsRes.data || [],
          pathways: pathwaysRes.data || [],
        });
      } catch (error) {
        console.error("Search error:", error);
      } finally {
        setIsSearching(false);
      }
    }, 400); // Wait 400ms after user stops typing to query

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  const flattenedResults = useMemo(() => {
    return [
      ...searchResults.posts.map(p => ({ ...p, _type: 'post' })),
      ...searchResults.groups.map(g => ({ ...g, _type: 'group' })),
      ...searchResults.users.map(u => ({ ...u, _type: 'user' })),
      ...searchResults.courses.map(c => ({ ...c, _type: 'course' })),
      ...searchResults.events.map(e => ({ ...e, _type: 'event' })),
      ...searchResults.jobs.map(j => ({ ...j, _type: 'job' })),
      ...searchResults.pathways.map(p => ({ ...p, _type: 'pathway' })),
    ];
  }, [searchResults]);

  const handleSearchKeyDown = (e) => {
    if (!searchQuery.trim()) return;
    
    if (e.key === 'ArrowDown' && flattenedResults.length > 0) {
      e.preventDefault();
      setFocusedIndex(prev => (prev < flattenedResults.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp' && flattenedResults.length > 0) {
      e.preventDefault();
      setFocusedIndex(prev => (prev > 0 ? prev - 1 : prev));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (flattenedResults.length === 0 || focusedIndex === -1) {
        const q = searchQuery.trim();
        setSearchQuery('');
        setIsMobileSearchOpen(false);
        router.push(`/dash/search?q=${encodeURIComponent(q)}`);
      } else {
        const item = flattenedResults[focusedIndex];
        setSearchQuery('');
        setIsMobileSearchOpen(false);
        if (item._type === 'post') router.push('/posts/' + item.id);
        else if (item._type === 'group') handleNavigate('groups');
        else if (item._type === 'user') setSelectedUserId(item.id);
        else if (item._type === 'course') handleNavigate('learn');
        else if (item._type === 'event') handleNavigate('events');
        else if (item._type === 'job') { setSearchQuery(''); setIsMobileSearchOpen(false); router.push('/dash/jobs'); }
        else if (item._type === 'pathway') handleNavigate('pathways');
      }
    } else if (e.key === 'Escape') {
      setSearchQuery('');
      setIsMobileSearchOpen(false);
    }
  };


  const filteredConnections = networkData.connections.filter(user => {
    const q = networkSearch.toLowerCase();
    const matchSearch = !q || user.username?.toLowerCase().includes(q) || user.status?.toLowerCase().includes(q);
    const matchFilter =
      networkFilter === 'all' ||
      (networkFilter === 'verified' && user.is_verified) ||
      (networkFilter === 'premium' && user.is_premium) ||
      (networkFilter === 'hiring' && user.work_status === 'Hiring');
    return matchSearch && matchFilter;
  });

  const filteredGroups = networkData.groups.filter(group => {
    const q = networkSearch.toLowerCase();
    return !q || group.name?.toLowerCase().includes(q) || group.description?.toLowerCase().includes(q);
  });


  // Handle hiding header on scroll down and showing on scroll up
  useEffect(() => {
    const handleScroll = () => {
      if (typeof window !== 'undefined') {
        const currentScrollY = window.scrollY;
        if (currentScrollY > lastScrollY.current && currentScrollY > 50) {
          setShowHeader(false); // Hide when scrolling down past 50px
        } else {
          setShowHeader(true); // Show when scrolling up
        }
        lastScrollY.current = currentScrollY;
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <>
      {/* ══ DESKTOP HEADER ══ */}
      <header className={`
        hidden md:flex flex-col
        px-4 lg:px-6 pt-2.5 pb-2
        border-b border-gray-200 dark:border-gray-800
        bg-white/95 dark:bg-gray-900/95 backdrop-blur-md
        sticky top-0 z-40
        transition-transform duration-300 ease-in-out
        ${showHeader ? 'translate-y-0' : '-translate-y-full'}
      `}>
        {/* Row 1: nav pills + theme toggle */}
        <div className="flex items-center justify-between gap-2 w-full mb-2">
          <nav className="flex items-center gap-0.5 overflow-x-auto no-scrollbar">
            <button
              id="header-btn-network"
              onClick={() => setShowNetworkModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-widest text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/[0.06] hover:text-gray-900 dark:hover:text-white transition-all whitespace-nowrap"
            >
              <Users size={13} /> {t('header.network')}
            </button>
            <button
              id="header-btn-discuss"
              onClick={() => setShowQuickView('discuss')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-widest text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/[0.06] hover:text-gray-900 dark:hover:text-white transition-all whitespace-nowrap"
            >
              <MessageCircle size={13} /> {t('header.discuss')}
            </button>
            <button
              id="header-btn-discover"
              onClick={() => setShowQuickView('discover')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-widest text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/[0.06] hover:text-gray-900 dark:hover:text-white transition-all whitespace-nowrap"
            >
              <Compass size={13} /> {t('header.discover')}
            </button>
            <button
              id="header-btn-marketplace"
              onClick={() => setShowMarketplacePopup(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-widest text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/[0.06] hover:text-gray-900 dark:hover:text-white transition-all whitespace-nowrap"
            >
              <ShoppingBag size={13} /> {t('header.marketplace')}
            </button>
          </nav>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => setLang(lang === 'en' ? 'fr' : 'en')}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-wider text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-blue-600 dark:hover:text-blue-400 transition-all border border-gray-200 dark:border-gray-700"
              title={t('header.switch_lang')}
            >
              {lang === 'en' ? 'FR' : 'EN'}
            </button>
            {mounted && (
              <button
                onClick={() => { const cur = theme === 'system' ? systemTheme : theme; setTheme(cur === 'dark' ? 'light' : 'dark'); }}
                className="p-1.5 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-blue-600 dark:hover:text-blue-400 transition-all"
                title={t('header.toggle_theme')}
              >
                {theme === 'dark' || (theme === 'system' && systemTheme === 'dark') ? <Sun size={15} /> : <Moon size={15} />}
              </button>
            )}
          </div>
        </div>

        {/* Row 2: full-width search */}
        <div className="relative w-full" ref={searchRef}>
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
            <Search size={14} className="text-gray-400 dark:text-gray-500" />
          </div>
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onKeyDown={handleSearchKeyDown}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="block w-full pl-10 pr-12 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-800/80 focus:bg-white dark:focus:bg-gray-900 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            placeholder={t('header.search_placeholder')}
          />
            {!searchQuery && keyboardShortcut && (
              <div className="absolute inset-y-0 right-0 pr-2.5 flex items-center pointer-events-none">
                <kbd className="inline-flex items-center rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-1 py-0.5 font-mono text-[9px] font-bold text-gray-400 dark:text-gray-500">
                  {keyboardShortcut}
                </kbd>
              </div>
            )}
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors">
                <X size={13} />
              </button>
            )}

            {/* Search Dropdown Results */}
            {searchQuery.trim().length > 0 && (
            <div className="absolute top-full left-0 w-full mt-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 z-50">
              {isSearching ? (
                <div className="p-4 space-y-3">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse shrink-0"></div>
                      <div className="space-y-2 flex-1">
                        <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded animate-pulse w-1/3"></div>
                        <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded animate-pulse w-1/2"></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (searchResults.posts.length === 0 && searchResults.groups.length === 0 && searchResults.users.length === 0 && searchResults.courses.length === 0 && searchResults.events.length === 0 && searchResults.jobs.length === 0 && searchResults.pathways.length === 0) ? (
                <div 
                  onClick={() => { setSearchQuery(''); setIsMobileSearchOpen(false); handleNavigate('feed'); }}
                  className="p-6 text-center cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-all group"
                >
                  <div className="w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-500 mx-auto flex items-center justify-center mb-3">
                    <MessageCircle size={20} className="group-hover:scale-110 transition-transform" />
                  </div>
                  <p className="text-sm font-bold text-gray-900 dark:text-gray-100 mb-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{t('header.nothing_found')} &quot;{searchQuery}&quot;</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">{t('header.press_enter')}</p>
                </div>
              ) : (
                <>
                <div className="max-h-[60vh] overflow-y-auto custom-scrollbar">
                  {/* Posts Results */}
                  {searchResults.posts.length > 0 && (
                    <div className="p-2">
                      <div className="text-[9px] font-black uppercase text-gray-500 dark:text-gray-400 tracking-[2px] px-2 mb-1.5 mt-1">{t('header.search_sections.discussions')}</div>
                  {searchResults.posts.map((post, i) => (
                    <div key={`post-${post.id}`} onClick={() => { setSearchQuery(''); router.push('/posts/' + post.id); }} onMouseEnter={() => setFocusedIndex(i)} className={`flex items-center gap-3 p-2 hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded-xl cursor-pointer transition-all group ${focusedIndex === i ? 'bg-gray-50 dark:bg-gray-800/50' : ''}`}>
                          <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center shrink-0 text-blue-500 dark:text-blue-400">
                            <MessageCircle size={15} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-bold text-gray-900 dark:text-gray-100 line-clamp-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors"><HighlightMatch text={post.title || 'Untitled Node'} query={searchQuery} /></p>
                            <p className="text-[10px] text-gray-500 dark:text-gray-400 line-clamp-1 mt-0.5"><HighlightMatch text={post.content} query={searchQuery} /></p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {/* Groups Results */}
                  {searchResults.groups.length > 0 && (
                    <div className={`p-2 ${searchResults.posts.length > 0 ? 'border-t border-gray-100 dark:border-gray-800' : ''}`}>
                      <div className="text-[9px] font-black uppercase text-gray-500 dark:text-gray-400 tracking-[2px] px-2 mb-1.5 mt-1">{t('header.search_sections.groups')}</div>
                  {searchResults.groups.map((group, i) => (
                    <div key={`group-${group.id}`} onClick={() => { setSearchQuery(''); handleNavigate('groups'); }} onMouseEnter={() => setFocusedIndex(searchResults.posts.length + i)} className={`flex items-center gap-3 p-2 hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded-xl cursor-pointer transition-all group ${focusedIndex === searchResults.posts.length + i ? 'bg-gray-50 dark:bg-gray-800/50' : ''}`}>
                          <div className="w-8 h-8 rounded-lg bg-violet-50 dark:bg-violet-500/10 flex items-center justify-center shrink-0 text-violet-500 dark:text-violet-400">
                            <Hash size={15} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-bold text-gray-900 dark:text-gray-100 line-clamp-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors"><HighlightMatch text={group.name} query={searchQuery} /></p>
                            <p className="text-[10px] text-gray-500 dark:text-gray-400 line-clamp-1 mt-0.5"><HighlightMatch text={group.description} query={searchQuery} /></p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Users Results */}
                  {searchResults.users.length > 0 && (
                    <div className={`p-2 ${(searchResults.posts.length > 0 || searchResults.groups.length > 0) ? 'border-t border-gray-100 dark:border-gray-800' : ''}`}>
                      <div className="text-[9px] font-black uppercase text-gray-500 dark:text-gray-400 tracking-[2px] px-2 mb-1.5 mt-1">{t('header.search_sections.users')}</div>
                  {searchResults.users.map((user, i) => (
                    <div key={`user-${user.id}`} onClick={() => { setSearchQuery(''); setSelectedUserId(user.id); }} onMouseEnter={() => setFocusedIndex(searchResults.posts.length + searchResults.groups.length + i)} className={`flex items-center gap-3 p-2 hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded-xl cursor-pointer transition-all group ${focusedIndex === searchResults.posts.length + searchResults.groups.length + i ? 'bg-gray-50 dark:bg-gray-800/50' : ''}`}>
                          <div className="relative w-8 h-8 rounded-xl bg-gray-100 dark:bg-gray-800 overflow-hidden shrink-0 border border-gray-200 dark:border-gray-700 flex items-center justify-center text-xs font-bold text-gray-600 dark:text-gray-400 uppercase">
                            {user.avatar_url ? (
                              <Image src={user.avatar_url} alt="avatar" fill sizes="32px" className="object-cover" />
                            ) : (
                              user.username?.substring(0, 2) || '??'
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-bold text-gray-900 dark:text-gray-100 line-clamp-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors flex items-center gap-1">
                              @<HighlightMatch text={user.username} query={searchQuery} />
                              {user.is_verified && <VerifiedBadge size={14} />}
                              {user.work_status && user.work_status !== 'None' && (
                                <span className={`ml-1 px-1.5 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest border ${user.work_status === 'Hiring' ? 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-800/50' : 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/50'}`}>
                                  {user.work_status}
                                </span>
                              )}
                            </p>
                            <p className="text-[10px] text-gray-500 dark:text-gray-400 line-clamp-1 mt-0.5 uppercase tracking-widest font-black"><HighlightMatch text={user.status || 'Active Node'} query={searchQuery} /></p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Courses Results */}
                  {searchResults.courses.length > 0 && (
                    <div className={`p-2 ${(searchResults.posts.length > 0 || searchResults.groups.length > 0 || searchResults.users.length > 0) ? 'border-t border-gray-100 dark:border-gray-800' : ''}`}>
                      <div className="text-[9px] font-black uppercase text-gray-500 dark:text-gray-400 tracking-[2px] px-2 mb-1.5 mt-1">{t('header.search_sections.courses')}</div>
                      {searchResults.courses.map((course) => (
                        <div key={`course-${course.id}`} onClick={() => { setSearchQuery(''); handleNavigate('learn'); }} className="flex items-center gap-3 p-2 hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded-xl cursor-pointer transition-all group">
                          <div className="w-7 h-7 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0 text-blue-600 dark:text-blue-400">
                            <GraduationCap size={14} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-bold text-gray-900 dark:text-gray-100 line-clamp-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors"><HighlightMatch text={course.title} query={searchQuery} /></p>
                            <p className="text-[10px] text-gray-500 dark:text-gray-400 font-black uppercase tracking-widest">{course.category} · {course.level}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Events Results */}
                  {searchResults.events.length > 0 && (
                    <div className="p-2 border-t border-gray-100 dark:border-gray-800">
                      <div className="text-[9px] font-black uppercase text-gray-500 dark:text-gray-400 tracking-[2px] px-2 mb-1.5 mt-1">Events</div>
                      {searchResults.events.map((event) => (
                        <div key={`event-${event.id}`} onClick={() => { setSearchQuery(''); handleNavigate('events'); }} className="flex items-center gap-3 p-2 hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded-xl cursor-pointer transition-all group">
                          <div className="w-7 h-7 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center shrink-0 text-indigo-600 dark:text-indigo-400">
                            <CalendarDays size={14} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-bold text-gray-900 dark:text-gray-100 line-clamp-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors"><HighlightMatch text={event.title} query={searchQuery} /></p>
                            {event.event_date && <p className="text-[10px] text-gray-500 dark:text-gray-400 font-semibold mt-0.5">{new Date(event.event_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}{event.is_online ? ' · Online' : ''}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Jobs Results */}
                  {searchResults.jobs.length > 0 && (
                    <div className="p-2 border-t border-gray-100 dark:border-gray-800">
                      <div className="text-[9px] font-black uppercase text-gray-500 dark:text-gray-400 tracking-[2px] px-2 mb-1.5 mt-1">Jobs</div>
                      {searchResults.jobs.map((job) => (
                        <div key={`job-${job.id}`} onClick={() => { setSearchQuery(''); setIsMobileSearchOpen(false); router.push('/dash/jobs'); }} className="flex items-center gap-3 p-2 hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded-xl cursor-pointer transition-all group">
                          <div className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center shrink-0 text-emerald-600 dark:text-emerald-400">
                            <Briefcase size={14} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-bold text-gray-900 dark:text-gray-100 line-clamp-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors"><HighlightMatch text={job.title} query={searchQuery} /></p>
                            {job.company && <p className="text-[10px] text-gray-500 dark:text-gray-400 font-semibold mt-0.5">{job.company}{job.type ? ` · ${job.type}` : ''}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Pathways Results */}
                  {searchResults.pathways.length > 0 && (
                    <div className="p-2 border-t border-gray-100 dark:border-gray-800">
                      <div className="text-[9px] font-black uppercase text-gray-500 dark:text-gray-400 tracking-[2px] px-2 mb-1.5 mt-1">Pathways</div>
                      {searchResults.pathways.map((pathway) => (
                        <div key={`pathway-${pathway.id}`} onClick={() => { setSearchQuery(''); handleNavigate('pathways'); }} className="flex items-center gap-3 p-2 hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded-xl cursor-pointer transition-all group">
                          <div className="w-7 h-7 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shrink-0 text-amber-600 dark:text-amber-400">
                            <TrendingUp size={14} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-bold text-gray-900 dark:text-gray-100 line-clamp-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors"><HighlightMatch text={pathway.title} query={searchQuery} /></p>
                            {pathway.target_role && <p className="text-[10px] text-gray-500 dark:text-gray-400 font-semibold mt-0.5">{pathway.target_role}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* See all results footer */}
                <div className="border-t border-gray-100 dark:border-gray-800 p-2">
                  <button
                    onClick={() => { const q = searchQuery.trim(); setSearchQuery(''); setIsMobileSearchOpen(false); router.push(`/dash/search?q=${encodeURIComponent(q)}`); }}
                    className="w-full flex items-center justify-center gap-2 py-2 text-[11px] font-black uppercase tracking-widest text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition-all"
                  >
                    <Search size={12} /> See all {flattenedResults.length > 0 ? `${flattenedResults.length}+ ` : ''}results for &quot;{searchQuery}&quot;
                  </button>
                </div>
                </>
              )}
            </div>
          )}
        </div>
      </header>

      {/* --- QUICK VIEW POP-UP TOGGLE --- */}
      {showQuickView && (
        <QuickViewModal 
          type={showQuickView} 
          onClose={closeQuickView} 
          onNavigate={handleNavigate} 
        />
      )}

      {/* --- MARKETPLACE POPUP --- */}
      {showMarketplacePopup && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-xl" onClick={() => setShowMarketplacePopup(false)} />

          <div className="relative w-full max-w-2xl bg-white dark:bg-gray-950 border border-gray-200 dark:border-white/[0.06] rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">

            {/* Gradient header */}
            <div className="relative h-32 overflow-hidden" style={{ background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)' }}>
              <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.10) 1px, transparent 1px)', backgroundSize: '18px 18px' }} />
              <div className="absolute inset-0 bg-gradient-to-t from-black/25 to-transparent" />
              <div className="absolute bottom-5 left-6 flex items-end gap-3">
                <div className="w-11 h-11 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center border border-white/25 shrink-0">
                  <ShoppingBag size={20} className="text-white" />
                </div>
                <div>
                  <p className="text-[9px] font-black text-white/65 uppercase tracking-[4px] mb-0.5">Ecosystem Commerce</p>
                  <h2 className="text-2xl font-black text-white tracking-tight leading-none">Marketplace</h2>
                </div>
              </div>
              <button onClick={() => setShowMarketplacePopup(false)} className="absolute top-4 right-4 p-2 bg-white/15 hover:bg-white/25 rounded-xl text-white transition-all">
                <X size={16} />
              </button>
            </div>

            <div className="p-5">
              {/* Stats row */}
              <div className="flex items-stretch gap-3 mb-5">
                {[
                  { label: 'Categories', value: '6+',                                              accent: false },
                  { label: 'Flash Deals', value: <Zap size={18} className="text-violet-500" />,   accent: true  },
                  { label: 'Trending',   value: <Star size={18} className="text-blue-400" />,      accent: false },
                ].map(({ label, value, accent }) => (
                  <div key={label} className={`flex-1 flex flex-col items-center justify-center rounded-2xl px-4 py-3 border ${accent ? 'bg-violet-50 dark:bg-violet-500/10 border-violet-100 dark:border-violet-500/20' : 'bg-gray-50 dark:bg-white/[0.04] border-gray-100 dark:border-white/[0.06]'}`}>
                    <div className="text-xl font-black text-gray-900 dark:text-white flex items-center">{value}</div>
                    <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mt-0.5">{label}</p>
                  </div>
                ))}
              </div>

              {/* Category cards — all same h-24 */}
              <div className="grid grid-cols-3 gap-3 mb-4">
                {[
                  { label: 'Services',  icon: Wrench,       color: 'blue',   tab: 'services'    },
                  { label: 'Products',  icon: Package,      color: 'violet', tab: 'marketplace' },
                  { label: 'Contracts', icon: FileText,     color: 'indigo', tab: 'contracts'   },
                  { label: 'Events',    icon: CalendarDays, color: 'blue',   tab: 'events'      },
                  { label: 'Courses',   icon: GraduationCap,color: 'violet', tab: 'learn'       },
                  { label: 'Top Picks', icon: Star,         color: 'indigo', tab: 'marketplace' },
                ].map(({ label, icon: CardIcon, color, tab }) => {
                  const bg = {
                    blue:   'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-100 dark:border-blue-500/20 hover:border-blue-300 dark:hover:border-blue-500/40 hover:shadow-blue-500/10',
                    violet: 'bg-violet-50 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-100 dark:border-violet-500/20 hover:border-violet-300 dark:hover:border-violet-500/40 hover:shadow-violet-500/10',
                    indigo: 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-100 dark:border-indigo-500/20 hover:border-indigo-300 dark:hover:border-indigo-500/40 hover:shadow-indigo-500/10',
                  }[color];
                  return (
                    <button
                      key={label}
                      onClick={() => { setShowMarketplacePopup(false); router.push(`/dash/${tab}`); }}
                      className={`h-24 flex flex-col items-center justify-center gap-2 rounded-2xl border transition-all hover:-translate-y-0.5 hover:shadow-md active:scale-95 ${bg}`}
                    >
                      <CardIcon size={22} />
                      <span className="text-[11px] font-black uppercase tracking-wider">{label}</span>
                    </button>
                  );
                })}
              </div>

              {/* CTA */}
              <button
                onClick={() => { setShowMarketplacePopup(false); router.push('/dash/marketplace'); }}
                className="flex items-center justify-center gap-2 w-full py-3.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white rounded-2xl font-black uppercase tracking-widest text-xs transition-all shadow-lg shadow-indigo-500/20 active:scale-[0.98]"
              >
                Browse Full Marketplace <ArrowRight size={14} />
              </button>
            </div>
          </div>
        </div>
      , document.body)}

      {/* --- MY NETWORK MODAL --- */}
      {showNetworkModal && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-xl" onClick={() => { setShowNetworkModal(false); setNetworkSearch(''); setNetworkFilter('all'); }} />
          <div className="relative w-full max-w-2xl bg-white dark:bg-gray-950 border border-gray-200 dark:border-white/[0.06] rounded-3xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">

            {/* ── Gradient header ── */}
            <div className="relative h-28 overflow-hidden shrink-0" style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)' }}>
              <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.10) 1px, transparent 1px)', backgroundSize: '18px 18px' }} />
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
              <div className="absolute bottom-4 left-6 flex items-end gap-3">
                <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center border border-white/25 shrink-0">
                  <Users size={18} className="text-white" />
                </div>
                <div>
                  <p className="text-[9px] font-black text-white/65 uppercase tracking-[4px] mb-0.5">Your Ecosystem</p>
                  <h2 className="text-xl font-black text-white tracking-tight leading-none">{t('header.network_modal.title')}</h2>
                </div>
              </div>
              <div className="absolute bottom-4 right-14 flex gap-2">
                <div className="bg-white/15 backdrop-blur-sm rounded-xl px-3 py-1.5 border border-white/20 text-center">
                  <p className="text-xs font-black text-white leading-none">{networkData.connections.length}</p>
                  <p className="text-[8px] text-white/60 font-medium uppercase tracking-wider">linked</p>
                </div>
                <div className="bg-white/15 backdrop-blur-sm rounded-xl px-3 py-1.5 border border-white/20 text-center">
                  <p className="text-xs font-black text-white leading-none">{networkData.groups.length}</p>
                  <p className="text-[8px] text-white/60 font-medium uppercase tracking-wider">channels</p>
                </div>
                <div className="bg-white/15 backdrop-blur-sm rounded-xl px-3 py-1.5 border border-white/20 text-center">
                  <p className="text-xs font-black text-white leading-none">{networkData.connections.filter(u => u.is_verified).length}</p>
                  <p className="text-[8px] text-white/60 font-medium uppercase tracking-wider">verified</p>
                </div>
              </div>
              <button onClick={() => { setShowNetworkModal(false); setNetworkSearch(''); setNetworkFilter('all'); }} className="absolute top-4 right-4 p-2 bg-white/15 hover:bg-white/25 rounded-xl text-white transition-all">
                <X size={16} />
              </button>
            </div>

            {/* ── Search + tabs + filters ── */}
            <div className="px-5 pt-4 pb-3 shrink-0 border-b border-gray-100 dark:border-white/[0.06] space-y-3">
              {/* Search input */}
              <div className="relative">
                <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                <input
                  type="text"
                  value={networkSearch}
                  onChange={e => setNetworkSearch(e.target.value)}
                  placeholder={networkTab === 'connections' ? 'Search by name or status…' : 'Search channels…'}
                  className="w-full pl-9 pr-9 py-2.5 bg-gray-50 dark:bg-white/[0.04] border border-gray-200 dark:border-white/[0.08] rounded-xl text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
                {networkSearch && (
                  <button onClick={() => setNetworkSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors">
                    <X size={13} />
                  </button>
                )}
              </div>

              {/* Tabs + filter chips */}
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex gap-1">
                  {[
                    { key: 'connections', label: 'Connections', icon: Users, count: networkData.connections.length },
                    { key: 'groups', label: 'Channels', icon: Hash, count: networkData.groups.length },
                  ].map(({ key, label, icon: TabIcon, count }) => (
                    <button
                      key={key}
                      onClick={() => { setNetworkTab(key); setNetworkSearch(''); setNetworkFilter('all'); }}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-wider transition-all ${networkTab === key ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/[0.06]'}`}
                    >
                      <TabIcon size={11} /> {label}
                      <span className={`px-1.5 py-0.5 rounded-md text-[9px] font-black ${networkTab === key ? 'bg-white/20' : 'bg-gray-100 dark:bg-white/[0.08] text-gray-500 dark:text-gray-400'}`}>{count}</span>
                    </button>
                  ))}
                </div>
                {networkTab === 'connections' && (
                  <div className="flex gap-1 overflow-x-auto no-scrollbar">
                    {[
                      { key: 'all', label: 'All' },
                      { key: 'verified', label: 'Verified' },
                      { key: 'premium', label: 'Pro' },
                      { key: 'hiring', label: 'Hiring' },
                    ].map(({ key, label }) => (
                      <button
                        key={key}
                        onClick={() => setNetworkFilter(key)}
                        className={`shrink-0 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${networkFilter === key ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 shadow-sm' : 'bg-gray-100 dark:bg-white/[0.06] text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/[0.10]'}`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* ── Cards grid ── */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-4">
              {isNetworkLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[1, 2, 3, 4].map(i => (
                    <div key={i} className="h-24 bg-gray-100 dark:bg-white/[0.04] rounded-2xl animate-pulse" />
                  ))}
                </div>
              ) : (
                <>
                  {networkTab === 'connections' && (
                    filteredConnections.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {filteredConnections.map(user => (
                          <div
                            key={`net-user-${user.id}`}
                            onClick={() => { if (setTargetChatUser) setTargetChatUser(user); handleNavigate('messages'); }}
                            className="h-24 flex items-center gap-3.5 px-4 py-3 bg-white dark:bg-gray-900/70 border border-gray-100 dark:border-white/[0.06] rounded-2xl hover:border-blue-200 dark:hover:border-blue-500/20 hover:shadow-lg hover:-translate-y-0.5 cursor-pointer group transition-all duration-200"
                          >
                            {/* Avatar */}
                            <div className="relative w-11 h-11 rounded-xl bg-gray-100 dark:bg-gray-800 overflow-hidden shrink-0 border-2 border-white dark:border-gray-900 shadow-sm flex items-center justify-center text-sm font-black text-gray-600 dark:text-gray-400 uppercase">
                              {user.avatar_url
                                ? <Image src={user.avatar_url} alt="avatar" fill sizes="44px" className="object-cover" />
                                : (user.username?.substring(0, 2) || '??')}
                              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-white dark:border-gray-900" />
                            </div>
                            {/* Info */}
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1 flex-wrap mb-0.5">
                                <p className="text-[13px] font-black text-gray-900 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate max-w-[120px]">@{user.username}</p>
                                {user.is_verified && <VerifiedBadge size={13} />}
                                {user.is_premium && !user.is_trial_premium && user.profile_visibility?.premium_badge !== false && (
                                  <span className="px-1.5 py-0.5 bg-gradient-to-r from-amber-400 to-orange-400 text-white text-[8px] font-black uppercase tracking-widest rounded-md shadow-sm">PRO</span>
                                )}
                                {user.is_premium && user.is_trial_premium && user.profile_visibility?.premium_badge !== false && (
                                  <span className="px-1.5 py-0.5 bg-gradient-to-r from-blue-400 to-violet-400 text-white text-[8px] font-black uppercase tracking-widest rounded-md shadow-sm">FREEMIUM</span>
                                )}
                              </div>
                              <p className="text-[10px] text-gray-500 dark:text-gray-400 font-semibold truncate leading-tight">{user.status || 'Active Member'}</p>
                              {user.work_status && user.work_status !== 'None' && (
                                <span className={`inline-flex mt-1 px-1.5 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest border ${user.work_status === 'Hiring' ? 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-800/50' : 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/50'}`}>
                                  {user.work_status}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-14 text-center">
                        <div className="w-14 h-14 bg-gray-100 dark:bg-white/[0.04] rounded-2xl flex items-center justify-center mb-3">
                          <Users size={24} className="text-gray-400" />
                        </div>
                        <p className="text-sm font-bold text-gray-500 dark:text-gray-400 mb-1">
                          {networkSearch || networkFilter !== 'all' ? 'No results found' : t('header.network_modal.no_connections')}
                        </p>
                        {(networkSearch || networkFilter !== 'all') && (
                          <button onClick={() => { setNetworkSearch(''); setNetworkFilter('all'); }} className="text-xs text-blue-500 font-bold hover:underline">Clear filters</button>
                        )}
                      </div>
                    )
                  )}

                  {networkTab === 'groups' && (
                    filteredGroups.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {filteredGroups.map(group => (
                          <div
                            key={`net-group-${group.id}`}
                            onClick={() => handleNavigate('groups')}
                            className="h-24 flex items-center gap-3.5 px-4 py-3 bg-white dark:bg-gray-900/70 border border-gray-100 dark:border-white/[0.06] rounded-2xl hover:border-blue-200 dark:hover:border-blue-500/20 hover:shadow-lg hover:-translate-y-0.5 cursor-pointer group transition-all duration-200"
                          >
                            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center shrink-0 shadow-sm shadow-blue-500/20">
                              <Hash size={18} className="text-white" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5 mb-0.5">
                                <p className="text-[13px] font-black text-gray-900 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate">{group.name}</p>
                                {group.is_private && (
                                  <span className="shrink-0 px-1.5 py-0.5 bg-gray-100 dark:bg-white/[0.06] text-gray-500 dark:text-gray-400 text-[8px] font-black uppercase tracking-widest rounded-md border border-gray-200 dark:border-white/[0.08]">Private</span>
                                )}
                              </div>
                              <p className="text-[10px] text-gray-500 dark:text-gray-400 font-medium line-clamp-2 leading-relaxed">
                                {group.description || (group.is_private ? t('header.network_modal.private_channel') : t('header.network_modal.public_channel'))}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-14 text-center">
                        <div className="w-14 h-14 bg-gray-100 dark:bg-white/[0.04] rounded-2xl flex items-center justify-center mb-3">
                          <Hash size={24} className="text-gray-400" />
                        </div>
                        <p className="text-sm font-bold text-gray-500 dark:text-gray-400 mb-1">
                          {networkSearch ? 'No channels match your search' : t('header.network_modal.no_channels')}
                        </p>
                        {networkSearch && <button onClick={() => setNetworkSearch('')} className="text-xs text-blue-500 font-bold hover:underline">Clear search</button>}
                      </div>
                    )
                  )}
                </>
              )}
            </div>

            {/* ── Footer CTA ── */}
            <div className="px-4 pb-4 pt-3 border-t border-gray-100 dark:border-white/[0.06] shrink-0">
              <button
                onClick={() => { setShowNetworkModal(false); setNetworkSearch(''); setNetworkFilter('all'); handleNavigate('connections'); }}
                className="flex items-center justify-center gap-2 w-full py-3 bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 text-white rounded-2xl font-black uppercase tracking-widest text-xs transition-all shadow-lg shadow-blue-500/20 active:scale-[0.98]"
              >
                View Full Network <ArrowRight size={13} />
              </button>
            </div>
          </div>
        </div>
      , document.body)}

      {/* USER PROFILE MODAL */}
      {selectedUserId && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-gray-900/50 dark:bg-black/60 backdrop-blur-sm" onClick={() => setSelectedUserId(null)} />
          <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto popup-scrollbar z-10 bg-white dark:bg-gray-900 rounded-[2rem] border border-gray-200 dark:border-gray-800 shadow-2xl animate-in zoom-in-95 duration-200">
            <button 
              onClick={() => setSelectedUserId(null)} 
              className="absolute top-6 right-6 z-[250] p-2 bg-gray-100 dark:bg-gray-800 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400 rounded-xl text-gray-500 dark:text-gray-400 transition-colors"
            >
              <X size={20} />
            </button>
            <div className="p-2 sm:p-6">
              <ProfileContent viewUserId={selectedUserId} />
            </div>
          </div>
        </div>
      , document.body)}
    </>
  );
}