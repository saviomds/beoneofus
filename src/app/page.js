import Link from 'next/link';
import { Terminal, Users, Rocket, ArrowRight } from 'lucide-react';

export default function Welcome() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#050505] px-6 relative overflow-hidden">
      
      {/* Dynamic Background Glow - Now in Tech Blue */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/10 blur-[120px] rounded-full" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-cyan-500/10 blur-[120px] rounded-full" />

      <div className="text-center max-w-3xl z-10">
        {/* Logo/Brand with Blue Gradient */}
        <h1 className="text-6xl md:text-8xl font-black tracking-tighter mb-4 bg-gradient-to-b from-white to-gray-500 bg-clip-text text-transparent">
          beone<span className="text-blue-500">of</span>us
        </h1>

        {/* Tagline */}
        <p className="text-xl md:text-2xl text-gray-300 mb-8 leading-relaxed font-light">
          Join the <span className="text-blue-400 font-medium italic">BeOneOfUs</span> community. <br className="hidden md:block" /> 
          Share code, connect, and build the future.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16">
          <Link
            href="/dash"
            className="group relative bg-blue-600 hover:bg-blue-500 text-white px-10 py-4 rounded-xl font-bold transition-all hover:scale-105 active:scale-95 flex items-center gap-2 shadow-[0_0_25px_rgba(37,99,235,0.4)]"
          >
            Enter Dashboard
            <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
          </Link>

          <Link
            href="/auth"
            className="bg-white/5 border border-white/10 hover:bg-white/10 hover:border-blue-500/50 text-white px-10 py-4 rounded-xl font-semibold transition-all backdrop-blur-sm"
          >
            Sign In / Join
          </Link>
        </div>

        {/* Features Preview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
          <FeatureCard 
            icon={<Terminal className="text-blue-400" />}
            title="Code Sharing"
            desc="Share snippets and get peer reviews in real-time."
          />
          <FeatureCard 
            icon={<Users className="text-cyan-400" />}
            title="Community"
            desc="Network with developers across the globe."
          />
          <FeatureCard 
            icon={<Rocket className="text-blue-500" />}
            title="Innovation"
            desc="Collaborate on open-source ninja projects."
          />
        </div>
      </div>

      <footer className="absolute bottom-8 text-gray-600 text-sm">
        &copy; 2026 beoneofus. Built for the elite.
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, desc }) {
  return (
    <div className="group p-6 rounded-2xl bg-[#0D0D0D] border border-white/5 hover:border-blue-500/30 transition-all duration-300">
      <div className="mb-4 p-2 bg-blue-500/5 w-fit rounded-lg group-hover:scale-110 transition-transform">
        {icon}
      </div>
      <h3 className="font-bold text-white mb-2">{title}</h3>
      <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
    </div>
  );
}