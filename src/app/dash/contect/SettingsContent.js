"use client";

import { useTheme } from "next-themes";
import { Moon, Sun, Monitor, Palette, Check } from "lucide-react";
import { useState, useEffect } from "react";

export default function SettingsContent() {
  const { theme, setTheme, systemTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Prevent hydration mismatch by only rendering after mount
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const themeOptions = [
    { id: 'light', label: 'Light', icon: Sun, desc: 'Clean and bright' },
    { id: 'dark', label: 'Dark', icon: Moon, desc: 'Easy on the eyes' },
    { id: 'system', label: 'System', icon: Monitor, desc: 'Matches device' }
  ];

  return (
    <div className="w-full flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-700 pb-10">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tighter">Settings</h1>
        <p className="text-gray-500 text-sm mt-1 font-medium">Manage your preferences and app appearance.</p>
      </div>

      <div className="space-y-8 max-w-3xl">
        {/* Appearance Section */}
        <div className="bg-gray-50 dark:bg-[#0F0F0F] border border-gray-200 dark:border-white/5 rounded-[2rem] p-6 sm:p-8 transition-colors duration-300">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
              <Palette size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Appearance</h2>
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
                      ? 'bg-blue-50 dark:bg-blue-500/5 border-blue-500 shadow-lg shadow-blue-500/10' 
                      : 'bg-white dark:bg-[#1A1A1A] border-gray-200 dark:border-white/10 hover:border-gray-300 dark:hover:border-white/20'
                  }`}
                >
                  {isActive && (
                    <div className="absolute top-3 right-3 text-blue-500">
                      <Check size={16} strokeWidth={3} />
                    </div>
                  )}
                  <Icon size={32} className={`mb-4 ${isActive ? 'text-blue-500' : 'text-gray-400 dark:text-gray-500'}`} />
                  <span className={`font-bold text-sm mb-1 ${isActive ? 'text-blue-600 dark:text-blue-400' : 'text-gray-900 dark:text-white'}`}>
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
      </div>
    </div>
  );
}