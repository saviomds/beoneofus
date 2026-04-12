"use client";

import { useState, useEffect, useRef } from "react";
import { 
  Search, MoreVertical, Phone, Video, Send, 
  Paperclip, CheckCheck, UserPlus, Check, X, 
  Trash2, AlertTriangle, MoreHorizontal, ShieldAlert, ShieldCheck,
  ChevronLeft
} from "lucide-react";
import { supabase } from "../../supabaseClient";

export default function MessagesContent() {
  const [contacts, setContacts] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState("");
  const [currentUserId, setCurrentUserId] = useState(null);
  
  // UI & Connection States
  const [connectionStatus, setConnectionStatus] = useState(null); 
  const [blockerId, setBlockerId] = useState(null);
  const [activeConnectionId, setActiveConnectionId] = useState(null); // Track the row ID for reliable updates
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showBlockConfirm, setShowBlockConfirm] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isMobileChatOpen, setIsMobileChatOpen] = useState(false); // Mobile view toggle

  const scrollRef = useRef(null);
  const channelRef = useRef(null);

  // 1. Initial Setup
  useEffect(() => {
    const initChat = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      setCurrentUserId(session.user.id);

      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username, status')
        .not('id', 'eq', session.user.id);
      
      setContacts(profiles || []);
      if (profiles?.length > 0) setActiveChat(profiles[0]);
    };
    initChat();
  }, []);

  // 2. Fetch Messages and Connection Logic
  useEffect(() => {
    if (!activeChat || !currentUserId) return;

    const checkConnectionAndFetch = async () => {
      const { data: connection } = await supabase
        .from('connections')
        .select('*')
        .or(`and(sender_id.eq.${currentUserId},receiver_id.eq.${activeChat.id}),and(sender_id.eq.${activeChat.id},receiver_id.eq.${currentUserId})`)
        .single();

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
        .select('*')
        .or(`and(sender_id.eq.${currentUserId},receiver_id.eq.${activeChat.id}),and(sender_id.eq.${activeChat.id},receiver_id.eq.${currentUserId})`)
        .order('created_at', { ascending: true });
      setMessages(data || []);
    };

    checkConnectionAndFetch();

    const channelId = `chat-${activeChat.id}`;
    channelRef.current = supabase
      .channel(channelId)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'connections' }, () => checkConnectionAndFetch())
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
        const newMessage = payload.new;
        if (newMessage.sender_id === activeChat.id || newMessage.receiver_id === activeChat.id) {
          setMessages((prev) => prev.find(m => m.id === newMessage.id) ? prev : [...prev, newMessage]);
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
    await supabase.from('connections').insert({
      sender_id: currentUserId,
      receiver_id: activeChat.id,
      status: 'pending'
    });
  };

  const handleAcceptRequest = async () => {
    if (!activeConnectionId) return;
    await supabase.from('connections').update({ status: 'accepted' }).eq('id', activeConnectionId);
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
    if (!inputValue.trim() || connectionStatus !== 'accepted') return;
    const msgText = inputValue;
    const optimisticId = Date.now(); 
    setMessages((prev) => [...prev, { id: optimisticId, sender_id: currentUserId, receiver_id: activeChat.id, text: msgText, created_at: new Date().toISOString(), isSending: true }]);
    setInputValue("");
    const { error } = await supabase.from('messages').insert({ sender_id: currentUserId, receiver_id: activeChat.id, text: msgText });
    if (error) setMessages((prev) => prev.filter(m => m.id !== optimisticId));
  };

  if (!currentUserId) return <div className="p-10 text-gray-500 font-bold uppercase text-xs text-center">Node Unauthorized</div>;

  return (
    <div className="w-full flex h-[calc(100vh-180px)] bg-transparent overflow-hidden relative">
      
      {/* BLOCK MODAL */}
      {showBlockConfirm && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-md z-[200] flex items-center justify-center p-4">
          <div className="bg-[#0D0D0D] border border-white/10 w-full max-w-sm rounded-2xl p-8 shadow-2xl text-center animate-in fade-in zoom-in duration-200">
            <div className="w-16 h-16 bg-orange-500/10 text-orange-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <ShieldAlert size={32} />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Sever Connection?</h3>
            <p className="text-gray-500 text-sm mb-8 leading-relaxed">Block @{activeChat.username}. Handshake will be terminated until you re-authorize this node.</p>
            <div className="flex flex-col gap-3">
              <button onClick={handleBlockUser} disabled={isProcessing} className="w-full bg-orange-600 hover:bg-orange-500 text-white font-bold py-3 rounded-xl transition">{isProcessing ? 'Terminating...' : 'Confirm Block'}</button>
              <button onClick={() => setShowBlockConfirm(false)} className="w-full bg-white/5 text-white font-bold py-3 rounded-xl transition border border-white/5">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Sidebar: Contacts */}
      <div className={`w-full md:w-64 lg:w-72 border-r-0 md:border-r border-white/5 flex-col md:pr-2 shrink-0 ${isMobileChatOpen ? 'hidden md:flex' : 'flex'}`}>
        <div className="pb-4 px-2">
          <h2 className="text-2xl font-black text-white tracking-tighter mb-3">Messages</h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={14} />
            <input type="text" placeholder="Search..." className="w-full bg-[#0F0F0F] border border-white/5 rounded-xl py-2 pl-9 text-xs text-white outline-none focus:border-blue-500/30 transition-all" />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto space-y-1 custom-scrollbar px-2">
          {contacts.map((contact) => (
            <div key={contact.id} onClick={() => { setActiveChat(contact); setShowMoreMenu(false); setIsMobileChatOpen(true); }} className={`flex items-center gap-3 p-3 cursor-pointer transition-all rounded-xl border ${activeChat?.id === contact.id ? 'bg-blue-600/10 border-blue-500/20' : 'hover:bg-white/5 border-transparent'}`}>
              <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-blue-400 font-bold">{contact.username[0].toUpperCase()}</div>
              <div className="flex-1 min-w-0">
                <h4 className="text-xs font-bold text-white truncate">{contact.username}</h4>
                <p className="text-[10px] text-gray-500 truncate font-mono uppercase tracking-tighter">{contact.status || 'Active'}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className={`flex-1 flex-col min-w-0 md:pl-4 md:mr-2 ${!isMobileChatOpen ? 'hidden md:flex' : 'flex'}`}>
        {activeChat ? (
          <>
            <div className="pb-3 border-b border-white/5 flex items-center justify-between relative overflow-visible">
              <div className="flex items-center gap-3">
                <button onClick={() => setIsMobileChatOpen(false)} className="md:hidden p-1.5 -ml-1.5 text-gray-500 hover:text-white transition-colors">
                  <ChevronLeft size={22} />
                </button>
                <div className="w-9 h-9 rounded-lg bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-400 font-bold">{activeChat.username[0].toUpperCase()}</div>
                <div>
                  <h3 className="text-sm font-bold text-white leading-tight">{activeChat.username}</h3>
                  <div className="flex items-center gap-1">
                    <div className={`w-1.5 h-1.5 ${connectionStatus === 'blocked' ? 'bg-red-500' : 'bg-green-500'} rounded-full animate-pulse`}></div>
                    <p className="text-[9px] text-gray-500 font-bold uppercase tracking-tighter">{connectionStatus === 'blocked' ? 'Severed' : 'Online'}</p>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-1 text-gray-500 relative">
                <button className="p-1.5 hover:text-white transition-colors"><Phone size={16} /></button>
                <button className="p-1.5 hover:text-white transition-colors"><Video size={16} /></button>
                <div className="relative">
                  <button onClick={() => setShowMoreMenu(!showMoreMenu)} className={`p-1.5 transition-colors ${showMoreMenu ? 'text-white' : 'hover:text-white'}`}><MoreHorizontal size={18} /></button>
                  {showMoreMenu && (
                    <div className="absolute top-10 right-0 w-48 bg-[#111111] border border-white/10 rounded-xl shadow-2xl z-[150] py-2 animate-in fade-in slide-in-from-top-2">
                      {connectionStatus === 'blocked' && blockerId === currentUserId ? (
                         <button onClick={handleUnblockUser} className="w-full flex items-center gap-3 px-4 py-2.5 text-xs text-green-400 hover:bg-green-400/10 transition-all font-bold"><ShieldCheck size={14} /> UNBLOCK NODE</button>
                      ) : (
                        <button onClick={() => setShowBlockConfirm(true)} className="w-full flex items-center gap-3 px-4 py-2.5 text-xs text-orange-400 hover:bg-orange-400/10 transition-all font-bold"><ShieldAlert size={14} /> BLOCK NODE</button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div ref={scrollRef} className="flex-1 overflow-y-auto py-4 space-y-4 no-scrollbar scroll-smooth flex flex-col">
              {connectionStatus === 'accepted' ? (
                messages.map((msg) => (
                  <div key={msg.id} className={`flex ${msg.sender_id === currentUserId ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[85%] ${msg.sender_id === currentUserId ? "text-right" : "text-left"}`}>
                      <div className={`inline-block px-4 py-2.5 rounded-2xl text-[13px] break-words text-left ${msg.sender_id === currentUserId ? "bg-blue-600 text-white rounded-tr-none shadow-lg" : "bg-[#111111] text-gray-300 border border-white/5 rounded-tl-none"} ${msg.isSending ? "opacity-70" : "opacity-100"}`}>{msg.text}</div>
                      <div className="mt-1 flex items-center gap-1.5 text-[9px] text-gray-600 px-1 justify-end">{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}{msg.sender_id === currentUserId && <CheckCheck size={12} className={msg.isSending ? "text-gray-600" : "text-blue-500"} />}</div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4">
                  {connectionStatus === 'blocked' ? (
                    <>
                      <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center text-red-500"><ShieldAlert size={32} /></div>
                      <p className="text-gray-400 text-sm font-bold uppercase tracking-tighter">Handshake Severed</p>
                      {blockerId === currentUserId ? (
                        <button onClick={handleUnblockUser} className="text-blue-500 text-xs font-black uppercase hover:underline">Re-authorize Link</button>
                      ) : (
                        <p className="text-gray-600 text-xs italic font-mono">Channel locked by peer node.</p>
                      )}
                    </>
                  ) : connectionStatus === 'none' ? (
                    <><div className="w-16 h-16 bg-blue-600/10 rounded-full flex items-center justify-center text-blue-500"><UserPlus size={32} /></div><p className="text-gray-400 text-sm font-bold uppercase tracking-tighter">Transmission blocked</p><button onClick={handleSendRequest} className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-3 rounded-xl font-bold">Send Request</button></>
                  ) : connectionStatus === 'waiting' ? (
                    <><div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center text-gray-500 animate-pulse"><Send size={32} /></div><p className="text-gray-500 text-xs italic font-mono uppercase tracking-tighter">Syncing... waiting for peer authorization.</p></>
                  ) : (
                    <><div className="w-16 h-16 bg-green-600/10 rounded-full flex items-center justify-center text-green-500"><Check size={32} /></div><p className="text-white text-sm font-black tracking-tight uppercase">Handshake Request Detected</p><div className="flex gap-3"><button onClick={handleAcceptRequest} className="bg-green-600 hover:bg-green-500 text-white px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all"><Check size={18} /> Accept</button><button onClick={() => { supabase.from('connections').delete().eq('id', activeConnectionId); setConnectionStatus('none'); }} className="bg-white/5 hover:bg-red-500/10 text-gray-400 hover:text-red-500 px-6 py-2.5 rounded-xl font-bold transition-all border border-white/5">Ignore</button></div></>
                  )}
                </div>
              )}
            </div>

            <div className={`pt-3 pb-2 md:pb-0 transition-all duration-500 ${connectionStatus === 'accepted' ? 'opacity-100 translate-y-0' : 'opacity-10 translate-y-4 pointer-events-none'}`}>
              <form onSubmit={handleSendMessage} className="flex items-center gap-2 bg-[#0F0F0F] border border-white/5 rounded-2xl p-1.5 pl-4 focus-within:border-blue-500/30 transition-all">
                <button type="button" className="text-gray-600 hover:text-gray-400 transition-colors"><Paperclip size={18} /></button>
                <input value={inputValue} onChange={(e) => setInputValue(e.target.value)} placeholder={connectionStatus === 'accepted' ? `Secure packet to @${activeChat.username}...` : 'Channel Locked'} className="flex-1 bg-transparent border-none focus:outline-none text-xs text-white py-2" />
                <button type="submit" className="bg-blue-600 hover:bg-blue-500 text-white p-2.5 rounded-xl transition-all shadow-lg shadow-blue-600/20"><Send size={16} strokeWidth={3} /></button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-600 text-xs font-black uppercase tracking-[4px] italic animate-pulse">Waiting for selection...</div>
        )}
      </div>
    </div>
  );
}