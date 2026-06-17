"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../supabaseClient';
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

// ─── Constants ────────────────────────────────────────────────────────────────

const USERNAME_RE = /^[a-z0-9_-]{3,20}$/;
const EMAIL_RE    = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// ─── Utilities ────────────────────────────────────────────────────────────────

function mapAuthError(message) {
  if (!message) return 'Something went wrong. Please try again.';
  const m = message.toLowerCase();
  if (m.includes('invalid login credentials') || m.includes('invalid credentials'))
    return 'Incorrect email or password.';
  if (m.includes('email not confirmed'))
    return 'Please verify your email address before signing in.';
  if (m.includes('user already registered') || m.includes('already been registered'))
    return 'An account with this email already exists. Try signing in.';
  if (m.includes('password should be') || m.includes('password is too short'))
    return 'Password must be at least 6 characters.';
  if (m.includes('rate limit') || m.includes('too many') || m.includes('security purposes'))
    return 'Too many attempts. Please wait a moment and try again.';
  if (m.includes('network') || m.includes('fetch failed'))
    return 'Connection error. Check your internet and try again.';
  if (m.includes('user not found') || m.includes('no user found'))
    return 'No account found with that email.';
  return message;
}

function scorePassword(pw) {
  let s = 0;
  if (pw.length >= 8) s++;
  if (/[A-Z]/.test(pw)) s++;
  if (/[0-9]/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  return s;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function PasswordStrength({ password }) {
  const score = scorePassword(password);
  if (!password) return null;
  const labels = ['', 'Weak', 'Fair', 'Good', 'Strong'];
  const colors = ['', 'bg-red-500', 'bg-amber-400', 'bg-emerald-400', 'bg-emerald-500'];
  return (
    <div className="mt-2 space-y-1">
      <div className="flex gap-1">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-all duration-200 ${
              i <= score ? colors[score] : 'bg-gray-200 dark:bg-gray-700'
            }`}
          />
        ))}
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-400">{labels[score]}</p>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function AuthForm() {
  // view: 'sign-in' | 'sign-up' | 'forgot-password' | 'update-password' | 'magic-link'
  const [view, setView] = useState('sign-in');

  const [loading, setLoading]               = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  // Form fields
  const [email,           setEmail]           = useState('');
  const [password,        setPassword]        = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [username,        setUsername]        = useState('');
  const [otpCode,         setOtpCode]         = useState('');
  const [showPw,          setShowPw]          = useState(false);
  const [referralCode,    setReferralCode]    = useState('');

  // sign-in steps: 'email' | 'password' | 'otp'
  // sign-up steps: 'email' | 'details'
  const [signInStep, setSignInStep] = useState('email');

  // username async check: 'idle' | 'checking' | 'available' | 'taken' | 'invalid'
  const [usernameStatus, setUsernameStatus] = useState('idle');
  const usernameTimer = useRef(null);

  const [error,                    setError]                    = useState(null);
  const [successInfo,              setSuccessInfo]              = useState(null);
  const [emailNotConfirmed,        setEmailNotConfirmed]        = useState(null);
  const [resendCooldown,           setResendCooldown]           = useState(0);
  const [registrationOpen,         setRegistrationOpen]         = useState(true);
  const [requireEmailVerification, setRequireEmailVerification] = useState(true);
  const requireEmailVerifyRef = useRef(true);

  const isRecoveryFlow = useRef(false);

  // ── Fetch public platform settings ────────────────────────────────────────
  useEffect(() => {
    fetch('/api/public-settings')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d) {
          setRegistrationOpen(d.registrationOpen ?? true);
          const rev = d.requireEmailVerification ?? true;
          setRequireEmailVerification(rev);
          requireEmailVerifyRef.current = rev;
        }
      })
      .catch(() => {});
  }, []);

  // ── Read ?error= param set by middleware (session_expired, email_not_verified) ──
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const errCode = params.get('error');
    if (errCode === 'session_expired') {
      supabase?.auth.signOut().catch(() => {});
      setError('Your session has expired. Please sign in again.');
    } else if (errCode === 'email_not_verified') {
      setError('Please verify your email address before accessing the platform.');
    } else if (errCode === 'auth_callback_failed') {
      setError('Sign-in failed. Please try again.');
    }
    // Remove the error param from the URL so it doesn't persist on reload
    if (errCode) {
      const clean = new URL(window.location.href);
      clean.searchParams.delete('error');
      window.history.replaceState(null, '', clean.pathname + (clean.search !== '?' ? clean.search : ''));
    }
  }, []);

  // ── Pre-fill referral code from ?ref= URL param ────────────────────────────
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const ref = new URLSearchParams(window.location.search).get('ref');
    if (ref) setReferralCode(ref.toUpperCase());
  }, []);

  // ── Auth bootstrap: check existing session + handle recovery URL ───────────
  useEffect(() => {
    if (!supabase) { setIsCheckingAuth(false); return; }
    let mounted = true;

    async function bootstrap() {
      try {
        if (typeof window !== 'undefined') {
          const isRecovery =
            window.location.hash.includes('type=recovery') ||
            window.location.search.includes('recovery=1');
          if (isRecovery) {
            isRecoveryFlow.current = true;
            if (mounted) { setView('update-password'); setIsCheckingAuth(false); }
            return;
          }
        }

        const { data: { session } } = await supabase.auth.getSession();
        if (!mounted) return;

        if (session) {
          // Fire welcome/notification email for recent OAuth sign-ins
          const provider = session.user.app_metadata?.provider;
          const justSignedIn = Date.now() - new Date(session.user.last_sign_in_at).getTime() < 30_000;
          if (provider && provider !== 'email' && justSignedIn) {
            const isNew = Date.now() - new Date(session.user.created_at).getTime() < 120_000;
            fetch('/api/auth/send-welcome', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                email: session.user.email,
                name: session.user.user_metadata?.full_name || session.user.user_metadata?.name || '',
                isNewUser: isNew,
              }),
            }).catch(() => {});
          }

          const params = new URLSearchParams(window.location.search);
          const next = params.get('next');
          window.location.href = next?.startsWith('/') ? next : '/dash';
        } else {
          if (mounted) setIsCheckingAuth(false);
        }
      } catch (err) {
        console.error('[AuthForm bootstrap]', err);
        if (mounted) setIsCheckingAuth(false);
      }
    }

    bootstrap();

    let subscription = null;
    try {
      const { data } = supabase.auth.onAuthStateChange((event, session) => {
        if (!mounted) return;

        if (event === 'PASSWORD_RECOVERY') {
          isRecoveryFlow.current = true;
          setView('update-password');
          setIsCheckingAuth(false);
          return;
        }

        if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && session) {
          // Stay on page for recovery flow so the user can set a new password
          if (
            isRecoveryFlow.current ||
            window.location.hash.includes('type=recovery') ||
            window.location.search.includes('recovery=1')
          ) {
            isRecoveryFlow.current = true;
            setView('update-password');
            setIsCheckingAuth(false);
            return;
          }

          // Block access until email is confirmed (only when platform requires it)
          if (requireEmailVerifyRef.current && !session.user.email_confirmed_at) {
            const unconfirmed = session.user.email;
            supabase.auth.signOut().then(() => {
              if (!mounted) return;
              setEmailNotConfirmed(unconfirmed);
              setIsCheckingAuth(false);
            });
            return;
          }

          // Persist the chosen username into the profile (set during sign-up)
          const pendingUsername =
            localStorage.getItem('pending_username') || session.user.user_metadata?.username;

          const redirect = () => {
            const params = new URLSearchParams(window.location.search);
            const next = params.get('next');
            window.location.href = next?.startsWith('/') ? next : '/dash';
          };

          if (pendingUsername) {
            const pendingRefCode = localStorage.getItem('pending_referral_code') ?? '';
            localStorage.removeItem('pending_username');
            if (pendingRefCode) localStorage.removeItem('pending_referral_code');
            supabase
              .from('profiles')
              .upsert(
                { id: session.user.id, email: session.user.email, username: pendingUsername },
                { onConflict: 'id', ignoreDuplicates: false },
              )
              .then(({ error: upsertErr }) => {
                if (upsertErr?.code === '23505') localStorage.setItem('pick_username', '1');
                if (pendingRefCode) {
                  fetch('/api/referral/redeem', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      'Authorization': `Bearer ${session.access_token}`,
                    },
                    body: JSON.stringify({ code: pendingRefCode }),
                  }).catch(() => {});
                }
                redirect();
              });
          } else {
            redirect();
          }
        }
      });
      subscription = data?.subscription ?? null;
    } catch (err) {
      console.error('[AuthForm onAuthStateChange]', err);
    }

    return () => {
      mounted = false;
      subscription?.unsubscribe();
    };
  }, []);

  // ── Username uniqueness debounce ───────────────────────────────────────────
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

  // ── OTP resend countdown ───────────────────────────────────────────────────
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const id = setTimeout(() => setResendCooldown((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [resendCooldown]);

  // ── Helpers ────────────────────────────────────────────────────────────────

  const resetForm = useCallback(() => {
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setUsername('');
    setReferralCode('');
    setUsernameStatus('idle');
    setOtpCode('');
    setError(null);
    setSignInStep('email');
    setShowPw(false);
  }, []);

  const switchView = useCallback(
    (next) => { resetForm(); setSuccessInfo(null); setView(next); },
    [resetForm],
  );

  const handleResendOtp = async () => {
    setError(null);
    const res = await fetch('/api/auth/resend-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      if (res.status === 429) setResendCooldown(data.waitSeconds ?? 60);
      setError(data.error || 'Failed to resend code. Please try again.');
      return;
    }
    setResendCooldown(60);
    setOtpCode('');
  };

  // ── Main submit handler ────────────────────────────────────────────────────

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    // Client-side validation before hitting the network
    const isEmailStep =
      view === 'magic-link' ||
      view === 'forgot-password' ||
      (view === 'sign-up'  && signInStep === 'email') ||
      (view === 'sign-in'  && signInStep === 'email');

    if (isEmailStep && !EMAIL_RE.test(email.trim())) {
      setError('Please enter a valid email address.');
      return;
    }

    if (view === 'sign-up' && signInStep === 'details') {
      if (!USERNAME_RE.test(username)) {
        setError('Username must be 3–20 characters: lowercase letters, numbers, _ or -');
        return;
      }
      if (usernameStatus === 'taken')    { setError('That username is already taken. Choose another.'); return; }
      if (usernameStatus === 'checking') { setError('Still checking username availability — please wait a moment.'); return; }
      if (password !== confirmPassword)  { setError('Passwords do not match.'); return; }
      if (scorePassword(password) < 2)   {
        setError('Password is too weak. Use at least 8 characters with mixed case or numbers.');
        return;
      }
    }

    if (view === 'update-password') {
      if (password !== confirmPassword) { setError('Passwords do not match.'); return; }
    }

    setLoading(true);

    try {
      // ── Sign-up ────────────────────────────────────────────────────────
      if (view === 'sign-up') {
        if (signInStep === 'email') {
          setSignInStep('details');
        } else {
          localStorage.setItem('pending_username', username);
          if (referralCode.trim()) localStorage.setItem('pending_referral_code', referralCode.trim().toUpperCase());
          const { error: err } = await supabase.auth.signUp({
            email: email.trim(),
            password,
            options: {
              emailRedirectTo: `${window.location.origin}/auth/callback`,
              data: { username },
            },
          });
          if (err) {
            localStorage.removeItem('pending_username');
            throw err;
          }
          setSuccessInfo({
            title: 'Check your inbox',
            message: `We sent a confirmation link to ${email.trim()}. Click it to activate your account and get started.`,
          });
        }
        return;
      }

      // ── Magic link ─────────────────────────────────────────────────────
      if (view === 'magic-link') {
        const { error: err } = await supabase.auth.signInWithOtp({
          email: email.trim(),
          options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
        });
        if (err) throw err;
        setSuccessInfo({
          title: 'Magic link sent',
          message: `We sent a sign-in link to ${email.trim()}. Click it to securely sign in — no password needed.`,
        });
        return;
      }

      // ── Forgot password ────────────────────────────────────────────────
      if (view === 'forgot-password') {
        const res = await fetch('/api/auth/forgot-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: email.trim() }),
        });
        if (!res.ok) {
          const d = await res.json().catch(() => ({}));
          throw new Error(d.error || 'Failed to send reset link.');
        }
        setSuccessInfo({
          title: 'Reset link sent',
          message: 'Check your email for the password reset link. It may take a minute to arrive.',
        });
        return;
      }

      // ── Update password (after recovery) ──────────────────────────────
      if (view === 'update-password') {
        const { error: err } = await supabase.auth.updateUser({ password });
        if (err) throw err;
        isRecoveryFlow.current = false;
        // Clean recovery markers from URL
        const clean = new URL(window.location.href);
        clean.searchParams.delete('recovery');
        window.history.replaceState(null, '', clean.pathname + (clean.search !== '?' ? clean.search : ''));
        setSuccessInfo({
          title: 'Password updated!',
          message: "Your new password is set. You're now signed in — go to your dashboard.",
        });
        return;
      }

      // ── Sign-in (3-step: email → password → OTP) ──────────────────────
      if (signInStep === 'email') {
        setSignInStep('password');
        return;
      }

      if (signInStep === 'password') {
        // Step 2: verify credentials server-side (no browser session written yet)
        const credRes = await fetch('/api/auth/check-credentials', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: email.trim(), password }),
        });
        const credData = await credRes.json().catch(() => ({}));
        if (!credRes.ok) {
          if (credData.error === 'email_not_confirmed') {
            setEmailNotConfirmed(email.trim());
            return;
          }
          throw new Error(credData.error || 'Incorrect email or password.');
        }

        // Step 2b: send OTP to email for second factor
        const otpRes = await fetch('/api/auth/send-otp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: email.trim() }),
        });
        if (!otpRes.ok) {
          const otpData = await otpRes.json().catch(() => ({}));
          throw new Error(otpData.error || 'Failed to send verification code.');
        }

        setSignInStep('otp');
        return;
      }

      if (signInStep === 'otp') {
        // Step 3a: verify OTP
        const verifyRes = await fetch('/api/auth/verify-otp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: email.trim(), code: otpCode.trim() }),
        });
        const verifyData = await verifyRes.json().catch(() => ({}));
        if (!verifyRes.ok) throw new Error(verifyData.error || 'Invalid or expired code.');

        // Step 3b: create the actual browser session
        const { error: signInErr } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (signInErr) throw signInErr;
        // onAuthStateChange fires → redirects to /dash
      }
    } catch (err) {
      const msg = err?.message ?? '';
      const isRateLimit =
        msg.toLowerCase().includes('rate limit') ||
        msg.toLowerCase().includes('security purposes') ||
        msg.toLowerCase().includes('too many') ||
        err?.status === 429;

      if (isRateLimit && view === 'forgot-password') {
        setSuccessInfo({ title: 'Reset link sent', message: 'Check your email for the password reset link.' });
      } else if (isRateLimit && view === 'magic-link') {
        setSuccessInfo({ title: 'Magic link sent', message: `We sent a sign-in link to ${email.trim()}. Click it to sign in.` });
      } else {
        setError(mapAuthError(msg));
      }
    } finally {
      setLoading(false);
    }
  };

  // ── OAuth ──────────────────────────────────────────────────────────────────

  const handleOAuth = async (provider) => {
    setLoading(true);
    setError(null);
    try {
      const { error: err } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo: `${window.location.origin}/auth/callback` },
      });
      if (err) throw err;
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  // ── Shared style tokens ────────────────────────────────────────────────────

  const iCls =
    'w-full bg-gray-100/80 dark:bg-white/[0.07] rounded-2xl py-3.5 px-4 text-[15px] text-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-[#0071e3]/30 focus:bg-white dark:focus:bg-gray-800 transition-all duration-200 placeholder:text-gray-400 dark:placeholder:text-gray-500 border-0';

  // ── Sub-renders ────────────────────────────────────────────────────────────

  const PrimaryBtn = ({ label }) => (
    <button
      type="submit"
      disabled={loading}
      className="w-full bg-[#0071e3] hover:bg-[#0077ed] text-white rounded-full py-3.5 text-[15px] font-medium transition-all duration-150 disabled:opacity-50 flex items-center justify-center gap-2 active:scale-[0.98] shadow-sm shadow-[#0071e3]/20"
    >
      {loading ? <><Loader2 size={16} className="animate-spin" /> Please wait…</> : label}
    </button>
  );

  const PwField = ({ id, value, onChange, placeholder, autoFocus: af }) => (
    <div className="relative">
      <input
        id={id}
        type={showPw ? 'text' : 'password'}
        required
        value={value}
        onChange={onChange}
        autoFocus={af}
        placeholder={placeholder}
        autoComplete={id === 'confirm-password' ? 'new-password' : 'current-password'}
        className={`${iCls} pr-12`}
      />
      <button
        type="button"
        onClick={() => setShowPw((s) => !s)}
        tabIndex={-1}
        aria-label={showPw ? 'Hide password' : 'Show password'}
        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
      >
        {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    </div>
  );

  const ErrBanner = () =>
    error ? (
      <div className="flex items-start gap-2.5 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 rounded-2xl p-3.5 text-[13px] text-red-600 dark:text-red-400 animate-in fade-in slide-in-from-top-1 duration-200">
        <AlertTriangle size={14} className="shrink-0 mt-0.5 text-red-500" />
        <span>{error}</span>
      </div>
    ) : null;

  const OAuthBlock = () => (
    <div className="space-y-3 mb-5">
      <div className="flex gap-2.5">
        <button
          type="button"
          onClick={() => handleOAuth('github')}
          disabled={loading}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-full bg-gray-900 dark:bg-white hover:bg-gray-800 dark:hover:bg-gray-100 text-white dark:text-gray-900 text-sm font-medium transition-all disabled:opacity-50 active:scale-[0.98]"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
          </svg>
          GitHub
        </button>
        <button
          type="button"
          onClick={() => handleOAuth('google')}
          disabled={loading}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 text-sm font-medium transition-all disabled:opacity-50 active:scale-[0.98]"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Google
        </button>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-gray-100 dark:bg-white/10" />
        <span className="text-[11px] uppercase tracking-widest font-semibold text-gray-400 dark:text-gray-500">or</span>
        <div className="flex-1 h-px bg-gray-100 dark:bg-white/10" />
      </div>
    </div>
  );

  const SecurityBadge = () => (
    <div className="mt-6 pt-4 border-t border-gray-100 dark:border-gray-800/60">
      <div className="flex items-center justify-center gap-3 flex-wrap">
        <span className="flex items-center gap-1 text-[11px] text-gray-400 dark:text-gray-500">
          <ShieldCheck size={11} className="text-emerald-500" /> 2FA protected
        </span>
        <span className="w-px h-3 bg-gray-200 dark:bg-gray-700" />
        <span className="flex items-center gap-1 text-[11px] text-gray-400 dark:text-gray-500">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-blue-400">
            <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
          SSL encrypted
        </span>
        <span className="w-px h-3 bg-gray-200 dark:bg-gray-700" />
        <span className="flex items-center gap-1 text-[11px] text-gray-400 dark:text-gray-500">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-violet-400">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
          </svg>
          Private &amp; secure
        </span>
      </div>
    </div>
  );

  // ── Special render states ──────────────────────────────────────────────────

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

  if (successInfo) {
    return (
      <div className="w-full animate-in fade-in zoom-in-95 duration-500">
        <div className="py-6 text-center space-y-3">
          <div className="relative w-16 h-16 mx-auto mb-2">
            <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/40 rounded-2xl flex items-center justify-center">
              <ShieldCheck size={30} className="text-emerald-600 dark:text-emerald-400" />
            </div>
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </span>
          </div>
          <p className="text-xl font-black text-gray-900 dark:text-gray-100 tracking-tight">{successInfo.title}</p>
          <p className="text-gray-500 dark:text-gray-400 text-sm max-w-xs mx-auto leading-relaxed">{successInfo.message}</p>
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

  if (emailNotConfirmed) {
    const handleResendConfirmation = async () => {
      setLoading(true);
      setError(null);
      try {
        const { error: err } = await supabase.auth.resend({
          type: 'signup',
          email: emailNotConfirmed,
          options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
        });
        if (err) throw err;
        setSuccessInfo({
          title: 'Confirmation email sent',
          message: `We re-sent the confirmation link to ${emailNotConfirmed}. Click it to activate your account.`,
        });
        setEmailNotConfirmed(null);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    return (
      <div className="w-full animate-in fade-in zoom-in-95 duration-500">
        <div className="py-6 text-center space-y-3">
          <div className="w-16 h-16 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40 rounded-2xl flex items-center justify-center mx-auto mb-2">
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-500">
              <rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
            </svg>
          </div>
          <p className="text-xl font-black text-gray-900 dark:text-gray-100 tracking-tight">Confirm your email first</p>
          <p className="text-gray-500 dark:text-gray-400 text-sm max-w-xs mx-auto leading-relaxed">
            Your account isn't active yet. We sent a confirmation link to{' '}
            <strong className="text-gray-700 dark:text-gray-300">{emailNotConfirmed}</strong>.
            Click it to unlock your account.
          </p>
          {error && (
            <div className="text-red-600 dark:text-red-400 text-sm flex items-start gap-2 bg-red-50 dark:bg-red-900/20 p-3 rounded-xl border border-red-100 dark:border-red-900/50 text-left">
              <AlertTriangle size={16} className="shrink-0 mt-0.5 text-red-500" />
              <span className="leading-relaxed">{error}</span>
            </div>
          )}
          <button
            onClick={handleResendConfirmation}
            disabled={loading}
            className="mt-4 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white transition-all rounded-xl font-bold text-sm w-full shadow-sm flex items-center justify-center gap-2 disabled:opacity-70"
          >
            {loading ? <><Loader2 size={16} className="animate-spin" /> Sending…</> : 'Resend confirmation email'}
          </button>
          <button
            type="button"
            onClick={() => { setEmailNotConfirmed(null); setError(null); }}
            className="w-full bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 py-3 rounded-xl font-bold transition-all border border-gray-200 dark:border-gray-700 text-sm flex items-center justify-center gap-2"
          >
            <ArrowLeft size={14} /> Back to sign in
          </button>
        </div>
      </div>
    );
  }

  // ── Main form render ───────────────────────────────────────────────────────

  return (
    <div className="w-full">

      {/* ── Sign-in: step 1 — email ─────────────────────────────────────── */}
      {view === 'sign-in' && signInStep === 'email' && (
        <div className="animate-in fade-in slide-in-from-right-6 duration-300">
          <div className="text-center mb-7">
            <h1 className="text-2xl font-semibold tracking-tight text-gray-900 dark:text-white">Sign in</h1>
            <p className="text-[13px] text-gray-500 dark:text-gray-400 mt-1">with your beoneofus account</p>
          </div>
          <OAuthBlock />
          <form onSubmit={handleSubmit} className="space-y-3">
            <input
              id="auth-email"
              type="email"
              required
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={iCls}
              placeholder="Email"
              autoComplete="email"
            />
            <ErrBanner />
            <PrimaryBtn label="Continue" />
          </form>
          <div className="mt-6 space-y-2 text-center">
            <p className="text-[13px] text-gray-500 dark:text-gray-400">
              Don't have an account?{' '}
              <button type="button" onClick={() => switchView('sign-up')} className="text-[#0071e3] font-medium hover:underline">
                Create one
              </button>
            </p>
            <button
              type="button"
              onClick={() => switchView('forgot-password')}
              className="text-[12px] text-gray-400 dark:text-gray-500 hover:text-gray-500 dark:hover:text-gray-400 transition-colors block mx-auto"
            >
              Forgot your password?
            </button>
          </div>
        </div>
      )}

      {/* ── Sign-in: step 2 — password ──────────────────────────────────── */}
      {view === 'sign-in' && signInStep === 'password' && (
        <div className="animate-in fade-in slide-in-from-right-6 duration-300">
          <div className="text-center mb-7">
            <h1 className="text-2xl font-semibold tracking-tight text-gray-900 dark:text-white">Sign in</h1>
            <button
              type="button"
              onClick={() => { setSignInStep('email'); setPassword(''); setError(null); }}
              className="mt-1.5 inline-flex items-center gap-1.5 text-[13px] text-[#0071e3] hover:underline transition-colors"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
              {email}
            </button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-3">
            <PwField id="auth-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" autoFocus />
            <ErrBanner />
            <PrimaryBtn label="Sign in" />
          </form>
          <div className="mt-5 space-y-2 text-center">
            <button type="button" onClick={() => switchView('forgot-password')} className="text-[13px] text-[#0071e3] font-medium hover:underline block mx-auto">
              Forgot password?
            </button>
            <button type="button" onClick={() => switchView('magic-link')} className="text-[12px] text-gray-400 dark:text-gray-500 hover:text-gray-500 transition-colors block mx-auto">
              Sign in without password
            </button>
          </div>
        </div>
      )}

      {/* ── Sign-in: step 3 — OTP ───────────────────────────────────────── */}
      {view === 'sign-in' && signInStep === 'otp' && (
        <div className="animate-in fade-in slide-in-from-right-6 duration-300">
          <div className="mb-7 text-center">
            <div className="w-14 h-14 bg-blue-50 dark:bg-blue-900/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#0071e3]">
                <rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
              </svg>
            </div>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white tracking-tight">Check your email</h2>
            <p className="text-[13px] text-gray-500 dark:text-gray-400 mt-1.5 leading-relaxed">
              We sent a 6-digit code to <span className="font-medium text-gray-700 dark:text-gray-300">{email}</span>
            </p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-3">
            <input
              id="otp-code"
              type="text"
              inputMode="numeric"
              maxLength={6}
              required
              autoFocus
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
              className={`${iCls} text-center text-2xl font-bold tracking-[0.5em] py-4`}
              placeholder="······"
            />
            <ErrBanner />
            <PrimaryBtn label="Verify code" />
          </form>
          <div className="mt-5 flex flex-col items-center gap-2">
            <button
              type="button"
              onClick={handleResendOtp}
              disabled={resendCooldown > 0 || loading}
              className="text-[13px] text-[#0071e3] font-medium hover:underline disabled:text-gray-400 disabled:no-underline transition-colors"
            >
              {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend code'}
            </button>
            <button
              type="button"
              onClick={() => { setSignInStep('email'); setOtpCode(''); setError(null); setResendCooldown(0); }}
              className="text-[12px] text-gray-400 dark:text-gray-500 hover:text-gray-500 transition-colors inline-flex items-center gap-1"
            >
              <ArrowLeft size={12} /> Change email
            </button>
          </div>
        </div>
      )}

      {/* ── Sign-up: step 1 — email ─────────────────────────────────────── */}
      {view === 'sign-up' && signInStep === 'email' && (
        <div className="animate-in fade-in slide-in-from-right-6 duration-300">
          <div className="text-center mb-7">
            <h1 className="text-2xl font-semibold tracking-tight text-gray-900 dark:text-white">Create Account</h1>
            <p className="text-[13px] text-gray-500 dark:text-gray-400 mt-1">Join the beoneofus community</p>
          </div>

          {!registrationOpen && (
            <div className="mb-5 flex items-start gap-3 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/25 rounded-2xl p-4 animate-in fade-in duration-200">
              <span className="text-amber-500 mt-0.5 shrink-0">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
              </span>
              <div>
                <p className="text-[13px] font-semibold text-amber-700 dark:text-amber-400">Registration is currently closed</p>
                <p className="text-[12px] text-amber-600/80 dark:text-amber-500/70 mt-0.5">New accounts are not being accepted right now. Check back soon.</p>
              </div>
            </div>
          )}

          {registrationOpen && <OAuthBlock />}

          <form onSubmit={handleSubmit} className="space-y-3">
            <input
              id="auth-email"
              type="email"
              required
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={iCls}
              placeholder="Email"
              autoComplete="email"
              disabled={!registrationOpen}
            />
            <ErrBanner />
            <button
              type="submit"
              disabled={loading || !registrationOpen}
              className="w-full bg-[#0071e3] hover:bg-[#0077ed] text-white rounded-full py-3.5 text-[15px] font-medium transition-all duration-150 disabled:opacity-50 flex items-center justify-center gap-2 active:scale-[0.98] shadow-sm shadow-[#0071e3]/20"
            >
              {loading ? <><Loader2 size={16} className="animate-spin" /> Please wait…</> : 'Continue'}
            </button>
          </form>
          <div className="mt-6 text-center">
            <p className="text-[13px] text-gray-500 dark:text-gray-400">
              Already have an account?{' '}
              <button type="button" onClick={() => switchView('sign-in')} className="text-[#0071e3] font-medium hover:underline">
                Sign in
              </button>
            </p>
          </div>
        </div>
      )}

      {/* ── Sign-up: step 2 — details ───────────────────────────────────── */}
      {view === 'sign-up' && signInStep === 'details' && (
        <div className="animate-in fade-in slide-in-from-right-6 duration-300">
          <div className="text-center mb-7">
            <h1 className="text-2xl font-semibold tracking-tight text-gray-900 dark:text-white">Create Account</h1>
            <button
              type="button"
              onClick={() => { setSignInStep('email'); setPassword(''); setConfirmPassword(''); setUsername(''); setError(null); }}
              className="mt-1.5 inline-flex items-center gap-1.5 text-[13px] text-[#0071e3] hover:underline transition-colors"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
              {email}
            </button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-2.5">
            <div className="relative">
              <input
                id="auth-username"
                type="text"
                required
                autoFocus
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase())}
                maxLength={20}
                placeholder="Username"
                autoComplete="username"
                className={`${iCls} pr-10 ${
                  usernameStatus === 'taken' || usernameStatus === 'invalid'
                    ? 'ring-2 ring-red-400/40'
                    : usernameStatus === 'available'
                    ? 'ring-2 ring-emerald-400/40'
                    : ''
                }`}
              />
              <div className="absolute right-4 top-1/2 -translate-y-1/2">
                {usernameStatus === 'checking'  && <Loader2      size={14} className="animate-spin text-gray-400" />}
                {usernameStatus === 'available' && <CheckCircle2 size={14} className="text-emerald-500" />}
                {(usernameStatus === 'taken' || usernameStatus === 'invalid') && <XCircle size={14} className="text-red-500" />}
              </div>
            </div>
            {usernameStatus === 'invalid' && username && (
              <p className="text-xs text-red-500 px-1">3–20 chars: lowercase letters, numbers, _ or -</p>
            )}
            {usernameStatus === 'taken' && (
              <p className="text-xs text-red-500 px-1">Username already taken</p>
            )}
            <div>
              <PwField id="auth-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" />
              <PasswordStrength password={password} />
            </div>
            <PwField id="confirm-password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Confirm password" />
            <input
              id="referral-code"
              type="text"
              value={referralCode}
              onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
              maxLength={8}
              placeholder="Referral code (optional)"
              autoComplete="off"
              className={iCls}
            />
            <ErrBanner />
            <div className="pt-1"><PrimaryBtn label="Create Account" /></div>
          </form>
          <div className="mt-4 text-center">
            <p className="text-[11px] text-gray-400 dark:text-gray-500 leading-relaxed">
              By creating an account you agree to our{' '}
              <a href="/terms" className="underline hover:text-gray-600 dark:hover:text-gray-400">Terms</a>{' '}and{' '}
              <a href="/privacy" className="underline hover:text-gray-600 dark:hover:text-gray-400">Privacy Policy</a>.
            </p>
          </div>
        </div>
      )}

      {/* ── Forgot password ─────────────────────────────────────────────── */}
      {view === 'forgot-password' && (
        <div className="animate-in fade-in slide-in-from-right-6 duration-300">
          <div className="mb-7 text-center">
            <div className="w-14 h-14 bg-blue-50 dark:bg-blue-900/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#0071e3]">
                <rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
              </svg>
            </div>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white tracking-tight">Reset password</h2>
            <p className="text-[13px] text-gray-500 dark:text-gray-400 mt-1.5 max-w-[260px] mx-auto leading-relaxed">
              Enter your email and we'll send a secure reset link.
            </p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-3">
            <input
              id="auth-email"
              type="email"
              required
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={iCls}
              placeholder="Email"
              autoComplete="email"
            />
            <ErrBanner />
            <PrimaryBtn label="Send reset link" />
          </form>
          <div className="mt-4 text-center">
            <button type="button" onClick={() => switchView('sign-in')} className="text-[13px] text-[#0071e3] font-medium hover:underline inline-flex items-center gap-1">
              <ArrowLeft size={12} /> Back to sign in
            </button>
          </div>
        </div>
      )}

      {/* ── Magic link ──────────────────────────────────────────────────── */}
      {view === 'magic-link' && (
        <div className="animate-in fade-in slide-in-from-right-6 duration-300">
          <div className="mb-7 text-center">
            <div className="w-14 h-14 bg-violet-50 dark:bg-violet-900/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-violet-600 dark:text-violet-400">
                <path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/>
                <path d="M9 18h6"/><path d="M10 22h4"/>
              </svg>
            </div>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white tracking-tight">Magic link</h2>
            <p className="text-[13px] text-gray-500 dark:text-gray-400 mt-1.5 max-w-[260px] mx-auto leading-relaxed">
              Get a secure sign-in link in your inbox — no password needed.
            </p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-3">
            <input
              id="auth-email"
              type="email"
              required
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={iCls}
              placeholder="Email"
              autoComplete="email"
            />
            <ErrBanner />
            <PrimaryBtn label="Send magic link" />
          </form>
          <div className="mt-4 text-center">
            <button type="button" onClick={() => switchView('sign-in')} className="text-[13px] text-[#0071e3] font-medium hover:underline inline-flex items-center gap-1">
              <ArrowLeft size={12} /> Back to sign in
            </button>
          </div>
        </div>
      )}

      {/* ── Update password (post-recovery) ─────────────────────────────── */}
      {view === 'update-password' && (
        <div className="animate-in fade-in slide-in-from-right-6 duration-300">
          <div className="mb-7 text-center">
            <div className="w-14 h-14 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-600 dark:text-emerald-400">
                <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
            </div>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white tracking-tight">New password</h2>
            <p className="text-[13px] text-gray-500 dark:text-gray-400 mt-1.5 max-w-[260px] mx-auto leading-relaxed">
              Choose a strong password to secure your account.
            </p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <PwField id="auth-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="New password" autoFocus />
              <PasswordStrength password={password} />
            </div>
            <PwField id="confirm-password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Confirm new password" />
            <ErrBanner />
            <PrimaryBtn label="Update password" />
          </form>
        </div>
      )}

      <SecurityBadge />

    </div>
  );
}
