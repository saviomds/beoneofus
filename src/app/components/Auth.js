"use client";
import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { LogIn, UserPlus, Mail, Lock, AlertCircle } from 'lucide-react';

export default function AuthForm() {
  const [isRegistering, setIsRegistering] = useState(false);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isRegistering) {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        alert('Check your email for the confirmation link!');
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full bg-[#0D0D0D] rounded-2xl p-8 shadow-2xl">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">
          {isRegistering ? 'Create Account' : 'Welcome Back'}
        </h1>
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
            <><UserPlus size={18} /> Sign Up</>
          ) : (
            <><LogIn size={18} /> Login</>
          )}
        </button>
      </form>

      <div className="mt-6 text-center">
        <button
          onClick={() => setIsRegistering(!isRegistering)}
          className="text-gray-500 hover:text-blue-400 text-sm transition-colors"
        >
          {isRegistering ? 'Already have an account? Log in' : "Don't have an account? Sign up"}
        </button>
      </div>
    </div>
  );
}