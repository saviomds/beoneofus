"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { useRouter } from 'next/navigation';
import {
  AlertTriangle,
  ShieldCheck,
  Loader2,
  Eye,
  EyeOff,
  ArrowLeft,
  CheckCircle2,
  XCircle,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const USERNAME_RE = /^[a-z0-9_-]{3,20}$/;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Simple password-strength scorer: returns 0–4 */
function scorePassword(pw) {
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  return score;
}

const STRENGTH_LABELS = ['', 'Weak', 'Fair', 'Good', 'Strong'];
const STRENGTH_COLORS = ['', 'bg-red-500', 'bg-amber-400', 'bg-emerald-400', 'bg-emerald-500'];

function PasswordStrength({ password }) {
  const score = scorePassword(password);
  if (!password) return null;
  return (
    <div className="mt-2 space-y-1">
      <div className="flex gap-1">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-all duration-200 ${
              i <= score ? STRENGTH_COLORS[score] : 'bg-gray-200 dark:bg-gray-700'
            }`}
          />
        ))}
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-400">
        {STRENGTH_LABELS[score]}
      </p>
    </div>
  );
}

function PasswordInput({ id, value, onChange, placeholder = '••••••••', label, extra }) {
  const [show, setShow] = useState(false);
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        {label && (
          <label htmlFor={id} className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            {label}
          </label>
        )}
        {extra}
      </div>
      <div className="relative">
        <input
          id={id}
          type={show ? 'text' : 'password'}
          required
          value={value}
          onChange={onChange}
          className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl py-3 px-4 pr-11 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
          placeholder={placeholder}
          autoComplete={id === 'confirm-password' ? 'new-password' : 'current-password'}
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          tabIndex={-1}
          aria-label={show ? 'Hide password' : 'Show password'}
        >
          {show ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function AuthForm() {
  const router = useRouter();

  const [view, setView] = useState('sign-in');
  // ^ 'sign-in' | 'sign-up' | 'forgot-password' | 'update-password' | 'magic-link'

  const [loading, setLoading] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [username, setUsername] = useState('');
  // 'idle' | 'checking' | 'available' | 'taken' | 'invalid'
  const [usernameStatus, setUsernameStatus] = useState('idle');
  const usernameTimer = useRef(null);

  const [error, setError] = useState(null);
  const [successInfo, setSuccessInfo] = useState(null); // { title, message } | null

  // -------------------------------------------------------------------------
  // Auth state bootstrap
  // -------------------------------------------------------------------------
  useEffect(() => {
    let isMounted = true;

    const bootstrap = async () => {
      try {
        // Handle password-recovery token in URL hash
        if (typeof window !== 'undefined' && window.location.hash.includes('type=recovery')) {
          if (isMounted) {
            setView('update-password');
            setIsCheckingAuth(false);
          }
          return;
        }

        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!isMounted) return;

        if (session) {
          const params = new URLSearchParams(window.location.search);
          const next = params.get('next');
          window.location.href = (next && next.startsWith('/')) ? next : '/dash';
        } else {
          setIsCheckingAuth(false);
        }
      } catch (err) {
        console.error('Auth bootstrap error:', err);
        if (isMounted) setIsCheckingAuth(false);
      }
    };

    bootstrap();

    let subscription = null;
    try {
      const result = supabase.auth.onAuthStateChange((event, session) => {
        if (!isMounted) return;

        if (event === 'PASSWORD_RECOVERY') {
          setView('update-password');
          setIsCheckingAuth(false);
          return; // stay on page — user must set new password
        }

        if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && session) {
          // If the URL hash contains type=recovery the user arrived via a reset
          // link — do NOT redirect yet, let them set their new password first.
          if (typeof window !== 'undefined' && window.location.hash.includes('type=recovery')) {
            setView('update-password');
            setIsCheckingAuth(false);
            return;
          }

          const pendingUsername = localStorage.getItem('pending_username');
          if (pendingUsername) {
            localStorage.removeItem('pending_username');
            supabase.from('profiles')
              .update({ username: pendingUsername })
              .eq('id', session.user.id)
              .is('username', null)
              .then(() => {});
          }
          const params = new URLSearchParams(window.location.search);
          const next = params.get('next');
          window.location.href = (next && next.startsWith('/')) ? next : '/dash';
        }
      });
      subscription = result.data?.subscription ?? null;
    } catch (err) {
      console.error('onAuthStateChange setup error:', err);
    }

    return () => {
      isMounted = false;
      subscription?.unsubscribe();
    };
  }, []);

  // -------------------------------------------------------------------------
  // Username debounced uniqueness check
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (view !== 'sign-up') return;
    clearTimeout(usernameTimer.current);

    if (!username) { setUsernameStatus('idle'); return; }
    if (!USERNAME_RE.test(username)) { setUsernameStatus('invalid'); return; }

    setUsernameStatus('checking');
    usernameTimer.current = setTimeout(async () => {
      const { count } = await supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('username', username);
      setUsernameStatus(count === 0 ? 'available' : 'taken');
    }, 450);

    return () => clearTimeout(usernameTimer.current);
  }, [username, view]);

  // -------------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------------
  const resetForm = useCallback(() => {
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setUsername('');
    setUsernameStatus('idle');
    setError(null);
  }, []);

  const switchView = useCallback(
    (nextView) => {
      resetForm();
      setSuccessInfo(null);
      setView(nextView);
    },
    [resetForm],
  );

  // -------------------------------------------------------------------------
  // Submission handler
  // -------------------------------------------------------------------------
  const handleAuth = async (e) => {
    e.preventDefault();
    setError(null);

    // Client-side validation
    if (view === 'sign-up') {
      if (!USERNAME_RE.test(username)) {
        setError('Username must be 3–20 characters: lowercase letters, numbers, _ or -');
        return;
      }
      if (usernameStatus === 'taken') {
        setError('That username is already taken. Please choose another.');
        return;
      }
      if (usernameStatus === 'checking') {
        setError('Still checking username availability, please wait a moment.');
        return;
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match.');
        return;
      }
      if (scorePassword(password) < 2) {
        setError('Password is too weak. Use at least 8 characters with mixed case or numbers.');
        return;
      }
    }

    if (view === 'update-password') {
      if (password !== confirmPassword) {
        setError('Passwords do not match.');
        return;
      }
    }

    setLoading(true);

    try {
      switch (view) {
        case 'sign-up': {
          localStorage.setItem('pending_username', username);
          // Note: a SQL trigger on Supabase handles `profiles` table insertion.
          const { error: err } = await supabase.auth.signUp({
            email,
            password,
            options: {
              emailRedirectTo: `${window.location.origin}/auth`,
              data: { username },
            },
          });
          if (err) {
            localStorage.removeItem('pending_username');
            throw err;
          }
          setSuccessInfo({
            title: 'Verify your email',
            message:
              'We sent a verification link to your email address. Please verify your account to continue.',
          });
          break;
        }

        case 'magic-link': {
          const { error: err } = await supabase.auth.signInWithOtp({
            email,
            options: { emailRedirectTo: `${window.location.origin}/auth` },
          });
          if (err) throw err;
          setSuccessInfo({
            title: 'Magic link sent',
            message: 'Check your email for the magic link. Click it to securely sign in.',
          });
          break;
        }

        case 'forgot-password': {
          const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
            // BUG FIX: was /auth?type=recovery — query param is ignored by Supabase.
            // Supabase appends #type=recovery to the hash automatically.
            redirectTo: `${window.location.origin}/auth`,
          });
          if (err) throw err;
          setSuccessInfo({
            title: 'Reset link sent',
            message: 'Check your email for the password reset link.',
          });
          break;
        }

        case 'update-password': {
          const { error: err } = await supabase.auth.updateUser({ password });
          if (err) throw err;
          // Clear the recovery hash so it doesn't interfere on next visit
          if (typeof window !== 'undefined') {
            window.history.replaceState(null, '', window.location.pathname);
          }
          setSuccessInfo({
            title: 'Password updated!',
            message: 'Your new password is set. You\'re now signed in — go to your dashboard.',
          });
          break;
        }

        default: {
          // sign-in
          const { error: err } = await supabase.auth.signInWithPassword({ email, password });
          if (err) {
            if (err.message.toLowerCase().includes('email not confirmed')) {
              throw new Error(
                'Please verify your email address before signing in. Check your inbox.',
              );
            }
            throw err;
          }
          // Navigation is handled by the onAuthStateChange listener (SIGNED_IN event).
          // Fallback in case the listener fires before this line:
          window.location.href = '/dash';
          break;
        }
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // -------------------------------------------------------------------------
  // OAuth handler
  // -------------------------------------------------------------------------
  const handleOAuthLogin = async (provider) => {
    setLoading(true);
    setError(null);
    try {
      const { error: err } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          // BUG FIX: was redirecting back to /auth which could loop.
          // Redirect to /dash; Supabase will call the onAuthStateChange listener.
          redirectTo: `${window.location.origin}/dash`,
        },
      });
      if (err) throw err;
      // Browser will navigate away; no need to setLoading(false)
    } catch (err) {
      setError(err.message);
      setLoading(false); // Only reset on error — success navigates away
    }
  };

  // -------------------------------------------------------------------------
  // Success card
  // -------------------------------------------------------------------------
  if (successInfo) {
    return (
      <div className="w-full animate-in fade-in zoom-in-95 duration-500">
        <div className="py-6 text-center space-y-3">
          <div className="relative w-16 h-16 mx-auto mb-2">
            <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/40 rounded-2xl flex items-center justify-center">
              <ShieldCheck size={30} className="text-emerald-600 dark:text-emerald-400" />
            </div>
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            </span>
          </div>
          <p className="text-xl font-black text-gray-900 dark:text-gray-100 tracking-tight">
            {successInfo.title}
          </p>
          <p className="text-gray-500 dark:text-gray-400 text-sm max-w-xs mx-auto leading-relaxed">
            {successInfo.message}
          </p>
          <button
            onClick={() => {
              setSuccessInfo(null);
              if (view === 'update-password') {
                window.location.href = '/dash';
              } else {
                switchView('sign-in');
              }
            }}
            className="mt-4 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white transition-all rounded-xl font-bold text-sm w-full shadow-sm"
          >
            {view === 'update-password' ? 'Go to dashboard →' : 'Back to sign in'}
          </button>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Loading skeleton (checking session)
  // -------------------------------------------------------------------------
  if (isCheckingAuth) {
    return (
      <div className="w-full space-y-6 animate-pulse">
        <div className="flex gap-6 mb-8 border-b border-gray-200 dark:border-gray-800 pb-px">
          <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-16 pb-3" />
          <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-24 pb-3" />
        </div>
        <div className="space-y-5">
          <div>
            <div className="h-3 bg-gray-200 dark:bg-gray-800 rounded w-24 mb-2" />
            <div className="h-12 bg-gray-200 dark:bg-gray-800 rounded-xl w-full" />
          </div>
          <div>
            <div className="h-3 bg-gray-200 dark:bg-gray-800 rounded w-20 mb-2" />
            <div className="h-12 bg-gray-200 dark:bg-gray-800 rounded-xl w-full" />
          </div>
          <div className="h-12 bg-gray-200 dark:bg-gray-800 rounded-xl w-full mt-6" />
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Main form render
  // -------------------------------------------------------------------------
  const isSignInOrUp = view === 'sign-in' || view === 'sign-up';

  return (
    <div className="w-full animate-in fade-in zoom-in-95 duration-500">
      {/* Tab bar */}
      {isSignInOrUp && (
        <div className="flex gap-6 mb-8 border-b border-gray-200 dark:border-gray-800 pb-px text-sm font-medium">
          {['sign-in', 'sign-up'].map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => switchView(v)}
              className={`pb-3 transition-all ${
                view === v
                  ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
              }`}
            >
              {v === 'sign-in' ? 'Sign in' : 'Create account'}
            </button>
          ))}
        </div>
      )}

      {/* OAuth buttons — shown only on sign-in / sign-up */}
      {isSignInOrUp && (
        <>
          <div className="flex gap-3 mb-6">
            {/* GitHub */}
            <button
              type="button"
              onClick={() => handleOAuthLogin('github')}
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-[#24292F] dark:bg-white hover:bg-[#24292F]/90 dark:hover:bg-gray-200 text-white dark:text-gray-900 text-sm font-bold transition-all shadow-sm disabled:opacity-60"
            >
              <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
              </svg>
              GitHub
            </button>

            {/* NEW: Google OAuth */}
            <button
              type="button"
              onClick={() => handleOAuthLogin('google')}
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 text-sm font-bold transition-all shadow-sm disabled:opacity-60"
            >
              <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              Google
            </button>
          </div>

          <div className="relative flex items-center gap-2 mb-6">
            <div className="flex-grow border-t border-gray-200 dark:border-gray-800" />
            <span className="text-[10px] uppercase font-black text-gray-400 dark:text-gray-500 tracking-widest">
              or continue with
            </span>
            <div className="flex-grow border-t border-gray-200 dark:border-gray-800" />
          </div>
        </>
      )}

      {/* Sub-view headers */}
      {view === 'forgot-password' && (
        <div className="mb-8 text-center">
          <div className="w-14 h-14 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/40 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-600 dark:text-blue-400">
              <rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
            </svg>
          </div>
          <h2 className="text-xl font-black text-gray-900 dark:text-gray-100 mb-1.5 tracking-tight">
            Forgot your password?
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed max-w-xs mx-auto">
            No worries — enter your email and we'll send a secure reset link right away.
          </p>
        </div>
      )}
      {view === 'magic-link' && (
        <div className="mb-8 text-center">
          <div className="w-14 h-14 bg-violet-50 dark:bg-violet-900/20 border border-violet-100 dark:border-violet-800/40 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-violet-600 dark:text-violet-400">
              <path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/>
            </svg>
          </div>
          <h2 className="text-xl font-black text-gray-900 dark:text-gray-100 mb-1.5 tracking-tight">
            Passwordless sign-in
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed max-w-xs mx-auto">
            Enter your email and we'll send a secure magic link — no password needed.
          </p>
        </div>
      )}
      {view === 'update-password' && (
        <div className="mb-8 text-center">
          <div className="w-14 h-14 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800/40 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-600 dark:text-emerald-400">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
          </div>
          <h2 className="text-xl font-black text-gray-900 dark:text-gray-100 mb-1.5 tracking-tight">
            Set new password
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed max-w-xs mx-auto">
            Choose a strong password to secure your beoneofus account.
          </p>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleAuth} className="space-y-5">
        {/* Email — hidden only on update-password */}
        {view !== 'update-password' && (
          <div>
            <label
              htmlFor="auth-email"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5"
            >
              Email address
            </label>
            <input
              id="auth-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl py-3 px-4 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              placeholder="you@example.com"
              autoComplete="email"
            />
          </div>
        )}

        {/* Username — sign-up only */}
        {view === 'sign-up' && (
          <div>
            <label
              htmlFor="auth-username"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5"
            >
              Username
            </label>
            <div className="relative">
              <input
                id="auth-username"
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase())}
                className={`w-full bg-white dark:bg-gray-900 border rounded-xl py-3 px-4 pr-11 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all ${
                  usernameStatus === 'taken' || usernameStatus === 'invalid'
                    ? 'border-red-400 dark:border-red-500'
                    : usernameStatus === 'available'
                    ? 'border-emerald-400 dark:border-emerald-500'
                    : 'border-gray-300 dark:border-gray-700'
                }`}
                placeholder="your_username"
                autoComplete="username"
                maxLength={20}
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                {usernameStatus === 'checking' && (
                  <Loader2 size={16} className="animate-spin text-gray-400" />
                )}
                {usernameStatus === 'available' && (
                  <CheckCircle2 size={16} className="text-emerald-500" />
                )}
                {(usernameStatus === 'taken' || usernameStatus === 'invalid') && (
                  <XCircle size={16} className="text-red-500" />
                )}
              </div>
            </div>
            {usernameStatus === 'invalid' && username && (
              <p className="mt-1 text-xs text-red-500">3–20 chars: lowercase, numbers, _ or -</p>
            )}
            {usernameStatus === 'taken' && (
              <p className="mt-1 text-xs text-red-500">Username already taken</p>
            )}
            {usernameStatus === 'available' && (
              <p className="mt-1 text-xs text-emerald-600 dark:text-emerald-400">Username available</p>
            )}
          </div>
        )}

        {/* Password — hidden on forgot-password and magic-link */}
        {view !== 'forgot-password' && view !== 'magic-link' && (
          <div>
            <PasswordInput
              id="auth-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              label={view === 'update-password' ? 'New password' : 'Password'}
              extra={
                view === 'sign-in' ? (
                  <button
                    type="button"
                    onClick={() => switchView('forgot-password')}
                    className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
                  >
                    Forgot password?
                  </button>
                ) : null
              }
            />
            {/* NEW: password strength meter on sign-up and update-password */}
            {(view === 'sign-up' || view === 'update-password') && (
              <PasswordStrength password={password} />
            )}
          </div>
        )}

        {/* NEW: confirm password on sign-up and update-password */}
        {(view === 'sign-up' || view === 'update-password') && (
          <PasswordInput
            id="confirm-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            label="Confirm password"
          />
        )}

        {/* Error message */}
        {error && (
          <div className="text-red-600 dark:text-red-400 text-sm flex items-start gap-2 bg-red-50 dark:bg-red-900/20 p-3 rounded-xl border border-red-100 dark:border-red-900/50">
            <AlertTriangle size={18} className="shrink-0 mt-0.5 text-red-500" />
            <span className="leading-relaxed">{error}</span>
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3.5 rounded-xl font-bold transition-all disabled:opacity-70 mt-2 flex items-center justify-center gap-2 shadow-sm"
        >
          {loading ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              Please wait…
            </>
          ) : view === 'sign-up' ? (
            'Create account'
          ) : view === 'forgot-password' ? (
            'Send reset link'
          ) : view === 'update-password' ? (
            'Update password'
          ) : view === 'magic-link' ? (
            'Send magic link'
          ) : (
            'Sign in'
          )}
        </button>

        {/* Magic-link toggle (sign-in only) */}
        {view === 'sign-in' && (
          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={() => switchView('magic-link')}
              className="text-sm font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
            >
              Use a magic link instead
            </button>
          </div>
        )}

        {/* Back button on secondary views */}
        {(view === 'forgot-password' || view === 'magic-link') && (
          <button
            type="button"
            onClick={() => switchView('sign-in')}
            className="w-full bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 py-3.5 rounded-xl font-bold transition-all border border-gray-200 dark:border-gray-700 mt-3 flex items-center justify-center gap-2"
          >
            <ArrowLeft size={16} />
            Back to sign in
          </button>
        )}
      </form>
    </div>
  );
}