'use client';

import React, { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { 
  Code2, Image as ImageIcon, 
  Send, X, Loader2, CheckCircle2 
} from 'lucide-react';
import { supabase } from '../supabaseClient';

export default function NewPost({ onPostCreated, postToEdit, onPostUpdated, onCancelEdit }) {
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false); // New Success State
  const [successMessage, setSuccessMessage] = useState('Post Deployed!');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [codeSnippet, setCodeSnippet] = useState('');
  const [showCodeInput, setShowCodeInput] = useState(false);
  
  const [selectedImage, setSelectedImage] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const fileInputRef = useRef(null);

  const isEditMode = Boolean(postToEdit);

  useEffect(() => {
    if (isEditMode) {
      setTitle(postToEdit.title || '');
      setContent(postToEdit.content || '');
      setCodeSnippet(postToEdit.code_snippet || '');
      setSelectedImage(postToEdit.image_url || null);
      setImageFile(null); // Reset any selected file
      setShowCodeInput(!!postToEdit.code_snippet);
    }
    // No 'else' needed; component state handles create mode reset
  }, [postToEdit, isEditMode]);

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
      let publicImageUrl = isEditMode ? postToEdit.image_url : null;

      // Handle image upload only if a new file is selected
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
      } else if (isEditMode && !selectedImage) {
        // Handle image removal in edit mode
        publicImageUrl = null;
      }

      const postData = {
        title,
        content,
        image_url: publicImageUrl,
        code_snippet: codeSnippet,
      };

      if (isEditMode) {
        const { error: updateError } = await supabase
          .from('posts')
          .update(postData)
          .eq('id', postToEdit.id);
        if (updateError) throw updateError;
        setSuccessMessage('Post Updated!');
      } else {
        const { error: postError } = await supabase
          .from('posts')
          .insert({ ...postData, user_id: user.id });
        if (postError) throw postError;
        setSuccessMessage('Post Deployed!');
      }

      // Reset Form only in create mode
      if (!isEditMode) {
        setTitle('');
        setContent('');
        setCodeSnippet('');
        setSelectedImage(null);
        setImageFile(null);
        setShowCodeInput(false);
      }

      // SHOW CUSTOM SUCCESS CARD
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        if (isEditMode) {
          if (onPostUpdated) onPostUpdated();
        } else {
          if (onPostCreated) onPostCreated();
        }
      }, 2000); // Auto-hide after 2 seconds and close modal if applicable

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
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-gray-900/50 dark:bg-black/60 backdrop-blur-sm"
            onClick={() => setShowSuccess(false)}
          />
          <div className="bg-white dark:bg-gray-900 border border-green-200 dark:border-green-900/50 w-full max-w-sm rounded-2xl p-8 shadow-xl text-center relative z-10 animate-in fade-in zoom-in duration-300">
            <div className="w-20 h-20 bg-green-500/10 text-green-500 rounded-full flex items-center justify-center mx-auto mb-6 border border-green-500/20">
              <CheckCircle2 size={40} className="animate-bounce" />
            </div>
            <h3 className="text-2xl font-black text-gray-900 dark:text-gray-100 mb-2 tracking-tight">{successMessage}</h3>
            <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed mb-6">
              Your update is now live on the <span className="text-blue-500 font-bold">beoneofus</span> network.
            </p>
            <button 
              onClick={() => setShowSuccess(false)}
              className="w-full bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-bold py-3 rounded-xl transition-all border border-gray-200 dark:border-gray-700"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* --- MAIN POST FORM --- */}
      <div className={`bg-white dark:bg-gray-900 border ${isEditMode ? 'border-blue-300 dark:border-blue-800/50' : 'border-gray-200 dark:border-gray-800'} rounded-xl p-4 mb-6 shadow-sm relative`}>
        <div className="flex flex-col gap-4">
          
          <input 
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Post Title / Header..."
            className="bg-transparent border-b border-gray-200 dark:border-gray-800 pb-2 focus:outline-none text-blue-600 dark:text-blue-400 font-bold text-xl placeholder-gray-400 dark:placeholder-gray-500"
          />

          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="What's the latest code, BeOneOfUs?"
            className="w-full bg-transparent border-none focus:ring-0 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 resize-none min-h-[80px] text-lg"
          />

          {showCodeInput && (
            <textarea
              value={codeSnippet}
              onChange={(e) => setCodeSnippet(e.target.value)}
              placeholder="Paste your code snippet here..."
              className="w-full bg-gray-50 dark:bg-gray-950 p-3 rounded-lg font-mono text-sm text-blue-600 dark:text-blue-400 border border-gray-200 dark:border-gray-800 focus:outline-none min-h-[100px]"
            />
          )}

          {selectedImage && (
            <div className="relative w-full h-64 overflow-hidden rounded-lg border border-gray-200 dark:border-gray-800">
              <button 
                onClick={() => { setSelectedImage(null); setImageFile(null); }}
                className="absolute top-2 right-2 bg-white/80 dark:bg-black/50 p-1 rounded-full text-gray-700 dark:text-gray-300 hover:text-white hover:bg-red-500 z-10"
              >
                <X size={16} />
              </button>
              <Image src={selectedImage} alt="Preview" fill className="object-cover" />
            </div>
          )}

          <input type="file" ref={fileInputRef} onChange={onFileChange} className="hidden" accept="image/*" />
          
          <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-800">
            <div className="flex items-center gap-4 text-gray-400">
              <button 
                type="button"
                onClick={() => setShowCodeInput(!showCodeInput)}
                className={`${showCodeInput ? 'text-blue-600' : 'hover:text-blue-600'} transition-colors flex items-center gap-2 px-2 py-1 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800`}
              >
                <Code2 size={20} />
              </button>
              
              <button 
                type="button"
                onClick={handleImageClick}
                className="hover:text-green-500 transition-colors flex items-center gap-2 px-2 py-1 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                <ImageIcon size={20} />
              </button>
            </div>

            <div className="flex items-center gap-2">
              {isEditMode && (
                <button
                  type="button"
                  onClick={onCancelEdit}
                  disabled={loading}
                  className="bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 p-2 px-4 rounded-lg transition-all font-semibold"
                >
                  Cancel
                </button>
              )}
              <button 
                type="button"
                onClick={handlePostSubmit}
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-700 text-white p-2 px-4 rounded-lg transition-all active:scale-95 shadow-sm flex items-center gap-2 disabled:opacity-50"
              >
                {loading ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : isEditMode ? 'Save Changes' : <Send size={18} fill="currentColor" />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}