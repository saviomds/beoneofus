"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { supabase } from "./supabaseClient";
import { 
  Terminal, Zap, Shield, Cpu, ChevronRight, ArrowRight, 
  Code2, Users, Globe, Bot, Menu, X, Bell, MessageSquare, 
  ChevronDown, UserPlus, Handshake, Hash 
} from "lucide-react";
import FloatingAiAssistant from "./components/FloatingAiAssistant";

export default function LandingPage() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const communities = [
    { name: 'Systems & Rust', members: '12.4k', icon: <Cpu size={24} />, desc: 'Low-level programming, memory safety, and performance optimization discussions.' },
    { name: 'Frontend Architecture', members: '24.1k', icon: <Code2 size={24} />, desc: 'React, Next.js, component design patterns, and modern CSS frameworks.' },
    { name: 'Indie Hackers', members: '8.9k', icon: <Zap size={24} />, desc: 'Solo founders building SaaS products, sharing MRR, and growth hacking.' },
    { name: 'AI & Machine Learning', members: '18.2k', icon: <Globe size={24} />, desc: 'LLM integration, prompt engineering, and neural network discussions.' },
  ];

  const steps = [
    {
      icon: <UserPlus size={32} />,
      title: "1. Initialize Your Node",
      desc: "Create your profile and establish your presence. Add your tech stack, link your GitHub, and get verified to prove your identity on the network.",
      color: "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800/50"
    },
    {
      icon: <Handshake size={32} />,
      title: "2. Establish Handshakes",
      desc: "Direct messaging requires mutual consent. Send a connection request to a peer, and once they accept the handshake, a secure 1-on-1 channel is opened.",
      color: "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800/50"
    },
    {
      icon: <Hash size={32} />,
      title: "3. Join Secured Workspaces",
      desc: "Collaborate with teams in public or private groups. Share files, reply to threads in real-time, and react to code snippets.",
      color: "text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800/50"
    },
    {
      icon: <Bot size={32} />,
      title: "4. Leverage the AI",
      desc: "Use beoneofus AI to review code snippets for vulnerabilities, summarize discussions, or draft quick technical replies.",
      color: "text-gray-900 dark:text-gray-100 bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-700"
    }
  ];

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      
      if (session) {
        const { data } = await supabase
          .from('profiles')
          .select('username, avatar_url')
          .eq('id', session.user.id)
          .single();
        setProfile(data);
      }
      setLoading(false);
    };
    
    checkAuth();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 selection:bg-blue-500/30 overflow-x-hidden relative">
      {/* Background Effect */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#00000008_1px,transparent_1px),linear-gradient(to_bottom,#00000008_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />

      {/* Navbar */}
      <nav className="fixed top-0 w-full border-b border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl z-50">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link href="/" className="font-black text-2xl tracking-tighter flex items-center gap-2 text-gray-900 dark:text-gray-100">
            <Terminal className="text-blue-500 dark:text-blue-400" size={28} />
            <span>beone<span className="text-blue-600 dark:text-blue-400">of</span>us</span>
          </Link>
          
          {/* Desktop Menu */}
          <div className="hidden md:flex items-center gap-4">
            {loading ? (
               <div className="w-64 h-10 bg-gray-200 dark:bg-gray-800 animate-pulse rounded-xl"></div>
            ) : session ? (
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-6 text-sm font-bold text-gray-600 dark:text-gray-300">
                  <Link href="/Explore_Projects" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Explore</Link>
                  <Link href="/how_it_works" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">How It Works</Link>
                 
                  <Link href="#community" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Community</Link>
                   <Link href="/dash" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Jump In</Link>
                </div>
                <div className="h-6 w-px bg-gray-200 dark:bg-gray-800"></div>
                <div className="flex items-center gap-5">
                  <Link href="/dash" className="text-gray-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors relative">
                    <Bell size={20} />
                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>
                  </Link>
                  <Link href="/dash" className="flex items-center gap-2 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 border border-gray-200 dark:border-gray-700 pl-2 pr-3 py-1.5 rounded-full transition-all shadow-sm group">
                    <div className="w-7 h-7 rounded-full bg-blue-50 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-[10px] uppercase overflow-hidden relative border border-blue-100 dark:border-blue-800">
                      {profile?.avatar_url ? (
                        <Image src={profile.avatar_url} alt="avatar" fill className="object-cover" sizes="28px" />
                      ) : (
                        profile?.username?.[0] || 'U'
                      )}
                    </div>
                    <span className="text-sm font-bold text-gray-700 dark:text-gray-300 group-hover:text-blue-600 dark:group-hover:text-blue-400">Profile</span>
                    <ChevronDown size={14} className="text-gray-400 dark:text-gray-500" />
                  </Link>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-8">
                <div className="flex items-center gap-6 text-sm font-bold text-gray-600 dark:text-gray-300">
                  <Link href="/Explore_Projects" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Explore</Link>
                  <Link href="/how_it_works" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">How It Works</Link>
                  <Link href="/community" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Community</Link>
                </div>
                <div className="h-6 w-px bg-gray-200 dark:bg-gray-800"></div>
                <div className="flex items-center gap-4">
                  <Link href="/auth" className="text-sm font-bold text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Login</Link>
                  <Link href="/auth" className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-all shadow-lg shadow-blue-500/20">
                    Sign Up 🚀
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* Mobile Menu Toggle */}
          <button className={`md:hidden relative z-50 p-2 -mr-2 text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-all duration-300 ${mobileMenuOpen ? 'rotate-180' : 'rotate-0'}`} onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Dropdown */}
        <div className={`md:hidden absolute top-0 left-0 w-full bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 shadow-2xl transition-all duration-300 ease-in-out origin-top ${mobileMenuOpen ? 'opacity-100 scale-y-100 pointer-events-auto' : 'opacity-0 scale-y-0 pointer-events-none'} pt-20 pb-6 px-6`}>
          {loading ? (
            <div className="w-full h-10 bg-gray-200 dark:bg-gray-800 animate-pulse rounded-xl mb-4"></div>
          ) : session ? (
            <div className="flex flex-col gap-4">
              <div className={`transition-all duration-500 transform ${mobileMenuOpen ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`} style={{ transitionDelay: '100ms' }}>
                <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700">
                  <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-xs uppercase overflow-hidden relative">
                    {profile?.avatar_url ? <Image src={profile.avatar_url} alt="avatar" fill className="object-cover" sizes="40px" /> : profile?.username?.[0] || 'U'}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-gray-900 dark:text-gray-100">@{profile?.username}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Active Node</p>
                  </div>
                  <Link href="/dash?section=notifications" onClick={() => setMobileMenuOpen(false)} className="p-2 text-gray-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm relative">
                    <Bell size={18} />
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full"></span>
                  </Link>
                </div>
              </div>
              <div className={`flex flex-col space-y-1 transition-all duration-500 transform ${mobileMenuOpen ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`} style={{ transitionDelay: '200ms' }}>
                <Link href="/Explore_Projects" onClick={() => setMobileMenuOpen(false)} className="px-4 py-3 text-sm font-bold text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-600 dark:hover:text-blue-400 rounded-xl transition-colors">Explore</Link>
                <Link href="/dash?section=groups" onClick={() => setMobileMenuOpen(false)} className="px-4 py-3 text-sm font-bold text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-600 dark:hover:text-blue-400 rounded-xl transition-colors">Projects</Link>
                <Link href="/dash?section=messages" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-2 px-4 py-3 text-sm font-bold text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-600 dark:hover:text-blue-400 rounded-xl transition-colors"><MessageSquare size={18} /> Messages</Link>
              </div>
              <div className={`transition-all duration-500 transform ${mobileMenuOpen ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`} style={{ transitionDelay: '300ms' }}>
                <Link href="/dash" onClick={() => setMobileMenuOpen(false)} className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-5 py-3.5 rounded-xl text-sm font-bold transition-all shadow-lg shadow-blue-500/20 mt-2">
                  Open Dashboard <ArrowRight size={16} />
                </Link>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <div className={`flex flex-col space-y-1 transition-all duration-500 transform ${mobileMenuOpen ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`} style={{ transitionDelay: '100ms' }}>
                <Link href="/Explore_Projects" onClick={() => setMobileMenuOpen(false)} className="px-4 py-3 text-sm font-bold text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-600 dark:hover:text-blue-400 rounded-xl transition-colors">Explore Projects</Link>
                <Link href="/how_it_works" onClick={() => setMobileMenuOpen(false)} className="px-4 py-3 text-sm font-bold text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-600 dark:hover:text-blue-400 rounded-xl transition-colors">How It Works</Link>
                <Link href="/community" onClick={() => setMobileMenuOpen(false)} className="px-4 py-3 text-sm font-bold text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-600 dark:hover:text-blue-400 rounded-xl transition-colors">Community</Link>
              </div>
              <div className={`h-px w-full bg-gray-100 dark:bg-gray-800 my-2 transition-all duration-500 transform ${mobileMenuOpen ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`} style={{ transitionDelay: '150ms' }}></div>
              <div className={`flex flex-col gap-3 transition-all duration-500 transform ${mobileMenuOpen ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`} style={{ transitionDelay: '200ms' }}>
                <Link href="/auth" onClick={() => setMobileMenuOpen(false)} className="w-full text-center px-5 py-3.5 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-bold transition-all">
                  Login
                </Link>
                <Link href="/auth" onClick={() => setMobileMenuOpen(false)} className="w-full text-center px-5 py-3.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-bold transition-all shadow-lg shadow-blue-500/20">
                  Sign Up 🚀
                </Link>
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <main className="pt-40 pb-20 px-6 relative z-10">
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-blue-400/20 blur-[120px] rounded-full -z-10" />
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/50 text-blue-600 dark:text-blue-400 text-xs font-black uppercase tracking-widest">
            <Zap size={14} className="animate-pulse" /> Platform v1.0 Online
          </div>
          <h1 className="text-6xl md:text-8xl font-black tracking-tighter leading-[1.1]">
            The network for <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-600">developers.</span>
          </h1>
          <p className="text-lg md:text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto font-medium">
            Connect with developers worldwide. Broadcast your code. Join secure workspaces. Stop networking, start connecting.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href={session ? "/dash" : "/auth"} className="w-full sm:w-auto bg-blue-600 text-white px-8 py-4 rounded-2xl text-lg font-black shadow-xl shadow-blue-500/20 hover:scale-105 transition-all">
              {session ? "Return to Dashboard" : "Join for Free"} <ArrowRight className="inline ml-2" />
            </Link>
          </div>
        </div>
      </main>

      {/* How It Works Section */}
      <section id="how-it-works" className="max-w-5xl mx-auto px-6 py-24 relative z-10">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-black tracking-tighter mb-4 text-gray-900 dark:text-gray-100">How it works</h2>
          <p className="text-gray-600 dark:text-gray-400 font-medium">A modern approach to developer collaboration.</p>
        </div>
        <div className="space-y-12 relative">
          <div className="hidden md:block absolute left-1/2 top-0 bottom-0 w-1 bg-gray-200 dark:bg-gray-800 -translate-x-1/2 rounded-full" />
          {steps.map((step, i) => (
            <div key={i} className={`flex flex-col md:flex-row items-center gap-8 ${i % 2 === 0 ? 'md:flex-row-reverse' : ''}`}>
              <div className="flex-1 bg-white dark:bg-gray-900 p-8 rounded-[2rem] shadow-sm border border-gray-200 dark:border-gray-800">
                <h3 className="text-2xl font-black text-gray-900 dark:text-gray-100 mb-3">{step.title}</h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">{step.desc}</p>
              </div>
              <div className={`w-20 h-20 shrink-0 rounded-full border-[4px] flex items-center justify-center shadow-xl relative z-10 ${step.color}`}>
                {step.icon}
              </div>
              <div className="flex-1 hidden md:block" />
            </div>
          ))}
        </div>
      </section>

      {/* Community Section */}
      <section id="community" className="max-w-7xl mx-auto px-6 py-24 relative z-10 border-t border-gray-200 dark:border-gray-800">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-black tracking-tighter mb-4 text-gray-900 dark:text-gray-100">The Global Community</h2>
          <p className="text-gray-600 dark:text-gray-400 font-medium">Join real-time discussions across specialized spaces.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {communities.map((space, i) => (
            <div key={i} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-[2rem] p-8 hover:border-blue-500/50 dark:hover:border-blue-500/50 hover:shadow-xl transition-all group flex items-start gap-6">
              <div className="w-16 h-16 bg-gray-50 dark:bg-gray-800/50 rounded-2xl flex items-center justify-center shrink-0 group-hover:bg-blue-50 dark:group-hover:bg-blue-900/20 transition-colors">
                {space.icon}
              </div>
              <div>
                <h4 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">{space.name}</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{space.desc}</p>
                <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-3 py-1 rounded-full">
                  <Users size={12} /> {space.members} Active
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 dark:border-gray-800 py-10 text-center text-gray-500 dark:text-gray-400 text-xs font-mono uppercase tracking-widest bg-white dark:bg-gray-900">
        beoneofus platform v1.0 © {new Date().getFullYear()}
      </footer>

      <FloatingAiAssistant />
    </div>
  );
}