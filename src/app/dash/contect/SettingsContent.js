"use client";

import { useState, useEffect } from "react";
import { 
  User, Bell, Lock, ShieldCheck, CreditCard, 
  Monitor, ChevronRight, Globe, X, Loader2, CheckCircle2, 
  Sun, Moon, Volume2, VolumeX
} from "lucide-react";
import { supabase } from "../../supabaseClient";

const SETTINGS_GROUPS = [
  {
    title: "Account",
    items: [
      { id: "profile", label: "Profile Information", icon: <User size={18} />, desc: "Update your name, bio, and avatar", details: "Manage how your identity appears across the platform." },
      { id: "email", label: "Email & Password", icon: <Lock size={18} />, desc: "Manage your login credentials", details: "Ensure your account stays secure." },
    ]
  },
  {
    title: "Preferences",
    items: [
      { id: "notifs", label: "Notifications", icon: <Bell size={18} />, desc: "Configure alerts", details: "Toggle push and system handshake notifications." },
      { id: "appearance", label: "Appearance", icon: <Monitor size={18} />, desc: "Dark and light modes", details: "Customize the terminal visual interface." },
    ]
  }
];

export default function SettingsContent() {
  const [selectedItem, setSelectedItem] = useState(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  
  // States for Settings Data
  const [profile, setProfile] = useState({ username: "", status: "", bio: "" });
  const [notifsEnabled, setNotifsEnabled] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(true);

  // 1. Initial Data Fetch
  useEffect(() => {
    const fetchData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data } = await supabase
          .from('profiles')
          .select('username, status, bio, preferences')
          .eq('id', session.user.id)
          .single();
        
        if (data) {
          setProfile({
            username: data.username || "",
            status: data.status || "",
            bio: data.bio || ""
          });
          // Check if preferences column exists and has data
          if (data.preferences) {
            setNotifsEnabled(data.preferences.notifications ?? true);
            setIsDarkMode(data.preferences.dark_mode ?? true);
          }
        }
      }
    };
    fetchData();
  }, []);

  // 2. Handle Profile & Preference Updates
  const handleSaveChanges = async () => {
    setLoading(true);
    setSuccess(false);
    
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    
    const { error } = await supabase
      .from('profiles')
      .update({
        username: profile.username,
        status: profile.status,
        bio: profile.bio,
        preferences: {
          notifications: notifsEnabled,
          dark_mode: isDarkMode
        }
      })
      .eq('id', session.user.id);

    if (error) {
      alert("System Error: " + error.message);
    } else {
      setSuccess(true);
      setTimeout(() => {
        setSelectedItem(null);
        setSuccess(false);
      }, 1200);
    }
    setLoading(false);
  };

  return (
    <div className="w-full flex flex-col bg-transparent animate-in fade-in slide-in-from-bottom-4 duration-700 pb-10 no-scrollbar relative">
      
      {/* Header */}
      <div className="mb-8 px-2">
        <h1 className="text-3xl font-black text-white tracking-tighter uppercase italic">Control_Panel</h1>
        <p className="text-gray-500 text-sm mt-1 font-medium font-mono uppercase tracking-tighter">Node_Configuration // Authorized_Only</p>
      </div>

      {/* Settings List */}
      <div className="space-y-8 px-2">
        {SETTINGS_GROUPS.map((group, idx) => (
          <div key={idx} className="space-y-3">
            <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-600 pl-1">
              {group.title}
            </h2>
            <div className="grid grid-cols-1 gap-2">
              {group.items.map((item) => (
                <div 
                  key={item.id}
                  onClick={() => setSelectedItem(item)}
                  className="group flex items-center justify-between p-4 bg-[#0F0F0F] border border-white/5 rounded-2xl hover:border-blue-500/30 transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 group-hover:text-blue-400">
                      {item.icon}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-white group-hover:text-blue-400">{item.label}</span>
                      <span className="text-xs text-gray-600">{item.desc}</span>
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-gray-700 group-hover:text-white group-hover:translate-x-1 transition-all" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* --- SETTINGS MODAL --- */}
      {selectedItem && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setSelectedItem(null)} />
          
          <div className="relative w-full max-w-md bg-[#0D0D0D] border border-white/10 rounded-[2.5rem] p-8 shadow-2xl animate-in zoom-in-95 duration-200">
            <button onClick={() => setSelectedItem(null)} className="absolute top-6 right-6 p-2 text-gray-500 hover:text-white rounded-full transition-colors">
              <X size={20} />
            </button>

            <div className="flex flex-col items-center">
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-6 transition-all duration-500 ${success ? 'bg-green-500/20 text-green-500 border-green-500/30' : 'bg-blue-600/10 border-blue-500/20 text-blue-500'} border`}>
                {success ? <CheckCircle2 size={32} /> : selectedItem.icon}
              </div>
              <h3 className="text-xl font-black text-white tracking-tight mb-2 uppercase italic">
                {success ? "Uplink Success" : selectedItem.label}
              </h3>
              <p className="text-xs text-gray-500 mb-8 font-mono text-center leading-relaxed">
                {success ? "Local changes merged with master branch." : selectedItem.details}
              </p>

              {/* DYNAMIC CONTENT */}
              <div className="w-full space-y-4 mb-8">
                {selectedItem.id === "profile" && (
                  <>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-gray-500 uppercase px-1 tracking-widest">Display Name</label>
                      <input 
                        type="text" 
                        value={profile.username}
                        onChange={(e) => setProfile({...profile, username: e.target.value})}
                        className="w-full bg-black border border-white/5 rounded-xl py-3 px-4 text-sm text-white focus:border-blue-500 outline-none transition-all font-bold"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-gray-500 uppercase px-1 tracking-widest">Status Protocol</label>
                      <input 
                        type="text" 
                        value={profile.status}
                        onChange={(e) => setProfile({...profile, status: e.target.value})}
                        className="w-full bg-black border border-white/5 rounded-xl py-3 px-4 text-sm text-white focus:border-blue-500 outline-none transition-all font-mono"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-gray-500 uppercase px-1 tracking-widest">Bio-Data</label>
                      <textarea 
                        value={profile.bio}
                        onChange={(e) => setProfile({...profile, bio: e.target.value})}
                        className="w-full bg-black border border-white/5 rounded-xl py-3 px-4 text-sm text-white focus:border-blue-500 outline-none transition-all h-24 resize-none"
                      />
                    </div>
                  </>
                )}

                {selectedItem.id === "notifs" && (
                   <div className="space-y-3">
                      <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
                        <div className="flex items-center gap-3">
                           {notifsEnabled ? <Volume2 size={16} className="text-blue-500" /> : <VolumeX size={16} className="text-gray-600" />}
                           <span className="text-xs font-bold text-white uppercase tracking-tighter">System Handshakes</span>
                        </div>
                        <button 
                          onClick={() => setNotifsEnabled(!notifsEnabled)}
                          className={`w-10 h-5 rounded-full transition-all flex items-center px-1 ${notifsEnabled ? 'bg-blue-600' : 'bg-gray-800'}`}
                        >
                           <div className={`w-3 h-3 bg-white rounded-full transition-all ${notifsEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
                        </button>
                      </div>
                      <p className="text-[9px] text-gray-600 px-2 uppercase font-bold tracking-widest">Alerts user of incoming handshake pulses.</p>
                   </div>
                )}

                {selectedItem.id === "appearance" && (
                   <div className="grid grid-cols-2 gap-3">
                      <button 
                        onClick={() => setIsDarkMode(true)}
                        className={`flex flex-col items-center gap-3 p-6 rounded-3xl border transition-all ${isDarkMode ? 'bg-blue-600/10 border-blue-500/50' : 'bg-white/5 border-white/5 hover:border-white/10'}`}
                      >
                         <Moon className={isDarkMode ? 'text-blue-500' : 'text-gray-500'} />
                         <span className="text-[10px] font-black uppercase text-white">Dark Node</span>
                      </button>
                      <button 
                        onClick={() => setIsDarkMode(false)}
                        className={`flex flex-col items-center gap-3 p-6 rounded-3xl border transition-all ${!isDarkMode ? 'bg-blue-600/10 border-blue-500/50' : 'bg-white/5 border-white/5 hover:border-white/10'}`}
                      >
                         <Sun className={!isDarkMode ? 'text-blue-500' : 'text-gray-500'} />
                         <span className="text-[10px] font-black uppercase text-white">Light Node</span>
                      </button>
                   </div>
                )}

                {selectedItem.id === "email" && (
                   <div className="py-10 text-center border border-dashed border-white/5 rounded-2xl bg-white/[0.02]">
                      <Lock size={24} className="mx-auto mb-3 text-gray-600" />
                      <p className="text-gray-500 text-xs italic px-6 font-mono uppercase tracking-tighter">Auth credentials restricted to root directory.</p>
                   </div>
                )}
              </div>

              <div className="w-full space-y-3">
                <button 
                  onClick={handleSaveChanges}
                  disabled={loading || success}
                  className={`w-full py-4 rounded-2xl font-black uppercase tracking-widest text-xs transition-all active:scale-95 shadow-lg flex items-center justify-center gap-2 ${success ? 'bg-green-600 text-white shadow-green-500/20' : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/20'}`}
                >
                  {loading ? <Loader2 className="animate-spin" size={16} /> : success ? "Changes Saved" : "Save Changes"}
                </button>
                <button 
                  onClick={() => setSelectedItem(null)}
                  className="w-full py-4 bg-white/5 hover:bg-white/10 text-gray-300 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all border border-white/5"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}