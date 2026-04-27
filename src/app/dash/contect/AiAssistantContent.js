"use client";

import { useState, useRef, useEffect } from "react";
import { Bot, Send, User, Loader2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import { supabase } from "../../supabaseClient";

const markdownComponents = {
  p: ({ node, ...props }) => <p className="mb-3 last:mb-0 leading-relaxed" {...props} />,
  ul: ({ node, ...props }) => <ul className="list-disc ml-5 mb-4 space-y-1" {...props} />,
  ol: ({ node, ...props }) => <ol className="list-decimal ml-5 mb-4 space-y-1" {...props} />,
  li: ({ node, ...props }) => <li className="pl-1" {...props} />,
  h1: ({ node, ...props }) => <h1 className="text-xl font-black mb-3 mt-5" {...props} />,
  h2: ({ node, ...props }) => <h2 className="text-lg font-bold mb-3 mt-5" {...props} />,
  h3: ({ node, ...props }) => <h3 className="text-base font-bold mb-2 mt-4" {...props} />,
  a: ({ node, ...props }) => <a className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 underline underline-offset-2" target="_blank" rel="noopener noreferrer" {...props} />,
  strong: ({ node, ...props }) => <strong className="font-bold text-gray-900 dark:text-gray-100" {...props} />,
  code({ node, inline, className, children, ...props }) {
    const match = /language-(\w+)/.exec(className || "");
    return !inline && match ? (
      <div className="rounded-xl overflow-hidden my-4 border border-gray-200 dark:border-gray-700 shadow-sm bg-[#1E1E1E]">
        <div className="bg-gray-800/80 px-4 py-2 text-[10px] font-mono text-gray-400 uppercase tracking-widest flex justify-between items-center border-b border-white/5">
          <span>{match[1]}</span>
        </div>
        <SyntaxHighlighter
          {...props}
          style={vscDarkPlus}
          language={match[1]}
          PreTag="div"
          customStyle={{ margin: 0, padding: '1rem', background: 'transparent', fontSize: '0.85rem' }}
        >
          {String(children).replace(/\n$/, "")}
        </SyntaxHighlighter>
      </div>
    ) : (
      <code {...props} className="bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 px-1.5 py-0.5 rounded-md font-mono text-[12px] border border-gray-200 dark:border-gray-700">
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
  return <ReactMarkdown components={markdownComponents}>{displayedContent}</ReactMarkdown>;
}

export default function AiAssistantContent() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingHistory, setIsFetchingHistory] = useState(true);
  const messagesEndRef = useRef(null);

  // Auto-scroll to bottom of chat
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    const fetchHistory = async () => {
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
          setMessages([{ role: "assistant", content: "Hello! I am beoneofus AI. How can I help you with your code or project today?" }]);
        }
      }
      setIsFetchingHistory(false);
    };
    fetchHistory();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

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
    <div className="w-full flex flex-col h-[calc(100vh-120px)] bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-[2rem] shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header */}
      <div className="flex items-center gap-3 p-6 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/50">
        <div className="w-10 h-10 rounded-xl bg-gray-900 dark:bg-gray-700 text-white flex items-center justify-center shrink-0 shadow-sm">
          <Bot size={20} />
        </div>
        <div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">beoneofus AI</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Online</p>
        </div>
      </div>

      {/* Chat Messages Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-gray-50/30 dark:bg-gray-900/50">
        {isFetchingHistory ? (
          <div className="flex flex-col items-center justify-center h-full space-y-3 text-gray-400 dark:text-gray-500">
            <Loader2 size={28} className="animate-spin text-blue-500" />
            <span className="text-sm font-medium">Loading chat history...</span>
          </div>
        ) : (
          <>
        {messages.map((msg, index) => (
          <div key={index} className={`flex gap-4 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${msg.role === "user" ? "bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400" : "bg-gray-900 dark:bg-gray-700 text-white"}`}>
              {msg.role === "user" ? <User size={16} /> : <Bot size={16} />}
            </div>
            <div className={`max-w-[85%] sm:max-w-[75%] rounded-2xl p-4 text-sm ${msg.role === "user" ? "bg-blue-600 text-white shadow-md shadow-blue-500/20 whitespace-pre-wrap" : "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-100 shadow-sm"}`}>
              {msg.role === "user" ? (
                msg.content
              ) : msg.isNew ? (
                <TypewriterMessage content={msg.content} onUpdate={scrollToBottom} />
              ) : (
                <ReactMarkdown components={markdownComponents}>{msg.content}</ReactMarkdown>
              )}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex gap-4 flex-row">
            <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 bg-gray-900 dark:bg-gray-700 text-white">
              <Bot size={16} />
            </div>
            <div className="max-w-[80%] rounded-2xl p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-100 shadow-sm flex items-center gap-2">
              <Loader2 size={16} className="animate-spin text-gray-900 dark:text-gray-100" /> <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">Thinking...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Message Input Area */}
      <div className="p-4 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800">
        <form onSubmit={sendMessage} className="flex items-center gap-3 max-w-4xl mx-auto">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask for project ideas, code snippets, or task breakdowns..."
            className="flex-1 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 text-sm rounded-xl px-5 py-3.5 focus:outline-none focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/10 transition-all"
            disabled={isLoading || isFetchingHistory}
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading || isFetchingHistory}
            className="bg-gray-900 dark:bg-gray-700 hover:bg-gray-800 dark:hover:bg-gray-600 disabled:opacity-50 disabled:hover:bg-gray-900 dark:disabled:hover:bg-gray-700 text-white rounded-xl p-3.5 transition-all shadow-sm flex-shrink-0"
          >
            <Send size={20} className={isLoading ? "opacity-50" : ""} />
          </button>
        </form>
      </div>
    </div>
  );
}