"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useRouter } from 'next/navigation';
import { Terminal, AlertTriangle, ShieldCheck, Command, Loader2, ChevronRight } from 'lucide-react';

export default function AuthForm() {
  const router = useRouter();
  const [isRegistering, setIsRegistering] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showSuccessCard, setShowSuccessCard] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);

  // Redirect if user is already logged in
  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        router.push('/dash');
      }
    };
    checkUser();
  }, [router]);

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isRegistering) {
        // SQL Trigger in Supabase handles 'profiles' table insertion automatically
        const { error: signUpError } = await supabase.auth.signUp({ 
          email, 
          password 
        });
        if (signUpError) throw signUpError;
        setShowSuccessCard(true);
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({ 
          email, 
          password 
        });
        if (signInError) throw signInError;
        router.push('/dash');
        router.refresh();
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-xl mx-auto font-mono animate-in fade-in zoom-in-95 duration-500">
      
      {/* Terminal Window Container */}
      <div className="bg-[#050505] rounded-xl border border-white/10 shadow-[0_0_60px_rgba(34,197,94,0.05)] overflow-hidden relative">
        
        {/* Terminal Header */}
        <div className="bg-[#111] px-4 py-3 border-b border-white/10 flex items-center gap-2 shrink-0">
          <div className="w-3 h-3 rounded-full bg-red-500/80" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
          <div className="w-3 h-3 rounded-full bg-green-500/80" />
          <span className="ml-4 text-xs text-gray-500 flex items-center gap-2">
            <Terminal size={14} /> beoneofus_auth_node.sh
          </span>
        </div>

        {/* Terminal Body */}
        <div className="p-6 sm:p-10 text-green-500 space-y-6">
          
          {/* Boot Sequence Text */}
          <div className="space-y-1.5 mb-8 text-sm">
             <p className="opacity-80">&gt; INITIALIZING SECURE PROTOCOLS...</p>
             <p className="opacity-80">&gt; ESTABLISHING CONNECTION TO CORE NETWORK...</p>
             <p className="font-bold text-white">&gt; AUTHORIZATION REQUIRED<span className="animate-pulse">_</span></p>
          </div>

          {showSuccessCard ? (
            <div className="py-10 text-center space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
              <div className="w-16 h-16 bg-green-500/10 text-green-400 rounded-full flex items-center justify-center mx-auto mb-4 border border-green-500/30">
                <ShieldCheck size={32} className="animate-pulse" />
              </div>
              <p className="text-xl font-bold text-white uppercase tracking-widest">Node Registered</p>
              <p className="text-gray-400 text-sm max-w-xs mx-auto leading-relaxed">
                Your identity has been written to the master registry. You may now authorize your session.
              </p>
              <button
                onClick={() => { setShowSuccessCard(false); setIsRegistering(false); }}
                className="mt-8 px-8 py-3 bg-transparent border border-green-500/50 text-green-500 hover:bg-green-500/10 transition-all rounded-md tracking-[0.2em] uppercase text-xs font-bold"
              >
                Return to Auth
              </button>
            </div>
          ) : (
            <>
              {/* Mode Switcher */}
              <div className="flex gap-6 mb-8 border-b border-green-500/20 pb-4 text-sm">
                <button onClick={() => setIsRegistering(false)} className={`flex items-center gap-2 transition-all ${!isRegistering ? 'text-green-400 font-bold drop-shadow-[0_0_8px_rgba(34,197,94,0.8)]' : 'text-gray-600 hover:text-green-500/70'}`}>
                  [0] Authenticate
                </button>
                <button onClick={() => setIsRegistering(true)} className={`flex items-center gap-2 transition-all ${isRegistering ? 'text-green-400 font-bold drop-shadow-[0_0_8px_rgba(34,197,94,0.8)]' : 'text-gray-600 hover:text-green-500/70'}`}>
                  [1] Register Node
                </button>
              </div>

              {/* Interactive Form */}
              <form onSubmit={handleAuth} className="space-y-6">
                <div>
                  <label className="flex items-center gap-2 text-sm mb-2 opacity-80">
                    <span className="text-blue-500 font-black">$</span> root_email:
                  </label>
                  <div className="relative">
                    <ChevronRight size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-green-500/50" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      className="w-full bg-black border border-green-500/30 rounded-md py-3 pl-10 pr-4 text-green-400 focus:outline-none focus:border-green-500 focus:shadow-[0_0_15px_rgba(34,197,94,0.15)] transition-all placeholder-green-500/20"
                      placeholder="node@network.local"
                    />
                  </div>
                </div>

                <div>
                  <label className="flex items-center gap-2 text-sm mb-2 opacity-80">
                    <span className="text-blue-500 font-black">$</span> encryption_key:
                  </label>
                  <div className="relative">
                    <ChevronRight size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-green-500/50" />
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      className="w-full bg-black border border-green-500/30 rounded-md py-3 pl-10 pr-4 text-green-400 focus:outline-none focus:border-green-500 focus:shadow-[0_0_15px_rgba(34,197,94,0.15)] transition-all placeholder-green-500/20 tracking-widest"
                      placeholder="••••••••"
                    />
                  </div>
                </div>

                {error && (
                  <div className="text-red-400 text-sm flex items-start gap-3 bg-red-500/10 p-4 rounded-md border border-red-500/20 animate-in fade-in slide-in-from-top-2">
                    <AlertTriangle size={18} className="shrink-0 mt-0.5" />
                    <span className="leading-relaxed"><strong>[ SYS_ERR ]:</strong> {error}</span>
                  </div>
                )}

                <button disabled={loading} className="w-full bg-green-500/10 hover:bg-green-500/20 text-green-400 border border-green-500/50 py-4 rounded-md font-bold tracking-[0.2em] uppercase transition-all disabled:opacity-50 mt-6 flex items-center justify-center gap-3">
                  {loading ? <><Loader2 size={18} className="animate-spin" /> Transmitting...</> : isRegistering ? <><Command size={18} /> Initialize Node</> : <><ShieldCheck size={18} /> Authorize Session</>}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}