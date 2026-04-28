"use client";

import { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Search, Compass, MessageCircle, X, Loader2, Users, User, Hash, Sun, Moon, Briefcase, MapPin, DollarSign, CheckCircle2, AlertTriangle } from 'lucide-react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import { supabase } from '../supabaseClient';
import ProfileContent from '../dash/contect/ProfileContent';
import { useDashboard } from '../dash/contect/DashboardContext';
import { useTheme } from 'next-themes';
import VerifiedBadge from './VerifiedBadge';

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
  const { setActiveSection, setTargetChatUser } = useDashboard();
  const [showQuickView, setShowQuickView] = useState(null); // 'discuss' or 'discover'
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState({ posts: [], groups: [], users: [] });
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
  const [networkTab, setNetworkTab] = useState('connections'); // 'connections' or 'groups'
  const { theme, setTheme, systemTheme } = useTheme();
  const [showJobsModal, setShowJobsModal] = useState(false);
  const [jobSearchQuery, setJobSearchQuery] = useState('');
  const [applyingJob, setApplyingJob] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [isJobsLoading, setIsJobsLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [resumeFile, setResumeFile] = useState(null);
  const [portfolioUrl, setPortfolioUrl] = useState('');
  const [coverLetter, setCoverLetter] = useState('');
  const [isSubmittingApp, setIsSubmittingApp] = useState(false);
  const [showAppSuccess, setShowAppSuccess] = useState(false);
  const [showAppError, setShowAppError] = useState(null);
  const [showHeader, setShowHeader] = useState(true);
  const lastScrollY = useRef(0);

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

  // Listen for custom events to open modals from other components (like RightSidebar on mobile)
  useEffect(() => {
    const handleOpenModal = (e) => {
      const type = e.detail;
      if (type === 'jobs') setShowJobsModal(true);
      else if (type === 'network') setShowNetworkModal(true);
      else if (type === 'discuss') setShowQuickView('discuss');
      else if (type === 'discover') setShowQuickView('discover');
    };
    
    window.addEventListener('open-header-modal', handleOpenModal);
    return () => window.removeEventListener('open-header-modal', handleOpenModal);
  }, []);

  // Broadcast active modal states to sync with external mobile menus
  useEffect(() => {
    const sync = () => {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('sync-header-modals', {
          detail: { jobs: showJobsModal, network: showNetworkModal, discuss: showQuickView === 'discuss', discover: showQuickView === 'discover' }
        }));
      }
    };
    sync();
    window.addEventListener('request-header-modals-sync', sync);
    return () => window.removeEventListener('request-header-modals-sync', sync);
  }, [showJobsModal, showNetworkModal, showQuickView]);

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

  // Handle keyboard shortcut (Ctrl+K / Cmd+K) to focus main search
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsMobileSearchOpen(true);
        searchInputRef.current?.focus();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

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
          const { data: profiles } = connectedIds.length > 0 ? await supabase.from('profiles').select('id, username, status, avatar_url, is_verified, work_status').in('id', connectedIds) : { data: [] };

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
      setSearchResults({ posts: [], groups: [], users: [] });
      setIsSearching(false);
      return;
    }

    setIsSearching(true);

    const delayDebounceFn = setTimeout(async () => {
      try {
        const [postsRes, groupsRes, usersRes] = await Promise.all([
          supabase.from('posts').select('id, title, content').ilike('title', `%${searchQuery}%`).limit(3),
          supabase.from('groups').select('id, name, description').ilike('name', `%${searchQuery}%`).eq('is_private', false).limit(3),
          supabase.from('profiles').select('id, username, status, avatar_url, is_verified, work_status').or(`username.ilike.%${searchQuery}%,status.ilike.%${searchQuery}%,work_status.ilike.%${searchQuery}%`).limit(3)
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

  const flattenedResults = useMemo(() => {
    return [
      ...searchResults.posts.map(p => ({ ...p, _type: 'post' })),
      ...searchResults.groups.map(g => ({ ...g, _type: 'group' })),
      ...searchResults.users.map(u => ({ ...u, _type: 'user' }))
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
        setSearchQuery('');
        setIsMobileSearchOpen(false);
        handleNavigate('feed');
      } else {
        const item = flattenedResults[focusedIndex];
        setSearchQuery('');
        if (item._type === 'post') handleNavigate('feed');
        else if (item._type === 'group') handleNavigate('groups');
        else if (item._type === 'user') setSelectedUserId(item.id);
      }
    } else if (e.key === 'Escape') {
      setSearchQuery('');
      setIsMobileSearchOpen(false);
    }
  };

  // Fetch jobs from Supabase when the modal is opened
  useEffect(() => {
    if (showJobsModal) {
      const fetchJobs = async () => {
        setIsJobsLoading(true);
        try {
          const { data, error } = await supabase
            .from('jobs')
            .select('*')
            .order('created_at', { ascending: false });
          
          if (error) throw error;
          setJobs(data || []);
        } catch (error) {
          console.error('Error fetching jobs:', error.message || error);
        } finally {
          setIsJobsLoading(false);
        }
      };
      fetchJobs();
    }
  }, [showJobsModal]);

  const filteredJobs = jobs.filter(job => 
    job.title?.toLowerCase().includes(jobSearchQuery.toLowerCase()) || 
    job.company?.toLowerCase().includes(jobSearchQuery.toLowerCase()) || 
    (job.tags || []).some(t => t.toLowerCase().includes(jobSearchQuery.toLowerCase()))
  );

  const handleApplyJob = async (e) => {
    e.preventDefault();
    if (!currentUserId) return setShowAppError("You must be logged in to apply.");
    if (!resumeFile && !portfolioUrl) return setShowAppError("Please upload a resume or provide a portfolio link.");

    setIsSubmittingApp(true);
    try {
      let finalResumeUrl = null;
      
      // Upload resume file if provided
      if (resumeFile) {
        const fileExt = resumeFile.name.split('.').pop();
        const fileName = `resume-${currentUserId}-${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage.from('resumes').upload(fileName, resumeFile);
        if (uploadError) throw uploadError;
        
        const { data } = supabase.storage.from('resumes').getPublicUrl(fileName);
        finalResumeUrl = data.publicUrl;
      }

      const { error } = await supabase.from('job_applications').insert({
        job_id: applyingJob.id,
        user_id: currentUserId,
        resume_url: finalResumeUrl,
        portfolio_url: portfolioUrl,
        cover_letter: coverLetter,
        status: 'pending'
      });
      if (error) throw error;
      setApplyingJob(null);
      setResumeFile(null);
      setPortfolioUrl('');
      setCoverLetter('');
      setShowAppSuccess(true);
      setTimeout(() => setShowAppSuccess(false), 3000);
    } catch (err) {
      setShowAppError('Error submitting application: ' + err.message);
    } finally {
      setIsSubmittingApp(false);
    }
  };

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
      <header className={`flex flex-col gap-3 px-4 sm:px-6 py-3 border-b border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md sticky top-0 z-40 transition-transform duration-300 ease-in-out ${showHeader ? 'translate-y-0' : '-translate-y-full'}`}>
        {/* Top: Nav Links */}
        <nav className="flex flex-wrap items-center justify-start gap-3 sm:gap-6 w-full pb-1">
          {mounted && (
            <button 
              onClick={() => {
                const currentTheme = theme === 'system' ? systemTheme : theme;
                setTheme(currentTheme === 'dark' ? 'light' : 'dark');
              }}
              className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-all shrink-0"
              title="Toggle Theme"
            >
              {theme === 'dark' || (theme === 'system' && systemTheme === 'dark') ? <Sun size={16} /> : <Moon size={16} />}
            </button>
          )}
          <button 
            id="header-btn-jobs"
            onClick={() => setShowJobsModal(true)}
            className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-gray-500 dark:text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-all shrink-0"
          >
            <Briefcase size={16} />
            Jobs
          </button>
          <button 
            id="header-btn-network"
            onClick={() => setShowNetworkModal(true)}
            className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-all shrink-0"
          >
            <Users size={16} />
            My Network
          </button>
          <button 
            id="header-btn-discuss"
            onClick={() => setShowQuickView('discuss')}
            className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-all shrink-0"
          >
            <MessageCircle size={16} />
            Discuss
          </button>
          <button 
            id="header-btn-discover"
            onClick={() => setShowQuickView('discover')}
            className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-all shrink-0"
          >
            <Compass size={16} />
            Discover
          </button>
          <button 
            onClick={() => setIsMobileSearchOpen(!isMobileSearchOpen)}
            className="sm:hidden flex items-center gap-2 text-xs font-black uppercase tracking-widest text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-all shrink-0"
          >
            <Search size={16} />
            Search
          </button>
        </nav>

        {/* Bottom: Search Bar */}
        <div className={`relative transition-all duration-300 ease-in-out w-full sm:w-1/2 lg:w-1/3 sm:focus-within:w-full lg:focus-within:w-full ${isMobileSearchOpen ? 'block animate-in slide-in-from-top-2 fade-in duration-200' : 'hidden sm:block'}`} ref={searchRef}>
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Search size={16} className="text-gray-900 dark:text-gray-100" />
          </div>
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onKeyDown={handleSearchKeyDown}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="block w-full pl-10 pr-12 py-2.5 border border-gray-300 dark:border-gray-700 rounded-2xl bg-white dark:bg-gray-900 focus:bg-gray-50 dark:focus:bg-gray-800 text-xs text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            placeholder="Search the BeOneOfUs ecosystem..."
          />
          {!searchQuery && keyboardShortcut && (
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
              <kbd className="hidden sm:inline-flex items-center gap-1 rounded-md border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 font-mono text-[10px] font-bold text-gray-500 dark:text-gray-400 shadow-sm">
                {keyboardShortcut}
              </kbd>
            </div>
          )}
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 dark:text-gray-500 hover:text-gray-900 dark:hover:text-gray-100 transition-colors">
              <X size={14} />
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
              ) : (searchResults.posts.length === 0 && searchResults.groups.length === 0 && searchResults.users.length === 0) ? (
                <div 
                  onClick={() => { setSearchQuery(''); setIsMobileSearchOpen(false); handleNavigate('feed'); }}
                  className="p-6 text-center cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-all group"
                >
                  <div className="w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-500 mx-auto flex items-center justify-center mb-3">
                    <MessageCircle size={20} className="group-hover:scale-110 transition-transform" />
                  </div>
                  <p className="text-sm font-bold text-gray-900 dark:text-gray-100 mb-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">Nothing found for &quot;{searchQuery}&quot;</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Press <kbd className="mx-1 px-1.5 py-0.5 rounded-md border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 font-mono text-[10px] font-bold text-gray-500 dark:text-gray-400">Enter</kbd> to ask the community</p>
                </div>
              ) : (
                <div className="max-h-[60vh] overflow-y-auto custom-scrollbar">
                  {/* Posts Results */}
                  {searchResults.posts.length > 0 && (
                    <div className="p-2">
                      <div className="text-[9px] font-black uppercase text-gray-500 dark:text-gray-400 tracking-[2px] px-2 mb-1.5 mt-1">Discussions</div>
                  {searchResults.posts.map((post, i) => (
                    <div key={`post-${post.id}`} onClick={() => { setSearchQuery(''); handleNavigate('feed'); }} onMouseEnter={() => setFocusedIndex(i)} className={`p-2 hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded-xl cursor-pointer transition-all group ${focusedIndex === i ? 'bg-gray-50 dark:bg-gray-800/50' : ''}`}>
                          <p className="text-sm font-bold text-gray-900 dark:text-gray-100 line-clamp-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors"><HighlightMatch text={post.title || 'Untitled Node'} query={searchQuery} /></p>
                          <p className="text-[10px] text-gray-500 dark:text-gray-400 line-clamp-1 mt-0.5"><HighlightMatch text={post.content} query={searchQuery} /></p>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {/* Groups Results */}
                  {searchResults.groups.length > 0 && (
                    <div className={`p-2 ${searchResults.posts.length > 0 ? 'border-t border-gray-100 dark:border-gray-800' : ''}`}>
                      <div className="text-[9px] font-black uppercase text-gray-500 dark:text-gray-400 tracking-[2px] px-2 mb-1.5 mt-1">Groups</div>
                  {searchResults.groups.map((group, i) => (
                    <div key={`group-${group.id}`} onClick={() => { setSearchQuery(''); handleNavigate('groups'); }} onMouseEnter={() => setFocusedIndex(searchResults.posts.length + i)} className={`p-2 hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded-xl cursor-pointer transition-all group ${focusedIndex === searchResults.posts.length + i ? 'bg-gray-50 dark:bg-gray-800/50' : ''}`}>
                          <p className="text-sm font-bold text-gray-900 dark:text-gray-100 line-clamp-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors"><HighlightMatch text={group.name} query={searchQuery} /></p>
                          <p className="text-[10px] text-gray-500 dark:text-gray-400 line-clamp-1 mt-0.5"><HighlightMatch text={group.description} query={searchQuery} /></p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Users Results */}
                  {searchResults.users.length > 0 && (
                    <div className={`p-2 ${(searchResults.posts.length > 0 || searchResults.groups.length > 0) ? 'border-t border-gray-100 dark:border-gray-800' : ''}`}>
                      <div className="text-[9px] font-black uppercase text-gray-500 dark:text-gray-400 tracking-[2px] px-2 mb-1.5 mt-1">Users</div>
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
                </div>
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

      {/* --- MY NETWORK MODAL --- */}
      {showNetworkModal && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-gray-900/50 dark:bg-black/60 backdrop-blur-sm" onClick={() => setShowNetworkModal(false)} />
          <div className="relative w-full max-w-md bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl shadow-2xl flex flex-col max-h-[70vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="p-6 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 flex justify-between items-center shrink-0">
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">My Network</h2>
              <button onClick={() => setShowNetworkModal(false)} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full text-gray-500 dark:text-gray-400 transition-colors">
                <X size={20} />
              </button>
            </div>
            {/* Tabs */}
            <div className="flex gap-4 border-b border-gray-200 dark:border-gray-800 px-6 shrink-0">
              <button 
                onClick={() => setNetworkTab('connections')}
                className={`py-3 text-sm font-bold flex items-center gap-2 transition-all ${networkTab === 'connections' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 border-b-2 border-transparent'}`}
              >
                <Users size={14} /> Connections ({networkData.connections.length})
              </button>
              <button 
                onClick={() => setNetworkTab('groups')}
                className={`py-3 text-sm font-bold flex items-center gap-2 transition-all ${networkTab === 'groups' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 border-b-2 border-transparent'}`}
              >
                <Hash size={14} /> Channels ({networkData.groups.length})
              </button>
            </div>
            {/* Content */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
              {isNetworkLoading ? (
                <div className="space-y-3 p-4">
                  {[1, 2, 3, 4, 5].map(i => (
                    <div key={i} className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse shrink-0"></div>
                      <div className="space-y-2 flex-1">
                        <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded animate-pulse w-1/3"></div>
                        <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded animate-pulse w-1/2"></div>
                      </div>
                    </div>
                  ))}
                </div>
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
                          className="flex items-center gap-3 p-2 hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded-xl cursor-pointer transition-all group">
                            <div className="relative w-8 h-8 rounded-xl bg-gray-100 dark:bg-gray-800 overflow-hidden shrink-0 border border-gray-200 dark:border-gray-700 flex items-center justify-center text-xs font-bold text-gray-600 dark:text-gray-400 uppercase">
                              {user.avatar_url ? <Image src={user.avatar_url} alt="avatar" fill sizes="32px" className="object-cover" /> : (user.username?.substring(0, 2) || '??')}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-bold text-gray-900 dark:text-gray-100 line-clamp-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors flex items-center gap-1">
                                @{user.username}
                                {user.is_verified && <VerifiedBadge size={14} />}
                                {user.work_status && user.work_status !== 'None' && (
                                  <span className={`ml-1 px-1.5 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest border ${user.work_status === 'Hiring' ? 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-800/50' : 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/50'}`}>
                                    {user.work_status}
                                  </span>
                                )}
                              </p>
                              <p className="text-[10px] text-gray-500 dark:text-gray-400 line-clamp-1 mt-0.5 uppercase tracking-widest font-black">{user.status || 'Active'}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center text-xs text-gray-500 dark:text-gray-400 font-medium p-10">No active connections.</div>
                    )
                  )}
                  {networkTab === 'groups' && (
                    networkData.groups.length > 0 ? (
                      <div className="space-y-1 p-2">
                        {networkData.groups.map(group => (
                          <div key={`net-group-${group.id}`} onClick={() => handleNavigate('groups')} className="flex items-center gap-3 p-2 hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded-xl cursor-pointer transition-all group">
                            <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center shrink-0">
                              <Hash size={16} />
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-bold text-gray-900 dark:text-gray-100 line-clamp-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{group.name}</p>
                              <p className="text-[10px] text-gray-500 dark:text-gray-400 line-clamp-1 mt-0.5">{group.description || (group.is_private ? 'Private Channel' : 'Public Channel')}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center text-xs text-gray-500 dark:text-gray-400 font-medium p-10">You are not a member of any channels.</div>
                    )
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      , document.body)}

      {/* --- JOBS MODAL --- */}
      {showJobsModal && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-gray-900/50 dark:bg-black/60 backdrop-blur-sm" onClick={() => setShowJobsModal(false)} />
          <div className="relative w-full max-w-3xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-[2rem] shadow-2xl flex flex-col max-h-[85vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="p-6 sm:p-8 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 flex justify-between items-start shrink-0">
              <div>
                <h2 className="text-2xl font-black text-gray-900 dark:text-gray-100 tracking-tight">Job Opportunities</h2>
                <p className="text-xs text-gray-500 dark:text-gray-400 font-bold uppercase tracking-[2px] mt-2">Discover your next professional milestone</p>
              </div>
              <button onClick={() => setShowJobsModal(false)} className="p-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full text-gray-500 dark:text-gray-400 transition-colors shadow-sm">
                <X size={18} />
              </button>
            </div>
            
            {/* Search Bar */}
            <div className="p-6 border-b border-gray-100 dark:border-gray-800 shrink-0">
               <div className="relative group transition-all duration-300 ease-in-out w-full sm:w-2/3 lg:w-1/2 sm:focus-within:w-full lg:focus-within:w-full">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Search size={18} className="text-gray-900 dark:text-gray-100 group-focus-within:text-blue-500 transition-colors" />
                  </div>
                  <input 
                    type="text" 
                    placeholder="Search by role, tech stack, or company..." 
                    value={jobSearchQuery}
                    onChange={(e) => setJobSearchQuery(e.target.value)}
                    className="w-full bg-white dark:bg-gray-900 focus:bg-gray-50 dark:focus:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100 text-sm rounded-2xl pl-12 pr-12 py-3.5 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all shadow-sm"
                  />
                  {jobSearchQuery && (
                    <button onClick={() => setJobSearchQuery('')} className="absolute inset-y-0 right-0 pr-5 flex items-center text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors">
                      <X size={18} />
                    </button>
                  )}
               </div>
            </div>

            {/* Jobs List */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 bg-gray-50/50 dark:bg-gray-900/50">
               <div className="space-y-4">
                 {isJobsLoading ? (
                   <div className="flex justify-center py-12">
                     <Loader2 size={32} className="animate-spin text-blue-500" />
                   </div>
                 ) : (
                   <>
                     {filteredJobs.map(job => (
                    <div key={job.id} className="p-6 border border-gray-200 dark:border-gray-800 rounded-[1.5rem] hover:border-blue-500/40 dark:hover:border-blue-500/40 hover:shadow-lg transition-all bg-white dark:bg-gray-900 group">
                       <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-4">
                         <div className="flex-1 min-w-0 pr-3">
                           <h3 className="text-lg font-black text-gray-900 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate">{job.title}</h3>
                           <p className="text-sm font-bold text-gray-600 dark:text-gray-400 mt-1 truncate">{job.company}</p>
                         </div>
                         <div className="flex items-center gap-2 shrink-0">
                           <span className="bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg border border-emerald-200 dark:border-emerald-800/50">
                             {job.type}
                           </span>
                           {job.featured && (
                              <span className="bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg border border-amber-200 dark:border-amber-800/50">
                                Featured
                              </span>
                           )}
                         </div>
                       </div>
                       
                       <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-gray-500 dark:text-gray-400 mb-5">
                         <div className="flex items-center gap-1.5">
                           <MapPin size={14} /> {job.location}
                         </div>
                         <div className="flex items-center gap-1.5">
                           <DollarSign size={14} /> {job.salary}
                         </div>
                         {job.experience_level && (
                           <div className="flex items-center gap-1.5">
                             <User size={14} /> {job.experience_level}
                           </div>
                         )}
                       </div>

                       <div className="flex flex-wrap gap-2 mb-6">
                         {job.tags.map(tag => (
                            <span key={tag} className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 px-3 py-1.5 rounded-lg font-bold border border-transparent group-hover:border-gray-200 dark:group-hover:border-gray-700 transition-colors">{tag}</span>
                         ))}
                       </div>
                       
                       <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-gray-800">
                         <span className="text-xs text-gray-400 dark:text-gray-500 font-medium">Posted {job.postedAt}</span>
                         <button 
                           onClick={() => setApplyingJob(job)}
                           className="bg-gray-900 dark:bg-gray-100 hover:bg-blue-600 dark:hover:bg-blue-500 text-white dark:text-gray-900 dark:hover:text-white text-xs font-bold px-5 py-2.5 rounded-xl transition-all shadow-sm active:scale-95"
                         >
                           Apply Now
                         </button>
                       </div>
                    </div>
                 ))}
                     {filteredJobs.length === 0 && (
                   <div className="text-center py-12">
                     <Briefcase size={40} className="mx-auto text-gray-300 dark:text-gray-700 mb-4" />
                     <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">No jobs found</h3>
                     <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Try adjusting your search query to find more opportunities.</p>
                   </div>
                     )}
                   </>
                 )}
               </div>
            </div>
          </div>
        </div>
      , document.body)}

      {/* --- JOB APPLICATION MODAL --- */}
      {applyingJob && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-gray-900/50 dark:bg-black/60 backdrop-blur-sm" onClick={() => setApplyingJob(null)} />
          <div className="relative w-full max-w-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-[2rem] shadow-2xl p-6 sm:p-8 animate-in fade-in zoom-in-95 duration-200">
            <button onClick={() => setApplyingJob(null)} className="absolute top-6 right-6 p-2 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full text-gray-500 dark:text-gray-400 transition-colors shadow-sm">
              <X size={18} />
            </button>
            <h2 className="text-2xl font-black text-gray-900 dark:text-gray-100 pr-10 tracking-tight">Apply for {applyingJob.title}</h2>
            <p className="text-sm font-bold text-blue-600 dark:text-blue-400 mb-6 mt-1">{applyingJob.company} • {applyingJob.location}</p>
            
            <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600 dark:text-gray-300 font-medium mb-6">
              <span className="flex items-center gap-1.5 bg-gray-50 dark:bg-gray-800 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700"><Briefcase size={16}/> {applyingJob.type}</span>
              {applyingJob.experience_level && <span className="flex items-center gap-1.5 bg-gray-50 dark:bg-gray-800 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700"><User size={16}/> {applyingJob.experience_level}</span>}
              {applyingJob.salary && <span className="flex items-center gap-1.5 bg-gray-50 dark:bg-gray-800 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700"><DollarSign size={16}/> {applyingJob.salary}</span>}
            </div>

            {applyingJob.description && (
              <div className="mb-6">
                <p className="text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-2 block pl-1">Description</p>
                <div className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap max-h-48 overflow-y-auto custom-scrollbar p-1">
                  {applyingJob.description}
                </div>
              </div>
            )}

            <form onSubmit={handleApplyJob} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5 uppercase tracking-wide">Upload Resume (PDF/DOC)</label>
                <input type="file" accept=".pdf,.doc,.docx" onChange={(e) => setResumeFile(e.target.files[0])} className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-sm focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all text-gray-900 dark:text-gray-100 shadow-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-blue-50 dark:file:bg-blue-900/20 file:text-blue-700 dark:file:text-blue-400 hover:file:bg-blue-100 dark:hover:file:bg-blue-900/40 cursor-pointer" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5 uppercase tracking-wide">Portfolio Link (Optional)</label>
                <input type="url" value={portfolioUrl} onChange={(e) => setPortfolioUrl(e.target.value)} placeholder="https://your-portfolio.com" className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3.5 text-sm focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all text-gray-900 dark:text-gray-100 shadow-sm" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5 uppercase tracking-wide">Cover Letter (Optional)</label>
                <textarea value={coverLetter} onChange={(e) => setCoverLetter(e.target.value)} placeholder="Why are you a great fit for this role?" rows={4} className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3.5 text-sm focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none resize-none transition-all text-gray-900 dark:text-gray-100 shadow-sm"></textarea>
              </div>
              
              <div className="pt-4 flex flex-col sm:flex-row gap-3">
                {(applyingJob.external_url || applyingJob.externalUrl) && (
                  <button 
                    type="button" 
                    onClick={() => {
                      window.open(applyingJob.external_url || applyingJob.externalUrl, '_blank', 'noopener,noreferrer');
                      if (currentUserId) {
                        supabase.from('job_applications').insert({
                          job_id: applyingJob.id,
                          user_id: currentUserId,
                          status: 'external_redirect'
                        }).then(({ error }) => { if (error) console.error('Error logging external application:', error); });
                      }
                    }} 
                    className="py-3.5 px-5 bg-transparent border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 font-bold rounded-xl transition-colors text-sm text-center shadow-sm"
                  >
                    External Apply
                  </button>
                )}
                <button type="submit" disabled={isSubmittingApp} className="flex-1 flex justify-center items-center py-3.5 px-5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-blue-500/20 text-sm active:scale-95 disabled:opacity-50">
                  {isSubmittingApp ? <Loader2 size={16} className="animate-spin" /> : "Submit Quick Apply"}
                </button>
              </div>
            </form>
          </div>
        </div>
      , document.body)}

      {/* --- APPLICATION SUCCESS MODAL --- */}
      {showAppSuccess && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-gray-900/50 dark:bg-black/60 backdrop-blur-sm" onClick={() => setShowAppSuccess(false)} />
          <div className="bg-white dark:bg-gray-900 border border-green-200 dark:border-green-900/50 w-full max-w-sm rounded-2xl p-8 shadow-xl text-center relative z-10 animate-in fade-in zoom-in duration-300">
            <div className="w-20 h-20 bg-green-500/10 text-green-500 rounded-full flex items-center justify-center mx-auto mb-6 border border-green-500/20">
              <CheckCircle2 size={40} className="animate-bounce" />
            </div>
            <h3 className="text-2xl font-black text-gray-900 dark:text-gray-100 mb-2 tracking-tight">Application Sent!</h3>
            <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed mb-6">
              Your application has been successfully submitted to the poster.
            </p>
            <button 
              onClick={() => setShowAppSuccess(false)}
              className="w-full bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-bold py-3 rounded-xl transition-all border border-gray-200 dark:border-gray-700"
            >
              Dismiss
            </button>
          </div>
        </div>
      , document.body)}

      {/* --- APPLICATION ERROR MODAL --- */}
      {showAppError && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-gray-900/50 dark:bg-black/60 backdrop-blur-sm" onClick={() => setShowAppError(null)} />
          <div className="bg-white dark:bg-gray-900 border border-red-200 dark:border-red-900/50 w-full max-w-sm rounded-2xl p-8 shadow-xl text-center relative z-10 animate-in fade-in zoom-in duration-300">
            <div className="w-20 h-20 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6 border border-red-500/20">
              <AlertTriangle size={40} className="animate-pulse" />
            </div>
            <h3 className="text-2xl font-black text-gray-900 dark:text-gray-100 mb-2 tracking-tight">Application Issue</h3>
            <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed mb-6">
              {showAppError}
            </p>
            <button 
              onClick={() => setShowAppError(null)}
              className="w-full bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-bold py-3 rounded-xl transition-all border border-gray-200 dark:border-gray-700"
            >
              Dismiss
            </button>
          </div>
        </div>
      , document.body)}

      {/* USER PROFILE MODAL */}
      {selectedUserId && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-gray-900/50 dark:bg-black/60 backdrop-blur-sm" onClick={() => setSelectedUserId(null)} />
          <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto no-scrollbar z-10 bg-white dark:bg-gray-900 rounded-[2rem] border border-gray-200 dark:border-gray-800 shadow-2xl animate-in zoom-in-95 duration-200">
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
        </div>
      , document.body)}
    </>
  );
}