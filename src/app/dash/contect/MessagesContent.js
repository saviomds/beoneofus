"use client";

import { useState, useEffect, useRef } from "react";
import { Search, MoreVertical, Phone, Video, Send, Paperclip, CheckCheck } from "lucide-react";
import { supabase } from "../../supabaseClient";

export default function MessagesContent() {
  const [contacts, setContacts] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState("");
  const [currentUserId, setCurrentUserId] = useState(null);
  
  const scrollRef = useRef(null);

  // 1. Initial Setup: Get User and Contacts
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

  // 2. Fetch Messages and Listen for Realtime
  useEffect(() => {
    if (!activeChat || !currentUserId) return;

    const fetchMessages = async () => {
      const { data } = await supabase
        .from('messages')
        .select('*')
        .or(`and(sender_id.eq.${currentUserId},receiver_id.eq.${activeChat.id}),and(sender_id.eq.${activeChat.id},receiver_id.eq.${currentUserId})`)
        .order('created_at', { ascending: true });
      setMessages(data || []);
    };

    fetchMessages(); // FIXED: Changed from fetchPosts to fetchMessages

    const channel = supabase
      .channel(`realtime-chat-${activeChat.id}`)
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'messages' 
      }, (payload) => {
        const newMessage = payload.new;
        const isFromActive = newMessage.sender_id === activeChat.id || newMessage.receiver_id === activeChat.id;
        
        if (isFromActive) {
          setMessages((prev) => {
            if (prev.find(m => m.id === newMessage.id)) return prev;
            return [...prev, newMessage];
          });
        }
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [activeChat, currentUserId]);

  // 3. Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // 4. Send Message (Optimistic Logic)
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputValue.trim() || !activeChat || !currentUserId) return;

    const messageText = inputValue;
    const optimisticId = Date.now(); 

    const optimisticMsg = {
      id: optimisticId,
      sender_id: currentUserId,
      receiver_id: activeChat.id,
      text: messageText,
      created_at: new Date().toISOString(),
      isSending: true 
    };

    setMessages((prev) => [...prev, optimisticMsg]);
    setInputValue("");

    const { error } = await supabase.from('messages').insert({
      sender_id: currentUserId,
      receiver_id: activeChat.id,
      text: messageText
    });

    if (error) {
      alert("Failed to send: " + error.message);
      setMessages((prev) => prev.filter(m => m.id !== optimisticId));
    }
  };

  if (!currentUserId) return <div className="p-10 text-gray-500">Authentication Required...</div>;

  return (
    <div className="w-full flex h-[calc(100vh-180px)] bg-transparent overflow-hidden">
      
      {/* Sidebar: Contacts */}
      <div className="w-64 md:w-72 border-r border-white/5 flex flex-col pr-2">
        <div className="pb-4">
          <h2 className="text-2xl font-black text-white tracking-tighter mb-3">Messages</h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={14} />
            <input type="text" placeholder="Search..." className="w-full bg-[#0F0F0F] border border-white/5 rounded-xl py-2 pl-9 text-xs text-white outline-none" />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto space-y-1 custom-scrollbar">
          {contacts.map((contact) => (
            <div 
              key={contact.id}
              onClick={() => setActiveChat(contact)}
              className={`flex items-center gap-3 p-3 cursor-pointer transition-all rounded-xl border ${
                activeChat?.id === contact.id ? 'bg-blue-600/10 border-blue-500/20' : 'hover:bg-white/5 border-transparent'
              }`}
            >
              <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-blue-400 font-bold">
                {contact.username[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-xs font-bold text-white truncate">{contact.username}</h4>
                <p className="text-[10px] text-gray-500 truncate">{contact.status || 'Active'}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col pl-4 min-w-0">
        {activeChat ? (
          <>
            <div className="pb-3 border-b border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-400 font-bold">
                  {activeChat.username[0].toUpperCase()}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white leading-tight">{activeChat.username}</h3>
                  <div className="flex items-center gap-1">
                    <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                    <p className="text-[9px] text-green-500 font-bold uppercase">Online</p>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1 text-gray-500">
                <button className="p-1.5 hover:text-white"><Phone size={16} /></button>
                <button className="p-1.5 hover:text-white"><Video size={16} /></button>
                <button className="p-1.5 hover:text-white"><MoreVertical size={16} /></button>
              </div>
            </div>

            <div 
              ref={scrollRef}
              className="flex-1 overflow-y-auto py-4 space-y-4 no-scrollbar scroll-smooth"
            >
              {messages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.sender_id === currentUserId ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[85%] ${msg.sender_id === currentUserId ? "text-right" : "text-left"}`}>
                    <div className={`inline-block px-4 py-2.5 rounded-2xl text-[13px] ${
                      msg.sender_id === currentUserId 
                      ? "bg-blue-600 text-white rounded-tr-none shadow-lg" 
                      : "bg-[#111111] text-gray-300 border border-white/5 rounded-tl-none"
                    } ${msg.isSending ? "opacity-70" : "opacity-100"}`}>
                      {msg.text}
                    </div>
                    <div className="mt-1 flex items-center gap-1.5 text-[9px] text-gray-600 px-1 justify-end">
                      {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      {msg.sender_id === currentUserId && <CheckCheck size={12} className={msg.isSending ? "text-gray-600" : "text-blue-500"} />}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-3">
              <form onSubmit={handleSendMessage} className="flex items-center gap-2 bg-[#0F0F0F] border border-white/5 rounded-2xl p-1.5 pl-4">
                <button type="button" className="text-gray-600 hover:text-gray-400"><Paperclip size={18} /></button>
                <input 
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder={`Write to @${activeChat.username}...`} 
                  className="flex-1 bg-transparent border-none focus:outline-none text-xs text-white py-2"
                />
                <button type="submit" className="bg-blue-600 hover:bg-blue-500 text-white p-2 rounded-xl transition-all shadow-lg shadow-blue-600/20">
                  <Send size={16} strokeWidth={2.5} />
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-600 text-sm italic">
            Select a contact to begin transmission.
          </div>
        )}
      </div>
    </div>
  );
}