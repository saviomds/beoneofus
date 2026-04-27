"use client";

import Link from "next/link";
import { Terminal, ArrowLeft, Users, Globe, Cpu, Zap, Code2, MessageSquare } from "lucide-react";
import FloatingAiAssistant from "../components/FloatingAiAssistant";

export default function Community() {
  const communities = [
    { name: 'Systems & Rust', members: '12.4k', icon: <Cpu size={24} />, desc: 'Low-level programming, memory safety, and performance optimization discussions.' },
    { name: 'Frontend Architecture', members: '24.1k', icon: <Code2 size={24} />, desc: 'React, Next.js, component design patterns, and modern CSS frameworks.' },
    { name: 'Indie Hackers', members: '8.9k', icon: <Zap size={24} />, desc: 'Solo founders building SaaS products, sharing MRR, and growth hacking.' },
    { name: 'AI & Machine Learning', members: '18.2k', icon: <Globe size={24} />, desc: 'LLM integration, prompt engineering, and neural network discussions.' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 selection:bg-blue-500/30 overflow-x-hidden relative">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#00000008_1px,transparent_1px),linear-gradient(to_bottom,#00000008_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />
      
      <nav className="fixed top-0 w-full border-b border-gray-200 bg-white/80 backdrop-blur-xl z-50">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link href="/" className="font-black text-2xl tracking-tighter flex items-center gap-2">
            <Terminal className="text-blue-500" size={28} />
            <span>beone<span className="text-blue-600">of</span>us</span>
          </Link>
          <Link href="/" className="text-sm font-bold text-gray-600 hover:text-blue-600 transition-colors flex items-center gap-2">
            <ArrowLeft size={16} /> Back to Home
          </Link>
        </div>
      </nav>

      <main className="pt-32 pb-20 px-6 relative z-10 max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-[2rem] flex items-center justify-center mx-auto mb-6 shadow-sm border border-blue-100">
            <Users size={40} />
          </div>
          <h1 className="text-4xl md:text-6xl font-black tracking-tighter mb-4">The Global Community</h1>
          <p className="text-lg text-gray-600 font-medium max-w-2xl mx-auto">Join thousands of developers in real-time discussions across specialized technological spaces.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-16">
          {communities.map((space, i) => (
            <div key={i} className="bg-white border border-gray-200 rounded-[2rem] p-8 hover:border-blue-500/50 hover:shadow-xl transition-all cursor-pointer group flex items-start gap-6">
              <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-700 shrink-0 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors border border-gray-100">
                {space.icon}
              </div>
              <div>
                <h4 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">{space.name}</h4>
                <p className="text-sm text-gray-600 leading-relaxed mb-4">{space.desc}</p>
                <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
                  <Users size={12} /> {space.members} Active
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Mini Preview of Community Hub */}
        <div className="max-w-3xl mx-auto bg-gray-900 rounded-[2rem] border border-gray-800 overflow-hidden shadow-2xl">
          <div className="bg-gray-950 px-6 py-4 border-b border-gray-800 flex items-center gap-3">
            <Globe size={18} className="text-blue-500" />
            <h3 className="text-white font-bold text-sm tracking-widest uppercase">Live Hub Preview</h3>
          </div>
          <div className="p-6 space-y-6 font-mono text-sm">
            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center shrink-0">S</div>
              <div>
                <span className="text-purple-400 font-bold">@sarah_dev</span> <span className="text-gray-500 text-xs">2m ago</span>
                <p className="text-gray-300 mt-1">Has anyone here successfully integrated WebRTC into a Next.js App Router project?</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">D</div>
              <div>
                <span className="text-blue-400 font-bold">@dominique_sys</span> <span className="text-gray-500 text-xs">Just now</span>
                <p className="text-gray-300 mt-1">Yes, make sure your peer connection logic runs strictly in a useEffect client-side hook!</p>
              </div>
            </div>
          </div>
          <div className="p-4 bg-gray-950 border-t border-gray-800 text-center">
            <Link href="/auth" className="text-blue-400 hover:text-blue-300 font-bold text-sm inline-flex items-center gap-2 transition-colors">
              Login to join the conversation <ArrowLeft size={16} className="rotate-180" />
            </Link>
          </div>
        </div>
      </main>

      <footer className="border-t border-gray-200 py-10 text-center text-gray-500 text-xs font-mono uppercase tracking-widest relative z-10 bg-white mt-10">
        beoneofus platform v1.0 © {new Date().getFullYear()}
      </footer>
      <FloatingAiAssistant />
    </div>
  );
}
