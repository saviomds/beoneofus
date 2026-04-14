"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useRouter } from 'next/navigation';
import { LogIn, UserPlus, Mail, Lock, AlertCircle, CheckCircle2 } from 'lucide-react';

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
    <div className="w-full">
      {/* --- CUSTOM SUCCESS POPUP CARD --- */}
      {showSuccessCard && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => {
              setShowSuccessCard(false);
              setIsRegistering(false);
            }}
          />
          <div className="bg-[#0D0D0D] border border-green-500/30 w-full max-w-sm rounded-2xl p-8 shadow-[0_0_50px_-12px_rgba(34,197,94,0.5)] text-center relative z-10 animate-in fade-in zoom-in duration-300">
            <div className="w-20 h-20 bg-green-500/10 text-green-500 rounded-full flex items-center justify-center mx-auto mb-6 border border-green-500/20">
              <CheckCircle2 size={40} className="animate-bounce" />
            </div>
            <h3 className="text-2xl font-black text-white mb-2 tracking-tight">Registration Complete!</h3>
            <p className="text-gray-500 text-sm leading-relaxed mb-6">
              Your node has been registered on the <span className="text-blue-500 font-bold">beoneofus</span> network.
            </p>
            <button 
              onClick={() => {
                setShowSuccessCard(false);
                setIsRegistering(false);
              }}
              className="w-full bg-white/5 hover:bg-white/10 text-white font-bold py-3 rounded-xl transition-all border border-white/5"
            >
              Proceed to Login
            </button>
          </div>
        </div>
      )}

      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-white mb-2">
          {isRegistering ? 'Create Account' : 'Welcome Back'}
        </h2>
        <p className="text-gray-500">
          {isRegistering ? 'Join beoneofus today' : 'Log in to your account'}
        </p>
      </div>

      <form onSubmit={handleAuth} className="space-y-4">
        {/* Email Field */}
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
          <input
            type="email"
            placeholder="Email Address"
            className="w-full bg-white/5 border-none rounded-xl py-3 pl-10 pr-4 text-white placeholder-gray-600 focus:ring-2 focus:ring-blue-500/50 outline-none transition-all"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        {/* Password Field */}
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
          <input
            type="password"
            placeholder="Password"
            className="w-full bg-white/5 border-none rounded-xl py-3 pl-10 pr-4 text-white placeholder-gray-600 focus:ring-2 focus:ring-blue-500/50 outline-none transition-all"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        {error && (
          <div className="flex items-center gap-2 text-red-400 text-sm bg-red-400/10 p-3 rounded-lg">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        <button
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 shadow-[0_10px_20px_-10px_rgba(37,99,235,0.5)]"
        >
          {loading ? 'Processing...' : isRegistering ? (
            <>
              <UserPlus size={18} /> Sign Up
            </>
          ) : (
            <>
              <LogIn size={18} /> Login
            </>
          )}
        </button>
      </form>

      <div className="mt-6 text-center">
        <button
          type="button"
          onClick={() => setIsRegistering(!isRegistering)}
          className="text-gray-500 hover:text-blue-400 text-sm transition-colors"
        >
          {isRegistering ? 'Already have an account? Log in' : "Don't have an account? Sign up"}
        </button>
      </div>
    </div>
  );
}