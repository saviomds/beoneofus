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
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  // Redirect if user is already logged in
  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        router.push('/dash');
      } else {
        setIsCheckingAuth(false);
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
    isCheckingAuth ? (
      <div className="w-full space-y-6 animate-pulse">
        <div className="flex gap-6 mb-8 border-b border-gray-200 pb-px">
          <div className="h-4 bg-gray-200 rounded w-16 pb-3"></div>
          <div className="h-4 bg-gray-200 rounded w-24 pb-3"></div>
        </div>
        <div className="space-y-5">
          <div>
            <div className="h-3 bg-gray-200 rounded w-24 mb-2"></div>
            <div className="h-12 bg-gray-200 rounded-xl w-full"></div>
          </div>
          <div>
            <div className="h-3 bg-gray-200 rounded w-20 mb-2"></div>
            <div className="h-12 bg-gray-200 rounded-xl w-full"></div>
          </div>
          <div className="h-12 bg-gray-200 rounded-xl w-full mt-6"></div>
        </div>
      </div>
    ) : (
    <div className="w-full animate-in fade-in zoom-in-95 duration-500">
      {showSuccessCard ? (
        <div className="py-8 text-center space-y-4">
          <div className="w-16 h-16 bg-green-50 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4 border border-green-200">
            <ShieldCheck size={32} />
          </div>
          <p className="text-2xl font-bold text-gray-900 tracking-tight">Account Created</p>
          <p className="text-gray-600 text-sm max-w-xs mx-auto leading-relaxed">
            Your account has been successfully created. You may now sign in.
          </p>
          <button
            onClick={() => { setShowSuccessCard(false); setIsRegistering(false); }}
            className="mt-6 px-6 py-3 bg-gray-50 border border-gray-200 text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition-all rounded-xl font-bold text-sm w-full"
          >
            Return to Sign In
          </button>
        </div>
      ) : (
        <>
          {/* Mode Switcher */}
          <div className="flex gap-6 mb-8 border-b border-gray-200 pb-px text-sm font-medium">
            <button onClick={() => setIsRegistering(false)} className={`pb-3 transition-all ${!isRegistering ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-900'}`}>
              Sign In
            </button>
            <button onClick={() => setIsRegistering(true)} className={`pb-3 transition-all ${isRegistering ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-900'}`}>
              Create Account
            </button>
          </div>

          {/* Interactive Form */}
          <form onSubmit={handleAuth} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full bg-white border border-gray-300 rounded-xl py-3 px-4 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full bg-white border border-gray-300 rounded-xl py-3 px-4 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div className="text-red-600 text-sm flex items-start gap-2 bg-red-50 p-3 rounded-xl border border-red-100">
                <AlertTriangle size={18} className="shrink-0 mt-0.5 text-red-500" />
                <span className="leading-relaxed">{error}</span>
              </div>
            )}

            <button disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3.5 rounded-xl font-bold transition-all disabled:opacity-70 mt-2 flex items-center justify-center gap-2 shadow-sm">
              {loading ? <><Loader2 size={18} className="animate-spin" /> Please wait...</> : isRegistering ? 'Create Account' : 'Sign In'}
            </button>
          </form>
        </>
      )}
    </div>
    )
  );
}