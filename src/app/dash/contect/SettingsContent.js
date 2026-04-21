"use client";

import { useTheme } from "next-themes";
import { Moon, Sun, Monitor, Palette, Check, AlertTriangle, Trash2, X, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "../../supabaseClient";

export default function SettingsContent() {
  const { theme, setTheme, systemTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [profile, setProfile] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteInput, setDeleteInput] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  // Prevent hydration mismatch by only rendering after mount
  useEffect(() => {
    setMounted(true);
    const fetchProfile = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data } = await supabase.from('profiles').select('username').eq('id', session.user.id).single();
        setProfile(data);
      }
    };
    fetchProfile();
  }, []);

  if (!mounted) return null;

  const themeOptions = [
    { id: 'light', label: 'Light', icon: Sun, desc: 'Clean and bright' },
    { id: 'dark', label: 'Dark', icon: Moon, desc: 'Easy on the eyes' },
    { id: 'system', label: 'System', icon: Monitor, desc: 'Matches device' }
  ];

  const handleDeleteAccount = async () => {
    if (deleteInput !== `delete ${profile?.username}`) return;
    setIsDeleting(true);
    setDeleteError("");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        // 1. Call the secure RPC function to delete the auth user
        const { error: rpcError } = await supabase.rpc('delete_user');
        
        if (rpcError) {
          // Fallback: Try to delete the profile if RPC isn't set up
          const { error: profileError } = await supabase.from('profiles').delete().eq('id', session.user.id);
          if (profileError) throw new Error("Could not delete account. Ensure you ran the SQL script to create the delete_user function.");
        }

        await supabase.auth.signOut();
        window.location.href = '/auth';
      }
    } catch (error) {
      console.error(error);
      setDeleteError(error.message);
      setIsDeleting(false);
    }
  };

  return (
    <div className="w-full flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-700 pb-10">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-gray-900 tracking-tighter">Settings</h1>
        <p className="text-gray-500 text-sm mt-1 font-medium">Manage your preferences and app appearance.</p>
      </div>

      <div className="space-y-8 max-w-3xl">
        {/* Appearance Section */}
        <div className="bg-white border border-gray-200 rounded-[2rem] p-6 sm:p-8 shadow-sm transition-colors duration-300">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
              <Palette size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Appearance</h2>
              <p className="text-xs text-gray-500 font-medium">Choose how the app looks to you.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {themeOptions.map((t) => {
              const Icon = t.icon;
              const isActive = theme === t.id;
              
              return (
                <button
                  key={t.id}
                  onClick={() => setTheme(t.id)}
                  className={`relative flex flex-col items-center p-6 rounded-2xl border transition-all duration-300 ${
                    isActive 
                      ? 'bg-blue-50 border-blue-500 shadow-sm' 
                      : 'bg-white border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {isActive && (
                    <div className="absolute top-3 right-3 text-blue-500">
                      <Check size={16} strokeWidth={3} />
                    </div>
                  )}
                  <Icon size={32} className={`mb-4 ${isActive ? 'text-blue-600' : 'text-gray-400'}`} />
                  <span className={`font-bold text-sm mb-1 ${isActive ? 'text-blue-600' : 'text-gray-900'}`}>
                    {t.label}
                  </span>
                  <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest text-center">
                    {t.desc}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Danger Zone */}
        <div className="bg-white border border-red-100 rounded-[2rem] p-6 sm:p-8 shadow-sm transition-colors duration-300">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-red-500/10 text-red-500 flex items-center justify-center shrink-0">
              <AlertTriangle size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Danger Zone</h2>
              <p className="text-xs text-gray-500 font-medium">Irreversible actions for your account.</p>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 bg-gray-50 border border-gray-200 rounded-2xl">
            <div>
              <h3 className="text-sm font-bold text-gray-900">Delete Account</h3>
              <p className="text-xs text-gray-500 mt-1">Permanently delete your account and all associated data.</p>
            </div>
            <button 
              onClick={() => setShowDeleteModal(true)}
              className="w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-all shadow-sm shrink-0"
            >
              Delete Account
            </button>
          </div>
        </div>
      </div>

      {/* Delete Account Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-gray-900/50 backdrop-blur-sm" onClick={() => { setShowDeleteModal(false); setDeleteInput(""); }} />
          <div className="relative w-full max-w-md bg-white border border-gray-200 rounded-3xl shadow-xl p-6 text-center animate-in fade-in zoom-in duration-200">
            <button 
              onClick={() => { setShowDeleteModal(false); setDeleteInput(""); }} 
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-900 transition-colors"
            >
              <X size={20} />
            </button>
            
            <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash2 size={32} />
            </div>
            
            <h3 className="text-xl font-bold text-gray-900 mb-2">Delete Account?</h3>
            <p className="text-gray-600 text-sm mb-6 leading-relaxed">
              This action cannot be undone. All your posts, messages, and connections will be permanently removed.
              <br /><br />
              Please type <span className="font-bold text-red-600 select-all">delete {profile?.username}</span> to confirm.
            </p>
            
            <div className="space-y-4">
              <input 
                type="text" 
                value={deleteInput}
                onChange={(e) => setDeleteInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && deleteInput === `delete ${profile?.username}`) handleDeleteAccount(); }}
                placeholder={`delete ${profile?.username}`}
                className="w-full bg-white border border-gray-300 rounded-xl py-3 px-4 text-gray-900 focus:outline-none focus:border-red-500/50 transition-all text-center"
              />
              
              {deleteError && (
                <div className="bg-red-50 border border-red-200 text-red-600 text-xs p-3 rounded-xl text-left">
                  <span className="font-bold">Error:</span> {deleteError}
                </div>
              )}

              <button 
                onClick={handleDeleteAccount}
                disabled={deleteInput !== `delete ${profile?.username}` || isDeleting}
                className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-xl transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
              >
                {isDeleting ? <Loader2 size={18} className="animate-spin" /> : 'Permanently Delete Account'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}