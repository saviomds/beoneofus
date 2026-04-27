"use client";

import { useTheme } from "next-themes";
import { Moon, Sun, Monitor, Palette, Check, AlertTriangle, Trash2, X, Loader2, BadgeCheck, Shield, Volume2, VolumeX } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "../../supabaseClient";

export default function SettingsContent() {
  // Theme state from next-themes
  const { theme, setTheme, systemTheme } = useTheme();
  // State to ensure component is mounted on the client before rendering theme UI
  const [mounted, setMounted] = useState(false);
  // State for user profile data (used for delete confirmation)
  const [profile, setProfile] = useState(null);
  // UI state for delete account confirmation modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  // Controlled input for delete confirmation
  const [deleteInput, setDeleteInput] = useState("");
  // Loading state for the delete operation
  const [isDeleting, setIsDeleting] = useState(false);
  // Error message state for the delete operation
  const [deleteError, setDeleteError] = useState("");
  const [requestingVerification, setRequestingVerification] = useState(false);
  // Toast state
  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState("success");
  // Local preferences state
  const [isMuted, setIsMuted] = useState(false);

  const showToast = (msg, type = "success") => {
    setToastMessage(msg);
    setToastType(type);
    setTimeout(() => setToastMessage(""), 3000);
  };

  // Effect to handle client-side-only logic
  useEffect(() => {
    // Set mounted to true to avoid hydration mismatch with theme logic
    setMounted(true);
    // Load local preferences
    setIsMuted(localStorage.getItem('beoneofus_muted') === 'true');
    // Fetch user profile to get username for delete confirmation
    const fetchProfile = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data } = await supabase.from('profiles').select('username, is_verified, verification_status').eq('id', session.user.id).single();
        setProfile(data);
      }
    };
    fetchProfile();
  }, []);

  // Prevent rendering theme-dependent UI on the server
  if (!mounted) return null;

  // Configuration for the theme selection UI
  const themeOptions = [
    { id: 'light', label: 'Light', icon: Sun, desc: 'Clean and bright' },
    { id: 'dark', label: 'Dark', icon: Moon, desc: 'Easy on the eyes' },
    { id: 'system', label: 'System', icon: Monitor, desc: 'Matches device' }
  ];

  /**
   * Handles the account deletion process.
   * It verifies the user's input against their username before proceeding.
   * It calls a Supabase RPC function 'delete_user' to securely delete the user's auth entry.
   * After successful deletion, it signs the user out and redirects them.
   */
  const handleDeleteAccount = async () => {
    // Double-check confirmation input
    if (deleteInput !== `delete ${profile?.username}`) return;
    
    setIsDeleting(true);
    setDeleteError("");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        // 1. Call the secure RPC function to delete the auth user.
        // This is the preferred, secure way to handle user deletion.
        const { error: rpcError } = await supabase.rpc('delete_user');
        
        if (rpcError) {
          // Fallback for if the RPC function isn't set up.
          // This is less secure as it relies on RLS policies alone.
          const { error: profileError } = await supabase.from('profiles').delete().eq('id', session.user.id);
          if (profileError) throw new Error("Could not delete account. Ensure you ran the SQL script to create the delete_user function.");
        }

        // 2. Sign out the user from the client and redirect
        await supabase.auth.signOut();
        window.location.href = '/auth';
      }
    } catch (error) {
      console.error(error);
      setDeleteError(error.message);
      setIsDeleting(false);
    }
  };

  const handleRequestVerification = async () => {
    setRequestingVerification(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { error } = await supabase.from('profiles').update({ verification_status: 'pending' }).eq('id', session.user.id);
      if (error) throw error;
      
      setProfile(prev => ({ ...prev, verification_status: 'pending' }));
      showToast("Verification request sent to beoneofus!", "success");
    } catch (error) {
      console.error(error);
      showToast(error.message, "error");
    } finally {
      setRequestingVerification(false);
    }
  };

  const toggleMute = () => {
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    localStorage.setItem('beoneofus_muted', newMuted.toString());
    showToast(newMuted ? "Notification sounds muted" : "Notification sounds enabled", "success");
  };

  return (
    <div className="w-full flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-700 pb-10">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-black text-gray-900 dark:text-gray-100 tracking-tighter">Settings</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1 font-medium">Manage your preferences and app appearance.</p>
      </div>

      <div className="space-y-8 max-w-3xl">
        {/* Appearance Section */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-[2rem] p-6 sm:p-8 shadow-sm transition-colors duration-300">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-500 dark:text-blue-400 flex items-center justify-center">
              <Palette size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Appearance</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Choose how the app looks to you.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {themeOptions.map((t) => {
              const Icon = t.icon;
              const isActive = theme === t.id;
              
              return (
                <button
                  key={t.id}
                  onClick={() => {
                    setTheme(t.id);
                    showToast(`Appearance set to ${t.label}`, "success");
                  }}
                  className={`relative flex flex-col items-center p-6 rounded-2xl border transition-all duration-300 ${
                    isActive 
                      ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-500 shadow-sm' 
                      : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                  }`}
                >
                  {isActive && (
                    <div className="absolute top-3 right-3 text-blue-500">
                      <Check size={16} strokeWidth={3} />
                    </div>
                  )}
                  <Icon size={32} className={`mb-4 ${isActive ? 'text-blue-600' : 'text-gray-400'}`} />
                  <span className={`font-bold text-sm mb-1 ${isActive ? 'text-blue-600' : 'text-gray-900 dark:text-gray-100'}`}>
                    {t.label}
                  </span>
                  <span className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-widest text-center">
                    {t.desc}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* App Preferences Section */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-[2rem] p-6 sm:p-8 shadow-sm transition-colors duration-300">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-500 dark:text-purple-400 flex items-center justify-center shrink-0">
              <Volume2 size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">App Preferences</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Customize your local client experience.</p>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-2xl">
            <div>
              <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">Notification Sounds</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Play audio alerts for incoming messages and calls.</p>
            </div>
            <button 
              onClick={toggleMute}
              className={`w-full sm:w-auto px-5 py-2.5 rounded-xl text-sm font-bold transition-all shadow-sm shrink-0 flex items-center justify-center gap-2 border ${isMuted ? 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-700' : 'bg-blue-600 hover:bg-blue-700 text-white border-blue-600'}`}
            >
              {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
              {isMuted ? 'Sounds Muted' : 'Sounds Enabled'}
            </button>
          </div>
        </div>

        {/* Verification Section */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-[2rem] p-6 sm:p-8 shadow-sm transition-colors duration-300">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-500 dark:text-blue-400 flex items-center justify-center shrink-0">
              <BadgeCheck size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Account Verification</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Get the blue verified badge on your profile.</p>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-2xl">
            <div>
              <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">Verified Node Status</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Official verification by the beoneofus company.</p>
            </div>
            {profile?.is_verified ? (
              <div className="flex items-center justify-center gap-2 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-5 py-2.5 rounded-xl font-bold text-sm border border-blue-200 dark:border-blue-800/50 shrink-0 w-full sm:w-auto">
                <BadgeCheck size={18} className="text-blue-600" fill="currentColor" stroke="white" /> Verified
              </div>
            ) : profile?.verification_status === 'pending' ? (
              <div className="flex items-center justify-center gap-2 text-amber-600 dark:text-amber-500 bg-amber-50 dark:bg-amber-900/20 px-5 py-2.5 rounded-xl font-bold text-sm border border-amber-200 dark:border-amber-800/50 shrink-0 w-full sm:w-auto">
                <Loader2 size={18} className="animate-spin" /> Pending Review
              </div>
            ) : (
              <button 
                onClick={handleRequestVerification}
                disabled={requestingVerification}
                className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-all shadow-sm shrink-0 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {requestingVerification ? <Loader2 size={16} className="animate-spin"/> : <Shield size={16} />}
                Request Verification
              </button>
            )}
          </div>
        </div>

        {/* Danger Zone Section for account deletion */}
        <div className="bg-white dark:bg-gray-900 border border-red-100 dark:border-red-900/50 rounded-[2rem] p-6 sm:p-8 shadow-sm transition-colors duration-300">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-red-500/10 text-red-500 dark:text-red-400 flex items-center justify-center shrink-0">
              <AlertTriangle size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Danger Zone</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Irreversible actions for your account.</p>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-2xl">
            <div>
              <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">Delete Account</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Permanently delete your account and all associated data.</p>
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

      {/* Delete Account Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          {/* Modal backdrop */}
          <div className="absolute inset-0 bg-gray-900/50 dark:bg-black/60 backdrop-blur-sm" onClick={() => { setShowDeleteModal(false); setDeleteInput(""); }} />
          {/* Modal content */}
          <div className="relative w-full max-w-md bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl shadow-xl p-6 text-center animate-in fade-in zoom-in duration-200">
            <button 
              onClick={() => { setShowDeleteModal(false); setDeleteInput(""); }} 
              className="absolute top-4 right-4 text-gray-400 dark:text-gray-500 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
            >
              <X size={20} />
            </button>
            
            <div className="w-16 h-16 bg-red-500/10 text-red-500 dark:text-red-400 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash2 size={32} />
            </div>
            
            <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">Delete Account?</h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm mb-6 leading-relaxed">
              This action cannot be undone. All your posts, messages, and connections will be permanently removed.
              <br /><br />
              Please type <span className="font-bold text-red-600 dark:text-red-400 select-all">delete {profile?.username}</span> to confirm.
            </p>
            
            <div className="space-y-4">
              {/* Confirmation Input */}
              <input 
                type="text" 
                value={deleteInput}
                onChange={(e) => setDeleteInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && deleteInput === `delete ${profile?.username}`) handleDeleteAccount(); }}
                placeholder={`delete ${profile?.username}`}
                className="w-full bg-white dark:bg-gray-950 border border-gray-300 dark:border-gray-700 rounded-xl py-3 px-4 text-gray-900 dark:text-gray-100 focus:outline-none focus:border-red-500/50 transition-all text-center"
              />
              
              {/* Error message display */}
              {deleteError && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 text-red-600 dark:text-red-400 text-xs p-3 rounded-xl text-left">
                  <span className="font-bold">Error:</span> {deleteError}
                </div>
              )}

              {/* Final Delete Button */}
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

      {/* Custom Toast Popup */}
      {toastMessage && (
        <div className={`fixed bottom-10 right-10 z-[300] flex items-center gap-3 bg-white dark:bg-gray-900 border px-5 py-3 rounded-2xl shadow-xl animate-in fade-in slide-in-from-bottom-8 duration-300 max-w-md ${toastType === 'error' ? 'border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-500' : 'border-green-200 dark:border-green-900/50 text-green-600 dark:text-green-500'}`}>
          {toastType === 'error' ? <AlertTriangle size={18} className="text-red-500 dark:text-red-400 shrink-0" /> : <Check size={18} className="text-green-500 dark:text-green-400 shrink-0" />}
          <span className="text-sm font-bold tracking-tight">{toastMessage}</span>
        </div>
      )}
    </div>
  );
}