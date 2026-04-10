"use client";

import { useState } from "react";
import { 
  Search, 
  MoreVertical, 
  Phone, 
  Video, 
  Send, 
  Paperclip, 
  Smile, 
  CheckCheck 
} from "lucide-react";

const CONTACTS = [
  { id: 1, name: "Alex Rivera", lastMsg: "The API is ready for testing.", time: "10:24 AM", online: true, unread: 2 },
  { id: 2, name: "Sarah Chen", lastMsg: "Did you see the new design?", time: "9:15 AM", online: false, unread: 0 },
  { id: 3, name: "Mauritius Dev Group", lastMsg: "Meeting at Bagatelle tomorrow?", time: "Yesterday", online: true, unread: 0 },
];

const INITIAL_MESSAGES = [
  { id: 1, sender: "them", text: "Hey! How's the SAVIOMDS project coming along?", time: "10:00 AM" },
  { id: 2, sender: "me", text: "Going well! Just finished the groups integration. Working on the chat now.", time: "10:02 AM" },
  { id: 3, sender: "them", text: "Awesome. Let me know if you need help with the Supabase webhooks.", time: "10:05 AM" },
];

export default function MessagesContent() {
  const [activeChat, setActiveChat] = useState(CONTACTS[0]);
  const [messages, setMessages] = useState(INITIAL_MESSAGES);
  const [inputValue, setInputValue] = useState("");

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!inputValue.trim()) return;
    
    setMessages([...messages, {
      id: Date.now(),
      sender: "me",
      text: inputValue,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }]);
    setInputValue("");
  };

  return (
    /* flex-1 ensures it only takes available space between sidebars */
    <div className="w-full flex h-[calc(100vh-180px)] bg-transparent overflow-hidden">
      
      {/* --- Sidebar (Contacts) - Narrower width to save space --- */}
      <div className="w-64 md:w-72 border-r border-white/5 flex flex-col pr-2">
        <div className="pb-4">
          <h2 className="text-2xl font-black text-white tracking-tighter mb-3">Messages</h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={14} />
            <input 
              type="text" 
              placeholder="Search..." 
              className="w-full bg-[#0F0F0F] border border-white/5 rounded-xl py-2 pl-9 pr-3 text-xs text-gray-200 focus:outline-none focus:border-blue-500/30 transition-all"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto space-y-1 custom-scrollbar">
          {CONTACTS.map((contact) => (
            <div 
              key={contact.id}
              onClick={() => setActiveChat(contact)}
              className={`flex items-center gap-3 p-3 cursor-pointer transition-all rounded-xl border ${
                activeChat.id === contact.id 
                ? 'bg-blue-600/10 border-blue-500/20 shadow-sm' 
                : 'hover:bg-white/5 border-transparent'
              }`}
            >
              <div className="relative flex-shrink-0">
                <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-blue-400 text-xs font-bold">
                  {contact.name[0]}
                </div>
                {contact.online && <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 border-2 border-black rounded-full"></div>}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-baseline">
                  <h4 className="text-xs font-bold text-white truncate">{contact.name}</h4>
                  <span className="text-[9px] text-gray-600">{contact.time}</span>
                </div>
                <p className="text-[11px] text-gray-500 truncate mt-0.5">{contact.lastMsg}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* --- Main Chat Area - Removed extra padding to avoid right-margin crash --- */}
      <div className="flex-1 flex flex-col pl-4 min-w-0">
        
        {/* Chat Header - Compact */}
        <div className="pb-3 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-400 text-xs font-bold">
              {activeChat.name[0]}
            </div>
            <div>
              <h3 className="text-sm font-bold text-white leading-tight">{activeChat.name}</h3>
              <p className="text-[9px] text-green-500 font-bold uppercase tracking-tighter">Online</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button className="p-1.5 text-gray-500 hover:text-white transition-colors"><Phone size={16} /></button>
            <button className="p-1.5 text-gray-500 hover:text-white transition-colors"><Video size={16} /></button>
            <button className="p-1.5 text-gray-500 hover:text-white transition-colors"><MoreVertical size={16} /></button>
          </div>
        </div>

        {/* Messages Feed */}
        <div className="flex-1 overflow-y-auto py-4 space-y-4 custom-scrollbar">
          {messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.sender === "me" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[85%] ${msg.sender === "me" ? "text-right" : "text-left"}`}>
                <div className={`inline-block px-4 py-2.5 rounded-2xl text-[13px] leading-snug ${
                  msg.sender === "me" 
                  ? "bg-blue-600 text-white rounded-tr-none shadow-md shadow-blue-600/5" 
                  : "bg-[#111111] text-gray-300 border border-white/5 rounded-tl-none"
                }`}>
                  {msg.text}
                </div>
                <div className="mt-1 flex items-center gap-1.5 text-[9px] text-gray-600 font-medium px-1">
                  {msg.time}
                  {msg.sender === "me" && <CheckCheck size={12} className="text-blue-500" />}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Input Bar - Slimmed down to prevent overflow */}
        <div className="pt-3">
          <form 
            onSubmit={handleSendMessage}
            className="flex items-center gap-2 bg-[#0F0F0F] border border-white/5 rounded-2xl p-1.5 pl-4 focus-within:border-white/10 transition-all"
          >
            <button type="button" className="text-gray-600 hover:text-gray-400 transition-colors"><Paperclip size={18} /></button>
            <input 
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Message..." 
              className="flex-1 bg-transparent border-none focus:outline-none text-xs text-white py-2 placeholder-gray-700"
            />
            <button 
              type="submit"
              className="bg-blue-600 hover:bg-blue-500 text-white p-2 rounded-xl transition-all"
            >
              <Send size={16} strokeWidth={2.5} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}