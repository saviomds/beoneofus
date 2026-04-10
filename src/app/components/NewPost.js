'use client';

import React, { useState, useRef } from 'react';
import Image from 'next/image';
import { Code2, Image as ImageIcon, ChevronDown, Send, X } from 'lucide-react';

export default function NewPost() {
  const [showCodeInput, setShowCodeInput] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const fileInputRef = useRef(null);

  // Handle Image Upload
  const handleImageClick = () => fileInputRef.current.click();
  
  const onFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedImage(URL.createObjectURL(file));
    }
  };

  return (
    <div className="bg-[#0D0D0D] border border-white/10 rounded-xl p-4 mb-6 shadow-2xl">
      <div className="flex flex-col gap-4">
        
        {/* Header / Title Input (Conditional) */}
        <input 
          type="text"
          placeholder="Post Title / Header..."
          className="bg-transparent border-b border-white/5 pb-2 focus:outline-none text-brand-orange font-bold text-xl placeholder-gray-700"
        />

        {/* Main Text Area */}
        <textarea
          placeholder="What's the latest code, TechNinja?"
          className="w-full bg-transparent border-none focus:ring-0 text-gray-200 placeholder-gray-600 resize-none min-h-[80px] text-lg"
        />

        {/* Image Preview (Works now!) */}
        {selectedImage && (
          <div className="relative w-full max-h-64 overflow-hidden rounded-lg border border-white/10">
            <button 
              onClick={() => setSelectedImage(null)}
              className="absolute top-2 right-2 bg-black/50 p-1 rounded-full text-white hover:bg-red-500 z-10"
            >
              <X size={16} />
            </button>
            <Image src={selectedImage} alt="Preview" fill className="w-full object-cover" sizes="(max-width: 768px) 100vw" />
          </div>
        )}

        {/* Hidden File Input */}
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={onFileChange} 
          className="hidden" 
          accept="image/*" 
        />
        
        {/* Bottom Actions Row */}
        <div className="flex items-center justify-between pt-3 border-t border-white/5">
          <div className="flex items-center gap-4 text-gray-500">
            
            {/* Code Icon - Toggles a console log or UI change */}
            <button 
              onClick={() => setShowCodeInput(!showCodeInput)}
              className={`${showCodeInput ? 'text-blue-400' : 'hover:text-blue-400'} transition-colors flex items-center gap-2 px-2 py-1 rounded-md hover:bg-white/5`}
            >
              <Code2 size={20} />
            </button>
            
            {/* Image Icon - Triggers file picker */}
            <button 
              onClick={handleImageClick}
              className="hover:text-green-400 transition-colors flex items-center gap-2 px-2 py-1 rounded-md hover:bg-white/5"
            >
              <ImageIcon size={20} />
            </button>

            {/* Dropdown Menu (More) - Now Toggles */}
            <div className="relative">
              <button 
                onClick={() => setShowMore(!showMore)}
                className="hover:text-brand-orange transition-colors flex items-center gap-1 text-sm px-2 py-1 rounded-md hover:bg-white/5"
              >
                <span>More</span>
                <ChevronDown size={14} className={showMore ? "rotate-180 transition-transform" : "transition-transform"} />
              </button>

              {showMore && (
                <div className="absolute bottom-10 left-0 w-32 bg-[#1A1A1A] border border-white/10 rounded-lg shadow-xl z-10 py-2">
                  <button className="w-full text-left px-4 py-2 text-xs text-gray-300 hover:bg-white/5">Schedule</button>
                  <button className="w-full text-left px-4 py-2 text-xs text-gray-300 hover:bg-white/5">Drafts</button>
                </div>
              )}
            </div>
          </div>

          {/* Post Button */}
          <button className="bg-blue-500 hover:bg-blue-600 text-black p-2 rounded-lg transition-transform active:scale-95 shadow-[0_0_15px_rgba(59,130,246,0.5)]">
            <Send size={18} fill="currentColor" />
          </button>
        </div>
      </div>
    </div>
  );
}