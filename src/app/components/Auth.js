"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useRouter } from 'next/navigation';
import { Terminal, AlertTriangle, ShieldCheck, Command, Loader2, ChevronRight } from 'lucide-react';

export default function AuthForm() {
  const router = useRouter();
  const [view, setView] = useState('sign-in'); // 'sign-in', 'sign-up', 'forgot-password', 'update-password', 'magic-link'
  const [loading, setLoading] = useState(false);
  const [showSuccessCard, setShowSuccessCard] = useState(false);
  const [successInfo, setSuccessInfo] = useState({ title: '', message: '' });
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  // Redirect if user is already logged in
  useEffect(() => {
    const checkUser = async () => {
      // Check if URL has recovery tokens
      if (typeof window !== 'undefined' && window.location.hash.includes('type=recovery')) {
        setView('update-password');
        setIsCheckingAuth(false);
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        router.push('/dash');
      } else {
        setIsCheckingAuth(false);
      }
    };
    checkUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setView('update-password');
        setIsCheckingAuth(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [router]);

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (view === 'sign-up') {
        // SQL Trigger in Supabase handles 'profiles' table insertion automatically
        const { error: signUpError } = await supabase.auth.signUp({ 
          email, 
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth`
          }
        });
        if (signUpError) throw signUpError;
        setSuccessInfo({
          title: 'Verify Your Email',
          message: 'We have sent a verification link to your email address. Please verify your account to continue.'
        });
        setShowSuccessCard(true);
      } else if (view === 'magic-link') {
        const { error: magicLinkError } = await supabase.auth.signInWithOtp({
          email,
          options: { emailRedirectTo: `${window.location.origin}/auth` }
        });
        if (magicLinkError) throw magicLinkError;
        setSuccessInfo({
          title: 'Magic Link Sent',
          message: 'Check your email for the magic link. Click it to securely sign in to your node.'
        });
        setShowSuccessCard(true);
      } else if (view === 'forgot-password') {
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/auth?type=recovery`
        });
        if (resetError) throw resetError;
        setSuccessInfo({
          title: 'Reset Link Sent',
          message: 'Check your email for the password reset link.'
        });
        setShowSuccessCard(true);
      } else if (view === 'update-password') {
        const { error: updateError } = await supabase.auth.updateUser({ password });
        if (updateError) throw updateError;
        setSuccessInfo({
          title: 'Password Updated',
          message: 'Your password has been successfully updated. You can now access your dashboard.'
        });
        setShowSuccessCard(true);
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({ 
          email, 
          password 
        });
        if (signInError) {
          if (signInError.message.toLowerCase().includes('email not confirmed')) {
            throw new Error('Please verify your email address before signing in. Check your inbox.');
          }
          throw signInError;
        }
        router.push('/dash');
        router.refresh();
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOAuthLogin = async (provider) => {
    setLoading(true);
    setError(null);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: provider,
        options: {
          redirectTo: `${window.location.origin}/auth`
        }
      });
      if (error) throw error;
    } catch (err) {
      setError(err.message);
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
          <p className="text-2xl font-bold text-gray-900 tracking-tight">{successInfo.title}</p>
          <p className="text-gray-600 text-sm max-w-xs mx-auto leading-relaxed">
            {successInfo.message}
          </p>
          <button
            onClick={() => { 
              setShowSuccessCard(false); 
              if (view === 'update-password') {
                router.push('/dash');
              } else {
                setView('sign-in'); 
                setPassword('');
              }
            }}
            className="mt-6 px-6 py-3 bg-gray-50 border border-gray-200 text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition-all rounded-xl font-bold text-sm w-full"
          >
            {view === 'update-password' ? 'Go to Dashboard' : 'Return to Sign In'}
          </button>
        </div>
      ) : (
        <>
          {/* Mode Switcher */}
          {(view === 'sign-in' || view === 'sign-up') && (
            <div className="flex gap-6 mb-8 border-b border-gray-200 pb-px text-sm font-medium">
              <button type="button" onClick={() => setView('sign-in')} className={`pb-3 transition-all ${view === 'sign-in' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-900'}`}>
                Sign In
              </button>
              <button type="button" onClick={() => setView('sign-up')} className={`pb-3 transition-all ${view === 'sign-up' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-900'}`}>
                Create Account
              </button>
            </div>
          )}

          {(view === 'sign-in' || view === 'sign-up') && (
            <>
              <div className="flex gap-4 mb-6">
                <button
                  type="button"
                  onClick={() => handleOAuthLogin('github')}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-[#24292F] hover:bg-[#24292F]/90 text-white text-sm font-bold transition-all shadow-sm"
                >
                  <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                  </svg> GitHub
                </button>
              </div>

              <div className="relative flex items-center gap-2 mb-6">
                <div className="flex-grow border-t border-gray-200"></div>
                <span className="text-[10px] uppercase font-black text-gray-400 tracking-widest">or continue with</span>
                <div className="flex-grow border-t border-gray-200"></div>
              </div>
            </>
          )}

          {view === 'forgot-password' && (
            <div className="mb-8">
              <h2 className="text-xl font-bold text-gray-900 mb-2">Reset Password</h2>
              <p className="text-sm text-gray-500">Enter your email address and we will send you a link to reset your password.</p>
            </div>
          )}

          {view === 'magic-link' && (
            <div className="mb-8">
              <h2 className="text-xl font-bold text-gray-900 mb-2">Passwordless Sign-In</h2>
              <p className="text-sm text-gray-500">Enter your email address and we will send you a secure magic link to log in.</p>
            </div>
          )}

          {view === 'update-password' && (
            <div className="mb-8">
              <h2 className="text-xl font-bold text-gray-900 mb-2">Set New Password</h2>
              <p className="text-sm text-gray-500">Please enter your new password below.</p>
            </div>
          )}

          {/* Interactive Form */}
          <form onSubmit={handleAuth} className="space-y-5">
            {view !== 'update-password' && (
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
            )}

            {view !== 'forgot-password' && view !== 'magic-link' && (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-sm font-medium text-gray-700">
                    {view === 'update-password' ? 'New Password' : 'Password'}
                  </label>
                  {view === 'sign-in' && (
                    <button type="button" onClick={() => setView('forgot-password')} className="text-xs font-bold text-blue-600 hover:text-blue-700 transition-colors">
                      Forgot password?
                    </button>
                  )}
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full bg-white border border-gray-300 rounded-xl py-3 px-4 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  placeholder="••••••••"
                />
              </div>
            )}

            {error && (
              <div className="text-red-600 text-sm flex items-start gap-2 bg-red-50 p-3 rounded-xl border border-red-100">
                <AlertTriangle size={18} className="shrink-0 mt-0.5 text-red-500" />
                <span className="leading-relaxed">{error}</span>
              </div>
            )}

            <button disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3.5 rounded-xl font-bold transition-all disabled:opacity-70 mt-2 flex items-center justify-center gap-2 shadow-sm">
              {loading ? <><Loader2 size={18} className="animate-spin" /> Please wait...</> : 
                view === 'sign-up' ? 'Create Account' : 
                view === 'forgot-password' ? 'Send Reset Link' :
                view === 'update-password' ? 'Update Password' :
                view === 'magic-link' ? 'Send Magic Link' :
                'Sign In'
              }
            </button>
            
            {view === 'sign-in' && (
              <div className="mt-4 text-center">
                <button type="button" onClick={() => setView('magic-link')} className="text-sm font-bold text-blue-600 hover:text-blue-700 transition-colors">
                  Use a Magic Link instead
                </button>
              </div>
            )}

            {(view === 'forgot-password' || view === 'magic-link') && (
              <button type="button" onClick={() => setView('sign-in')} className="w-full bg-gray-50 hover:bg-gray-100 text-gray-700 py-3.5 rounded-xl font-bold transition-all border border-gray-200 mt-3 flex items-center justify-center gap-2">
                Back to Sign In
              </button>
            )}
          </form>
        </>
      )}
    </div>
    )
  );
}