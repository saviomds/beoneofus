"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "../../supabaseClient";
import Link from "next/link";
import { ChevronLeft, MessageSquare, Heart, Loader2 } from "lucide-react";

export default function SinglePostPage() {
  const { id } = useParams();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPost = async () => {
      const { data, error } = await supabase
        .from('posts')
        .select(`
          *,
          profiles:user_id (username, status),
          likes (user_id),
          comments (
            id, content, created_at,
            profiles:user_id (username)
          )
        `)
        .eq('id', id)
        .single();

      if (!error) {
        setPost(data);
      }
      setLoading(false);
    };

    if (id) fetchPost();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex flex-col items-center justify-center">
        <Loader2 className="animate-spin text-blue-500 mb-4" size={32} />
        <p className="text-gray-500 font-mono uppercase text-xs tracking-widest">Decrypting Post...</p>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex flex-col items-center justify-center p-4 text-center">
        <h1 className="text-2xl font-black text-white uppercase tracking-tighter mb-4">Post Not Found</h1>
        <p className="text-gray-500 mb-8 font-mono text-sm">The node you are looking for does not exist or was deleted.</p>
        <Link href="/dash" className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-6 rounded-xl transition-all shadow-lg shadow-blue-500/20">
          Return to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white p-4 md:p-10">
      <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
        
        <Link href="/dash" className="inline-flex items-center gap-2 text-gray-500 hover:text-white transition-colors font-bold text-sm mb-2">
          <ChevronLeft size={16} /> Back to Dashboard
        </Link>

        {/* Main Post Card */}
        <div className="bg-[#0D0D0D] border border-white/5 rounded-[2rem] p-6 md:p-8 shadow-2xl">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-600 to-blue-400 flex items-center justify-center text-sm font-black text-white uppercase shadow-lg">
              {post.profiles?.username?.substring(0, 2) || '??'}
            </div>
            <div>
              <h4 className="text-white font-bold text-lg leading-tight">{post.profiles?.username || 'Unknown User'}</h4>
              <p className="text-[10px] text-blue-500 font-black uppercase tracking-widest">{post.profiles?.status || 'Active Node'}</p>
            </div>
          </div>

          <div className="space-y-4">
            {post.title && <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">{post.title}</h1>}
            <p className="text-gray-300 leading-relaxed whitespace-pre-wrap text-base md:text-lg">{post.content}</p>
            
            {post.code_snippet && (
              <div className="bg-black/80 rounded-xl p-5 border border-white/10 font-mono text-sm text-blue-300 overflow-x-auto mt-4 shadow-inner">
                <pre><code>{post.code_snippet}</code></pre>
              </div>
            )}
          </div>

          <div className="flex items-center gap-6 mt-8 pt-6 border-t border-white/5 text-gray-500">
            <div className="flex items-center gap-2 text-sm font-bold">
              <Heart size={18} className={post.likes?.length > 0 ? "text-red-500" : ""} />
              <span>{post.likes?.length || 0} Likes</span>
            </div>
          </div>
        </div>

        {/* Discussion Thread */}
        <div className="bg-[#0D0D0D] border border-white/5 rounded-[2rem] p-6 md:p-8 shadow-2xl space-y-4">
          <h3 className="text-lg font-black uppercase italic tracking-tighter mb-4 flex items-center gap-2">
            <MessageSquare size={18} className="text-blue-500" /> Discussion Thread
          </h3>
          
          {post.comments?.length > 0 ? (
            <div className="space-y-3">
              {post.comments.map((comment) => (
                <div key={comment.id} className="bg-white/5 p-4 rounded-xl border border-white/5">
                  <p className="text-[10px] font-black tracking-widest text-blue-500 mb-1 uppercase">@{comment.profiles?.username}</p>
                  <p className="text-sm text-gray-300">{comment.content}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 italic text-sm bg-white/5 p-6 rounded-xl border border-white/5 text-center">No comments yet. Be the first to join the conversation on the dashboard!</p>
          )}
        </div>

      </div>
    </div>
  );
}
