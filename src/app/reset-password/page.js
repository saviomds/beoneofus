"use client";

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { supabase } from '../supabaseClient';
import { AlertTriangle, ShieldCheck, Eye, EyeOff, Loader2 } from 'lucide-react';

function PasswordInput({ id, label, value, onChange }) {
  const [show, setShow] = useState(false);
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={show ? 'text' : 'password'}
          required
          value={value}
          onChange={onChange}
          className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl py-3 px-4 pr-11 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
          placeholder="••••••••"
          autoComplete="new-password"
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

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [success, setSuccess] = useState(false);
  const sessionReadyRef = useRef(false);

  useEffect(() => {
    // Check whether Supabase has already exchanged the code (handles timing where
    // detectSessionInUrl finishes before this effect runs).
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session && !sessionReadyRef.current) {
        sessionReadyRef.current = true;
        setSessionReady(true);
      }
    });

    // Also listen for the auth state change — handles cases where the code exchange
    // finishes after this effect runs (the common PKCE timing).
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (
        (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN' || event === 'INITIAL_SESSION') &&
        session &&
        !sessionReadyRef.current
      ) {
        sessionReadyRef.current = true;
        setSessionReady(true);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (updateError) {
      setError(updateError.message);
    } else {
      setSuccess(true);
    }
  };

  if (success) {
    return (
      <div className="w-full max-w-lg z-10 p-8">
        <div className="text-center mb-10">
          <Link href="/" className="inline-block group">
            <h1 className="text-5xl font-black tracking-tighter text-gray-900 dark:text-gray-100 mb-2 transition-all group-hover:scale-105">
              beone<span className="text-blue-500">of</span>us
            </h1>
          </Link>
        </div>
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-8 rounded-2xl shadow-xl">
          <div className="py-6 text-center space-y-3">
            <div className="relative w-16 h-16 mx-auto mb-2">
              <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/40 rounded-2xl flex items-center justify-center">
                <ShieldCheck size={30} className="text-emerald-600 dark:text-emerald-400" />
              </div>
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </span>
            </div>
            <p className="text-xl font-black text-gray-900 dark:text-gray-100 tracking-tight">Password updated!</p>
            <p className="text-gray-500 dark:text-gray-400 text-sm max-w-xs mx-auto leading-relaxed">
              Your new password is set. You&apos;re now signed in — go to your dashboard.
            </p>
            <a
              href="/dash"
              className="mt-4 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white transition-all rounded-xl font-bold text-sm w-full shadow-sm block text-center"
            >
              Go to dashboard →
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-lg z-10 p-8">
      <div className="text-center mb-10">
        <Link href="/" className="inline-block group">
          <h1 className="text-5xl font-black tracking-tighter text-gray-900 dark:text-gray-100 mb-2 transition-all group-hover:scale-105">
            beone<span className="text-blue-500">of</span>us
          </h1>
        </Link>
        <p className="text-gray-500 dark:text-gray-400 text-sm font-light tracking-wide uppercase">
          Developer Network &amp; Collaboration
        </p>
      </div>

      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-8 rounded-2xl shadow-xl">
        <div className="mb-8 text-center">
          <div className="w-14 h-14 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800/40 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-600 dark:text-emerald-400">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>
          <h2 className="text-xl font-black text-gray-900 dark:text-gray-100 mb-1.5 tracking-tight">Set new password</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed max-w-xs mx-auto">
            Choose a strong password to secure your beoneofus account.
          </p>
        </div>

        {!sessionReady && (
          <div className="flex items-center justify-center gap-2 mb-6 text-sm text-gray-500 dark:text-gray-400">
            <Loader2 size={16} className="animate-spin" />
            Verifying reset link…
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <PasswordInput
            id="new-password"
            label="New password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <PasswordInput
            id="confirm-password"
            label="Confirm password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />

          {error && (
            <div className="text-red-600 dark:text-red-400 text-sm flex items-start gap-2 bg-red-50 dark:bg-red-900/20 p-3 rounded-xl border border-red-100 dark:border-red-900/50">
              <AlertTriangle size={18} className="shrink-0 mt-0.5 text-red-500" />
              <span className="leading-relaxed">{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !sessionReady}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3.5 rounded-xl font-bold transition-all disabled:opacity-70 mt-2 flex items-center justify-center gap-2 shadow-sm"
          >
            {loading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Updating…
              </>
            ) : (
              'Update password'
            )}
          </button>
        </form>
      </div>

      <div className="text-center mt-8">
        <Link
          href="/auth"
          className="group text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 text-sm transition-colors flex items-center justify-center gap-2"
        >
          <span className="group-hover:-translate-x-1 transition-transform">←</span>
          Back to sign in
        </Link>
      </div>
    </div>
  );
}
