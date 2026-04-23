"use client";

import { useState, useEffect } from 'react';
import { X, ArrowRight } from 'lucide-react';
import { supabase } from '../supabaseClient';

export default function QuickViewModal({ type, onClose, onNavigate }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchQuickViewData = async () => {
      setLoading(true);
      try {
        if (type === 'discuss') {
          const { data: posts } = await supabase
            .from('posts')
            .select('id, title, content')
            .order('created_at', { ascending: false })
            .limit(4); // Increased limit to show more items
          if (posts) setItems(posts);
        } else {
          const { data: groups } = await supabase
            .from('groups')
            .select('id, name, description')
            .eq('is_private', false)
            .order('created_at', { ascending: false })
            .limit(4);
          if (groups) setItems(groups);
        }
      } catch (error) {
        console.error("Error fetching quick view data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchQuickViewData();

    // Listen for real-time updates specifically on the active table
    const targetTable = type === 'discuss' ? 'posts' : 'groups';
    const channel = supabase.channel(`quickview-modal-${type}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: targetTable }, fetchQuickViewData)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [type]);

  const isDiscuss = type === 'discuss';

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-6 animate-in fade-in duration-300">
      <div className="absolute inset-0 bg-gray-900/50 backdrop-blur-xl" onClick={onClose} />
      
      <div className="relative w-full max-w-2xl bg-white border border-gray-200 rounded-[3rem] p-10 shadow-xl animate-in zoom-in-95 duration-200">
        <button onClick={onClose} className="absolute top-8 right-8 text-gray-400 hover:text-gray-900 transition-colors">
          <X size={24} />
        </button>

        <div className="flex flex-col">
          <span className="text-[10px] font-black text-blue-500 uppercase tracking-[4px] mb-2">
            {isDiscuss ? 'Community Forums' : 'Global Projects'}
          </span>
          <h2 className="text-4xl font-black text-gray-900 tracking-tighter mb-6">
            {isDiscuss ? 'Live Discussions' : 'Discover New Nodes'}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            {loading ? (
              <>
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="p-4 bg-gray-50 rounded-2xl border border-gray-200">
                    <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded animate-pulse w-1/2"></div>
                  </div>
                ))}
              </>
            ) : items.length > 0 ? items.map(item => (
              <div key={item.id} onClick={() => onNavigate(isDiscuss ? 'feed' : 'groups')} className="p-4 bg-gray-50 rounded-2xl border border-gray-200 hover:border-blue-500/30 hover:shadow-md transition-all cursor-pointer group">
                <p className="text-sm font-bold text-gray-900 mb-1 group-hover:text-blue-600 transition-colors line-clamp-1">{item.title || item.name || 'Untitled Node'}</p>
                <span className="text-[10px] text-gray-500 font-bold uppercase line-clamp-1">{item.content || item.description || 'Join the conversation...'}</span>
              </div>
            )) : (
              <p className="text-gray-500 text-sm col-span-2 text-center py-4">
                {isDiscuss ? 'No live discussions found.' : 'No public nodes found.'}
              </p>
            )}
          </div>

          <button 
            onClick={() => onNavigate(isDiscuss ? 'feed' : 'groups')}
            className="flex items-center justify-center gap-2 w-full py-5 bg-blue-600 hover:bg-blue-500 text-white rounded-[1.5rem] font-black uppercase tracking-widest text-xs transition-all shadow-xl shadow-blue-600/20"
          >
            Enter Full View <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}