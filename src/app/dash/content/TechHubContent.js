'use client';

import Image from 'next/image';
import { useState, useEffect, useCallback } from 'react';
import {
  Globe2, CalendarDays, MessageSquare, Plus, Search, Loader2,
  Heart, ChevronRight, ArrowLeft, MapPin, Users, Clock, Tag,
  Zap, Rocket, Trophy, X, ExternalLink, RefreshCw, AlertCircle, Flame,
} from 'lucide-react';
import { supabase } from '../../supabaseClient';

const TABS = [
  { id: 'discussions', label: 'Discussions', icon: MessageSquare },
  { id: 'events', label: 'Events', icon: CalendarDays },
  { id: 'hackathons', label: 'Hackathons', icon: Trophy },
];
const DISCUSSION_TAGS = ['General', 'JavaScript', 'Python', 'React', 'AI/ML', 'Career', 'DevOps', 'Mobile', 'Security', 'Open Source', 'Mauritius', 'Web3'];

function PostCard({ post, userId, onLike, onSelect }) {
  const profile = post.profiles;
  const isLiked = post.user_liked;
  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5 hover:border-blue-400/50 dark:hover:border-blue-600/50 transition-all">
      <div className="flex items-start gap-3 mb-3">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-violet-500 flex items-center justify-center text-white text-xs font-black shrink-0">
          {profile?.avatar_url ? <Image src={profile.avatar_url} alt="" width={32} height={32} unoptimized className="w-8 h-8 rounded-full object-cover" /> : (profile?.full_name?.[0] || profile?.username?.[0] || '?')}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-gray-900 dark:text-gray-100">{profile?.full_name || profile?.username}</p>
          <p className="text-[10px] text-gray-400 dark:text-gray-500">{new Date(post.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
        </div>
      </div>
      {post.title && (
        <h3 className="font-black text-gray-900 dark:text-gray-100 text-sm mb-1.5 leading-snug">{post.title}</h3>
      )}
      {post.content && (
        <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed mb-3 line-clamp-3">{post.content}</p>
      )}
      {post.tags?.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {post.tags.map(t => (
            <span key={t} className="text-[10px] font-bold px-2 py-0.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800/50 rounded-md">{t}</span>
          ))}
        </div>
      )}
      <div className="flex items-center gap-3 pt-3 border-t border-gray-100 dark:border-gray-800">
        <button
          onClick={() => onLike(post)}
          className={`flex items-center gap-1.5 text-xs font-bold transition-all ${isLiked ? 'text-red-500 dark:text-red-400' : 'text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400'}`}
        >
          <Heart size={14} fill={isLiked ? 'currentColor' : 'none'} /> {post.likes_count || 0}
        </button>
        <button onClick={() => onSelect(post)} className="flex items-center gap-1.5 text-xs font-bold text-gray-400 dark:text-gray-500 hover:text-blue-500 dark:hover:text-blue-400 transition-all">
          <MessageSquare size={14} /> {post.comments_count || 0}
        </button>
        <div className="ml-auto">
          <button onClick={() => onSelect(post)} className="text-xs font-bold text-gray-400 dark:text-gray-500 hover:text-blue-500 dark:hover:text-blue-400 transition-all flex items-center gap-1">
            Read <ChevronRight size={12} />
          </button>
        </div>
      </div>
    </div>
  );
}

function EventCard({ event, onRegister, userId }) {
  const isPast = new Date(event.event_date) < new Date();
  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden hover:border-blue-400/50 dark:hover:border-blue-600/50 transition-all">
      <div className="relative h-16 bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center px-5">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '12px 12px' }} />
        <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-lg ${isPast ? 'bg-gray-700/50 text-gray-300' : event.is_online ? 'bg-blue-500/30 text-blue-100 border border-blue-400/40' : 'bg-emerald-500/30 text-emerald-100 border border-emerald-400/40'}`}>
          {isPast ? 'Past' : event.is_online ? '🌐 Online' : '📍 In-Person'}
        </span>
      </div>
      <div className="p-5">
        <h3 className="font-black text-gray-900 dark:text-gray-100 text-sm mb-1 leading-tight">{event.title}</h3>
        {event.description && <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed mb-3 line-clamp-2">{event.description}</p>}
        <div className="flex flex-wrap gap-2 text-[10px] text-gray-400 dark:text-gray-500 mb-3">
          <span className="flex items-center gap-1"><CalendarDays size={11} />{new Date(event.event_date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
          {event.location && <span className="flex items-center gap-1"><MapPin size={11} />{event.location}</span>}
          {event.max_attendees && <span className="flex items-center gap-1"><Users size={11} />Max {event.max_attendees}</span>}
        </div>
        {!isPast && (
          event.event_url ? (
            <a href={event.event_url} target="_blank" rel="noopener noreferrer" className="block w-full py-2 text-center text-xs font-black text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/50 rounded-xl hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-all">
              Register <ExternalLink size={11} className="inline ml-1" />
            </a>
          ) : (
            <button onClick={() => onRegister(event)} className="w-full py-2 text-xs font-black text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/50 rounded-xl hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-all">
              Register Interest
            </button>
          )
        )}
      </div>
    </div>
  );
}

function CreatePostModal({ session, onClose, onCreated }) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [selectedTags, setSelectedTags] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const toggleTag = (tag) => setSelectedTags(p => p.includes(tag) ? p.filter(t => t !== tag) : [...p, tag]);

  const handleSubmit = async () => {
    if (!content.trim()) { setError('Content is required'); return; }
    setSaving(true);
    setError('');
    try {
      const { data, error: e } = await supabase.from('posts').insert({
        user_id: session.user.id,
        title: title.trim() || null,
        content: content.trim(),
        tags: [...selectedTags, 'tech-hub'],
        visibility: 'public',
      }).select().single();
      if (e) throw new Error(e.message);
      onCreated(data);
      onClose();
    } catch (err) { setError(err.message); } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 rounded-3xl w-full max-w-lg max-h-[85vh] overflow-y-auto shadow-2xl border border-gray-200 dark:border-gray-700 animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-300">
        <div className="sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 px-5 py-4 flex items-center justify-between rounded-t-3xl z-10">
          <h3 className="font-black text-gray-900 dark:text-gray-100">Start a Discussion</h3>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"><X size={16} className="text-gray-500" /></button>
        </div>
        <div className="p-5 space-y-4">
          <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="Title (optional)" className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" />
          <textarea value={content} onChange={e => setContent(e.target.value)} placeholder="Share your thoughts, ask a question, or start a debate..." rows={5} className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none transition-all" />
          <div>
            <p className="text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-2">Tags</p>
            <div className="flex flex-wrap gap-1.5">
              {DISCUSSION_TAGS.map(t => (
                <button key={t} onClick={() => toggleTag(t)} className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border transition-all ${selectedTags.includes(t) ? 'bg-blue-600 text-white border-blue-600' : 'bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-blue-400'}`}>{t}</button>
              ))}
            </div>
          </div>
          {error && <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800/50 rounded-xl"><AlertCircle size={14} className="text-red-500 shrink-0 mt-0.5" /><p className="text-xs text-red-700 dark:text-red-400">{error}</p></div>}
          <button onClick={handleSubmit} disabled={saving || !content.trim()} className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-black rounded-xl transition-all flex items-center justify-center gap-2 text-sm active:scale-95">
            {saving ? <Loader2 size={15} className="animate-spin" /> : <Zap size={15} />}
            {saving ? 'Posting…' : 'Post Discussion'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function TechHubContent() {
  const [session, setSession] = useState(null);
  const [activeTab, setActiveTab] = useState('discussions');
  const [posts, setPosts] = useState([]);
  const [events, setEvents] = useState([]);
  const [hackathons, setHackathons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedPost, setSelectedPost] = useState(null);
  const [postComments, setPostComments] = useState([]);
  const [commentText, setCommentText] = useState('');
  const [commenting, setCommenting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async (uid) => {
    if (activeTab === 'discussions') {
      const { data } = await supabase
        .from('posts')
        .select(`*, profiles!posts_user_id_fkey(username, full_name, avatar_url, is_verified)`)
        .contains('tags', ['tech-hub'])
        .eq('visibility', 'public')
        .order('created_at', { ascending: false })
        .limit(30);
      if (data) {
        let enriched = data;
        if (uid) {
          const { data: likes } = await supabase.from('likes').select('post_id').eq('user_id', uid).in('post_id', data.map(p => p.id));
          const likedSet = new Set((likes || []).map(l => l.post_id));
          enriched = data.map(p => ({ ...p, user_liked: likedSet.has(p.id) }));
        }
        setPosts(enriched);
      }
    } else if (activeTab === 'events') {
      const { data } = await supabase.from('events').select('*').gte('event_date', new Date(Date.now() - 7 * 86400000).toISOString()).order('event_date', { ascending: true }).limit(20);
      setEvents(data || []);
    } else if (activeTab === 'hackathons') {
      const { data } = await supabase.from('posts').select(`*, profiles!posts_user_id_fkey(username, full_name, avatar_url)`).contains('tags', ['hackathon']).eq('visibility', 'public').order('created_at', { ascending: false }).limit(20);
      setHackathons(data || []);
    }
    setLoading(false);
    setRefreshing(false);
  }, [activeTab]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => { setSession(session); fetchData(session?.user?.id); });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, s) => setSession(s));
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => { (async () => { setLoading(true); await fetchData(session?.user?.id); })(); }, [activeTab]);

  const handleLike = async (post) => {
    if (!session) return;
    const liked = post.user_liked;
    if (liked) {
      await supabase.from('likes').delete().eq('post_id', post.id).eq('user_id', session.user.id);
      await supabase.from('posts').update({ likes_count: Math.max(0, (post.likes_count || 0) - 1) }).eq('id', post.id);
    } else {
      await supabase.from('likes').insert({ post_id: post.id, user_id: session.user.id });
      await supabase.from('posts').update({ likes_count: (post.likes_count || 0) + 1 }).eq('id', post.id);
    }
    setPosts(prev => prev.map(p => p.id === post.id ? { ...p, user_liked: !liked, likes_count: (p.likes_count || 0) + (liked ? -1 : 1) } : p));
  };

  const openPost = async (post) => {
    setSelectedPost(post);
    const { data } = await supabase.from('comments').select(`*, profiles!comments_user_id_fkey(username, full_name, avatar_url)`).eq('post_id', post.id).order('created_at', { ascending: true });
    setPostComments(data || []);
  };

  const addComment = async () => {
    if (!session || !commentText.trim() || !selectedPost) return;
    setCommenting(true);
    const { data } = await supabase.from('comments').insert({ post_id: selectedPost.id, user_id: session.user.id, content: commentText.trim() }).select(`*, profiles!comments_user_id_fkey(username, full_name, avatar_url)`).single();
    if (data) { setPostComments(p => [...p, data]); setCommentText(''); }
    setCommenting(false);
  };

  if (selectedPost) {
    return (
      <div className="max-w-2xl mx-auto w-full space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
        <button onClick={() => setSelectedPost(null)} className="flex items-center gap-2 text-sm font-bold text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors">
          <ArrowLeft size={14} /> Back to Hub
        </button>
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6">
          {selectedPost.title && <h2 className="font-black text-gray-900 dark:text-gray-100 text-xl mb-3 leading-tight">{selectedPost.title}</h2>}
          <div className="flex items-center gap-2 mb-4">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-400 to-violet-500 flex items-center justify-center text-white text-[10px] font-black">
              {selectedPost.profiles?.full_name?.[0] || selectedPost.profiles?.username?.[0] || '?'}
            </div>
            <p className="text-sm font-bold text-gray-900 dark:text-gray-100">{selectedPost.profiles?.full_name || selectedPost.profiles?.username}</p>
            <span className="text-xs text-gray-400 dark:text-gray-500">· {new Date(selectedPost.created_at).toLocaleDateString()}</span>
          </div>
          <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">{selectedPost.content}</p>
          {selectedPost.tags?.filter(t => t !== 'tech-hub').length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-4">
              {selectedPost.tags.filter(t => t !== 'tech-hub').map(t => (
                <span key={t} className="text-[10px] font-bold px-2 py-0.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800/50 rounded-md">{t}</span>
              ))}
            </div>
          )}
        </div>

        {/* Comments */}
        <div>
          <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3">{postComments.length} Comments</p>
          {postComments.length > 0 && (
            <div className="space-y-3 mb-4">
              {postComments.map(c => (
                <div key={c.id} className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-gray-300 to-gray-400 flex items-center justify-center text-white text-[10px] font-black shrink-0">
                    {c.profiles?.full_name?.[0] || c.profiles?.username?.[0] || '?'}
                  </div>
                  <div className="flex-1 bg-gray-50 dark:bg-gray-800 rounded-xl p-3">
                    <p className="text-xs font-bold text-gray-900 dark:text-gray-100 mb-1">{c.profiles?.full_name || c.profiles?.username}</p>
                    <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed">{c.content}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
          {session ? (
            <div className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-white text-[10px] font-black shrink-0">
                {session.user.email?.[0]?.toUpperCase() || '?'}
              </div>
              <div className="flex-1 flex gap-2">
                <input value={commentText} onChange={e => setCommentText(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) addComment(); }} placeholder="Add a comment..." className="flex-1 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" />
                <button onClick={addComment} disabled={commenting || !commentText.trim()} className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-bold rounded-xl transition-all">
                  {commenting ? <Loader2 size={14} className="animate-spin" /> : 'Post'}
                </button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-500 dark:text-gray-400"><button onClick={() => window.location.href = '/auth'} className="text-blue-600 dark:text-blue-400 font-bold hover:underline">Sign in</button> to comment.</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto w-full space-y-5">
      {showCreate && session && <CreatePostModal session={session} onClose={() => setShowCreate(false)} onCreated={p => { setPosts(prev => [{ ...p, profiles: { username: session.user.email?.split('@')[0] }, user_liked: false }, ...prev]); }} />}

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-gray-100 tracking-tighter">Tech Mauritius Hub</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-0.5 font-medium">Discussions, events, and hackathons for the tech community.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => { setRefreshing(true); fetchData(session?.user?.id); }} className="p-2 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 transition-colors"><RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} /></button>
          {session && activeTab === 'discussions' && (
            <button onClick={() => setShowCreate(true)} className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-black px-4 py-2.5 rounded-xl transition-all active:scale-95 shadow-sm shadow-blue-500/20"><Plus size={15} /> Post</button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl">
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex-1 py-2 text-xs font-black rounded-lg transition-all flex items-center justify-center gap-1.5 ${activeTab === tab.id ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}`}>
            <tab.icon size={12} /> {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-4">{[1,2,3].map(i => <div key={i} className="h-40 bg-gray-100 dark:bg-gray-800 rounded-2xl animate-pulse" />)}</div>
      ) : activeTab === 'discussions' ? (
        posts.length ? (
          <div className="space-y-4">{posts.map(p => <PostCard key={p.id} post={p} userId={session?.user?.id} onLike={handleLike} onSelect={openPost} />)}</div>
        ) : (
          <div className="text-center py-20">
            <MessageSquare size={40} className="mx-auto text-gray-300 dark:text-gray-700 mb-3" />
            <h3 className="font-bold text-gray-900 dark:text-gray-100">No discussions yet</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Start the first conversation in the Mauritius Tech Hub.</p>
            {session && <button onClick={() => setShowCreate(true)} className="mt-4 bg-blue-600 hover:bg-blue-500 text-white font-bold py-2.5 px-6 rounded-xl transition-all text-sm">Start Discussion</button>}
          </div>
        )
      ) : activeTab === 'events' ? (
        events.length ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{events.map(e => <EventCard key={e.id} event={e} userId={session?.user?.id} onRegister={() => {}} />)}</div>
        ) : (
          <div className="text-center py-20">
            <CalendarDays size={40} className="mx-auto text-gray-300 dark:text-gray-700 mb-3" />
            <h3 className="font-bold text-gray-900 dark:text-gray-100">No upcoming events</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Check back soon for tech meetups and conferences.</p>
          </div>
        )
      ) : (
        hackathons.length ? (
          <div className="space-y-4">{hackathons.map(h => <PostCard key={h.id} post={h} userId={session?.user?.id} onLike={handleLike} onSelect={openPost} />)}</div>
        ) : (
          <div className="text-center py-20">
            <Trophy size={40} className="mx-auto text-gray-300 dark:text-gray-700 mb-3" />
            <h3 className="font-bold text-gray-900 dark:text-gray-100">No hackathons listed</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Post about an upcoming hackathon with the #hackathon tag.</p>
            {session && <button onClick={() => setShowCreate(true)} className="mt-4 bg-blue-600 hover:bg-blue-500 text-white font-bold py-2.5 px-6 rounded-xl transition-all text-sm">Post Hackathon</button>}
          </div>
        )
      )}
    </div>
  );
}
