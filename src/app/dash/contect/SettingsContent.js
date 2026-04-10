"use client";

import { useState } from "react";
import { 
  User, Bell, Lock, ShieldCheck, CreditCard, 
  Monitor, ChevronRight, Globe, X 
} from "lucide-react";

const SETTINGS_GROUPS = [
  {
    title: "Account",
    items: [
      { id: "profile", label: "Profile Information", icon: <User size={18} />, desc: "Update your name, bio, and avatar", details: "Manage how your identity appears across the platform." },
      { id: "email", label: "Email & Password", icon: <Lock size={18} />, desc: "Manage your login credentials", details: "Ensure your account stays secure with a strong password." },
    ]
  },
  {
    title: "Preferences",
    items: [
      { id: "notifs", label: "Notifications", icon: <Bell size={18} />, desc: "Configure how you receive alerts", details: "Toggle push, email, and in-app notifications." },
      { id: "appearance", label: "Appearance", icon: <Monitor size={18} />, desc: "Switch between dark and light modes", details: "Customize the theme and layout density." },
    ]
  }
];

export default function SettingsContent() {
  const [selectedItem, setSelectedItem] = useState(null);

  return (
    <div className="w-full flex flex-col bg-transparent animate-in fade-in slide-in-from-bottom-4 duration-700 pb-10 no-scrollbar relative">
      
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-black text-white tracking-tighter">Settings</h1>
        <p className="text-gray-500 text-sm mt-1 font-medium">Control your experience and security.</p>
      </div>

      {/* Settings List */}
      <div className="space-y-8">
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

      {/* --- TOGGLE INFO CARD (MODAL) --- */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
          {/* Backdrop Blur */}
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setSelectedItem(null)}
          />
          
          {/* Pop-up Card */}
          <div className="relative w-full max-w-md bg-[#111] border border-white/10 rounded-[2.5rem] p-8 shadow-2xl animate-in zoom-in-95 duration-200">
            <button 
              onClick={() => setSelectedItem(null)}
              className="absolute top-6 right-6 p-2 text-gray-500 hover:text-white hover:bg-white/5 rounded-full transition-all"
            >
              <X size={20} />
            </button>

            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-2xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-500 mb-6">
                {selectedItem.icon}
              </div>
              <h3 className="text-xl font-black text-white tracking-tight mb-2">
                {selectedItem.label}
              </h3>
              <p className="text-sm text-gray-400 leading-relaxed mb-8">
                {selectedItem.details}
              </p>

              <div className="w-full space-y-3">
                <button className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-bold transition-all active:scale-95 shadow-lg shadow-blue-600/10">
                  Save Changes
                </button>
                <button 
                  onClick={() => setSelectedItem(null)}
                  className="w-full py-4 bg-white/5 hover:bg-white/10 text-gray-300 rounded-2xl font-bold transition-all"
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