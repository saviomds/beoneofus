'use client';

import React, { useState, useRef } from 'react';
import Image from 'next/image';
import { Code2, Image as ImageIcon, ChevronDown, Send, X, Loader2 } from 'lucide-react';
import { supabase } from '../supabaseClient';

export default function NewPost() {
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [codeSnippet, setCodeSnippet] = useState('');
  const [showCodeInput, setShowCodeInput] = useState(false);
  const [showMore, setShowMore] = useState(false);
  
  const [selectedImage, setSelectedImage] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const fileInputRef = useRef(null);

  // Handle Image Selection
  const onFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      setSelectedImage(URL.createObjectURL(file));
    }
  };

  const handleImageClick = () => fileInputRef.current.click();

  // Handle Database Submission
  const handlePostSubmit = async () => {
    if (!content.trim()) return alert("Content is required!");
    
    setLoading(true);
    try {
      // 1. Get current session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        throw new Error("Please log in to share a post.");
      }

      const user = session.user;
      let publicImageUrl = null;

      // 2. Upload Image to Storage if one is selected
      if (imageFile) {
        // Create a unique filename
        const fileExt = imageFile.name.split('.').pop();
        const fileName = `${user.id}-${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('post-images')
          .upload(fileName, imageFile);

        if (uploadError) throw uploadError;
        
        // Get the public URL for the uploaded image
        const { data: urlData } = supabase.storage
          .from('post-images')
          .getPublicUrl(fileName);
        
        publicImageUrl = urlData.publicUrl;
      }

      // 3. Insert Post to the 'posts' table
      const { error: postError } = await supabase
        .from('posts')
        .insert({
          user_id: user.id,
          title: title,
          content: content,
          image_url: publicImageUrl,
          code_snippet: codeSnippet
        });

      if (postError) throw postError;

      // 4. Reset Form on Success
      setTitle('');
      setContent('');
      setCodeSnippet('');
      setSelectedImage(null);
      setImageFile(null);
      setShowCodeInput(false);
      setShowMore(false);
      
      alert("Post shared successfully!");

    } catch (error) {
      console.error(error);
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-[#0D0D0D] border border-white/10 rounded-xl p-4 mb-6 shadow-2xl">
      <div className="flex flex-col gap-4">
        
        {/* Header / Title Input */}
        <input 
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Post Title / Header..."
          className="bg-transparent border-b border-white/5 pb-2 focus:outline-none text-blue-500 font-bold text-xl placeholder-gray-700"
        />

        {/* Main Text Area */}
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="What's the latest code, TechNinja?"
          className="w-full bg-transparent border-none focus:ring-0 text-gray-200 placeholder-gray-600 resize-none min-h-[80px] text-lg"
        />

        {/* Code Snippet Input Area (Conditional) */}
        {showCodeInput && (
          <textarea
            value={codeSnippet}
            onChange={(e) => setCodeSnippet(e.target.value)}
            placeholder="Paste your code snippet here..."
            className="w-full bg-black/50 p-3 rounded-lg font-mono text-sm text-blue-300 border border-white/5 focus:outline-none min-h-[100px]"
          />
        )}

        {/* Image Preview Area */}
        {selectedImage && (
          <div className="relative w-full h-64 overflow-hidden rounded-lg border border-white/10">
            <button 
              onClick={() => { setSelectedImage(null); setImageFile(null); }}
              className="absolute top-2 right-2 bg-black/50 p-1 rounded-full text-white hover:bg-red-500 z-10"
            >
              <X size={16} />
            </button>
            <Image src={selectedImage} alt="Preview" fill className="object-cover" />
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
          <div className="flex items-center gap-4 text-gray-400">
            
            {/* Code Toggle Icon */}
            <button 
              type="button"
              onClick={() => setShowCodeInput(!showCodeInput)}
              className={`${showCodeInput ? 'text-blue-400' : 'hover:text-blue-400'} transition-colors flex items-center gap-2 px-2 py-1 rounded-md hover:bg-white/5`}
            >
              <Code2 size={20} />
            </button>
            
            {/* Image Trigger Icon */}
            <button 
              type="button"
              onClick={handleImageClick}
              className="hover:text-green-400 transition-colors flex items-center gap-2 px-2 py-1 rounded-md hover:bg-white/5"
            >
              <ImageIcon size={20} />
            </button>

            {/* Dropdown Menu (More) */}
            <div className="relative">
              <button 
                type="button"
                onClick={() => setShowMore(!showMore)}
                className="hover:text-white transition-colors flex items-center gap-1 text-sm px-2 py-1 rounded-md hover:bg-white/5"
              >
                <span>More</span>
                <ChevronDown size={14} className={showMore ? "rotate-180 transition-transform" : "transition-transform"} />
              </button>

              {showMore && (
                <div className="absolute bottom-10 left-0 w-32 bg-[#1A1A1A] border border-white/10 rounded-lg shadow-xl z-10 py-2">
                  <button type="button" className="w-full text-left px-4 py-2 text-xs text-gray-300 hover:bg-white/5">Schedule</button>
                  <button type="button" className="w-full text-left px-4 py-2 text-xs text-gray-300 hover:bg-white/5">Drafts</button>
                </div>
              )}
            </div>
          </div>

          {/* Post Submission Button */}
          <button 
            type="button"
            onClick={handlePostSubmit}
            disabled={loading}
            className="bg-blue-500 hover:bg-blue-600 text-black p-2 px-4 rounded-lg transition-all active:scale-95 shadow-[0_0_15px_rgba(59,130,246,0.5)] flex items-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <Send size={18} fill="currentColor" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}