"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { supabase } from "./supabaseClient";
import { Terminal, Zap, Shield, Cpu, ChevronRight, ArrowRight, Code2, Users, Globe } from "lucide-react";

export default function LandingPage() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

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
    <div className="min-h-screen bg-gray-50 text-gray-900 selection:bg-blue-500/30 overflow-x-hidden relative">
      
      {/* Global Background Grid Effect */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#00000008_1px,transparent_1px),linear-gradient(to_bottom,#00000008_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />

      {/* Navbar */}
      <nav className="fixed top-0 w-full border-b border-gray-200 bg-white/80 backdrop-blur-xl z-50">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="font-black text-2xl tracking-tighter flex items-center gap-2">
            <Terminal className="text-blue-500" size={28} />
            <span>beone<span className="text-blue-600">of</span>us</span>
          </div>
          
          <div className="flex items-center gap-4">
            {loading ? (
               <div className="w-32 h-10 bg-gray-200 animate-pulse rounded-xl"></div>
            ) : session ? (
              <div className="flex items-center gap-4 sm:gap-6">
                <div className="hidden sm:flex items-center gap-3 bg-gray-100 pr-4 rounded-full border border-gray-200">
                  <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs uppercase overflow-hidden relative border border-blue-200">
                    {profile?.avatar_url ? (
                      <Image src={profile.avatar_url} alt="avatar" fill className="object-cover" sizes="40px" />
                    ) : (
                      profile?.username?.[0] || 'U'
                    )}
                  </div>
                  <span className="text-sm font-bold text-gray-700 tracking-tight">@{profile?.username}</span>
                </div>
                <Link href="/dash" className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-all shadow-lg shadow-blue-500/20 flex items-center gap-2">
                  Dashboard <ArrowRight size={16} />
                </Link>
              </div>
            ) : (
              <Link href="/auth" className="bg-gray-900 text-white hover:bg-gray-800 px-6 py-2.5 rounded-xl text-sm font-black transition-all">
                Sign In / Join
              </Link>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="pt-40 pb-20 px-6 relative z-10">
        {/* Glowing orb behind hero */}
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-blue-400/20 blur-[120px] rounded-full pointer-events-none -z-10" />
        
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-blue-600 text-xs font-black uppercase tracking-widest mb-4">
            <Zap size={14} className="animate-pulse" /> Platform v1.0 Online
          </div>
          
          <h1 className="text-6xl md:text-8xl font-black tracking-tighter leading-[1.1]">
            The network for <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-600">developers.</span>
          </h1>
          
          <p className="text-lg md:text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed font-medium">
            Connect with developers worldwide. Broadcast your code. Join secure workspaces. Stop networking, start connecting.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-8">
            {session ? (
              <Link href="/dash" className="w-full sm:w-auto flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-8 py-4 rounded-2xl text-lg font-black transition-all shadow-xl shadow-blue-500/20 hover:scale-105 active:scale-95">
                Return to Dashboard <ArrowRight size={20} />
              </Link>
            ) : (
              <>
                <Link href="/auth" className="w-full sm:w-auto flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-8 py-4 rounded-2xl text-lg font-black transition-all shadow-xl shadow-blue-500/20 hover:scale-105 active:scale-95">
                  Join for Free <ChevronRight size={20} />
                </Link>
                <Link href="/auth" className="w-full sm:w-auto flex items-center justify-center gap-2 bg-white hover:bg-gray-50 text-gray-900 px-8 py-4 rounded-2xl text-lg font-bold transition-all border border-gray-200">
                  Sign In
                </Link>
              </>
            )}
          </div>
        </div>
      </main>

      {/* Features Grid */}
      <section className="max-w-7xl mx-auto px-6 py-24 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white backdrop-blur-sm p-8 rounded-[2rem] border border-gray-200 hover:border-blue-500/30 hover:shadow-lg transition-all group">
            <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 mb-6 group-hover:scale-110 transition-transform shadow-sm">
              <Shield size={28} />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">Secured Workspaces</h3>
            <p className="text-gray-600 leading-relaxed text-sm font-medium">
              Create public or private collaboration workspaces. Real-time syncing ensures your team is always connected.
            </p>
          </div>
          
          <div className="bg-white backdrop-blur-sm p-8 rounded-[2rem] border border-gray-200 hover:border-purple-500/30 hover:shadow-lg transition-all group">
            <div className="w-14 h-14 bg-purple-50 rounded-2xl flex items-center justify-center text-purple-600 mb-6 group-hover:scale-110 transition-transform shadow-sm">
              <Zap size={28} />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">Direct Messaging</h3>
            <p className="text-gray-600 leading-relaxed text-sm font-medium">
              Connect with peers directly. Messaging requires mutual authorization to keep your inbox clean and relevant.
            </p>
          </div>
          
          <div className="bg-white backdrop-blur-sm p-8 rounded-[2rem] border border-gray-200 hover:border-green-500/30 hover:shadow-lg transition-all group">
            <div className="w-14 h-14 bg-green-50 rounded-2xl flex items-center justify-center text-green-600 mb-6 group-hover:scale-110 transition-transform shadow-sm">
              <Cpu size={28} />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">Public Broadcasts</h3>
            <p className="text-gray-600 leading-relaxed text-sm font-medium">
              Share code snippets, debug issues, and broadcast updates to the entire global developer feed.
            </p>
          </div>
        </div>
      </section>

      {/* More Info Section */}
      <section className="max-w-7xl mx-auto px-6 pb-24 relative z-10">
        <div className="bg-gradient-to-b from-blue-50 to-white rounded-[3rem] p-8 md:p-16 border border-blue-100 shadow-sm">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl md:text-5xl font-black text-gray-900 mb-6 tracking-tighter">
              A new standard for developer collaboration.
            </h2>
            <p className="text-lg text-gray-600 font-medium">
              Whether you are an indie hacker, a startup founder, or an enterprise engineer, beoneofus provides the tools you need to build in public and connect in private.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            <div className="space-y-4">
              <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-blue-600 shadow-sm border border-blue-100">
                <Users size={24} />
              </div>
              <h4 className="text-xl font-bold text-gray-900">Curated Network</h4>
              <p className="text-gray-600 text-sm leading-relaxed">
                No recruiters, no spam. Just a dedicated space for software engineers to share knowledge, discuss architecture, and find co-founders.
              </p>
            </div>

            <div className="space-y-4">
              <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-indigo-600 shadow-sm border border-indigo-100">
                <Code2 size={24} />
              </div>
              <h4 className="text-xl font-bold text-gray-900">Snippet Sharing</h4>
              <p className="text-gray-600 text-sm leading-relaxed">
                Share code blocks with built-in syntax highlighting. Get immediate feedback, optimizations, and security reviews from peers.
              </p>
            </div>

            <div className="space-y-4">
              <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-sky-600 shadow-sm border border-sky-100">
                <Globe size={24} />
              </div>
              <h4 className="text-xl font-bold text-gray-900">Global Reach</h4>
              <p className="text-gray-600 text-sm leading-relaxed">
                Follow trending repositories, join niche technology groups, and stay up-to-date with the global software engineering ecosystem.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Trending Spaces / Ecosystem */}
      <section className="max-w-7xl mx-auto px-6 py-24 relative z-10 border-t border-gray-200">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl md:text-5xl font-black text-gray-900 mb-6 tracking-tighter">
            Explore the ecosystem.
          </h2>
          <p className="text-lg text-gray-600 font-medium">
            Dive into specialized communities, from low-level systems programming to indie hacking and AI research.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { name: 'Systems & Rust', members: '12.4k', icon: <Cpu size={20} /> },
            { name: 'Frontend Architecture', members: '24.1k', icon: <Code2 size={20} /> },
            { name: 'Indie Hackers', members: '8.9k', icon: <Zap size={20} /> },
            { name: 'AI & Machine Learning', members: '18.2k', icon: <Globe size={20} /> },
          ].map((space, i) => (
            <div key={i} className="bg-white border border-gray-200 rounded-2xl p-6 hover:border-blue-500/50 hover:shadow-lg transition cursor-pointer group">
              <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center text-gray-700 mb-4 group-hover:bg-blue-50 group-hover:text-blue-600 transition">
                {space.icon}
              </div>
              <h4 className="font-bold text-gray-900 mb-1">{space.name}</h4>
              <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">{space.members} Members</p>
            </div>
          ))}
        </div>
        
        <div className="mt-16 max-w-4xl mx-auto bg-gradient-to-r from-gray-900 to-gray-800 rounded-[2rem] p-8 md:p-12 flex flex-col md:flex-row items-center justify-between gap-8 shadow-2xl border border-gray-800">
          <div className="text-center md:text-left">
            <h3 className="text-2xl md:text-3xl font-black text-white mb-3 tracking-tight">
              {session ? "Ready to dive back in?" : "Want to look around first?"}
            </h3>
            <p className="text-gray-400 font-medium max-w-xl text-sm md:text-base leading-relaxed">
              {session 
                ? "Your workspace is ready. Access your network feed, direct messages, and specialized groups." 
                : "Explore the network feed, discover trending repositories, and read expert discussions in Guest Mode before creating an account."}
            </p>
          </div>
          <Link href="/dash" className="flex-shrink-0 w-full md:w-auto flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-8 py-4 rounded-xl text-lg font-bold transition-all shadow-lg shadow-blue-500/20 hover:scale-105 active:scale-95 whitespace-nowrap">
            {session ? "Open Dashboard" : "Launch Guest Dashboard"} <ArrowRight size={20} />
          </Link>
        </div>
      </section>

      {/* Live Feed Preview */}
      <section className="max-w-5xl mx-auto px-6 py-10 md:py-20 relative z-10">
        <div className="bg-white rounded-[2rem] border border-gray-200 overflow-hidden shadow-xl">
          <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-400"></div>
            <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
            <div className="w-3 h-3 rounded-full bg-green-400"></div>
            <span className="ml-4 text-xs text-gray-500 font-mono tracking-tight">network_activity.log</span>
          </div>
          <div className="p-6 md:p-8 font-mono text-sm md:text-base text-gray-700 space-y-4 overflow-x-auto">
            <p><span className="text-blue-600 font-bold">[SYSTEM]</span> Authenticating new developer connection...</p>
            <p className="text-gray-500">Establishing secure environment...</p>
            <p className="text-green-600">✓ Security tokens verified.</p>
            <p className="text-green-600">✓ Workspace loaded successfully.</p>
            <p className="text-purple-600 font-bold">Fetching recent network activity...</p>
            <div className="pl-4 border-l-2 border-gray-200 text-gray-600 py-2 bg-gray-50/50 rounded-r-lg">
              <span className="text-blue-500 font-bold">@alex_dev</span>: {`"`}Just deployed the new edge runtime!{`"`}<br/>
              <span className="text-purple-500 font-bold">@sarah_sys</span>: {`"`}Looking for code review on my rust module.{`"`}
            </div>
            <p><span className="text-blue-600 font-bold">[SYSTEM]</span> Connection established. Welcome.</p>
          </div>
        </div>
      </section>

      {/* Network Stats */}
      <section className="border-y border-gray-200 bg-white py-16 mt-10 relative z-10">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12 text-center">
          <div className="space-y-2">
            <h4 className="text-4xl md:text-5xl font-black text-gray-900 tracking-tighter">99.9<span className="text-blue-500">%</span></h4>
            <p className="text-[10px] sm:text-xs text-gray-500 font-bold uppercase tracking-widest">Network Uptime</p>
          </div>
          <div className="space-y-2">
            <h4 className="text-4xl md:text-5xl font-black text-gray-900 tracking-tighter">&lt;10<span className="text-purple-500">ms</span></h4>
            <p className="text-[10px] sm:text-xs text-gray-500 font-bold uppercase tracking-widest">Packet Latency</p>
          </div>
          <div className="space-y-2">
            <h4 className="text-4xl md:text-5xl font-black text-gray-900 tracking-tighter">100<span className="text-green-500">k+</span></h4>
            <p className="text-[10px] sm:text-xs text-gray-500 font-bold uppercase tracking-widest">Active Developers</p>
          </div>
          <div className="space-y-2">
            <h4 className="text-4xl md:text-5xl font-black text-gray-900 tracking-tighter">∞</h4>
            <p className="text-[10px] sm:text-xs text-gray-500 font-bold uppercase tracking-widest">Lines of Code</p>
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="py-24 md:py-32 px-6 relative z-10 text-center">
        <div className="max-w-3xl mx-auto space-y-8">
          <h2 className="text-4xl md:text-6xl font-black tracking-tighter text-gray-900">Ready to join the collective?</h2>
          <p className="text-gray-600 text-lg">No trackers. No algorithms. Just developers sharing knowledge.</p>
          <div className="pt-4">
            {session ? (
              <Link href="/dash" className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-8 py-4 rounded-2xl text-lg font-black transition-all shadow-xl shadow-blue-500/20 hover:scale-105 active:scale-95">
                Go to Dashboard <ArrowRight size={20} />
              </Link>
            ) : (
              <Link href="/auth" className="inline-flex items-center justify-center gap-2 bg-gray-900 text-white hover:bg-gray-800 px-8 py-4 rounded-2xl text-lg font-black transition-all hover:scale-105 active:scale-95 shadow-xl">
                Create an Account <ChevronRight size={20} />
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 py-10 text-center text-gray-500 text-xs font-mono uppercase tracking-widest relative z-10">
        beoneofus platform v1.0 © {new Date().getFullYear()}
      </footer>
    </div>
  );
}