"use client";

import Link from 'next/link';
import { Terminal, Users, Rocket, ArrowRight } from 'lucide-react';

export default function Welcome() {
  return (
    /* h-screen + relative overflow-hidden prevents unwanted scrolling on mobile */
    <div className="min-h-[100dvh] w-full flex flex-col items-center justify-center bg-[#050505] px-4 sm:px-6 relative overflow-hidden selection:bg-blue-500/30">
      
      {/* Optimized Background Glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[60%] md:w-[40%] h-[40%] bg-blue-600/10 blur-[100px] md:blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[60%] md:w-[40%] h-[40%] bg-cyan-500/10 blur-[100px] md:blur-[120px] rounded-full pointer-events-none" />

      <div className="text-center max-w-4xl z-10 w-full py-12 sm:py-20">
        
        {/* Brand Section - Optimized for small screens */}
        <div className="animate-in fade-in slide-in-from-top-4 duration-1000">
          <h1 className="text-4xl sm:text-6xl md:text-8xl font-black tracking-tighter mb-4 bg-gradient-to-b from-white to-gray-500 bg-clip-text text-transparent break-words">
            beone<span className="text-blue-500">of</span>us
          </h1>

          <p className="text-base sm:text-lg md:text-2xl text-gray-400 mb-8 sm:mb-10 leading-relaxed font-light max-w-2xl mx-auto px-2">
            Join the <span className="text-blue-400 font-medium italic">BeOneOfUs</span> community. <br className="hidden md:block" /> 
            Share code, connect, and build the future.
          </p>
        </div>

        {/* Action Buttons - Full width on mobile */}
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-center w-full sm:w-auto mb-16 sm:mb-20 animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-200">
          <Link
            href="/dash"
            className="w-full sm:w-auto group relative bg-blue-600 hover:bg-blue-500 text-white px-6 sm:px-10 py-3.5 sm:py-4 rounded-xl font-bold transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-2 shadow-[0_0_25px_rgba(37,99,235,0.3)]"
          >
            Enter Dashboard
            <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
          </Link>

          <Link
            href="/auth"
            className="w-full sm:w-auto bg-white/5 border border-white/10 hover:bg-white/10 hover:border-blue-500/50 text-white px-6 sm:px-10 py-3.5 sm:py-4 rounded-xl font-semibold transition-all backdrop-blur-sm flex items-center justify-center"
          >
            Sign In / Join
          </Link>
        </div>

        {/* Features Preview - Grid adapts from 1 to 3 columns */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4 md:gap-6 text-left animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-500">
          <FeatureCard 
            icon={<Terminal className="text-blue-400" size={20} />}
            title="Code Sharing"
            desc="Share snippets and get peer reviews in real-time."
          />
          <FeatureCard 
            icon={<Users className="text-cyan-400" size={20} />}
            title="Community"
            desc="Network with developers across the globe."
          />
          <FeatureCard 
            icon={<Rocket className="text-blue-500" size={20} />}
            title="Innovation"
            desc="Collaborate on open-source ninja projects."
            className="sm:col-span-2 md:col-span-1" // Makes last card span 2 cols on tablet
          />
        </div>
      </div>

      <footer className="md:absolute md:bottom-8 py-6 md:py-0 text-gray-600 text-[10px] font-bold uppercase tracking-widest text-center">
        &copy; 2026 beoneofus. <span className="text-blue-900">Built for the elite.</span>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, desc, className = "" }) {
  return (
    <div className={`group p-5 sm:p-6 rounded-2xl bg-[#0D0D0D] border border-white/5 hover:border-blue-500/30 transition-all duration-300 hover:shadow-[0_10px_40px_-15px_rgba(37,99,235,0.1)] ${className}`}>
      <div className="mb-4 p-2.5 bg-blue-500/5 w-fit rounded-xl group-hover:bg-blue-500/10 group-hover:scale-110 transition-all">
        {icon}
      </div>
      <h3 className="font-bold text-white mb-2 text-sm uppercase tracking-tight">{title}</h3>
      <p className="text-xs text-gray-500 leading-relaxed font-medium">{desc}</p>
    </div>
  );
}