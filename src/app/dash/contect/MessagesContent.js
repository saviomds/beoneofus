"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { 
  Search, MoreVertical, Phone, Video, Send, 
  Paperclip, CheckCheck, UserPlus, Check, X, 
  Trash2, AlertTriangle, MoreHorizontal, ShieldAlert, ShieldCheck,
  ChevronLeft,
  MessageSquare
} from "lucide-react";
import { supabase } from "../../supabaseClient";
import ProfileContent from "./ProfileContent";

export default function MessagesContent() {
  const [contacts, setContacts] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState("");
  const [currentUserId, setCurrentUserId] = useState(null);
  
  // UI & Connection States
  const [searchQuery, setSearchQuery] = useState("");
  const [connectionStatus, setConnectionStatus] = useState(null); 
  const [blockerId, setBlockerId] = useState(null);
  const [activeConnectionId, setActiveConnectionId] = useState(null); // Track the row ID for reliable updates
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showBlockConfirm, setShowBlockConfirm] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isMobileChatOpen, setIsMobileChatOpen] = useState(false); // Mobile view toggle
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [replyingTo, setReplyingTo] = useState(null);
  const imageInputRef = useRef(null);

  const scrollRef = useRef(null);
  const channelRef = useRef(null);

  // 1. Initial Setup
  useEffect(() => {
    let isMounted = true;

    const fetchContacts = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const uid = session.user.id;
      if (isMounted) setCurrentUserId(uid);

      // Fetch all connections where user is sender or receiver
      const { data: connections } = await supabase
        .from('connections')
        .select('sender_id, receiver_id')
        .or(`sender_id.eq.${uid},receiver_id.eq.${uid}`);

      let connectedIds = [];
      if (connections && connections.length > 0) {
        connectedIds = connections.map(c => c.sender_id === uid ? c.receiver_id : c.sender_id);
      }

      if (connectedIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, username, status, avatar_url')
          .in('id', connectedIds);
        
        if (isMounted) {
          setContacts(profiles || []);
          // Keep active chat if already set, otherwise pick the first
          setActiveChat(prev => prev || (profiles?.length > 0 ? profiles[0] : null));
        }
      } else {
        if (isMounted) {
          setContacts([]);
          setActiveChat(null);
        }
      }
    };

    fetchContacts();

    // Listen for new connections globally to update the sidebar contacts live
    const channel = supabase.channel('messages-contacts-update')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'connections' }, () => {
         fetchContacts();
      })
      .subscribe();

    return () => { 
      isMounted = false;
      supabase.removeChannel(channel); 
    };
  }, []);

  // 2. Fetch Messages and Connection Logic
  useEffect(() => {
    if (!activeChat || !currentUserId) return;

    const checkConnectionAndFetch = async () => {
      const { data: connection } = await supabase
        .from('connections')
        .select('*')
        .or(`and(sender_id.eq.${currentUserId},receiver_id.eq.${activeChat.id}),and(sender_id.eq.${activeChat.id},receiver_id.eq.${currentUserId})`)
        .maybeSingle();

      if (!connection) {
        setConnectionStatus('none');
        setBlockerId(null);
        setActiveConnectionId(null);
        setMessages([]);
      } else {
        setActiveConnectionId(connection.id);
        if (connection.status === 'blocked') {
          setConnectionStatus('blocked');
          setBlockerId(connection.blocked_by);
          setMessages([]);
        } else if (connection.status === 'pending') {
          setConnectionStatus(connection.sender_id === currentUserId ? 'waiting' : 'incoming');
          setMessages([]);
        } else {
          setConnectionStatus('accepted');
          setBlockerId(null);
          fetchMessages();
        }
      }
    };

    const fetchMessages = async () => {
      const { data } = await supabase
        .from('messages')
        .select('*, replied_message:reply_to_message_id(*)')
        .or(`and(sender_id.eq.${currentUserId},receiver_id.eq.${activeChat.id}),and(sender_id.eq.${activeChat.id},receiver_id.eq.${currentUserId})`)
        .order('created_at', { ascending: true });
      setMessages(data || []);
    };

    checkConnectionAndFetch();

    const channelId = `chat-${activeChat.id}`;
    channelRef.current = supabase
      .channel(channelId)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'connections' }, () => checkConnectionAndFetch())
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, async (payload) => {
        const newMessage = payload.new;
        if (newMessage.sender_id === activeChat.id || newMessage.receiver_id === activeChat.id) {
          // Fetch the joined replied message data immediately
          const { data } = await supabase.from('messages').select('*, replied_message:reply_to_message_id(*)').eq('id', newMessage.id).maybeSingle();
          if (data) {
            setMessages((prev) => prev.find(m => m.id === data.id) ? prev : [...prev, data]);
          } else {
            setMessages((prev) => prev.find(m => m.id === newMessage.id) ? prev : [...prev, newMessage]);
          }
        }
      })
      .subscribe();

    return () => { if (channelRef.current) supabase.removeChannel(channelRef.current); };
  }, [activeChat, currentUserId]);

  // 3. Auto-scroll
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, connectionStatus]);

  // 4. Connection Handlers
  const handleSendRequest = async () => {
    const { error } = await supabase.from('connections').insert({
      sender_id: currentUserId,
      receiver_id: activeChat.id,
      status: 'pending'
    });
    
    if (!error) {
      setConnectionStatus('waiting'); // Optimistic UI update
      await supabase.from('notifications').insert({
        receiver_id: activeChat.id,
        actor_id: currentUserId,
        type: 'connection_request',
        content: 'wants to connect'
      });
    }
  };

  const handleAcceptRequest = async () => {
    if (!activeConnectionId) return;
    const { error } = await supabase.from('connections').update({ status: 'accepted' }).eq('id', activeConnectionId);
    
    if (!error) {
      setConnectionStatus('accepted'); // Optimistic UI update
      await supabase.from('notifications').insert({
        receiver_id: activeChat.id,
        actor_id: currentUserId,
        type: 'handshake',
        content: 'accepted your connection request'
      });
    }
  };

  // 5. BLOCK / UNBLOCK LOGIC (Fixed for persistence)
  const handleBlockUser = async () => {
    if (!activeConnectionId || !currentUserId) return;
    setIsProcessing(true);
    try {
      const { error } = await supabase.from('connections')
        .update({ 
          status: 'blocked', 
          blocked_by: currentUserId 
        })
        .eq('id', activeConnectionId);
      
      if (error) throw error;
      
      setShowBlockConfirm(false);
      setShowMoreMenu(false);
    } catch (error) { 
        console.error("Block error:", error.message);
        alert("System failure: Could not sever link.");
    } finally { setIsProcessing(false); }
  };

  const handleUnblockUser = async () => {
    if (!activeConnectionId || !currentUserId) return;
    setIsProcessing(true);
    try {
      const { error } = await supabase.from('connections')
        .update({ 
          status: 'accepted', 
          blocked_by: null 
        })
        .eq('id', activeConnectionId)
        .eq('blocked_by', currentUserId);
      
      if (error) throw error;
      setShowMoreMenu(false);
    } catch (error) { 
        console.error("Unblock error:", error.message);
    } finally { setIsProcessing(false); }
  };

  // 6. Send Message
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (connectionStatus !== 'accepted') return;
    
    const msgText = inputValue;
    const imageToUpload = imageFile;
    const replyToId = replyingTo?.id;

    if (!msgText.trim() && !imageToUpload) return;

    const optimisticId = Date.now(); 
    setMessages((prev) => [...prev, { id: optimisticId, sender_id: currentUserId, receiver_id: activeChat.id, text: msgText, image_url: imagePreview, replied_message: replyingTo, created_at: new Date().toISOString(), isSending: true }]);
    
    setInputValue("");
    setImageFile(null);
    setImagePreview(null);
    setReplyingTo(null);
    if (imageInputRef.current) imageInputRef.current.value = "";

    try {
      let imageUrl = null;
      if (imageToUpload) {
        const fileExt = imageToUpload.name.split('.').pop();
        const fileName = `msg-${Date.now()}.${fileExt}`;
        const filePath = `${currentUserId}/${fileName}`;

        const { error: uploadError } = await supabase.storage.from('chat_images').upload(filePath, imageToUpload);
        if (uploadError) throw uploadError;
        
        const { data: urlData } = supabase.storage.from('chat_images').getPublicUrl(filePath);
        imageUrl = urlData.publicUrl;
      }

      const { error } = await supabase.from('messages').insert({ 
        sender_id: currentUserId, 
        receiver_id: activeChat.id, 
        text: msgText.trim() || "",
        image_url: imageUrl,
        reply_to_message_id: replyToId
      });
      if (error) throw error;
    } catch (err) {
      setMessages((prev) => prev.filter(m => m.id !== optimisticId));
      alert("Failed to send message: " + err.message);
    }
  };

  if (!currentUserId) return <div className="p-10 text-gray-500 font-bold uppercase text-xs text-center">Node Unauthorized</div>;

  // Handle Image attach
  const handleFileChange = (event) => {
    const file = event.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = (e) => {
    e.stopPropagation();
    setImageFile(null);
    setImagePreview(null);
    if (imageInputRef.current) imageInputRef.current.value = "";
  };

  const filteredContacts = contacts.filter(c => 
    c.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="w-full flex h-[calc(100vh-180px)] bg-transparent overflow-hidden relative">
      
      {/* BLOCK MODAL */}
      {showBlockConfirm && (
        <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-md z-[200] flex items-center justify-center p-4">
          <div className="bg-white border border-gray-200 w-full max-w-sm rounded-2xl p-8 shadow-xl text-center animate-in fade-in zoom-in duration-200">
            <div className="w-16 h-16 bg-orange-50 border border-orange-100 text-orange-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <ShieldAlert size={32} />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Sever Connection?</h3>
            <p className="text-gray-600 text-sm mb-8 leading-relaxed">Block @{activeChat.username}. Connection will be terminated until you re-authorize this node.</p>
            <div className="flex flex-col gap-3">
              <button onClick={handleBlockUser} disabled={isProcessing} className="w-full bg-orange-600 hover:bg-orange-500 text-white font-bold py-3 rounded-xl transition">{isProcessing ? 'Terminating...' : 'Confirm Block'}</button>
              <button onClick={() => setShowBlockConfirm(false)} className="w-full bg-gray-50 text-gray-700 font-bold py-3 rounded-xl transition border border-gray-200 hover:bg-gray-100">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Sidebar: Contacts */}
      <div className={`w-full md:w-64 lg:w-72 border-r-0 md:border-r border-gray-200 flex-col md:pr-2 shrink-0 ${isMobileChatOpen ? 'hidden md:flex' : 'flex'}`}>
        <div className="pb-4 px-2">
          <h2 className="text-2xl font-black text-gray-900 tracking-tighter mb-3">Messages</h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search connections..." 
              className="w-full bg-white border border-gray-300 rounded-xl py-2 pl-9 text-base md:text-xs text-gray-900 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" 
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto space-y-1 custom-scrollbar px-2">
          {filteredContacts.length === 0 && (
            <div className="text-center text-xs text-gray-500 font-bold mt-10 px-4">
              No connections found. Follow nodes to open channels.
            </div>
          )}
          {filteredContacts.map((contact) => (
            <div key={contact.id} onClick={() => { setActiveChat(contact); setShowMoreMenu(false); setIsMobileChatOpen(true); }} className={`flex items-center gap-3 p-3 cursor-pointer transition-all rounded-xl border ${activeChat?.id === contact.id ? 'bg-blue-50 border-blue-200' : 'hover:bg-gray-50 border-transparent'}`}>
              <div 
                className="relative w-10 h-10 rounded-xl bg-gray-100 border border-gray-200 flex items-center justify-center text-blue-600 font-bold hover:bg-blue-50 transition-colors overflow-hidden shrink-0"
                onClick={(e) => { e.stopPropagation(); setSelectedUserId(contact.id); }}
                title={`View @${contact.username}'s Profile`}
              >
                {contact.avatar_url ? (
                  <Image src={contact.avatar_url} alt="avatar" fill sizes="40px" className="object-cover" />
                ) : (
                  contact.username[0].toUpperCase()
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-bold text-gray-900 truncate group-hover:text-blue-600 transition-colors">{contact.username}</h4>
                <p className="text-[10px] text-gray-500 truncate font-mono uppercase tracking-widest">{contact.status || 'Active'}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className={`flex-1 flex-col min-w-0 md:pl-4 md:mr-2 ${!isMobileChatOpen ? 'hidden md:flex' : 'flex'}`}>
        {activeChat ? (
          <>
            <div className="pb-3 border-b border-gray-200 flex items-center justify-between relative overflow-visible">
              <div className="flex items-center gap-3">
                <button onClick={() => setIsMobileChatOpen(false)} className="md:hidden p-1.5 -ml-1.5 text-gray-500 hover:text-gray-900 transition-colors">
                  <ChevronLeft size={22} />
                </button>
                <div 
                  className="relative w-9 h-9 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 font-bold cursor-pointer hover:bg-blue-100 transition-colors overflow-hidden shrink-0"
                  onClick={() => setSelectedUserId(activeChat.id)}
                  title={`View @${activeChat.username}'s Profile`}
                >
                  {activeChat.avatar_url ? (
                    <Image src={activeChat.avatar_url} alt="avatar" fill sizes="36px" className="object-cover" />
                  ) : (
                    activeChat.username[0].toUpperCase()
                  )}
                </div>
                <div className="cursor-pointer group" onClick={() => setSelectedUserId(activeChat.id)}>
                  <h3 className="text-sm font-bold text-gray-900 leading-tight group-hover:text-blue-600 transition-colors">{activeChat.username}</h3>
                  <div className="flex items-center gap-1">
                    <div className={`w-1.5 h-1.5 ${connectionStatus === 'blocked' ? 'bg-red-500' : 'bg-green-500'} rounded-full animate-pulse`}></div>
                    <p className="text-[9px] text-gray-500 font-bold uppercase tracking-tighter">{connectionStatus === 'blocked' ? 'Severed' : 'Online'}</p>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-1 text-gray-500 relative">
                <button className="p-1.5 hover:text-gray-900 transition-colors"><Phone size={16} /></button>
                <button className="p-1.5 hover:text-gray-900 transition-colors"><Video size={16} /></button>
                <div className="relative">
                  <button onClick={() => setShowMoreMenu(!showMoreMenu)} className={`p-1.5 transition-colors ${showMoreMenu ? 'text-gray-900' : 'hover:text-gray-900'}`}><MoreHorizontal size={18} /></button>
                  {showMoreMenu && (
                    <div className="absolute top-10 right-0 w-48 bg-white border border-gray-200 rounded-xl shadow-xl z-[150] py-2 animate-in fade-in slide-in-from-top-2">
                      {connectionStatus === 'blocked' && blockerId === currentUserId ? (
                         <button onClick={handleUnblockUser} className="w-full flex items-center gap-3 px-4 py-2.5 text-xs text-green-600 hover:bg-green-50 transition-all font-bold"><ShieldCheck size={14} /> UNBLOCK NODE</button>
                      ) : (
                        <button onClick={() => setShowBlockConfirm(true)} className="w-full flex items-center gap-3 px-4 py-2.5 text-xs text-orange-600 hover:bg-orange-50 transition-all font-bold"><ShieldAlert size={14} /> BLOCK NODE</button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div ref={scrollRef} className="flex-1 overflow-y-auto py-4 space-y-4 no-scrollbar scroll-smooth flex flex-col">
              {connectionStatus === 'accepted' ? (
                messages.map((msg) => (
                  <div key={msg.id} className={`flex gap-2 group ${msg.sender_id === currentUserId ? "justify-end" : "justify-start"}`}>
                    {msg.sender_id !== currentUserId && (
                      <div className="flex items-end">
                        <button onClick={() => setReplyingTo(msg)} className="p-2 text-gray-400 hover:text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity">
                          <MessageSquare size={14} />
                        </button>
                      </div>
                    )}
                    <div className={`max-w-[85%] ${msg.sender_id === currentUserId ? "text-right" : "text-left"}`}>
                      <div className={`inline-block p-1 rounded-2xl text-[13px] break-words text-left shadow-sm ${msg.sender_id === currentUserId ? "bg-blue-600 text-white rounded-tr-none" : "bg-gray-100 text-gray-800 border border-gray-200 rounded-tl-none"} ${msg.isSending ? "opacity-70" : "opacity-100"}`}>
                        <div className="px-3 pt-1.5 pb-2">
                          {msg.replied_message && (
                            <div className="border-l-2 border-blue-200 pl-2 mb-2 text-xs opacity-80">
                              <p className="font-bold text-current">@{msg.replied_message.sender_id === currentUserId ? 'You' : activeChat.username}</p>
                              <p className="text-current/80 line-clamp-1">{msg.replied_message.text || 'Image'}</p>
                            </div>
                          )}
                          {msg.image_url && (
                            <div className="relative w-full min-w-[200px] aspect-video rounded-lg overflow-hidden my-2 cursor-pointer" onClick={() => window.open(msg.image_url, '_blank')}>
                              <Image src={msg.image_url} alt="attachment" fill sizes="(max-width: 768px) 100vw, 400px" className="object-cover" />
                            </div>
                          )}
                          {msg.text && <p className="whitespace-pre-wrap">{msg.text}</p>}
                        </div>
                      </div>
                      <div className={`mt-1 flex items-center gap-1.5 text-[9px] text-gray-600 px-1 ${msg.sender_id === currentUserId ? "justify-end" : "justify-start"}`}>
                        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        {msg.sender_id === currentUserId && <CheckCheck size={12} className={msg.isSending ? "text-gray-600" : "text-blue-500"} />}
                      </div>
                    </div>
                    {msg.sender_id === currentUserId && (
                      <div className="flex items-end">
                        <button onClick={() => setReplyingTo(msg)} className="p-2 text-gray-400 hover:text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity">
                          <MessageSquare size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4">
                  {connectionStatus === 'blocked' ? (
                    <>
                      <div className="w-16 h-16 bg-red-50 border border-red-100 rounded-full flex items-center justify-center text-red-600"><ShieldAlert size={32} /></div>
                      <p className="text-gray-500 text-sm font-bold uppercase tracking-tighter">Connection Severed</p>
                      {blockerId === currentUserId ? (
                        <button onClick={handleUnblockUser} className="text-blue-500 text-xs font-black uppercase hover:underline">Re-authorize Link</button>
                      ) : (
                        <p className="text-gray-500 text-xs italic font-mono">Channel locked by peer user.</p>
                      )}
                    </>
                  ) : connectionStatus === 'none' ? (
                    <><div className="w-16 h-16 bg-blue-50 border border-blue-100 rounded-full flex items-center justify-center text-blue-600"><UserPlus size={32} /></div><p className="text-gray-500 text-sm font-bold uppercase tracking-tighter">Transmission blocked</p><button onClick={handleSendRequest} className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-3 rounded-xl font-bold">Send Request</button></>
                  ) : connectionStatus === 'waiting' ? (
                    <><div className="w-16 h-16 bg-gray-50 border border-gray-200 rounded-full flex items-center justify-center text-gray-400 animate-pulse"><Send size={32} /></div><p className="text-gray-500 text-xs italic font-mono uppercase tracking-tighter">Syncing... waiting for peer authorization.</p></>
                  ) : (
                    <><div className="w-16 h-16 bg-green-50 border border-green-100 rounded-full flex items-center justify-center text-green-600"><Check size={32} /></div><p className="text-gray-900 text-sm font-black tracking-tight uppercase">Connection Request Detected</p><div className="flex gap-3"><button onClick={handleAcceptRequest} className="bg-green-600 hover:bg-green-500 text-white px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all"><Check size={18} /> Accept</button><button onClick={() => { supabase.from('connections').delete().eq('id', activeConnectionId); setConnectionStatus('none'); }} className="bg-white border border-gray-300 hover:bg-red-50 text-gray-700 hover:text-red-600 px-6 py-2.5 rounded-xl font-bold transition-all">Ignore</button></div></>
                  )}
                </div>
              )}
            </div>

            <div className={`pt-3 pb-2 md:pb-0 transition-all duration-500 ${connectionStatus === 'accepted' ? 'opacity-100 translate-y-0' : 'opacity-10 translate-y-4 pointer-events-none'}`}>
              {replyingTo && (
                <div className="bg-gray-100 border border-gray-200 border-b-0 rounded-t-xl px-4 py-2 text-xs flex justify-between items-center animate-in fade-in slide-in-from-bottom-2 duration-200">
                  <div className="min-w-0">
                    <p className="text-gray-500">Replying to <span className="font-bold text-blue-600">@{replyingTo.sender_id === currentUserId ? 'You' : activeChat.username}</span></p>
                    <p className="text-gray-500 truncate">{replyingTo.text || 'Image'}</p>
                  </div>
                  <button onClick={() => setReplyingTo(null)} className="p-1 text-gray-500 hover:text-gray-900"><X size={16} /></button>
                </div>
              )}
              {imagePreview && (
                <div className="bg-gray-100 border border-gray-200 border-b-0 rounded-t-xl p-2 flex animate-in fade-in slide-in-from-bottom-2 duration-200">
                  <div className="relative w-16 h-16 rounded-lg overflow-hidden">
                    <Image src={imagePreview} alt="preview" fill sizes="64px" className="object-cover" />
                    <button onClick={handleRemoveImage} className="absolute top-1 right-1 bg-white/80 text-gray-900 rounded-full p-0.5"><X size={12} /></button>
                  </div>
                </div>
              )}
              <form onSubmit={handleSendMessage} className="flex items-center gap-2 bg-white border border-gray-300 rounded-2xl p-1.5 pl-4 focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500 transition-all shadow-sm">
                <input type="file" ref={imageInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
                <button type="button" onClick={() => imageInputRef.current?.click()} className="text-gray-400 hover:text-blue-600 transition-colors p-2">
                  <Paperclip size={18} />
                </button>
                <input value={inputValue} onChange={(e) => setInputValue(e.target.value)} placeholder={connectionStatus === 'accepted' ? `Message @${activeChat.username}...` : 'Channel Locked'} className="flex-1 bg-transparent border-none focus:outline-none text-base md:text-xs text-gray-900 py-2" />
                <button type="submit" className="bg-blue-600 hover:bg-blue-500 text-white p-2.5 rounded-xl transition-all shadow-lg shadow-blue-600/20"><Send size={16} strokeWidth={3} /></button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-600 text-xs font-black uppercase tracking-[4px] italic animate-pulse">Waiting for selection...</div>
        )}
      </div>

      {/* USER PROFILE MODAL */}
      {selectedUserId && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-gray-900/50 backdrop-blur-sm" onClick={() => setSelectedUserId(null)} />
          <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto no-scrollbar z-10 bg-white rounded-[2rem] border border-gray-200 shadow-xl">
            <button 
              onClick={() => setSelectedUserId(null)} 
              className="absolute top-6 right-6 z-[260] p-2 bg-gray-100 hover:bg-red-50 hover:text-red-600 rounded-full text-gray-500 transition-colors"
            >
              <X size={20} />
            </button>
            <div className="p-2 sm:p-6">
              <ProfileContent viewUserId={selectedUserId} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}