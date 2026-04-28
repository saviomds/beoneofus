'use client';

import React, { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { 
  Code2, Image as ImageIcon, 
  Send, X, Loader2, CheckCircle2,
  Bold, Italic, Link as LinkIcon, Eye,
  AlertTriangle
} from 'lucide-react';
import { supabase } from '../supabaseClient';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

const markdownComponents = {
  code({ node, inline, className, children, ...props }) {
    const match = /language-(\w+)/.exec(className || "");
    return !inline && match ? (
      <div className="rounded-lg overflow-hidden my-3 border border-gray-200 dark:border-gray-700 shadow-sm bg-[#1E1E1E]">
        <div className="bg-gray-800/80 px-3 py-1.5 text-[9px] font-mono text-gray-400 uppercase tracking-widest flex justify-between items-center border-b border-white/5">
          <span>{match[1]}</span>
        </div>
        <SyntaxHighlighter
          {...props}
          style={vscDarkPlus}
          language={match[1]}
          PreTag="div"
          customStyle={{ margin: 0, padding: '0.75rem', background: 'transparent', fontSize: '0.75rem' }}
        >
          {String(children).replace(/\n$/, "")}
        </SyntaxHighlighter>
      </div>
    ) : (
      <code {...props} className="bg-gray-100 dark:bg-gray-800 dark:text-gray-200 px-1 py-0.5 rounded font-mono text-[10px] border border-gray-200 dark:border-gray-700">
        {children}
      </code>
    );
  }
};

export default function NewPost({ onPostCreated, postToEdit, onPostUpdated, onCancelEdit }) {
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false); // New Success State
  const [successMessage, setSuccessMessage] = useState('Post Deployed!');
  const [showError, setShowError] = useState(false); // New Error State
  const [errorMessage, setErrorMessage] = useState('');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [codeSnippet, setCodeSnippet] = useState('');
  const [showCodeInput, setShowCodeInput] = useState(false);
  const [codeLanguage, setCodeLanguage] = useState('javascript');
  const [showPreview, setShowPreview] = useState(false);
  
  const [selectedImage, setSelectedImage] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);
  const MAX_CHARS = 2500;

  const isEditMode = Boolean(postToEdit);

  useEffect(() => {
    if (isEditMode) {
      setTitle(postToEdit.title || '');
      setContent(postToEdit.content || '');
      setCodeSnippet(postToEdit.code_snippet || '');
      setCodeLanguage(postToEdit.code_language || 'javascript');
      setSelectedImage(postToEdit.image_url || null);
      setImageFile(null); // Reset any selected file
      setShowCodeInput(!!postToEdit.code_snippet);
    }
    // No 'else' needed; component state handles create mode reset
  }, [postToEdit, isEditMode]);

  // Auto-resize content textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 400)}px`;
    }
  }, [content]);

  // Load draft on mount
  useEffect(() => {
    if (!isEditMode && typeof window !== 'undefined') {
      const savedDraft = localStorage.getItem('beoneofus_post_draft');
      if (savedDraft) {
        try {
          const { title: t, content: c, codeSnippet: cs, codeLanguage: cl } = JSON.parse(savedDraft);
          if (t) setTitle(t);
          if (c) setContent(c);
          if (cl) setCodeLanguage(cl);
          if (cs) {
            setCodeSnippet(cs);
            setShowCodeInput(true);
          }
        } catch (e) {
          console.error("Could not load draft", e);
        }
      }
    }
  }, [isEditMode]);

  // Auto-save draft
  useEffect(() => {
    if (!isEditMode && typeof window !== 'undefined') {
      const timer = setTimeout(() => {
        if (title || content || codeSnippet) {
          localStorage.setItem('beoneofus_post_draft', JSON.stringify({ title, content, codeSnippet, codeLanguage }));
        } else {
          localStorage.removeItem('beoneofus_post_draft');
        }
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [title, content, codeSnippet, codeLanguage, isEditMode]);

  const onFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setErrorMessage("Please upload a valid image file (JPEG, PNG, GIF, etc.).");
        setShowError(true);
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }

      const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
      if (file.size > MAX_FILE_SIZE) {
        setErrorMessage("The selected image is too large. Please upload an image smaller than 5MB.");
        setShowError(true);
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }

      setImageFile(file);
      setSelectedImage(URL.createObjectURL(file));
    }
  };

  const handleImageClick = () => fileInputRef.current.click();

  const insertFormatting = (prefix, suffix = '') => {
    if (!textareaRef.current) return;
    const start = textareaRef.current.selectionStart;
    const end = textareaRef.current.selectionEnd;
    const selectedText = content.substring(start, end);
    const newText = content.substring(0, start) + prefix + selectedText + suffix + content.substring(end);
    
    setContent(newText);
    
    setTimeout(() => {
      textareaRef.current.focus();
      textareaRef.current.setSelectionRange(start + prefix.length, end + prefix.length);
    }, 0);
  };

  const handlePostSubmit = async () => {
    // Prevent completely empty posts, but allow posts that have at least one field filled
    if (!content.trim() && !title.trim() && !codeSnippet.trim() && !imageFile && !selectedImage) {
      setErrorMessage("Please add some content, a title, a code snippet, or an image before deploying.");
      setShowError(true);
      return;
    }
    
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
        code_language: codeLanguage,
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
        setCodeLanguage('javascript');
        setSelectedImage(null);
        setImageFile(null);
        setShowCodeInput(false);
        setShowPreview(false);
        if (typeof window !== 'undefined') {
          localStorage.removeItem('beoneofus_post_draft');
        }
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
      setErrorMessage(error.message);
      setShowError(true);
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

      {/* --- CUSTOM ERROR POPUP CARD --- */}
      {showError && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-gray-900/50 dark:bg-black/60 backdrop-blur-sm"
            onClick={() => setShowError(false)}
          />
          <div className="bg-white dark:bg-gray-900 border border-red-200 dark:border-red-900/50 w-full max-w-sm rounded-2xl p-8 shadow-xl text-center relative z-10 animate-in fade-in zoom-in duration-300">
            <div className="w-20 h-20 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6 border border-red-500/20">
              <AlertTriangle size={40} className="animate-pulse" />
            </div>
            <h3 className="text-xl font-black text-gray-900 dark:text-gray-100 mb-2 tracking-tight">Action Blocked</h3>
            <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed mb-6">
              {errorMessage}
            </p>
            <button 
              onClick={() => setShowError(false)}
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

        <div className="flex items-center gap-1 -mt-1 mb-1">
          {!showPreview && (
            <>
              <button type="button" onClick={() => insertFormatting('**', '**')} className="p-1.5 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors" title="Bold">
                <Bold size={16} strokeWidth={2.5} />
              </button>
              <button type="button" onClick={() => insertFormatting('*', '*')} className="p-1.5 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors" title="Italic">
                <Italic size={16} strokeWidth={2.5} />
              </button>
              <button type="button" onClick={() => insertFormatting('[', '](https://)')} className="p-1.5 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors" title="Link">
                <LinkIcon size={16} strokeWidth={2.5} />
              </button>
            </>
          )}
          <button 
            type="button" 
            onClick={() => setShowPreview(!showPreview)} 
            className={`ml-auto flex items-center gap-1.5 px-2 py-1 text-xs font-bold rounded-md transition-colors ${showPreview ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100'}`}
          >
            <Eye size={14} strokeWidth={2.5} />
            {showPreview ? 'Edit' : 'Preview'}
          </button>
        </div>

        {showPreview ? (
          <div className="w-full bg-gray-50/50 dark:bg-gray-800/20 border border-gray-100 dark:border-gray-800 rounded-xl p-4 text-gray-900 dark:text-gray-100 min-h-[80px] text-base overflow-y-auto custom-scrollbar prose dark:prose-invert max-w-none">
            {content || codeSnippet || selectedImage ? (
              <>
                {content && <ReactMarkdown components={markdownComponents}>{content}</ReactMarkdown>}
                {codeSnippet && (
                  <div className="mt-4">
                    <ReactMarkdown components={markdownComponents}>{`\`\`\`${codeLanguage}\n${codeSnippet}\n\`\`\``}</ReactMarkdown>
                  </div>
                )}
                {selectedImage && (
                  <div className="mt-4 relative w-full h-64 overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
                    <Image src={selectedImage} alt="Preview" fill className="object-cover" />
                  </div>
                )}
              </>
            ) : <span className="text-gray-400 italic">Nothing to preview yet...</span>}
          </div>
        ) : (
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            maxLength={MAX_CHARS}
            placeholder="What's the latest code, BeOneOfUs?"
            className="w-full bg-transparent border-none focus:ring-0 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 resize-none min-h-[80px] text-lg custom-scrollbar overflow-y-auto"
          />
        )}

        {!showPreview && showCodeInput && (
          <div className="flex flex-col gap-2 animate-in fade-in slide-in-from-top-2 duration-200">
            <select
              value={codeLanguage}
              onChange={(e) => setCodeLanguage(e.target.value)}
              className="w-full sm:w-auto self-start bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-xs text-gray-700 dark:text-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors font-bold cursor-pointer"
            >
              <option value="javascript">JavaScript</option>
              <option value="typescript">TypeScript</option>
              <option value="python">Python</option>
              <option value="html">HTML</option>
              <option value="css">CSS</option>
              <option value="json">JSON</option>
              <option value="bash">Bash / Shell</option>
              <option value="sql">SQL</option>
            </select>
            <textarea
              value={codeSnippet}
              onChange={(e) => setCodeSnippet(e.target.value)}
              placeholder="Paste your code snippet here..."
              className="w-full bg-gray-50 dark:bg-gray-950 p-3 rounded-lg font-mono text-sm text-blue-600 dark:text-blue-400 border border-gray-200 dark:border-gray-800 focus:outline-none min-h-[100px] custom-scrollbar"
            />
          </div>
          )}

        {!showPreview && selectedImage && (
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
            <span className={`text-xs font-medium mr-2 hidden sm:block ${content.length >= MAX_CHARS * 0.9 ? 'text-red-500' : 'text-gray-400 dark:text-gray-500'}`}>
              {content.length} / {MAX_CHARS}
            </span>
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