'use client';

import React, { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import {
  Code2, Image as ImageIcon, Film,
  Send, X, Loader2, CheckCircle2,
  Bold, Italic, Link as LinkIcon, Eye,
  AlertTriangle, Plus
} from 'lucide-react';
import { supabase } from '../supabaseClient';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

const markdownComponents = {
  code({ node, inline, className, children, ...props }) {
    const match = /language-(\w+)/.exec(className || '');
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
          {String(children).replace(/\n$/, '')}
        </SyntaxHighlighter>
      </div>
    ) : (
      <code {...props} className="bg-gray-100 dark:bg-gray-800 dark:text-gray-200 px-1 py-0.5 rounded font-mono text-[10px] border border-gray-200 dark:border-gray-700">
        {children}
      </code>
    );
  }
};

// Parses a video URL into { urlType, embedUrl }
function parseVideoUrl(rawUrl) {
  try {
    const url = rawUrl.trim();
    const ytMatch = url.match(
      /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/|v\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/
    );
    if (ytMatch) {
      return { urlType: 'youtube', embedUrl: `https://www.youtube.com/embed/${ytMatch[1]}?rel=0` };
    }
    const vimeoMatch = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
    if (vimeoMatch) {
      return { urlType: 'vimeo', embedUrl: `https://player.vimeo.com/video/${vimeoMatch[1]}` };
    }
    if (/^https?:\/\//i.test(url)) {
      return { urlType: 'direct', embedUrl: url };
    }
    return null;
  } catch {
    return null;
  }
}

// Inline video preview: iframe for yt/vimeo, native <video> for direct
function VideoPreview({ item }) {
  if (item.videoUrlType === 'youtube' || item.videoUrlType === 'vimeo') {
    return (
      <iframe
        src={item.previewUrl}
        className="w-full h-full border-0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    );
  }
  return (
    <video
      src={item.previewUrl}
      className="w-full h-full object-contain"
      controls
      muted
      playsInline
      preload="metadata"
    />
  );
}

export default function NewPost({ onPostCreated, postToEdit, onPostUpdated, onCancelEdit }) {
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('Post Deployed!');
  const [showError, setShowError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [codeSnippet, setCodeSnippet] = useState('');
  const [showCodeInput, setShowCodeInput] = useState(false);
  const [codeLanguage, setCodeLanguage] = useState('javascript');
  const [showPreview, setShowPreview] = useState(false);
  const [showVideoUrlInput, setShowVideoUrlInput] = useState(false);
  const [videoUrlInput, setVideoUrlInput] = useState('');

  // [{id, type:'image'|'video', videoUrlType, previewUrl, file, fit, quality, existingUrl}]
  const [mediaItems, setMediaItems] = useState([]);

  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);
  const MAX_CHARS = 2500;
  const MAX_MEDIA = 9;

  const isEditMode = Boolean(postToEdit);

  useEffect(() => {
    if (isEditMode && postToEdit) {
      setTitle(postToEdit.title || '');
      setContent(postToEdit.content || '');
      setCodeSnippet(postToEdit.code_snippet || '');
      setCodeLanguage(postToEdit.code_language || 'javascript');
      setShowCodeInput(!!postToEdit.code_snippet);

      if (postToEdit.media_items?.length > 0) {
        setMediaItems(postToEdit.media_items.map((item, i) => ({
          id: `existing-${i}`,
          type: item.type || 'image',
          videoUrlType: item.videoUrlType || (item.type === 'video' ? 'direct' : null),
          previewUrl: item.url,
          file: null,
          fit: item.fit || 'cover',
          quality: item.quality || null,
          existingUrl: item.url,
        })));
      } else if (postToEdit.image_url) {
        setMediaItems([{
          id: 'existing-0',
          type: 'image',
          videoUrlType: null,
          previewUrl: postToEdit.image_url,
          file: null,
          fit: postToEdit.image_fit || 'cover',
          quality: null,
          existingUrl: postToEdit.image_url,
        }]);
      } else {
        setMediaItems([]);
      }
    }
  }, [postToEdit, isEditMode]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 400)}px`;
    }
  }, [content]);

  useEffect(() => {
    if (!isEditMode && typeof window !== 'undefined') {
      const saved = localStorage.getItem('beoneofus_post_draft');
      if (saved) {
        try {
          const { title: t, content: c, codeSnippet: cs, codeLanguage: cl } = JSON.parse(saved);
          if (t) setTitle(t);
          if (c) setContent(c);
          if (cl) setCodeLanguage(cl);
          if (cs) { setCodeSnippet(cs); setShowCodeInput(true); }
        } catch (e) {
          console.warn('Failed to restore post draft from localStorage:', e);
        }
      }
    }
  }, [isEditMode]);

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

  const addImageFiles = (files) => {
    const remaining = MAX_MEDIA - mediaItems.length;
    if (remaining <= 0) {
      setErrorMessage(`Maximum ${MAX_MEDIA} media items per post.`);
      setShowError(true);
      return;
    }
    Array.from(files).slice(0, remaining).forEach(file => {
      const id = `new-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const previewUrl = URL.createObjectURL(file);
      setMediaItems(prev => [...prev, { id, type: 'image', videoUrlType: null, previewUrl, file, fit: 'cover', quality: null, existingUrl: null }]);
    });
  };

  const addVideoUrl = () => {
    const raw = videoUrlInput.trim();
    if (!raw) return;
    const parsed = parseVideoUrl(raw);
    if (!parsed) {
      setErrorMessage('Please enter a valid video URL (YouTube, Vimeo, or a direct video link starting with https://).');
      setShowError(true);
      return;
    }
    if (mediaItems.length >= MAX_MEDIA) {
      setErrorMessage(`Maximum ${MAX_MEDIA} media items per post.`);
      setShowError(true);
      return;
    }
    const id = `url-${Date.now()}`;
    setMediaItems(prev => [...prev, {
      id,
      type: 'video',
      videoUrlType: parsed.urlType,
      previewUrl: parsed.embedUrl,
      file: null,
      fit: 'cover',
      quality: null,
      existingUrl: parsed.embedUrl,
    }]);
    setVideoUrlInput('');
    setShowVideoUrlInput(false);
  };

  const onImageFileChange = (e) => {
    const files = e.target.files;
    if (!files?.length) return;
    const valid = Array.from(files).filter(f => {
      if (!f.type.startsWith('image/')) return false;
      if (f.size > 10 * 1024 * 1024) {
        setErrorMessage(`"${f.name}" exceeds the 10MB image limit.`);
        setShowError(true);
        return false;
      }
      return true;
    });
    addImageFiles(valid);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeMedia = (id) => setMediaItems(prev => prev.filter(item => item.id !== id));
  const setMediaFit = (id, fit) => setMediaItems(prev => prev.map(item => item.id === id ? { ...item, fit } : item));

  const insertFormatting = (prefix, suffix = '') => {
    if (!textareaRef.current) return;
    const start = textareaRef.current.selectionStart;
    const end = textareaRef.current.selectionEnd;
    const selected = content.substring(start, end);
    setContent(content.substring(0, start) + prefix + selected + suffix + content.substring(end));
    setTimeout(() => {
      textareaRef.current.focus();
      textareaRef.current.setSelectionRange(start + prefix.length, end + prefix.length);
    }, 0);
  };

  const handlePostSubmit = async () => {
    if (!content.trim() && !title.trim() && !codeSnippet.trim() && mediaItems.length === 0) {
      setErrorMessage('Please add some content, a title, a code snippet, or media before deploying.');
      setShowError(true);
      return;
    }
    setLoading(true);
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) throw new Error('Please log in to share a post.');
      const user = session.user;

      const uploaded = [];
      for (const item of mediaItems) {
        if (item.file) {
          const ext = item.file.name.split('.').pop();
          const fileName = `${user.id}-${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
          const { error: uploadError } = await supabase.storage.from('post-images').upload(fileName, item.file);
          if (uploadError) throw uploadError;
          const { data: urlData } = supabase.storage.from('post-images').getPublicUrl(fileName);
          uploaded.push({ type: 'image', url: urlData.publicUrl, fit: item.fit, quality: null, videoUrlType: null });
        } else if (item.existingUrl) {
          uploaded.push({ type: item.type, url: item.existingUrl, fit: item.fit, quality: item.quality, videoUrlType: item.videoUrlType || null });
        }
      }

      const firstImage = uploaded.find(i => i.type === 'image');
      const postData = {
        title,
        content,
        code_snippet: codeSnippet,
        code_language: codeLanguage,
        image_url: firstImage?.url || null,
        image_fit: firstImage?.fit || null,
        ...(uploaded.length > 0 ? { media_items: uploaded } : {}),
      };

      const tryPost = async (data) => {
        if (isEditMode) {
          const { error } = await supabase.from('posts').update(data).eq('id', postToEdit.id);
          return error;
        }
        const { error } = await supabase.from('posts').insert({ ...data, user_id: user.id });
        return error;
      };

      let postError = await tryPost(postData);

      if (postError && (postError.code === '42703' || postError.message?.includes('media_items'))) {
        const { media_items: _omit, ...fallbackData } = postData;
        postError = await tryPost(fallbackData);
      }

      if (postError) throw postError;

      if (isEditMode) {
        setSuccessMessage('Post Updated!');
      } else {
        setSuccessMessage('Post Deployed!');
        supabase.from('user_activity').insert({
          user_id: user.id,
          type: 'post_created',
          content: `Published a post${postData.title ? ': ' + postData.title : ''}`,
          metadata: {},
        }).then(() => {});
      }

      if (!isEditMode) {
        setTitle(''); setContent(''); setCodeSnippet(''); setCodeLanguage('javascript');
        setMediaItems([]); setShowCodeInput(false); setShowPreview(false);
        setShowVideoUrlInput(false); setVideoUrlInput('');
        if (typeof window !== 'undefined') localStorage.removeItem('beoneofus_post_draft');
      }

      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        if (isEditMode) { if (onPostUpdated) onPostUpdated(); }
        else { if (onPostCreated) onPostCreated(); }
      }, 2000);

    } catch (error) {
      setErrorMessage(error?.message || 'An unknown error occurred while posting.');
      setShowError(true);
    } finally {
      setLoading(false);
    }
  };

  const renderMediaPreview = () => {
    if (mediaItems.length === 0) return null;
    const count = mediaItems.length;

    const Thumb = ({ item, className }) => (
      <div className={`relative rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 ${className}`}>
        {item.type === 'image' ? (
          <Image src={item.previewUrl} alt="" fill sizes="400px" className={item.fit === 'contain' ? 'object-contain' : 'object-cover'} />
        ) : (
          <VideoPreview item={item} />
        )}
        <button
          onClick={() => removeMedia(item.id)}
          className="absolute top-2 right-2 bg-black/50 hover:bg-red-500 text-white p-1 rounded-full transition-colors z-10"
        >
          <X size={12} />
        </button>
        {count === 1 && item.type === 'image' && (
          <div className="absolute bottom-0 left-0 right-0 bg-black/50 flex items-center gap-1 px-2 py-1.5">
            <span className="text-[9px] text-white/60 font-bold mr-1 uppercase tracking-widest">Fit:</span>
            <button onClick={() => setMediaFit(item.id, 'cover')} className={`text-[9px] font-bold px-2 py-0.5 rounded transition-colors ${item.fit === 'cover' ? 'bg-white text-black' : 'text-white/70 hover:text-white'}`}>Fill</button>
            <button onClick={() => setMediaFit(item.id, 'contain')} className={`text-[9px] font-bold px-2 py-0.5 rounded transition-colors ${item.fit === 'contain' ? 'bg-white text-black' : 'text-white/70 hover:text-white'}`}>Fit</button>
          </div>
        )}
        {count === 1 && item.type === 'video' && (
          <div className="absolute top-2 left-2 bg-black/60 text-white text-[9px] font-black px-2 py-0.5 rounded pointer-events-none z-10">
            {item.videoUrlType === 'youtube' ? 'YouTube' : item.videoUrlType === 'vimeo' ? 'Vimeo' : 'Video'}
          </div>
        )}
      </div>
    );

    if (count === 1) {
      return (
        <div className="relative h-64">
          <Thumb item={mediaItems[0]} className="h-full" />
        </div>
      );
    }

    if (count === 2) {
      return (
        <div className="grid grid-cols-2 gap-1.5">
          {mediaItems.map(item => <Thumb key={item.id} item={item} className="h-40" />)}
        </div>
      );
    }

    if (count === 3) {
      return (
        <div className="flex gap-1.5" style={{ height: '256px' }}>
          <div className="flex-1 relative rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
            {mediaItems[0].type === 'image'
              ? <Image src={mediaItems[0].previewUrl} alt="" fill sizes="200px" className={mediaItems[0].fit === 'contain' ? 'object-contain' : 'object-cover'} />
              : <VideoPreview item={mediaItems[0]} />
            }
            <button onClick={() => removeMedia(mediaItems[0].id)} className="absolute top-2 right-2 bg-black/50 hover:bg-red-500 text-white p-1 rounded-full z-10"><X size={12} /></button>
          </div>
          <div className="w-5/12 flex flex-col gap-1.5">
            {mediaItems.slice(1).map(item => <Thumb key={item.id} item={item} className="flex-1" />)}
          </div>
        </div>
      );
    }

    const visible = mediaItems.slice(0, 4);
    const overflow = count - 4;
    return (
      <div className="grid grid-cols-2 gap-1.5">
        {visible.map((item, i) => (
          <div key={item.id} className="relative h-32 sm:h-40 rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
            {item.type === 'image'
              ? <Image src={item.previewUrl} alt="" fill sizes="200px" className="object-cover" />
              : <VideoPreview item={item} />
            }
            {i === 3 && overflow > 0 ? (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center rounded-xl">
                <span className="text-white font-black text-2xl">+{overflow}</span>
              </div>
            ) : (
              <button onClick={() => removeMedia(item.id)} className="absolute top-2 right-2 bg-black/50 hover:bg-red-500 text-white p-1 rounded-full z-10"><X size={12} /></button>
            )}
          </div>
        ))}
      </div>
    );
  };

  const imageCount = mediaItems.filter(i => i.type === 'image').length;
  const videoCount = mediaItems.filter(i => i.type === 'video').length;

  return (
    <div className="relative">
      {showSuccess && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-gray-900/50 dark:bg-black/60 backdrop-blur-sm" onClick={() => setShowSuccess(false)} />
          <div className="bg-white dark:bg-gray-900 border border-green-200 dark:border-green-900/50 w-full max-w-sm rounded-2xl p-8 shadow-xl text-center relative z-10 animate-in fade-in zoom-in duration-300">
            <div className="w-20 h-20 bg-green-500/10 text-green-500 rounded-full flex items-center justify-center mx-auto mb-6 border border-green-500/20">
              <CheckCircle2 size={40} className="animate-bounce" />
            </div>
            <h3 className="text-2xl font-black text-gray-900 dark:text-gray-100 mb-2 tracking-tight">{successMessage}</h3>
            <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed mb-6">
              Your update is now live on the <span className="text-blue-500 font-bold">beoneofus</span> network.
            </p>
            <button onClick={() => setShowSuccess(false)} className="w-full bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-bold py-3 rounded-xl transition-all border border-gray-200 dark:border-gray-700">
              Dismiss
            </button>
          </div>
        </div>
      )}

      {showError && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-gray-900/50 dark:bg-black/60 backdrop-blur-sm" onClick={() => setShowError(false)} />
          <div className="bg-white dark:bg-gray-900 border border-red-200 dark:border-red-900/50 w-full max-w-sm rounded-2xl p-8 shadow-xl text-center relative z-10 animate-in fade-in zoom-in duration-300">
            <div className="w-20 h-20 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6 border border-red-500/20">
              <AlertTriangle size={40} className="animate-pulse" />
            </div>
            <h3 className="text-xl font-black text-gray-900 dark:text-gray-100 mb-2 tracking-tight">Action Blocked</h3>
            <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed mb-6">{errorMessage}</p>
            <button onClick={() => setShowError(false)} className="w-full bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-bold py-3 rounded-xl transition-all border border-gray-200 dark:border-gray-700">
              Dismiss
            </button>
          </div>
        </div>
      )}

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
              {content || codeSnippet || mediaItems.length > 0 ? (
                <>
                  {content && <ReactMarkdown components={markdownComponents}>{content}</ReactMarkdown>}
                  {codeSnippet && (
                    <div className="mt-4">
                      <ReactMarkdown components={markdownComponents}>{`\`\`\`${codeLanguage}\n${codeSnippet}\n\`\`\``}</ReactMarkdown>
                    </div>
                  )}
                  {mediaItems.length > 0 && (
                    <div className="mt-4">
                      {mediaItems[0].type === 'image' ? (
                        <div className="relative w-full h-64 overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
                          <Image src={mediaItems[0].previewUrl} alt="Preview" fill className={mediaItems[0].fit === 'contain' ? 'object-contain' : 'object-cover'} />
                        </div>
                      ) : (
                        <div className="w-full aspect-video rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
                          <VideoPreview item={mediaItems[0]} />
                        </div>
                      )}
                      {mediaItems.length > 1 && (
                        <p className="text-xs text-gray-400 mt-1 text-center">+{mediaItems.length - 1} more media item{mediaItems.length > 2 ? 's' : ''}</p>
                      )}
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

          {/* Video URL input panel — hidden (video upload not available) */}

          {!showPreview && renderMediaPreview()}

          {!showPreview && mediaItems.length > 0 && (
            <div className="flex items-center gap-2 -mt-2">
              {imageCount > 0 && (
                <span className="flex items-center gap-1 text-[10px] font-bold text-gray-400 dark:text-gray-500">
                  <ImageIcon size={11} /> {imageCount} photo{imageCount > 1 ? 's' : ''}
                </span>
              )}
              {/* video count hidden */}
              {mediaItems.length < MAX_MEDIA && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current.click()}
                  className="ml-auto flex items-center gap-1 text-[10px] font-bold text-blue-500 hover:text-blue-600 transition-colors"
                >
                  <Plus size={11} /> Add more photos
                </button>
              )}
            </div>
          )}

          <input type="file" ref={fileInputRef} onChange={onImageFileChange} className="hidden" accept="image/*" multiple />

          <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-800">
            <div className="flex items-center gap-1 text-gray-400">
              <button
                type="button"
                onClick={() => setShowCodeInput(!showCodeInput)}
                className={`${showCodeInput ? 'text-blue-600 bg-blue-50 dark:bg-blue-900/20' : 'hover:text-blue-600 hover:bg-gray-50 dark:hover:bg-gray-800'} transition-colors p-2 rounded-md`}
                title="Code snippet"
              >
                <Code2 size={20} />
              </button>

              <button
                type="button"
                onClick={() => fileInputRef.current.click()}
                className={`relative transition-colors p-2 rounded-md flex items-center gap-1 ${imageCount > 0 ? 'text-green-600 bg-green-50 dark:bg-green-900/20' : 'hover:text-green-500 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
                title="Add photos"
              >
                <ImageIcon size={20} />
                {imageCount > 0 && <span className="text-[10px] font-black">{imageCount}</span>}
              </button>

              {/* Video button hidden — video upload not available */}

              {mediaItems.length > 0 && (
                <span className="text-[10px] font-bold text-gray-400 ml-1">
                  {mediaItems.length}/{MAX_MEDIA}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <span className={`text-xs font-medium mr-2 hidden sm:block ${content.length >= MAX_CHARS * 0.9 ? 'text-red-500' : 'text-gray-400 dark:text-gray-500'}`}>
                {content.length} / {MAX_CHARS}
              </span>
              {isEditMode && (
                <button type="button" onClick={onCancelEdit} disabled={loading} className="bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 p-2 px-4 rounded-lg transition-all font-semibold">
                  Cancel
                </button>
              )}
              <button
                type="button"
                onClick={handlePostSubmit}
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-700 text-white p-2 px-4 rounded-lg transition-all active:scale-95 shadow-sm flex items-center gap-2 disabled:opacity-50"
              >
                {loading ? <Loader2 size={18} className="animate-spin" /> : isEditMode ? 'Save Changes' : <Send size={18} fill="currentColor" />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
