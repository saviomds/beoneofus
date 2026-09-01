"use client";

import React from 'react';
import { useLanguage } from './index';

export default function ProfileContent({ user }) {
  const { t } = useLanguage();

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header Section: Banner & Avatar */}
      <div className="relative mb-20">
        <div className="h-48 md:h-64 bg-gradient-to-r from-indigo-600 to-violet-700 rounded-2xl overflow-hidden shadow-lg border border-white/10">
          {/* Decorative Pattern */}
          <div className="w-full h-full opacity-20 bg-[url('https://www.transparenttextures.com/patterns/circuit-board.png')]" />
        </div>
        
        {/* Avatar & Basic Info */}
        <div className="absolute -bottom-16 left-4 md:left-8 flex flex-col md:flex-row md:items-end gap-4 md:gap-6">
          <div className="w-28 h-28 md:w-40 md:h-40 rounded-3xl border-4 border-white dark:border-gray-950 bg-gray-100 dark:bg-gray-800 shadow-2xl overflow-hidden">
             <div className="w-full h-full bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 text-4xl font-bold">
               {user?.name?.[0] || 'U'}
             </div>
          </div>
          
          <div className="mb-2">
            <h1 className="text-2xl md:text-4xl font-black text-gray-900 dark:text-white tracking-tight">
              {user?.name || t('profile.full_name')}
            </h1>
            <p className="text-gray-500 dark:text-gray-400 font-medium">@{user?.username || t('profile.username')}</p>
          </div>
        </div>

        {/* Action Buttons (Desktop) */}
        <div className="absolute -bottom-12 right-4 md:right-8 hidden sm:flex gap-3">
          <button className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold shadow-md transition-all active:scale-95">
            {t('profile.connect')}
          </button>
          <button className="px-5 py-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-200 rounded-xl font-semibold transition-all">
            {t('profile.message')}
          </button>
        </div>
      </div>

      {/* Responsive Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-28 lg:mt-12">
        
        {/* Left Column: Sidebar (Stats, Location, Socials) */}
        <div className="lg:col-span-4 space-y-6">
          {/* Stats Card */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-800">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-xl font-bold text-gray-900 dark:text-white">1.4k</p>
                <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">{t('profile.followers')}</p>
              </div>
              <div className="border-x border-gray-100 dark:border-gray-800">
                <p className="text-xl font-bold text-gray-900 dark:text-white">582</p>
                <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">{t('profile.connections')}</p>
              </div>
              <div>
                <p className="text-xl font-bold text-gray-900 dark:text-white">12</p>
                <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">{t('profile.certificates')}</p>
              </div>
            </div>
          </div>

          {/* Bio/Info Card */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-800 space-y-4">
            <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
              <div className="w-8 h-8 rounded-lg bg-gray-50 dark:bg-gray-800 flex items-center justify-center">📍</div>
              <span>San Francisco, CA</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
              <div className="w-8 h-8 rounded-lg bg-gray-50 dark:bg-gray-800 flex items-center justify-center">🌐</div>
              <a href="#" className="hover:text-indigo-500 transition-colors">beoneofus.com</a>
            </div>
            <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400 font-semibold text-green-500">
              <div className="w-8 h-8 rounded-lg bg-green-50 dark:bg-green-900/20 flex items-center justify-center">💼</div>
              <span>Open to Work</span>
            </div>
          </div>

          {/* Social Links Grid */}
          <div className="grid grid-cols-2 gap-3">
             <button className="flex items-center justify-center gap-2 py-3 bg-gray-900 text-white rounded-xl font-medium hover:bg-black transition-colors">
               <span>Github</span>
             </button>
             <button className="flex items-center justify-center gap-2 py-3 bg-blue-500 text-white rounded-xl font-medium hover:bg-blue-600 transition-colors">
               <span>LinkedIn</span>
             </button>
          </div>
        </div>

        {/* Right Column: Main Content (About, Experience, Skills) */}
        <div className="lg:col-span-8 space-y-6">
          {/* About Section */}
          <section className="bg-white dark:bg-gray-900 rounded-2xl p-8 shadow-sm border border-gray-100 dark:border-gray-800">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <span className="w-1.5 h-6 bg-indigo-500 rounded-full" />
              {t('profile.about')}
            </h2>
            <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
              {user?.bio || "I am a passionate software engineer dedicated to building clean, efficient, and user-centric applications. With over 5 years of experience in full-stack development, I specialize in modern JavaScript frameworks and cloud architecture."}
            </p>
          </section>

          {/* Skills Section */}
          <section className="bg-white dark:bg-gray-900 rounded-2xl p-8 shadow-sm border border-gray-100 dark:border-gray-800">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
              <span className="w-1.5 h-6 bg-indigo-500 rounded-full" />
              {t('profile.skills')}
            </h2>
            <div className="flex flex-wrap gap-2">
              {['React', 'Next.js', 'TypeScript', 'Node.js', 'GraphQL', 'Tailwind', 'AWS', 'Docker'].map(skill => (
                <span key={skill} className="px-4 py-2 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 rounded-xl text-sm font-semibold">
                  {skill}
                </span>
              ))}
            </div>
          </section>

          {/* Posts Feed Preview */}
          <section className="bg-white dark:bg-gray-900 rounded-2xl p-8 shadow-sm border border-gray-100 dark:border-gray-800">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
              <span className="w-1.5 h-6 bg-indigo-500 rounded-full" />
              {t('profile.activity')}
            </h2>
            <div className="flex flex-col items-center justify-center py-12 text-gray-400">
               <p>{t('profile.no_posts')}</p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}