'use client';

import { useEffect, Suspense, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { supabase } from '../supabaseClient';
import NewPost from '../components/NewPost';
import { useDashboard } from './contect/DashboardContext';
import FeedContent from './contect/FeedContent';
import GroupsContent from './contect/GroupsContent';
import MessagesContent from './contect/MessagesContent';
import BookmarksContent from './contect/BookmarksContent';
import MoreContent from './contect/MoreContent';
import NotificationsContent from './contect/NotificationsContent';
import SettingsContent from './contect/SettingsContent';
import ProfileContent from './contect/ProfileContent';
import DocsContent from './contect/DocsContent';

function DashboardTabHandler() {
  const { setActiveSection } = useDashboard();
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab && setActiveSection) {
      setActiveSection(tab);
      // Clear the tab from URL so we aren't trapped when clicking other sidebar links
      router.replace('/dash', { scroll: false });
    }
  }, [searchParams, setActiveSection, router]);

  return null;
}

export default function Dashboard() {
  const { activeSection } = useDashboard();
  const [session, setSession] = useState(null);
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => authListener.subscription?.unsubscribe();
  }, []);

  const renderContent = () => {
    switch (activeSection) {
      case 'feed':
        return <FeedContent />;
      case 'groups':
        return <GroupsContent />;
      case 'messages':
        return <MessagesContent />;
      case 'bookmarks':
        return <BookmarksContent />;
      case 'more':
        return <MoreContent />;
      case 'notifications':
        return <NotificationsContent />;
      case 'settings':
        return <SettingsContent />;
      case 'profile':
        return <ProfileContent />;
      case 'docs':
        return <DocsContent />;
      default:
        return <FeedContent />;
    }
  };

  return (
    <div className={`w-full h-full overflow-x-hidden transition-all ${activeSection === 'docs' ? 'p-2 md:p-4 lg:p-6' : 'p-4 md:p-6 lg:p-8'}`}>
      {/* Suspense boundary fixes Next.js useSearchParams de-opt warning */}
      <Suspense fallback={null}>
        <DashboardTabHandler />
      </Suspense>

      {/* Only show NewPost for feed section */}
      {activeSection === 'feed' && (
        <div className="w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
          {/* Header */}
          <div className="mb-6 md:mb-8">
            <h1 className="text-3xl font-black text-gray-900 tracking-tighter">Network Feed</h1>
            <p className="text-gray-600 text-sm mt-1 font-medium">Broadcast your updates to the ecosystem.</p>
          </div>

          {/* 1. New Post Area or Login Prompt */}
          {session ? (
            <NewPost />
          ) : (
            <div className="bg-white border border-gray-200 rounded-2xl p-6 text-center shadow-sm mt-4 mb-6">
              <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Join the conversation</h3>
              <p className="text-gray-600 mb-4 text-sm font-medium">Sign in to share your code, broadcast updates, and connect with the community.</p>
              <button onClick={() => router.push('/auth')} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-6 rounded-xl transition shadow-sm">
                Sign In to Post
              </button>
            </div>
          )}
          
          {/* 2. Tabs Navigation */}
          <div className="flex gap-6 border-b border-gray-200 mt-8 mb-6">
            <button className="text-blue-600 border-b-2 border-blue-600 pb-3 text-sm font-bold flex items-center gap-2 transition-all">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse"></span>
              Following
            </button>
            <button className="text-gray-500 pb-3 text-sm font-bold hover:text-gray-900 transition-all border-b-2 border-transparent hover:border-gray-300">Featured</button>
            <button className="text-gray-500 pb-3 text-sm font-bold hover:text-gray-900 transition-all border-b-2 border-transparent hover:border-gray-300">Rising</button>
          </div>
        </div>
      )}

      {/* 3. Dynamic Content Based on Active Section */}
      <div className="w-full h-full">
        {renderContent()}
      </div>
    </div>
  );
}