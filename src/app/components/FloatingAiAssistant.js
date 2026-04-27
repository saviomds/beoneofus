"use client";

import { useState, useRef, useEffect } from "react";
import { Bot, Send, User, Loader2, X, Sparkles } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import { supabase } from "../supabaseClient";

const floatingMarkdownComponents = {
  p: ({ node, ...props }) => <p className="mb-2 last:mb-0 leading-relaxed" {...props} />,
  ul: ({ node, ...props }) => <ul className="list-disc ml-4 mb-2 space-y-1" {...props} />,
  ol: ({ node, ...props }) => <ol className="list-decimal ml-4 mb-2 space-y-1" {...props} />,
  li: ({ node, ...props }) => <li className="pl-1" {...props} />,
  h1: ({ node, ...props }) => <h1 className="text-sm font-black mb-2 mt-3" {...props} />,
  h2: ({ node, ...props }) => <h2 className="text-sm font-bold mb-2 mt-3" {...props} />,
  h3: ({ node, ...props }) => <h3 className="text-xs font-bold mb-1 mt-2" {...props} />,
  a: ({ node, ...props }) => <a className="text-blue-600 dark:text-blue-400 hover:underline" target="_blank" rel="noopener noreferrer" {...props} />,
  strong: ({ node, ...props }) => <strong className="font-bold text-gray-900 dark:text-gray-100" {...props} />,
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

function TypewriterMessage({ content, onUpdate }) {
  const [displayedContent, setDisplayedContent] = useState("");
  useEffect(() => {
    let i = 0;
    const timer = setInterval(() => {
      setDisplayedContent(content.slice(0, i + 1));
      i++;
      if (onUpdate) onUpdate();
      if (i >= content.length) clearInterval(timer);
    }, 15);
    return () => clearInterval(timer);
  }, [content, onUpdate]);
  return <ReactMarkdown components={floatingMarkdownComponents}>{displayedContent}</ReactMarkdown>;
}

export default function FloatingAiAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingHistory, setIsFetchingHistory] = useState(false);
  const messagesEndRef = useRef(null);

  // Auto-scroll to bottom of chat
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Fetch chat history only once when the widget is opened
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      const fetchHistory = async () => {
        setIsFetchingHistory(true);
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          const { data, error } = await supabase
            .from('ai_chat_messages')
            .select('role, content')
            .eq('user_id', session.user.id)
            .order('created_at', { ascending: true });
            
          if (!error && data && data.length > 0) {
            setMessages(data);
          } else {
            setMessages([{ role: "assistant", content: "Hello! I am beoneofus AI. How can I help you today?" }]);
          }
        } else {
          setMessages([{ role: "assistant", content: "Hello! I am beoneofus AI. How can I help you today?" }]);
        }
        setIsFetchingHistory(false);
      };
      fetchHistory();
    }
  }, [isOpen, messages.length]);

  useEffect(() => {
    if (isOpen) scrollToBottom();
  }, [messages, isOpen]);

  const sendMessage = async (e) => {
    e?.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = { role: "user", content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        await supabase.from('ai_chat_messages').insert({
          user_id: session.user.id,
          role: "user",
          content: userMessage.content
        });
      }

      const res = await fetch("/api/chats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [...messages, userMessage] }),
      });

      const text = await res.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        console.error("API returned non-JSON:", text);
        throw new Error("The API route is not active. Please fully restart your Next.js development server (Ctrl+C then npm run dev).");
      }

      if (!res.ok) throw new Error(data.error || "Failed to fetch response");

      setMessages((prev) => [...prev, { ...data.message, isNew: true }]);

      if (session) {
        await supabase.from('ai_chat_messages').insert({
          user_id: session.user.id,
          role: "assistant",
          content: data.message.content
        });
      }
    } catch (error) {
      console.error(error);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: `System Error: ${error.message}` },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col items-end">
      {/* Chat Window */}
      {isOpen && (
        <div className="w-[350px] sm:w-[400px] h-[500px] max-h-[80vh] bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-[2rem] shadow-2xl overflow-hidden flex flex-col mb-4 animate-in fade-in slide-in-from-bottom-10 duration-300">
          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-800 bg-gray-50/90 dark:bg-gray-800/90 backdrop-blur-md z-10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gray-900 dark:bg-gray-700 flex items-center justify-center text-white shadow-sm border border-gray-800 dark:border-gray-600">
                <Bot size={20} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">beoneofus AI</h3>
                <p className="text-[10px] text-gray-500 dark:text-gray-400 font-medium uppercase tracking-widest">Online</p>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} className="text-gray-400 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-gray-700 p-2 rounded-full transition-colors">
              <X size={18} />
            </button>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-5 space-y-5 bg-white dark:bg-gray-900">
            {isFetchingHistory ? (
              <div className="flex flex-col items-center justify-center h-full space-y-3 text-gray-400 dark:text-gray-500">
                <Loader2 size={24} className="animate-spin text-blue-500" />
                <span className="text-xs font-medium">Loading history...</span>
              </div>
            ) : (
              <>
                {messages.map((msg, index) => (
                  <div key={index} className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-sm ${msg.role === "user" ? "bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400" : "bg-gray-900 dark:bg-gray-700 text-white"}`}>
                      {msg.role === "user" ? <User size={14} /> : <Bot size={14} />}
                    </div>
                    <div className={`max-w-[80%] rounded-2xl p-3.5 text-xs ${msg.role === "user" ? "bg-blue-600 text-white shadow-md shadow-blue-500/20 whitespace-pre-wrap" : "bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 text-gray-800 dark:text-gray-200"}`}>
                      {msg.role === "user" ? (
                        msg.content
                      ) : msg.isNew ? (
                        <TypewriterMessage content={msg.content} onUpdate={scrollToBottom} />
                      ) : (
                        <ReactMarkdown components={floatingMarkdownComponents}>{msg.content}</ReactMarkdown>
                      )}
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="flex gap-3 flex-row">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 bg-gray-900 dark:bg-gray-700 text-white shadow-sm">
                      <Bot size={14} />
                    </div>
                    <div className="rounded-2xl p-3.5 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 text-gray-800 dark:text-gray-200 flex items-center gap-2">
                      <Loader2 size={14} className="animate-spin text-gray-900 dark:text-gray-100" /> <span className="text-[10px] text-gray-500 dark:text-gray-400 font-medium">Thinking...</span>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          {/* Input Area */}
          <div className="p-4 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800">
            <form onSubmit={sendMessage} className="flex items-center gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask beoneofus AI..."
                className="flex-1 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 text-xs rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/10 transition-all"
                disabled={isLoading || isFetchingHistory}
              />
              <button
                type="submit"
                disabled={!input.trim() || isLoading || isFetchingHistory}
                className="bg-gray-900 dark:bg-gray-700 hover:bg-gray-800 dark:hover:bg-gray-600 disabled:opacity-50 disabled:hover:bg-gray-900 dark:disabled:hover:bg-gray-700 text-white rounded-xl p-3 transition-all shadow-sm shrink-0"
              >
                <Send size={16} className={isLoading ? "opacity-50" : ""} />
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-14 h-14 rounded-full flex items-center justify-center text-white shadow-2xl hover:scale-105 active:scale-95 transition-all border-[3px] border-white dark:border-gray-800 ${isOpen ? 'bg-gray-900 dark:bg-gray-700' : 'bg-blue-600 hover:bg-blue-500'}`}
      >
        {isOpen ? <X size={24} /> : <Sparkles size={24} />}
      </button>
    </div>
  );
}