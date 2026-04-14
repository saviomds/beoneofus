"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { supabase } from "./supabaseClient";
import { Terminal, Zap, Shield, Cpu, ChevronRight, ArrowRight } from "lucide-react";

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
    <div className="min-h-screen bg-[#050505] text-white selection:bg-blue-500/30 overflow-x-hidden relative">
      
      {/* Global Background Grid Effect */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />

      {/* Navbar */}
      <nav className="fixed top-0 w-full border-b border-white/5 bg-[#050505]/80 backdrop-blur-xl z-50">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="font-black text-2xl tracking-tighter flex items-center gap-2">
            <Terminal className="text-blue-500" size={28} />
            <span>beone<span className="text-blue-600">of</span>us</span>
          </div>
          
          <div className="flex items-center gap-4">
            {loading ? (
               <div className="w-32 h-10 bg-white/5 animate-pulse rounded-xl"></div>
            ) : session ? (
              <div className="flex items-center gap-4 sm:gap-6">
                <div className="hidden sm:flex items-center gap-3 bg-white/5 pr-4 rounded-full border border-white/10">
                  <div className="w-10 h-10 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-xs uppercase overflow-hidden relative border border-white/5">
                    {profile?.avatar_url ? (
                      <Image src={profile.avatar_url} alt="avatar" fill className="object-cover" sizes="40px" />
                    ) : (
                      profile?.username?.[0] || 'U'
                    )}
                  </div>
                  <span className="text-sm font-bold text-gray-300 tracking-tight">@{profile?.username}</span>
                </div>
                <Link href="/dash" className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-all shadow-lg shadow-blue-500/20 flex items-center gap-2">
                  Terminal <ArrowRight size={16} />
                </Link>
              </div>
            ) : (
              <Link href="/auth" className="bg-white text-black hover:bg-gray-200 px-6 py-2.5 rounded-xl text-sm font-black transition-all">
                Initialize Node
              </Link>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="pt-40 pb-20 px-6 relative z-10">
        {/* Glowing orb behind hero */}
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-blue-600/20 blur-[120px] rounded-full pointer-events-none -z-10" />
        
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-black uppercase tracking-widest mb-4">
            <Zap size={14} className="animate-pulse" /> Network v1.0 Online
          </div>
          
          <h1 className="text-6xl md:text-8xl font-black tracking-tighter leading-[1.1]">
            The network for <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-500">developer nodes.</span>
          </h1>
          
          <p className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto leading-relaxed font-medium">
            Establish peer-to-peer handshakes. Broadcast your code. Join end-to-end encrypted workspaces. Stop networking, start connecting.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-8">
            {session ? (
              <Link href="/dash" className="w-full sm:w-auto flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-8 py-4 rounded-2xl text-lg font-black transition-all shadow-xl shadow-blue-500/20 hover:scale-105 active:scale-95">
                Return to Dashboard <ArrowRight size={20} />
              </Link>
            ) : (
              <>
                <Link href="/auth" className="w-full sm:w-auto flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-8 py-4 rounded-2xl text-lg font-black transition-all shadow-xl shadow-blue-500/20 hover:scale-105 active:scale-95">
                  Join the Network <ChevronRight size={20} />
                </Link>
                <Link href="/auth" className="w-full sm:w-auto flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 text-white px-8 py-4 rounded-2xl text-lg font-bold transition-all border border-white/10 hover:border-white/20">
                  Existing Node Login
                </Link>
              </>
            )}
          </div>
        </div>
      </main>

      {/* Features Grid */}
      <section className="max-w-7xl mx-auto px-6 py-24 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-[#0A0A0A]/80 backdrop-blur-sm p-8 rounded-[2rem] border border-white/5 hover:border-blue-500/30 transition-all group">
            <div className="w-14 h-14 bg-blue-500/10 rounded-2xl flex items-center justify-center text-blue-500 mb-6 group-hover:scale-110 transition-transform shadow-lg shadow-blue-500/10">
              <Shield size={28} />
            </div>
            <h3 className="text-xl font-bold text-white mb-3">Secured Workspaces</h3>
            <p className="text-gray-400 leading-relaxed text-sm font-medium">
              Create public or private collaboration nodes. Real-time packet syncing ensures your team is always connected.
            </p>
          </div>
          
          <div className="bg-[#0A0A0A]/80 backdrop-blur-sm p-8 rounded-[2rem] border border-white/5 hover:border-purple-500/30 transition-all group">
            <div className="w-14 h-14 bg-purple-500/10 rounded-2xl flex items-center justify-center text-purple-500 mb-6 group-hover:scale-110 transition-transform shadow-lg shadow-purple-500/10">
              <Zap size={28} />
            </div>
            <h3 className="text-xl font-bold text-white mb-3">P2P Handshakes</h3>
            <p className="text-gray-400 leading-relaxed text-sm font-medium">
              Direct messaging requires mutual authorization. Sever connections instantly if a node becomes hostile.
            </p>
          </div>
          
          <div className="bg-[#0A0A0A]/80 backdrop-blur-sm p-8 rounded-[2rem] border border-white/5 hover:border-green-500/30 transition-all group">
            <div className="w-14 h-14 bg-green-500/10 rounded-2xl flex items-center justify-center text-green-500 mb-6 group-hover:scale-110 transition-transform shadow-lg shadow-green-500/10">
              <Cpu size={28} />
            </div>
            <h3 className="text-xl font-bold text-white mb-3">Public Broadcasts</h3>
            <p className="text-gray-400 leading-relaxed text-sm font-medium">
              Share code snippets, debug issues, and broadcast updates to the entire global developer feed.
            </p>
          </div>
        </div>
      </section>

      {/* System Terminal Preview */}
      <section className="max-w-5xl mx-auto px-6 py-10 md:py-20 relative z-10">
        <div className="bg-[#0A0A0A] rounded-[2rem] border border-white/10 overflow-hidden shadow-[0_0_50px_rgba(59,130,246,0.05)]">
          <div className="bg-[#111] px-4 py-3 border-b border-white/10 flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500/80"></div>
            <div className="w-3 h-3 rounded-full bg-yellow-500/80"></div>
            <div className="w-3 h-3 rounded-full bg-green-500/80"></div>
            <span className="ml-4 text-xs text-gray-500 font-mono">beoneofus_terminal_v1.sh</span>
          </div>
          <div className="p-6 md:p-8 font-mono text-sm md:text-base text-gray-300 space-y-4 overflow-x-auto">
            <p><span className="text-blue-500">$</span> root@beoneofus ~ ./init_node --user={`"`}new_dev{`"`}</p>
            <p className="text-gray-500">Initializing secure node connection...</p>
            <p className="text-green-400">[OK] Keypair generated.</p>
            <p className="text-green-400">[OK] Handshake protocols loaded.</p>
            <p className="text-purple-400">Syncing public feed packets...</p>
            <div className="pl-4 border-l-2 border-white/10 text-gray-400 py-2">
              &gt; Node 0xA8F1: {`"`}Just deployed the new edge runtime!{`"`}<br/>
              &gt; Node 0x77B2: {`"`}Looking for code review on my rust module.{`"`}
            </div>
            <p><span className="text-blue-500">$</span> connection established. Welcome to the network.</p>
            <p className="animate-pulse font-black text-lg">_</p>
          </div>
        </div>
      </section>

      {/* Network Stats */}
      <section className="border-y border-white/5 bg-white/[0.02] py-16 mt-10 relative z-10">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12 text-center">
          <div className="space-y-2">
            <h4 className="text-4xl md:text-5xl font-black text-white tracking-tighter">99.9<span className="text-blue-500">%</span></h4>
            <p className="text-[10px] sm:text-xs text-gray-500 font-bold uppercase tracking-widest">Network Uptime</p>
          </div>
          <div className="space-y-2">
            <h4 className="text-4xl md:text-5xl font-black text-white tracking-tighter">&lt;10<span className="text-purple-500">ms</span></h4>
            <p className="text-[10px] sm:text-xs text-gray-500 font-bold uppercase tracking-widest">Packet Latency</p>
          </div>
          <div className="space-y-2">
            <h4 className="text-4xl md:text-5xl font-black text-white tracking-tighter">256<span className="text-green-500">bit</span></h4>
            <p className="text-[10px] sm:text-xs text-gray-500 font-bold uppercase tracking-widest">P2P Encryption</p>
          </div>
          <div className="space-y-2">
            <h4 className="text-4xl md:text-5xl font-black text-white tracking-tighter">∞</h4>
            <p className="text-[10px] sm:text-xs text-gray-500 font-bold uppercase tracking-widest">Lines of Code</p>
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="py-24 md:py-32 px-6 relative z-10 text-center">
        <div className="max-w-3xl mx-auto space-y-8">
          <h2 className="text-4xl md:text-6xl font-black tracking-tighter">Ready to join the collective?</h2>
          <p className="text-gray-400 text-lg">No trackers. No algorithms. Just developers transmitting raw data.</p>
          <div className="pt-4">
            {session ? (
              <Link href="/dash" className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-8 py-4 rounded-2xl text-lg font-black transition-all shadow-xl shadow-blue-500/20 hover:scale-105 active:scale-95">
                Access Terminal <ArrowRight size={20} />
              </Link>
            ) : (
              <Link href="/auth" className="inline-flex items-center justify-center gap-2 bg-white text-black hover:bg-gray-200 px-8 py-4 rounded-2xl text-lg font-black transition-all hover:scale-105 active:scale-95 shadow-xl shadow-white/10">
                Initialize Your Node <ChevronRight size={20} />
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-10 text-center text-gray-600 text-xs font-mono uppercase tracking-widest relative z-10">
        beoneofus network v1.0 © {new Date().getFullYear()}
      </footer>
    </div>
  );
}