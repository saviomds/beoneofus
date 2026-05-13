"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { supabase } from "../../supabaseClient";
import ReactMarkdown from "react-markdown";
import {
  Terminal, Heart, MessageSquare, Eye, Clock, ArrowLeft,
  Send, Loader2, Trash2, User, Copy, Check, Share2, Tag,
  ChevronRight, AlertTriangle, X,
} from "lucide-react";

function timeAgo(ts) {
  const s = Math.floor((Date.now() - new Date(ts)) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 2592000) return `${Math.floor(s / 86400)}d ago`;
  return new Date(ts).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

const TAG_COLORS = [
  "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800/40",
  "bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400 border-violet-200 dark:border-violet-800/40",
  "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/40",
  "bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800/40",
  "bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-800/40",
];
function tagColor(tag) { let h = 0; for (const c of tag) h = (h * 31 + c.charCodeAt(0)) & 0xff; return TAG_COLORS[h % TAG_COLORS.length]; }

export default function BlogPostPage() {
  const { slug } = useParams();
  const [post, setPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [likes, setLikes] = useState(0);
  const [userLiked, setUserLiked] = useState(false);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [posting, setPosting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [likeLoading, setLikeLoading] = useState(false);
  const channelRef = useRef(null);

  /* auth */
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => setSession(s));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, s) => setSession(s));
    return () => subscription?.unsubscribe();
  }, []);

  /* fetch post */
  const fetchPost = useCallback(async () => {
    const { data, error } = await supabase
      .from("blog_posts")
      .select(`
        id, title, slug, excerpt, content, cover_url, tags, views, created_at, updated_at,
        author:profiles!author_id(id, username, avatar_url, is_verified)
      `)
      .eq("slug", slug)
      .eq("published", true)
      .single();

    if (error || !data) { setNotFound(true); setLoading(false); return; }
    setPost(data);
    setLoading(false);

    /* increment view count via security-definer function (works for all readers) */
    await supabase.rpc("increment_blog_views", { post_id: data.id });
  }, [slug]);

  const fetchLikes = useCallback(async (postId) => {
    const { count } = await supabase.from("blog_likes").select("id", { count: "exact", head: true }).eq("post_id", postId);
    setLikes(count || 0);

    if (session?.user) {
      const { data } = await supabase.from("blog_likes").select("id").eq("post_id", postId).eq("user_id", session.user.id).maybeSingle();
      setUserLiked(!!data);
    }
  }, [session]);

  const fetchComments = useCallback(async (postId) => {
    const { data } = await supabase
      .from("blog_comments")
      .select("id, content, created_at, user:profiles!user_id(id, username, avatar_url)")
      .eq("post_id", postId)
      .order("created_at", { ascending: true });
    if (data) setComments(data);
  }, []);

  useEffect(() => {
    fetchPost();
  }, [fetchPost]);

  useEffect(() => {
    if (!post) return;
    fetchLikes(post.id);
    fetchComments(post.id);

    const name = `blog-post-${post.id}-${Date.now()}`;
    channelRef.current = supabase
      .channel(name)
      .on("postgres_changes", { event: "*", schema: "public", table: "blog_comments", filter: `post_id=eq.${post.id}` }, () => fetchComments(post.id))
      .on("postgres_changes", { event: "*", schema: "public", table: "blog_likes", filter: `post_id=eq.${post.id}` }, () => fetchLikes(post.id))
      .subscribe();

    return () => { if (channelRef.current) supabase.removeChannel(channelRef.current); };
  }, [post, fetchLikes, fetchComments]);

  const handleLike = async () => {
    if (!session || likeLoading) return;
    setLikeLoading(true);
    if (userLiked) {
      await supabase.from("blog_likes").delete().eq("post_id", post.id).eq("user_id", session.user.id);
    } else {
      await supabase.from("blog_likes").insert({ post_id: post.id, user_id: session.user.id });
    }
    setLikeLoading(false);
  };

  const handleComment = async (e) => {
    e.preventDefault();
    if (!session || !commentText.trim() || posting) return;
    setPosting(true);
    await supabase.from("blog_comments").insert({ post_id: post.id, user_id: session.user.id, content: commentText.trim() });
    setCommentText("");
    setPosting(false);
  };

  const handleDeleteComment = async (id) => {
    await supabase.from("blog_comments").delete().eq("id", id);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) return <LoadingSkeleton />;
  if (notFound) return <NotFoundView />;

  return (
    <div className="min-h-screen bg-[#fafafa] dark:bg-[#080c12] text-gray-900 dark:text-gray-100">
      {/* nav */}
      <nav className="fixed top-0 w-full z-50 border-b border-gray-200/80 dark:border-white/5 bg-white/80 dark:bg-[#080c12]/80 backdrop-blur-2xl">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
          <Link href="/blog" className="flex items-center gap-2 text-sm font-semibold text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
            <ArrowLeft size={16} /> Blog
          </Link>
          <Link href="/" className="flex items-center gap-1.5 shrink-0">
            <div className="w-6 h-6 bg-blue-600 rounded-md flex items-center justify-center">
              <Terminal size={12} className="text-white" />
            </div>
            <span className="font-black text-sm tracking-tight">beone<span className="text-blue-600">of</span>us</span>
          </Link>
          <div className="flex items-center gap-2">
            <button onClick={handleCopy} className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 rounded-xl text-xs font-bold text-gray-600 dark:text-gray-400 transition-all">
              {copied ? <><Check size={13} className="text-emerald-500" /> Copied</> : <><Copy size={13} /> Share</>}
            </button>
          </div>
        </div>
      </nav>

      <article className="max-w-3xl mx-auto px-4 sm:px-6 pt-24 pb-20">

        {/* cover */}
        {post.cover_url && (
          <div className="relative w-full h-56 sm:h-80 rounded-3xl overflow-hidden mb-10 shadow-2xl">
            <Image src={post.cover_url} alt={post.title} fill className="object-cover" sizes="(max-width:768px) 100vw, 768px" priority />
            <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
          </div>
        )}

        {/* tags */}
        {(post.tags || []).length > 0 && (
          <div className="flex flex-wrap gap-2 mb-5">
            {post.tags.map((t) => (
              <Link key={t} href={`/blog?tag=${t}`} className={`px-3 py-1 rounded-full text-xs font-bold border transition-all hover:scale-105 ${tagColor(t)}`}>{t}</Link>
            ))}
          </div>
        )}

        {/* title */}
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tighter leading-tight mb-6 text-gray-900 dark:text-white">
          {post.title}
        </h1>

        {/* meta */}
        <div className="flex items-center justify-between flex-wrap gap-4 pb-8 mb-8 border-b border-gray-200 dark:border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 flex items-center justify-center text-sm font-bold overflow-hidden relative">
              {post.author?.avatar_url ? <Image src={post.author.avatar_url} alt="av" fill className="object-cover" sizes="40px" /> : <User size={16} />}
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900 dark:text-white">@{post.author?.username || "beoneofus"}</p>
              <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-500">
                <span className="flex items-center gap-1"><Clock size={10} />{timeAgo(post.created_at)}</span>
                <span className="flex items-center gap-1"><Eye size={10} />{(post.views || 0) + 1} views</span>
              </div>
            </div>
          </div>

          {/* like */}
          <button onClick={handleLike} disabled={!session || likeLoading}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl border font-bold text-sm transition-all ${userLiked ? "bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-800/40 hover:bg-rose-100 dark:hover:bg-rose-900/30" : "bg-gray-50 dark:bg-white/5 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-white/10 hover:border-rose-300 dark:hover:border-rose-700/40 hover:text-rose-600 dark:hover:text-rose-400"} disabled:opacity-50 disabled:cursor-not-allowed`}>
            {likeLoading ? <Loader2 size={14} className="animate-spin" /> : <Heart size={14} className={userLiked ? "fill-current" : ""} />}
            {likes}
            {!session && <span className="text-xs text-gray-400">(sign in)</span>}
          </button>
        </div>

        {/* content */}
        <div className="prose prose-gray dark:prose-invert max-w-none prose-headings:font-black prose-headings:tracking-tight prose-a:text-blue-600 dark:prose-a:text-blue-400 prose-code:bg-gray-100 dark:prose-code:bg-white/10 prose-code:rounded prose-code:px-1 prose-code:text-sm prose-pre:bg-gray-900 dark:prose-pre:bg-black/50 prose-pre:rounded-2xl prose-img:rounded-2xl prose-blockquote:border-blue-500 prose-blockquote:bg-blue-50 dark:prose-blockquote:bg-blue-900/10 prose-blockquote:py-1 prose-blockquote:rounded-r-xl">
          <ReactMarkdown>{post.content}</ReactMarkdown>
        </div>

        {/* comments */}
        <div className="mt-16 pt-10 border-t border-gray-200 dark:border-white/5">
          <h2 className="text-xl font-black text-gray-900 dark:text-white mb-6 flex items-center gap-2">
            <MessageSquare size={18} /> {comments.length} Comment{comments.length !== 1 ? "s" : ""}
          </h2>

          {/* comment form */}
          {session ? (
            <form onSubmit={handleComment} className="flex gap-3 mb-8">
              <div className="w-9 h-9 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 flex items-center justify-center text-xs font-bold shrink-0">
                {session.user.email?.[0]?.toUpperCase() || "U"}
              </div>
              <div className="flex-1 flex gap-2">
                <textarea
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Write a comment…"
                  rows={1}
                  onInput={(e) => { e.target.style.height = "auto"; e.target.style.height = e.target.scrollHeight + "px"; }}
                  className="flex-1 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl px-4 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all min-h-[44px]"
                />
                <button type="submit" disabled={!commentText.trim() || posting}
                  className="shrink-0 h-11 w-11 flex items-center justify-center bg-blue-600 hover:bg-blue-500 text-white rounded-2xl disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow shadow-blue-500/20">
                  {posting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                </button>
              </div>
            </form>
          ) : (
            <Link href="/auth" className="flex items-center gap-3 mb-8 p-4 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl text-sm font-semibold text-gray-600 dark:text-gray-400 hover:border-blue-300 dark:hover:border-blue-700/40 hover:text-blue-600 dark:hover:text-blue-400 transition-all">
              <MessageSquare size={16} /> Sign in to leave a comment
            </Link>
          )}

          {/* comment list */}
          {comments.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-500 text-center py-8">No comments yet. Be the first!</p>
          ) : (
            <div className="space-y-4">
              {comments.map((c) => (
                <div key={c.id} className="flex gap-3 group animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-white/10 text-gray-500 flex items-center justify-center text-xs font-bold overflow-hidden relative shrink-0 mt-0.5">
                    {c.user?.avatar_url ? <Image src={c.user.avatar_url} alt="av" fill className="object-cover" sizes="32px" /> : <User size={12} />}
                  </div>
                  <div className="flex-1 bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/5 rounded-2xl px-4 py-3">
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className="text-sm font-bold text-gray-900 dark:text-white">@{c.user?.username || "user"}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-400">{timeAgo(c.created_at)}</span>
                        {session?.user?.id === c.user?.id && (
                          <button onClick={() => handleDeleteComment(c.id)} className="opacity-0 group-hover:opacity-100 text-gray-300 dark:text-gray-600 hover:text-red-500 dark:hover:text-red-400 transition-all">
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </div>
                    <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">{c.content}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* back */}
        <div className="mt-14 pt-8 border-t border-gray-200 dark:border-white/5">
          <Link href="/blog" className="inline-flex items-center gap-2 text-sm font-bold text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
            <ArrowLeft size={15} /> Back to all posts
          </Link>
        </div>
      </article>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="min-h-screen bg-[#fafafa] dark:bg-[#080c12] pt-24">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 animate-pulse space-y-6">
        <div className="h-72 bg-gray-200 dark:bg-white/5 rounded-3xl" />
        <div className="h-10 bg-gray-200 dark:bg-white/5 rounded-xl w-3/4" />
        <div className="h-6 bg-gray-200 dark:bg-white/5 rounded-xl w-1/2" />
        <div className="space-y-3">{[1, 2, 3, 4, 5].map((i) => <div key={i} className="h-4 bg-gray-100 dark:bg-white/5 rounded-lg" />)}</div>
      </div>
    </div>
  );
}

function NotFoundView() {
  return (
    <div className="min-h-screen bg-[#fafafa] dark:bg-[#080c12] flex items-center justify-center px-4">
      <div className="text-center">
        <div className="w-16 h-16 bg-gray-100 dark:bg-white/5 rounded-2xl flex items-center justify-center mx-auto mb-5">
          <AlertTriangle size={24} className="text-gray-400" />
        </div>
        <h1 className="text-2xl font-black text-gray-900 dark:text-white mb-2">Post not found</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">This post may have been removed or is not published yet.</p>
        <Link href="/blog" className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white font-bold rounded-xl text-sm hover:bg-blue-500 transition-colors">
          <ArrowLeft size={15} /> Back to Blog
        </Link>
      </div>
    </div>
  );
}
