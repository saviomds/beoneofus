"use client";

import { useState, useRef } from "react"; // Removed ChangeEvent import
import { 
  Plus, 
  Users, 
  Lock, 
  Globe, 
  Search, 
  ChevronRight, 
  X, 
  Image as ImageIcon 
} from "lucide-react";

const GROUPS = [
  {
    id: 1,
    name: "Beta Testers",
    description: "Early access users providing feedback on the new dashboard features, testing API response times, and UI consistency across devices.",
    members: 124,
    isPrivate: true,
  },
  {
    id: 2,
    name: "Web Dev Mauritius",
    description: "A local hub for developers to share Next.js tips, local hosting solutions, and networking events in the Indian Ocean region.",
    members: 850,
    isPrivate: false,
  },
  {
    id: 3,
    name: "Payment Integration",
    description: "Specialized group for troubleshooting Stripe Connect, Supabase Auth hooks, and real-time payment webhooks.",
    members: 45,
    isPrivate: true,
  },
];

export default function GroupsContent() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Image Upload States
  const [imagePreview, setImagePreview] = useState(null); // Removed <string | null>
  const [isPrivateSelection, setIsPrivateSelection] = useState(false);
  
  // Ref for the hidden file input
  const fileInputRef = useRef(null); // Removed <HTMLInputElement>

  // Handle Image Upload logic
  const handleImageClick = () => fileInputRef.current?.click();

  const handleFileChange = (event) => { // Removed : ChangeEvent<HTMLInputElement>
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = (e) => { // Removed : React.MouseEvent
    e.stopPropagation();
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto relative">
      {/* Header Section */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Groups</h1>
          <p className="text-gray-400 text-sm mt-1">Manage your communities and collaborations.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl transition-all font-semibold shadow-lg shadow-blue-500/20 active:scale-95"
        >
          <Plus size={20} />
          Create New Group
        </button>
      </div>

      {/* Search bar */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={20} />
        <input 
          type="text" 
          placeholder="Search groups..." 
          className="w-full bg-white/5 border border-white/10 rounded-2xl py-3.5 pl-12 pr-4 text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:bg-white/10 transition-all"
        />
      </div>

      {/* Groups List */}
      <div className="space-y-4">
        {GROUPS.map((group) => (
          <div 
            key={group.id} 
            className="group flex flex-col sm:flex-row items-start sm:items-center gap-4 bg-[#0A0A0A] border border-white/5 rounded-2xl p-5 hover:border-blue-500/40 hover:bg-white/[0.02] transition-all cursor-pointer"
          >
            <div className="p-4 bg-blue-500/10 rounded-xl text-blue-400 group-hover:bg-blue-500/20 transition-colors">
              <Users size={28} />
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-1">
                <h3 className="text-lg font-bold text-white truncate">{group.name}</h3>
                <span className={`flex items-center gap-1 text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-md border ${
                  group.isPrivate ? 'border-amber-500/30 text-amber-500 bg-amber-500/5' : 'border-blue-500/30 text-blue-400 bg-blue-500/5'
                }`}>
                  {group.isPrivate ? <Lock size={10} /> : <Globe size={10} />}
                  {group.isPrivate ? 'Private' : 'Public'}
                </span>
              </div>
              <p className="text-gray-400 text-sm line-clamp-1 group-hover:text-gray-300 transition-colors">
                {group.description}
              </p>
              <div className="mt-2 text-xs text-gray-500 font-medium">
                {group.members.toLocaleString()} active members
              </div>
            </div>

            <div className="hidden sm:block">
              <button className="p-2 text-gray-500 group-hover:text-blue-400 group-hover:translate-x-1 transition-all">
                <ChevronRight size={24} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* CREATE GROUP MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            onClick={() => {
              setIsModalOpen(false);
              setImagePreview(null);
            }}
          />
          
          <div className="relative w-full max-w-lg bg-[#0F0F0F] border border-white/10 rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-white/5 flex justify-between items-center">
              <h2 className="text-xl font-bold text-white">Create New Group</h2>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-white/5 rounded-full text-gray-400 transition-colors">
                <X size={20} />
              </button>
            </div>

            <form className="p-6 space-y-5" onSubmit={(e) => e.preventDefault()}>
              <div className="flex items-center gap-4">
                <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
                <div 
                  onClick={handleImageClick}
                  className={`h-16 w-16 rounded-2xl flex items-center justify-center cursor-pointer transition-all overflow-hidden border ${
                    imagePreview ? 'border-transparent' : 'bg-white/5 border-dashed border-white/20 hover:border-blue-500/50 text-gray-500 hover:text-blue-400'
                  }`}
                >
                  {imagePreview ? (
                    <div className="relative w-full h-full group">
                      <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <X size={16} className="text-white bg-red-500 rounded-full p-0.5" onClick={handleRemoveImage} />
                      </div>
                    </div>
                  ) : (
                    <ImageIcon size={24} />
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium text-white">Group Icon</p>
                  <p className="text-xs text-gray-500 mt-1">PNG, JPG up to 5MB</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Group Name</label>
                  <input type="text" placeholder="e.g. Next.js Masters" className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition-all" />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Description</label>
                  <textarea rows={3} placeholder="What is this group about?" className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition-all resize-none" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <button 
                    type="button" 
                    onClick={() => setIsPrivateSelection(false)}
                    className={`flex items-center justify-center gap-2 p-3 rounded-xl border transition-all text-sm font-medium ${!isPrivateSelection ? 'border-blue-500 bg-blue-500/10 text-blue-400' : 'border-white/10 bg-white/5 text-gray-400'}`}
                  >
                    <Globe size={16} /> Public
                  </button>
                  <button 
                    type="button" 
                    onClick={() => setIsPrivateSelection(true)}
                    className={`flex items-center justify-center gap-2 p-3 rounded-xl border transition-all text-sm font-medium ${isPrivateSelection ? 'border-amber-500 bg-amber-500/10 text-amber-500' : 'border-white/10 bg-white/5 text-gray-400'}`}
                  >
                    <Lock size={16} /> Private
                  </button>
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3 px-4 rounded-xl text-gray-400 font-medium hover:bg-white/5 transition-all">
                  Cancel
                </button>
                <button type="submit" className="flex-1 py-3 px-4 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 shadow-lg shadow-blue-500/20 transition-all">
                  Create Group
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}s