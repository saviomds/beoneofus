"use client";

import { useState } from "react";
import { 
  Search, 
  Bookmark, 
  ExternalLink, 
  Trash2, 
  Tag,
  MessageSquare,
  Clock
} from "lucide-react";

const SAVED_ITEMS = [
  { 
    id: 1, 
    title: "Next.js 15 Server Actions Guide", 
    category: "Development", 
    date: "2 hours ago",
    preview: "Deep dive into the latest patterns for handling forms and mutations in Next.js...",
    replies: 12
  },
  { 
    id: 2, 
    title: "Stripe Connect for Mauritius", 
    category: "Finance", 
    date: "Yesterday",
    preview: "A walkthrough of setting up platform accounts in regions with limited Stripe support...",
    replies: 45
  },
  { 
    id: 3, 
    title: "Tailwind v4 Alpha Features", 
    category: "Design", 
    date: "3 days ago",
    preview: "Exploring the new engine and CSS-first configuration coming to Tailwind...",
    replies: 8
  },
];

export default function BookmarksContent() {
  const [items, setItems] = useState(SAVED_ITEMS);
  const [searchQuery, setSearchQuery] = useState("");

  // Filter bookmarks based on search input
  const filteredItems = items.filter(item => 
    item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.preview.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Handler to remove an item from the saved list
  const handleRemoveBookmark = (id) => {
    setItems(prevItems => prevItems.filter(item => item.id !== id));
  };

  return (
    <div className="w-full flex flex-col min-h-screen bg-transparent animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tighter">Bookmarks</h1>
          <p className="text-gray-500 text-sm mt-1 font-medium">Your saved snippets and discussions.</p>
        </div>
        
        <div className="relative w-full md:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" size={16} />
          <input 
            type="text" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search bookmarks..." 
            className="w-full bg-[#0F0F0F] border border-white/5 rounded-xl py-2.5 pl-10 pr-4 text-xs text-gray-200 focus:outline-none focus:border-white/20 transition-all"
          />
        </div>
      </div>

      {/* Bookmarks Grid - no-scrollbar ensures it doesn't clash with your sidebars */}
      <div className="grid grid-cols-1 gap-4 no-scrollbar">
        {filteredItems.map((item) => (
          <div 
            key={item.id} 
            className="group relative bg-[#0F0F0F] border border-white/5 rounded-[1.5rem] p-5 hover:border-blue-500/30 transition-all cursor-pointer overflow-hidden"
          >
            {/* Hover Background Glow */}
            <div className="absolute inset-0 bg-gradient-to-br from-blue-600/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

            <div className="relative flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <span className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-blue-500 bg-blue-500/10 px-2 py-0.5 rounded-md">
                    <Tag size={10} />
                    {item.category}
                  </span>
                  <span className="flex items-center gap-1 text-[10px] text-gray-600 font-bold">
                    <Clock size={10} />
                    {item.date}
                  </span>
                </div>
                
                <h3 className="text-lg font-bold text-white mb-2 group-hover:text-blue-400 transition-colors truncate">
                  {item.title}
                </h3>
                <p className="text-sm text-gray-500 line-clamp-2 leading-relaxed mb-4">
                  {item.preview}
                </p>

                <div className="flex items-center gap-4 pt-4 border-t border-white/5">
                  <div className="flex items-center gap-1.5 text-xs text-gray-600 font-bold">
                    <MessageSquare size={14} />
                    {item.replies} Comments
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-gray-600 font-bold hover:text-white transition-colors">
                    <ExternalLink size={14} />
                    View Original
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveBookmark(item.id);
                  }}
                  className="p-2.5 bg-white/5 hover:bg-red-500/10 text-gray-500 hover:text-red-500 rounded-xl border border-white/5 transition-all"
                  title="Remove Bookmark"
                >
                  <Trash2 size={18} />
                </button>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveBookmark(item.id);
                  }}
                  className="p-2.5 bg-white/5 hover:bg-blue-500/10 text-gray-500 hover:text-blue-500 rounded-xl border border-white/5 transition-all"
                >
                  <Bookmark size={18} fill="currentColor" className="text-blue-500" />
                </button>
              </div>
            </div>
          </div>
        ))}

        {filteredItems.length === 0 && (
          <div className="py-20 flex flex-col items-center justify-center border border-dashed border-white/10 rounded-[2rem]">
            <Bookmark size={48} className="text-gray-800 mb-4" />
            <p className="text-gray-600 font-bold">
              {searchQuery ? "No bookmarks match your search" : "No bookmarks yet"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}