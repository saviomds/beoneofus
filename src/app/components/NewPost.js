'use client';

import React, { useState, useRef } from 'react';
import Image from 'next/image';
import { 
  Code2, Image as ImageIcon, ChevronDown, 
  Send, X, Loader2, CheckCircle2 
} from 'lucide-react';
import { supabase } from '../supabaseClient';

export default function NewPost() {
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false); // New Success State
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [codeSnippet, setCodeSnippet] = useState('');
  const [showCodeInput, setShowCodeInput] = useState(false);
  const [showMore, setShowMore] = useState(false);
  
  const [selectedImage, setSelectedImage] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const fileInputRef = useRef(null);

  const onFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      setSelectedImage(URL.createObjectURL(file));
    }
  };

  const handleImageClick = () => fileInputRef.current.click();

  const handlePostSubmit = async () => {
    if (!content.trim()) return;
    
    setLoading(true);
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        throw new Error("Please log in to share a post.");
      }

      const user = session.user;
      let publicImageUrl = null;

      if (imageFile) {
        const fileExt = imageFile.name.split('.').pop();
        const fileName = `${user.id}-${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('post-images')
          .upload(fileName, imageFile);

        if (uploadError) throw uploadError;
        
        const { data: urlData } = supabase.storage
          .from('post-images')
          .getPublicUrl(fileName);
        
        publicImageUrl = urlData.publicUrl;
      }

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

      // Reset Form
      setTitle('');
      setContent('');
      setCodeSnippet('');
      setSelectedImage(null);
      setImageFile(null);
      setShowCodeInput(false);
      setShowMore(false);
      
      // SHOW CUSTOM SUCCESS CARD
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000); // Auto-hide after 3 seconds

    } catch (error) {
      console.error(error);
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative">
      {/* --- CUSTOM SUCCESS POPUP CARD --- */}
      {showSuccess && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowSuccess(false)}
          />
          <div className="bg-[#0D0D0D] border border-green-500/30 w-full max-w-sm rounded-2xl p-8 shadow-[0_0_50px_-12px_rgba(34,197,94,0.5)] text-center relative z-10 animate-in fade-in zoom-in duration-300">
            <div className="w-20 h-20 bg-green-500/10 text-green-500 rounded-full flex items-center justify-center mx-auto mb-6 border border-green-500/20">
              <CheckCircle2 size={40} className="animate-bounce" />
            </div>
            <h3 className="text-2xl font-black text-white mb-2 tracking-tight">Post Deployed!</h3>
            <p className="text-gray-500 text-sm leading-relaxed mb-6">
              Your update is now live on the <span className="text-blue-500 font-bold">beoneofus</span> network.
            </p>
            <button 
              onClick={() => setShowSuccess(false)}
              className="w-full bg-white/5 hover:bg-white/10 text-white font-bold py-3 rounded-xl transition-all border border-white/5"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* --- MAIN POST FORM --- */}
      <div className="bg-[#0D0D0D] border border-white/10 rounded-xl p-4 mb-6 shadow-2xl relative">
        <div className="flex flex-col gap-4">
          
          <input 
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Post Title / Header..."
            className="bg-transparent border-b border-white/5 pb-2 focus:outline-none text-blue-500 font-bold text-xl placeholder-gray-700"
          />

          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="What's the latest code, TechNinja?"
            className="w-full bg-transparent border-none focus:ring-0 text-gray-200 placeholder-gray-600 resize-none min-h-[80px] text-lg"
          />

          {showCodeInput && (
            <textarea
              value={codeSnippet}
              onChange={(e) => setCodeSnippet(e.target.value)}
              placeholder="Paste your code snippet here..."
              className="w-full bg-black/50 p-3 rounded-lg font-mono text-sm text-blue-300 border border-white/5 focus:outline-none min-h-[100px]"
            />
          )}

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

          <input type="file" ref={fileInputRef} onChange={onFileChange} className="hidden" accept="image/*" />
          
          <div className="flex items-center justify-between pt-3 border-t border-white/5">
            <div className="flex items-center gap-4 text-gray-400">
              <button 
                type="button"
                onClick={() => setShowCodeInput(!showCodeInput)}
                className={`${showCodeInput ? 'text-blue-400' : 'hover:text-blue-400'} transition-colors flex items-center gap-2 px-2 py-1 rounded-md hover:bg-white/5`}
              >
                <Code2 size={20} />
              </button>
              
              <button 
                type="button"
                onClick={handleImageClick}
                className="hover:text-green-400 transition-colors flex items-center gap-2 px-2 py-1 rounded-md hover:bg-white/5"
              >
                <ImageIcon size={20} />
              </button>

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
    </div>
  );
}